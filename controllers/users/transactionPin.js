const { createTransactionPin, changeTransactionPin } = require("../../utilities/transactionPin");

/* ================= CREATE TRANSACTION PIN ================= */

const createTransactionPinController = async (req, res) => {
  try {

    const uid = req.user?.uid;

    /* -------- Authentication Check -------- */
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    /* -------- Extract PIN -------- */
    const { pin } = req.body;

    /* -------- Validation -------- */
    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "Transaction PIN is required",
      });
    }

    if (String(pin).length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Transaction PIN must be 4 digits",
      });
    }

    const pinPayload = {
      uid,
      pin,
    };

    /* -------- Call Utility -------- */
    const result = await createTransactionPin(pinPayload);

    return res.status(200).json({
      success: true,
      message: "Transaction PIN created successfully",
      data: result,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};


/* ================= CHANGE TRANSACTION PIN ================= */

const changeTransactionPinController = async (req, res) => {
  try {

    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: "Old PIN and New PIN are required",
      });
    }

    if (String(newPin).length !== 4) {
      return res.status(400).json({
        success: false,
        message: "New PIN must be 4 digits",
      });
    }

    const payload = { uid, oldPin, newPin };

    const result = await changeTransactionPin(payload);

    return res.status(200).json({
      success: true,
      message: "Transaction PIN changed successfully",
      data: result,
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to change transaction PIN",
    });
  }
};

module.exports = {
  createTransactionPinController,
  changeTransactionPinController
};