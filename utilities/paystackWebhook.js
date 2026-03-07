const paystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    console.log("========== PAYSTACK WEBHOOK ==========");
    console.log(event);
    console.log("======================================");

    /**
     * HANDLE VIRTUAL ACCOUNT TRANSFERS
     */
    if (event.receiver_account_type === "dedicated_nuban") {
      const amount = event.amount / 100;
      const reference = event.session_id;
      const accountNumber = event.receiver_account_number;

      console.log("🏦 Bank Transfer Received");
      console.log("Amount:", amount);
      console.log("Reference:", reference);
      console.log("Virtual Account:", accountNumber);
      console.log("Sender:", event.payer_account_name);
      console.log("Bank:", event.payer_bank_name);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
};

module.exports = { paystackWebhook };