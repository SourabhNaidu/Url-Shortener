-- Enterprise Bitly-Style URL Shortener Schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  owner_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id            SERIAL PRIMARY KEY,
  team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) DEFAULT 'member', -- owner, admin, member
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS urls (
  id            SERIAL PRIMARY KEY,
  original_url  TEXT NOT NULL,
  short_code    VARCHAR(64) UNIQUE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_urls_team_id ON urls (team_id);
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

CREATE TABLE IF NOT EXISTS api_keys (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_prefix    VARCHAR(16) NOT NULL,
  key_hash      TEXT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  last_used_at  TIMESTAMP DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   VARCHAR(100),
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
