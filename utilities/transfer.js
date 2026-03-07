const { verifyTransactionPin } = require("./transactionPin");
const { createWalletTransaction, createTransaction } = require("./history");
const { getWalletByUserId, debitWallet } = require("./wallet");
const generateTransactionReference = require("./generateReference");

const transferMoney = async (payload) => {
  try {
    const {
      uid,
      account_number,
      bank_name,
      bank_code,
      account_name,
      narration,
      pin
    } = payload;

    /* -------- Basic Validation -------- */
    if (!uid) {
      throw new Error("User ID is required");
    }
    if (!account_number || !bank_name || !bank_code || !account_name) {
      throw new Error("Invalid recipient details");
    }

    // FIX 1: Cast amount once here to ensure consistent type throughout
    const amount = Number(payload.amount);
    if (!amount || amount <= 0) {
      throw new Error("Invalid transfer amount");
    }
    if (!pin) {
      throw new Error("Transaction PIN is required");
    }

    /* -------- Verify Transaction PIN -------- */
    await verifyTransactionPin({ uid, pin });

    /* -------- Get Wallet -------- */
    const wallet = await getWalletByUserId(uid);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const balance_before = Number(wallet.available_balance);
    if (balance_before < amount) {
      throw new Error("Insufficient balance");
    }
    const balance_after = balance_before - amount;

    /* -------- Generate Reference -------- */
    const reference = generateTransactionReference();

    /* -------- Debit Wallet -------- */
    // FIX 3: Debit wallet first, then attempt DB writes with rollback on failure
    await debitWallet(uid, amount);

    try {
      /* -------- Store Wallet Transaction -------- */
      await createWalletTransaction({
        transaction_reference: reference,
        user_id: uid,
        recipient_name: account_name,
        recipient_account_number: account_number,
        recipient_bank_name: bank_name,
        type: "debit",
        payment_type: "bank_transfer",
        amount,
        fee: 0,
        balance_before,
        balance_after,
        note: narration,
        description: `Transfer to ${account_name}`,
        status: "successful"
      });

      /* -------- Store Main Transaction -------- */
      await createTransaction({
        user_id: uid,
        service_type: account_name,
        reference,
        amount,
        status_type: "debit",
        fee: 0,
        total: amount,
        description: `Transfer to ${account_name}`,
        status: "successful"
      });
    } catch (dbError) {
      try {
        await debitWallet(uid, -amount);
      } catch (rollbackError) {
        console.error(
          `CRITICAL: Failed to rollback debit for user ${uid}, amount ${amount}, reference ${reference}`,
          rollbackError
        );
      }
      throw dbError;
    }

    const transferResult = {
      reference,
      uid,
      account_number,
      bank_name,
      bank_code,
      account_name,
      amount,
      narration,
      status: "success",
      timestamp: new Date().toISOString(),
    };

    return transferResult;

  } catch (error) {
    throw error;
  }
};

module.exports = { transferMoney };