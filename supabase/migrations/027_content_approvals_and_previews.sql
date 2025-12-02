-- Migration: Content Review & Approval System with Shareable Preview Links
-- Phase 15: Approval workflows and public preview functionality

-- ============================================
-- 1. ADD APPROVAL METADATA TO CONTENT TABLES
-- ============================================

-- Add approval columns to playlists
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'in_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- Add approval columns to layouts
ALTER TABLE layouts
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'in_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- Add approval columns to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'in_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_comment TEXT;

-- Create indexes for approval queries
CREATE INDEX IF NOT EXISTS idx_playlists_approval_status ON playlists(owner_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_layouts_approval_status ON layouts(owner_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_approval_status ON campaigns(tenant_id, approval_status);

-- ============================================
-- 2. REVIEW REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('playlist', 'layout', 'campaign')),
  resource_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  title TEXT,
  message TEXT,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for review_requests
CREATE INDEX IF NOT EXISTS idx_review_requests_tenant_resource
  ON review_requests(tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_tenant_status
  ON review_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_review_requests_requested_by
  ON review_requests(requested_by, status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_review_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_requests_updated_at ON review_requests;
CREATE TRIGGER trg_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_review_requests_updated_at();

-- RLS for review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review requests for their tenant"
  ON review_requests FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Users can create review requests for their tenant"
  ON review_requests FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Users can update review requests for their tenant"
  ON review_requests FOR UPDATE
  USING (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Users can delete review requests for their tenant"
  ON review_requests FOR DELETE
  USING (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ============================================
-- 3. REVIEW COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  is_external BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for review_comments
CREATE INDEX IF NOT EXISTS idx_review_comments_review
  ON review_comments(review_id, created_at);

-- RLS for review_comments
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Internal users can view comments on reviews they have access to
CREATE POLICY "review_comments_select_policy"
  ON review_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM review_requests rr
      WHERE rr.id = review_comments.review_id
      AND (
        rr.tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND rr.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
      )
    )
  );

CREATE POLICY "review_comments_insert_policy"
  ON review_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_requests rr
      WHERE rr.id = review_comments.review_id
      AND (
        rr.tenant_id = auth.uid()
        OR is_super_admin()
        OR (is_admin() AND rr.tenant_id IN (SELECT client_id FROM get_my_client_ids()))
      )
    )
  );

-- ============================================
-- 4. PREVIEW LINKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS preview_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('playlist', 'layout', 'campaign')),
  resource_id UUID NOT NULL,
  review_id UUID REFERENCES review_requests(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  allow_comments BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ
);

