const { getAccessToken } = require("../utilities/oauthModel");

async function requireAuth(req, res, next) {
  try {

    // Extract access token
    const accessToken = req.cookies?.access_token;


    if (!accessToken) {
      console.warn(" AUTH FAILED: No access token found");

      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    //  Validate access token
    const tokenResult = await getAccessToken(accessToken);

    if (!tokenResult?.success) {
      console.warn("AUTH FAILED: Access token invalid or expired");


      return res.status(401).json({
        success: false,
        error: "Access token expired or invalid",
      });
    }

    //  Attach auth context
    req.user = tokenResult.data.user;
    req.client = tokenResult.data.client;

    next();
  } catch (err) {
    console.error("Error message:", err.message);
    console.error(
      "Stack trace:",
      process.env.NODE_ENV === "development" ? err.stack : "[hidden]"
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
}

module.exports = { requireAuth };
