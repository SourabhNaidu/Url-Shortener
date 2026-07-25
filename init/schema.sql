-- High-Performance Scalable URL Shortener Schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_code ON urls (short_code);
CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls (user_id);
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at);

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
);

CREATE INDEX IF NOT EXISTS idx_click_events_url_id ON click_events (url_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events (clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_events_country ON click_events (country);
