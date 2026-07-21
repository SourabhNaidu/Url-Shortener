-- Phase 2: The Database (Storing Links)
-- Run with: psql -U app_user -d url_shortener -f schema.sql

CREATE TABLE IF NOT EXISTS urls (
  id            SERIAL PRIMARY KEY,      -- auto-incrementing number (1, 2, 3, ...)
  original_url  TEXT NOT NULL,           -- the long URL the user submitted
  short_code    VARCHAR(10),             -- filled in later, once we Base62-encode the id
  clicks        INTEGER DEFAULT 0,       -- bonus column for Phase 5's click counter
  created_at    TIMESTAMP DEFAULT NOW()  -- nice to have, useful for sorting/debugging
);

-- Index for fast lookups when someone visits /:shortCode
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_code ON urls (short_code);
