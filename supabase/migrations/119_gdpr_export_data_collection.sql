-- Migration: GDPR Data Export Collection
-- Created: 2026-01-24
-- Description: RPC function to collect all user data for GDPR Article 20 data portability export
--
-- GDPR Article 20 - Right to Data Portability:
-- Users have the right to receive personal data concerning them in a structured,
-- commonly used, and machine-readable format (JSON).
--
-- This function collects data from all tables containing user information:
-- - Profile and settings
-- - Content (media, playlists, layouts, schedules, scenes)
-- - Devices (listings, TV devices, QR codes)
-- - Activity summary (aggregated by month, not individual events per CONTEXT.md)
-- - Consent history

-- ============================================================================
-- HELPER FUNCTIONS FOR NESTED CONTENT
-- ============================================================================

-- Helper: Get playlist with nested items
-- Returns a playlist object with its items array included
CREATE OR REPLACE FUNCTION get_playlist_with_items(p_playlist_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'defaultDuration', p.default_duration,
    'transitionEffect', p.transition_effect,
    'shuffle', p.shuffle,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at,
    'items', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'itemType', pi.item_type,
          'itemId', pi.item_id,
          'position', pi.position,
          'duration', pi.duration,
          'createdAt', pi.created_at
        ) ORDER BY pi.position
      )
       FROM playlist_items pi WHERE pi.playlist_id = p.id),
      '[]'::jsonb
    )
  )
  FROM playlists p WHERE p.id = p_playlist_id;
$$;

COMMENT ON FUNCTION get_playlist_with_items IS 'Helper for GDPR export: returns playlist with nested items array';

-- Helper: Get layout with nested zones
-- Returns a layout object with its zones array included
CREATE OR REPLACE FUNCTION get_layout_with_zones(p_layout_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'description', l.description,
    'width', l.width,
    'height', l.height,
    'backgroundColor', l.background_color,
    'backgroundImage', l.background_image,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at,
    'zones', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', lz.id,
          'name', lz.name,
          'xPercent', lz.x_percent,
          'yPercent', lz.y_percent,
          'widthPercent', lz.width_percent,
          'heightPercent', lz.height_percent,
          'zIndex', lz.z_index,
          'contentType', lz.content_type,
          'contentId', lz.content_id,
          'createdAt', lz.created_at
        ) ORDER BY lz.z_index
      )
       FROM layout_zones lz WHERE lz.layout_id = l.id),
      '[]'::jsonb
    )
  )
  FROM layouts l WHERE l.id = p_layout_id;
$$;

COMMENT ON FUNCTION get_layout_with_zones IS 'Helper for GDPR export: returns layout with nested zones array';

-- Helper: Get schedule with nested entries
-- Returns a schedule object with its entries array included
CREATE OR REPLACE FUNCTION get_schedule_with_entries(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'description', s.description,
    'isActive', s.is_active,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at,
    'entries', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', se.id,
          'targetType', se.target_type,
          'targetId', se.target_id,
          'contentType', se.content_type,
          'contentId', se.content_id,
          'startDate', se.start_date,
          'endDate', se.end_date,
          'startTime', se.start_time,
          'endTime', se.end_time,
          'daysOfWeek', se.days_of_week,
          'priority', se.priority,
          'createdAt', se.created_at
        ) ORDER BY se.priority DESC, se.created_at
      )
       FROM schedule_entries se WHERE se.schedule_id = s.id),
      '[]'::jsonb
    )
  )
  FROM schedules s WHERE s.id = p_schedule_id;
$$;

COMMENT ON FUNCTION get_schedule_with_entries IS 'Helper for GDPR export: returns schedule with nested entries array';

