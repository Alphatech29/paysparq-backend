const vtpassWebhook = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Webhook received"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed"
    });
  }
};

module.exports = {
  vtpassWebhook
};