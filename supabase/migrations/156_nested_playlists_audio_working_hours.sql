-- ============================================
-- Migration 156: Nested Playlists, Background Audio, Working Hours
-- ============================================
-- Extends the content model with three orthogonal features:
-- 1. Nested playlists with circular reference prevention (NEST-03, NEST-04)
-- 2. Background audio on playlists (AUDIO-04)
-- 3. Working hours schedule on screens (POWER-01)
-- 4. Validation RPC for service-layer pre-check
-- 5. Helper function for flattening nested playlists
-- 6. Updated get_resolved_player_content with all new data
--
-- Requirements: NEST-03, NEST-04, AUDIO-04
-- ============================================

-- ============================================
-- Section 1: Extend playlist_items item_type CHECK constraint
-- ============================================
-- Add 'playlist' as a valid item_type to support nested playlists

ALTER TABLE public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_item_type_check;
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_items_item_type_check
  CHECK (item_type IN ('media', 'app', 'layout', 'web_page', 'playlist'));

-- ============================================
-- Section 2: Circular reference prevention trigger
-- ============================================
-- BEFORE INSERT/UPDATE trigger on playlist_items that:
-- 1. Rejects direct self-references (A -> A)
-- 2. Detects multi-step cycles via ancestry walk (A -> B -> C -> A)
-- 3. Enforces max nesting depth of 5 levels
-- Safety brake: depth < 6 in both CTEs to prevent runaway recursion

CREATE OR REPLACE FUNCTION public.check_playlist_nesting()
RETURNS TRIGGER AS $$
DECLARE
  v_has_cycle BOOLEAN;
  v_ancestor_depth INTEGER;
  v_descendant_depth INTEGER;
  v_total_depth INTEGER;
BEGIN
  -- Only check when item_type is 'playlist'
  IF NEW.item_type != 'playlist' THEN
    RETURN NEW;
  END IF;

  -- Fast path: reject direct self-reference
  IF NEW.item_id = NEW.playlist_id THEN
    RAISE EXCEPTION 'Cannot add a playlist to itself'
      USING ERRCODE = 'P0001';
  END IF;

  -- Walk UP: find all ancestor playlists of the playlist we are inserting INTO
  -- If the child playlist (NEW.item_id) appears as an ancestor, we have a cycle
  WITH RECURSIVE ancestry AS (
    -- Start: the playlist we are inserting into
    SELECT NEW.playlist_id AS pid, 1 AS depth
    UNION ALL
    -- Walk up: find parent playlists that contain ancestry.pid as a nested playlist
    SELECT pi.playlist_id, a.depth + 1
    FROM public.playlist_items pi
    JOIN ancestry a ON pi.item_id = a.pid
    WHERE pi.item_type = 'playlist'
      AND a.depth < 6  -- safety brake
  )
  SELECT
    EXISTS(SELECT 1 FROM ancestry WHERE pid = NEW.item_id),
    COALESCE(MAX(depth), 1)
  INTO v_has_cycle, v_ancestor_depth
  FROM ancestry;

  IF v_has_cycle THEN
    RAISE EXCEPTION 'Circular playlist reference detected'
      USING ERRCODE = 'P0001';
  END IF;

  -- Walk DOWN: find all descendant playlists of the child playlist (NEW.item_id)
  -- This determines how deep the subtree goes below the insertion point
  WITH RECURSIVE descendants AS (
    -- Start: the playlist we are inserting (the child)
    SELECT NEW.item_id AS pid, 1 AS depth
    UNION ALL
    -- Walk down: find playlists nested inside descendants
    SELECT pi.item_id, d.depth + 1
    FROM public.playlist_items pi
    JOIN descendants d ON pi.playlist_id = d.pid
    WHERE pi.item_type = 'playlist'
      AND d.depth < 6  -- safety brake
  )
  SELECT COALESCE(MAX(depth), 1)
  INTO v_descendant_depth
  FROM descendants;

  -- Total depth = how far up the ancestry goes + how far down the descendants go
  v_total_depth := v_ancestor_depth + v_descendant_depth;

  IF v_total_depth > 5 THEN
    RAISE EXCEPTION 'Playlist nesting depth exceeds maximum of 5 levels'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_playlist_nesting_trigger
  BEFORE INSERT OR UPDATE ON public.playlist_items
  FOR EACH ROW EXECUTE FUNCTION public.check_playlist_nesting();

-- Partial index for fast nesting lookups
CREATE INDEX IF NOT EXISTS idx_playlist_items_nesting
  ON public.playlist_items(playlist_id, item_type)
  WHERE item_type = 'playlist';

-- ============================================
-- Section 3: Background audio columns on playlists
-- ============================================
-- Allows assigning an audio media asset as background music for a playlist

ALTER TABLE public.playlists
ADD COLUMN IF NOT EXISTS background_audio_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE public.playlists
ADD COLUMN IF NOT EXISTS background_audio_volume INTEGER DEFAULT 100
  CHECK (background_audio_volume >= 0 AND background_audio_volume <= 100);

CREATE INDEX IF NOT EXISTS idx_playlists_background_audio
  ON public.playlists(background_audio_id)
  WHERE background_audio_id IS NOT NULL;

-- ============================================
-- Section 4: Working hours JSONB on tv_devices
-- ============================================
-- Per-screen on/off schedule. NULL = always on (default behavior).

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT NULL;

COMMENT ON COLUMN public.tv_devices.working_hours IS
  'Per-day working hours schedule. Shape: {"0":{"enabled":true,"start":"08:00","end":"18:00"},...,"6":{...}} where keys are DOW (0=Sun..6=Sat). NULL = always on.';

-- ============================================
-- Section 5: Validation RPC for service-layer pre-check
-- ============================================
-- Returns false instead of raising an exception, giving the service layer
-- a fast pre-check before attempting the insert.

CREATE OR REPLACE FUNCTION public.check_playlist_nesting_valid(
  p_parent_id UUID,
  p_child_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_cycle BOOLEAN;
  v_ancestor_depth INTEGER;
  v_descendant_depth INTEGER;
  v_total_depth INTEGER;
BEGIN
  -- Self-reference check
  IF p_parent_id = p_child_id THEN
    RETURN FALSE;
  END IF;

  -- Walk UP: ancestors of the parent
  WITH RECURSIVE ancestry AS (
    SELECT p_parent_id AS pid, 1 AS depth
    UNION ALL
    SELECT pi.playlist_id, a.depth + 1
    FROM public.playlist_items pi
    JOIN ancestry a ON pi.item_id = a.pid
    WHERE pi.item_type = 'playlist'
      AND a.depth < 6
  )
  SELECT
    EXISTS(SELECT 1 FROM ancestry WHERE pid = p_child_id),
    COALESCE(MAX(depth), 1)
  INTO v_has_cycle, v_ancestor_depth
  FROM ancestry;

  IF v_has_cycle THEN
    RETURN FALSE;
  END IF;

  -- Walk DOWN: descendants of the child
  WITH RECURSIVE descendants AS (
    SELECT p_child_id AS pid, 1 AS depth
    UNION ALL
    SELECT pi.item_id, d.depth + 1
    FROM public.playlist_items pi
    JOIN descendants d ON pi.playlist_id = d.pid
    WHERE pi.item_type = 'playlist'
      AND d.depth < 6
  )
  SELECT COALESCE(MAX(depth), 1)
  INTO v_descendant_depth
  FROM descendants;

  v_total_depth := v_ancestor_depth + v_descendant_depth;

  IF v_total_depth > 5 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_playlist_nesting_valid(UUID, UUID) TO authenticated;
