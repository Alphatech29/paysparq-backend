const axios = require("axios");
const { getReloadlyToken } = require("./reloadlyAuth");
const { getAllWebSettings } = require("./settings");

const getReloadlyServices = async () => {
  const settings = await getAllWebSettings();

  return {
    giftcards: settings.reloadly_giftcards_base_url,
    topups: settings.reloadly_topups_base_url,
    utilities: settings.reloadly_utilities_base_url,
  };
};

const getAllReloadlyBalances = async () => {
  const results = {};
  const SERVICES = await getReloadlyServices();

  for (const [service, baseUrl] of Object.entries(SERVICES)) {
    if (!baseUrl) {
      results[service] = {
        success: false,
        message: "Base URL not configured",
      };
      continue;
    }

    try {
      const token = await getReloadlyToken(baseUrl);

      const response = await axios.get(
        `${baseUrl}/accounts/balance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      results[service] = {
        success: true,
        ...response.data,
      };
    } catch (error) {
      if (error.response) {
        results[service] = {
          success: false,
          status: error.response.status,
          message:
            error.response.data?.message ||
            (error.response.status === 401
              ? "Unauthorized"
              : error.response.status === 404
              ? "Endpoint not found"
              : "Request failed"),
        };
      } else {
        results[service] = {
          success: false,
          message: "Service unreachable",
        };
      }
    }
  }

  return results;
};

module.exports = { getAllReloadlyBalances };
