const { sendVerificationOTP } = require("./createEmailVerificationOTP");
const pool = require("../model/db");

async function resendVerificationOTPController(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // 🔎 Fetch user including OTP expiry
    const [rows] = await pool.query(
      `SELECT full_name, is_email_verified
       FROM p_users 
       WHERE email = ? 
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = rows[0];

    // 🚫 Prevent resend if already verified
    if (user.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // ⏳ Cooldown check
    const now = new Date();

    if (user.otp_expires_at && new Date(user.otp_expires_at) > now) {
      const secondsLeft = Math.ceil(
        (new Date(user.otp_expires_at) - now) / 1000
      );

      return res.status(429).json({
        success: false,
        message: `Please wait ${secondsLeft}s before requesting a new OTP`
      });
    }

    // 🔁 Send new OTP
    const sent = await sendVerificationOTP({
      email,
      full_name: user.full_name
    });

    if (!sent) {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP"
      });
    }

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully"
    });

  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

module.exports = { resendVerificationOTPController };