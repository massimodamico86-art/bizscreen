-- ============================================================================
-- Migration: SVG Templates
-- Description: Create tables for SVG template management
-- ============================================================================

-- SVG Templates table for storing template metadata
CREATE TABLE IF NOT EXISTS svg_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,  -- NULL = global template (no FK constraint as tenants table may not exist)
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait', 'square')),
    thumbnail TEXT,  -- URL to thumbnail image
    svg_url TEXT NOT NULL,  -- URL to SVG file
    svg_content TEXT,  -- Optional: store SVG content directly
    width INTEGER NOT NULL DEFAULT 1920,
    height INTEGER NOT NULL DEFAULT 1080,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    use_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for svg_templates
CREATE INDEX IF NOT EXISTS idx_svg_templates_tenant_id ON svg_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_svg_templates_category ON svg_templates(category);
CREATE INDEX IF NOT EXISTS idx_svg_templates_orientation ON svg_templates(orientation);
CREATE INDEX IF NOT EXISTS idx_svg_templates_is_active ON svg_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_svg_templates_is_featured ON svg_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_svg_templates_tags ON svg_templates USING GIN(tags);

-- Enable RLS
ALTER TABLE svg_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for svg_templates
-- Anyone can read active global templates
CREATE POLICY "Anyone can read active global svg templates"
    ON svg_templates FOR SELECT
    USING (is_active = TRUE AND tenant_id IS NULL);

-- Authenticated users can read all active templates
CREATE POLICY "Authenticated users can read svg templates"
    ON svg_templates FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- Authenticated users can insert their own templates
CREATE POLICY "Authenticated users can create svg templates"
    ON svg_templates FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own svg templates"
    ON svg_templates FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own svg templates"
    ON svg_templates FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_svg_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS svg_templates_updated_at ON svg_templates;
CREATE TRIGGER svg_templates_updated_at
    BEFORE UPDATE ON svg_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_svg_templates_updated_at();

-- Function to increment template use count
CREATE OR REPLACE FUNCTION increment_svg_template_use_count(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE svg_templates
    SET use_count = use_count + 1
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample templates
INSERT INTO svg_templates (name, description, category, orientation, thumbnail, svg_url, width, height, tags, is_featured)
VALUES
    (
        'Restaurant Menu',
        'Elegant restaurant menu template with sections for starters, mains, desserts and drinks',
        'Restaurant',
        'landscape',
        '/templates/svg/restaurant-menu/thumbnail.png',
        '/templates/svg/restaurant-menu/menu-design.svg',
        1920,
        1080,
        ARRAY['menu', 'restaurant', 'food', 'dining'],
        TRUE
    )
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE svg_templates IS 'Stores SVG template metadata for the design editor';
