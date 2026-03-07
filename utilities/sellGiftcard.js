const pool = require("../model/db");

const getAllGiftcardBrandsWithVariants = async () => {
  const sql = `
    SELECT 
      b.id,
      b.name,
      b.logo,
      COALESCE(
        JSON_ARRAYAGG(
          CASE 
            WHEN v.id IS NOT NULL THEN JSON_OBJECT(
              'id', v.id,
              'brand_id', v.brand_id,
              'name', v.name,
              'country', v.country,
              'card_type', v.card_type,
              'currency', v.currency,
              'rate', v.rate,
              'status', v.status
            )
          END
        ),
        JSON_ARRAY()
      ) AS sub_categories
    FROM p_giftcard_brands b
    LEFT JOIN p_giftcard_variants v 
      ON b.id = v.brand_id
    GROUP BY b.id, b.name, b.logo
    ORDER BY b.id ASC
  `;

  const [rows] = await pool.execute(sql);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    logo: row.logo,
    sub_categories: (row.sub_categories || []).filter(Boolean),
  }));
};

const getGiftcardBrandById = async (id) => {
  const sql = `
    SELECT 
      id,
      name,
      logo
    FROM p_giftcard_brands
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [id]);

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    logo: rows[0].logo,
  };
};

const getGiftcardVariantById = async (id) => {
  const sql = `
    SELECT 
      id,
      brand_id,
      name,
      country,
      rate,
      currency
    FROM p_giftcard_variants
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [id]);

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].id,
    brand_id: rows[0].brand_id,
    name: rows[0].name,
    country: rows[0].country,
    rate: rows[0].rate,
    currency: rows[0].currency,
  };
};


module.exports = {
  getAllGiftcardBrandsWithVariants,
  getGiftcardBrandById,
  getGiftcardVariantById,
};
