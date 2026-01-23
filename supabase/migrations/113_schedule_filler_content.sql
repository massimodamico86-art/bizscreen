-- Migration 113: Schedule Filler Content & Conflict Detection (PRD 4)
-- US-134: Add filler content columns to schedules table
-- US-135: Create schedule conflict detection function

-- =====================================================
-- US-134: FILLER CONTENT COLUMNS
-- =====================================================

-- Add filler content type column
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS filler_content_type TEXT;

-- Add filler content ID column
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS filler_content_id UUID;

-- Add CHECK constraint: both must be NULL or both non-NULL
ALTER TABLE schedules
ADD CONSTRAINT chk_filler_content_consistency
CHECK (
  (filler_content_type IS NULL AND filler_content_id IS NULL) OR
  (filler_content_type IS NOT NULL AND filler_content_id IS NOT NULL)
);

-- Add CHECK constraint: valid filler content types
ALTER TABLE schedules
ADD CONSTRAINT chk_filler_content_type_valid
CHECK (
  filler_content_type IS NULL OR
  filler_content_type IN ('playlist', 'layout', 'scene')
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedules_filler_content
ON schedules(filler_content_type, filler_content_id)
WHERE filler_content_type IS NOT NULL;

-- =====================================================
-- US-135: CONFLICT DETECTION FUNCTION
-- =====================================================

-- Function to check for time conflicts between schedule entries
-- Returns conflicting entry details for user-friendly display
CREATE OR REPLACE FUNCTION check_schedule_entry_conflicts(
  p_schedule_id UUID,
  p_entry_id UUID,           -- Entry being edited (excluded from check), NULL for new entries
  p_start_time TIME,
  p_end_time TIME,
  p_days_of_week INT[],      -- NULL means all days
  p_start_date DATE,         -- NULL means no start date restriction
  p_end_date DATE            -- NULL means no end date restriction
)
RETURNS TABLE (
  conflicting_entry_id UUID,
  conflicting_start_time TIME,
  conflicting_end_time TIME,
  conflicting_days_of_week INT[],
  content_type TEXT,
  content_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id AS conflicting_entry_id,
    se.start_time AS conflicting_start_time,
    se.end_time AS conflicting_end_time,
    se.days_of_week AS conflicting_days_of_week,
    se.content_type,
    COALESCE(
      p.name,
      l.name,
      sc.name,
      'Unknown Content'
    ) AS content_name
  FROM schedule_entries se
  LEFT JOIN playlists p ON se.content_type = 'playlist' AND se.content_id = p.id
  LEFT JOIN layouts l ON se.content_type = 'layout' AND se.content_id = l.id
  LEFT JOIN scenes sc ON se.content_type = 'scene' AND se.content_id = sc.id
  WHERE
    se.schedule_id = p_schedule_id
    AND se.is_active = true
    -- Exclude the entry being edited
    AND (p_entry_id IS NULL OR se.id != p_entry_id)
    -- Time overlap check: times overlap if NOT (one ends before other starts)
    AND NOT (se.end_time <= p_start_time OR se.start_time >= p_end_time)
    -- Days of week overlap check:
    -- If either is NULL (all days), there's overlap
    -- If both have values, check for intersection
    AND (
      se.days_of_week IS NULL
      OR p_days_of_week IS NULL
      OR se.days_of_week && p_days_of_week  -- Array overlap operator
    )
    -- Date range overlap check:
    -- Entries overlap if date ranges intersect (or either is unbounded)
    AND (
      -- Either entry has no date restrictions
      (se.start_date IS NULL AND se.end_date IS NULL)
      OR (p_start_date IS NULL AND p_end_date IS NULL)
      -- Or date ranges overlap
      OR (
        (se.start_date IS NULL OR p_end_date IS NULL OR se.start_date <= p_end_date)
        AND (se.end_date IS NULL OR p_start_date IS NULL OR se.end_date >= p_start_date)
      )
    )
  ORDER BY se.start_time;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_schedule_entry_conflicts(UUID, UUID, TIME, TIME, INT[], DATE, DATE) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_schedule_entry_conflicts IS
'Checks for time conflicts between schedule entries. Returns conflicting entries with their details for user display. Used by the schedule editor to prevent overlapping entries.';
