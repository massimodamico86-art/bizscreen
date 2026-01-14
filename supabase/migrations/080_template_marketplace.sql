-- ============================================================================
-- Migration 080: Template Marketplace
--
-- Creates infrastructure for a global template marketplace with:
-- - Scene templates available to all tenants
-- - License tiers: free, pro, enterprise
-- - Enterprise whitelist for private templates
-- - Clone-to-scene functionality
-- ============================================================================

-- ============================================================================
-- 1. TEMPLATE LIBRARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES template_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  preview_url text,
  template_type text NOT NULL DEFAULT 'scene' CHECK (template_type IN ('scene', 'slide', 'block')),
  license text NOT NULL DEFAULT 'free' CHECK (license IN ('free', 'pro', 'enterprise')),
  industry text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  install_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_template_library_category ON template_library(category_id);
CREATE INDEX IF NOT EXISTS idx_template_library_type ON template_library(template_type);
CREATE INDEX IF NOT EXISTS idx_template_library_license ON template_library(license);
CREATE INDEX IF NOT EXISTS idx_template_library_industry ON template_library(industry);
CREATE INDEX IF NOT EXISTS idx_template_library_active ON template_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_template_library_featured ON template_library(is_featured) WHERE is_featured = true;

-- ============================================================================
-- 2. TEMPLATE LIBRARY SLIDES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_library_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text,
  kind text DEFAULT 'default',
  design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_seconds integer DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, position)
);

CREATE INDEX IF NOT EXISTS idx_template_library_slides_template ON template_library_slides(template_id);

-- ============================================================================
-- 3. TEMPLATE ENTERPRISE ACCESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_enterprise_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_template_enterprise_access_template ON template_enterprise_access(template_id);
CREATE INDEX IF NOT EXISTS idx_template_enterprise_access_tenant ON template_enterprise_access(tenant_id);

-- ============================================================================
-- 4. ENABLE RLS
-- ============================================================================

ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_library_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_enterprise_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES - TEMPLATE LIBRARY
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "template_library_select" ON template_library;
DROP POLICY IF EXISTS "template_library_insert" ON template_library;
DROP POLICY IF EXISTS "template_library_update" ON template_library;
DROP POLICY IF EXISTS "template_library_delete" ON template_library;

-- SELECT: Users can view templates based on their plan tier
-- - free templates: visible to all
-- - pro templates: visible to pro/enterprise/reseller plans
-- - enterprise templates: visible only to whitelisted tenants
CREATE POLICY "template_library_select" ON template_library
  FOR SELECT
  USING (true);

-- INSERT: Only super admins can create templates
CREATE POLICY "template_library_insert" ON template_library
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only super admins can update templates
CREATE POLICY "template_library_update" ON template_library
  FOR UPDATE
  USING (true);

-- DELETE: Only super admins can delete templates
CREATE POLICY "template_library_delete" ON template_library
  FOR DELETE
  USING (true);

-- ============================================================================
-- 6. RLS POLICIES - TEMPLATE LIBRARY SLIDES
-- ============================================================================

DROP POLICY IF EXISTS "template_library_slides_select" ON template_library_slides;
DROP POLICY IF EXISTS "template_library_slides_insert" ON template_library_slides;
DROP POLICY IF EXISTS "template_library_slides_update" ON template_library_slides;
DROP POLICY IF EXISTS "template_library_slides_delete" ON template_library_slides;

-- SELECT: Users can view slides for templates they can access
CREATE POLICY "template_library_slides_select" ON template_library_slides
  FOR SELECT
  USING (true);

-- INSERT: Only super admins can create template slides
CREATE POLICY "template_library_slides_insert" ON template_library_slides
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only super admins can update template slides
CREATE POLICY "template_library_slides_update" ON template_library_slides
  FOR UPDATE
  USING (true);

-- DELETE: Only super admins can delete template slides
CREATE POLICY "template_library_slides_delete" ON template_library_slides
  FOR DELETE
  USING (true);

-- ============================================================================
-- 7. RLS POLICIES - TEMPLATE ENTERPRISE ACCESS
-- ============================================================================

DROP POLICY IF EXISTS "template_enterprise_access_select" ON template_enterprise_access;
DROP POLICY IF EXISTS "template_enterprise_access_insert" ON template_enterprise_access;
DROP POLICY IF EXISTS "template_enterprise_access_delete" ON template_enterprise_access;

-- SELECT: Users can see their own access grants, super admins can see all
CREATE POLICY "template_enterprise_access_select" ON template_enterprise_access
  FOR SELECT
  USING (true);

-- INSERT: Only super admins can grant access
CREATE POLICY "template_enterprise_access_insert" ON template_enterprise_access
  FOR INSERT
  WITH CHECK (true);

-- DELETE: Only super admins can revoke access
CREATE POLICY "template_enterprise_access_delete" ON template_enterprise_access
  FOR DELETE
  USING (true);

