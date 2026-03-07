const {
  getGiftcardBrandById,
  getGiftcardVariantById,
} = require("../../utilities/sellGiftcard");

const { getAllWebSettings } = require("../../utilities/settings");

const {
  createGiftcardTrade,
  createTransaction,
} = require("../../utilities/history");

const generateTransactionReference = require("../../utilities/generateReference");
const { sendTradeSubmittedEmail } = require("../../email/mails/tradeSubmitted");
const { getUserByUid } = require("../../utilities/users");

const tradeGiftController = async (req, res) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    /**
     * Get user details
     */
    const user = await getUserByUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const email = user.email;
    const name = user.full_name;

    const { mode, brand_id, sub_category_id, amount, code } = req.body;
    const image = req.file || null;

    if (!mode || !brand_id || !sub_category_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "mode, brand_id, sub_category_id and amount are required",
      });
    }

    const brand = await getGiftcardBrandById(Number(brand_id));

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Giftcard brand not found",
      });
    }

    const variant = await getGiftcardVariantById(Number(sub_category_id));

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Giftcard sub category not found",
      });
    }

    if (Number(variant.brand_id) !== Number(brand_id)) {
      return res.status(400).json({
        success: false,
        message: "Sub category does not belong to this brand",
      });
    }

    if (mode === "ecode" && !code) {
      return res.status(400).json({
        success: false,
        message: "Gift card code is required for ecode",
      });
    }

    if (mode === "physical" && !image) {
      return res.status(400).json({
        success: false,
        message: "Gift card image is required for physical cards",
      });
    }

    const settings = await getAllWebSettings();
    const gift_card_fee = Number(settings?.gift_card_fee || 0);

    const rate = Number(variant.rate);
    const giftAmount = Number(amount);

    const gross_amount = giftAmount * rate;
    const fee_amount = (gross_amount * gift_card_fee) / 100;
    const amount_to_pay = Math.round(gross_amount - fee_amount);

    const formattedCountry =
      variant.country.charAt(0).toUpperCase() +
      variant.country.slice(1).toLowerCase();

    const reference = generateTransactionReference();

    const insertPayload = {
      reference,
      user_id: uid,
      brand_id: Number(brand_id),
      brand_name: brand.name,
      sub_category_id: Number(sub_category_id),
      sub_category_name: `${variant.name} - ${formattedCountry}`,
      card_type: mode,
      country: variant.country,
      currency: variant.currency,
      amount: giftAmount,
      rate,
      receive_amount: gross_amount,
      fee: fee_amount,
      final_amount: amount_to_pay,
      card_ecode: mode === "ecode" ? code : null,
      card_image: image ? image.filename : null,
      status: "processing",
    };

    const trade = await createGiftcardTrade(insertPayload);

    await createTransaction({
      user_id: uid,
      reference,
      service_type: "Giftcard Trade",
      amount: gross_amount,
      fee: fee_amount,
      total: amount_to_pay,
      status: "processing",
      status_type: "credit",
      description: `Giftcard trade for ${brand.name}`,
    });

    /**
     * Send Email Notification
     */
    try {
      if (email) {
        await sendTradeSubmittedEmail({
          to: email,
          name,
          reference,
          brand_name: brand.name,
          sub_category_name: `${variant.name} - ${formattedCountry}`,
          currency: variant.currency,
          amount: giftAmount,
          rate,
          fee: fee_amount,
          final_amount: amount_to_pay,
        });
      }
    } catch (mailError) {
      console.error("Trade Email Error:", mailError);
    }

    return res.status(200).json({
      success: true,
      message: "Gift trade submitted successfully",
      reference,
      amount_to_pay,
    });

  } catch (error) {
    console.error("Trade Gift Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  tradeGiftController,
};