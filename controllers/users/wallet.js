const { getWalletByUserId, getDedicatedAccountByUserId } = require("../../utilities/wallet");

const getUserWallet = async (req, res) => {
  try {
    // read uid from auth middleware
    const user_id = req.user?.uid;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found on request",
      });
    }

    const wallet = await getWalletByUserId(user_id);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getDedicatedAccount = async (req, res) => {
  console.log("==== GET DEDICATED ACCOUNT REQUEST START ====");

  try {
    console.log("Request received at:", new Date().toISOString());

    console.log("Full req.user object:", req.user);

    const uid = req.user?.uid;

    console.log("Extracted UID:", uid);

    if (!uid) {
      console.log("UID not found in request");

      return res.status(401).json({
        status: false,
        message: "Unauthorized user"
      });
    }

    console.log("Fetching dedicated account from database...");

    const account = await getDedicatedAccountByUserId(uid);

    console.log("Database response:", account);

    if (!account) {
      console.log("No dedicated account found for UID:", uid);

      return res.status(404).json({
        status: false,
        message: "Dedicated account not found"
      });
    }

    console.log("Dedicated account successfully retrieved");

    return res.status(200).json({
      status: true,
      data: account
    });

  } catch (error) {
    console.error("ERROR fetching dedicated account:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch dedicated account",
      error: error.message
    });
  } finally {
    console.log("==== GET DEDICATED ACCOUNT REQUEST END ====");
  }
};

module.exports = {
  getUserWallet, getDedicatedAccount
};