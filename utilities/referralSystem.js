const pool = require("../model/db");

async function processReferral(referral_code_used, new_user_uid) {
  try {
    if (!referral_code_used) return;

    /* check if user already has referral */
    const [existing] = await pool.query(
      "SELECT id FROM p_referrals WHERE referred_uid = ? LIMIT 1",
      [new_user_uid]
    );

    if (existing.length > 0) {
      console.log("User already referred");
      return;
    }

    /* get referrer */
    const [referrer] = await pool.query(
      "SELECT uid FROM p_users WHERE referral_code = ? LIMIT 1",
      [referral_code_used]
    );

    if (referrer.length === 0) return;

    const referrer_uid = referrer[0].uid;
    const referral_bonus = 3000;

    /* prevent self-referral */
    if (referrer_uid === new_user_uid) {
      console.log("Self referral blocked");
      return;
    }

    /* save referral record */
    await pool.query(
      `INSERT INTO p_referrals
       (referrer_uid, referred_uid, referral_code_used, reward_amount, reward_status)
       VALUES (?, ?, ?, ?, ?)`,
      [referrer_uid, new_user_uid, referral_code_used, referral_bonus, "pending"]
    );

    console.log("Referral recorded successfully");

  } catch (error) {
    console.error("Referral processing failed:", error);
  }
}

/* get referrals by referrer uid with user full name */
async function getReferralsByReferrerUid(referrer_uid) {
  try {

    const [rows] = await pool.query(
      `SELECT
        r.id,
        u.full_name,
        r.referral_code_used,
        r.reward_amount,
        r.reward_status,
        r.created_at
      FROM p_referrals r
      LEFT JOIN p_users u ON r.referred_uid = u.uid
      WHERE r.referrer_uid = ?
      ORDER BY r.id DESC`,
      [referrer_uid]
    );

    return rows;

  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    throw error;
  }
}

async function getReferrerByReferredUid(referred_uid) {
  try {

    const [rows] = await pool.query(
      `SELECT
        r.id,
        r.referrer_uid,
        r.referral_code_used,
        r.reward_amount,
        r.reward_status,
        r.created_at,
        u.full_name AS referrer_name
      FROM p_referrals r
      LEFT JOIN p_users u ON r.referrer_uid = u.uid
      WHERE r.referred_uid = ?
      LIMIT 1`,
      [referred_uid]
    );

    return rows[0] || null;

  } catch (error) {
    console.error("Failed to fetch referrer:", error);
    throw error;
  }
}

module.exports = { processReferral, getReferralsByReferrerUid, getReferrerByReferredUid };