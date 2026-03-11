const {
  getAllGiftcardProducts,
  getAllCountries,
  getGiftcardProductById
} = require("../../utilities/giftcard");

const { getGiftcardProductDiscount } = require("../../utilities/reloadlyGiftcard");

/**
 * Get all giftcard products
 */
async function getAllGiftcardProductsController(req, res) {
  const startTime = Date.now();

  try {
    const products = await getAllGiftcardProducts();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error("Controller Error - Get Giftcard Products", {
      message: error.message,
      stack: error.stack,
      duration_ms: Date.now() - startTime
    });

    return res.status(500).json({
      success: false
    });
  }
}

/**
 * Get giftcard product by ID
 */
async function getGiftcardProductByIdController(req, res) {
  const startTime = Date.now();

  try {
    const { productid } = req.params;

    if (!productid || isNaN(productid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid giftcard product ID"
      });
    }

    const product = await getGiftcardProductById(Number(productid));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Giftcard product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Giftcard product fetched successfully",
      data: product
    });

  } catch (error) {
    console.error("Controller Error - Get Giftcard Product By ID", {
      message: error.message,
      stack: error.stack,
      duration_ms: Date.now() - startTime
    });

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch giftcard product"
    });
  }
}

/**
 * Get giftcard product discount by ID
 */
async function getGiftcardProductDiscountController(req, res) {
  const startTime = Date.now();

  try {
    const { productid } = req.params;

    if (!productid || isNaN(productid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const discount = await getGiftcardProductDiscount(Number(productid));

    return res.status(200).json({
      success: true,
      data: discount
    });

  } catch (error) {
    console.error("Controller Error - Get Giftcard Product Discount", {
      message: error.message,
      stack: error.stack,
      duration_ms: Date.now() - startTime
    });

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch product discount"
    });
  }
}

/**
 * Get all countries
 */
async function getAllCountriesController(req, res) {
  const startTime = Date.now();

  try {
    const countries = await getAllCountries();

    return res.status(200).json({
      success: true,
      message: "Countries fetched successfully",
      count: countries.length,
      data: countries
    });
  } catch (error) {
    console.error("Controller Error - Get Countries", {
      message: error.message,
      stack: error.stack,
      duration_ms: Date.now() - startTime
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch countries"
    });
  }
}

module.exports = {
  getAllGiftcardProductsController,
  getGiftcardProductByIdController,
  getGiftcardProductDiscountController,
  getAllCountriesController
};