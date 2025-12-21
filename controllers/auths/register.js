// controllers/authController.js
const { createUser } = require("../../utilities/auth");

const registerUser = async (req, res) => {
  const { full_name, email, password, phone_number } = req.body;

  try {
    const result = await createUser(full_name, email, password, phone_number);

    if (!result.success) {
      // Map errors to HTTP status codes
      let statusCode = 400;
      if (result.error.includes("in use")) statusCode = 409;
      return res.status(statusCode).json({ success: false, error: result.error });
    }

    // Success response
    return res.status(201).json({
      success: true,
      message: result.message,
      data: { uid: result.uid },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

module.exports = { registerUser };
