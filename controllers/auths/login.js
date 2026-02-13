const { getUser, getClient, saveToken } = require("../../utilities/oauthModel");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.warn(" LOGIN FAILED: Missing email or password");

      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    //  Authenticate user
    const user = await getUser(email, password);

    if (!user) {
      console.warn(" LOGIN FAILED: Invalid credentials");

      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const client = await getClient("web_app");

    if (!client) {
      console.error(" LOGIN FAILED: OAuth client not found");

      return res.status(500).json({
        success: false,
        error: "OAuth client not found",
      });
    }

    const savedToken = await saveToken(client, user);

    if (!savedToken.success) {
      console.error(" LOGIN FAILED: Token generation failed");

      return res.status(500).json({
        success: false,
        error: "Failed to generate session",
      });
    }

    const {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
    } = savedToken.data;

    const isProd = process.env.NODE_ENV === "production";

    //  Cookie configuration
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    };

    //  Set access token cookie
    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      expires: new Date(accessTokenExpiresAt),
    });

    //  Set refresh token cookie
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      expires: new Date(refreshTokenExpiresAt),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        uid: user.uid,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error message:", err.message);
    console.error(
      "Stack trace:",
      process.env.NODE_ENV === "development" ? err.stack : "[hidden]",
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
}

module.exports = { login };
