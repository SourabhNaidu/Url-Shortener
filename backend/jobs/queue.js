const { Queue } = require("bullmq");
const logger = require("../logger");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

const connection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

let clickQueue = null;

try {
  clickQueue = new Queue("click-analytics-queue", { connection });
  logger.info("BullMQ queue initialized for asynchronous background processing");
} catch (err) {
  logger.warn("Failed to initialize BullMQ queue, falling back to direct DB writes", err);
}

/**
 * Enqueue a click event job
 */
async function addClickJob(clickData) {
  if (!clickQueue) return false;
  try {
    await clickQueue.add("process-click", clickData, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: true,
    });
    return true;
  } catch (err) {
    logger.error("Failed to add click event to queue", err);
    return false;
  }
}

module.exports = {
  clickQueue,
  addClickJob,
};
