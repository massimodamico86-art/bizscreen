-- =====================================================
-- BIZSCREEN PHASE 1: MEDIA LIBRARY & PLAYLISTS
-- =====================================================
-- Adds Yodeck-style media library and playlist support
--
-- AUDIT NOTES (reviewed against existing schema):
-- ✅ profiles(id) - exists in 001_initial_schema.sql
-- ✅ update_updated_at_column() - exists in 001_initial_schema.sql
-- ✅ is_super_admin() - exists in 009_add_roles_and_rbac.sql
-- ✅ is_admin() - exists in 009_add_roles_and_rbac.sql
-- ✅ get_my_client_ids() - exists in 009_add_roles_and_rbac.sql
-- ✅ tv_devices columns: device_name, otp_code, last_seen (renamed in 004)
-- =====================================================

-- =====================================================
-- MEDIA ASSETS TABLE
-- =====================================================
-- Central media library for all uploaded content

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Media Info
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document', 'web_page', 'app')),

  -- File Details
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT,
  file_size INTEGER, -- in bytes
  duration INTEGER, -- in seconds (for video/audio)
  width INTEGER, -- for images/videos
  height INTEGER, -- for images/videos

  -- Metadata
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,

  -- For apps and web pages
  config_json JSONB, -- Widget configuration or web page settings

  -- Folder organization (future use)
  folder_id UUID, -- Will reference folders table later

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_id ON public.media_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON public.media_assets(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder_id ON public.media_assets(folder_id);

COMMENT ON TABLE public.media_assets IS 'Central media library - images, videos, audio, documents, web pages, apps';

-- =====================================================
-- PLAYLISTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Playlist Info
  name TEXT NOT NULL,
  description TEXT,

  -- Settings
  default_duration INTEGER DEFAULT 10, -- Default item duration in seconds
  transition_effect TEXT DEFAULT 'fade', -- 'none', 'fade', 'slide'
  shuffle BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON public.playlists(owner_id);

COMMENT ON TABLE public.playlists IS 'Content playlists for screens';

-- =====================================================
-- PLAYLIST ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,

  -- Item Reference (polymorphic)
  item_type TEXT NOT NULL CHECK (item_type IN ('media', 'app', 'layout', 'web_page')),
  item_id UUID NOT NULL, -- References media_assets.id, layouts.id, etc.

  -- Item Settings
  position INTEGER NOT NULL DEFAULT 0, -- Order in playlist
  duration INTEGER, -- Override duration in seconds (NULL = use default)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique position per playlist
  CONSTRAINT unique_playlist_position UNIQUE (playlist_id, position)
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_item_id ON public.playlist_items(item_id);

COMMENT ON TABLE public.playlist_items IS 'Items within a playlist with ordering';

-- =====================================================
-- LAYOUTS TABLE (Zone-based)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Layout Info
  name TEXT NOT NULL,
  description TEXT,

  -- Canvas Settings
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  background_color TEXT DEFAULT '#000000',
  background_image TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layouts_owner_id ON public.layouts(owner_id);

COMMENT ON TABLE public.layouts IS 'Multi-zone layout templates';

-- =====================================================
-- LAYOUT ZONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.layout_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layout_id UUID REFERENCES public.layouts(id) ON DELETE CASCADE NOT NULL,

  -- Zone Info
  name TEXT NOT NULL DEFAULT 'Main',

  -- Position & Size (percentage-based for responsiveness)
  x_percent DECIMAL(5,2) DEFAULT 0,
  y_percent DECIMAL(5,2) DEFAULT 0,
  width_percent DECIMAL(5,2) DEFAULT 100,
  height_percent DECIMAL(5,2) DEFAULT 100,

  -- Z-index for layering
  z_index INTEGER DEFAULT 0,

  -- Content Assignment
  content_type TEXT CHECK (content_type IN ('playlist', 'media', 'app', 'web_page')),
  content_id UUID, -- References playlists.id, media_assets.id, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layout_zones_layout_id ON public.layout_zones(layout_id);

-- NOTE: Zones can be empty (NULL content_type/content_id).
-- The layout editor must handle empty zones appropriately,
-- showing a placeholder or allowing drag-drop assignment.
COMMENT ON TABLE public.layout_zones IS 'Zones within a layout for multi-zone displays. Zones may be empty (NULL content) and the layout editor must handle this.';

-- =====================================================
-- SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Schedule Info
  name TEXT NOT NULL,
  description TEXT,

  -- Active state
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_owner_id ON public.schedules(owner_id);

COMMENT ON TABLE public.schedules IS 'Content schedules for time-based playback';

-- =====================================================
-- SCHEDULE ENTRIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,

  -- Target (which screens/groups)
  target_type TEXT NOT NULL CHECK (target_type IN ('screen', 'screen_group', 'all')),
  target_id UUID, -- NULL if target_type = 'all'

  -- Content to play
  content_type TEXT NOT NULL CHECK (content_type IN ('playlist', 'layout', 'media')),
  content_id UUID NOT NULL,

  -- Time Rules
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sun, 1=Mon, ..., 6=Sat (NULL = all days)

  -- Priority (higher = takes precedence)
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule_id ON public.schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_target ON public.schedule_entries(target_type, target_id);

COMMENT ON TABLE public.schedule_entries IS 'Individual schedule rules within a schedule';

-- =====================================================
-- UPDATE TV_DEVICES FOR YODECK COMPATIBILITY
-- =====================================================
-- Add fields to support playlist/layout/schedule assignment

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS assigned_playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_layout_id UUID REFERENCES public.layouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS screen_group_id UUID, -- For future screen groups
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

CREATE INDEX IF NOT EXISTS idx_tv_devices_assigned_playlist ON public.tv_devices(assigned_playlist_id);
CREATE INDEX IF NOT EXISTS idx_tv_devices_assigned_layout ON public.tv_devices(assigned_layout_id);
CREATE INDEX IF NOT EXISTS idx_tv_devices_assigned_schedule ON public.tv_devices(assigned_schedule_id);

-- =====================================================
-- TIMESTAMP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlist_items_updated_at ON public.playlist_items;
CREATE TRIGGER update_playlist_items_updated_at BEFORE UPDATE ON public.playlist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_layouts_updated_at ON public.layouts;
CREATE TRIGGER update_layouts_updated_at BEFORE UPDATE ON public.layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_layout_zones_updated_at ON public.layout_zones;
CREATE TRIGGER update_layout_zones_updated_at BEFORE UPDATE ON public.layout_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.schedules;
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_entries_updated_at ON public.schedule_entries;
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON public.schedule_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MEDIA_ASSETS POLICIES
-- ============================================

DROP POLICY IF EXISTS "media_assets_select_policy" ON public.media_assets;
CREATE POLICY "media_assets_select_policy"
ON public.media_assets FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "media_assets_insert_policy" ON public.media_assets;
CREATE POLICY "media_assets_insert_policy"
ON public.media_assets FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "media_assets_update_policy" ON public.media_assets;
CREATE POLICY "media_assets_update_policy"
ON public.media_assets FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "media_assets_delete_policy" ON public.media_assets;
CREATE POLICY "media_assets_delete_policy"
ON public.media_assets FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- ============================================
-- PLAYLISTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "playlists_select_policy" ON public.playlists;
CREATE POLICY "playlists_select_policy"
ON public.playlists FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "playlists_insert_policy" ON public.playlists;
CREATE POLICY "playlists_insert_policy"
ON public.playlists FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "playlists_update_policy" ON public.playlists;
CREATE POLICY "playlists_update_policy"
ON public.playlists FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "playlists_delete_policy" ON public.playlists;
CREATE POLICY "playlists_delete_policy"
ON public.playlists FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- ============================================
-- PLAYLIST_ITEMS POLICIES (inherit from playlist)
-- ============================================

DROP POLICY IF EXISTS "playlist_items_select_policy" ON public.playlist_items;
CREATE POLICY "playlist_items_select_policy"
ON public.playlist_items FOR SELECT
USING (
  is_super_admin()
  OR playlist_id IN (SELECT id FROM public.playlists WHERE owner_id = auth.uid())
  OR (is_admin() AND playlist_id IN (
    SELECT id FROM public.playlists WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "playlist_items_insert_policy" ON public.playlist_items;
CREATE POLICY "playlist_items_insert_policy"
ON public.playlist_items FOR INSERT
WITH CHECK (
  is_super_admin()
  OR playlist_id IN (SELECT id FROM public.playlists WHERE owner_id = auth.uid())
  OR (is_admin() AND playlist_id IN (
    SELECT id FROM public.playlists WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "playlist_items_update_policy" ON public.playlist_items;
CREATE POLICY "playlist_items_update_policy"
ON public.playlist_items FOR UPDATE
USING (
  is_super_admin()
  OR playlist_id IN (SELECT id FROM public.playlists WHERE owner_id = auth.uid())
  OR (is_admin() AND playlist_id IN (
    SELECT id FROM public.playlists WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "playlist_items_delete_policy" ON public.playlist_items;
CREATE POLICY "playlist_items_delete_policy"
ON public.playlist_items FOR DELETE
USING (
  is_super_admin()
  OR playlist_id IN (SELECT id FROM public.playlists WHERE owner_id = auth.uid())
  OR (is_admin() AND playlist_id IN (
    SELECT id FROM public.playlists WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- LAYOUTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "layouts_select_policy" ON public.layouts;
CREATE POLICY "layouts_select_policy"
ON public.layouts FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "layouts_insert_policy" ON public.layouts;
CREATE POLICY "layouts_insert_policy"
ON public.layouts FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "layouts_update_policy" ON public.layouts;
CREATE POLICY "layouts_update_policy"
ON public.layouts FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "layouts_delete_policy" ON public.layouts;
CREATE POLICY "layouts_delete_policy"
ON public.layouts FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- ============================================
-- LAYOUT_ZONES POLICIES
-- ============================================

DROP POLICY IF EXISTS "layout_zones_select_policy" ON public.layout_zones;
CREATE POLICY "layout_zones_select_policy"
ON public.layout_zones FOR SELECT
USING (
  is_super_admin()
  OR layout_id IN (SELECT id FROM public.layouts WHERE owner_id = auth.uid())
  OR (is_admin() AND layout_id IN (
    SELECT id FROM public.layouts WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "layout_zones_insert_policy" ON public.layout_zones;
CREATE POLICY "layout_zones_insert_policy"
ON public.layout_zones FOR INSERT
WITH CHECK (
  is_super_admin()
  OR layout_id IN (SELECT id FROM public.layouts WHERE owner_id = auth.uid())
  OR (is_admin() AND layout_id IN (
    SELECT id FROM public.layouts WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "layout_zones_update_policy" ON public.layout_zones;
CREATE POLICY "layout_zones_update_policy"
ON public.layout_zones FOR UPDATE
USING (
  is_super_admin()
  OR layout_id IN (SELECT id FROM public.layouts WHERE owner_id = auth.uid())
  OR (is_admin() AND layout_id IN (
    SELECT id FROM public.layouts WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "layout_zones_delete_policy" ON public.layout_zones;
CREATE POLICY "layout_zones_delete_policy"
ON public.layout_zones FOR DELETE
USING (
  is_super_admin()
  OR layout_id IN (SELECT id FROM public.layouts WHERE owner_id = auth.uid())
  OR (is_admin() AND layout_id IN (
    SELECT id FROM public.layouts WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- ============================================
-- SCHEDULES POLICIES
-- ============================================

DROP POLICY IF EXISTS "schedules_select_policy" ON public.schedules;
CREATE POLICY "schedules_select_policy"
ON public.schedules FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "schedules_insert_policy" ON public.schedules;
CREATE POLICY "schedules_insert_policy"
ON public.schedules FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "schedules_update_policy" ON public.schedules;
CREATE POLICY "schedules_update_policy"
ON public.schedules FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

DROP POLICY IF EXISTS "schedules_delete_policy" ON public.schedules;
CREATE POLICY "schedules_delete_policy"
ON public.schedules FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

-- ============================================
-- SCHEDULE_ENTRIES POLICIES
-- ============================================

DROP POLICY IF EXISTS "schedule_entries_select_policy" ON public.schedule_entries;
CREATE POLICY "schedule_entries_select_policy"
ON public.schedule_entries FOR SELECT
USING (
  is_super_admin()
  OR schedule_id IN (SELECT id FROM public.schedules WHERE owner_id = auth.uid())
  OR (is_admin() AND schedule_id IN (
    SELECT id FROM public.schedules WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "schedule_entries_insert_policy" ON public.schedule_entries;
CREATE POLICY "schedule_entries_insert_policy"
ON public.schedule_entries FOR INSERT
WITH CHECK (
  is_super_admin()
  OR schedule_id IN (SELECT id FROM public.schedules WHERE owner_id = auth.uid())
  OR (is_admin() AND schedule_id IN (
    SELECT id FROM public.schedules WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "schedule_entries_update_policy" ON public.schedule_entries;
CREATE POLICY "schedule_entries_update_policy"
ON public.schedule_entries FOR UPDATE
USING (
  is_super_admin()
  OR schedule_id IN (SELECT id FROM public.schedules WHERE owner_id = auth.uid())
  OR (is_admin() AND schedule_id IN (
    SELECT id FROM public.schedules WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

DROP POLICY IF EXISTS "schedule_entries_delete_policy" ON public.schedule_entries;
CREATE POLICY "schedule_entries_delete_policy"
ON public.schedule_entries FOR DELETE
USING (
  is_super_admin()
  OR schedule_id IN (SELECT id FROM public.schedules WHERE owner_id = auth.uid())
  OR (is_admin() AND schedule_id IN (
    SELECT id FROM public.schedules WHERE owner_id IN (SELECT client_id FROM get_my_client_ids())
  ))
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.media_assets TO authenticated;
GRANT ALL ON public.playlists TO authenticated;
GRANT ALL ON public.playlist_items TO authenticated;
GRANT ALL ON public.layouts TO authenticated;
GRANT ALL ON public.layout_zones TO authenticated;
GRANT ALL ON public.schedules TO authenticated;
GRANT ALL ON public.schedule_entries TO authenticated;

-- =====================================================
-- POLICY COMMENTS
-- =====================================================

COMMENT ON POLICY "media_assets_select_policy" ON public.media_assets IS 'RBAC: Clients see own, admins see managed clients, super_admins see all';
COMMENT ON POLICY "playlists_select_policy" ON public.playlists IS 'RBAC: Clients see own, admins see managed clients, super_admins see all';
COMMENT ON POLICY "playlist_items_select_policy" ON public.playlist_items IS 'RBAC: Access tied to playlist ownership';
COMMENT ON POLICY "layouts_select_policy" ON public.layouts IS 'RBAC: Clients see own, admins see managed clients, super_admins see all';
COMMENT ON POLICY "layout_zones_select_policy" ON public.layout_zones IS 'RBAC: Access tied to layout ownership';
COMMENT ON POLICY "schedules_select_policy" ON public.schedules IS 'RBAC: Clients see own, admins see managed clients, super_admins see all';
COMMENT ON POLICY "schedule_entries_select_policy" ON public.schedule_entries IS 'RBAC: Access tied to schedule ownership';

-- =====================================================
-- END OF PHASE 1 MIGRATION
-- =====================================================
-- New tables: 7
--   - media_assets (4 policies)
--   - playlists (4 policies)
--   - playlist_items (4 policies)
--   - layouts (4 policies)
--   - layout_zones (4 policies)
--   - schedules (4 policies)
--   - schedule_entries (4 policies)
--
-- Altered tables: 1
--   - tv_devices (added 7 columns + 3 indexes)
--
-- Total new policies: 28
-- =====================================================
