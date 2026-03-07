const { getAllGiftcardBrandsWithVariants } = require("../../utilities/sellGiftcard");

const getGiftcardBrands = async (req, res) => {
  try {
    const brands = await getAllGiftcardBrandsWithVariants();

    return res.status(200).json({
      success: true,
      message: "Giftcard brands fetched successfully",
      data: brands,
    });
  } catch (error) {
    console.error("Error fetching giftcard brands:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch giftcard brands",
      error: error.message,
    });
  }
};

module.exports = {
  getGiftcardBrands,
};