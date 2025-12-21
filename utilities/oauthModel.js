const pool = require('../model/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Default expiration times
const ACCESS_TOKEN_LIFETIME = 60 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME = 30 * 24 * 60 * 60 * 1000;

// --- Helper to generate secure random tokens ---
function generateToken() {
  return crypto.randomBytes(40).toString('hex');
}

async function getClient(clientId) {
  try {
    return {
      id: clientId,
      grants: ['password', 'refresh_token'],
      redirectUris: []
    };
  } catch (err) {
    console.error('Error fetching client:', err);
    return null;
  }
}

async function saveToken(client, user) {
  try {
    const now = new Date();
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME);
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME);

    const query = `
      INSERT INTO p_oauth_tokens 
        (uid, access_token, access_token_expires_on, refresh_token, refresh_token_expires_on, user_uid, client_id, created_at)
      VALUES 
        (UUID(), ?, ?, ?, ?, ?, ?, NOW())
    `;
    await pool.query(query, [
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      user.uid,
      client.id
    ]);

    cleanupExpiredTokens().catch(err => console.error('Token cleanup error:', err));

    return {
      success: true,
      data: {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
        refreshTokenExpiresAt,
        client: { id: client.id },
        user: { uid: user.uid }
      }
    };
  } catch (err) {
    console.error('Error saving token:', err);
    return { success: false, error: 'Unable to save token' };
  }
}

async function getAccessToken(accessToken) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM p_oauth_tokens WHERE access_token = ?`,
      [accessToken]
    );
    if (!rows.length) return { success: false, error: 'Token not found' };

    const token = rows[0];
    return {
      success: true,
      data: {
        accessToken: token.access_token,
        accessTokenExpiresAt: token.access_token_expires_on,
        refreshToken: token.refresh_token,
        refreshTokenExpiresAt: token.refresh_token_expires_on,
        client: { id: token.client_id },
        user: { uid: token.user_uid }
      }
    };
  } catch (err) {
    console.error('Error fetching access token:', err);
    return { success: false, error: 'Unable to fetch access token' };
  }
}

async function getRefreshToken(refreshToken) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM p_oauth_tokens WHERE refresh_token = ?`,
      [refreshToken]
    );
    if (!rows.length) return { success: false, error: 'Token not found' };

    const token = rows[0];
    return {
      success: true,
      data: {
        refreshToken: token.refresh_token,
        refreshTokenExpiresAt: token.refresh_token_expires_on,
        client: { id: token.client_id },
        user: { uid: token.user_uid }
      }
    };
  } catch (err) {
    console.error('Error fetching refresh token:', err);
    return { success: false, error: 'Unable to fetch refresh token' };
  }
}

async function revokeToken(token) {
  try {
    const [result] = await pool.query(
      `DELETE FROM p_oauth_tokens WHERE refresh_token = ?`,
      [token.refreshToken]
    );
    return { success: true, revoked: result.affectedRows > 0 };
  } catch (err) {
    console.error('Error revoking token:', err);
    return { success: false, revoked: false, error: 'Unable to revoke token' };
  }
}

async function cleanupExpiredTokens() {
  try {
    const now = new Date();
    await pool.query(
      `DELETE FROM p_oauth_tokens
       WHERE access_token_expires_on <= ?
          OR refresh_token_expires_on <= ?`,
      [now, now]
    );
  } catch (err) {
    console.error('Error cleaning up expired tokens:', err);
  }
}

async function getUserByEmail(email) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM p_users WHERE email = ?`,
      [email]
    );

    if (!rows.length) return null;

    const user = rows[0];
    return { uid: user.uid,  email: user.email,  password: user.password };
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
}

async function getUser(email, password) {
  try {
    const user = await getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return false;

    return { uid: user.uid, email: user.email };
  } catch (err) {
    console.error('Error fetching user:', err);
    return null;
  }
}

module.exports = {
  getClient,
  saveToken,
  getAccessToken,
  getRefreshToken,
  revokeToken,
  getUser,
  getUserByEmail,
  cleanupExpiredTokens
};
