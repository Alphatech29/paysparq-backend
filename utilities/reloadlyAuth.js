// services/reloadlyAuth.js
const axios = require("axios");
const { getAllWebSettings } = require("./settings");

const AUTH_URL = "https://auth.reloadly.com/oauth/token";

// Token cache by audience
const tokenCache = {};

const normalizeAudience = (audience) => audience.replace(/\/+$/, "");

const getReloadlyToken = async (audience) => {
  // Validate input
  if (!audience) {
    throw new Error("Reloadly audience is required");
  }

  // Normalize audience
  const normalizedAudience = normalizeAudience(audience);

  // Check token cache
  const cached = tokenCache[normalizedAudience];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // Load web settings
  const settings = await getAllWebSettings();

  const clientId = settings.reloadly_client_id;
  const clientSecret = settings.reloadly_client_secret;

  // Validate credentials
  if (!clientId || !clientSecret) {
    throw new Error("Reloadly credentials not found in web settings");
  }

  // Request token
  try {
    const response = await axios.post(
      AUTH_URL,
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        audience: normalizedAudience,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    // Cache token
    const { access_token, expires_in } = response.data;
    const expiresAt = Date.now() + expires_in * 1000 - 60_000;

    tokenCache[normalizedAudience] = {
      token: access_token,
      expiresAt,
    };

    return access_token;
  } catch (error) {
    throw new Error("Failed to authenticate with Reloadly");
  }
};

module.exports = { getReloadlyToken };
