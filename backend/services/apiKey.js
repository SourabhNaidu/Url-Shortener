const crypto = require("crypto");
const pool = require("../db");
const logger = require("../logger");
const { logAuditEvent } = require("../middleware/audit");

/**
 * Generates a secure API key
 * Format: sk_live_<32 hex chars>
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const rawKey = `sk_live_${randomBytes}`;
  const prefix = rawKey.substring(0, 12);
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, prefix, hash };
}

/**
 * Computes hash of an incoming raw key
 */
function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * API Key Middleware for public / v1 developer routes
 */
async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header. Expected 'Bearer sk_live_...'" });
  }

  const rawKey = authHeader.substring(7).trim();
  if (!rawKey.startsWith("sk_live_")) {
    return res.status(401).json({ error: "Invalid API key format" });
  }

  const prefix = rawKey.substring(0, 12);
  const keyHash = hashApiKey(rawKey);

  try {
    const result = await pool.query(
      `SELECT k.id, k.user_id, k.name, u.email
       FROM api_keys k
       JOIN users u ON k.user_id = u.id
       WHERE k.key_prefix = $1 AND k.key_hash = $2`,
      [prefix, keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or revoked API key" });
    }

    const keyRecord = result.rows[0];

    // Async update last_used_at timestamp
    pool.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [keyRecord.id]).catch(() => {});

    req.user = { id: keyRecord.user_id, email: keyRecord.email };
    req.apiKey = { id: keyRecord.id, name: keyRecord.name };
    next();
  } catch (err) {
    logger.error("API Key verification error", err);
    res.status(500).json({ error: "Internal server error during key verification" });
  }
}

/**
 * Register API Key management express endpoints
 */
function registerApiKeyRoutes(app) {
  const { requireAuth } = require("../auth");

  // Create API key
  app.post("/api/keys", requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Key name must be at least 2 characters" });
    }

    const { rawKey, prefix, hash } = generateApiKey();

    try {
      const result = await pool.query(
        `INSERT INTO api_keys (user_id, key_prefix, key_hash, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, key_prefix, created_at`,
        [req.user.id, prefix, hash, name.trim()]
      );

      const newKey = result.rows[0];
      await logAuditEvent(req.user.id, "create_api_key", "api_key", newKey.id, { name: newKey.name });

      res.status(201).json({
        id: newKey.id,
        name: newKey.name,
        key_prefix: newKey.key_prefix,
        secret_key: rawKey, // Displayed ONLY ONCE
        created_at: newKey.created_at,
        warning: "Copy this key now! You won't be able to see it again.",
      });
    } catch (err) {
      logger.error("Failed to create API key", err);
      res.status(500).json({ error: "Failed to generate API key" });
    }
  });

  // List API keys for current user
  app.get("/api/keys", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, key_prefix, last_used_at, created_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.status(200).json({ keys: result.rows });
    } catch (err) {
      logger.error("Failed to list API keys", err);
      res.status(500).json({ error: "Failed to retrieve API keys" });
    }
  });

  // Revoke / Delete API key
  app.delete("/api/keys/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id, name",
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "API key not found or unauthorized" });
      }

      await logAuditEvent(req.user.id, "revoke_api_key", "api_key", id, { name: result.rows[0].name });
      res.status(200).json({ message: "API key revoked successfully" });
    } catch (err) {
      logger.error("Failed to revoke API key", err);
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });
}

module.exports = {
  generateApiKey,
  requireApiKey,
  registerApiKeyRoutes,
};
