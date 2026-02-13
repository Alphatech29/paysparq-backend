const pool = require("../model/db");

const getUserByUid = async (uid) => {
  try {
    const sql = `
      SELECT
        uid,
        avatar,
        full_name,
        username,
        email,
        phone_number,
        status,
        is_kyc_verified,
        created_at
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

module.exports = {
  getUserByUid
};
