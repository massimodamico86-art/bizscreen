/**
 * Daypart Service
 *
 * Provides CRUD operations for daypart presets and application to schedule entries.
 * Daypart presets are predefined time blocks (e.g., Breakfast 6-10am) that users
 * can quickly apply to schedule entries.
 *
 * Features:
 * - System presets (meal-based and period-based) available to all users
 * - Custom presets that users can create for their specific needs
 * - Apply presets to individual entries or bulk apply to multiple entries
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('DaypartService');

/**
 * Default daypart definitions for reference/fallback
 * These match the system presets seeded in the database
 */
export const DEFAULT_DAYPARTS = {
  meal: [
    { name: 'Breakfast', start_time: '06:00', end_time: '10:00' },
    { name: 'Lunch', start_time: '11:00', end_time: '14:00' },
    { name: 'Dinner', start_time: '17:00', end_time: '21:00' }
  ],
  period: [
    { name: 'Morning', start_time: '06:00', end_time: '12:00' },
    { name: 'Afternoon', start_time: '12:00', end_time: '18:00' },
    { name: 'Evening', start_time: '18:00', end_time: '00:00' },
    { name: 'Night', start_time: '00:00', end_time: '06:00' }
  ]
};

/**
 * Fetch all daypart presets available to the current user
 * Includes system presets and user's custom presets
 *
 * @returns {Promise<Array>} Array of presets ordered by type, then start_time
 */
export async function getDaypartPresets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.warn('getDaypartPresets called without authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('daypart_presets')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${user.id}`)
    .order('preset_type', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    logger.error('Failed to fetch daypart presets', { error: error.message });
    throw error;
  }

  logger.debug('Fetched daypart presets', { count: data?.length || 0 });
  return data || [];
}

/**
 * Create a custom daypart preset for the current user
 *
 * @param {Object} params - Preset parameters
 * @param {string} params.name - Display name for the preset
 * @param {string} params.startTime - Start time in HH:mm format
 * @param {string} params.endTime - End time in HH:mm format
 * @param {number[]} [params.daysOfWeek] - Days of week (0-6), defaults to all days
 * @param {string} [params.presetType='custom'] - Preset type (custom for user-created)
 * @returns {Promise<Object>} Created preset
 */
export async function createDaypartPreset({
  name,
  startTime,
  endTime,
  daysOfWeek = [0, 1, 2, 3, 4, 5, 6],
  presetType = 'custom'
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create presets');
  }

  if (!name || !startTime || !endTime) {
    throw new Error('Name, start time, and end time are required');
  }

  const { data, error } = await supabase
    .from('daypart_presets')
    .insert({
      tenant_id: user.id,
      name,
      preset_type: presetType,
      start_time: startTime,
      end_time: endTime,
      days_of_week: daysOfWeek,
      is_system: false
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create daypart preset', { error: error.message, name });
    throw error;
  }

  logger.info('Created daypart preset', { name, presetType, presetId: data.id });
  return data;
}

/**
 * Update a custom daypart preset
 * Only non-system presets owned by the user can be updated
 *
 * @param {string} presetId - Preset UUID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.startTime] - New start time
 * @param {string} [updates.endTime] - New end time
 * @param {number[]} [updates.daysOfWeek] - New days of week
 * @returns {Promise<Object>} Updated preset
 */
export async function updateDaypartPreset(presetId, updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update presets');
  }

  const filteredUpdates = {};
  if (updates.name !== undefined) filteredUpdates.name = updates.name;
  if (updates.startTime !== undefined) filteredUpdates.start_time = updates.startTime;
  if (updates.endTime !== undefined) filteredUpdates.end_time = updates.endTime;
  if (updates.daysOfWeek !== undefined) filteredUpdates.days_of_week = updates.daysOfWeek;

  const { data, error } = await supabase
    .from('daypart_presets')
    .update(filteredUpdates)
    .eq('id', presetId)
    .eq('tenant_id', user.id)
    .eq('is_system', false)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update daypart preset', { error: error.message, presetId });
    throw error;
  }

  logger.info('Updated daypart preset', { presetId });
  return data;
}

