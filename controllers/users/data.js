const { getWalletByUserId, debitWallet } = require("../../utilities/wallet");
const generateTransactionReference = require("../../utilities/generateReference");

const {
  createTransaction,
  updateTransactionStatus,
  createVtuTransaction,
  updateVtuTransaction
} = require("../../utilities/history");

const { buyData } = require("../../utilities/vtpass");

const mapProviderError = (message) => {
  if (!message) return "Transaction failed. Please try again.";

  const msg = String(message).toLowerCase();

  if (msg.includes("low wallet balance")) {
    return "Service temporarily unavailable. Please try again later.";
  }

  if (msg.includes("invalid")) {
    return "Invalid request details. Please check and try again.";
  }

  return "Transaction failed. Please try again.";
};

const purchaseData = async (req, res) => {
  let debited = false;
  let purchaseAmount = 0;
  let uid;
  let reference;

  try {
    const { phone, serviceID, variation_code, amount } = req.body;
    uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    if (!phone || !serviceID || !variation_code || !amount) {
      return res.status(400).json({
        success: false,
        message: "phone, serviceID, variation_code and amount are required"
      });
    }

    purchaseAmount = Number(amount);

    if (Number.isNaN(purchaseAmount) || purchaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data amount"
      });
    }

    const wallet = await getWalletByUserId(uid);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    if (Number(wallet.available_balance) < purchaseAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance"
      });
    }

    reference = generateTransactionReference();

    await debitWallet(uid, purchaseAmount);
    debited = true;

    await createVtuTransaction({
      user_id: uid,
      reference,
      phone_number: phone,
      service_id: serviceID,
      variation_code,
      amount: purchaseAmount,
      quantity: 1,
      status: "pending"
    });

    await createTransaction({
      user_id: uid,
      service_type: "data purchase",
      reference,
      amount: purchaseAmount,
      status_type: "debit",
      fee: 0,
      total: purchaseAmount,
      description: `Data purchase for ${phone}`,
      status: "processing"
    });

    const vtpassResponse = await buyData({
      request_id: reference,
      phone,
      serviceID,
      variation_code
    });

    const providerData = vtpassResponse?.data?.content?.transactions || {};
    const providerMessage = vtpassResponse?.message || vtpassResponse?.data?.response_description || "";
    const providerCode = vtpassResponse?.data?.code;
    const providerTxnStatus = String(providerData?.status || "").toLowerCase();
    const normalizedStatus = String(vtpassResponse?.status || "").toLowerCase();

    const isSuccessful =
      vtpassResponse?.success === true ||
      normalizedStatus === "success" ||
      providerCode === "000" ||
      String(providerMessage).toUpperCase().includes("TRANSACTION SUCCESSFUL") ||
      String(vtpassResponse?.data?.response_description || "").toUpperCase().includes("TRANSACTION SUCCESSFUL") ||
      providerTxnStatus === "delivered";

    if (isSuccessful) {
      await updateVtuTransaction(reference, {
        provider_transaction_id: providerData?.transactionId || vtpassResponse?.provider_reference,
        provider_request_id: vtpassResponse?.data?.requestId,
        provider_status: providerData?.status || vtpassResponse?.provider_status,
        type: providerData?.type,
        commission: providerData?.commission,
        total_amount: providerData?.total_amount,
        status: "successful"
      });

      await updateTransactionStatus(reference, "successful");

      return res.status(200).json({
        success: true,
        message: "Data purchase successful",
        data: {
          reference,
          phone_number: phone,
          amount: purchaseAmount,
          provider_reference: providerData?.transactionId || vtpassResponse?.provider_reference
        }
      });
    }

    const isPending =
      normalizedStatus === "pending" ||
      providerTxnStatus === "pending" ||
      providerTxnStatus === "processing";

    if (isPending) {
      await updateVtuTransaction(reference, {
        provider_transaction_id: providerData?.transactionId || vtpassResponse?.provider_reference,
        provider_request_id: vtpassResponse?.data?.requestId,
        provider_status: providerData?.status || vtpassResponse?.provider_status || "pending",
        type: providerData?.type,
        commission: providerData?.commission,
        total_amount: providerData?.total_amount,
        status: "pending"
      });

      await updateTransactionStatus(reference, "pending");

      return res.status(202).json({
        success: true,
        message: "Transaction processing",
        data: { reference }
      });
    }

    if (String(providerMessage).toLowerCase().includes("low wallet balance")) {
      if (debited) {
        await debitWallet(uid, -purchaseAmount);
        debited = false;
      }

      await updateVtuTransaction(reference, {
        provider_request_id: vtpassResponse?.data?.requestId,
        provider_status: "low_wallet_balance",
        status: "failed"
      });

      await updateTransactionStatus(reference, "failed");

      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. Please try again later."
      });
    }

    if (debited) {
      await debitWallet(uid, -purchaseAmount);
      debited = false;
    }

    await updateVtuTransaction(reference, {
      provider_transaction_id: providerData?.transactionId || vtpassResponse?.provider_reference,
      provider_request_id: vtpassResponse?.data?.requestId,
      provider_status: providerData?.status || vtpassResponse?.provider_status || normalizedStatus || "failed",
      status: "failed"
    });

    await updateTransactionStatus(reference, "failed");

    return res.status(400).json({
      success: false,
      message: mapProviderError(providerMessage)
    });
  } catch (error) {
    try {
      if (debited && purchaseAmount > 0 && uid) {
        await debitWallet(uid, -purchaseAmount);
        debited = false;
      }
    } catch (refundError) {}

    if (reference) {
      try {
        await updateVtuTransaction(reference, { status: "failed" });
        await updateTransactionStatus(reference, "failed");
      } catch (updateError) {}
    }

    return res.status(500).json({
      success: false,
      message: "Transaction failed. Wallet refunded."
    });
  }
};

module.exports = {
  purchaseData
};