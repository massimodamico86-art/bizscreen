-- Migration 165: Canva OAuth tokens + Video Wall tables
-- Phase 112: Canva Connect integration and Video Wall feature
--
-- Tables:
--   1. canva_oauth_tokens  - Server-side Canva OAuth token storage (per user)
--   2. video_walls         - Video wall grid configurations (per tenant)
--   3. video_wall_screens  - Junction: maps screens to wall grid positions

-- ---------------------------------------------------------------------------
-- 1. canva_oauth_tokens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.canva_oauth_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ NOT NULL,
  scopes        TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.canva_oauth_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canva_oauth_tokens TO authenticated;

CREATE POLICY "Users manage own Canva tokens"
  ON public.canva_oauth_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. video_walls
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.video_walls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  rows          INTEGER NOT NULL CHECK (rows >= 1 AND rows <= 10),
  cols          INTEGER NOT NULL CHECK (cols >= 1 AND cols <= 10),
  bezel_gap_x   NUMERIC DEFAULT 0,
  bezel_gap_y   NUMERIC DEFAULT 0,
  playlist_id   UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_walls ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_walls TO authenticated;

CREATE POLICY "Tenant members manage video walls"
  ON public.video_walls
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. video_wall_screens (junction)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.video_wall_screens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id       UUID NOT NULL REFERENCES public.video_walls(id) ON DELETE CASCADE,
  screen_id     UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  row_position  INTEGER NOT NULL CHECK (row_position >= 0),
  col_position  INTEGER NOT NULL CHECK (col_position >= 0),
  is_leader     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wall_id, row_position, col_position),
  UNIQUE(wall_id, screen_id)
);

ALTER TABLE public.video_wall_screens ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_wall_screens TO authenticated;

CREATE POLICY "Tenant members manage video wall screens"
  ON public.video_wall_screens
  FOR ALL
  USING (
    wall_id IN (
      SELECT vw.id FROM public.video_walls vw
      WHERE vw.tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    wall_id IN (
      SELECT vw.id FROM public.video_walls vw
      WHERE vw.tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    )
  );
