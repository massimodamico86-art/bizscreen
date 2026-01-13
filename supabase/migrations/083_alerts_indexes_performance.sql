-- ============================================================================
-- Phase 19b: Additional Alerts Indexes for High-Throughput Performance
-- ============================================================================
-- This migration adds additional indexes to optimize common alert queries,
-- especially for:
-- - Finding alerts by schedule_id and data_source_id
-- - Time-based queries for escalation checks
-- - Notification dispatch queries
-- ============================================================================

-- Index on schedule_id for schedule-related alerts (mirrors device_id and scene_id pattern)
CREATE INDEX IF NOT EXISTS idx_alerts_schedule
ON alerts(schedule_id)
WHERE schedule_id IS NOT NULL;

-- Index on data_source_id for data source alerts (mirrors device_id and scene_id pattern)
CREATE INDEX IF NOT EXISTS idx_alerts_data_source
ON alerts(data_source_id)
WHERE data_source_id IS NOT NULL;

-- Index on created_at for escalation time window checks
-- Used when checking if occurrences happened within a time window
CREATE INDEX IF NOT EXISTS idx_alerts_created_at
ON alerts(created_at);

-- Composite index for auto-resolve queries (tenant + type + status + device)
-- This covers the most common auto-resolve pattern
CREATE INDEX IF NOT EXISTS idx_alerts_auto_resolve_device
ON alerts(tenant_id, type, device_id)
WHERE status IN ('open', 'acknowledged') AND device_id IS NOT NULL;

-- Composite index for auto-resolve queries with data_source_id
CREATE INDEX IF NOT EXISTS idx_alerts_auto_resolve_data_source
ON alerts(tenant_id, type, data_source_id)
WHERE status IN ('open', 'acknowledged') AND data_source_id IS NOT NULL;

-- ============================================================================
-- Notifications indexes for dispatch performance
-- ============================================================================

-- Index for unread in-app notifications by user (for NotificationBell component)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL AND channel = 'in_app';

-- Index for recent notifications by user (for notification dropdown)
CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
ON notifications(user_id, created_at DESC);

-- ============================================================================
-- ANALYZE tables for query planner
-- ============================================================================
ANALYZE alerts;
ANALYZE notifications;
ANALYZE notification_preferences;
