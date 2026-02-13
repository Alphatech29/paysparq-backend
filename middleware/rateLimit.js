const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

function rateLimitByClient(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
      // Priority order
      if (req.user?.uid && req.client?.id) {
        return `user:${req.user.uid}|client:${req.client.id}`;
      }

      if (req.client?.id) {
        return `client:${req.client.id}`;
      }

      // FIX: IPv6-safe IP handling
      return ipKeyGenerator(req);
    },

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later.",
      });
    },
  });
}

module.exports = { rateLimitByClient };
