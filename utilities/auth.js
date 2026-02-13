const pool = require("../model/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

function isValidPhone(phone_number) {
  return /^(\+?\d{7,15})$/.test(phone_number);
}

async function createUser(full_name, email, password, phone_number, username) {
  try {
    // 1. Validate input
    if (!full_name || !email || !password || !phone_number || !username) {
      return { success: false, error: "All fields are required" };
    }

    if (!isValidPhone(phone_number)) {
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
      [phone_number]
    );
    if (existingPhone.length > 0) {
      return { success: false, error: "Phone number already in use" };
    }

    // 4. Check for existing username
    const [existingUsername] = await pool.query(
      "SELECT 1 FROM p_users WHERE username = ?",
      [username]
    );
    if (existingUsername.length > 0) {
      return { success: false, error: "Username already in use" };
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Generate unique UID
    const uid = uuidv4();

    // 6. Insert user into the database
    await pool.query(
      "INSERT INTO p_users (uid, full_name, email, password, phone_number, username) VALUES (?, ?, ?, ?, ?, ?)",
      [uid, full_name, email, hashedPassword, phone_number, username]
    );

    // 7. Return success message
    return { success: true, message: "User created successfully", uid };
  } catch (err) {
    console.error("Error creating user:", err);
    return { success: false, error: "Server error" };
  }
}


module.exports = { createUser };
