const express = require("express");
const { registerUser} = require("../controllers/auths/register");
const { login} = require("../controllers/auths/login");
const { refreshToken } = require("../controllers/auths/refreshToken");
const { logout } = require("../controllers/auths/logout");
const { verifyEmailController, getOTPExpiryController } = require("../utilities/emailVerification");
const { resendVerificationOTPController } = require("../utilities/resendEmailVerification");
const { forgotPassword } = require("../controllers/auths/forgetPassord");
const { resetPassword } = require("../controllers/auths/resetPassword");
const authRoute = express.Router();


// ------- Authentication --------- //
authRoute.post("/create-user",registerUser);
authRoute.post("/login",login);
authRoute.post("/refresh-token", refreshToken);
authRoute.post("/logout", logout);
authRoute.post("/forgotPassword", forgotPassword)
authRoute.post("/resetPassword", resetPassword)
authRoute.post("/verify-otp", verifyEmailController);
authRoute.get("/get-expire-time", getOTPExpiryController)
authRoute.post("/resend-otp", resendVerificationOTPController)


module.exports = authRoute;