-- Helper: Get listing with nested devices and QR codes
-- Returns a listing object with tv_devices and qr_codes arrays included
CREATE OR REPLACE FUNCTION get_listing_with_devices(p_listing_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'description', l.description,
    'address', l.address,
    'image', l.image,
    'active', l.active,
    'bedrooms', l.bedrooms,
    'bathrooms', l.bathrooms,
    'guests', l.guests,
    'price', l.price,
    'rating', l.rating,
    'reviews', l.reviews,
    'tvs', l.tvs,
    'amenities', l.amenities,
    'carouselImages', l.carousel_images,
    'backgroundImage', l.background_image,
    'backgroundVideo', l.background_video,
    'backgroundMusic', l.background_music,
    'logo', l.logo,
    'tvLayout', l.tv_layout,
    'language', l.language,
    'wifiNetwork', l.wifi_network,
    'wifiPassword', l.wifi_password,
    'contactPhone', l.contact_phone,
    'contactEmail', l.contact_email,
    'websiteUrl', l.website_url,
    'toursLink', l.tours_link,
    'standardCheckInTime', l.standard_check_in_time,
    'standardCheckOutTime', l.standard_check_out_time,
    'hoursOfOperationFrom', l.hours_of_operation_from,
    'hoursOfOperationTo', l.hours_of_operation_to,
    'welcomeGreeting', l.welcome_greeting,
    'welcomeMessage', l.welcome_message,
    'weatherCity', l.weather_city,
    'weatherUnit', l.weather_unit,
    'showCheckInOut', l.show_check_in_out,
    'showHoursOfOperation', l.show_hours_of_operation,
    'showWifi', l.show_wifi,
    'showContact', l.show_contact,
    'showWeather', l.show_weather,
    'showQrCodes', l.show_qr_codes,
    'showLogo', l.show_logo,
    'showWelcomeMessage', l.show_welcome_message,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at,
    'tvDevices', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', td.id,
          'name', td.name,
          'deviceId', td.device_id,
          'isPaired', td.is_paired,
          'isOnline', td.is_online,
          'lastSeenAt', td.last_seen_at,
          'model', td.model,
          'osVersion', td.os_version,
          'appVersion', td.app_version,
          'timezone', td.timezone,
          'assignedPlaylistId', td.assigned_playlist_id,
          'assignedLayoutId', td.assigned_layout_id,
          'assignedScheduleId', td.assigned_schedule_id,
          'createdAt', td.created_at,
          'pairedAt', td.paired_at
        )
      )
       FROM tv_devices td WHERE td.listing_id = l.id),
      '[]'::jsonb
    ),
    'qrCodes', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', qr.id,
          'name', qr.name,
          'type', qr.type,
          'details', qr.details,
          'displayOrder', qr.display_order,
          'qrImageUrl', qr.qr_image_url,
          'createdAt', qr.created_at
        ) ORDER BY qr.display_order
      )
       FROM qr_codes qr WHERE qr.listing_id = l.id),
      '[]'::jsonb
    )
  )
  FROM listings l WHERE l.id = p_listing_id;
$$;

COMMENT ON FUNCTION get_listing_with_devices IS 'Helper for GDPR export: returns listing with nested TV devices and QR codes';

-- ============================================================================
-- MAIN DATA COLLECTION FUNCTION
-- ============================================================================

-- collect_user_export_data: Collects all user data for GDPR Article 20 export
-- This function is called by the background export job with service_role
-- It returns a comprehensive JSON structure with all user data
CREATE OR REPLACE FUNCTION collect_user_export_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_export_data JSONB;
  v_profile JSONB;
  v_settings JSONB;
  v_user_email TEXT;
  v_media_assets JSONB;
  v_playlists JSONB;
  v_layouts JSONB;
  v_schedules JSONB;
  v_scenes JSONB;
  v_listings JSONB;
  v_activity_summary JSONB;
  v_consent_history JSONB;
