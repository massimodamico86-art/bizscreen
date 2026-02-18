-- Migration 145: Create weather cache table
-- Caches weather and geocoding API responses with TTL support.
-- Used by the weather-proxy Edge Function to avoid redundant OpenWeatherMap API calls.
-- Supports current weather, forecast, forward geocoding, and reverse geocoding.

CREATE TABLE IF NOT EXISTS weather_cache (
  cache_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  location TEXT NOT NULL,
  units TEXT NOT NULL DEFAULT 'imperial',
  response_data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- Index for TTL cleanup and cache expiry queries
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache (expires_at);

-- RLS: service role only (Edge Function uses service role key)
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed -- only service role accesses this table
