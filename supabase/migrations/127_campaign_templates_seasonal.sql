-- Campaign Templates and Seasonal Scheduling
-- Migration: 127_campaign_templates_seasonal.sql
-- Purpose: Add campaign templates for reuse and seasonal recurrence rules

-- ============================================================================
-- Campaign Templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- template_data structure:
-- {
--   "targets": [{"target_type": "screen_group", "target_id": null}],
--   "contents": [{"content_type": "playlist", "content_id": null, "weight": 1, "position": 0}],
--   "settings": {"priority": 100, "rotation_mode": "weight"},
--   "schedule": {"days_of_week": [1,2,3,4,5]}
-- }

CREATE INDEX IF NOT EXISTS idx_campaign_templates_tenant ON campaign_templates(tenant_id);

-- ============================================================================
-- RLS Policies (user's own + system templates)
-- ============================================================================

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- Allow reading own templates and system templates
CREATE POLICY "campaign_templates_select" ON campaign_templates FOR SELECT
  USING (tenant_id = auth.uid() OR is_system = true);

-- Allow inserting own templates
CREATE POLICY "campaign_templates_insert" ON campaign_templates FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- Allow updating own non-system templates
CREATE POLICY "campaign_templates_update" ON campaign_templates FOR UPDATE
  USING (tenant_id = auth.uid() AND is_system = false);

-- Allow deleting own non-system templates
CREATE POLICY "campaign_templates_delete" ON campaign_templates FOR DELETE
  USING (tenant_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Add seasonal recurrence to campaigns
-- ============================================================================

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB DEFAULT NULL;

-- recurrence_rule structure:
-- {
--   "type": "yearly",
--   "month": 12,
--   "day": 15,
--   "duration_days": 20
-- }

COMMENT ON COLUMN campaigns.recurrence_rule IS
'Seasonal recurrence pattern. Type: yearly. Auto-activates campaign on month/day for duration_days.';

-- ============================================================================
-- Function to update seasonal campaigns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_seasonal_campaigns()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaign RECORD;
  v_start DATE;
  v_end DATE;
BEGIN
  -- Find seasonal campaigns that should activate this year
  FOR v_campaign IN
    SELECT * FROM campaigns
    WHERE recurrence_rule IS NOT NULL
      AND status IN ('completed', 'paused')
  LOOP
    -- Calculate this year's activation window
    v_start := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::INT,
      (v_campaign.recurrence_rule->>'month')::INT,
      (v_campaign.recurrence_rule->>'day')::INT
    );
    v_end := v_start + ((v_campaign.recurrence_rule->>'duration_days')::INT || ' days')::INTERVAL;

    -- If we're in the window, activate
    IF CURRENT_DATE >= v_start AND CURRENT_DATE <= v_end THEN
      UPDATE campaigns
      SET
        status = 'active',
        start_at = v_start::TIMESTAMPTZ,
        end_at = v_end::TIMESTAMPTZ,
        updated_at = now()
      WHERE id = v_campaign.id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_templates TO authenticated;
GRANT EXECUTE ON FUNCTION update_seasonal_campaigns TO authenticated;