BEGIN
  -- ========================================
  -- 1. PROFILE SECTION
  -- Get user profile data
  -- ========================================
  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'fullName', p.full_name,
    'role', p.role,
    'avatarUrl', p.avatar_url,
    'hasCompletedOnboarding', p.has_completed_onboarding,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at,
    'lastActiveAt', p.last_active_at
  ), p.email
  INTO v_profile, v_user_email
  FROM profiles p
  WHERE p.id = p_user_id;

  -- If user not found, return error structure
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'userId', p_user_id
    );
  END IF;

  -- ========================================
  -- 2. SETTINGS SECTION
  -- Get user settings/preferences
  -- ========================================
  SELECT jsonb_build_object(
    'emailNotifications', us.email_notifications,
    'guestCheckinNotifications', us.guest_checkin_notifications,
    'pmsSyncNotifications', us.pms_sync_notifications,
    'tvOfflineNotifications', us.tv_offline_notifications,
    'theme', us.theme,
    'language', us.language,
    'timezone', us.timezone,
    'dateFormat', us.date_format,
    'timeFormat', us.time_format,
    'defaultPage', us.default_page,
    'itemsPerPage', us.items_per_page,
    'showWelcomeBanner', us.show_welcome_banner,
    'activityTracking', us.activity_tracking,
    'analyticsEnabled', us.analytics_enabled,
    'autoSyncPms', us.auto_sync_pms,
    'syncFrequencyHours', us.sync_frequency_hours,
    'createdAt', us.created_at,
    'updatedAt', us.updated_at
  )
  INTO v_settings
  FROM user_settings us
  WHERE us.user_id = p_user_id;

  -- Default to empty object if no settings found
  v_settings := COALESCE(v_settings, '{}'::jsonb);

  -- ========================================
  -- 3. CONTENT SECTION: MEDIA ASSETS
  -- Metadata only (URLs, sizes) - not actual file contents per CONTEXT.md
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'name', ma.name,
      'type', ma.type,
      'url', ma.url,
      'thumbnailUrl', ma.thumbnail_url,
      'mimeType', ma.mime_type,
      'fileSize', ma.file_size,
      'duration', ma.duration,
      'width', ma.width,
      'height', ma.height,
      'description', ma.description,
      'tags', ma.tags,
      'folderId', ma.folder_id,
      'createdAt', ma.created_at,
      'updatedAt', ma.updated_at
    ) ORDER BY ma.created_at DESC
  ), '[]'::jsonb)
  INTO v_media_assets
  FROM media_assets ma
  WHERE ma.owner_id = p_user_id;

  -- ========================================
  -- 4. CONTENT SECTION: PLAYLISTS (with nested items)
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    get_playlist_with_items(pl.id) ORDER BY pl.created_at DESC
  ), '[]'::jsonb)
  INTO v_playlists
  FROM playlists pl
  WHERE pl.owner_id = p_user_id;

  -- ========================================
  -- 5. CONTENT SECTION: LAYOUTS (with nested zones)
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    get_layout_with_zones(l.id) ORDER BY l.created_at DESC
  ), '[]'::jsonb)
  INTO v_layouts
  FROM layouts l
  WHERE l.owner_id = p_user_id;

  -- ========================================
  -- 6. CONTENT SECTION: SCHEDULES (with nested entries)
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    get_schedule_with_entries(s.id) ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_schedules
  FROM schedules s
  WHERE s.owner_id = p_user_id;

  -- ========================================
  -- 7. CONTENT SECTION: SCENES
  -- tenant_id matches the user's profile id
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sc.id,
      'name', sc.name,
      'businessType', sc.business_type,
      'layoutId', sc.layout_id,
      'primaryPlaylistId', sc.primary_playlist_id,
      'secondaryPlaylistId', sc.secondary_playlist_id,
      'settings', sc.settings,
      'isActive', sc.is_active,
      'createdAt', sc.created_at,
      'updatedAt', sc.updated_at
    ) ORDER BY sc.created_at DESC
  ), '[]'::jsonb)
  INTO v_scenes
  FROM scenes sc
  WHERE sc.tenant_id = p_user_id;

  -- ========================================
  -- 8. DEVICES SECTION: LISTINGS (with nested devices and QR codes)
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    get_listing_with_devices(li.id) ORDER BY li.created_at DESC
  ), '[]'::jsonb)
  INTO v_listings
  FROM listings li
  WHERE li.owner_id = p_user_id;

  -- ========================================
  -- 9. ACTIVITY SECTION: AGGREGATED BY MONTH
  -- Per CONTEXT.md: summary aggregates only (counts per month, not individual events)
  -- ========================================
  SELECT jsonb_build_object(
    'monthlyActivityCounts', COALESCE(
      (SELECT jsonb_object_agg(
        month_year,
        event_count
      )
      FROM (
        SELECT
          to_char(al.created_at, 'YYYY-MM') AS month_year,
          COUNT(*) AS event_count
        FROM activity_log al
        WHERE al.owner_id = p_user_id
        GROUP BY to_char(al.created_at, 'YYYY-MM')
        ORDER BY month_year DESC
      ) monthly_counts),
      '{}'::jsonb
    ),
    'totalActivityCount', (
      SELECT COUNT(*)
      FROM activity_log al
      WHERE al.owner_id = p_user_id
    ),
    'firstActivityDate', (
      SELECT MIN(al.created_at)
      FROM activity_log al
      WHERE al.owner_id = p_user_id
    ),
    'lastActivityDate', (
      SELECT MAX(al.created_at)
      FROM activity_log al
      WHERE al.owner_id = p_user_id
    )
  )
  INTO v_activity_summary;

  -- ========================================
  -- 10. CONSENT SECTION: CONSENT RECORDS HISTORY
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', cr.id,
      'consentVersion', cr.consent_version,
      'necessary', cr.necessary,
      'analytics', cr.analytics,
      'marketing', cr.marketing,
      'preferences', cr.preferences,
      'withdrawn', cr.withdrawn,
      'createdAt', cr.created_at
      -- Note: IP address and user agent omitted from export for privacy
    ) ORDER BY cr.created_at DESC
  ), '[]'::jsonb)
  INTO v_consent_history
  FROM consent_records cr
  WHERE cr.user_id = p_user_id;

  -- ========================================
  -- BUILD FINAL EXPORT STRUCTURE
  -- ========================================
  v_export_data := jsonb_build_object(
    'metadata', jsonb_build_object(
      'exportDate', NOW(),
      'userId', p_user_id,
      'email', v_user_email,
      'format', 'json',
      'version', '1.0',
      'gdprArticle', '20',
      'description', 'GDPR Article 20 Data Portability Export - Contains all personal data associated with this account'
    ),
    'profile', v_profile,
    'settings', v_settings,
    'content', jsonb_build_object(
      'mediaAssets', v_media_assets,
      'playlists', v_playlists,
      'layouts', v_layouts,
      'schedules', v_schedules,
      'scenes', v_scenes
    ),
    'devices', jsonb_build_object(
      'listings', v_listings
      -- tvDevices and qrCodes are nested within listings via get_listing_with_devices
    ),
    'activitySummary', v_activity_summary,
    'consent', jsonb_build_object(
      'history', v_consent_history
    )
  );

  RETURN v_export_data;
