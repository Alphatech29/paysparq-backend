const { getWalletByUserId } = require("../../utilities/wallet");

const getUserWallet = async (req, res) => {
  try {

    // FIX: read uid from auth middleware
    const user_id = req.user?.uid;

    if (!user_id) {
      console.warn("User ID missing on request");

      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found on request",
      });
    }

    const wallet = await getWalletByUserId(user_id);

    if (!wallet) {
      console.warn("Wallet not found for user_id:", user_id);

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
    console.error("====== GET USER WALLET ERROR ======");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getUserWallet,
};
