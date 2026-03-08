const { getWalletByUserId, getDedicatedAccountByUserId } = require("../../utilities/wallet");

const getUserWallet = async (req, res) => {
  try {
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
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized user"
      });
    }

    const account = await getDedicatedAccountByUserId(uid);

    if (!account) {
      return res.status(404).json({
        status: false,
        message: "Dedicated account not found"
      });
    }

    return res.status(200).json({
      status: true,
      data: account
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch dedicated account"
    });
  }
};

module.exports = {
  getUserWallet,
  getDedicatedAccount
};