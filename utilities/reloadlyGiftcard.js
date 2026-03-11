const axios = require("axios");
const { getReloadlyToken } = require("./reloadlyAuth");
const { getAllWebSettings } = require("./settings");

//Resolve Reloadly Giftcards Base URL
const getBaseUrl = async () => {
  const settings = await getAllWebSettings();
  const rawBaseUrl = settings.reloadly_giftcards_base_url;

  if (!rawBaseUrl) {
    throw new Error("Reloadly giftcards base URL not configured");
  }

  return rawBaseUrl.replace(/\/+$/, "");
};

//Core Giftcards API Caller
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

//Public API wrappers
const getGiftcardCountries = async () => {
  return callGiftcardsApi("/countries");
};

const getReloadlyGiftCardProducts = async () => {
  const PAGE_SIZE = 200;

  // First page to get totalPages
  const firstPage = await callGiftcardsApi("/products", {
    page: 0,
    size: PAGE_SIZE,
  });

  let products = [...firstPage.content];
  const totalPages = firstPage.totalPages;

  console.log(`[Reloadly] Total pages: ${totalPages}`);

  // Fetch remaining pages in parallel
  const requests = [];

  for (let page = 1; page < totalPages; page++) {
    requests.push(
      callGiftcardsApi("/products", {
        page,
        size: PAGE_SIZE,
      })
    );
  }

  const responses = await Promise.all(requests);

  responses.forEach((res) => {
    products = products.concat(res.content);
  });

  // Filter ACTIVE products
  const activeProducts = products.filter(
    (product) => product.status === "ACTIVE"
  );

  // Sort alphabetically
  activeProducts.sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );

  return activeProducts;
};

//Get Giftcard Product Discount by Product ID
const getGiftcardProductDiscount = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  return callGiftcardsApi(`/products/${productId}/discounts`);
};

//Get Giftcard Redeem Code by Transaction ID
const getRedeemCode = async (transactionId) => {
  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }

  const endpoint = `/orders/transactions/${transactionId}/cards`;

  const data = await callGiftcardsApi(endpoint);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(card => ({
    card_number: card.cardNumber,
    pin_code: card.pinCode || null,
    redemption_url: card.redemptionUrl || null
  }));
};

module.exports = {
  getGiftcardCountries,
  getReloadlyGiftCardProducts,
  getGiftcardProductDiscount,
  getRedeemCode
};