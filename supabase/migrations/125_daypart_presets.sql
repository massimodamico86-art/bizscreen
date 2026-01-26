-- Migration: 125_daypart_presets
-- Purpose: Create daypart_presets table for quick time block scheduling
-- Phase: 15-03 (Scheduling Campaigns - Dayparting Presets)

-- =====================================================
-- DAYPART PRESETS TABLE
-- =====================================================
-- Daypart presets allow users to quickly apply common time blocks
-- (e.g., Breakfast 6-10am, Lunch 11am-2pm) to schedule entries.
--
-- preset_type values:
--   'meal'   - Time blocks based on meal times (Breakfast, Lunch, Dinner)
--   'period' - 6-hour time periods (Morning, Afternoon, Evening, Night)
--   'custom' - User-created presets specific to their business
--
-- is_system flag:
--   true  - System-provided presets (cannot be edited/deleted by users)
--   false - User-created custom presets

CREATE TABLE IF NOT EXISTS daypart_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  preset_type TEXT NOT NULL CHECK (preset_type IN ('meal', 'period', 'custom')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comment on table and columns
COMMENT ON TABLE daypart_presets IS 'Presets for common time blocks used in schedule entries';
COMMENT ON COLUMN daypart_presets.tenant_id IS 'NULL for system presets, user ID for custom presets';
COMMENT ON COLUMN daypart_presets.preset_type IS 'Category: meal (breakfast/lunch/dinner), period (6hr blocks), or custom';
COMMENT ON COLUMN daypart_presets.is_system IS 'System presets cannot be edited or deleted by users';
COMMENT ON COLUMN daypart_presets.days_of_week IS 'Days preset applies to: 0=Sunday through 6=Saturday';

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for tenant-specific queries
CREATE INDEX IF NOT EXISTS idx_daypart_presets_tenant
  ON daypart_presets(tenant_id);

-- Partial index for system presets (faster lookups when filtering for system presets)
CREATE INDEX IF NOT EXISTS idx_daypart_presets_system
  ON daypart_presets(tenant_id) WHERE is_system = true;

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_daypart_presets_updated_at
  BEFORE UPDATE ON daypart_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SYSTEM PRESETS SEED DATA
-- =====================================================
-- System presets have tenant_id = NULL and is_system = true
-- Users can see these but cannot modify or delete them

-- Meal-based presets
INSERT INTO daypart_presets (tenant_id, name, preset_type, start_time, end_time, is_system)
VALUES
  (NULL, 'Breakfast', 'meal', '06:00:00', '10:00:00', true),
  (NULL, 'Lunch', 'meal', '11:00:00', '14:00:00', true),
  (NULL, 'Dinner', 'meal', '17:00:00', '21:00:00', true);

-- Period-based presets (6-hour blocks)
INSERT INTO daypart_presets (tenant_id, name, preset_type, start_time, end_time, is_system)
VALUES
  (NULL, 'Morning', 'period', '06:00:00', '12:00:00', true),
  (NULL, 'Afternoon', 'period', '12:00:00', '18:00:00', true),
  (NULL, 'Evening', 'period', '18:00:00', '00:00:00', true),
  (NULL, 'Night', 'period', '00:00:00', '06:00:00', true);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE daypart_presets ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see system presets (tenant_id IS NULL) AND their own presets
CREATE POLICY "Users can view system and own presets"
  ON daypart_presets
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = auth.uid()
  );

-- INSERT: Users can only create presets for themselves
CREATE POLICY "Users can create own presets"
  ON daypart_presets
  FOR INSERT
  WITH CHECK (
    tenant_id = auth.uid()
    AND is_system = false
  );

-- UPDATE: Users can only update their own non-system presets
CREATE POLICY "Users can update own non-system presets"
  ON daypart_presets
  FOR UPDATE
  USING (
    tenant_id = auth.uid()
    AND is_system = false
  )
  WITH CHECK (
    tenant_id = auth.uid()
    AND is_system = false
  );

-- DELETE: Users can only delete their own non-system presets
CREATE POLICY "Users can delete own non-system presets"
  ON daypart_presets
  FOR DELETE
  USING (
    tenant_id = auth.uid()
    AND is_system = false
  );
