const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const { getTransporter } = require("../transporter/mailTransporter");
const { getAllWebSettings } = require("../../utilities/settings");

/**
 * Extract first name and convert to Title Case
 */
function formatFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return "There";
  }

  const firstName = fullName.trim().split(" ")[0];

  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1).toLowerCase()
  );
}

/**
 * Format numbers with commas
 */
function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

async function sendTradeSubmittedEmail({
  to,
  name,
  reference,
  brand_name,
  sub_category_name,
  currency,
  amount,
  rate,
  fee,
  final_amount,
}) {
  try {

    if (!to || !reference) {
      return false;
    }

    const transporter = await getTransporter();
    if (!transporter) {
      return false;
    }

    const settings = await getAllWebSettings();
    if (!settings) {
      return false;
    }

    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "tradeSubmitted.ejs"
    );

    if (!fs.existsSync(templatePath)) {
      console.error("Email template not found:", templatePath);
      return false;
    }

    const formattedName = formatFirstName(name);

    /**
     * Format financial values
     */
    const formattedAmount = formatNumber(amount);
    const formattedRate = formatNumber(rate);
    const formattedFee = formatNumber(fee);
    const formattedFinalAmount = formatNumber(final_amount);

    const html = await ejs.renderFile(templatePath, {
      name: formattedName,
      reference,
      brand_name,
      sub_category_name,
      currency,
      amount: formattedAmount,
      rate: formattedRate,
      fee: formattedFee,
      final_amount: formattedFinalAmount,
      webUrl: settings.site_url || "",
      logoUrl: settings.site_logo || "",
      supportEmail: settings.support_email || "",
      site_name: settings.site_name,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: `"${settings.site_name}" <${settings.smtp_user}>`,
      to,
      subject: `Trade Submitted Successfully - ${settings.site_name}`,
      html,
    });

    return true;

  } catch (error) {
    console.error("Trade Submitted Email Error:", error);
    return false;
  }
}

module.exports = { sendTradeSubmittedEmail };