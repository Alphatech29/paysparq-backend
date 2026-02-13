const pool = require("../model/db");

async function createGiftcardProduct(data) {
  //  Normalize Reloadly → DB shape
  const normalized = {
    product_id: data.product_id ?? data.productId,
    product_name: data.product_name ?? data.productName,

    global_available: data.global_available ?? data.global ?? false,
    status: data.status ?? "ACTIVE",
    supports_preorder: data.supports_preorder ?? data.supportsPreOrder ?? false,

    sender_fee: data.sender_fee ?? data.senderFee ?? 0,
    sender_fee_percentage:
      data.sender_fee_percentage ?? data.senderFeePercentage ?? 0,
    discount_percentage:
      data.discount_percentage ?? data.discountPercentage ?? 0,

    denomination_type: data.denomination_type ?? data.denominationType,

    recipient_currency_code:
      data.recipient_currency_code ?? data.recipientCurrencyCode ?? null,
    min_recipient_denomination:
      data.min_recipient_denomination ?? data.minRecipientDenomination ?? null,
    max_recipient_denomination:
      data.max_recipient_denomination ?? data.maxRecipientDenomination ?? null,

    sender_currency_code:
      data.sender_currency_code ?? data.senderCurrencyCode ?? null,
    min_sender_denomination:
      data.min_sender_denomination ?? data.minSenderDenomination ?? null,
    max_sender_denomination:
      data.max_sender_denomination ?? data.maxSenderDenomination ?? null,

    exchange_rate:
      data.exchange_rate ??
      data.recipientCurrencyToSenderCurrencyExchangeRate ??
      1,

    logo_url:
      data.logo_url ??
      (Array.isArray(data.logoUrls) ? data.logoUrls[0] : null),

    brand_id: data.brand_id ?? data.brand?.brandId ?? null,
    brand_name: data.brand_name ?? data.brand?.brandName ?? null,
    brand_logo_url: data.brand_logo_url ?? data.brand?.logoUrl ?? null,

    redeem_instruction_concise:
      data.redeem_instruction_concise ??
      data.redeemInstruction?.concise ??
      null,

    redeem_instruction_verbose:
      data.redeem_instruction_verbose ??
      data.redeemInstruction?.verbose ??
      null,

    //  COUNTRY NORMALIZATION
    country_iso: data.country?.isoName ?? null,
    country_name: data.country?.name ?? null,
    country_flag_url: data.country?.flagUrl ?? null,

    metadata: data.metadata ?? data
  };

  //  Hard guard
  if (!normalized.product_id) {
    throw new Error("product_id is required");
  }

  const sql = `
    INSERT INTO p_giftcard_products (
      product_id,
      product_name,
      global_available,
      status,
      supports_preorder,
      sender_fee,
      sender_fee_percentage,
      discount_percentage,
      denomination_type,
      recipient_currency_code,
      min_recipient_denomination,
      max_recipient_denomination,
      sender_currency_code,
      min_sender_denomination,
      max_sender_denomination,
      exchange_rate,
      logo_url,
      brand_id,
      brand_name,
      brand_logo_url,
      country_iso,
      country_name,
      country_flag_url,
      redeem_instruction_concise,
      redeem_instruction_verbose,
      metadata
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON DUPLICATE KEY UPDATE
      product_name = VALUES(product_name),
      status = VALUES(status),
      exchange_rate = VALUES(exchange_rate),
      logo_url = VALUES(logo_url),
      brand_name = VALUES(brand_name),
      brand_logo_url = VALUES(brand_logo_url),
      country_iso = VALUES(country_iso),
      country_name = VALUES(country_name),
      country_flag_url = VALUES(country_flag_url),
      redeem_instruction_concise = VALUES(redeem_instruction_concise),
      redeem_instruction_verbose = VALUES(redeem_instruction_verbose),
      metadata = VALUES(metadata),
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = [
    normalized.product_id,
    normalized.product_name,
    normalized.global_available,
    normalized.status,
    normalized.supports_preorder,

    normalized.sender_fee,
    normalized.sender_fee_percentage,
    normalized.discount_percentage,

    normalized.denomination_type,

    normalized.recipient_currency_code,
    normalized.min_recipient_denomination,
    normalized.max_recipient_denomination,

    normalized.sender_currency_code,
    normalized.min_sender_denomination,
    normalized.max_sender_denomination,

    normalized.exchange_rate,
    normalized.logo_url,

    normalized.brand_id,
    normalized.brand_name,
    normalized.brand_logo_url,

    normalized.country_iso,
    normalized.country_name,
    normalized.country_flag_url,

    normalized.redeem_instruction_concise,
    normalized.redeem_instruction_verbose,

    JSON.stringify(normalized.metadata || {})
  ];

  return pool.execute(sql, values);
}



async function bulkUpsertCountries(countries) {
  if (!Array.isArray(countries) || countries.length === 0) {
    return 0;
  }

  const sql = `
    INSERT INTO p_countries (
      iso_code,
      country_name,
      currency_code,
      currency_name,
      flag_url
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      country_name = VALUES(country_name),
      currency_code = VALUES(currency_code),
      currency_name = VALUES(currency_name),
      flag_url = VALUES(flag_url),
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = countries.map(c => [
    c.iso_code,
    c.country_name,
    c.currency_code,
    c.currency_name,
    c.flag_url,
  ]);

  const [result] = await pool.query(sql, [values]);

  return result.affectedRows;
}


async function emptyGiftcardProductsTable() {
  const sql = `TRUNCATE TABLE p_giftcard_products`;
  return pool.execute(sql);
}


async function getAllGiftcardProducts() {
  try {
    const sql = `
      SELECT *
      FROM p_giftcard_products
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(sql);

    return rows;
  } catch (error) {
    // Log full error for debugging (server-side)
    console.error(" Error fetching giftcard products:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Throw clean error for upper layers (controller / API)
    throw new Error("Failed to fetch giftcard products");
  }
}

async function getAllCountries() {
  const sql = `
    SELECT *
    FROM p_countries
    ORDER BY country_name ASC
  `;

  try {
    const [rows] = await pool.execute(sql);
    return rows;

  } catch (error) {
    console.error("DB Error - getAllCountries:", error);
    throw error;
  }
}


module.exports = {createGiftcardProduct, bulkUpsertCountries, emptyGiftcardProductsTable, getAllGiftcardProducts, getAllCountries};
