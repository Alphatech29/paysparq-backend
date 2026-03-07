const pool = require("../model/db");

const getAllWebSettings = async () => {
  const sql = `SELECT * FROM p_websettings LIMIT 1`;
  const [rows] = await pool.execute(sql);

  if (!rows.length) {
    throw new Error("Web settings not found in database");
  }

  return rows[0];
};

module.exports = {
  getAllWebSettings,
};
