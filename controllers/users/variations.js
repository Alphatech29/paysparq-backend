const { getDataVariations } = require("../../utilities/vtpass");

/* -------------------------------
   HELPER: RETRY WRAPPER
-------------------------------- */
async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    const isNetworkError =
      err.code === "EAI_AGAIN" ||
      err.code === "ENOTFOUND" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT";

    if (retries > 0 && isNetworkError) {
      console.warn(`Retrying VTPass... (${retries})`, err.code);

      await new Promise((res) => setTimeout(res, delay));

      return fetchWithRetry(fn, retries - 1, delay);
    }

    throw err;
  }
}

/* -------------------------------
   GET DATA PLANS CONTROLLER
-------------------------------- */
async function getDataVariationsController(req, res) {
  try {
    const { serviceID } = req.params;

    if (!serviceID) {
      return res.status(400).json({
        success: false,
        message: "serviceID is required (e.g airtel-data, mtn-data)",
      });
    }

    // ✅ Retry-enabled call
    const response = await fetchWithRetry(() =>
      getDataVariations(serviceID)
    );

    if (!response || !response.data) {
      return res.status(502).json({
        success: false,
        message: "No response from data provider",
      });
    }

    const providerCode = response.data?.response_description;
    const isSuccess = providerCode === "000";

    if (!isSuccess) {
      return res.status(400).json({
        success: false,
        message:
          providerCode || "Failed to fetch data variations",
      });
    }

    const variations =
      response.data?.content?.variations ||
      response.data?.content?.varations ||
      [];

    const formatted = variations.map((v) => ({
      code: v.variation_code,
      name: v.name,
      amount: Number(v.variation_amount),
      fixed: v.fixedPrice === "Yes",
    }));

    return res.status(200).json({
      success: true,
      serviceID,
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("❌ VTpass ERROR:", error.message || error);

    // ✅ HANDLE NETWORK ERRORS CLEANLY
    if (
      error.code === "EAI_AGAIN" ||
      error.code === "ENOTFOUND"
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Network issue: Unable to reach data provider. Please try again.",
      });
    }

    if (error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getDataVariationsController,
};