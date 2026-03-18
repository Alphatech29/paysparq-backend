const pool = require("../model/db");

const getUserByUid = async (uid) => {
  try {
    const sql = `
      SELECT *
      FROM p_users
      WHERE uid = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [uid]);

    return rows.length > 0 ? rows[0] : null;

  } catch (error) {
    console.error("Error fetching user by uid:", error);
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    const sql = `
      SELECT *
      FROM p_users
      WHERE email = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [email]);

    return rows.length > 0 ? rows[0] : null;

  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

const updateUserPassword = async (uid, hashedPassword) => {
  try {
    if (!uid || !hashedPassword) {
      throw new Error("uid and hashedPassword are required");
    }

    const sql = `
      UPDATE p_users
      SET password = ?, updated_at = NOW()
      WHERE uid = ?
      LIMIT 1
    `;

    const [result] = await pool.execute(sql, [hashedPassword, uid]);

    return result.affectedRows > 0;

  } catch (error) {
    console.error("Error updating user password:", error);
    throw error;
  }
};

module.exports = {
  getUserByUid,
  getUserByEmail,
  updateUserPassword
};