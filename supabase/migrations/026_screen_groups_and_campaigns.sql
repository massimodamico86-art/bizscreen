-- ============================================================================
-- Migration: 026_screen_groups_and_campaigns.sql
-- Description: Screen Groups for bulk management and Campaigns for date-bound
--              content overrides with priority-based resolution
-- ============================================================================

-- ============================================================================
-- PART 1: SCREEN GROUPS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 screen_groups table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.screen_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screen_groups_tenant_id
    ON public.screen_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_screen_groups_tenant_location
    ON public.screen_groups(tenant_id, location_id);

-- Updated_at trigger
CREATE TRIGGER set_screen_groups_updated_at
    BEFORE UPDATE ON public.screen_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.screen_groups IS
'Groups of screens for bulk content assignment and campaign targeting';
COMMENT ON COLUMN public.screen_groups.location_id IS
'Optional: link to a specific location. NULL means cross-location group';
COMMENT ON COLUMN public.screen_groups.tags IS
'Optional tags for future targeting and filtering';

-- ----------------------------------------------------------------------------
-- 1.2 Link tv_devices to screen_groups (add FK if not exists)
-- ----------------------------------------------------------------------------

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tv_devices_screen_group_fk'
    ) THEN
        ALTER TABLE public.tv_devices
            ADD CONSTRAINT tv_devices_screen_group_fk
            FOREIGN KEY (screen_group_id)
            REFERENCES public.screen_groups(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Index on screen_group_id
CREATE INDEX IF NOT EXISTS idx_tv_devices_screen_group_id
    ON public.tv_devices(screen_group_id);

-- ----------------------------------------------------------------------------
-- 1.3 RLS for screen_groups
-- ----------------------------------------------------------------------------

ALTER TABLE public.screen_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's screen groups
CREATE POLICY "screen_groups_select_policy"
    ON public.screen_groups FOR SELECT
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

-- Policy: Users can insert their own tenant's screen groups
CREATE POLICY "screen_groups_insert_policy"
    ON public.screen_groups FOR INSERT
    WITH CHECK (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

-- Policy: Users can update their own tenant's screen groups
CREATE POLICY "screen_groups_update_policy"
    ON public.screen_groups FOR UPDATE
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

-- Policy: Users can delete their own tenant's screen groups
CREATE POLICY "screen_groups_delete_policy"
    ON public.screen_groups FOR DELETE
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

-- ============================================================================
-- PART 2: CAMPAIGNS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 campaigns table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    priority INTEGER DEFAULT 100,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraint: end_at must be after start_at if both are set
    CONSTRAINT campaigns_valid_dates CHECK (
        start_at IS NULL OR end_at IS NULL OR end_at > start_at
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status
    ON public.campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_dates
    ON public.campaigns(tenant_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_lookup
    ON public.campaigns(tenant_id, status, priority DESC, start_at, end_at);

-- Updated_at trigger
CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.campaigns IS
'Time-bound content campaigns that override normal schedules with priority';
COMMENT ON COLUMN public.campaigns.priority IS
'Higher priority campaigns override lower priority. Default 100. Range typically 50-200.';
COMMENT ON COLUMN public.campaigns.status IS
'draft=editing, scheduled=future start, active=currently running, completed=past end, paused=manually stopped';

-- ----------------------------------------------------------------------------
-- 2.2 campaign_targets table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campaign_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('screen', 'screen_group', 'location', 'all')),
    target_id UUID, -- NULL when target_type = 'all'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraint: target_id required unless target_type is 'all'
    CONSTRAINT campaign_targets_id_check CHECK (
        (target_type = 'all' AND target_id IS NULL)
        OR (target_type != 'all' AND target_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign
    ON public.campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_lookup
    ON public.campaign_targets(target_type, target_id);

-- Updated_at trigger
CREATE TRIGGER set_campaign_targets_updated_at
    BEFORE UPDATE ON public.campaign_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.campaign_targets IS
'Defines what screens/groups/locations a campaign targets';
COMMENT ON COLUMN public.campaign_targets.target_type IS
'screen=single screen, screen_group=group of screens, location=all screens at location, all=all tenant screens';

-- ----------------------------------------------------------------------------
-- 2.3 campaign_contents table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campaign_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('playlist', 'layout', 'media')),
    content_id UUID NOT NULL,
    weight INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_contents_campaign
    ON public.campaign_contents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contents_content
    ON public.campaign_contents(content_type, content_id);

-- Updated_at trigger
CREATE TRIGGER set_campaign_contents_updated_at
    BEFORE UPDATE ON public.campaign_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.campaign_contents IS
'Content items (playlists, layouts, media) assigned to a campaign';
COMMENT ON COLUMN public.campaign_contents.weight IS
'For rotation weighting when multiple contents exist';
COMMENT ON COLUMN public.campaign_contents.position IS
'Ordering when displaying multiple content items';

-- ----------------------------------------------------------------------------
-- 2.4 RLS for campaigns and related tables
-- ----------------------------------------------------------------------------

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contents ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "campaigns_select_policy"
    ON public.campaigns FOR SELECT
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

CREATE POLICY "campaigns_insert_policy"
    ON public.campaigns FOR INSERT
    WITH CHECK (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

CREATE POLICY "campaigns_update_policy"
    ON public.campaigns FOR UPDATE
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

CREATE POLICY "campaigns_delete_policy"
    ON public.campaigns FOR DELETE
    USING (
        tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))
    );

-- Campaign targets policies (inherit from campaign)
CREATE POLICY "campaign_targets_select_policy"
    ON public.campaign_targets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id
            AND (
                c.tenant_id = auth.uid()
                OR is_super_admin()
                OR (is_admin() AND c.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
            )
        )
    );

CREATE POLICY "campaign_targets_all_policy"
    ON public.campaign_targets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id
            AND (
                c.tenant_id = auth.uid()
                OR is_super_admin()
                OR (is_admin() AND c.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
            )
        )
    );

-- Campaign contents policies (inherit from campaign)
CREATE POLICY "campaign_contents_select_policy"
    ON public.campaign_contents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id
            AND (
                c.tenant_id = auth.uid()
                OR is_super_admin()
                OR (is_admin() AND c.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
            )
        )
    );

