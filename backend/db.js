const { Pool } = require("pg");
const logger = require("./logger");

// High-Performance PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.POSTGRES_USER || process.env.DB_USER || "app_user",
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || "app_pass",
  database: process.env.POSTGRES_DB || process.env.DB_NAME || "url_shortener",
  max: 25, // Maximum connections in pool for high load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error("Unexpected error on idle PostgreSQL client", err);
});

/**
 * Automated Database Migration & Schema Setup
 */
async function ensureSchema() {
  const client = await pool.connect();
  try {
    logger.info("Initializing & verifying database schema...");

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          VARCHAR(255),
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)");

    // 2. URLs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id            SERIAL PRIMARY KEY,
        original_url  TEXT NOT NULL,
        short_code    VARCHAR(64) UNIQUE,
        user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        clicks        INTEGER DEFAULT 0,
        qr_scans      INTEGER DEFAULT 0,
        is_active     BOOLEAN DEFAULT TRUE,
        is_private    BOOLEAN DEFAULT FALSE,
        expires_at    TIMESTAMP DEFAULT NULL,
        domain        VARCHAR(255) DEFAULT NULL,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure columns exist on pre-existing tables
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL");
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS qr_scans INTEGER DEFAULT 0");
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE");
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL");
    await client.query("ALTER TABLE urls ADD COLUMN IF NOT EXISTS domain VARCHAR(255) DEFAULT NULL");

    // Optimized Indexes for High-Load Queries
    await client.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_short_code ON urls (short_code)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls (user_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at)");

    // 3. Click Events Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS click_events (
        id          SERIAL PRIMARY KEY,
        url_id      INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
        clicked_at  TIMESTAMP DEFAULT NOW(),
        referrer    TEXT,
        user_agent  TEXT,
        browser     TEXT,
        os          TEXT,
        device_type TEXT,
        ip_hash     TEXT,
        country     VARCHAR(100) DEFAULT 'Unknown',
        city        VARCHAR(100) DEFAULT 'Unknown',
        is_qr       BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query("ALTER TABLE click_events ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Unknown'");
    await client.query("ALTER TABLE click_events ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Unknown'");
    await client.query("ALTER TABLE click_events ADD COLUMN IF NOT EXISTS is_qr BOOLEAN DEFAULT FALSE");

    await client.query("CREATE INDEX IF NOT EXISTS idx_click_events_url_id ON click_events (url_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events (clicked_at)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_click_events_country ON click_events (country)");

    logger.info("Database schema migration verified successfully!");
  } catch (err) {
    logger.error("Failed to migrate database schema", err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.ensureSchema = ensureSchema;
