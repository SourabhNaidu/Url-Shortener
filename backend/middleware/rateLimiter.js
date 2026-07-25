const rateLimit = require("express-rate-limit");

// General API rate limiter: 100 requests per 15 minutes per IP
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});

// Shorten endpoint rate limiter: 30 creations per 15 minutes
const createLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for creating short links. Please wait before creating more." },
});

// Developer API key rate limiter: 300 requests per 15 minutes
const apiV1Limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?.id ? `key_${req.apiKey.id}` : req.ip,
  message: { error: "API Key rate limit exceeded. Max 300 requests per 15 minutes." },
});

module.exports = {
  generalRateLimiter,
  createLinkLimiter,
  apiV1Limiter,
};