CREATE POLICY "campaign_contents_all_policy"
    ON public.campaign_contents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id
            AND (
                c.tenant_id = auth.uid()
                OR is_super_admin()
                OR (is_admin() AND c.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
            )
        )
    );

-- ============================================================================
-- PART 3: PLAYBACK EVENTS EXTENSION
-- ============================================================================

-- Add campaign_id to playback_events if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'playback_events' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE public.playback_events
            ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_playback_events_campaign
            ON public.playback_events(campaign_id);
    END IF;
END $$;

-- ============================================================================
-- PART 4: CAMPAIGN RESOLUTION FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Helper: Get active campaign for a screen
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_campaign_for_screen(
    p_screen_id UUID,
    p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    priority INTEGER,
    effective_target TEXT,
    content_type TEXT,
    content_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_screen RECORD;
BEGIN
    -- Get screen details
    SELECT
        d.id,
        d.tenant_id,
        d.screen_group_id,
        d.location_id
    INTO v_screen
    FROM public.tv_devices d
    WHERE d.id = p_screen_id;

    IF v_screen IS NULL THEN
        RETURN;
    END IF;

    -- Find active campaigns targeting this screen
    -- Priority order: direct screen > screen_group > location > all
    -- Then by campaign priority (higher first)
    RETURN QUERY
    WITH matched_campaigns AS (
        SELECT DISTINCT ON (c.id)
            c.id AS campaign_id,
            c.name AS campaign_name,
            c.priority,
            ct.target_type AS effective_target,
            CASE ct.target_type
                WHEN 'screen' THEN 1
                WHEN 'screen_group' THEN 2
                WHEN 'location' THEN 3
                WHEN 'all' THEN 4
            END AS target_specificity
        FROM public.campaigns c
        INNER JOIN public.campaign_targets ct ON ct.campaign_id = c.id
        WHERE c.tenant_id = v_screen.tenant_id
          AND c.status IN ('active', 'scheduled')
          AND (c.start_at IS NULL OR c.start_at <= p_now)
          AND (c.end_at IS NULL OR c.end_at > p_now)
          AND (
              -- Target: specific screen
              (ct.target_type = 'screen' AND ct.target_id = p_screen_id)
              -- Target: screen's group
              OR (ct.target_type = 'screen_group' AND ct.target_id = v_screen.screen_group_id AND v_screen.screen_group_id IS NOT NULL)
              -- Target: screen's location
              OR (ct.target_type = 'location' AND ct.target_id = v_screen.location_id AND v_screen.location_id IS NOT NULL)
              -- Target: all screens
              OR (ct.target_type = 'all')
          )
        ORDER BY c.id, target_specificity ASC
    ),
    best_campaign AS (
        SELECT mc.*
        FROM matched_campaigns mc
        ORDER BY mc.target_specificity ASC, mc.priority DESC
        LIMIT 1
    )
    SELECT
        bc.campaign_id,
        bc.campaign_name,
        bc.priority,
        bc.effective_target,
        cc.content_type,
        cc.content_id
    FROM best_campaign bc
    INNER JOIN public.campaign_contents cc ON cc.campaign_id = bc.campaign_id
    ORDER BY cc.position ASC, cc.weight DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_active_campaign_for_screen IS
'Returns the highest priority active campaign targeting a screen along with its primary content';

-- ----------------------------------------------------------------------------
-- 4.2 Update get_resolved_player_content to include campaigns
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_resolved_player_content(p_screen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device RECORD;
    v_campaign RECORD;
    v_schedule RECORD;
    v_content JSONB;
    v_playlist RECORD;
    v_layout RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Get the device info
    SELECT
        d.*,
        p.business_name as tenant_name
    INTO v_device
    FROM public.tv_devices d
    LEFT JOIN public.profiles p ON p.id = d.tenant_id
    WHERE d.id = p_screen_id;

    IF v_device IS NULL THEN
        RETURN jsonb_build_object('error', 'Screen not found');
    END IF;

    -- ==== STEP 1: Check for active campaign ====
    SELECT * INTO v_campaign
    FROM public.get_active_campaign_for_screen(p_screen_id, v_now);

    IF v_campaign.campaign_id IS NOT NULL THEN
        -- Campaign found - resolve its content
        IF v_campaign.content_type = 'layout' THEN
            -- Get layout details
            SELECT l.*,
                   COALESCE(
                       (SELECT jsonb_agg(
                           jsonb_build_object(
                               'id', z.id,
                               'name', z.name,
                               'zone_key', z.zone_key,
                               'content_type', z.content_type,
                               'content_id', z.content_id,
                               'settings', z.settings
                           ) ORDER BY z.zone_key
                       ) FROM public.layout_zones z WHERE z.layout_id = l.id),
                       '[]'::jsonb
                   ) AS zones
            INTO v_layout
            FROM public.layouts l
            WHERE l.id = v_campaign.content_id;

            IF v_layout IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'source', 'campaign',
                    'campaign', jsonb_build_object(
                        'id', v_campaign.campaign_id,
                        'name', v_campaign.campaign_name,
                        'priority', v_campaign.priority,
                        'target', v_campaign.effective_target
                    ),
                    'type', 'layout',
                    'layout', jsonb_build_object(
                        'id', v_layout.id,
                        'name', v_layout.name,
                        'template', v_layout.template,
                        'settings', v_layout.settings,
                        'zones', v_layout.zones
                    ),
                    'screen', jsonb_build_object(
                        'id', v_device.id,
                        'name', v_device.name,
                        'timezone', v_device.timezone
                    )
                );
            END IF;
        ELSIF v_campaign.content_type = 'playlist' THEN
            -- Get playlist details
            SELECT p.*,
                   COALESCE(
                       (SELECT jsonb_agg(
                           jsonb_build_object(
                               'id', pi.id,
                               'position', pi.position,
                               'duration', pi.duration,
                               'transition', pi.transition,
                               'media', jsonb_build_object(
                                   'id', m.id,
                                   'name', m.name,
                                   'type', m.type,
                                   'url', m.url,
                                   'thumbnail_url', m.thumbnail_url,
                                   'duration', m.duration,
                                   'config', m.config_json
                               )
                           ) ORDER BY pi.position
                       ) FROM public.playlist_items pi
                         LEFT JOIN public.media_assets m ON m.id = pi.item_id
                         WHERE pi.playlist_id = p.id AND pi.item_type = 'media'),
                       '[]'::jsonb
                   ) AS items
            INTO v_playlist
            FROM public.playlists p
            WHERE p.id = v_campaign.content_id;

            IF v_playlist IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'source', 'campaign',
                    'campaign', jsonb_build_object(
                        'id', v_campaign.campaign_id,
                        'name', v_campaign.campaign_name,
                        'priority', v_campaign.priority,
                        'target', v_campaign.effective_target
                    ),
                    'type', 'playlist',
                    'playlist', jsonb_build_object(
                        'id', v_playlist.id,
                        'name', v_playlist.name,
                        'default_duration', v_playlist.default_duration,
                        'loop', v_playlist.loop,
                        'items', v_playlist.items
                    ),
                    'screen', jsonb_build_object(
                        'id', v_device.id,
                        'name', v_device.name,
                        'timezone', v_device.timezone
                    )
                );
            END IF;
        END IF;
    END IF;

    -- ==== STEP 2: Check for active schedule entry ====
    SELECT se.*
    INTO v_schedule
    FROM public.schedule_entries se
    INNER JOIN public.schedules s ON s.id = se.schedule_id
    WHERE s.tenant_id = v_device.tenant_id
      AND s.is_active = true
      AND (
          -- Target: specific screen
          (se.target_type = 'screen' AND se.target_id = p_screen_id)
          -- Target: screen group
          OR (se.target_type = 'screen_group' AND se.target_id = v_device.screen_group_id AND v_device.screen_group_id IS NOT NULL)
          -- Target: all screens
          OR (se.target_type = 'all')
      )
      -- Time matching
      AND (
          se.start_date IS NULL OR se.start_date <= CURRENT_DATE
      )
      AND (
          se.end_date IS NULL OR se.end_date >= CURRENT_DATE
      )
      AND (
          se.days_of_week IS NULL
          OR EXTRACT(DOW FROM v_now)::int = ANY(se.days_of_week)
      )
      AND (
          se.start_time IS NULL OR se.start_time <= v_now::time
      )
      AND (
          se.end_time IS NULL OR se.end_time > v_now::time
      )
    ORDER BY se.priority DESC
    LIMIT 1;

    IF v_schedule IS NOT NULL THEN
        -- Schedule entry found - resolve based on content_type
        IF v_schedule.content_type = 'layout' THEN
            SELECT l.*,
                   COALESCE(
                       (SELECT jsonb_agg(
                           jsonb_build_object(
                               'id', z.id,
                               'name', z.name,
                               'zone_key', z.zone_key,
                               'content_type', z.content_type,
                               'content_id', z.content_id,
                               'settings', z.settings
                           ) ORDER BY z.zone_key
                       ) FROM public.layout_zones z WHERE z.layout_id = l.id),
                       '[]'::jsonb
                   ) AS zones
            INTO v_layout
            FROM public.layouts l
            WHERE l.id = v_schedule.content_id;

            IF v_layout IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'source', 'schedule',
                    'schedule', jsonb_build_object(
                        'id', v_schedule.id,
                        'schedule_id', v_schedule.schedule_id,
                        'priority', v_schedule.priority
                    ),
                    'type', 'layout',
                    'layout', jsonb_build_object(
                        'id', v_layout.id,
                        'name', v_layout.name,
                        'template', v_layout.template,
                        'settings', v_layout.settings,
                        'zones', v_layout.zones
                    ),
                    'screen', jsonb_build_object(
                        'id', v_device.id,
                        'name', v_device.name,
                        'timezone', v_device.timezone
                    )
                );
            END IF;
        ELSIF v_schedule.content_type = 'playlist' THEN
            SELECT p.*,
                   COALESCE(
                       (SELECT jsonb_agg(
                           jsonb_build_object(
                               'id', pi.id,
                               'position', pi.position,
                               'duration', pi.duration,
                               'transition', pi.transition,
                               'media', jsonb_build_object(
                                   'id', m.id,
                                   'name', m.name,
                                   'type', m.type,
                                   'url', m.url,
                                   'thumbnail_url', m.thumbnail_url,
                                   'duration', m.duration,
                                   'config', m.config_json
                               )
                           ) ORDER BY pi.position
                       ) FROM public.playlist_items pi
                         LEFT JOIN public.media_assets m ON m.id = pi.item_id
                         WHERE pi.playlist_id = p.id AND pi.item_type = 'media'),
                       '[]'::jsonb
                   ) AS items
            INTO v_playlist
            FROM public.playlists p
            WHERE p.id = v_schedule.content_id;

            IF v_playlist IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'source', 'schedule',
                    'schedule', jsonb_build_object(
                        'id', v_schedule.id,
                        'schedule_id', v_schedule.schedule_id,
                        'priority', v_schedule.priority
                    ),
                    'type', 'playlist',
                    'playlist', jsonb_build_object(
                        'id', v_playlist.id,
                        'name', v_playlist.name,
                        'default_duration', v_playlist.default_duration,
                        'loop', v_playlist.loop,
                        'items', v_playlist.items
                    ),
                    'screen', jsonb_build_object(
                        'id', v_device.id,
                        'name', v_device.name,
                        'timezone', v_device.timezone
                    )
                );
            END IF;
        END IF;
    END IF;

    -- ==== STEP 3: Fallback to assigned_layout_id ====
    IF v_device.assigned_layout_id IS NOT NULL THEN
        SELECT l.*,
               COALESCE(
                   (SELECT jsonb_agg(
                       jsonb_build_object(
                           'id', z.id,
                           'name', z.name,
                           'zone_key', z.zone_key,
                           'content_type', z.content_type,
                           'content_id', z.content_id,
                           'settings', z.settings
                       ) ORDER BY z.zone_key
                   ) FROM public.layout_zones z WHERE z.layout_id = l.id),
                   '[]'::jsonb
               ) AS zones
        INTO v_layout
        FROM public.layouts l
        WHERE l.id = v_device.assigned_layout_id;

        IF v_layout IS NOT NULL THEN
            RETURN jsonb_build_object(
                'source', 'layout',
                'type', 'layout',
                'layout', jsonb_build_object(
                    'id', v_layout.id,
                    'name', v_layout.name,
                    'template', v_layout.template,
                    'settings', v_layout.settings,
                    'zones', v_layout.zones
                ),
                'screen', jsonb_build_object(
                    'id', v_device.id,
                    'name', v_device.name,
                    'timezone', v_device.timezone
                )
            );
        END IF;
    END IF;

    -- ==== STEP 4: Fallback to assigned_playlist_id ====
    IF v_device.assigned_playlist_id IS NOT NULL THEN
        SELECT p.*,
               COALESCE(
                   (SELECT jsonb_agg(
                       jsonb_build_object(
                           'id', pi.id,
                           'position', pi.position,
                           'duration', pi.duration,
                           'transition', pi.transition,
                           'media', jsonb_build_object(
                               'id', m.id,
                               'name', m.name,
                               'type', m.type,
                               'url', m.url,
                               'thumbnail_url', m.thumbnail_url,
                               'duration', m.duration,
                               'config', m.config_json
                           )
                       ) ORDER BY pi.position
                   ) FROM public.playlist_items pi
                     LEFT JOIN public.media_assets m ON m.id = pi.item_id
                     WHERE pi.playlist_id = p.id AND pi.item_type = 'media'),
                   '[]'::jsonb
               ) AS items
        INTO v_playlist
        FROM public.playlists p
        WHERE p.id = v_device.assigned_playlist_id;

        IF v_playlist IS NOT NULL THEN
            RETURN jsonb_build_object(
                'source', 'playlist',
                'type', 'playlist',
                'playlist', jsonb_build_object(
                    'id', v_playlist.id,
                    'name', v_playlist.name,
                    'default_duration', v_playlist.default_duration,
                    'loop', v_playlist.loop,
                    'items', v_playlist.items
                ),
                'screen', jsonb_build_object(
                    'id', v_device.id,
                    'name', v_device.name,
                    'timezone', v_device.timezone
                )
            );
        END IF;
    END IF;

    -- ==== STEP 5: No content found ====
    RETURN jsonb_build_object(
        'source', 'none',
        'type', 'empty',
        'screen', jsonb_build_object(
            'id', v_device.id,
            'name', v_device.name,
            'timezone', v_device.timezone
        ),
        'message', 'No content assigned to this screen'
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.3 Update get_resolved_player_content_by_otp to include campaigns
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_resolved_player_content_by_otp(p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_screen_id UUID;
BEGIN
    -- Look up screen by OTP
    SELECT id INTO v_screen_id
    FROM public.tv_devices
    WHERE otp_code = p_otp
      AND otp_expires_at > now();

    IF v_screen_id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Invalid or expired pairing code'
        );
    END IF;

    -- Use the main resolution function
    RETURN public.get_resolved_player_content(v_screen_id);
END;
$$;

-- ============================================================================
-- PART 5: HELPER VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 View for screen groups with screen counts
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_screen_groups_with_counts AS
SELECT
    sg.*,
    l.name AS location_name,
    COUNT(d.id) AS screen_count,
    COUNT(d.id) FILTER (WHERE d.is_online = true) AS online_count
FROM public.screen_groups sg
LEFT JOIN public.locations l ON l.id = sg.location_id
LEFT JOIN public.tv_devices d ON d.screen_group_id = sg.id
GROUP BY sg.id, l.name;

GRANT SELECT ON public.v_screen_groups_with_counts TO authenticated;

-- ----------------------------------------------------------------------------
-- 5.2 View for campaigns with target and content counts
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_campaigns_with_stats AS
SELECT
    c.*,
    p.business_name AS created_by_name,
    COUNT(DISTINCT ct.id) AS target_count,
    COUNT(DISTINCT cc.id) AS content_count,
    COALESCE(
        (SELECT jsonb_agg(DISTINCT ct2.target_type) FROM public.campaign_targets ct2 WHERE ct2.campaign_id = c.id),
        '[]'::jsonb
    ) AS target_types
FROM public.campaigns c
LEFT JOIN public.profiles p ON p.id = c.created_by
LEFT JOIN public.campaign_targets ct ON ct.campaign_id = c.id
LEFT JOIN public.campaign_contents cc ON cc.campaign_id = c.id
GROUP BY c.id, p.business_name;

GRANT SELECT ON public.v_campaigns_with_stats TO authenticated;

-- ----------------------------------------------------------------------------
-- 5.3 Function to auto-update campaign statuses
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_campaign_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark scheduled campaigns as active when start_at passes
    UPDATE public.campaigns
    SET status = 'active', updated_at = now()
    WHERE status = 'scheduled'
      AND start_at IS NOT NULL
      AND start_at <= now();

    -- Mark active campaigns as completed when end_at passes
    UPDATE public.campaigns
    SET status = 'completed', updated_at = now()
    WHERE status = 'active'
      AND end_at IS NOT NULL
      AND end_at <= now();
END;
$$;

COMMENT ON FUNCTION public.update_campaign_statuses IS
'Call periodically (e.g., via cron) to transition campaign statuses based on dates';

-- ============================================================================
-- PART 6: ANALYTICS HELPERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Get campaign playback stats
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_campaign_playback_stats(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name TEXT,
    campaign_status TEXT,
    total_playback_seconds BIGINT,
    unique_screens BIGINT,
    unique_locations BIGINT,
    play_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS campaign_id,
        c.name AS campaign_name,
        c.status AS campaign_status,
        COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_playback_seconds,
        COUNT(DISTINCT pe.screen_id)::BIGINT AS unique_screens,
        COUNT(DISTINCT d.location_id)::BIGINT AS unique_locations,
        COUNT(pe.id)::BIGINT AS play_count
    FROM public.campaigns c
    LEFT JOIN public.playback_events pe ON pe.campaign_id = c.id
        AND pe.started_at::date BETWEEN p_start_date AND p_end_date
    LEFT JOIN public.tv_devices d ON d.id = pe.screen_id
    WHERE c.tenant_id = p_tenant_id
    GROUP BY c.id, c.name, c.status
    ORDER BY total_playback_seconds DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_playback_stats TO authenticated;

-- ============================================================================
-- PART 7: GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_contents TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON FUNCTION public.get_resolved_player_content IS
'Resolves content for a screen with priority: Campaign > Schedule > Layout > Playlist';
