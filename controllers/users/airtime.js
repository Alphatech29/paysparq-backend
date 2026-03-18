const { getWalletByUserId, debitWallet } = require("../../utilities/wallet");
const generateTransactionReference = require("../../utilities/generateReference");
const {
  createVtuTransaction,
  createTransaction,
  updateTransactionStatus,
  updateVtuTransaction
} = require("../../utilities/history");
const { buyAirtime } = require("../../utilities/vtpass");

const mapProviderError = (message) => {
  if (!message) return "Transaction failed. Please try again.";

  const msg = message.toLowerCase();

  if (msg.includes("low wallet balance")) {
    return "Service temporarily unavailable. Please try again later.";
  }

  if (msg.includes("invalid")) {
    return "Invalid request details. Please check and try again.";
  }

  return "Transaction failed. Please try again.";
};

const purchaseAirtime = async (req, res) => {
  let debited = false;
  let purchaseAmount = 0;
  let uid;
  let reference;

  try {
    const { number, amount, serviceId } = req.body;
    uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    if (!number || !amount || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "number, amount and serviceId are required"
      });
    }

    const wallet = await getWalletByUserId(uid);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    purchaseAmount = Number(amount);

    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
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
      phone_number: number,
      service_id: serviceId,
      amount: purchaseAmount,
      quantity: 1,
      status: "pending"
    });

    await createTransaction({
      user_id: uid,
      service_type: "airtime recharge",
      reference,
      amount: purchaseAmount,
      status_type: "debit",
      fee: 0,
      total: purchaseAmount,
      description: `Airtime purchase for ${number}`,
      status: "processing"
    });

    const vtpassResponse = await buyAirtime({
      request_id: reference,
      serviceID: serviceId,
      amount: purchaseAmount,
      phone: number
    });

    const providerData = vtpassResponse.data?.content?.transactions;
    const providerMessage = vtpassResponse.message;

    if (vtpassResponse.status === "success") {
      await updateVtuTransaction(reference, {
        provider_transaction_id: providerData?.transactionId,
        provider_request_id: vtpassResponse.data?.requestId,
        provider_status: providerData?.status,
        type: providerData?.type,
        commission: providerData?.commission,
        total_amount: providerData?.total_amount,
        status: "successful"
      });

      await updateTransactionStatus(reference, "successful");

      return res.status(200).json({
        success: true,
        message: "Airtime purchase successful",
        data: {
          reference,
          phone_number: number,
          amount: purchaseAmount
        }
      });
    }

    if (vtpassResponse.status === "pending") {
      await updateVtuTransaction(reference, {
        provider_request_id: vtpassResponse.data?.requestId,
        type: vtpassResponse.data?.type,
        provider_status: "pending",
        status: "pending"
      });

      await updateTransactionStatus(reference, "pending");

      return res.status(202).json({
        success: true,
        message: "Transaction processing",
        data: { reference }
      });
    }

    if (providerMessage?.toLowerCase().includes("low wallet balance")) {
      await updateVtuTransaction(reference, {
        status: "failed",
        provider_status: "low_wallet_balance"
      });

      await updateTransactionStatus(reference, "failed");

      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. Please try again later."
      });
    }

    await updateVtuTransaction(reference, {
      status: "failed",
      provider_status: vtpassResponse.status
    });

    await updateTransactionStatus(reference, "failed");

    return res.status(400).json({
      success: false,
      message: mapProviderError(providerMessage)
    });

  } catch (error) {
    if (debited && reference) {
      await updateVtuTransaction(reference, {
        status: "pending",
        provider_status: "unknown"
      });

      await updateTransactionStatus(reference, "pending");
    }

    return res.status(500).json({
      success: false,
      message: "Transaction processing. Please check status later."
    });
  }
};

module.exports = {
  purchaseAirtime
};