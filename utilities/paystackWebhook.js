const crypto = require("crypto");

const {
  getDedicatedAccountByAccountNumber,
  creditWallet,
  getWalletByUserId,
  getWalletTransactionBySessionId
} = require("./wallet");

const { createWalletTransaction, createTransaction } = require("./history");
const generateTransactionReference = require("./generateReference");


const paystackWebhook = async (req, res) => {
  try {

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];

    if (signature) {
      const hash = crypto
        .createHmac("sha512", secret)
        .update(req.rawBody)
        .digest("hex");

      if (hash !== signature) {
        console.log("❌ Invalid Paystack signature");
        return res.sendStatus(401);
      }
    }

    const event = req.body;

    console.log("========== PAYSTACK WEBHOOK ==========");
    console.log(event);
    console.log("======================================");

    if (event.receiver_account_type === "dedicated_nuban") {

      const amount = event.amount / 100;
      const accountNumber = event.receiver_account_number;
      const sessionId = event.session_id;
      const transactionReference = generateTransactionReference();

      console.log("🏦 Bank Transfer Received");
      console.log("Amount:", amount);
      console.log("Session ID:", sessionId);
      console.log("Virtual Account:", accountNumber);

      /**
       * 🔒 Prevent duplicate webhook credit
       */
      const existingTransaction = await getWalletTransactionBySessionId(sessionId);

      if (existingTransaction) {
        console.log("⚠️ Duplicate webhook ignored:", sessionId);
        return res.sendStatus(200);
      }

      /**
       * Find account owner
       */
      const account = await getDedicatedAccountByAccountNumber(accountNumber);

      if (!account) {
        console.log("❌ Dedicated account not found");
        return res.sendStatus(200);
      }

      /**
       * Get wallet
       */
      const wallet = await getWalletByUserId(account.uid);

      if (!wallet) {
        console.log("❌ Wallet not found");
        return res.sendStatus(200);
      }

      const balanceBefore = wallet.available_balance;
      const balanceAfter = balanceBefore + amount;

      /**
       * Save wallet transaction
       */
      await createWalletTransaction({
        transaction_reference: transactionReference,
        user_id: account.uid,
        session_id: sessionId,
        recipient_name: event.payer_account_name,
        recipient_account_number: event.payer_account_number,
        recipient_bank_name: event.payer_bank_name,
        type: "credit",
        payment_type: "bank_transfer",
        amount,
        fee: 0,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        currency: "NGN",
        note: event.narration,
        description: "Wallet funding",
        metadata: event,
        status: "successful"
      });

      /**
       * Save general transaction
       */
      await createTransaction({
        user_id: account.uid,
        service_type: event.payer_account_name,
        reference: transactionReference,
        amount: amount,
        status_type: "credit",
        fee: 0,
        total: amount,
        description: `Transfer from ${event.payer_account_name}`,
        status: "successful"
      });

      /**
       * Credit wallet
       */
      await creditWallet(account.uid, amount);

      console.log("✅ Wallet Credited");
      console.log("User ID:", account.uid);
      console.log("Amount:", amount);

      console.log("🧾 Wallet & general transaction saved");
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
};

module.exports = { paystackWebhook };