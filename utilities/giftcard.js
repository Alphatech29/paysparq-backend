const pool = require("../model/db");

async function createGiftcardProduct(data) {
  const normalized = {
    productId: data.productId ?? null,
    productName: data.productName ?? null,

    global: data.global ?? false,
    status: data.status ?? "ACTIVE",
    supportsPreOrder: data.supportsPreOrder ?? false,

    senderFee: data.senderFee ?? 0,
    senderFeePercentage: data.senderFeePercentage ?? 0,
    discountPercentage: data.discountPercentage ?? 0,

    denominationType: data.denominationType ?? null,

    recipientCurrencyCode: data.recipientCurrencyCode ?? null,
    minRecipientDenomination: data.minRecipientDenomination ?? null,
    maxRecipientDenomination: data.maxRecipientDenomination ?? null,

    senderCurrencyCode: data.senderCurrencyCode ?? null,
    minSenderDenomination: data.minSenderDenomination ?? null,
    maxSenderDenomination: data.maxSenderDenomination ?? null,

    fixedRecipientDenominations: JSON.stringify(
      data.fixedRecipientDenominations ?? []
    ),

    fixedSenderDenominations: JSON.stringify(
      data.fixedSenderDenominations ?? []
    ),

    fixedRecipientToSenderDenominationsMap: JSON.stringify(
      data.fixedRecipientToSenderDenominationsMap ?? {}
    ),

    metadata: JSON.stringify(data.metadata ?? data ?? {}),
    logoUrls: JSON.stringify(data.logoUrls ?? []),

    /* Brand */
    brandId: data.brandId ?? data.brand?.brandId ?? null,
    brandName: data.brandName ?? data.brand?.brandName ?? null,
    brandLogoUrl: data.brandLogoUrl ?? data.brand?.logoUrl ?? null,

    /* Category */
    categoryId: data.categoryId ?? data.category?.id ?? null,
    categoryName: data.categoryName ?? data.category?.name ?? null,

    /* Country */
    countryIsoName: data.countryIsoName ?? data.country?.isoName ?? null,
    countryName: data.countryName ?? data.country?.name ?? null,
    countryFlagUrl: data.countryFlagUrl ?? data.country?.flagUrl ?? null,

    /* Redeem instructions */
    redeemInstructionConcise:
      data.redeemInstructionConcise ??
      data.redeemInstruction?.concise ??
      null,

    redeemInstructionVerbose:
      data.redeemInstructionVerbose ??
      data.redeemInstruction?.verbose ??
      null,

    /* Extra requirements */
    userIdRequired:
      data.userIdRequired ??
      data.additionalRequirements?.userIdRequired ??
      false,

    recipientCurrencyToSenderCurrencyExchangeRate:
      data.recipientCurrencyToSenderCurrencyExchangeRate ?? null
  };

  if (!normalized.productId) {
    throw new Error("productId is required");
  }

  const columns = Object.keys(normalized);
  const placeholders = columns.map(() => "?").join(",");

  const updates = columns
    .filter(col => col !== "productId")
    .map(col => `${col}=VALUES(${col})`)
    .join(",");

  const sql = `
    INSERT INTO p_products (${columns.join(",")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  const values = Object.values(normalized);

  const [result] = await pool.execute(sql, values);

  return result;
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
  const sql = `TRUNCATE TABLE p_products`;
  return pool.execute(sql);
}

async function getAllGiftcardProducts() {
  try {
    const [rows] = await pool.execute(`
      SELECT
        productId,
        productName,
        metadata,
        categoryName AS category
      FROM p_products
      ORDER BY created_at DESC, productId DESC
    `);

    return rows || [];
  } catch (error) {
    console.error("Error fetching giftcard products:", {
      message: error?.message,
      code: error?.code
    });

    throw new Error("Failed to fetch giftcard products");
  }
}

async function getGiftcardProductById(productId) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM p_products
      WHERE productId = ?
      LIMIT 1
      `,
      [productId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching giftcard product:", {
      message: error?.message,
      code: error?.code
    });

    throw new Error("Failed to fetch giftcard product");
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

async function getCountryCurrencyByCode(countryisoCode) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM p_country_currencies
      WHERE cuntries_code = ?
      LIMIT 1
      `,
      [countryisoCode]
    );

    return rows[0] || null;

  } catch (error) {
    console.error("Error fetching country currency:", {
      message: error?.message,
      code: error?.code
    });

    throw new Error("Failed to fetch country currency");
  }
}

module.exports = {createGiftcardProduct, getCountryCurrencyByCode, getGiftcardProductById, bulkUpsertCountries, emptyGiftcardProductsTable, getAllGiftcardProducts, getAllCountries};
