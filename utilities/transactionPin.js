const bcrypt = require("bcrypt");
const pool = require("../model/db");

//Create Transaction PIN Utility

const createTransactionPin = async (payload) => {
  try {

    const { uid, pin } = payload;

    if (!uid) {
      throw new Error("User ID is required");
    }

    if (!pin) {
      throw new Error("Transaction PIN is required");
    }

    if (pin.length !== 4) {
      throw new Error("Transaction PIN must be 4 digits");
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error("Transaction PIN must contain only numbers");
    }

    /* -------- Hash PIN -------- */

    const saltRounds = 10;
    const hashedPin = await bcrypt.hash(pin, saltRounds);

    /* -------- Check if User Already Has PIN -------- */

    const [existingPin] = await pool.query(
      "SELECT id FROM p_pin WHERE user_id = ?",
      [uid]
    );

    if (existingPin.length > 0) {
      throw new Error("Transaction PIN already exists for this user");
    }

    /* -------- Insert PIN -------- */

    const [result] = await pool.query(
      `INSERT INTO p_pin (user_id, pin_hash) VALUES (?, ?)`,
      [uid, hashedPin]
    );

    /* -------- Update p_users -------- */

    await pool.query(
      `UPDATE p_users SET is_pin_created = 1 WHERE uid = ?`,
      [uid]
    );

    return {
      success: true,
      message: "Transaction PIN created successfully",
      pin_id: result.insertId,
      uid
    };

  } catch (error) {
    throw new Error(error.message || "Failed to create transaction PIN");
  }
};


//Verify Transaction PIN Utility
const verifyTransactionPin = async (payload) => {
  try {

    const { uid, pin } = payload;

    if (!uid || !pin) {
      throw new Error("User ID and PIN are required");
    }

    /* -------- Get PIN From Database -------- */

    const [rows] = await pool.query(
      "SELECT pin_hash FROM p_pin WHERE user_id = ?",
      [uid]
    );

    if (rows.length === 0) {
      throw new Error("Please set a pin");
    }

    const storedHash = rows[0].pin_hash;

    /* -------- Compare PIN -------- */

    const isMatch = await bcrypt.compare(pin, storedHash);

    if (!isMatch) {
      throw new Error("Invalid pin");
    }

    return {
      success: true,
      message: "Transaction PIN verified"
    };

  } catch (error) {
    throw new Error(error.message || "Failed to verify transaction PIN");
  }
};

//Change Transaction PIN Utility

const changeTransactionPin = async (payload) => {
  try {

    const { uid, oldPin, newPin } = payload;

    if (!uid) {
      throw new Error("User ID is required");
    }

    if (!oldPin || !newPin) {
      throw new Error("Old PIN and New PIN are required");
    }

    if (newPin.length !== 4) {
      throw new Error("New PIN must be 4 digits");
    }

    if (!/^\d+$/.test(newPin)) {
      throw new Error("New PIN must contain only numbers");
    }

    /* -------- Get Existing PIN -------- */

    const [rows] = await pool.query(
      "SELECT pin_hash FROM p_pin WHERE user_id = ?",
      [uid]
    );

    if (rows.length === 0) {
      throw new Error("Transaction PIN not found. Please create a PIN first.");
    }

    const storedHash = rows[0].pin_hash;

    /* -------- Verify Old PIN -------- */

    const isMatch = await bcrypt.compare(oldPin, storedHash);

    if (!isMatch) {
      throw new Error("Old PIN is incorrect");
    }

    /* -------- Hash New PIN -------- */

    const saltRounds = 10;
    const newHashedPin = await bcrypt.hash(newPin, saltRounds);

    /* -------- Update PIN -------- */

    await pool.query(
      "UPDATE p_pin SET pin_hash = ? WHERE user_id = ?",
      [newHashedPin, uid]
    );

    return {
      success: true,
      message: "Transaction PIN changed successfully"
    };

  } catch (error) {
    throw new Error(error.message || "Failed to change transaction PIN");
  }
};

module.exports = {
  createTransactionPin,
  verifyTransactionPin,
  changeTransactionPin
};