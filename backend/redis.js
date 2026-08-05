const Redis = require("ioredis");
const logger = require("./logger");

// Redis Client Configuration
// Reads from REDIS_URL or REDIS_HOST / REDIS_PORT
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

let redisClient = null;
let isRedisConnected = false;

try {
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        logger.warn("Redis connection attempt limit reached. Operating in DB-only mode.");
        return null; // Stop retrying automatically
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    logger.info(`Connected to Redis Cache server at ${redisHost}:${redisPort}`);
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    logger.warn(`Redis cache warning: ${err.message}`);
  });
} catch (err) {
  logger.warn("Redis client failed to initialize, running without cache", err);
}

/**
 * Cache Helper Functions
 */
async function getCachedUrl(shortCode) {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const cached = await redisClient.get(`link:${shortCode}`);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    logger.error(`Error reading shortCode ${shortCode} from Redis`, err);
    return null;
  }
}

async function setCachedUrl(shortCode, data, ttlSeconds = 3600) {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.set(`link:${shortCode}`, JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    logger.error(`Error setting cache for shortCode ${shortCode}`, err);
  }
}

async function deleteCachedUrl(shortCode) {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.del(`link:${shortCode}`);
  } catch (err) {
    logger.error(`Error deleting cache for shortCode ${shortCode}`, err);
  }
}

module.exports = {
  redisClient,
  getRedisClient: () => redisClient,
  isRedisConnected: () => isRedisConnected,
  getCachedUrl,
  setCachedUrl,
  deleteCachedUrl,
};
