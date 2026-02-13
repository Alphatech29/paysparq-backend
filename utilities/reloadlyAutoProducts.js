const cron = require("node-cron");
const { getReloadlyGiftCardProducts } = require("./reloadlyGiftcard");
const {
  createGiftcardProduct,
  emptyGiftcardProductsTable,
} = require("./giftcard");

/**
 * Simple retry wrapper for API calls
 */
async function safeFetchProducts(params, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await getReloadlyGiftCardProducts(params);
    } catch (err) {
      console.error(
        `[API ERROR] Attempt ${attempt} failed:`,
        err.message
      );

      if (attempt === retries) {
        console.error("[API ERROR] Max retries reached");
        return null;
      }

      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function syncGiftcardProducts() {
  const startTime = Date.now();

  try {
    console.log("======================================");
    console.log("[CRON] Giftcard products sync started");
    console.log("[CRON] Time:", new Date().toISOString());

    // Cleanup table
    console.log("[CLEANUP] Clearing giftcard products table...");
    await emptyGiftcardProductsTable();
    console.log("[CLEANUP] Table cleared successfully");

    let page = 0;
    const size = 200;
    let totalPages = 1;

    let successCount = 0;
    let failedCount = 0;

    while (page < totalPages) {
      console.log(`[FETCH] Page ${page + 1}`);

      const response = await safeFetchProducts({ size, page });

      if (!response || !Array.isArray(response.content)) {
        console.error("[FETCH ERROR] Invalid response, stopping sync");
        break;
      }

      const products = response.content;
      totalPages = response.totalPages ?? 1;

      console.log(`[FETCH] Products fetched: ${products.length}`);

      for (const p of products) {
        try {
          if (!p.productId) {
            console.warn("[SKIPPED] Missing productId:", p.productName);
            continue;
          }

          const payload = {
            product_id: p.productId,
            product_name: p.productName,

            global_available: p.global === true,
            status: p.status ?? "ACTIVE",
            supports_preorder: p.supportsPreOrder === true,

            sender_fee: p.senderFee ?? 0,
            sender_fee_percentage: p.senderFeePercentage ?? 0,
            discount_percentage: p.discountPercentage ?? 0,

            denomination_type: p.denominationType,

            recipient_currency_code: p.recipientCurrencyCode ?? null,
            min_recipient_denomination:
              p.minRecipientDenomination ?? null,
            max_recipient_denomination:
              p.maxRecipientDenomination ?? null,

            sender_currency_code: p.senderCurrencyCode ?? null,
            min_sender_denomination:
              p.minSenderDenomination ?? null,
            max_sender_denomination:
              p.maxSenderDenomination ?? null,

            exchange_rate:
              p.recipientCurrencyToSenderCurrencyExchangeRate ?? 1,

            logo_url: Array.isArray(p.logoUrls)
              ? p.logoUrls[0]
              : null,

            brand_id: p.brand?.brandId ?? null,
            brand_name: p.brand?.brandName ?? null,
            brand_logo_url: p.brand?.logoUrl ?? null,

            // ✅ COUNTRY PASSED THROUGH (Reloadly → DB)
            country: p.country
              ? {
                  isoName: p.country.isoName,
                  name: p.country.name,
                  flagUrl: p.country.flagUrl,
                }
              : null,

            redeem_instruction_concise:
              p.redeemInstruction?.concise ?? null,
            redeem_instruction_verbose:
              p.redeemInstruction?.verbose ?? null,

            metadata: p,
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

      page++;
    }

    console.log("[CRON] Sync completed");
    console.log("[CRON] Products created:", successCount);
    console.log("[CRON] Products failed:", failedCount);
    console.log("[CRON] Duration:", `${Date.now() - startTime}ms`);
    console.log("======================================");
  } catch (error) {
    console.error("======================================");
    console.error("[CRON ERROR]", error.message);
    console.error("[CRON ERROR] Duration:", `${Date.now() - startTime}ms`);
    console.error("======================================");
  }
}

/**
 * Prevent overlapping cron runs
 */
let isRunning = false;



/*
(async () => {
  if (isRunning) {
    console.warn("[MANUAL RUN] Job already running, skipping immediate run");
    return;
  }

  isRunning = true;
  console.log("[MANUAL RUN] Immediate giftcard products sync started");

  try {
    await syncGiftcardProducts();
  } catch (err) {
    console.error("[MANUAL RUN ERROR]", err.message);
  } finally {
    isRunning = false;
  }
})();
*/



/**
 * RUN EVERY 3 DAYS AT MIDNIGHT (WAT)
 */
cron.schedule(
  "0 0 */3 * *",
  async () => {
    if (isRunning) {
      console.warn("[CRON] Previous job still running, skipping...");
      return;
    }

    isRunning = true;
    console.log("CRON 3-day giftcard products sync triggered (WAT)");

    try {
      await syncGiftcardProducts();
    } catch (err) {
      console.error("[CRON WRAPPER ERROR]", err.message);
    } finally {
      isRunning = false;
    }
  },
  {
    timezone: "Africa/Lagos",
  }
);

module.exports = { syncGiftcardProducts };
