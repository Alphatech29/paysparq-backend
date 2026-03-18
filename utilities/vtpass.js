require("dotenv").config();
const axios = require("axios");

const BASE_URL = process.env.VTPASS_BASE_URL;

async function vtpassRequest(method = "POST", endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const config = {
      method,
      url,
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.VTPASS_API_KEY,
        "secret-key": process.env.VTPASS_SECRET_KEY
      },
      timeout: 15000
    };

    if (method.toUpperCase() !== "GET") {
      config.data = data;
    }

    const response = await axios(config);
    const res = response.data;

    const txn = res?.content?.transactions || {};
    const providerStatus = String(txn?.status || "").toLowerCase();
    const code = res?.code;
    const responseDescription = res?.response_description || "";

    const isSuccessful =
      code === "000" ||
      providerStatus === "delivered" ||
      responseDescription.toUpperCase().includes("TRANSACTION SUCCESSFUL");

    const isPending =
      providerStatus === "pending" ||
      providerStatus === "processing" ||
      providerStatus === "initiated";

    let status = "failed";

    if (endpoint.includes("/pay")) {
      if (isSuccessful) {
        status = "success";
      } else if (isPending) {
        status = "pending";
      } else {
        status = "failed";
      }
    } else {
      status = isSuccessful ? "success" : "failed";
    }

    return {
      success: status === "success",
      status,
      provider_status: providerStatus || "unknown",
      message: responseDescription || "No response message",
      provider_reference: txn?.transactionId || null,
      data: res
    };

  } catch (error) {
    const providerMessage =
      error?.response?.data?.response_description ||
      error?.response?.data?.message ||
      error.message;

    return {
      success: false,
      status: "failed",
      provider_status: "failed",
      message: providerMessage,
      provider_reference: null,
      data: error?.response?.data || null
    };
  }
}

async function getDataVariations(serviceID) {
  return vtpassRequest(
    "GET",
    `/service-variations?serviceID=${serviceID}`
  );
}

async function buyData({
  request_id,
  phone,
  serviceID,
  variation_code
}) {
  const payload = {
    request_id,
    serviceID,
    billersCode: phone,
    variation_code,
    phone
  };

  return vtpassRequest("POST", "/pay", payload);
}

async function buyAirtime({
  phone,
  amount,
  request_id,
  serviceID
}) {
  const payload = {
    request_id,
    serviceID,
    amount,
    phone
  };

  return vtpassRequest("POST", "/pay", payload);
}

module.exports = {
  buyAirtime,
  buyData,
  getDataVariations
};