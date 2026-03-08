const store = new Map();

const CONFIG = {
  tokenBucket: {
    capacity: 20,
    refillRate: 10,
  },
  slidingWindow: {
    window: 60000,
    max: process.env.NODE_ENV === "development" ? 300 : 120,
  },
  fixedWindow: {
    window: 3600000,
    max: 2000,
  },
  cleanupInterval: 5 * 60 * 1000,
  ttl: 30 * 60 * 1000,
};

function rateLimiter(req, res, next) {
  /* Ignore preflight and health checks */
  if (req.method === "OPTIONS" || req.path === "/health") {
    return next();
  }

  const key = req.user?.id || req.ip;
  const now = Date.now();

  if (!store.has(key)) {
    store.set(key, {
      tokens: CONFIG.tokenBucket.capacity,
      lastRefill: now,
      requests: [],
      fixedCount: 0,
      fixedStart: now,
      lastSeen: now,
    });
  }

  const data = store.get(key);
  data.lastSeen = now;

  /* TOKEN BUCKET */
  const elapsed = (now - data.lastRefill) / 1000;

  data.tokens = Math.min(
    CONFIG.tokenBucket.capacity,
    data.tokens + elapsed * CONFIG.tokenBucket.refillRate
  );

  data.lastRefill = now;

  if (data.tokens < 1) {
    res.setHeader("Retry-After", "1");
    return res.status(429).json({
      success: false,
      error: "Too many requests",
      message: "Burst limit exceeded",
    });
  }

  data.tokens -= 1;

  /* SLIDING WINDOW */
  while (
    data.requests.length &&
    now - data.requests[0] > CONFIG.slidingWindow.window
  ) {
    data.requests.shift();
  }

  if (data.requests.length >= CONFIG.slidingWindow.max) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      success: false,
      error: "Too many requests",
      message: "Too many requests per minute",
    });
  }

  data.requests.push(now);

  /* FIXED WINDOW */
  if (now - data.fixedStart > CONFIG.fixedWindow.window) {
    data.fixedStart = now;
    data.fixedCount = 0;
  }

  data.fixedCount++;

  if (data.fixedCount > CONFIG.fixedWindow.max) {
    res.setHeader("Retry-After", "3600");
    return res.status(429).json({
      success: false,
      error: "Too many requests",
      message: "Hourly limit exceeded",
    });
  }

  next();
}

/* MEMORY CLEANUP */
setInterval(() => {
  const now = Date.now();

  for (const [key, data] of store.entries()) {
    if (now - data.lastSeen > CONFIG.ttl) {
      store.delete(key);
    }
  }
}, CONFIG.cleanupInterval);

module.exports = { rateLimiter };