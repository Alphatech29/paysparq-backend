const { getReferralsByReferrerUid } = require("../../utilities/referralSystem");

async function getReferralsByReferrerUidController(req, res) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    const referrals = await getReferralsByReferrerUid(uid);

    return res.status(200).json({
      success: true,
      total: referrals.length,
      data: referrals
    });

  } catch (error) {
    console.error("Error fetching referrals:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrals"
    });
  }
}

module.exports = {
  getReferralsByReferrerUidController
};