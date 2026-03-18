function generateUserReferral(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let referral = "";

  for (let i = 0; i < length; i++) {
    referral += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return referral;
}

module.exports = {
  generateUserReferral
};