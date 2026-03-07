const { getWalletByUserId } = require("../../utilities/wallet");

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

module.exports = {
  getUserWallet,
};