END;
$$;

COMMENT ON FUNCTION collect_user_export_data IS 'GDPR Article 20: Collects all user data for data portability export. Returns comprehensive JSONB with profile, settings, content, devices, activity summary, and consent history.';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant EXECUTE to service_role only (not authenticated)
-- This function is for background job processing, not direct user access
-- Users request exports via request_data_export() which creates a job record
REVOKE ALL ON FUNCTION collect_user_export_data FROM PUBLIC;
REVOKE ALL ON FUNCTION collect_user_export_data FROM authenticated;
GRANT EXECUTE ON FUNCTION collect_user_export_data TO service_role;

-- Grant EXECUTE on helper functions to service_role only
REVOKE ALL ON FUNCTION get_playlist_with_items FROM PUBLIC;
REVOKE ALL ON FUNCTION get_playlist_with_items FROM authenticated;
GRANT EXECUTE ON FUNCTION get_playlist_with_items TO service_role;

REVOKE ALL ON FUNCTION get_layout_with_zones FROM PUBLIC;
REVOKE ALL ON FUNCTION get_layout_with_zones FROM authenticated;
GRANT EXECUTE ON FUNCTION get_layout_with_zones TO service_role;

REVOKE ALL ON FUNCTION get_schedule_with_entries FROM PUBLIC;
REVOKE ALL ON FUNCTION get_schedule_with_entries FROM authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_with_entries TO service_role;

REVOKE ALL ON FUNCTION get_listing_with_devices FROM PUBLIC;
REVOKE ALL ON FUNCTION get_listing_with_devices FROM authenticated;
GRANT EXECUTE ON FUNCTION get_listing_with_devices TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Created functions:
--   - collect_user_export_data(p_user_id UUID) -> JSONB
--   - get_playlist_with_items(p_playlist_id UUID) -> JSONB
--   - get_layout_with_zones(p_layout_id UUID) -> JSONB
--   - get_schedule_with_entries(p_schedule_id UUID) -> JSONB
--   - get_listing_with_devices(p_listing_id UUID) -> JSONB
--
-- Data tables queried:
--   - profiles (profile data)
--   - user_settings (preferences)
--   - media_assets (content metadata only)
--   - playlists + playlist_items (nested)
--   - layouts + layout_zones (nested)
--   - schedules + schedule_entries (nested)
--   - scenes (content)
--   - listings + tv_devices + qr_codes (nested)
--   - activity_log (aggregated by month)
--   - consent_records (history)
-- ============================================================================
