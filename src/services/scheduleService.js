// Schedule Service - CRUD operations for time-based content scheduling
//
// CONTENT RESOLUTION PRIORITY (highest to lowest):
// 1. Emergency campaigns - Bypass all other content for urgent messages
// 2. Active campaigns - Scheduled campaigns targeting the device/group
// 3. Device scene - Default content assigned directly to the device
//
// This priority order ensures emergency alerts always reach screens immediately,
// while campaigns can override default content during their scheduled windows.
import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';
import { requiresApproval } from './permissionsService.js';
import { APPROVAL_STATUS } from './approvalService.js';
import { createScopedLogger } from './loggingService';
import { TZDate } from '@date-fns/tz';

const logger = createScopedLogger('ScheduleService');

/**
 * Check if content can be assigned to a schedule
 * Editors can only assign approved content; owners/managers can assign anything
 *
 * @param {string} contentType - 'playlist' or 'scene'
 * @param {string} contentId - Content ID
 * @returns {Promise<{canAssign: boolean, reason?: string}>}
 */
export async function canAssignContent(contentType, contentId) {
  // Check if user requires approval (editors/viewers do, owners/managers don't)
  const needsApprovalCheck = await requiresApproval();

  if (!needsApprovalCheck) {
    // Owners/managers can assign any content
    return { canAssign: true };
  }

  // Editors need to check approval status
  const tableName = contentType === 'playlist' ? 'playlists' : 'scenes';
  const { data, error } = await supabase
    .from(tableName)
    .select('approval_status')
    .eq('id', contentId)
    .single();

  if (error) {
    return { canAssign: false, reason: 'Unable to verify content status' };
  }

  // Only approved content can be assigned by editors
  if (data.approval_status !== APPROVAL_STATUS.APPROVED) {
    const statusLabels = {
      draft: 'pending submission',
      in_review: 'awaiting approval',
      rejected: 'needs revision',
    };
    const statusLabel = statusLabels[data.approval_status] || data.approval_status;
    return {
      canAssign: false,
      reason: `This content is ${statusLabel}. Only approved content can be scheduled.`,
    };
  }

  return { canAssign: true };
}

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

/**
 * Target types for schedule entries
 */
export const TARGET_TYPES = {
  PLAYLIST: 'playlist',
  LAYOUT: 'layout',
  MEDIA: 'media',
  SCENE: 'scene'
};

/**
 * Fetch all schedules for the current user
 */
export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      schedule_entries(count)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform the count from array to number
  return (data || []).map(schedule => ({
    ...schedule,
    entry_count: schedule.schedule_entries?.[0]?.count || 0
  }));
}

/**
 * Create a new schedule
 * @param root0
 * @param root0.name
 * @param root0.description
 */
export async function createSchedule({ name, description = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      owner_id: user.id,
      name,
      description
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.SCHEDULE_CREATED,
      RESOURCE_TYPES.SCHEDULE,
      data.id,
      data.name
    );
  }

  return data;
}

/**
 * Delete a schedule and its entries (cascade should handle entries)
 * @param id
 */
export async function deleteSchedule(id) {
  // Get schedule info before deleting for logging
  const { data: schedule } = await supabase
    .from('schedules')
    .select('id, name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  if (schedule) {
    logActivity(
      ACTIONS.SCHEDULE_DELETED,
      RESOURCE_TYPES.SCHEDULE,
      schedule.id,
      schedule.name
    );
  }

  return true;
}

/**
 * Fetch a single schedule with all its entries
 * @param id
 */
