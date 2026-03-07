const express = require("express");
const { registerUser} = require("../controllers/auths/register");
const { login} = require("../controllers/auths/login");
const { refreshToken } = require("../controllers/auths/refreshToken");
const { logout } = require("../controllers/auths/logout");
const { rateLimitByClient } = require("../middleware/rateLimit");
const { verifyEmailController, getOTPExpiryController } = require("../utilities/emailVerification");
const { resendVerificationOTPController } = require("../utilities/resendEmailVerification");
const authRoute = express.Router();


// ------- Authentication --------- //
authRoute.post("/create-user",registerUser);
authRoute.post("/login",rateLimitByClient({max: 5}),login);
authRoute.post("/refresh-token",rateLimitByClient({max: 10}), refreshToken);
authRoute.post("/logout", logout);
authRoute.post("/verify-otp", verifyEmailController);
authRoute.get("/get-expire-time", getOTPExpiryController)
authRoute.post("/resend-otp", resendVerificationOTPController)


module.exports = authRoute;
