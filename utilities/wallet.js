const pool = require("../model/db");

/* ---------------- Get Wallet ---------------- */

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


/* ---------------- Get Dedicated Account By User ID ---------------- */

const getDedicatedAccountByUserId = async (uid) => {
  const sql = `
    SELECT *
    FROM p_dedicated_accounts
    WHERE uid = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [uid]);

  return rows.length ? rows[0] : null;
};


/* ---------------- Get Dedicated Account By Account Number ---------------- */

const getDedicatedAccountByAccountNumber = async (accountNumber) => {
  const sql = `
    SELECT *
    FROM p_dedicated_accounts
    WHERE account_number = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [accountNumber]);

  return rows.length ? rows[0] : null;
};


const getWalletTransactionBySessionId = async (sessionId) => {
  const query = `
    SELECT id FROM wallet_transactions
    WHERE session_id = $1
    LIMIT 1
  `;

  const { rows } = await db.query(query, [sessionId]);
  return rows[0];
};


/* ---------------- Safe Debit Wallet ---------------- */

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


/* ---------------- Credit Wallet ---------------- */

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
  getDedicatedAccountByUserId,
  getDedicatedAccountByAccountNumber,
  getWalletTransactionBySessionId,
  debitWallet,
  creditWallet
};