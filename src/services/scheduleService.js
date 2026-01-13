// Schedule Service - CRUD operations for time-based content scheduling
import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';

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
        repeat_config
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
 */
export async function createScheduleEntry(scheduleId, entryData = {}) {
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
 */
export async function updateScheduleEntry(entryId, updates) {
  const allowedFields = [
    'target_type', 'target_id', 'content_type', 'content_id',
    'start_date', 'end_date', 'start_time', 'end_time',
    'days_of_week', 'priority', 'is_active',
    'event_type', 'repeat_type', 'repeat_config'
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
    .select('id, name, business_type, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Create a schedule with initial scene entries
 * @param {Object} scheduleData - Schedule data with entries
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
