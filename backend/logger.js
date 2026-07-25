const winston = require("winston");

// Enterprise logging using Winston
// Formats log messages with timestamps and colorized log levels for development
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "url-shortener-backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, service }) =>
            `[${timestamp}] [${service}] ${level}: ${message}`
        )
      ),
    }),
  ],
});

module.exports = logger;
