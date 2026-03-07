const { getAllWebSettings } = require("../../utilities/settings");

const getWebSettingsController = async (req, res) => {
  try {
    const settings = await getAllWebSettings();

    return res.status(200).json({
      success: true,
      message: "Web settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching web settings:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch web settings",
    });
  }
};

module.exports = {
  getWebSettingsController,
};