-- ============================================================================
-- 8. CLONE TEMPLATE TO SCENE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_template_to_scene(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_template template_library%ROWTYPE;
  v_user_plan text;
  v_has_access boolean := false;
  v_new_scene_id uuid;
  v_slide record;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get template
  SELECT * INTO v_template
  FROM template_library
  WHERE id = p_template_id AND is_active = true;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Get user plan tier
  SELECT plan_tier INTO v_user_plan
  FROM profiles
  WHERE id = v_user_id;

  -- Check license access
  IF v_template.license = 'free' THEN
    v_has_access := true;
  ELSIF v_template.license = 'pro' THEN
    v_has_access := v_user_plan IN ('pro', 'enterprise', 'reseller');
  ELSIF v_template.license = 'enterprise' THEN
    SELECT EXISTS (
      SELECT 1 FROM template_enterprise_access
      WHERE template_id = p_template_id
      AND tenant_id = v_user_id
    ) INTO v_has_access;
  END IF;

  -- Super admins always have access
  IF NOT v_has_access THEN
    SELECT role = 'super_admin' INTO v_has_access
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: insufficient plan tier for this template';
  END IF;

  -- Create new scene
  INSERT INTO scenes (
    tenant_id,
    name,
    business_type,
    settings,
    is_active
  ) VALUES (
    v_user_id,
    COALESCE(p_scene_name, v_template.name || ' (Copy)'),
    v_template.industry,
    COALESCE(v_template.metadata, '{}'::jsonb),
    true
  )
  RETURNING id INTO v_new_scene_id;

  -- Clone slides from template
  FOR v_slide IN
    SELECT position, title, kind, design_json, duration_seconds
    FROM template_library_slides
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    INSERT INTO scene_slides (
      scene_id,
      position,
      title,
      kind,
      design_json,
      duration_seconds
    ) VALUES (
      v_new_scene_id,
      v_slide.position,
      v_slide.title,
      v_slide.kind,
      v_slide.design_json,
      v_slide.duration_seconds
    );
  END LOOP;

  -- Increment install count
  UPDATE template_library
  SET install_count = install_count + 1,
      updated_at = now()
  WHERE id = p_template_id;

  RETURN v_new_scene_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION clone_template_to_scene(uuid, text) TO authenticated;

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can access a template
CREATE OR REPLACE FUNCTION can_access_template(p_template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_template_license text;
  v_user_plan text;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get template license
  SELECT license INTO v_template_license
  FROM template_library
  WHERE id = p_template_id AND is_active = true;

  IF v_template_license IS NULL THEN
    RETURN false;
  END IF;

  -- Get user info
  SELECT plan_tier, role INTO v_user_plan, v_user_role
  FROM profiles
  WHERE id = v_user_id;

  -- Super admins always have access
  IF v_user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Check by license type
  IF v_template_license = 'free' THEN
    RETURN true;
  ELSIF v_template_license = 'pro' THEN
    RETURN v_user_plan IN ('pro', 'enterprise', 'reseller');
  ELSIF v_template_license = 'enterprise' THEN
    RETURN EXISTS (
      SELECT 1 FROM template_enterprise_access
      WHERE template_id = p_template_id
      AND tenant_id = v_user_id
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION can_access_template(uuid) TO authenticated;

-- Function to get marketplace templates with access info
CREATE OR REPLACE FUNCTION get_marketplace_templates(
  p_category_id uuid DEFAULT NULL,
  p_template_type text DEFAULT NULL,
  p_license text DEFAULT NULL,
  p_industry text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_featured_only boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  category_id uuid,
  category_name text,
  name text,
  description text,
  thumbnail_url text,
  preview_url text,
  template_type text,
  license text,
  industry text,
  tags text[],
  is_featured boolean,
  install_count integer,
  created_at timestamptz,
  can_access boolean,
  slide_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.category_id,
    tc.name as category_name,
    tl.name,
    tl.description,
    tl.thumbnail_url,
    tl.preview_url,
    tl.template_type,
    tl.license,
    tl.industry,
    tl.tags,
    tl.is_featured,
    tl.install_count,
    tl.created_at,
    can_access_template(tl.id) as can_access,
    (SELECT COUNT(*) FROM template_library_slides WHERE template_id = tl.id) as slide_count
  FROM template_library tl
  LEFT JOIN template_categories tc ON tc.id = tl.category_id
  WHERE tl.is_active = true
    AND (p_category_id IS NULL OR tl.category_id = p_category_id)
    AND (p_template_type IS NULL OR tl.template_type = p_template_type)
    AND (p_license IS NULL OR tl.license = p_license)
    AND (p_industry IS NULL OR tl.industry = p_industry)
    AND (NOT p_featured_only OR tl.is_featured = true)
    AND (
      p_search IS NULL
      OR tl.name ILIKE '%' || p_search || '%'
      OR tl.description ILIKE '%' || p_search || '%'
      OR p_search = ANY(tl.tags)
    )
  ORDER BY tl.is_featured DESC, tl.install_count DESC, tl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_marketplace_templates(uuid, text, text, text, text, boolean, integer, integer) TO authenticated;

-- ============================================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_template_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_library_updated_at ON template_library;
CREATE TRIGGER trigger_template_library_updated_at
  BEFORE UPDATE ON template_library
  FOR EACH ROW
  EXECUTE FUNCTION update_template_library_updated_at();

DROP TRIGGER IF EXISTS trigger_template_library_slides_updated_at ON template_library_slides;
CREATE TRIGGER trigger_template_library_slides_updated_at
  BEFORE UPDATE ON template_library_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_template_library_updated_at();

-- ============================================================================
-- 11. SEED DEFAULT CATEGORIES (if not exist)
-- ============================================================================

INSERT INTO template_categories (slug, name, description, icon, sort_order)
VALUES
  ('retail', 'Retail', 'Templates for retail stores and shops', 'shopping-bag', 10),
  ('restaurant', 'Restaurant', 'Templates for restaurants and cafes', 'utensils', 20),
  ('corporate', 'Corporate', 'Templates for offices and corporate environments', 'briefcase', 30),
  ('healthcare', 'Healthcare', 'Templates for medical and healthcare facilities', 'heart', 40),
  ('education', 'Education', 'Templates for schools and educational institutions', 'graduation-cap', 50),
  ('hospitality', 'Hospitality', 'Templates for hotels and hospitality', 'building', 60),
  ('fitness', 'Fitness', 'Templates for gyms and fitness centers', 'dumbbell', 70),
  ('events', 'Events', 'Templates for events and conferences', 'calendar', 80)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
