const { Worker } = require("bullmq");
const pool = require("../db");
const logger = require("../logger");
const { deleteCachedUrl } = require("../redis");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const connection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

logger.info("Starting Enterprise Background Worker process...");

const worker = new Worker(
  "click-analytics-queue",
  async (job) => {
    if (job.name === "process-click") {
      const { urlId, metadata, isQr } = job.data;
      
      // Update link counter & insert detailed click_event row
      await Promise.all([
        pool.query(
          isQr
            ? "UPDATE urls SET clicks = clicks + 1, qr_scans = qr_scans + 1 WHERE id = $1"
            : "UPDATE urls SET clicks = clicks + 1 WHERE id = $1",
          [urlId]
        ),
        pool.query(
          `INSERT INTO click_events
             (url_id, referrer, user_agent, browser, os, device_type, ip_hash, country, city, is_qr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            urlId,
            metadata.referrer,
            metadata.userAgent,
            metadata.browser,
            metadata.os,
            metadata.deviceType,
            metadata.ipHash,
            metadata.country,
            metadata.city,
            Boolean(isQr || metadata.isQr),
          ]
        ),
      ]);
    }
  },
  { connection, concurrency: 10 }
);

worker.on("completed", (job) => {
  logger.debug(`Background Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  logger.error(`Background Job ${job?.id} failed with error: ${err.message}`);
});

/**
 * Expired Link Cleanup Task (Runs periodically)
 */
async function cleanupExpiredLinks() {
  try {
    const expired = await pool.query(
      "UPDATE urls SET is_active = FALSE WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at <= NOW() RETURNING short_code"
    );

    if (expired.rows.length > 0) {
      logger.info(`Cleanup task: Deactivated ${expired.rows.length} expired links`);
      for (const row of expired.rows) {
        await deleteCachedUrl(row.short_code);
      }
    }
  } catch (err) {
    logger.error("Failed to clean up expired links", err);
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupExpiredLinks, 15 * 60 * 1000);

module.exports = worker;
