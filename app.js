process.on("unhandledRejection", (reason) => {
  console.error(" UNHANDLED PROMISE REJECTION");
  console.error(reason);
});

process.on("uncaughtException", (error) => {
  console.error(" UNCAUGHT EXCEPTION");
  console.error(error);
});

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const authRoute = require("./routes/auths");
const userRoute = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Trust reverse proxy (Render, Railway, Nginx, Cloudflare)
 */
app.set("trust proxy", 1);

/**
 * FORCE HTTPS IN PRODUCTION
 */
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(
        301,
        `https://${req.headers.host}${req.originalUrl}`
      );
    }
    next();
  });
}

/**
 * ===============================
 * MIDDLEWARE ORDER (IMPORTANT)
 * ===============================
 */

// Parse cookies FIRST
app.use(cookieParser());

// Parse JSON
app.use(express.json({ limit: "10mb" }));

// CORS (must match frontend exactly)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * ===============================
 * ROUTES
 * ===============================
 */
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/users", userRoute);

/**
 * ===============================
 * CRON JOB (SAFE LOAD)
 * ===============================
 * Even if cron fails, server keeps running
 */
try {
  require("./utilities/reloadlyAutoProducts");
  console.log(" Reloadly auto-products cron loaded");
} catch (err) {
  console.error(" Failed to load Reloadly cron");
  console.error(err.message);
}

/**
 * ===============================
 * HEALTH CHECK (OPTIONAL BUT GOOD)
 * ===============================
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * ===============================
 * START SERVER
 * ===============================
 */
app.listen(PORT, () => {
  console.log(
    ` Backend running on ${
      process.env.NODE_ENV === "production"
        ? "HTTPS (via proxy)"
        : `http://localhost:${PORT}`
    }`
  );
});
