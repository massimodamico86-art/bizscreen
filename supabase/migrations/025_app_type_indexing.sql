-- ============================================================================
-- Migration: 025_app_type_indexing.sql
-- Description: Add indexing for app types in media_assets config_json
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Functional index on appType for faster filtering of app assets
-- ----------------------------------------------------------------------------
-- This index helps when querying apps by their specific type (weather, rss, etc.)

CREATE INDEX IF NOT EXISTS idx_media_assets_app_type
    ON media_assets ((config_json->>'appType'))
    WHERE type = 'app';

-- ----------------------------------------------------------------------------
-- 2. Helper view for apps with their config expanded
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_apps_with_config AS
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.type,
    m.url,
    m.thumbnail_url,
    m.config_json->>'appType' AS app_type,
    m.config_json AS config,
    m.created_at,
    m.updated_at
FROM media_assets m
WHERE m.type = 'app';

-- Grant access to the view
GRANT SELECT ON v_apps_with_config TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Comments
-- ----------------------------------------------------------------------------

COMMENT ON INDEX idx_media_assets_app_type IS
'Index on app type for efficient filtering of apps by subtype (weather, rss_ticker, data_table, etc.)';

COMMENT ON VIEW v_apps_with_config IS
'Convenience view for querying app assets with their config_json expanded';
