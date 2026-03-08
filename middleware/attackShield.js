const attackers = new Map();

const CONFIG = {
  maxErrors: 10,
  windowMs: 5 * 60 * 1000,
  banDuration: 30 * 60 * 1000,
  cleanupInterval: 10 * 60 * 1000,
  ttl: 60 * 60 * 1000,
};

function attackShield(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  if (!attackers.has(ip)) {
    attackers.set(ip, {
      errors: 0,
      firstSeen: now,
      lastSeen: now,
      bannedUntil: null,
    });
  }

  const data = attackers.get(ip);
  data.lastSeen = now;

  // Check if banned
  if (data.bannedUntil && data.bannedUntil > now) {
    return res.status(403).json({
      success: false,
      error: "Your IP has been temporarily blocked.",
    });
  }

  // Ban expired → reset
  if (data.bannedUntil && data.bannedUntil <= now) {
    data.bannedUntil = null;
    data.errors = 0;
    data.firstSeen = now;
  }

  // Reset error window
  if (now - data.firstSeen > CONFIG.windowMs) {
    data.errors = 0;
    data.firstSeen = now;
  }

  /* attach attack recorder to request */
  req.recordAttack = () => {
    data.errors += 1;

    if (data.errors >= CONFIG.maxErrors) {
      data.bannedUntil = Date.now() + CONFIG.banDuration;
      console.warn(`🚨 IP banned: ${ip}`);
    }
  };

  next();
}

/* -------- MEMORY CLEANUP -------- */
setInterval(() => {
  const now = Date.now();

  for (const [ip, data] of attackers.entries()) {
    if (now - data.lastSeen > CONFIG.ttl) {
      attackers.delete(ip);
    }
  }
}, CONFIG.cleanupInterval);

module.exports = { attackShield };