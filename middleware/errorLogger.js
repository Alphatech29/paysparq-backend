const logger = require("../logger/logger");

function errorLogger(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  logger.error({
    message: err.message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
}

module.exports = { errorLogger };