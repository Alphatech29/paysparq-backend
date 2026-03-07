const { verifyOTP, getOTPExpiryByEmail  } = require("./otpStorage");
const pool = require("../model/db");

async function verifyEmailController(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await verifyOTP(email, otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message || "Invalid or expired OTP",
      });
    }

    await pool.query(
      "UPDATE p_users SET is_email_verified = 1 WHERE email = ?",
      [email],
    );
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Get OTP Expiry Controller
 */
async function getOTPExpiryController(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const expiryData = await getOTPExpiryByEmail(email);

    if (!expiryData) {
      return res.status(404).json({
        success: false,
        message: "OTP not found",
      });
    }

    return res.status(200).json({
      success: true,
      expiresAt: expiryData.expiresAt || expiryData,
      remainingMs: expiryData.remainingMs || null,
      isExpired: expiryData.isExpired ?? null,
    });

  } catch (error) {
    console.error("Get OTP expiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  verifyEmailController,
  getOTPExpiryController,
};