-- Indexes for preview_links
CREATE INDEX IF NOT EXISTS idx_preview_links_tenant_resource
  ON preview_links(tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_preview_links_token
  ON preview_links(token);
CREATE INDEX IF NOT EXISTS idx_preview_links_review
  ON preview_links(review_id);

-- RLS for preview_links
ALTER TABLE preview_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view preview links for their tenant"
  ON preview_links FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Users can create preview links for their tenant"
  ON preview_links FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Users can delete preview links for their tenant"
  ON preview_links FOR DELETE
  USING (
    tenant_id = auth.uid() OR
    tenant_id IN (SELECT id FROM profiles WHERE managed_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ============================================
-- 5. SECURITY DEFINER FUNCTIONS FOR PUBLIC PREVIEW
-- ============================================

-- Function to validate and get preview resource info (bypasses RLS)
CREATE OR REPLACE FUNCTION get_preview_resource(p_token TEXT)
RETURNS TABLE (
  tenant_id UUID,
  resource_type TEXT,
  resource_id UUID,
  allow_comments BOOLEAN,
  review_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Update last_accessed_at
  UPDATE preview_links
  SET last_accessed_at = now()
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());

  RETURN QUERY
  SELECT
    pl.tenant_id,
    pl.resource_type,
    pl.resource_id,
    pl.allow_comments,
    pl.review_id
  FROM preview_links pl
  WHERE pl.token = p_token
    AND (pl.expires_at IS NULL OR pl.expires_at > now());
END;
$$;

-- Function to get preview content (returns full content based on resource type)
CREATE OR REPLACE FUNCTION get_preview_content(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_resource RECORD;
  v_result JSONB;
BEGIN
  -- Get resource info
  SELECT * INTO v_resource
  FROM get_preview_resource(p_token) LIMIT 1;

  IF v_resource IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired preview link');
  END IF;

  -- Build content based on resource type
  CASE v_resource.resource_type
    WHEN 'playlist' THEN
      SELECT jsonb_build_object(
        'type', 'playlist',
        'allow_comments', v_resource.allow_comments,
        'review_id', v_resource.review_id,
        'playlist', jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'shuffle', p.shuffle,
          'loop', p.loop,
          'default_duration', p.default_duration,
          'approval_status', p.approval_status
        ),
        'items', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ma.id,
              'name', ma.name,
              'url', ma.url,
              'thumbnail_url', ma.thumbnail_url,
              'mediaType', ma.type,
              'duration', COALESCE(pi.duration, p.default_duration, 10),
              'config', ma.config_json,
              'position', pi.position
            ) ORDER BY pi.position
          )
          FROM playlist_items pi
          JOIN media_assets ma ON ma.id = pi.media_id
          WHERE pi.playlist_id = p.id
        ), '[]'::jsonb)
      ) INTO v_result
      FROM playlists p
      WHERE p.id = v_resource.resource_id;

    WHEN 'layout' THEN
      SELECT jsonb_build_object(
        'type', 'layout',
        'allow_comments', v_resource.allow_comments,
        'review_id', v_resource.review_id,
        'layout', jsonb_build_object(
          'id', l.id,
          'name', l.name,
          'description', l.description,
          'width', l.width,
          'height', l.height,
          'background_color', l.background_color,
          'approval_status', l.approval_status
        ),
        'zones', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', lz.id,
              'zone_name', lz.zone_name,
              'x_percent', lz.x_percent,
              'y_percent', lz.y_percent,
              'width_percent', lz.width_percent,
              'height_percent', lz.height_percent,
              'z_index', lz.z_index,
              'content', CASE
                WHEN lz.assigned_playlist_id IS NOT NULL THEN
                  jsonb_build_object(
                    'type', 'playlist',
                    'playlist', (
                      SELECT jsonb_build_object(
                        'id', pl.id,
                        'name', pl.name,
                        'default_duration', pl.default_duration
                      )
                      FROM playlists pl WHERE pl.id = lz.assigned_playlist_id
                    ),
                    'items', COALESCE((
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', ma.id,
                          'name', ma.name,
                          'url', ma.url,
                          'mediaType', ma.type,
                          'duration', COALESCE(pi.duration, 10),
                          'config', ma.config_json
                        ) ORDER BY pi.position
                      )
                      FROM playlist_items pi
                      JOIN media_assets ma ON ma.id = pi.media_id
                      WHERE pi.playlist_id = lz.assigned_playlist_id
                    ), '[]'::jsonb)
                  )
                WHEN lz.assigned_media_id IS NOT NULL THEN
                  jsonb_build_object(
                    'type', 'media',
                    'item', (
                      SELECT jsonb_build_object(
                        'id', ma.id,
                        'name', ma.name,
                        'url', ma.url,
                        'mediaType', ma.type,
                        'config', ma.config_json
                      )
                      FROM media_assets ma WHERE ma.id = lz.assigned_media_id
                    )
                  )
                ELSE NULL
              END
            ) ORDER BY lz.z_index
          )
          FROM layout_zones lz
          WHERE lz.layout_id = l.id
        ), '[]'::jsonb)
      ) INTO v_result
      FROM layouts l
      WHERE l.id = v_resource.resource_id;

    WHEN 'campaign' THEN
      SELECT jsonb_build_object(
        'type', 'campaign',
        'allow_comments', v_resource.allow_comments,
        'review_id', v_resource.review_id,
        'campaign', jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', c.description,
          'start_at', c.start_at,
          'end_at', c.end_at,
          'priority', c.priority,
          'status', c.status,
          'approval_status', c.approval_status
        ),
        'contents', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', cc.id,
              'content_type', cc.content_type,
              'content_id', cc.content_id,
              'position', cc.position,
              'content_name', CASE cc.content_type
                WHEN 'playlist' THEN (SELECT name FROM playlists WHERE id = cc.content_id)
                WHEN 'layout' THEN (SELECT name FROM layouts WHERE id = cc.content_id)
                ELSE NULL
              END
            ) ORDER BY cc.position
          )
          FROM campaign_contents cc
          WHERE cc.campaign_id = c.id
        ), '[]'::jsonb),
        'targets', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ct.id,
              'target_type', ct.target_type,
              'target_id', ct.target_id,
              'target_name', CASE ct.target_type
                WHEN 'screen' THEN (SELECT device_name FROM tv_devices WHERE id = ct.target_id)
                WHEN 'screen_group' THEN (SELECT name FROM screen_groups WHERE id = ct.target_id)
                WHEN 'location' THEN (SELECT name FROM locations WHERE id = ct.target_id)
                ELSE 'All Screens'
              END
            )
          )
          FROM campaign_targets ct
          WHERE ct.campaign_id = c.id
        ), '[]'::jsonb)
      ) INTO v_result
      FROM campaigns c
      WHERE c.id = v_resource.resource_id;

    ELSE
      v_result := jsonb_build_object('error', 'Unknown resource type');
  END CASE;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Resource not found');
  END IF;

  RETURN v_result;
