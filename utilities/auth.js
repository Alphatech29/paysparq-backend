const pool = require("../model/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

function isValidPhone(phone) {
  return /^(\+?\d{7,15})$/.test(phone);
}

async function createUser(full_name, email, password, phone) {
  try {
    // 1. Validate input
    if (!full_name || !email || !password || !phone) {
      return { success: false, error: "All fields are required" };
    }

    if (!isValidPhone(phone)) {
      return { success: false, error: "Invalid phone number format" };
    }

    // 2. Check for existing email
    const [existingUser] = await pool.query(
      "SELECT 1 FROM p_users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return { success: false, error: "Email already in use" };
    }

    // 3. Check for existing phone number
    const [existingPhone] = await pool.query(
      "SELECT 1 FROM p_users WHERE phone_number = ?",
      [phone]
    );
    if (existingPhone.length > 0) {
      return { success: false, error: "Phone number already in use" };
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Generate unique UID
    const uid = uuidv4();

    // 6. Insert user into the database
    await pool.query(
      "INSERT INTO p_users (uid, full_name, email, password, phone_number) VALUES (?, ?, ?, ?, ?)",
      [uid, full_name, email, hashedPassword, phone]
    );

    // 7. Return success message
    return { success: true, message: "User created successfully", uid };
  } catch (err) {
    console.error("Error creating user:", err);
    return { success: false, error: "Server error" };
  }
}


async function loginUser(email, password) {
  try {
    // 1. Validate input
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    // 2. Retrieve user by email
    const [rows] = await pool.query(
      "SELECT uid, full_name, email, password, phone_number FROM p_users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const user = rows[0];

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: "Invalid email or password" };
    }

    // 4. Return success and user info (without password)
    return {
      success: true,
      message: "Login successful",
      user: {
        uid: user.uid,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
      },
    };
  } catch (err) {
    console.error("Error logging in user:", err);
    return { success: false, error: "Server error" };
  }
}



module.exports = { createUser, loginUser };
