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

const updateTransactionStatus = async (reference, status) => {
  try {

    const sql = `
      UPDATE p_transactions
      SET status = ?
      WHERE reference = ?
    `;

    await pool.execute(sql, [status, reference]);

    return {
      success: true,
      reference,
      status
    };

  } catch (error) {
    console.error("Error updating transaction status:", error);
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


const createGiftcardTransaction = async (data) => {
  try {

    const sql = `
      INSERT INTO p_giftcard_transactions (
        reference,
        custom_identifier,
        provider_reference,
        user_id,
        product_id,
        product_name,
        denomination_type,
        quantity,
        unit_price,
        total_price,
        sender_fee,
        final_amount,
        final_amount_ngn,
        currency,
        country_code,
        phone_number,
        status,
        provider_amount,
        provider_discount,
        provider_fee,
        provider_total_fee,
        provider_currency,
        provider_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.reference ?? null,
      data.custom_identifier ?? null,
      data.provider_reference ?? null,
      data.user_id,
      data.product_id,
      data.product_name ?? null,
      data.denomination_type ?? null,
      data.quantity ?? 0,
      data.unit_price ?? 0,
      data.total_price ?? 0,
      data.sender_fee ?? 0,
      data.final_amount ?? 0,
      data.final_amount_ngn ?? 0,
      data.currency ?? "USD",
      data.country_code ?? null,
      data.phone_number ?? null,
      data.status ?? "processing",
      data.provider_amount ?? null,
      data.provider_discount ?? null,
      data.provider_fee ?? null,
      data.provider_total_fee ?? null,
      data.provider_currency ?? null,
      data.provider_response ? JSON.stringify(data.provider_response) : null
    ];

    const [result] = await pool.execute(sql, values);

    return {
      success: true,
      transaction_id: result.insertId,
      reference: data.reference
    };

  } catch (error) {
    console.error("Error creating giftcard transaction:", error);
    throw error;
  }
};

const updateGiftcardTransactionStatus = async (reference, status) => {
  try {

    const sql = `
      UPDATE p_giftcard_transactions
      SET status = ?
      WHERE reference = ?
    `;

    await pool.execute(sql, [status, reference]);

    return {
      success: true,
      reference,
      status
    };

  } catch (error) {
    console.error("Error updating giftcard transaction status:", error);
    throw error;
  }
};

const updateGiftcardTransactionByCustomIdentifier = async (
  customIdentifier,
  data
) => {
  try {
    const sql = `
      UPDATE p_giftcard_transactions
      SET
        provider_reference = ?,
        provider_amount = ?,
        provider_discount = ?,
        provider_fee = ?,
        provider_total_fee = ?,
        provider_currency = ?,
        provider_response = ?,
        status = ?
      WHERE custom_identifier = ?
    `;

    const values = [
      data.provider_reference ?? null,
      data.provider_amount ?? null,
      data.provider_discount ?? null,
      data.provider_fee ?? null,
      data.provider_total_fee ?? null,
      data.provider_currency ?? null,
      data.provider_response
        ? JSON.stringify(data.provider_response)
        : null,
      data.status ?? null,
      customIdentifier,
    ];

    const [result] = await pool.execute(sql, values);

    return {
      success: true,
      affectedRows: result.affectedRows,
      customIdentifier,
    };
  } catch (error) {
    console.error("Error updating giftcard transaction:", error);
    throw error;
  }
};

module.exports = {
  createGiftcardTrade, createGiftcardTransaction, updateGiftcardTransactionByCustomIdentifier, createTransaction, getTransactionsByUserId, createWalletTransaction, updateTransactionStatus, updateGiftcardTransactionStatus
};