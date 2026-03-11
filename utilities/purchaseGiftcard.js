const axios = require("axios");
const { getReloadlyToken } = require("./reloadlyAuth");
const { getAllWebSettings } = require("./settings");

const orderGiftCard = async (data) => {
  try {
    const settings = await getAllWebSettings();

    const baseUrl = settings?.reloadly_giftcards_base_url?.replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error("Reloadly giftcards base URL not configured");
    }

    const token = await getReloadlyToken(baseUrl);

    const payload = {
      customIdentifier: data.customIdentifier,
      preOrder: false,
      productId: Number(data.productId),
      quantity: Number(data.quantity),
      unitPrice: Number(data.unitPrice),
      senderName: settings?.site_name,
      recipientEmail: data.recipientEmail,
      productAdditionalRequirements: {
        userId: String(data.userId)
      }
    };

    if (data.phoneNumber && data.countryCode) {
      payload.recipientPhoneDetails = {
        countryCode: data.countryCode,
        phoneNumber: data.phoneNumber
      };
    }

    const response = await axios.post(
      `${baseUrl}/orders`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/com.reloadly.giftcards-v1+json",
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    return response.data;

  } catch (err) {
    const errorMessage =
      err.response?.data?.message ||
      err.response?.data ||
      err.message ||
      "Reloadly giftcard order failed";

    console.error("Giftcard Order Error:", errorMessage);

    throw new Error(errorMessage);
  }
};

module.exports = { orderGiftCard };