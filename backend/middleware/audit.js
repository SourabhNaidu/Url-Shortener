const pool = require("../db");
const logger = require("../logger");

/**
 * Log user action into database audit_logs table
 * @param {number|null} userId 
 * @param {string} action 
 * @param {string} targetType 
 * @param {string|number} targetId 
 * @param {object} details 
 */
async function logAuditEvent(userId, action, targetType = null, targetId = null, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, targetType, targetId ? String(targetId) : null, JSON.stringify(details)]
    );
  } catch (err) {
    logger.error(`Failed to record audit log action=${action}`, err);
  }
}

module.exports = { logAuditEvent };
