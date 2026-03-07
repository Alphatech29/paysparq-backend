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

async function sendVerificationEmail({
  to,
  name,
  otp,
  expiryMinutes,
}) {
  try {
    if (!to || !otp) {
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
      "emailVerification.ejs"
    );

    if (!fs.existsSync(templatePath)) {
      return false;
    }

    const formattedName = formatFirstName(name);

    const html = await ejs.renderFile(templatePath, {
      name: formattedName,
      otp,
      site_name: settings.site_name || "Our Platform",
      webUrl: settings.site_url || "",
      logoUrl: settings.site_logo || "",
      supportEmail: settings.support_email || "",
      expiryMinutes,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: `"${settings.site_name}" <${settings.smtp_user}>`,
      to,
      subject: `Verify your email - ${settings.site_name}`,
      html,
    });

    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { sendVerificationEmail };