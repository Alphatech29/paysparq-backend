const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const helmet = require("helmet");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");

const { rateLimiter } = require("./middleware/rateLimit");
const { botProtection } = require("./middleware/botProtection");
const { attackShield } = require("./middleware/attackShield");
const { errorLogger } = require("./middleware/errorLogger");

const upload = require("./middleware/upload");

const authRoute = require("./routes/auths");
const userRoute = require("./routes/users");
const generalRoute = require("./routes/general");

const app = express();

app.set("trust proxy", 1);

/* CORS (must run early) */
const allowedOrigins = [
  process.env.FRONTEND_URL_1,
  process.env.FRONTEND_URL_2,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* Handle preflight */
app.options(/.*/, cors());

/* Core middleware */
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* Security headers */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* Prevent HTTP parameter pollution */
app.use(hpp());

/* Compress responses */
app.use(compression());

/* Log ONLY errors (status >= 400) */
app.use(
  morgan("tiny", {
    skip: (req, res) => res.statusCode < 400,
  })
);

/* Bot & attack protection */
app.use(botProtection);
app.use(attackShield);

/* Rate limiter */
app.use("/api", rateLimiter);

/* Routes */
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/general", generalRoute);
app.use("/api/v1/users", upload, userRoute);

/* Health check */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

/* Error logger (must be last) */
app.use(errorLogger);

/* Start Giftcard Sync + Cron Scheduler */
require("./utilities/reloadlyAutoProducts");

module.exports = app;