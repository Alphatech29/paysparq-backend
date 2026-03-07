const { resolveFlutterwaveAccount } = require("../../utilities/flutterwave");

const FALLBACK_MESSAGE = "Unable to verify account details. Please check and try again.";

const resolveFlutterwaveAccountController = async (req, res) => {
  try {
    const account_number = String(req.body?.account_number || "").trim();
    const account_bank = String(req.body?.account_code || "").trim();

    /* Validation */
    if (!account_number || !account_bank) {
      return res.status(400).json({
        status: "error",
        message: FALLBACK_MESSAGE,
      });
    }

    if (!/^\d{10}$/.test(account_number)) {
      return res.status(400).json({
        status: "error",
        message: FALLBACK_MESSAGE,
      });
    }

    const account = await resolveFlutterwaveAccount({
      account_number,
      account_bank,
    });

    if (!account || !account.account_name) {
      return res.status(404).json({
        status: "error",
        message: FALLBACK_MESSAGE,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Account resolved successfully",
      data: {
        account_number: account.account_number,
        account_name: account.account_name,
        bank_code: account.account_bank || account_bank,
      },
    });

  } catch (error) {
    /* FULL LOG FOR YOU (developer only) */
    console.error("RESOLVE ACCOUNT INTERNAL:", {
      status: error.status,
      message: error.message,
      raw: error,
    });

    /* USER ALWAYS GETS CLEAN MESSAGE */
    return res.status(error.status || 500).json({
      status: "error",
      message: FALLBACK_MESSAGE,
    });
  }
};

module.exports = { resolveFlutterwaveAccountController };