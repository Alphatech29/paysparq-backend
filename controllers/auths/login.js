const { getUser, getClient, saveToken } = require("../../utilities/oauthModel");

async function login(req, res) {
  const start = Date.now();

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: {
          code: "MISSING_CREDENTIALS",
          detail: "Email and password are required",
        },
      });
    }

    // Validate user
    const user = await getUser(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        error: {
          code: "INVALID_CREDENTIALS",
          detail: "Invalid email or password",
        },
      });
    }

    // Get OAuth client
    const client = await getClient("web_app");

    if (!client) {
      console.error("OAuth client not configured");

      return res.status(500).json({
        success: false,
        message: "Configuration error",
        error: {
          code: "OAUTH_CLIENT_NOT_FOUND",
          detail: "Authentication service unavailable",
        },
      });
    }

    // Generate tokens
    const savedToken = await saveToken(client, user);

    if (!savedToken || !savedToken.success || !savedToken.data) {
      console.error("Token generation failed:", savedToken);

      return res.status(500).json({
        success: false,
        message: "Authentication failed",
        error: {
          code: "TOKEN_GENERATION_FAILED",
          detail: "Unable to create session",
        },
      });
    }

    const { accessToken, refreshToken, refreshTokenExpiresAt } =
      savedToken.data;

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    };

    // Set Access Token Cookie
    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: 30 * 60 * 1000,
    });

    // Set Refresh Token Cookie
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      expires: new Date(refreshTokenExpiresAt),
    });

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          is_email_verified: user.is_email_verified,
        },
      },
    });

  } catch (err) {
    console.error("LOGIN SERVER ERROR:", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      durationMs: Date.now() - start,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        code: "SERVER_ERROR",
        detail:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong. Please try again later.",
      },
    });
  }
}

module.exports = { login };