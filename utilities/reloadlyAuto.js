const cron = require("node-cron");
const { getGiftcardCountries } = require("./reloadlyGiftcard");
const { bulkUpsertCountries } = require("./giftcard");

async function syncGiftcardCountries() {
  const startTime = Date.now();

  try {
    console.log("======================================");
    console.log("[STARTUP] Giftcard country sync started");
    console.log("[STARTUP] Time:", new Date().toISOString());

    const countries = await getGiftcardCountries();

    if (!Array.isArray(countries)) {
      throw new Error("Invalid countries response (not an array)");
    }

    console.log(`[STARTUP] Countries fetched: ${countries.length}`);

    /**
     * ✅ Step 1: Build payload array
     */
    const payload = countries
      .filter(c => c.isoName) // safety
      .map(c => ({
        iso_code: c.isoName,
        country_name: c.name,
        currency_code: c.currencyCode,
        currency_name: c.currencyName,
        flag_url: c.flagUrl,
      }));

    console.log("[STARTUP] Prepared countries payload:", payload.length);

    /**
     * ✅ Step 2: Bulk insert / update ONCE
     */
    const affected = await bulkUpsertCountries(payload);

    console.log("[STARTUP] Sync completed");
    console.log("[STARTUP] Countries inserted/updated:", affected);
    console.log("[STARTUP] Duration:", `${Date.now() - startTime}ms`);
    console.log("======================================");
  } catch (error) {
    console.error("======================================");
    console.error("[STARTUP ERROR]", error.message);
    console.error("[STARTUP ERROR] Duration:", `${Date.now() - startTime}ms`);
    console.error("======================================");
  }
}

/**
 * ✅ RUN IMMEDIATELY WHEN SERVER STARTS
 */
(async () => {
  console.log("[BOOT] Server started, triggering giftcard country sync");
  await syncGiftcardCountries();
})();

/**
 * ⏰ OPTIONAL: Daily sync
 */
cron.schedule("0 0 * * *", async () => {
  console.log("[CRON] Daily giftcard country sync triggered");
  await syncGiftcardCountries();
});
