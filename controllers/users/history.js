const { getTransactionsByUserId } = require("../../utilities/history");

const getUserTransactions = async (req, res) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    const transactions = await getTransactionsByUserId(uid);

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
    });
  }
};

module.exports = {
  getUserTransactions,
};