const pool = require("../model/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// ================= CONFIG =================
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_LIFETIME = "30m";
const REFRESH_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

// ================= HELPERS =================
function generateToken() {
  return crypto.randomBytes(40).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ================= CLIENT =================
async function getClient(clientId) {
  if (!clientId) return null;

  return {
    id: clientId,
    grants: ["password", "refresh_token"],
    redirectUris: [],
  };
}

// ================= SAVE TOKEN =================
async function saveToken(client, user) {
  try {
    const now = new Date();

    // 🔐 Create JWT Access Token
    const accessToken = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        is_email_verified: user.is_email_verified,
        client_id: client.id,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_LIFETIME }
    );

    // 🔁 Generate refresh token
    const refreshToken = generateToken();
    const hashedRefreshToken = hashToken(refreshToken);

    const refreshTokenExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_LIFETIME_MS
    );

    // Store refresh token (NOT access token validation anymore)
    await pool.query(
      `
      INSERT INTO p_oauth_tokens 
        (uid, access_token, access_token_expires_on, refresh_token, refresh_token_expires_on, user_uid, client_id, created_at)
      VALUES 
        (UUID(), ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?, ?, ?, ?, NOW())
      `,
      [
        accessToken,
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
        refreshToken,
        refreshTokenExpiresAt,
      },
    };
  } catch (err) {
    console.error("Error saving token:", err);
    return { success: false, error: "Unable to save token" };
  }
}

// ================= VERIFY ACCESS TOKEN =================
async function getAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      success: true,
      data: {
        user: {
          uid: decoded.uid,
          email: decoded.email,
          is_email_verified: decoded.is_email_verified,
        },
        client: {
          id: decoded.client_id,
        },
      },
    };
  } catch (err) {
    return { success: false };
  }
}

// ================= REFRESH TOKEN =================
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

    if (!rows.length) return { success: false };

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("Error fetching refresh token:", err);
    return { success: false };
  }
}

// ================= REVOKE TOKEN =================
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

// ================= REVOKE ALL USER TOKENS =================
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

// ================= CLEANUP =================
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

// ================= USER AUTH =================
async function getUser(email, password) {
  try {
    const [rows] = await pool.query(
      `SELECT uid, email, password, is_email_verified 
       FROM p_users
       WHERE email = ?`,
      [email]
    );

    if (!rows.length) return null;

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) return null;

    return {
      uid: user.uid,
      email: user.email,
      is_email_verified: user.is_email_verified,
    };
  } catch (err) {
    console.error("Error fetching user:", err.message);
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