// services/reloadlyGiftcards.js
const axios = require("axios");
const { getReloadlyToken } = require("./reloadlyAuth");
const { getAllWebSettings } = require("./settings");

/**
 * Resolve Reloadly Giftcards Base URL
 */
const getBaseUrl = async () => {
  const settings = await getAllWebSettings();
  const rawBaseUrl = settings.reloadly_giftcards_base_url;

  if (!rawBaseUrl) {
    throw new Error("Reloadly giftcards base URL not configured");
  }

  return rawBaseUrl.replace(/\/+$/, "");
};

/**
 * Core Giftcards API Caller
 */
const callGiftcardsApi = async (endpoint, queryParams = {}) => {
  const baseUrl = await getBaseUrl();
  const token = await getReloadlyToken(baseUrl);

  const requestUrl = `${baseUrl}${endpoint}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/com.reloadly.giftcards-v1+json",
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get(requestUrl, {
      headers,
      params: queryParams,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        throw new Error("Unauthorized: Reloadly token expired or invalid");
      }

      if (status === 404) {
        throw new Error("Reloadly endpoint not found");
      }

      throw new Error(
        `Reloadly Giftcards Error: ${data?.message || "Request failed"}`
      );
    }

    throw new Error("Unable to connect to Reloadly Giftcards service");
  }
};

/**
 * Public API wrappers
 */
const getGiftcardCategories = async () => {
  return callGiftcardsApi("/product-categories");
};

const getGiftcardCountries = async () => {
  return callGiftcardsApi("/countries");
};

const getGiftcardCountryByIso = async (countryCode) => {
  if (!countryCode) {
    throw new Error("Country ISO code is required");
  }

  return callGiftcardsApi(`/countries/${countryCode.toUpperCase()}`);
};

const getReloadlyGiftCardProductById = async (productId) => {
  if (!productId || isNaN(productId)) {
    throw new Error("Valid gift card product ID is required");
  }

  return callGiftcardsApi(`/products/${productId}`);
};

const getReloadlyGiftCardProducts = async (params = {}) => {
  return callGiftcardsApi("/products", {
    size: params.size || 10,
    page: params.page || 1,
    productName: params.productName,
    countryCode: params.countryCode,
    productCategoryId: params.productCategoryId,
    includeRange: params.includeRange,
    includeFixed: params.includeFixed,
  });
};

module.exports = {
  getGiftcardCategories,
  getGiftcardCountries,
  getGiftcardCountryByIso,
  getReloadlyGiftCardProducts,
  getReloadlyGiftCardProductById,
};
