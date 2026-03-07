const { saveOTP } = require("./otpStorage");
const { generateOTP } = require("./generateOTP");
const { sendVerificationEmail } = require("../email/mails/emailVerification");

async function sendVerificationOTP({ email, full_name }) {
  try {
    if (!email || !full_name) {
      throw new Error("Email and full name are required");
    }

    const expiryMinutes = 10;
    const otp = generateOTP(6);

    // Save OTP (critical)
    await saveOTP(email, otp, expiryMinutes);

    // Send email (wait for result)
    const emailSent = await sendVerificationEmail({
      to: email,
      name: full_name,
      otp,
      expiryMinutes,
    });

    if (emailSent) {
      console.log(`✅ Verification email sent successfully to ${email}`);
    } else {
      console.warn(`⚠️ Verification email failed to send to ${email}`);
    }

    return emailSent;

  } catch (error) {
    console.error("❌ Error generating OTP:", error.message);
    return false;
  }
}

module.exports = { sendVerificationOTP };