export async function fetchScheduleWithEntries(id) {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      schedule_entries(
        id,
        target_type,
        target_id,
        content_type,
        content_id,
        start_date,
        end_date,
        start_time,
        end_time,
        days_of_week,
        priority,
        is_active,
        event_type,
        repeat_type,
        repeat_config,
        campaign_id
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // Sort entries by priority (higher first), then by start_time
  if (data && data.schedule_entries) {
    data.schedule_entries.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }

  return data;
}

/**
 * Fetch schedule with entries and resolved target info (playlist/layout/media/scene names)
 * @param id
 */
export async function fetchScheduleWithEntriesResolved(id) {
  const schedule = await fetchScheduleWithEntries(id);
  if (!schedule || !schedule.schedule_entries) return schedule;

  // Collect unique content IDs by type (prefer content_type/content_id, fall back to target_type/target_id)
  const playlistIds = [];
  const layoutIds = [];
  const mediaIds = [];
  const sceneIds = [];

  for (const entry of schedule.schedule_entries) {
    const contentType = entry.content_type || entry.target_type;
    const contentId = entry.content_id || entry.target_id;

    if (contentType === 'playlist' && contentId) {
      playlistIds.push(contentId);
    } else if (contentType === 'layout' && contentId) {
      layoutIds.push(contentId);
    } else if (contentType === 'media' && contentId) {
      mediaIds.push(contentId);
    } else if (contentType === 'scene' && contentId) {
      sceneIds.push(contentId);
    }
  }

  // Fetch all related items in parallel
  const [playlistsResult, layoutsResult, mediaResult, scenesResult] = await Promise.all([
    playlistIds.length > 0
      ? supabase.from('playlists').select('id, name').in('id', playlistIds)
      : { data: [] },
    layoutIds.length > 0
      ? supabase.from('layouts').select('id, name').in('id', layoutIds)
      : { data: [] },
    mediaIds.length > 0
      ? supabase.from('media_assets').select('id, name, type, thumbnail_url').in('id', mediaIds)
      : { data: [] },
    sceneIds.length > 0
      ? supabase.from('scenes').select('id, name, business_type, is_active').in('id', sceneIds)
      : { data: [] }
  ]);

  // Create lookup maps
  const playlistMap = Object.fromEntries((playlistsResult.data || []).map(p => [p.id, p]));
  const layoutMap = Object.fromEntries((layoutsResult.data || []).map(l => [l.id, l]));
  const mediaMap = Object.fromEntries((mediaResult.data || []).map(m => [m.id, m]));
  const sceneMap = Object.fromEntries((scenesResult.data || []).map(s => [s.id, s]));

  // Enrich entries with target info
  schedule.schedule_entries = schedule.schedule_entries.map(entry => {
    const contentType = entry.content_type || entry.target_type;
    const contentId = entry.content_id || entry.target_id;

    let target = null;
    if (contentType === 'playlist') {
      target = playlistMap[contentId];
    } else if (contentType === 'layout') {
      target = layoutMap[contentId];
    } else if (contentType === 'media') {
      target = mediaMap[contentId];
    } else if (contentType === 'scene') {
      target = sceneMap[contentId];
    }
    return { ...entry, target };
  });

  return schedule;
}

/**
 * Update a schedule's basic info
 * @param id
 * @param updates
 */
export async function updateSchedule(id, updates) {
  const allowedFields = ['name', 'description'];
  const filteredUpdates = {};

  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('schedules')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.SCHEDULE_UPDATED,
      RESOURCE_TYPES.SCHEDULE,
      data.id,
      data.name,
      { updates: filteredUpdates }
    );
  }

  return data;
}

/**
 * Create a new schedule entry
 * @param scheduleId
 * @param entryData
 */
