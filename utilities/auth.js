const pool = require("../model/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { createUsername } = require("./usernameGenerate");
const { sendVerificationOTP } = require("./createEmailVerificationOTP");

function isValidPhone(phone_number) {
  return /^(\+?\d{7,15})$/.test(phone_number);
}

async function createUser(full_name, email, password, phone_number) {
  try {
    // 1. Validate input
    if (!full_name || !email || !password || !phone_number) {
      return { success: false, error: "All fields are required" };
    }

    if (!isValidPhone(phone_number)) {
      return { success: false, error: "Invalid phone number format" };
    }

    // 2. Check existing email
    const [existingUser] = await pool.query(
      "SELECT 1 FROM p_users WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      return { success: false, error: "Email already in use" };
    }

    // 3. Check existing phone
    const [existingPhone] = await pool.query(
      "SELECT 1 FROM p_users WHERE phone_number = ?",
      [phone_number],
    );

    if (existingPhone.length > 0) {
      return { success: false, error: "Phone number already in use" };
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Generate UID
    const uid = uuidv4();

    // 6. Generate username
    const username = createUsername(full_name);

    // 7. Insert user
    await pool.query(
      `INSERT INTO p_users
  (uid, full_name, username, email, password, phone_number, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid, full_name, username, email, hashedPassword, phone_number, "active"],
    );

    // 8. Send OTP (NON-BLOCKING)
    sendVerificationOTP({
      email,
      full_name,
    })
      .then((otpSent) => {
        if (otpSent) {
          console.log(`✅ OTP sent successfully to ${email}`);
        } else {
          console.warn(`⚠️ OTP generation/email failed for ${email}`);
        }
      })
      .catch((err) => {
        console.error(`❌ OTP process crashed for ${email}:`, err.message);
      });

    return {
      success: true,
      message: "User created successfully",
      uid,
      username,
    };
  } catch (err) {
    console.error("Error creating user:", err.message);

    return {
      success: false,
      error: "Server error",
    };
  }
}

module.exports = { createUser };
