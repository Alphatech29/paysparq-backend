const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const { getTransporter } = require("../transporter/mailTransporter");
const { getAllWebSettings } = require("../../utilities/settings");

/**
 * Extract first name and convert to Title Case
 */
function formatFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return "There";

  const firstName = fullName.trim().split(" ")[0];

  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1).toLowerCase()
  );
}

/**
 * Format currency with symbol
 */
function formatCurrency(value, currency = "USD") {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function sendGiftCardDeliveryEmail({
  to,
  name,
  reference,
  brand_name,
  currency,
  total_amount,
  quantity,
  cards = [],
  redeemInstructionConcise = "",
  redeemInstructionVerbose = "",
}) {
  try {
    console.log("Giftcard Email Payload:", {
      to,
      reference,
      cardsCount: cards?.length || 0,
    });

    if (!to || !reference) {
      console.error("Email missing required fields");
      return false;
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      console.error("No gift cards found to send");
      return false;
    }

    const transporter = await getTransporter();

    if (!transporter) {
      console.error("Email transporter not available");
      return false;
    }

    const settings = await getAllWebSettings();

    if (!settings) {
      console.error("Web settings not found");
      return false;
    }

    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "giftCardDelivery.ejs"
    );

    if (!fs.existsSync(templatePath)) {
      console.error("Email template not found:", templatePath);
      return false;
    }

    const formattedName = formatFirstName(name);
    const formattedTotal = formatCurrency(total_amount, currency);

    /**
     * Normalize card data
     */
    const formattedCards = cards.map((card) => ({
      code: card.code || card.cardNumber || "",
      pin: card.pin || card.pinCode || "",
      redemptionUrl: card.redemptionUrl || "",
    }));

    console.log("Formatted Cards:", formattedCards);

    /**
     * Dashboard order link
     */
    const dashboardUrl = `${settings.site_url}/dashboard/orders/${reference}`;

    /**
     * Render Email Template
     */
    const html = await ejs.renderFile(templatePath, {
      name: formattedName,
      reference,
      brand_name: brand_name || "Gift Card",
      currency: currency || "USD",
      quantity: quantity || formattedCards.length,
      total_amount: formattedTotal,
      cards: formattedCards,
      webUrl: settings.site_url || "",
      logoUrl: settings.site_logo || "",
      supportEmail: settings.support_email || "",
      companyName: settings.site_name || "Company",
      dashboardUrl,
      redeemInstructionConcise: redeemInstructionConcise || "",
      redeemInstructionVerbose: redeemInstructionVerbose || "",
      year: new Date().getFullYear(),
    });

    /**
     * Send Email
     */
    await transporter.sendMail({
      from: `"${settings.site_name}" <${settings.support_email}>`,
      to,
      subject: `Your Gift Card Purchase - ${settings.site_name}`,
      html,
    });

    console.log("Gift card email successfully sent to:", to);

    return true;

  } catch (error) {
    console.error("Gift Card Delivery Email Error:", error);
    return false;
  }
}

module.exports = { sendGiftCardDeliveryEmail };