/**
 * Delete a custom daypart preset
 * Only non-system presets owned by the user can be deleted
 *
 * @param {string} presetId - Preset UUID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteDaypartPreset(presetId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to delete presets');
  }

  const { error } = await supabase
    .from('daypart_presets')
    .delete()
    .eq('id', presetId)
    .eq('tenant_id', user.id)
    .eq('is_system', false);

  if (error) {
    logger.error('Failed to delete daypart preset', { error: error.message, presetId });
    throw error;
  }

  logger.info('Deleted daypart preset', { presetId });
  return true;
}

/**
 * Apply a daypart preset to a schedule entry
 * Copies the preset's start_time, end_time, and days_of_week to the entry
 *
 * @param {string} entryId - Schedule entry UUID
 * @param {string} presetId - Daypart preset UUID
 * @returns {Promise<Object>} Updated schedule entry
 */
export async function applyDaypartToEntry(entryId, presetId) {
  // First fetch the preset
  const { data: preset, error: presetError } = await supabase
    .from('daypart_presets')
    .select('start_time, end_time, days_of_week')
    .eq('id', presetId)
    .single();

  if (presetError) {
    logger.error('Failed to fetch preset for application', { error: presetError.message, presetId });
    throw presetError;
  }

  if (!preset) {
    throw new Error('Preset not found');
  }

  // Update the schedule entry with preset values
  const { data: entry, error: entryError } = await supabase
    .from('schedule_entries')
    .update({
      start_time: preset.start_time,
      end_time: preset.end_time,
      days_of_week: preset.days_of_week
    })
    .eq('id', entryId)
    .select()
    .single();

  if (entryError) {
    logger.error('Failed to apply daypart to entry', { error: entryError.message, entryId, presetId });
    throw entryError;
  }

  logger.info('Applied daypart to entry', { entryId, presetId });
  return entry;
}

/**
 * Bulk apply a daypart preset to multiple schedule entries
 *
 * @param {string[]} entryIds - Array of schedule entry UUIDs
 * @param {string} presetId - Daypart preset UUID
 * @returns {Promise<{count: number}>} Count of updated entries
 */
export async function bulkApplyDaypart(entryIds, presetId) {
  if (!entryIds || entryIds.length === 0) {
    return { count: 0 };
  }

  // First fetch the preset
  const { data: preset, error: presetError } = await supabase
    .from('daypart_presets')
    .select('start_time, end_time, days_of_week')
    .eq('id', presetId)
    .single();

  if (presetError) {
    logger.error('Failed to fetch preset for bulk application', { error: presetError.message, presetId });
    throw presetError;
  }

  if (!preset) {
    throw new Error('Preset not found');
  }

  // Update all entries with preset values
  const { data, error: entryError } = await supabase
    .from('schedule_entries')
    .update({
      start_time: preset.start_time,
      end_time: preset.end_time,
      days_of_week: preset.days_of_week
    })
    .in('id', entryIds)
    .select('id');

  if (entryError) {
    logger.error('Failed to bulk apply daypart', { error: entryError.message, entryCount: entryIds.length, presetId });
    throw entryError;
  }

  const count = data?.length || 0;
  logger.info('Bulk applied daypart', { entryCount: count, presetId });
  return { count };
}

/**
 * Get presets grouped by type for UI display
 *
 * @returns {Promise<Object>} Presets grouped by preset_type
 */
export async function getDaypartPresetsGrouped() {
  const presets = await getDaypartPresets();

  const grouped = {
    meal: [],
    period: [],
    custom: []
  };

  for (const preset of presets) {
    if (grouped[preset.preset_type]) {
      grouped[preset.preset_type].push(preset);
    }
  }

  return grouped;
}