export async function createScheduleEntry(scheduleId, entryData = {}) {
  // Validate content can be assigned (approval check for editors)
  const contentType = entryData.content_type || entryData.target_type;
  const contentId = entryData.content_id || entryData.target_id;

  if (contentType && contentId && (contentType === 'playlist' || contentType === 'scene')) {
    const { canAssign, reason } = await canAssignContent(contentType, contentId);
    if (!canAssign) {
      throw new Error(reason);
    }
  }

  // Build repeat_config from individual fields if provided
  const repeatConfig = {};
  if (entryData.repeat_every) repeatConfig.repeat_every = entryData.repeat_every;
  if (entryData.repeat_unit) repeatConfig.repeat_unit = entryData.repeat_unit;
  if (entryData.repeat_until) repeatConfig.repeat_until = entryData.repeat_until;
  if (entryData.repeat_until_date) repeatConfig.repeat_until_date = entryData.repeat_until_date;
  if (entryData.repeat_until_count) repeatConfig.repeat_until_count = entryData.repeat_until_count;

  const data = {
    schedule_id: scheduleId,
    // Content type - what to play (playlist, layout, media)
    content_type: entryData.content_type || entryData.target_type || 'playlist',
    content_id: entryData.content_id || entryData.target_id || null,
    // Target type - where to play (for backwards compatibility)
    target_type: entryData.target_type || 'all',
    target_id: entryData.target_id || null,
    // Timing
    start_date: entryData.start_date || null,
    end_date: entryData.end_date || null,
    start_time: entryData.start_time || '09:00',
    end_time: entryData.end_time || '17:00',
    days_of_week: entryData.days_of_week || [1, 2, 3, 4, 5], // Default weekdays
    // Settings
    priority: entryData.priority ?? 0,
    is_active: entryData.is_active ?? true,
    event_type: entryData.event_type || 'content', // 'content' or 'screen_off'
    repeat_type: entryData.repeat_type || 'none',
    repeat_config: Object.keys(repeatConfig).length > 0 ? repeatConfig : (entryData.repeat_config || {})
  };

  const { data: result, error } = await supabase
    .from('schedule_entries')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Update a schedule entry
 * @param entryId
 * @param updates
 */
export async function updateScheduleEntry(entryId, updates) {
  // Validate content can be assigned if content is being changed
  const contentType = updates.content_type;
  const contentId = updates.content_id;

  if (contentType && contentId && (contentType === 'playlist' || contentType === 'scene')) {
    const { canAssign, reason } = await canAssignContent(contentType, contentId);
    if (!canAssign) {
      throw new Error(reason);
    }
  }

  const allowedFields = [
    'target_type', 'target_id', 'content_type', 'content_id',
    'start_date', 'end_date', 'start_time', 'end_time',
    'days_of_week', 'priority', 'is_active',
    'event_type', 'repeat_type', 'repeat_config',
    'campaign_id' // US-148: Allow campaign assignment
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  // Build repeat_config from individual fields if provided
  if (updates.repeat_every || updates.repeat_unit || updates.repeat_until || updates.repeat_until_date || updates.repeat_until_count) {
    filteredUpdates.repeat_config = {
      repeat_every: updates.repeat_every,
      repeat_unit: updates.repeat_unit,
      repeat_until: updates.repeat_until,
      repeat_until_date: updates.repeat_until_date,
      repeat_until_count: updates.repeat_until_count
    };
  }

  const { data, error } = await supabase
    .from('schedule_entries')
    .update(filteredUpdates)
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a schedule entry
 * @param entryId
 */
export async function deleteScheduleEntry(entryId) {
  const { error } = await supabase
    .from('schedule_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
  return true;
}

/**
 * Duplicate a schedule with all its entries
 * @param id
 */
export async function duplicateSchedule(id) {
  const original = await fetchScheduleWithEntries(id);
  if (!original) throw new Error('Schedule not found');

  // Create new schedule
  const newSchedule = await createSchedule({
    name: `${original.name} (Copy)`,
    description: original.description
  });

  // Copy all entries
  if (original.schedule_entries && original.schedule_entries.length > 0) {
    for (const entry of original.schedule_entries) {
      await createScheduleEntry(newSchedule.id, {
        target_type: entry.target_type,
        target_id: entry.target_id,
        days_of_week: entry.days_of_week,
        start_time: entry.start_time,
        end_time: entry.end_time,
        priority: entry.priority,
        is_active: entry.is_active
      });
    }
  }

  return fetchScheduleWithEntries(newSchedule.id);
}

/**
 * Format days of week for display
 * @param daysArray
 */
export function formatDaysOfWeek(daysArray) {
  if (!daysArray || daysArray.length === 0) return 'No days';
  if (daysArray.length === 7) return 'Every day';

  // Check for weekdays (Mon-Fri)
  const weekdays = [1, 2, 3, 4, 5];
  if (daysArray.length === 5 && weekdays.every(d => daysArray.includes(d))) {
    return 'Weekdays';
  }

  // Check for weekends (Sat-Sun)
  const weekends = [0, 6];
  if (daysArray.length === 2 && weekends.every(d => daysArray.includes(d))) {
    return 'Weekends';
  }

  // Show abbreviated day names
  return daysArray
    .sort((a, b) => a - b)
    .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short)
    .filter(Boolean)
    .join(', ');
}

/**
 * Format time for display (HH:mm to 12-hour format)
 * @param time
 */
export function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/**
 * Format time range for display
 * @param startTime
 * @param endTime
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return 'All day';
  if (!startTime) return `Until ${formatTime(endTime)}`;
  if (!endTime) return `From ${formatTime(startTime)}`;
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Fetch schedules with usage info (device/group counts)
 */
export async function fetchSchedulesWithUsage() {
  const { data, error } = await supabase
    .from('v_schedules_with_usage')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Assign a schedule to a device
 * @param {string} deviceId - Device ID
 * @param {string|null} scheduleId - Schedule ID or null to clear
 */
export async function assignScheduleToDevice(deviceId, scheduleId) {
  if (!deviceId) throw new Error('Device ID is required');

  const { data, error } = await supabase
    .rpc('assign_schedule_to_device', {
      p_device_id: deviceId,
      p_schedule_id: scheduleId
    });

  if (error) throw error;
  return data;
}

/**
 * Assign a schedule to a screen group
 * @param {string} groupId - Screen group ID
 * @param {string|null} scheduleId - Schedule ID or null to clear
 */
export async function assignScheduleToGroup(groupId, scheduleId) {
  if (!groupId) throw new Error('Group ID is required');

  const { data, error } = await supabase
    .rpc('assign_schedule_to_group', {
      p_group_id: groupId,
      p_schedule_id: scheduleId
    });

  if (error) throw error;
  return data;
}

/**
 * Get schedule preview for a specific date
 * @param {string} scheduleId - Schedule ID
 * @param {string} timezone - Timezone (default: UTC)
 * @param {string} date - Date in YYYY-MM-DD format
 */
export async function getSchedulePreview(scheduleId, timezone = 'UTC', date = null) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  const params = {
    p_schedule_id: scheduleId,
    p_timezone: timezone
  };

  if (date) {
    params.p_date = date;
  }

  const { data, error } = await supabase
    .rpc('get_schedule_preview', params);

  if (error) throw error;
  return data || [];
}

/**
 * Get devices using a specific schedule
 * @param {string} scheduleId - Schedule ID
 */
export async function getDevicesWithSchedule(scheduleId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select('id, device_name, is_online, location:locations(id, name)')
    .eq('assigned_schedule_id', scheduleId)
    .order('device_name');

  if (error) throw error;
  return data || [];
}

/**
 * Get screen groups using a specific schedule
 * @param {string} scheduleId - Schedule ID
 */
export async function getGroupsWithSchedule(scheduleId) {
  const { data, error } = await supabase
    .from('screen_groups')
    .select('id, name, location:locations(id, name)')
    .eq('assigned_schedule_id', scheduleId)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get all scenes for dropdown selection
 */
export async function getScenesForSchedule() {
  const { data, error } = await supabase
    .from('scenes')
    .select('id, name, business_type, is_active, approval_status')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Create a schedule with initial scene entries
 * @param {Object} scheduleData - Schedule data with entries
 * @param scheduleData.name
 * @param scheduleData.description
 * @param scheduleData.timezone
 * @param scheduleData.entries
 */
export async function createScheduleWithEntries({ name, description, timezone = 'UTC', entries = [] }) {
  // Create the schedule
  const schedule = await createSchedule({ name, description });

  // Update timezone if provided
  if (timezone !== 'UTC') {
    await supabase
      .from('schedules')
      .update({ timezone })
      .eq('id', schedule.id);
  }

  // Create all entries
  for (const entry of entries) {
    await createScheduleEntry(schedule.id, entry);
  }

  return fetchScheduleWithEntriesResolved(schedule.id);
}

// =====================================================
// FILLER CONTENT (US-136)
// =====================================================

/**
 * Update a schedule's filler content
 * @param {string} scheduleId - Schedule UUID
 * @param {string} contentType - 'playlist' | 'layout' | 'scene'
 * @param {string} contentId - Content UUID
 */
export async function updateScheduleFillerContent(scheduleId, contentType, contentId) {
  if (!scheduleId) throw new Error('Schedule ID is required');
  if (!contentType || !contentId) throw new Error('Content type and ID are required');

  const validTypes = ['playlist', 'layout', 'scene'];
  if (!validTypes.includes(contentType)) {
    throw new Error(`Invalid content type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate content can be assigned (approval check for editors)
  if (contentType === 'playlist' || contentType === 'scene') {
    const { canAssign, reason } = await canAssignContent(contentType, contentId);
    if (!canAssign) {
      throw new Error(reason);
    }
  }

  const { data, error } = await supabase
    .from('schedules')
    .update({
      filler_content_type: contentType,
      filler_content_id: contentId
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.SCHEDULE_UPDATED,
      RESOURCE_TYPES.SCHEDULE,
      data.id,
      data.name,
      { filler_content_type: contentType, filler_content_id: contentId }
    );
  }

  return data;
}

/**
 * Clear a schedule's filler content
 * @param {string} scheduleId - Schedule UUID
 */
export async function clearScheduleFillerContent(scheduleId) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  const { data, error } = await supabase
    .from('schedules')
    .update({
      filler_content_type: null,
      filler_content_id: null
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.SCHEDULE_UPDATED,
      RESOURCE_TYPES.SCHEDULE,
      data.id,
      data.name,
      { filler_content_cleared: true }
    );
  }

  return data;
}

// =====================================================
// CONFLICT DETECTION (US-137)
// =====================================================

/**
 * Check for schedule entry conflicts
 * @param {string} scheduleId - Schedule UUID
 * @param {object} entryData - Entry data to check
 * @param {string} excludeEntryId - Entry ID to exclude (when editing)
 * @returns {Promise<{hasConflicts: boolean, conflicts: Array}>}
 */
export async function checkEntryConflicts(scheduleId, entryData, excludeEntryId = null) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  const { data, error } = await supabase.rpc('check_schedule_entry_conflicts', {
    p_schedule_id: scheduleId,
    p_entry_id: excludeEntryId,
    p_start_time: entryData.start_time || '09:00',
    p_end_time: entryData.end_time || '17:00',
    p_days_of_week: entryData.days_of_week || null,
    p_start_date: entryData.start_date || null,
    p_end_date: entryData.end_date || null
  });

  if (error) throw error;

  const conflicts = (data || []).map(conflict => ({
    id: conflict.conflicting_entry_id,
    start_time: conflict.conflicting_start_time,
    end_time: conflict.conflicting_end_time,
    days_of_week: conflict.conflicting_days_of_week,
    content_type: conflict.content_type,
    content_name: conflict.content_name
  }));

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

// =====================================================
// WEEK PREVIEW (US-138)
// =====================================================

/**
 * Get week preview showing what plays each day
 * @param {string} scheduleId - Schedule UUID
 * @param {Date|string} weekStartDate - Start of week (Monday)
 * @returns {Promise<Array>} Array of 7 day objects with entries
 */
export async function getWeekPreview(scheduleId, weekStartDate) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  // Use TZDate for DST-safe date calculations
  // Default to UTC if no timezone provided, actual device timezone used at playback
  const startDate = new TZDate(weekStartDate, 'UTC');
  const weekDays = [];

  // Fetch schedule with entries and filler
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select(`
      id,
      filler_content_type,
      filler_content_id,
      schedule_entries(
        id,
        start_time,
        end_time,
        days_of_week,
        start_date,
        end_date,
        content_type,
        content_id,
        event_type,
        is_active,
        priority
      )
    `)
    .eq('id', scheduleId)
    .single();

  if (scheduleError) throw scheduleError;
  if (!schedule) throw new Error('Schedule not found');

  // Fetch filler content name if set
  let fillerContent = null;
  if (schedule.filler_content_type && schedule.filler_content_id) {
    const fillerTable = schedule.filler_content_type === 'playlist' ? 'playlists' :
                        schedule.filler_content_type === 'layout' ? 'layouts' : 'scenes';
    const { data: filler } = await supabase
      .from(fillerTable)
      .select('id, name')
      .eq('id', schedule.filler_content_id)
      .single();
    if (filler) {
      fillerContent = {
        type: schedule.filler_content_type,
        id: filler.id,
        name: filler.name
      };
    }
  }

  // Collect content IDs for batch lookup
  const contentIds = {
    playlist: new Set(),
    layout: new Set(),
    scene: new Set()
  };

  for (const entry of schedule.schedule_entries || []) {
    if (entry.content_type && entry.content_id && contentIds[entry.content_type]) {
      contentIds[entry.content_type].add(entry.content_id);
    }
  }

  // Fetch content names and thumbnails in parallel
  const [playlistsResult, layoutsResult, scenesResult] = await Promise.all([
    contentIds.playlist.size > 0
      ? supabase
          .from('playlists')
          .select(`
            id, name,
            playlist_items(
              position,
              media_assets(thumbnail_url)
            )
          `)
          .in('id', Array.from(contentIds.playlist))
          .order('position', { referencedTable: 'playlist_items', ascending: true })
      : { data: [] },
    contentIds.layout.size > 0
      ? supabase.from('layouts').select('id, name, thumbnail_url').in('id', Array.from(contentIds.layout))
      : { data: [] },
    contentIds.scene.size > 0
      ? supabase.from('scenes').select('id, name, thumbnail_url').in('id', Array.from(contentIds.scene))
      : { data: [] }
  ]);

  // Build content info maps with names and thumbnails
  const contentInfo = {
    playlist: Object.fromEntries((playlistsResult.data || []).map(p => {
      // Get thumbnail from first playlist item's media asset
      const firstItem = p.playlist_items?.find(item => item?.media_assets?.thumbnail_url);
      const thumbnail = firstItem?.media_assets?.thumbnail_url || null;
      return [p.id, { name: p.name, thumbnail }];
    })),
    layout: Object.fromEntries((layoutsResult.data || []).map(l => [l.id, { name: l.name, thumbnail: l.thumbnail_url || null }])),
    scene: Object.fromEntries((scenesResult.data || []).map(s => [s.id, { name: s.name, thumbnail: s.thumbnail_url || null }]))
  };

  // Build 7 days
  for (let i = 0; i < 7; i++) {
    // Use TZDate for DST-safe day increments
    const date = new TZDate(startDate.getTime() + i * 24 * 60 * 60 * 1000, 'UTC');
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
    const dateStr = date.toISOString().split('T')[0];

    // Filter entries that apply to this day
    const dayEntries = (schedule.schedule_entries || [])
      .filter(entry => {
        if (!entry.is_active) return false;
        // Check days_of_week
        if (entry.days_of_week && !entry.days_of_week.includes(dayOfWeek)) return false;
        // Check date range
        if (entry.start_date && dateStr < entry.start_date) return false;
        if (entry.end_date && dateStr > entry.end_date) return false;
        return true;
      })
      .map(entry => ({
        id: entry.id,
        start_time: entry.start_time,
        end_time: entry.end_time,
        content_type: entry.content_type,
        content_id: entry.content_id,
        content_name: contentInfo[entry.content_type]?.[entry.content_id]?.name || 'Unknown',
        thumbnail_url: contentInfo[entry.content_type]?.[entry.content_id]?.thumbnail || null,
        event_type: entry.event_type,
        priority: entry.priority
      }))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    weekDays.push({
      date: dateStr,
      dayOfWeek,
      dayName: DAYS_OF_WEEK[dayOfWeek].label,
      dayShort: DAYS_OF_WEEK[dayOfWeek].short,
      entries: dayEntries,
      filler: dayEntries.length === 0 ? fillerContent : null
    });
  }

  return weekDays;
}

// =====================================================
// DEVICE/GROUP ASSIGNMENT (US-139)
// =====================================================

/**
 * Get all devices and groups assigned to a schedule
 * @param {string} scheduleId - Schedule UUID
 * @returns {Promise<{devices: Array, groups: Array}>}
 */
export async function getAssignedDevicesAndGroups(scheduleId) {
  if (!scheduleId) throw new Error('Schedule ID is required');

  const [devicesResult, groupsResult] = await Promise.all([
    getDevicesWithSchedule(scheduleId),
    getGroupsWithSchedule(scheduleId)
  ]);

  return {
    devices: devicesResult,
    groups: groupsResult
  };
}

/**
 * Bulk assign a schedule to multiple devices
 * @param {string} scheduleId - Schedule UUID
 * @param {string[]} deviceIds - Array of device UUIDs
 */
export async function bulkAssignScheduleToDevices(scheduleId, deviceIds) {
  if (!scheduleId) throw new Error('Schedule ID is required');
  if (!deviceIds || deviceIds.length === 0) return { updated: 0 };

  const { data, error } = await supabase
    .from('tv_devices')
    .update({ assigned_schedule_id: scheduleId })
    .in('id', deviceIds)
    .select('id, device_name');

  if (error) throw error;

  // Log activity
  logActivity(
    ACTIONS.SCHEDULE_ASSIGNED,
    RESOURCE_TYPES.SCHEDULE,
    scheduleId,
    `Assigned to ${data?.length || 0} devices`,
    { device_ids: deviceIds }
  );

  return { updated: data?.length || 0, devices: data };
}

/**
 * Bulk unassign schedule from multiple devices
 * @param {string[]} deviceIds - Array of device UUIDs
 */
export async function bulkUnassignScheduleFromDevices(deviceIds) {
  if (!deviceIds || deviceIds.length === 0) return { updated: 0 };

  const { data, error } = await supabase
    .from('tv_devices')
    .update({ assigned_schedule_id: null })
    .in('id', deviceIds)
    .select('id, device_name');

  if (error) throw error;

  // Log activity
  logActivity(
    ACTIONS.SCHEDULE_UNASSIGNED,
    RESOURCE_TYPES.DEVICE,
    null,
    `Unassigned schedule from ${data?.length || 0} devices`,
    { device_ids: deviceIds }
  );

  return { updated: data?.length || 0, devices: data };
}

/**
 * Bulk assign a schedule to multiple screen groups
 * @param {string} scheduleId - Schedule UUID
 * @param {string[]} groupIds - Array of group UUIDs
 */
export async function bulkAssignScheduleToGroups(scheduleId, groupIds) {
  if (!scheduleId) throw new Error('Schedule ID is required');
  if (!groupIds || groupIds.length === 0) return { updated: 0 };

  const { data, error } = await supabase
    .from('screen_groups')
    .update({ assigned_schedule_id: scheduleId })
    .in('id', groupIds)
    .select('id, name');

  if (error) throw error;

  // Log activity
  logActivity(
    ACTIONS.SCHEDULE_ASSIGNED,
    RESOURCE_TYPES.SCHEDULE,
    scheduleId,
    `Assigned to ${data?.length || 0} groups`,
    { group_ids: groupIds }
  );

  return { updated: data?.length || 0, groups: data };
}

/**
 * Bulk unassign schedule from multiple screen groups
 * @param {string[]} groupIds - Array of group UUIDs
 */
export async function bulkUnassignScheduleFromGroups(groupIds) {
  if (!groupIds || groupIds.length === 0) return { updated: 0 };

  const { data, error } = await supabase
    .from('screen_groups')
    .update({ assigned_schedule_id: null })
    .in('id', groupIds)
    .select('id, name');

  if (error) throw error;

  // Log activity
  logActivity(
    ACTIONS.SCHEDULE_UNASSIGNED,
    RESOURCE_TYPES.SCREEN_GROUP,
    null,
    `Unassigned schedule from ${data?.length || 0} groups`,
    { group_ids: groupIds }
  );

  return { updated: data?.length || 0, groups: data };
}

// =====================================================
// CAMPAIGN-ENTRY LINKING (US-148)
// =====================================================

/**
 * Get all schedule entries for a campaign
 * @param {string} campaignId - Campaign UUID
 * @returns {Promise<Array>} Array of entries with schedule info
 */
export async function getEntriesForCampaign(campaignId) {
  if (!campaignId) return [];

  const { data, error } = await supabase
    .from('schedule_entries')
    .select(`
      id,
      schedule_id,
      content_type,
      content_id,
      start_date,
      end_date,
      start_time,
      end_time,
      days_of_week,
      priority,
      is_active,
      event_type,
      campaign_id,
      schedules(id, name)
    `)
    .eq('campaign_id', campaignId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Assign a schedule entry to a campaign
 * @param {string} entryId - Schedule entry UUID
 * @param {string|null} campaignId - Campaign UUID (null to remove from campaign)
 * @returns {Promise<Object>} Updated entry
 */
export async function assignEntryToCampaign(entryId, campaignId) {
  if (!entryId) throw new Error('Entry ID is required');

  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ campaign_id: campaignId })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Assigned entry to campaign', { entryId, campaignId });
  return data;
}

/**
 * Bulk assign multiple schedule entries to a campaign
 * @param {string[]} entryIds - Array of schedule entry UUIDs
 * @param {string|null} campaignId - Campaign UUID (null to remove from campaign)
 * @returns {Promise<Array>} Updated entries
 */
export async function bulkAssignEntriesToCampaign(entryIds, campaignId) {
  if (!entryIds || entryIds.length === 0) return [];

  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ campaign_id: campaignId })
    .in('id', entryIds)
    .select();

  if (error) throw error;

  logger.info('Bulk assigned entries to campaign', {
    entryCount: entryIds.length,
    campaignId
  });
  return data || [];
}

/**
 * Get all campaigns with entry counts for picker dropdown
 * @returns {Promise<Array>} Campaigns with entry_count
 */
export async function getCampaignsWithEntryCounts() {
  // Use a subquery to get entry counts since Supabase doesn't support
  // count aggregation on foreign tables directly
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, status, start_at, end_at')
    .order('name', { ascending: true });

  if (campaignsError) throw campaignsError;
  if (!campaigns || campaigns.length === 0) return [];

  // Get entry counts for each campaign
  const { data: entryCounts, error: countError } = await supabase
    .from('schedule_entries')
    .select('campaign_id')
    .not('campaign_id', 'is', null);

  if (countError) throw countError;

  // Build count map
  const countMap = {};
  for (const entry of entryCounts || []) {
    countMap[entry.campaign_id] = (countMap[entry.campaign_id] || 0) + 1;
  }

  // Merge counts into campaigns
  return campaigns.map(campaign => ({
    ...campaign,
    entry_count: countMap[campaign.id] || 0
  }));
}
