const { getFlutterwaveBanks } = require("../../utilities/flutterwave");

const retrieveFlutterwaveBanks = async (req, res) => {
  try {
    // normalize & validate country
    let country = (req.query.country || "NG").toString().trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(country)) {
      return res.status(400).json({
        success: false,
        message: "Invalid country code format. Use ISO 2-letter code e.g NG, GH, KE",
      });
    }

    const banks = await getFlutterwaveBanks(country);

    if (!banks || !Array.isArray(banks)) {
      return res.status(502).json({
        success: false,
        message: "Invalid response received from Flutterwave",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Banks retrieved successfully for ${country}`,
      count: banks.length,
      data: banks,
    });

  } catch (error) {
    console.error("Flutterwave Bank Fetch Error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve banks",
    });
  }
};

module.exports = { retrieveFlutterwaveBanks };