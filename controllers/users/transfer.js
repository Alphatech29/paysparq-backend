const { transferMoney } = require("../../utilities/transfer");

const transferController = async (req, res) => {
  try {

    console.log("=========== TRANSFER REQUEST START ===========");

    console.log("Incoming Request Body:", req.body);
    console.log("Authenticated User:", req.user);

    const { recipient, transaction, authorization } = req.body;

    const uid = req.user?.uid;

    console.log("User UID:", uid);

    /* -------- Authentication Check -------- */
    if (!uid) {
      console.log("Unauthorized transfer attempt");

      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    /* -------- Extract Fields From Payload -------- */
    const account_number = recipient?.account_number;
    const bank_name = recipient?.bank_name;
    const bank_code = recipient?.bank_code;
    const account_name = recipient?.account_name;

    const amount = transaction?.amount;
    const narration = transaction?.narration || "";

    const pin = authorization?.pin;

    /* -------- Required Fields Validation -------- */
    if (!account_number || !amount || !bank_name || !bank_code || !account_name) {

      console.log("Missing Required Fields", {
        account_number,
        amount,
        bank_name,
        bank_code,
        account_name,
      });

      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const transferAmount = Number(amount);

    console.log("Parsed Transfer Amount:", transferAmount);

    /* -------- Amount Validation -------- */
    if (isNaN(transferAmount) || transferAmount <= 0) {

      console.log("Invalid Transfer Amount:", transferAmount);

      return res.status(400).json({
        success: false,
        message: "Invalid transfer amount",
      });
    }

    const transferPayload = {
      uid,
      account_number,
      amount: transferAmount,
      bank_name,
      bank_code,
      account_name,
      narration,
      pin
    };

    console.log("Transfer Payload Sent To Utility:", transferPayload);

    /* -------- Call Transfer Utility -------- */
    const result = await transferMoney(transferPayload);

    console.log("Transfer Utility Result:", result);

    console.log("=========== TRANSFER SUCCESS ===========");

    return res.status(200).json({
      success: true,
      message: "Transfer successful",
      data: result,
    });

  } catch (error) {

    console.error("=========== TRANSFER ERROR ===========");
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = { transferController };