const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { ensureSchema } = require("./db");
const { encode } = require("./base62");
const { registerAuthRoutes, requireAuth, optionalAuth } = require("./auth");
const { extractClickMetadata } = require("./clickTracking");
const { getCachedUrl, setCachedUrl, deleteCachedUrl, isRedisConnected } = require("./redis");
const { addClickJob } = require("./jobs/queue");
const { checkUrlSafety } = require("./services/maliciousUrl");
const { generalRateLimiter, createLinkLimiter } = require("./middleware/rateLimiter");
const { validateBody, shortenSchema, updateLinkSchema } = require("./middleware/validate");
const logger = require("./logger");

const app = express();

// Trust proxy for IP rate limiting & GeoIP lookup behind reverse proxies
app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));
app.use(cors());

const PORT = process.env.PORT || 5000;

// Register Authentication Routes
registerAuthRoutes(app, pool);

// Apply General Rate Limiter to public API routes
app.use("/api/", generalRateLimiter);

/**
 * Helper: Resolve Base URL from Environment Variable or Request Headers
 */
function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * Helper: Validate URL Alias format
 */
function isValidAlias(value) {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(value);
}

/**
 * GET /health - Observability Health Check
 */
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  try {
    await pool.query("SELECT 1");
    dbStatus = "connected";
  } catch (err) {
    logger.error("Health check DB failure", err);
  }

  res.status(dbStatus === "connected" ? 200 : 503).json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    database: dbStatus,
    redis: isRedisConnected() ? "connected" : "disabled",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Helper: Core Link Shortening Function
 */
