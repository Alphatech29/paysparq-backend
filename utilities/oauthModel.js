const pool = require("../model/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Token lifetimes
const ACCESS_TOKEN_LIFETIME = 15 * 60 * 1000; // 15 min
const REFRESH_TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

// ---------------- HELPERS ----------------
function generateToken() {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ---------------- CLIENT ----------------
async function getClient(clientId) {
  if (!clientId) return null;

  return {
    id: clientId,
    grants: ["password", "refresh_token"],
    redirectUris: [],
  };
}

// ---------------- SAVE TOKEN ----------------
async function saveToken(client, user) {
  try {
    const now = new Date();

    const accessToken = generateToken();
    const refreshToken = generateToken();

    const hashedRefreshToken = hashToken(refreshToken);

    const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME);
    const refreshTokenExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_LIFETIME
    );

    await pool.query(
      `
      INSERT INTO p_oauth_tokens 
        (uid, access_token, access_token_expires_on, refresh_token, refresh_token_expires_on, user_uid, client_id, created_at)
      VALUES 
        (UUID(), ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        accessToken,
        accessTokenExpiresAt,
        hashedRefreshToken,
        refreshTokenExpiresAt,
        user.uid,
        client.id,
      ]
    );

    cleanupExpiredTokens().catch(() => {});

    return {
      success: true,
      data: {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
        refreshTokenExpiresAt,
      },
    };
  } catch (err) {
    console.error("Error saving token:", err);
    return { success: false, error: "Unable to save token" };
  }
}

// ---------------- ACCESS TOKEN ----------------
async function getAccessToken(accessToken) {
  try {
    const [rows] = await pool.query(
      `
      SELECT user_uid, client_id
      FROM p_oauth_tokens
      WHERE access_token = ?
        AND access_token_expires_on > NOW()
      `,
      [accessToken]
    );

    if (!rows.length) {
      return { success: false };
    }

    return {
      success: true,
      data: {
        user: { uid: rows[0].user_uid },
        client: { id: rows[0].client_id },
      },
    };
  } catch (err) {
    console.error("Error fetching access token:", err);
    return { success: false };
  }
}

// ---------------- REFRESH TOKEN ----------------
async function getRefreshToken(refreshToken) {
  try {
    const hashed = hashToken(refreshToken);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM p_oauth_tokens
      WHERE refresh_token = ?
        AND refresh_token_expires_on > NOW()
      `,
      [hashed]
    );

    if (!rows.length) {
      return { success: false };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("Error fetching refresh token:", err);
    return { success: false };
  }
}

// ---------------- REVOKE SINGLE TOKEN ----------------
async function revokeToken(refreshToken) {
  try {
    const hashed = hashToken(refreshToken);

    const [result] = await pool.query(
      `DELETE FROM p_oauth_tokens WHERE refresh_token = ?`,
      [hashed]
    );

    return { success: true, revoked: result.affectedRows > 0 };
  } catch (err) {
    console.error("Error revoking token:", err);
    return { success: false };
  }
}

// ---------------- REVOKE ALL USER TOKENS (CRITICAL) ----------------
async function revokeAllUserTokens(userUid) {
  try {
    await pool.query(
      `DELETE FROM p_oauth_tokens WHERE user_uid = ?`,
      [userUid]
    );

    return { success: true };
  } catch (err) {
    console.error("Error revoking all user tokens:", err);
    return { success: false };
  }
}

// ---------------- CLEANUP ----------------
async function cleanupExpiredTokens() {
  try {
    await pool.query(
      `
      DELETE FROM p_oauth_tokens
      WHERE refresh_token_expires_on <= NOW()
      `
    );
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

// ---------------- USER ----------------
async function getUser(email, password) {
  try {
    const [rows] = await pool.query(
      `SELECT uid, email, password FROM p_users WHERE email = ?`,
      [email]
    );

    if (!rows.length) return null;

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) return null;

    return {
      uid: user.uid,
      email: user.email,
    };
  } catch (err) {
    console.error("Error fetching user:", err);
    return null;
  }
}

module.exports = {
  getClient,
  saveToken,
  getAccessToken,
  getRefreshToken,
  revokeToken,
  revokeAllUserTokens,
  getUser,
  cleanupExpiredTokens,
};
