const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { updateUserPassword, getUserByUid } = require("../../utilities/users");

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    /* -----------------------------
       1. Validate token presence
    ------------------------------*/
    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid reset token is required"
      });
    }

    /* -----------------------------
       2. Validate password
    ------------------------------*/
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const strongPassword =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and special character"
      });
    }

    /* -----------------------------
       3. Verify JWT token
    ------------------------------*/
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {

      if (err.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "Reset token has expired"
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid reset token"
      });
    }

    /* -----------------------------
       4. Validate token payload
    ------------------------------*/
    if (!decoded.uid) {
      return res.status(400).json({
        success: false,
        message: "Invalid token payload"
      });
    }

    const uid = decoded.uid;

    /* -----------------------------
       5. Check user exists
    ------------------------------*/
    const user = await getUserByUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /* -----------------------------
       6. Hash new password
    ------------------------------*/
    const hashedPassword = await bcrypt.hash(password, 12);

    /* -----------------------------
       7. Update password
    ------------------------------*/
    const updated = await updateUserPassword(uid, hashedPassword);

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: "Failed to update password"
      });
    }

    /* -----------------------------
       8. Success response
    ------------------------------*/
    return res.status(200).json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

module.exports = { resetPassword };