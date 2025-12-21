const express = require("express");
const { registerUser} = require("../controllers/auths/register");
const { login} = require("../controllers/auths/login");
const authRoute = express.Router();


// ------- Authentication --------- //
authRoute.post("/create-user",registerUser);
authRoute.post("/login",login);


module.exports = authRoute;
