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

async function sendForgotPasswordEmail({
  to,
  name,
  resetLink,
  expiryMinutes = 30,
}) {
  try {
    if (!to || !resetLink) return false;

    const transporter = await getTransporter();
    if (!transporter) return false;

    const settings = await getAllWebSettings();
    if (!settings) return false;

    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "forgetPassword.ejs"
    );

    if (!fs.existsSync(templatePath)) {
      console.error("Forgot password template not found:", templatePath);
      return false;
    }

    const formattedName = formatFirstName(name);

    const html = await ejs.renderFile(templatePath, {
      name: formattedName,
      resetLink,
      site_name: settings.site_name || "Our Platform",
      webUrl: settings.site_url || "",
      logoUrl: settings.site_logo || "",
      supportEmail: settings.support_email || "",
      expiryMinutes,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: `"${settings.site_name}" <${settings.support_email}>`,
      to,
      subject: `Reset your password - ${settings.site_name}`,
      html,
    });

    return true;
  } catch (error) {
    console.error("Forgot password email error:", error);
    return false;
  }
}

module.exports = { sendForgotPasswordEmail };