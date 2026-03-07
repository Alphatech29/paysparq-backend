const express = require("express");
const { getWebSettingsController } = require("../controllers/general/settings");



const generalRoute = express.Router();

// ------- General Routes --------- //
generalRoute.get("/setting", getWebSettingsController);


module.exports = generalRoute;
