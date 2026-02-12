-- Migration 144: Create RSS feed cache table
-- Caches parsed and sanitized RSS/Atom feed data with TTL support.
-- Used by the rss-proxy Edge Function to avoid refetching feeds on every request.
-- Supports HTTP conditional GET via stored ETag and Last-Modified headers.

CREATE TABLE IF NOT EXISTS rss_feed_cache (
  feed_url TEXT PRIMARY KEY,
  feed_title TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  item_count INTEGER NOT NULL DEFAULT 0,
  etag TEXT,
  last_modified TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- Index for TTL cleanup and cache expiry queries
CREATE INDEX IF NOT EXISTS idx_rss_feed_cache_expires ON rss_feed_cache (expires_at);

-- RLS: service role only (Edge Function uses service role key)
ALTER TABLE rss_feed_cache ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed -- only service role accesses this table
