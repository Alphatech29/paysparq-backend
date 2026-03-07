import axios from "axios";

const cleanKey = (key) => key?.replace(/^['"]|['"]$/g, "").trim();

const SECRET_KEY = cleanKey(process.env.FLW_SECRET_KEY);

if (!SECRET_KEY) {
  const err = new Error("Missing FLW_SECRET_KEY in environment variables");
  err.status = 500;
  throw err;
}

const flutterwave = axios.create({
  baseURL: "https://api.flutterwave.com/v3",
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${SECRET_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* =========================================================
   Helpers
========================================================= */

const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const normalizeCountry = (country) =>
  String(country || "NG").toUpperCase().trim();

/* =========================================================
   Fetch Banks
========================================================= */

export const getFlutterwaveBanks = async (
  country = "NG",
  includeProviderType = true
) => {
  try {
    const { data } = await flutterwave.get(`/banks/${normalizeCountry(country)}`, {
      params: { include_provider_type: includeProviderType ? 1 : 0 },
    });

    if (data?.status !== "success") {
      throw createError(502, data?.message || "Failed to fetch banks");
    }

    return data.data;

  } catch (error) {

    if (error.response) {
      throw createError(
        error.response.status || 502,
        error.response.data?.message || "Bank list unavailable"
      );
    }

    if (error.request || error.code === "ECONNABORTED") {
      throw createError(503, "Unable to reach Flutterwave servers");
    }

    if (error.status) throw error;

    throw createError(500, "Failed to retrieve banks");
  }
};

/* =========================================================
   Resolve Bank Account Name
========================================================= */

export const resolveFlutterwaveAccount = async ({
  account_number,
  account_bank,
}) => {
  if (!account_number || !account_bank) {
    throw createError(400, "Missing account details");
  }

  try {
    const { data } = await flutterwave.post("/accounts/resolve", {
      account_number: String(account_number).trim(),
      account_bank: String(account_bank).trim(),
    });

    // Flutterwave responded but account invalid
    if (data?.status !== "success" || !data?.data?.account_name) {
      throw createError(404, "Invalid Account");
    }

    return {
      account_number: data.data.account_number,
      account_name: data.data.account_name,
    };

  } catch (error) {

    /* Flutterwave HTTP response */
    if (error.response) {
      const status = error.response.status;

      if (status === 400) throw createError(400, "Invalid account details");
      if (status === 401 || status === 403) throw createError(401, "Authorization failed");
      if (status === 404) throw createError(404, "Invalid Account");
      if (status >= 500) throw createError(502, "Provider unavailable");
    }

    /* Network / timeout */
    if (error.request || error.code === "ECONNABORTED") {
      throw createError(503, "Network error");
    }

    /* Already structured */
    if (error.status) throw error;

    /* Unknown crash */
    throw createError(500, "Account verification failed");
  }
};