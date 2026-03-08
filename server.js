require("dotenv").config();

const app = require("./app");
const { initializeMailer } = require("./email/transporter/mailTransporter");

const PORT = process.env.PORT || 5000;

let server;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

const startServer = async () => {
  try {
    await initializeMailer();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server failed to start:", err);
    process.exit(1);
  }
};

startServer();

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down...`);

  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);