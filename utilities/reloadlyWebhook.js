const { 
  updateGiftcardTransactionByCustomIdentifier, 
  updateTransactionStatus 
} = require("./history");

const reloadlyWebhook = async (req, res) => {

  console.log("========== Reloadly Webhook Received ==========");
  console.log("Timestamp:", new Date().toISOString());

  try {

    console.log("Request Info:", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      forwardedFor: req.headers["x-forwarded-for"] || null
    });

    console.log("Headers:");
    console.log(JSON.stringify(req.headers, null, 2));

    console.log("Body:");
    console.log(JSON.stringify(req.body, null, 2));

    /* ---------- Extract webhook payload ---------- */

    const payload = req.body;
    const data = payload?.data;

    if (data?.customIdentifier) {

      const status = data.status
        ? data.status.toLowerCase()
        : "unknown";

      /* ---------- Update Giftcard Transaction ---------- */

      await updateGiftcardTransactionByCustomIdentifier(
        data.customIdentifier,
        {
          provider_reference: data.transactionId ?? null,
          provider_amount: data.amount ?? null,
          provider_discount: data.discount ?? null,
          provider_fee: data.fee ?? null,
          provider_total_fee: data.totalFee ?? null,
          provider_currency: data.currencyCode ?? null,
          provider_response: payload,
          status: status
        }
      );

      /* ---------- Update Main Transaction ---------- */

      await updateTransactionStatus(
        data.customIdentifier,
        "successful"
      );

      console.log("Transaction updated:", data.customIdentifier);
    }

    console.log("========== End Webhook ==========");

    return res.status(200).json({
      success: true,
      message: "Webhook received"
    });

  } catch (error) {

    console.error("========== Webhook Error ==========");
    console.error("Error Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed"
    });

  }
};

module.exports = {
  reloadlyWebhook
};