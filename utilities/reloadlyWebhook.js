const {
  updateGiftcardTransactionByCustomIdentifier,
  updateTransactionStatus,
  getUserIdByCustomIdentifier,
} = require("./history");

const { getRedeemCode } = require("./reloadlyGiftcard");
const { getUserByUid } = require("./users");
const { getGiftcardProductById } = require("./giftcard");

const {
  sendGiftCardDeliveryEmail,
} = require("../email/mails/giftCardDelivery");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const reloadlyWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const data = payload?.data;

    if (!data?.customIdentifier) {
      return res.status(200).json({
        success: true,
        message: "Webhook ignored",
      });
    }

    const status = data.status?.toLowerCase() ?? "unknown";

    /* ---------- Get User ID ---------- */

    const user_id = await getUserIdByCustomIdentifier(data.customIdentifier);

    if (!user_id) {
      return res.status(200).json({ success: true });
    }

    /* ---------- Get User ---------- */

    const user = await getUserByUid(user_id);

    /* ---------- Update Giftcard Transaction ---------- */

    await updateGiftcardTransactionByCustomIdentifier(data.customIdentifier, {
      provider_reference: data.transactionId ?? null,
      provider_amount: data.amount ?? null,
      provider_discount: data.discount ?? null,
      provider_fee: data.fee ?? null,
      provider_total_fee: data.totalFee ?? null,
      provider_currency: data.currencyCode ?? null,
      provider_response: payload,
      status,
    });

    /* ---------- Update Main Transaction ---------- */

    await updateTransactionStatus(data.customIdentifier, status);

    /* ---------- Send Email in Background ---------- */

    if (status === "success" || status === "successful") {
      setImmediate(async () => {
        try {
          if (!user?.email) return;

          let cards = [];

          /* ---------- Wait a bit (Reloadly delay) ---------- */

          if (data.transactionId) {
            await sleep(3000);

            try {
              const redeem = await getRedeemCode(data.transactionId);

              if (Array.isArray(redeem)) {
                cards = redeem.map((card) => ({
                  code: card.card_number,
                  pin: card.pin_code,
                  redemptionUrl: card.redemption_url ?? null,
                }));
              }
            } catch (redeemError) {}
          }

          /* ---------- Prevent empty email ---------- */

          if (!cards.length) {
            return;
          }

          /* ---------- Fetch Giftcard Product Instructions ---------- */

          let redeemInstructionConcise = null;
          let redeemInstructionVerbose = null;

          try {
            if (data.product?.productId) {
              const product = await getGiftcardProductById(
                data.product.productId
              );

              redeemInstructionConcise =
                product?.redeemInstructionConcise ?? null;

              redeemInstructionVerbose =
                product?.redeemInstructionVerbose ?? null;
            }
          } catch (productError) {}

          /* ---------- Send Email ---------- */

          await sendGiftCardDeliveryEmail({
            to: user.email,
            name: user.full_name ?? "Customer",
            reference: data.customIdentifier,
            brand_name: data.product?.productName ?? "Gift Card",
            currency: data.product?.currencyCode ?? "USD",
            quantity: data.product?.quantity ?? cards.length,
            total_amount: data.product?.totalPrice ?? 0,
            cards,
            redeemInstructionConcise,
            redeemInstructionVerbose,
          });
        } catch (emailError) {}
      });
    }

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

module.exports = {
  reloadlyWebhook,
};