const jwt = require("jsonwebtoken");
const { getUserByEmail } = require("../../utilities/users");
const { sendForgotPasswordEmail } = require("../../email/mails/forgetPassword");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await getUserByEmail(email);

    // Security: do NOT reveal if user exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent"
      });
    }

    const token = jwt.sign(
      { uid: user.uid, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    const resetLink = `/reset-password?token=${token}`;

    await sendForgotPasswordEmail({
      to: user.email,
      name: user.full_name,
      resetLink,
      expiryMinutes: 10
    });

    return res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent"
    });

  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

module.exports = { forgotPassword };