END;
$$;

-- Function to add external comment via preview link
CREATE OR REPLACE FUNCTION add_preview_comment(
  p_token TEXT,
  p_message TEXT,
  p_author_name TEXT DEFAULT 'Anonymous'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_resource RECORD;
  v_comment_id UUID;
BEGIN
  -- Get resource info
  SELECT * INTO v_resource
  FROM get_preview_resource(p_token) LIMIT 1;

  IF v_resource IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired preview link');
  END IF;

  IF NOT v_resource.allow_comments THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comments not allowed on this preview');
  END IF;

  IF v_resource.review_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No associated review for comments');
  END IF;

  -- Insert comment
  INSERT INTO review_comments (review_id, author_name, is_external, message)
  VALUES (v_resource.review_id, COALESCE(p_author_name, 'Anonymous'), true, p_message)
  RETURNING id INTO v_comment_id;

  RETURN jsonb_build_object(
    'success', true,
    'comment_id', v_comment_id
  );
END;
$$;

-- Function to get comments for a preview (for external viewers)
CREATE OR REPLACE FUNCTION get_preview_comments(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_resource RECORD;
BEGIN
  -- Get resource info
  SELECT * INTO v_resource
  FROM get_preview_resource(p_token) LIMIT 1;

  IF v_resource IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired preview link');
  END IF;

  IF v_resource.review_id IS NULL THEN
    RETURN jsonb_build_object('comments', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'comments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', rc.id,
          'author_name', COALESCE(
            CASE WHEN rc.is_external THEN rc.author_name
            ELSE (SELECT full_name FROM profiles WHERE id = rc.author_id)
            END,
            'Unknown'
          ),
          'is_external', rc.is_external,
          'message', rc.message,
          'created_at', rc.created_at
        ) ORDER BY rc.created_at ASC
      )
      FROM review_comments rc
      WHERE rc.review_id = v_resource.review_id
    ), '[]'::jsonb)
  );
END;
$$;

-- ============================================
-- 6. HELPER VIEWS
-- ============================================

-- View for review requests with resource names
CREATE OR REPLACE VIEW v_review_requests_with_details AS
SELECT
  rr.*,
  CASE rr.resource_type
    WHEN 'playlist' THEN (SELECT name FROM playlists WHERE id = rr.resource_id)
    WHEN 'layout' THEN (SELECT name FROM layouts WHERE id = rr.resource_id)
    WHEN 'campaign' THEN (SELECT name FROM campaigns WHERE id = rr.resource_id)
  END AS resource_name,
  (SELECT full_name FROM profiles WHERE id = rr.requested_by) AS requested_by_name,
  (SELECT full_name FROM profiles WHERE id = rr.decided_by) AS decided_by_name,
  (SELECT COUNT(*) FROM review_comments WHERE review_id = rr.id) AS comment_count
FROM review_requests rr;

-- Grant select on view
GRANT SELECT ON v_review_requests_with_details TO authenticated;

-- ============================================
-- 7. GENERATE SECURE TOKENS
-- ============================================

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_preview_token()
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a URL-safe random token (32 chars)
    v_token := encode(gen_random_bytes(24), 'base64');
    -- Make URL-safe
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM preview_links WHERE token = v_token) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_token;
END;
$$;
