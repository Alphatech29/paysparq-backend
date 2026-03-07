const crypto = require("crypto");
const pool = require("../model/db");

const MAX_ATTEMPTS = 5;
const OTP_TABLE = "p_email_otps";

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
}

async function saveOTP(email, otp, expiryMinutes = 10) {
  const otpHash = hashOTP(otp);
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

  await pool.query(
    `INSERT INTO ${OTP_TABLE} (email, otp_hash, expires_at, attempts)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       otp_hash = VALUES(otp_hash),
       expires_at = VALUES(expires_at),
       attempts = 0`,
    [email, otpHash, expiresAt]
  );
}

async function verifyOTP(email, userOTP) {
  const [rows] = await pool.query(
    `SELECT otp_hash, expires_at, attempts 
     FROM ${OTP_TABLE} 
     WHERE email = ? LIMIT 1`,
    [email]
  );

  if (!rows.length) {
    return { valid: false, message: "Invalid OTP" };
  }

  const record = rows[0];

  // Normalize values
  const incomingHash = hashOTP(userOTP);
  const dbHash = String(record.otp_hash).trim();

  // Expiry check (supports BIGINT or DATETIME)
  const expiresAt =
    typeof record.expires_at === "number"
      ? record.expires_at
      : new Date(record.expires_at).getTime();

  if (Date.now() > expiresAt) {
    await pool.query(`DELETE FROM ${OTP_TABLE} WHERE email = ?`, [email]);
    return { valid: false, message: "OTP expired" };
  }

  // Attempt limit
  if (record.attempts >= MAX_ATTEMPTS) {
    await pool.query(`DELETE FROM ${OTP_TABLE} WHERE email = ?`, [email]);
    return { valid: false, message: "Too many attempts. Request new OTP." };
  }

  // ✅ Simple deterministic comparison
  if (incomingHash !== dbHash) {
    await pool.query(
      `UPDATE ${OTP_TABLE}
       SET attempts = attempts + 1
       WHERE email = ?`,
      [email]
    );

    return { valid: false, message: "Invalid OTP" };
  }

  // Success → delete (one-time use)
  await pool.query(`DELETE FROM ${OTP_TABLE} WHERE email = ?`, [email]);

  return { valid: true };
}

async function getOTPExpiryByEmail(email) {
  const [rows] = await pool.query(
    `SELECT expires_at FROM ${OTP_TABLE} WHERE email = ? LIMIT 1`,
    [email]
  );

  return rows.length ? rows[0].expires_at : null;
}

module.exports = { saveOTP, verifyOTP, getOTPExpiryByEmail };