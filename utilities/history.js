const pool = require("../model/db");

const createGiftcardTrade = async (tradeData) => {
  try {
    const sql = `
      INSERT INTO p_giftcard_trades (
        reference,
        user_id,
        brand_id,
        brand_name,
        sub_category_id,
        sub_category_name,
        card_type,
        country,
        amount,
        rate,
        receive_amount,
        fee,
        final_amount,
        currency,
        card_ecode,
        card_image,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      tradeData.reference ?? "",
      tradeData.user_id ?? "",
      tradeData.brand_id ?? "",
      tradeData.brand_name ?? "",
      tradeData.sub_category_id ?? "",
      tradeData.sub_category_name ?? "",
      tradeData.card_type ?? "",
      tradeData.country ?? "",
      tradeData.amount ?? "",
      tradeData.rate ?? "",
      tradeData.receive_amount ?? "",
      tradeData.fee ?? "",
      tradeData.final_amount ?? "",
      tradeData.currency ?? "",
      tradeData.card_ecode ?? "",
      tradeData.card_image ?? "",
      tradeData.status ?? ""
    ];

    const [result] = await pool.execute(sql, values);

    return {
      success: true,
      trade_id: result.reference
    };

  } catch (error) {
    console.error("Error creating giftcard trade:", error);
    throw error;
  }
};


const createTransaction = async (transactionData) => {
  try {
    if (!transactionData.user_id || !transactionData.reference) {
      throw new Error("user_id and reference are required");
    }

    const sql = `
      INSERT INTO p_transactions (
        user_id,
        service_type,
        reference,
        amount,
        status_type,
        fee,
        total,
        description,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      transactionData.user_id,
      transactionData.service_type ?? null,
      transactionData.reference,
      Number(transactionData.amount ?? 0),
      transactionData.status_type ?? null,
      Number(transactionData.fee ?? 0),
      Number(transactionData.total ?? 0),
      transactionData.description ?? null,
      transactionData.status ?? "processing"
    ];

    const [result] = await pool.execute(sql, values);

    return {
      success: true,
      transaction_id: result.insertId,
      reference: transactionData.reference
    };

  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};

const getTransactionsByUserId = async (userId) => {
  try {
    if (!userId) {
      throw new Error("user_id is required");
    }

    const sql = `
      SELECT *
      FROM p_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(sql, [userId]);

    return {
      success: true,
      count: rows.length,
      transactions: rows
    };

  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

const createWalletTransaction = async (walletData) => {
  try {

    const sql = `
      INSERT INTO p_wallet_transactions (
        transaction_reference,
        user_id,
        session_id,
        recipient_name,
        recipient_account_number,
        recipient_bank_name,
        type,
        payment_type,
        amount,
        fee,
        balance_before,
        balance_after,
        currency,
        note,
        description,
        ip_address,
        device,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      walletData.transaction_reference,
      walletData.user_id,
      walletData.session_id ?? null,
      walletData.recipient_name ?? null,
      walletData.recipient_account_number ?? null,
      walletData.recipient_bank_name ?? null,
      walletData.type ?? "credit",
      walletData.payment_type ?? null,
      walletData.amount ?? 0,
      walletData.fee ?? 0,
      walletData.balance_before ?? 0,
      walletData.balance_after ?? 0,
      walletData.currency ?? "₦",
      walletData.note ?? null,
      walletData.description ?? null,
      walletData.ip_address ?? null,
      walletData.device ?? null,
      walletData.status ?? "processing"
    ];

    const [result] = await pool.execute(sql, values);

    return result.insertId;

  } catch (error) {
    console.error("Wallet transaction error:", error);
    throw error;
  }
};

module.exports = {
  createGiftcardTrade, createTransaction, getTransactionsByUserId, createWalletTransaction
};