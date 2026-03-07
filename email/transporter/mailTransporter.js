const nodemailer = require("nodemailer");
const dns = require("dns");
const { getAllWebSettings } = require("../../utilities/settings");

// Force IPv4 resolution
dns.setDefaultResultOrder("ipv4first");

let transporter = null;
let isInitializing = false;

const initializeMailer = async () => {
  if (isInitializing) return;
  isInitializing = true;

  try {
    const settings = await getAllWebSettings();

    if (!settings) {
      throw new Error("Web settings not found");
    }

    // Fix typo fallback (smtp_host vs smpt_host)
    const SMTP_HOST = settings.smtp_host || settings.smpt_host;
    const SMTP_PORT = Number(settings.smtp_port) || 587;
    const SMTP_USER = settings.smtp_user;
    const SMTP_PASSWORD = settings.smtp_password;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      throw new Error("SMTP configuration is incomplete");
    }

    const isSecure = SMTP_PORT === 465;

    const newTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: isSecure,
      requireTLS: !isSecure,
      family: 4,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection
    await newTransporter.verify();

    transporter = newTransporter;

    console.log(`SMTP Ready and connected.`);
  } catch (error) {
    console.error("SMTP initialization failed:");
    console.error(error.message);

    transporter = null;
  } finally {
    isInitializing = false;
  }
};

const getTransporter = async () => {
  if (!transporter) {
    await initializeMailer();
  }
  return transporter;
};

module.exports = {
  initializeMailer,
  getTransporter,
};