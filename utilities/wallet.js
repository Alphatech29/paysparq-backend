const pool = require("../model/db");

const getWalletByUserId = async (userId) => {
  const sql = `
    SELECT *
    FROM p_wallets
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [userId]);

  return rows.length ? rows[0] : null;
};

module.exports = {
  getWalletByUserId
};
