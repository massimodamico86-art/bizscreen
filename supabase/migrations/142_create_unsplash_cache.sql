-- Migration 142: Create Unsplash search cache table
-- Purpose: Caches Unsplash API search results to reduce API calls and respect rate limits.
-- Results are stored as JSONB with a 24-hour TTL. Cache keys are deterministic hashes
-- of normalized search parameters (lowercase, trimmed, collapsed spaces).
--
-- This table is internal infrastructure -- accessed only by the unsplash-proxy Edge Function
-- using the service role key. No RLS policies are needed.

CREATE TABLE IF NOT EXISTS unsplash_search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  per_page INTEGER NOT NULL DEFAULT 20,
  orientation TEXT,
  total_results INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  unsplash_rate_limit INTEGER,
  unsplash_rate_remaining INTEGER,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Fast cache key lookups (primary access path)
CREATE INDEX idx_unsplash_cache_key ON unsplash_search_cache(cache_key);

-- Expired entry cleanup queries
CREATE INDEX idx_unsplash_cache_expires ON unsplash_search_cache(expires_at);

COMMENT ON TABLE unsplash_search_cache IS
  'Caches Unsplash API search results with 24h TTL. Internal infrastructure table -- '
  'accessed only by the unsplash-proxy Edge Function via service role key. No RLS needed.';
