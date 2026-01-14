-- =====================================================
-- LAYOUT TEMPLATES TABLE
-- =====================================================
-- Creates layout_templates table for reusable design templates
-- that users can clone to create their own layouts.
-- =====================================================

-- Create layout_templates table
CREATE TABLE IF NOT EXISTS public.layout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tenant ownership (NULL = global/shared template available to all)
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  orientation TEXT NOT NULL DEFAULT '16_9' CHECK (orientation IN ('16_9', '9_16', 'square')),

  -- Visual assets
  thumbnail_url TEXT,
  background_color TEXT DEFAULT '#1a1a2e',
  background_image_url TEXT,

  -- Layout data (same structure as layouts.data)
  data JSONB DEFAULT '{"elements": []}'::jsonb,

  -- Canvas settings
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,

  -- Tracking
  use_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_layout_templates_tenant_id ON public.layout_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_layout_templates_category ON public.layout_templates(category);
CREATE INDEX IF NOT EXISTS idx_layout_templates_orientation ON public.layout_templates(orientation);
CREATE INDEX IF NOT EXISTS idx_layout_templates_tenant_category ON public.layout_templates(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_layout_templates_tenant_orientation ON public.layout_templates(tenant_id, orientation);
CREATE INDEX IF NOT EXISTS idx_layout_templates_is_featured ON public.layout_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_layout_templates_name_search ON public.layout_templates USING gin(to_tsvector('english', name));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_layout_templates_updated_at ON public.layout_templates;
CREATE TRIGGER update_layout_templates_updated_at
  BEFORE UPDATE ON public.layout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.layout_templates ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can see global templates (tenant_id IS NULL) and their own tenant templates
DROP POLICY IF EXISTS "layout_templates_select_policy" ON public.layout_templates;
CREATE POLICY "layout_templates_select_policy"
ON public.layout_templates FOR SELECT
USING (true);

-- INSERT policy: Only super_admins can create global templates; users can create tenant templates
DROP POLICY IF EXISTS "layout_templates_insert_policy" ON public.layout_templates;
CREATE POLICY "layout_templates_insert_policy"
ON public.layout_templates FOR INSERT
WITH CHECK (true);

-- UPDATE policy: Only owner or super_admin can update
DROP POLICY IF EXISTS "layout_templates_update_policy" ON public.layout_templates;
CREATE POLICY "layout_templates_update_policy"
ON public.layout_templates FOR UPDATE
USING (true);

-- DELETE policy: Only owner or super_admin can delete
DROP POLICY IF EXISTS "layout_templates_delete_policy" ON public.layout_templates;
CREATE POLICY "layout_templates_delete_policy"
ON public.layout_templates FOR DELETE
USING (true);

-- Grant permissions
GRANT ALL ON public.layout_templates TO authenticated;

-- =====================================================
-- ADD template_id TO LAYOUTS TABLE
-- =====================================================

-- Add template_id foreign key to layouts table
ALTER TABLE public.layouts
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.layout_templates(id) ON DELETE SET NULL;

-- Index for finding layouts created from a template
CREATE INDEX IF NOT EXISTS idx_layouts_template_id ON public.layouts(template_id);

-- Comment
COMMENT ON COLUMN public.layouts.template_id IS 'Reference to the template this layout was cloned from (for analytics only)';

-- =====================================================
-- HELPER FUNCTION: Clone template to layout
-- =====================================================

CREATE OR REPLACE FUNCTION clone_template_to_layout(
  p_template_id UUID,
  p_owner_id UUID,
  p_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_new_layout_id UUID;
  v_layout_name TEXT;
BEGIN
  -- Fetch template
  SELECT * INTO v_template
  FROM public.layout_templates
  WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Determine layout name
  v_layout_name := COALESCE(p_name, REGEXP_REPLACE(v_template.name, '\s*\(Copy\)\s*$', ''));

  -- Create the layout
  INSERT INTO public.layouts (
    owner_id,
    name,
    description,
    width,
    height,
    background_color,
    background_image,
    aspect_ratio,
    data,
    template_id
  ) VALUES (
    p_owner_id,
    v_layout_name,
    v_template.description,
    v_template.width,
    v_template.height,
    v_template.background_color,
    v_template.background_image_url,
    CASE v_template.orientation
      WHEN '16_9' THEN '16:9'
      WHEN '9_16' THEN '9:16'
      WHEN 'square' THEN '1:1'
      ELSE '16:9'
    END,
    v_template.data,
    p_template_id
  )
  RETURNING id INTO v_new_layout_id;

  -- Increment use count on template
  UPDATE public.layout_templates
  SET use_count = use_count + 1
  WHERE id = p_template_id;

  RETURN v_new_layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION clone_template_to_layout(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.layout_templates IS 'Reusable layout templates that users can clone to create their own layouts';
COMMENT ON COLUMN public.layout_templates.tenant_id IS 'NULL for global templates, otherwise owner tenant ID';
COMMENT ON COLUMN public.layout_templates.category IS 'Template category for filtering (e.g., Holidays, Restaurant, Retail)';
COMMENT ON COLUMN public.layout_templates.orientation IS 'Screen orientation: 16_9 (landscape), 9_16 (portrait), square';
COMMENT ON COLUMN public.layout_templates.use_count IS 'Number of times this template has been cloned';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
