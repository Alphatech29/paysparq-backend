const {
  getRefreshToken,
  saveToken,
  revokeToken,
  revokeAllUserTokens,
  getClient,
} = require("../../utilities/oauthModel");

async function refreshToken(req, res) {
  console.log("🔄 [REFRESH] Incoming refresh request");

  try {
    const refreshToken = req.cookies?.refresh_token;

    console.log("🍪 [REFRESH] Cookies check:", {
      hasRefreshToken: Boolean(refreshToken),
    });

    if (!refreshToken) {
      console.warn("⚠️ [REFRESH] Missing refresh token");
      return res.status(401).json({
        success: false,
        error: "Refresh token missing",
      });
    }

    console.log("🔍 [REFRESH] Validating refresh token in DB");
    const tokenResult = await getRefreshToken(refreshToken);

    if (!tokenResult?.success || !tokenResult.data) {
      console.warn("⛔ [REFRESH] Invalid or reused refresh token");

      if (tokenResult?.user_uid) {
        console.warn(
          "🚨 [REFRESH] Revoking ALL tokens for user:",
          tokenResult.user_uid
        );
        await revokeAllUserTokens(tokenResult.user_uid);
      }

      return res.status(401).json({
        success: false,
        error: "Session revoked",
      });
    }

    const tokenRecord = tokenResult.data;

    console.log("👤 [REFRESH] Token belongs to user:", tokenRecord.user_uid);

    // Expiration check
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.warn("⌛ [REFRESH] Refresh token expired");

      await revokeToken(refreshToken);

      return res.status(401).json({
        success: false,
        error: "Refresh token expired",
      });
    }

    console.log("🔁 [REFRESH] Rotating refresh token");
    await revokeToken(refreshToken);

    console.log(
      "🔑 [REFRESH] Resolving OAuth client:",
      tokenRecord.client_id || "web_app"
    );
    const client = await getClient(tokenRecord.client_id || "web_app");

    if (!client) {
      console.error("❌ [REFRESH] OAuth client not found");
      return res.status(500).json({
        success: false,
        error: "OAuth client not found",
      });
    }

    console.log("🪪 [REFRESH] Issuing new access & refresh tokens");
    const savedToken = await saveToken(client, {
      uid: tokenRecord.user_uid,
    });

    if (!savedToken.success) {
      console.error("❌ [REFRESH] Token issuance failed");
      return res.status(500).json({
        success: false,
        error: "Failed to rotate session",
      });
    }

    const {
      accessToken,
      accessTokenExpiresAt,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt,
    } = savedToken.data;

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    };

    console.log("🍪 [REFRESH] Setting new access_token cookie");
    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      expires: new Date(accessTokenExpiresAt),
    });

    console.log("🍪 [REFRESH] Setting rotated refresh_token cookie");
    res.cookie("refresh_token", newRefreshToken, {
      ...cookieOptions,
      expires: new Date(refreshTokenExpiresAt),
    });

    console.log("✅ [REFRESH] Session refreshed successfully");

    return res.status(200).json({
      success: true,
      message: "Session refreshed",
    });
  } catch (err) {
    console.error("🔥 [REFRESH] Unhandled error", {
      message: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

module.exports = { refreshToken };
