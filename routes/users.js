const express = require("express");
const { getUserWallet, getDedicatedAccount } = require("../controllers/users/wallet");
const { getUserController } = require("../controllers/users/user");
const { requireAuth } = require("../middleware/requireAuth");
const { getAllGiftcardProductsController, getAllCountriesController, getGiftcardProductByIdController } = require("../controllers/users/giftcard");
const { retrieveFlutterwaveBanks } = require("../controllers/flutterwave/bank");
const { resolveFlutterwaveAccountController } = require("../controllers/flutterwave/verifyAccount");
const { transferController } = require("../controllers/users/transfer");
const { createTransactionPinController, changeTransactionPinController } = require("../controllers/users/transactionPin");
const { getGiftcardBrands } = require("../controllers/users/sellGiftcard");
const { tradeGiftController } = require("../controllers/users/tradeGift");
const { getUserTransactions } = require("../controllers/users/history");
const { paystackWebhook } = require("../utilities/paystackWebhook");

const userRoute = express.Router();

// ------- User Routes --------- //
userRoute.get("/wallet", requireAuth, getUserWallet);
userRoute.get("/user", requireAuth, getUserController);
userRoute.get("/all-products",requireAuth, getAllGiftcardProductsController);
userRoute.get("/giftcards/products/:productid",requireAuth, getGiftcardProductByIdController);
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

module.exports = userRoute;
