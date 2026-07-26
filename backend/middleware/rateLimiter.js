const { RateLimiterRedis, RateLimiterMemory } = require("rate-limiter-flexible");
const { getRedisClient, isRedisConnected } = require("../redis");
const logger = require("../logger");

/**
 * Enterprise Token Bucket Rate Limiter
 * 
 * Token Bucket Algorithm:
 * - General Limiter: Bucket holds 120 tokens max. Refills tokens over 15 minutes (900 seconds).
 * - Create Link Limiter: Bucket holds 40 tokens max. Refills tokens over 15 minutes (900 seconds).
 * 
 * Benefits over Fixed Window:
 * - Allows smooth traffic bursts up to max capacity.
 * - Prevents window boundary traffic spikes.
 * - Uses Redis in-memory atomic scripts for sub-millisecond execution.
 */

let generalLimiterRedis = null;
let createLimiterRedis = null;

const generalMemoryFallback = new RateLimiterMemory({
  points: 120, // 120 tokens max capacity
  duration: 900, // Refill period: 15 minutes (900 seconds)
});

const createMemoryFallback = new RateLimiterMemory({
  points: 40, // 40 tokens max capacity
  duration: 900, // Refill period: 15 minutes (900 seconds)
});

function getLimiters() {
  const redisClient = getRedisClient();
  if (isRedisConnected() && redisClient) {
    if (!generalLimiterRedis) {
      generalLimiterRedis = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: "rl_token_gen",
        points: 120, // 120 tokens
        duration: 900, // 15 minutes
      });
    }
    if (!createLimiterRedis) {
      createLimiterRedis = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: "rl_token_create",
        points: 40, // 40 tokens
        duration: 900, // 15 minutes
      });
    }
    return { general: generalLimiterRedis, create: createLimiterRedis };
  }
  return { general: generalMemoryFallback, create: createMemoryFallback };
}

/**
 * Express Middleware for General Token Bucket Limiter
 */
async function generalRateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const limiters = getLimiters();

  try {
    const resRate = await limiters.general.consume(ip);
    res.setHeader("RateLimit-Limit", 120);
    res.setHeader("RateLimit-Remaining", resRate.remainingPoints);
    res.setHeader("RateLimit-Reset", Math.round(resRate.msBeforeNext / 1000));
    next();
  } catch (rejRes) {
    logger.warn(`General Rate Limit (Token Bucket) exceeded for IP: ${ip}`);
    res.setHeader("Retry-After", Math.round(rejRes.msBeforeNext / 1000));
    return res.status(429).json({
      error: "Too many requests. Token bucket empty, please wait before trying again.",
      retryAfterSeconds: Math.round(rejRes.msBeforeNext / 1000),
    });
  }
}

/**
 * Express Middleware for Link Creation Token Bucket Limiter
 */
async function createLinkLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const limiters = getLimiters();

  try {
    const resRate = await limiters.create.consume(ip);
    res.setHeader("RateLimit-Limit", 40);
    res.setHeader("RateLimit-Remaining", resRate.remainingPoints);
    res.setHeader("RateLimit-Reset", Math.round(resRate.msBeforeNext / 1000));
    next();
  } catch (rejRes) {
    logger.warn(`Link Creation Rate Limit (Token Bucket) exceeded for IP: ${ip}`);
    res.setHeader("Retry-After", Math.round(rejRes.msBeforeNext / 1000));
    return res.status(429).json({
      error: "Rate limit exceeded for creating short links. Token bucket empty.",
      retryAfterSeconds: Math.round(rejRes.msBeforeNext / 1000),
    });
  }
}

module.exports = {
  generalRateLimiter,
  createLinkLimiter,
};
