const express = require("express");
const { getUserWallet } = require("../controllers/users/wallet");
const { getUserController } = require("../controllers/users/user");
const { requireAuth } = require("../middleware/requireAuth");
const { getAllGiftcardProductsController, getAllCountriesController, getGiftcardProductByIdController } = require("../controllers/users/giftcard");

const userRoute = express.Router();

// ------- User Routes --------- //
userRoute.get("/wallet", requireAuth, getUserWallet);
userRoute.get("/user", requireAuth, getUserController);
userRoute.get("/all-products",requireAuth, getAllGiftcardProductsController);
userRoute.get("/giftcards/products/:productid",requireAuth, getGiftcardProductByIdController);
userRoute.get("/all-countries", getAllCountriesController);

module.exports = userRoute;
