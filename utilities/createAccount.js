const pool = require("../model/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { createUsername } = require("./usernameGenerate");
const { createCustomer, createDedicatedAccount } = require("./paystack");
const { sendVerificationOTP } = require("./createEmailVerificationOTP");
const { generateUserReferral } = require("./generateReferralCode");
const { processReferral } = require("./referralSystem");

function isValidPhone(phone_number) {
  return /^(\+?\d{7,15})$/.test(phone_number);
}

/* =============================
   BACKGROUND: CREATE VIRTUAL ACCOUNT
============================= */
async function createVirtualAccountBackground(
  uid,
  full_name,
  email,
  phone_number,
) {
  try {
    const names = full_name.trim().split(/\s+/);
    const first_name = names.shift() || "";
    const last_name = names.join(" ");

    const [existingAccount] = await pool.query(
      "SELECT id FROM p_dedicated_accounts WHERE uid = ? LIMIT 1",
      [uid],
    );

    if (existingAccount.length > 0) return;

    const customer = await createCustomer({
      email,
      first_name,
      last_name,
      phone: phone_number,
    });

    if (!customer.status) return;

    const customer_code = customer.data.customer_code;

    const dva = await createDedicatedAccount({
      customer_code,
      preferred_bank: "titan-paystack",
      phone: phone_number,
    });

    if (dva.status && dva.data) {
      const paystack_account_id = dva.data.id;
      const account_number = dva.data.account_number;
      const account_name = dva.data.account_name;
      const bank_name = dva.data.bank.name;
      const bank_slug = dva.data.bank.slug;
      const currency = dva.data.currency;
      const assigned = dva.data.assigned;
      const active = dva.data.active;

      await pool.query(
        `INSERT INTO p_dedicated_accounts
        (uid, customer_code, paystack_account_id, account_number, account_name, bank_name, bank_slug, currency, assigned, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          customer_code,
          paystack_account_id,
          account_number,
          account_name,
          bank_name,
          bank_slug,
          currency,
          assigned,
          active,
        ],
      );
    }
  } catch (error) {
    console.error("Virtual account creation failed:", error);
  }
}

/* =============================
   CREATE USER
============================= */
async function createUser(
  full_name,
  email,
  password,
  phone_number,
  referral_code_used = null,
) {
  try {
    if (!full_name || !email || !password || !phone_number) {
      return { success: false, error: "All fields are required" };
    }

    if (!isValidPhone(phone_number)) {
      return { success: false, error: "Invalid phone number format" };
    }

    /* Check existing email */
    const [existingUser] = await pool.query(
      "SELECT 1 FROM p_users WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      return { success: false, error: "Email already in use" };
    }

    /* Check existing phone */
    const [existingPhone] = await pool.query(
      "SELECT 1 FROM p_users WHERE phone_number = ?",
      [phone_number],
    );

    if (existingPhone.length > 0) {
      return { success: false, error: "Phone number already in use" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const uid = uuidv4();
    const username = createUsername(full_name);

    /* generate user's referral code */
    const referral_code = generateUserReferral(6);

    /* =============================
       CREATE USER
    ============================= */

    await pool.query(
      `INSERT INTO p_users
      (uid, full_name, username, email, password, phone_number, referral_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        full_name,
        username,
        email,
        hashedPassword,
        phone_number,
        referral_code,
        "active",
      ],
    );
/* =============================
   CREATE WALLET
============================= */

const [existingWallet] = await pool.query(
  "SELECT id FROM p_wallets WHERE user_id = ? LIMIT 1",
  [uid]
);

if (existingWallet.length === 0) {
  await pool.query(
    `INSERT INTO p_wallets (user_id, available_balance, available_balance)
     VALUES (?, ?, ?)`,
    [uid, 0, 0]
  );
}

    /* =============================
   REFERRAL SYSTEM
============================= */

    await processReferral(referral_code_used, uid);

    /* =============================
       CREATE VIRTUAL ACCOUNT (BACKGROUND)
    ============================= */

    setImmediate(() => {
      createVirtualAccountBackground(uid, full_name, email, phone_number);
    });

    /* =============================
       SEND EMAIL VERIFICATION
    ============================= */

    sendVerificationOTP({
      email,
      full_name,
    }).catch(() => {});

    return {
      success: true,
      message: "User created successfully",
      uid,
      username,
      referral_code,
    };
  } catch (err) {
    console.error("Create user error:", err);

    return {
      success: false,
      error: "Server error",
    };
  }
}

module.exports = { createUser };
