const { revokeToken } = require("../../utilities/oauthModel");

async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await revokeToken(refreshToken);
    }

    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
}

module.exports = { logout };
