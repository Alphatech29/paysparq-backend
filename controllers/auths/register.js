// controllers/authController.js
const { createUser } = require("../../utilities/auth");

const registerUser = async (req, res) => {
  const { fullname, email, password, phone } = req.body;

  console.log("Registering user with data:", req.body);

 
  const full_name = fullname;
  const phone_number = phone;

  try {
    const result = await createUser(full_name, email, password, phone_number);

    if (!result.success) {
      let statusCode = 400;
      if (result.error.includes("in use")) statusCode = 409;

      return res.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }

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