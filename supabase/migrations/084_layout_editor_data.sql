-- =====================================================
-- LAYOUT EDITOR DATA COLUMN MIGRATION
-- =====================================================
-- Adds a JSONB column to layouts for storing Yodeck-style
-- layout editor elements (text, images, widgets, shapes).
-- =====================================================

-- Add data column for storing layout elements as JSON
ALTER TABLE public.layouts
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{"elements": []}'::jsonb;

-- Add aspect_ratio column (default 16:9)
ALTER TABLE public.layouts
ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9';

-- Index for querying layouts by element types
CREATE INDEX IF NOT EXISTS idx_layouts_data_gin ON public.layouts USING GIN (data);

-- Comment on new columns
COMMENT ON COLUMN public.layouts.data IS 'JSONB storage for layout editor elements (text, images, widgets, shapes)';
COMMENT ON COLUMN public.layouts.aspect_ratio IS 'Layout aspect ratio (16:9, 4:3, 9:16, etc.)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
