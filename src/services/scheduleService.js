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
  MEDIA: 'media'
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
        days_of_week,
        start_time,
        end_time,
        priority,
        is_active
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
 * Fetch schedule with entries and resolved target info (playlist/layout/media names)
 */
export async function fetchScheduleWithEntriesResolved(id) {
  const schedule = await fetchScheduleWithEntries(id);
  if (!schedule || !schedule.schedule_entries) return schedule;

  // Collect unique target IDs by type
  const playlistIds = [];
  const layoutIds = [];
  const mediaIds = [];

  for (const entry of schedule.schedule_entries) {
    if (entry.target_type === TARGET_TYPES.PLAYLIST && entry.target_id) {
      playlistIds.push(entry.target_id);
    } else if (entry.target_type === TARGET_TYPES.LAYOUT && entry.target_id) {
      layoutIds.push(entry.target_id);
    } else if (entry.target_type === TARGET_TYPES.MEDIA && entry.target_id) {
      mediaIds.push(entry.target_id);
    }
  }

  // Fetch all related items in parallel
  const [playlistsResult, layoutsResult, mediaResult] = await Promise.all([
    playlistIds.length > 0
      ? supabase.from('playlists').select('id, name').in('id', playlistIds)
      : { data: [] },
    layoutIds.length > 0
      ? supabase.from('layouts').select('id, name').in('id', layoutIds)
      : { data: [] },
    mediaIds.length > 0
      ? supabase.from('media_assets').select('id, name, type, thumbnail_url').in('id', mediaIds)
      : { data: [] }
  ]);

  // Create lookup maps
  const playlistMap = Object.fromEntries((playlistsResult.data || []).map(p => [p.id, p]));
  const layoutMap = Object.fromEntries((layoutsResult.data || []).map(l => [l.id, l]));
  const mediaMap = Object.fromEntries((mediaResult.data || []).map(m => [m.id, m]));

  // Enrich entries with target info
  schedule.schedule_entries = schedule.schedule_entries.map(entry => {
    let target = null;
    if (entry.target_type === TARGET_TYPES.PLAYLIST) {
      target = playlistMap[entry.target_id];
    } else if (entry.target_type === TARGET_TYPES.LAYOUT) {
      target = layoutMap[entry.target_id];
    } else if (entry.target_type === TARGET_TYPES.MEDIA) {
      target = mediaMap[entry.target_id];
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
  const data = {
    schedule_id: scheduleId,
    target_type: entryData.target_type || TARGET_TYPES.PLAYLIST,
    target_id: entryData.target_id || null,
    days_of_week: entryData.days_of_week || [1, 2, 3, 4, 5], // Default weekdays
    start_time: entryData.start_time || '09:00',
    end_time: entryData.end_time || '17:00',
    priority: entryData.priority ?? 0,
    is_active: entryData.is_active ?? true
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
    'target_type', 'target_id', 'days_of_week',
    'start_time', 'end_time', 'priority', 'is_active'
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
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
