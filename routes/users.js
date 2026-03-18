const express = require("express");
const { getUserWallet, getDedicatedAccount } = require("../controllers/users/wallet");
const { getUserController } = require("../controllers/users/user");
const { requireAuth } = require("../middleware/requireAuth");
const { getAllGiftcardProductsController, getAllCountriesController, getGiftcardProductByIdController, getGiftcardProductDiscountController } = require("../controllers/users/giftcard");
const { retrieveFlutterwaveBanks } = require("../controllers/flutterwave/bank");
const { resolveFlutterwaveAccountController } = require("../controllers/flutterwave/verifyAccount");
const { transferController } = require("../controllers/users/transfer");
const { createTransactionPinController, changeTransactionPinController } = require("../controllers/users/transactionPin");
const { getGiftcardBrands } = require("../controllers/users/sellGiftcard");
const { tradeGiftController } = require("../controllers/users/tradeGift");
const { getUserTransactions } = require("../controllers/users/history");
const { paystackWebhook } = require("../utilities/paystackWebhook");
const { createGiftcardOrder } = require("../controllers/users/orderCard");
const { reloadlyWebhook } = require("../utilities/reloadlyWebhook");
const { getReferralsByReferrerUidController } = require("../controllers/users/referrals");
const { purchaseAirtime } = require("../controllers/users/airtime");
const { vtpassWebhook } = require("../utilities/vtpassWebhook");
const { getDataVariationsController } = require("../controllers/users/variations");
const { purchaseData } = require("../controllers/users/data");

const userRoute = express.Router();

// ------- User Routes --------- //
userRoute.get("/wallet", requireAuth, getUserWallet);
userRoute.get("/user", requireAuth, getUserController);
userRoute.get("/all-products", getAllGiftcardProductsController);
userRoute.get("/products/:productid", requireAuth, getGiftcardProductByIdController);
userRoute.get("/all-countries", getAllCountriesController);
userRoute.get("/banks", retrieveFlutterwaveBanks );
userRoute.post("/resolve-account", resolveFlutterwaveAccountController);
userRoute.post("/transfer", requireAuth, transferController);
userRoute.post("/create-pin", requireAuth, createTransactionPinController)
userRoute.post("/change-pin", requireAuth, changeTransactionPinController)
userRoute.get("/get-giftcard", getGiftcardBrands)
userRoute.post("/trade-card", requireAuth, tradeGiftController)
userRoute.get("/history", requireAuth, getUserTransactions)
userRoute.get("/dedicated-account", requireAuth, getDedicatedAccount)
userRoute.post("/web-hook", paystackWebhook),
userRoute.post("/webhook", reloadlyWebhook)
userRoute.get("/giftcards/products/:productid/discount", getGiftcardProductDiscountController);
userRoute.post("/card-order",requireAuth, createGiftcardOrder);
userRoute.get("/referral",requireAuth, getReferralsByReferrerUidController);
userRoute.post("/purchaseAirtime",requireAuth, purchaseAirtime)
userRoute.post("/vtpassWebhook", vtpassWebhook)
userRoute.get("/data-variations/:serviceID", getDataVariationsController)
userRoute.post("/purchaseData", requireAuth, purchaseData)

module.exports = userRoute;
