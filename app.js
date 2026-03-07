process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED PROMISE REJECTION");
  console.error(reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION");
  console.error(error);
  process.exit(1);
});

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { initializeMailer } = require("./email/transporter/mailTransporter");
const upload = require("./middleware/upload");

dotenv.config();

const authRoute = require("./routes/auths");
const userRoute = require("./routes/users");
const generalRoute = require("./routes/general");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

/**
 * HTTPS Redirect (Production)
 */
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

/**
 * MIDDLEWARE
 */
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

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

/**
 * API ROUTES
 */
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/general", generalRoute);
app.use("/api/v1/users", upload, userRoute);

/**
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * START SERVER
 */
let server;

const startServer = async () => {
  try {
    await initializeMailer();

    server = app.listen(PORT, () => {
      console.log(
        `🚀 Server running on ${
          process.env.NODE_ENV === "production"
            ? "HTTPS (via proxy)"
            : `http://localhost:${PORT}`
        }`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:");
    console.error(error);
    process.exit(1);
  }
};

startServer();

/**
 * Graceful shutdown (optional but recommended)
 */
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  if (server) {
    server.close(() => {
      console.log("Process terminated.");
    });
  }
});