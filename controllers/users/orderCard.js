const { getUserByUid } = require("../../utilities/users");
const { getGiftcardProductById, getCountryCurrencyByCode } = require("../../utilities/giftcard");
const { debitWallet, creditWallet } = require("../../utilities/wallet");
const { orderGiftCard } = require("../../utilities/purchaseGiftcard");
const {
  createGiftcardTransaction,
  createTransaction,
  updateTransactionStatus,
  updateGiftcardTransactionStatus
} = require("../../utilities/history");
const generateTransactionReference = require("../../utilities/generateReference");

/* ---------- Standard Error Response ---------- */

const sendError = (res, status, code, message) => {
  return res.status(status).json({
    success: false,
    code,
    message,
    data: null
  });
};

const createGiftcardOrder = async (req, res) => {
  try {

    const { productId, quantity, amount, countryCode, phoneNumber } = req.body;
    const uid = req.user?.uid;

    /* ---------- Validate Request ---------- */

    if (!uid) {
      return sendError(res, 401, "UNAUTHORIZED", "Unauthorized user");
    }

    if (!productId || !quantity) {
      return sendError(res, 400, "INVALID_REQUEST", "productId and quantity are required");
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return sendError(res, 422, "INVALID_QUANTITY", "Quantity must be a positive number");
    }

    const reference = generateTransactionReference();

    /* ---------- Get User ---------- */

    const user = await getUserByUid(uid);

    if (!user) {
      return sendError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    /* ---------- Get Product ---------- */

    const product = await getGiftcardProductById(productId);

    if (!product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Giftcard product not found");
    }

    /* ---------- Determine Unit Price ---------- */

    let unitPrice;

    if (product.denominationType === "FIXED") {

      const denominations = product.fixedRecipientDenominations || [];

      if (!amount) {
        return sendError(res, 400, "AMOUNT_REQUIRED", "Amount is required for this giftcard");
      }

      if (!denominations.includes(Number(amount))) {
        return sendError(res, 422, "INVALID_DENOMINATION", "Invalid denomination");
      }

      unitPrice = Number(amount);

    } else if (product.denominationType === "RANGE") {

      const min = Number(product.minRecipientDenomination);
      const max = Number(product.maxRecipientDenomination);

      if (!amount) {
        return sendError(res, 400, "AMOUNT_REQUIRED", "Amount is required");
      }

      if (Number(amount) < min || Number(amount) > max) {
        return sendError(res, 422, "AMOUNT_OUT_OF_RANGE", `Amount must be between ${min} and ${max}`);
      }

      unitPrice = Math.round(Number(amount));

    } else {
      return sendError(res, 500, "INVALID_PRODUCT_CONFIG", "Invalid giftcard configuration");
    }

    /* ---------- Calculate Prices ---------- */

    const totalPrice = Number((quantity * unitPrice).toFixed(2));

    const senderFeePercentage = Number(product.senderFeePercentage || 0);
    const senderFeeFixed = Number(product.senderFee || 0);

    const senderFeePercentPerUnit =
      Number(((unitPrice * senderFeePercentage) / 100).toFixed(2));

    const senderFeePerUnit =
      Number((senderFeeFixed + senderFeePercentPerUnit).toFixed(2));

    const senderFee =
      Number((senderFeePerUnit * quantity).toFixed(2));

    const finalAmount =
      Number((totalPrice + senderFee).toFixed(2));

    /* ---------- Currency Conversion ---------- */

    const countryCurrency =
      await getCountryCurrencyByCode(product.countryIsoName);

    if (!countryCurrency) {
      return sendError(res, 500, "CURRENCY_NOT_FOUND", "Country currency not found");
    }

    const rateToNGN = Number(countryCurrency.rate_to_ngn || 0);

    if (!rateToNGN) {
      return sendError(res, 500, "CONVERSION_RATE_MISSING", "Currency conversion rate not configured");
    }

    const finalAmountNGN =
      Number((finalAmount * rateToNGN).toFixed(2));

    /* ---------- Debit Wallet ---------- */

    try {

      await debitWallet(user.uid, finalAmountNGN);

    } catch (error) {

      if (error.message?.toLowerCase().includes("insufficient")) {
        return sendError(res, 400, "INSUFFICIENT_BALANCE", "Insufficient wallet balance");
      }

      return sendError(res, 500, "WALLET_DEBIT_FAILED", "Wallet transaction failed");
    }

    /* ---------- Save Transaction ---------- */

    await createGiftcardTransaction({
      reference,
      custom_identifier: reference,
      user_id: user.uid,
      product_id: product.productId,
      product_name: product.productName,
      denomination_type: product.denominationType,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      sender_fee: senderFee,
      final_amount: finalAmount,
      final_amount_ngn: finalAmountNGN,
      currency: countryCurrency.currency_code,
      country_code: countryCode,
      phone_number: phoneNumber,
      status: "processing"
    });

    await createTransaction({
      user_id: user.uid,
      service_type: "giftcard purchase",
      reference: reference,
      amount: totalPrice,
      fee: senderFee,
      total: finalAmountNGN,
      status_type: "debit",
      description: `Giftcard purchase - ${product.productName}`,
      status: "processing"
    });

    /* ---------- Order Giftcard ---------- */

    try {

      await orderGiftCard({
        productId,
        quantity,
        unitPrice,
        countryCode,
        userId: user.uid,
        customIdentifier: reference
      });

    } catch (error) {

      console.error("PROVIDER ERROR:", error);

      /* ---------- Refund Wallet ---------- */

      try {

        await creditWallet(user.uid, finalAmountNGN);

        /* ---------- Update Status After Refund ---------- */

        await updateGiftcardTransactionStatus(reference, "refunded");
        await updateTransactionStatus(reference, "faild");

      } catch (refundError) {

        console.error("REFUND ERROR:", refundError);

        return sendError(
          res,
          500,
          "REFUND_FAILED",
          "Refund failed after provider error"
        );
      }

      return sendError(
        res,
        502,
        "PROVIDER_FAILED",
        "Purchase faild. Wallet refunded."
      );
    }

    /* ---------- Success ---------- */

    return res.status(201).json({
      success: true,
      message: "Giftcard purchased successfully",
      data: {
        reference,
        productName: product.productName,
        quantity,
        finalAmountNGN
      }
    });

  } catch (error) {

    console.error("UNEXPECTED ERROR", error);

    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "Unexpected server error"
    );
  }
};

module.exports = {
  createGiftcardOrder
};