async function shortenUrlCore({ url, alias, expires_at, is_private, domain, userId, source = "web" }) {
  // Security & Safety Check
  const safety = checkUrlSafety(url);
  if (!safety.safe) {
    throw { status: 400, message: safety.reason };
  }

  const customAlias = alias?.trim();
  if (customAlias && !isValidAlias(customAlias)) {
    throw {
      status: 400,
      message: "Custom alias must be 3-32 characters using letters, numbers, hyphens, or underscores",
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let shortCode;
    let linkRowId = null;

    if (customAlias) {
      const aliasMatch = await client.query("SELECT id FROM urls WHERE short_code = $1", [customAlias]);
      if (aliasMatch.rows.length > 0) {
        await client.query("ROLLBACK");
        throw { status: 409, message: "That custom alias is already taken" };
      }
      shortCode = customAlias;
      const insertRes = await client.query(
        `INSERT INTO urls (original_url, short_code, user_id, expires_at, is_private, domain)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [url, shortCode, userId || null, expires_at || null, Boolean(is_private), domain || null]
      );
      linkRowId = insertRes.rows[0].id;
    } else {
      const existing = await client.query(
        `SELECT id, short_code FROM urls
         WHERE original_url = $1 AND short_code IS NOT NULL AND user_id IS NOT DISTINCT FROM $2`,
        [url, userId || null]
      );

      if (existing.rows.length > 0) {
        shortCode = existing.rows[0].short_code;
        linkRowId = existing.rows[0].id;
      } else {
        const insertResult = await client.query(
          `INSERT INTO urls (original_url, user_id, expires_at, is_private, domain)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [url, userId || null, expires_at || null, Boolean(is_private), domain || null]
        );
        linkRowId = insertResult.rows[0].id;
        shortCode = encode(linkRowId);
        await client.query("UPDATE urls SET short_code = $1 WHERE id = $2", [shortCode, linkRowId]);
      }
    }

    await client.query("COMMIT");

    // Seed Redis Cache with link ID for sub-5ms lookup
    await setCachedUrl(shortCode, {
      id: linkRowId,
      original_url: url,
      is_active: true,
      expires_at: expires_at || null,
    });

    return shortCode;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST /api/shorten - Shorten link endpoint (Web UI)
 */
app.post("/api/shorten", createLinkLimiter, optionalAuth, validateBody(shortenSchema), async (req, res) => {
  const { url, alias, expires_at, is_private, domain } = req.body;
  const userId = req.user ? req.user.id : null;

  try {
    const shortCode = await shortenUrlCore({
      url,
      alias,
      expires_at,
      is_private,
      domain,
      userId,
      source: "web",
    });

    res.status(200).json({
      original_url: url,
      short_code: shortCode,
      short_url: `${getBaseUrl(req)}/${shortCode}`,
      stats_url: `${getBaseUrl(req)}/api/stats/${shortCode}`,
      expires_at: expires_at || null,
      is_private: Boolean(is_private),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    logger.error("Error creating short link", err);
    res.status(500).json({ error: "Something went wrong creating short link" });
  }
});

/**
 * POST /api/links/bulk - Bulk Link Creation (CSV / Batch Array)
 */
app.post("/api/links/bulk", createLinkLimiter, requireAuth, async (req, res) => {
  const { links } = req.body;
  if (!Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: "Request body must contain an array 'links'" });
  }
  if (links.length > 50) {
    return res.status(400).json({ error: "Bulk creation limited to maximum 50 links per request" });
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    try {
      if (!item.url) {
        errors.push({ index: i, error: "Missing URL" });
        continue;
      }
      const shortCode = await shortenUrlCore({
        url: item.url,
        alias: item.alias,
        userId: req.user.id,
        source: "bulk",
      });
      results.push({
        index: i,
        original_url: item.url,
        short_code: shortCode,
        short_url: `${getBaseUrl(req)}/${shortCode}`,
      });
    } catch (err) {
      errors.push({ index: i, url: item.url, error: err.message || "Failed" });
    }
  }

  res.status(200).json({
    created_count: results.length,
    failed_count: errors.length,
    results,
    errors,
  });
});

/**
 * GET /api/my-links - Protected user links dashboard list
 */
app.get("/api/my-links", requireAuth, async (req, res) => {
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;

  try {
    let query = `
      SELECT id, original_url, short_code, clicks, qr_scans, is_active, is_private, expires_at, created_at
      FROM urls
      WHERE user_id = $1 AND short_code IS NOT NULL
    `;
    const params = [req.user.id];

    if (search) {
      params.push(search);
      query += ` AND (original_url ILIKE $${params.length} OR short_code ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      links: result.rows.map((row) => ({
        id: row.id,
        original_url: row.original_url,
        short_code: row.short_code,
        clicks: row.clicks,
        qr_scans: row.qr_scans,
        is_active: row.is_active,
        is_private: row.is_private,
        expires_at: row.expires_at,
        created_at: row.created_at,
        short_url: `${getBaseUrl(req)}/${row.short_code}`,
      })),
    });
  } catch (err) {
    logger.error("Failed to fetch user links", err);
    res.status(500).json({ error: "Failed to load links" });
  }
});

/**
 * GET /api/links - Public recent links list (unauthenticated fallback)
 */
app.get("/api/links", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, original_url, short_code, clicks, qr_scans, is_active, expires_at, created_at
       FROM urls
       WHERE short_code IS NOT NULL AND is_private = FALSE
       ORDER BY created_at DESC LIMIT 10`
    );

    res.status(200).json({
      links: result.rows.map((row) => ({
        id: row.id,
        original_url: row.original_url,
        short_code: row.short_code,
        clicks: row.clicks,
        qr_scans: row.qr_scans,
        is_active: row.is_active,
        expires_at: row.expires_at,
        created_at: row.created_at,
        short_url: `${getBaseUrl(req)}/${row.short_code}`,
      })),
    });
  } catch (err) {
    logger.error("Failed to fetch public links", err);
    res.status(500).json({ error: "Failed to load public links" });
  }
});

/**
 * PUT /api/links/:id - Update link parameters
 */
app.put("/api/links/:id", requireAuth, validateBody(updateLinkSchema), async (req, res) => {
  const { id } = req.params;
  const { original_url, is_active, is_private, expires_at } = req.body;

  try {
    const existing = await pool.query("SELECT id, user_id, short_code FROM urls WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Link not found" });
    }

    const link = existing.rows[0];
    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to update this link" });
    }

    if (original_url) {
      const safety = checkUrlSafety(original_url);
      if (!safety.safe) {
        return res.status(400).json({ error: safety.reason });
      }
    }

    const updates = [];
    const params = [];

    if (original_url !== undefined) {
      params.push(original_url);
      updates.push(`original_url = $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }
    if (is_private !== undefined) {
      params.push(is_private);
      updates.push(`is_private = $${params.length}`);
    }
    if (expires_at !== undefined) {
      params.push(expires_at);
      updates.push(`expires_at = $${params.length}`);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE urls SET ${updates.join(", ")} WHERE id = $${params.length}`, params);
      await deleteCachedUrl(link.short_code);
    }

    res.status(200).json({ message: "Link updated successfully" });
  } catch (err) {
    logger.error("Failed to update link", err);
    res.status(500).json({ error: "Failed to update link" });
  }
});

