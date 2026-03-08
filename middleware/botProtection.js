const blockedAgents = [
  "curl",
  "wget",
  "python",
  "scrapy",
  "bot",
  "spider",
  "crawler",
  "httpclient",
  "libwww",
];

function botProtection(req, res, next) {
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();

  // block missing user agent
  if (!userAgent) {
    if (req.recordAttack) req.recordAttack();

    return res.status(403).json({
      success: false,
      error: "Suspicious request blocked",
    });
  }

  const isBot = blockedAgents.some((agent) =>
    userAgent.includes(agent)
  );

  if (isBot) {
    if (req.recordAttack) req.recordAttack();

    return res.status(403).json({
      success: false,
      error: "Bots are not allowed",
    });
  }

  next();
}

module.exports = { botProtection };