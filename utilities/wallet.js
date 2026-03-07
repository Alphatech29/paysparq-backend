const pool = require("../model/db");

/* Get Wallet */

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


/* Safe Debit Wallet */

const debitWallet = async (userId, amount) => {

  const sql = `
    UPDATE p_wallets
    SET available_balance = available_balance - ?
    WHERE user_id = ?
    AND available_balance >= ?
  `;

  const [result] = await pool.execute(sql, [amount, userId, amount]);

  if (result.affectedRows === 0) {
    throw new Error("Insufficient balance");
  }

  return true;
};


/* Credit Wallet */

const creditWallet = async (userId, amount) => {

  const sql = `
    UPDATE p_wallets
    SET available_balance = available_balance + ?
    WHERE user_id = ?
  `;

  const [result] = await pool.execute(sql, [amount, userId]);

  return result.affectedRows > 0;
};

module.exports = {
  getWalletByUserId,
  debitWallet,
  creditWallet
};