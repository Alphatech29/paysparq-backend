require("dotenv").config();
const axios = require("axios");

/* ---------------- Paystack Axios Instance ---------------- */
const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

/* ---------------- Axios Request Logger ---------------- */
paystack.interceptors.request.use((config) => {
  console.log("========== PAYSTACK REQUEST ==========");
  console.log("URL:", config.baseURL + config.url);
  console.log("METHOD:", config.method);
  console.log("HEADERS:", config.headers);
  console.log("DATA:", config.data);
  console.log("======================================");
  return config;
});

/* ---------------- Axios Response Logger ---------------- */
paystack.interceptors.response.use(
  (response) => {
    console.log("========== PAYSTACK RESPONSE ==========");
    console.log("STATUS:", response.status);
    console.log("DATA:", response.data);
    console.log("=======================================");
    return response;
  },
  (error) => {
    console.log("========== PAYSTACK ERROR ==========");
    console.log("MESSAGE:", error.message);
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);
    console.log("====================================");
    return Promise.reject(error);
  }
);

/* =========================================================
   CREATE CUSTOMER
========================================================= */
const createCustomer = async ({ email, first_name, last_name, phone }) => {
  try {
    const payload = {
      email,
      first_name,
      last_name,
      phone,
    };

    const response = await paystack.post("/customer", payload);

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/* =========================================================
   CREATE DEDICATED VIRTUAL ACCOUNT
========================================================= */
const createDedicatedAccount = async ({
  customer_code,
  preferred_bank,
  phone,
}) => {
  try {
    const payload = {
      customer: customer_code,
      preferred_bank,
      phone, // required for titan-paystack
    };

    const response = await paystack.post("/dedicated_account", payload);

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/* =========================================================
   FETCH DVA PROVIDERS (AVAILABLE BANKS)
========================================================= */
const fetchDedicatedAccountProviders = async () => {
  try {
    const response = await paystack.get(
      "/dedicated_account/available_providers"
    );

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/* =========================================================
   EXPORT FUNCTIONS
========================================================= */
module.exports = {
  createCustomer,
  createDedicatedAccount,
  fetchDedicatedAccountProviders,
};