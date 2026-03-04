-- Migration 164: Calendar event cache and OAuth tokens tables
--
-- Creates shared tables used by the calendar feature (Plans 111-03/04):
--   1. calendar_event_cache  -- TTL-based cache for normalized calendar events
--   2. calendar_oauth_tokens -- Per-user OAuth tokens for Google/Outlook calendars
--
-- Document conversion metadata uses the existing config_json JSONB column
-- on media_assets (no schema change needed for documents).

-- ============================================================
-- 1. calendar_event_cache
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_event_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gcal', 'outlook_cal')),
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(calendar_id, provider)
);

-- Index for cache lookup with TTL check
CREATE INDEX IF NOT EXISTS idx_calendar_cache_expiry
  ON public.calendar_event_cache(calendar_id, provider, expires_at);

-- ============================================================
-- 2. calendar_oauth_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendar_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gcal', 'outlook_cal')),
  calendar_id TEXT NOT NULL,
  label TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, provider, calendar_id)
);

-- Index for owner lookup
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_owner
  ON public.calendar_oauth_tokens(owner_id, provider);

-- Enable Row Level Security
ALTER TABLE public.calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only manage their own calendar tokens
CREATE POLICY "Users can manage own calendar tokens"
  ON public.calendar_oauth_tokens
  FOR ALL
  USING (owner_id = auth.uid());

-- ============================================================
-- 3. Grants to authenticated role
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_oauth_tokens TO authenticated;
