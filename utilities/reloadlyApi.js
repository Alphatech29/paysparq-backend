const axios = require("axios");
const { getReloadlyToken } = require("./reloadlyAuth");

const BASE_URL = "https://giftcards.reloadly.com";

const getAccountBalance = async () => {
  try {
    const token = await getReloadlyToken("https://giftcards.reloadly.com");

    const response = await axios.get(
      `${BASE_URL}/accounts/balance`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        throw new Error("Unauthorized: Invalid or expired token");
      }

      if (status === 404) {
        throw new Error("Balance endpoint not found");
      }

      throw new Error(
        `Reloadly Balance Error: ${error.response.data?.message || "Request failed"}`
      );
    }

    throw new Error("Unable to connect to Reloadly Balance service");
  }
};

module.exports = { getAccountBalance };