/**
 * DELETE /api/links/:id - Delete a short link
 */
app.delete("/api/links/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query("SELECT id, user_id, short_code FROM urls WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Link not found" });
    }

    const link = existing.rows[0];
    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this link" });
    }

    await pool.query("DELETE FROM urls WHERE id = $1", [id]);
    await deleteCachedUrl(link.short_code);

    res.status(200).json({ message: "Link deleted successfully" });
  } catch (err) {
    logger.error("Failed to delete link", err);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

/**
 * GET /api/stats/:shortCode - Quick link statistics
 */
app.get("/api/stats/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await pool.query(
      "SELECT original_url, short_code, clicks, qr_scans, is_active, created_at FROM urls WHERE short_code = $1",
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Short link not found" });
    }

    const row = result.rows[0];
    res.status(200).json({
      original_url: row.original_url,
      short_code: row.short_code,
      clicks: row.clicks,
      qr_scans: row.qr_scans,
      is_active: row.is_active,
      created_at: row.created_at,
      short_url: `${getBaseUrl(req)}/${row.short_code}`,
    });
  } catch (err) {
    logger.error("Error fetching stats", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/**
 * GET /api/stats/:shortCode/analytics - Interactive Detailed Analytics Charts
 */
app.get("/api/stats/:shortCode/analytics", requireAuth, async (req, res) => {
  const { shortCode } = req.params;

  try {
    const linkResult = await pool.query("SELECT id, user_id FROM urls WHERE short_code = $1", [shortCode]);
    if (linkResult.rows.length === 0) {
      return res.status(404).json({ error: "Short link not found" });
    }

    const link = linkResult.rows[0];
    if (link.user_id !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this link's analytics" });
    }

    const [dailyClicks, deviceBreakdown, browserBreakdown, topReferrers, countryBreakdown] = await Promise.all([
      pool.query(
        `SELECT DATE(clicked_at) AS day, COUNT(*)::int AS clicks
         FROM click_events
         WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(clicked_at)
         ORDER BY day ASC`,
        [link.id]
      ),
      pool.query(
        `SELECT COALESCE(device_type, 'desktop') AS device_type, COUNT(*)::int AS count
         FROM click_events WHERE url_id = $1
         GROUP BY device_type ORDER BY count DESC`,
        [link.id]
      ),
      pool.query(
        `SELECT COALESCE(browser, 'Unknown') AS browser, COUNT(*)::int AS count
         FROM click_events WHERE url_id = $1
         GROUP BY browser ORDER BY count DESC`,
        [link.id]
      ),
      pool.query(
        `SELECT COALESCE(referrer, 'Direct') AS referrer, COUNT(*)::int AS count
         FROM click_events WHERE url_id = $1
         GROUP BY referrer ORDER BY count DESC LIMIT 5`,
        [link.id]
      ),
      pool.query(
        `SELECT COALESCE(country, 'Unknown') AS country, COUNT(*)::int AS count
         FROM click_events WHERE url_id = $1
         GROUP BY country ORDER BY count DESC LIMIT 10`,
        [link.id]
      ),
    ]);

    res.status(200).json({
      daily_clicks: dailyClicks.rows,
      device_breakdown: deviceBreakdown.rows,
      browser_breakdown: browserBreakdown.rows,
      top_referrers: topReferrers.rows,
      country_breakdown: countryBreakdown.rows,
    });
  } catch (err) {
    logger.error("Analytics fetch error", err);
    res.status(500).json({ error: "Failed to load analytics breakdown" });
  }
});

/**
 * GET /api/summary - Platform Summary Stats
 */
app.get("/api/summary", optionalAuth, async (req, res) => {
  try {
    let query = `
      SELECT
        COUNT(*)::int AS total_links,
        COALESCE(SUM(clicks), 0)::int AS total_clicks,
        COALESCE(SUM(qr_scans), 0)::int AS total_qr_scans
      FROM urls
      WHERE short_code IS NOT NULL
    `;
    const params = [];

    if (req.user) {
      params.push(req.user.id);
      query += ` AND user_id = $1`;
    }

    const result = await pool.query(query, params);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    logger.error("Summary query error", err);
    res.status(500).json({ error: "Failed to calculate summary" });
  }
});

/**
 * GET /:shortCode - High Speed Short Link Redirect (<5ms with Redis)
 */
app.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  try {
    let targetUrl = null;
    let linkId = null;

    // 1. Check Redis Cache
    const cached = await getCachedUrl(shortCode);

    if (cached) {
      linkId = cached.id || null;
      if (!cached.is_active) {
        return res.status(410).send("This short link has been disabled.");
      }
      if (cached.expires_at && new Date(cached.expires_at) <= new Date()) {
        return res.status(410).send("This short link has expired.");
      }
      targetUrl = cached.original_url;
    }

    // 2. Database Lookup on Cache Miss
    if (!targetUrl) {
      const result = await pool.query(
        "SELECT id, original_url, is_active, expires_at FROM urls WHERE short_code = $1",
        [shortCode]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Short URL not found.");
      }

      const row = result.rows[0];
      linkId = row.id;

      if (!row.is_active) {
        return res.status(410).send("This short link has been disabled.");
      }

      if (row.expires_at && new Date(row.expires_at) <= new Date()) {
        return res.status(410).send("This short link has expired.");
      }

      targetUrl = row.original_url;

      // Seed Redis cache including link ID
      await setCachedUrl(shortCode, {
        id: row.id,
        original_url: row.original_url,
        is_active: row.is_active,
        expires_at: row.expires_at,
      });
    }

    // 3. Extract Metadata & Increment Click Counter
    const metadata = extractClickMetadata(req);

    if (!linkId) {
      const idRes = await pool.query("SELECT id FROM urls WHERE short_code = $1", [shortCode]);
      if (idRes.rows.length > 0) linkId = idRes.rows[0].id;
    }

    if (linkId) {
      // Synchronously update fast click counters in PostgreSQL before redirecting
      try {
        await pool.query(
          metadata.isQr
            ? "UPDATE urls SET clicks = clicks + 1, qr_scans = qr_scans + 1 WHERE id = $1"
            : "UPDATE urls SET clicks = clicks + 1 WHERE id = $1",
          [linkId]
        );
      } catch (err) {
        logger.error("Failed to increment click counter", err);
      }

      // Queue click event for detailed analytics, fallback to direct insert
      const queued = await addClickJob({ urlId: linkId, metadata });
      if (!queued) {
        pool.query(
          `INSERT INTO click_events (url_id, referrer, user_agent, browser, os, device_type, ip_hash, country, city, is_qr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [linkId, metadata.referrer, metadata.userAgent, metadata.browser, metadata.os, metadata.deviceType, metadata.ipHash, metadata.country, metadata.city, Boolean(metadata.isQr)]
        ).catch(() => {});
      }
    }

    // 4. Perform 302 HTTP Redirect
    res.redirect(302, targetUrl);
  } catch (err) {
    logger.error("Redirect error", err);
    res.status(500).send("Internal Server Error during redirect.");
  }
});

// Boot Server & Ensure Schema Migration if run directly
if (require.main === module) {
  ensureSchema()
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`High-Performance Shortener Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      logger.error("Failed to prepare database schema", err);
      process.exit(1);
    });
}

module.exports = app;
