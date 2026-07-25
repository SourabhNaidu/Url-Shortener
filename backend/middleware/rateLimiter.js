const rateLimit = require("express-rate-limit");

// General API rate limiter: 120 requests per 15 minutes per IP
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

// Shorten endpoint rate limiter: 40 creations per 15 minutes per IP
const createLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for creating short links. Please wait before creating more." },
});

module.exports = {
  generalRateLimiter,
  createLinkLimiter,
};
