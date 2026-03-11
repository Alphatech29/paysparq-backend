const cron = require("node-cron");
const { getReloadlyGiftCardProducts } = require("./reloadlyGiftcard");
const {
  createGiftcardProduct,
  emptyGiftcardProductsTable,
} = require("./giftcard");

//Prevent overlapping jobs
let isRunning = false;

//Retry wrapper for API calls
async function safeFetchProducts(retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await getReloadlyGiftCardProducts();
    } catch (err) {
      console.error(`[API ERROR] Attempt ${attempt} failed:`, err.message);

      if (attempt === retries) {
        console.error("[API ERROR] Max retries reached");
        return null;
      }

      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

//Main Sync Function
async function syncGiftcardProducts() {
  if (isRunning) {
    console.warn("[SYNC] Job already running, skipping...");
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log("======================================");
    console.log("[SYNC] Giftcard products sync started");
    console.log("[SYNC] Time:", new Date().toISOString());

    //Clean table
    console.log("[CLEANUP] Clearing giftcard products table...");
    await emptyGiftcardProductsTable();
    console.log("[CLEANUP] Table cleared");

    //Fetch products
    console.log("[FETCH] Fetching products from Reloadly...");

    const products = await safeFetchProducts();

    if (!products || !Array.isArray(products)) {
      console.error("[FETCH ERROR] Invalid response");
      return;
    }

    console.log(`[FETCH] Total products fetched: ${products.length}`);

    let successCount = 0;
    let failedCount = 0;

    for (const p of products) {
      try {
        if (!p.productId) {
          console.warn("[SKIPPED] Missing productId:", p.productName);
          continue;
        }

       const payload = {
  productId: p.productId,
  productName: p.productName ?? null,

  global: p.global === true,
  status: p.status ?? "ACTIVE",
  supportsPreOrder: p.supportsPreOrder === true,

  senderFee: p.senderFee ?? 0,
  senderFeePercentage: p.senderFeePercentage ?? 0,
  discountPercentage: p.discountPercentage ?? 0,

  denominationType: p.denominationType ?? null,

  recipientCurrencyCode: p.recipientCurrencyCode ?? null,
  minRecipientDenomination: p.minRecipientDenomination ?? null,
  maxRecipientDenomination: p.maxRecipientDenomination ?? null,

  senderCurrencyCode: p.senderCurrencyCode ?? null,
  minSenderDenomination: p.minSenderDenomination ?? null,
  maxSenderDenomination: p.maxSenderDenomination ?? null,

  fixedRecipientDenominations: p.fixedRecipientDenominations ?? [],
  fixedSenderDenominations: p.fixedSenderDenominations ?? [],
  fixedRecipientToSenderDenominationsMap:
    p.fixedRecipientToSenderDenominationsMap ?? {},

  metadata: p ?? {},

  logoUrls: p.logoUrls ?? [],

  brand: p.brand ?? null,
  category: p.category ?? null,
  country: p.country ?? null,

  redeemInstruction: p.redeemInstruction ?? null,
  additionalRequirements: p.additionalRequirements ?? null,

  recipientCurrencyToSenderCurrencyExchangeRate:
    p.recipientCurrencyToSenderCurrencyExchangeRate ?? null,
};

        await createGiftcardProduct(payload);

        successCount++;
      } catch (err) {
        failedCount++;
        console.error(
          `[PRODUCT ERROR] ${p.productName} (${p.productId})`,
          err.message
        );
      }
    }

    console.log("[SYNC] Completed");
    console.log("[SYNC] Products created:", successCount);
    console.log("[SYNC] Products failed:", failedCount);
    console.log("[SYNC] Duration:", `${Date.now() - startTime}ms`);
    console.log("======================================");
  } catch (error) {
    console.error("[SYNC ERROR]", error.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Run Immediately on Server Start
 */
// (async () => {
//   console.log("[STARTUP] Running giftcard sync on server start...");
//   await syncGiftcardProducts();
// })();

/**
 * Cron Job (Every 3 Days at Midnight WAT)
 */

cron.schedule(
  "0 0 */3 * *",
  async () => {
    console.log("[CRON] Giftcard sync triggered");

    await syncGiftcardProducts();
  },
  {
    timezone: "Africa/Lagos",
  }
);

module.exports = { syncGiftcardProducts };