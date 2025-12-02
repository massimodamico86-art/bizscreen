/**
 * Location Service - Handles location/branch management
 *
 * Provides functions for:
 * - Fetching locations for the current tenant
 * - Creating, updating, deleting locations
 * - Getting location stats (screen counts, etc.)
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

/**
 * Fetch all locations for the current tenant
 * Includes screen counts per location
 *
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function fetchLocations() {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { data: [], error: 'No tenant context' };
    }

    const { data, error } = await supabase
      .from('locations')
      .select(`
        id,
        tenant_id,
        name,
        slug,
        address,
        city,
        state,
        country,
        postal_code,
        timezone,
        notes,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.error('fetchLocations error:', error);
      return { data: [], error: error.message };
    }

    // Fetch screen counts per location
    const locationIds = (data || []).map((l) => l.id);

    if (locationIds.length > 0) {
      const { data: screenCounts } = await supabase
        .from('tv_devices')
        .select('location_id')
        .in('location_id', locationIds);

      // Count screens per location
      const countMap = {};
      (screenCounts || []).forEach((s) => {
        if (s.location_id) {
          countMap[s.location_id] = (countMap[s.location_id] || 0) + 1;
        }
      });

      // Merge counts into locations
      const locationsWithCounts = (data || []).map((location) => ({
        ...location,
        screenCount: countMap[location.id] || 0,
      }));

      return { data: locationsWithCounts, error: null };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('fetchLocations error:', err);
    return { data: [], error: err.message };
  }
}

/**
 * Fetch a single location by ID
 *
 * @param {string} locationId
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function fetchLocation(locationId) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('fetchLocation error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Create a new location
 *
 * @param {object} locationData
 * @param {string} locationData.name - Location name
 * @param {string} [locationData.address]
 * @param {string} [locationData.city]
 * @param {string} [locationData.state]
 * @param {string} [locationData.country]
 * @param {string} [locationData.postalCode]
 * @param {string} [locationData.timezone]
 * @param {string} [locationData.notes]
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function createLocation(locationData) {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { data: null, error: 'No tenant context' };
    }

    if (!locationData.name?.trim()) {
      return { data: null, error: 'Location name is required' };
    }

    // Generate slug from name
    const slug = generateSlug(locationData.name);

    const { data, error } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenantId,
        name: locationData.name.trim(),
        slug,
        address: locationData.address?.trim() || null,
        city: locationData.city?.trim() || null,
        state: locationData.state?.trim() || null,
        country: locationData.country?.trim() || null,
        postal_code: locationData.postalCode?.trim() || null,
        timezone: locationData.timezone || null,
        notes: locationData.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('createLocation error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('createLocation error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Update an existing location
 *
 * @param {string} locationId
 * @param {object} updates
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function updateLocation(locationId, updates) {
  try {
    const updateData = {};

    if (updates.name !== undefined) {
      if (!updates.name?.trim()) {
        return { data: null, error: 'Location name is required' };
      }
      updateData.name = updates.name.trim();
      updateData.slug = generateSlug(updates.name);
    }

    if (updates.address !== undefined) updateData.address = updates.address?.trim() || null;
    if (updates.city !== undefined) updateData.city = updates.city?.trim() || null;
    if (updates.state !== undefined) updateData.state = updates.state?.trim() || null;
    if (updates.country !== undefined) updateData.country = updates.country?.trim() || null;
    if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode?.trim() || null;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;

    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (error) {
      console.error('updateLocation error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('updateLocation error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Delete a location
 * Will fail if screens are assigned to this location (optional: set to null first)
 *
 * @param {string} locationId
 * @param {boolean} [reassignScreens=false] - If true, set screens' location_id to null before deleting
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLocation(locationId, reassignScreens = false) {
  try {
    // Check if location has screens
    const { count } = await supabase
      .from('tv_devices')
      .select('id', { count: 'exact' })
      .eq('location_id', locationId);

    if (count > 0) {
      if (reassignScreens) {
        // Unassign screens from this location
        const { error: unassignError } = await supabase
          .from('tv_devices')
          .update({ location_id: null })
          .eq('location_id', locationId);

        if (unassignError) {
          return { success: false, error: `Failed to unassign screens: ${unassignError.message}` };
        }
      } else {
        return {
          success: false,
          error: `Cannot delete location with ${count} assigned screen${count === 1 ? '' : 's'}. Unassign screens first or use the reassign option.`,
        };
      }
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId);

    if (error) {
      console.error('deleteLocation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteLocation error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get location statistics
 * Returns screen counts by location and online/offline breakdown
 *
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function getLocationStats() {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { data: null, error: 'No tenant context' };
    }

    // Fetch all locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name')
      .eq('tenant_id', tenantId);

    if (locError) {
      return { data: null, error: locError.message };
    }

    // Fetch all screens with their status
    const { data: screens, error: screenError } = await supabase
      .from('tv_devices')
      .select('id, location_id, is_online, last_seen')
      .in('listing_id', (
        await supabase
          .from('listings')
          .select('id')
          .eq('owner_id', tenantId)
      ).data?.map((l) => l.id) || []);

    if (screenError) {
      return { data: null, error: screenError.message };
    }

    // Calculate stats per location
    const locationStats = {};
    let unassignedOnline = 0;
    let unassignedOffline = 0;

    (screens || []).forEach((screen) => {
      const isOnline = screen.is_online ?? false;

      if (!screen.location_id) {
        if (isOnline) unassignedOnline++;
        else unassignedOffline++;
        return;
      }

      if (!locationStats[screen.location_id]) {
        locationStats[screen.location_id] = { online: 0, offline: 0, total: 0 };
      }

      locationStats[screen.location_id].total++;
      if (isOnline) {
        locationStats[screen.location_id].online++;
      } else {
        locationStats[screen.location_id].offline++;
      }
    });

    // Merge with location names
    const result = (locations || []).map((loc) => ({
      id: loc.id,
      name: loc.name,
      online: locationStats[loc.id]?.online || 0,
      offline: locationStats[loc.id]?.offline || 0,
      total: locationStats[loc.id]?.total || 0,
    }));

    // Add unassigned
    result.push({
      id: null,
      name: 'Unassigned',
      online: unassignedOnline,
      offline: unassignedOffline,
      total: unassignedOnline + unassignedOffline,
    });

    return { data: result, error: null };
  } catch (err) {
    console.error('getLocationStats error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Assign a screen to a location
 *
 * @param {string} screenId - TV device ID
 * @param {string|null} locationId - Location ID (null to unassign)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function assignScreenToLocation(screenId, locationId) {
  try {
    const { error } = await supabase
      .from('tv_devices')
      .update({ location_id: locationId })
      .eq('id', screenId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('assignScreenToLocation error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get screens for a specific location
 *
 * @param {string|null} locationId - Location ID (null for unassigned)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getScreensByLocation(locationId) {
  try {
    let query = supabase
      .from('tv_devices')
      .select(`
        id,
        device_name,
        is_online,
        last_seen,
        location_id,
        assigned_playlist:playlists(id, name),
        assigned_layout:layouts(id, name)
      `);

    if (locationId === null) {
      query = query.is('location_id', null);
    } else {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.order('device_name');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getScreensByLocation error:', err);
    return { data: [], error: err.message };
  }
}

/**
 * Generate a URL-friendly slug from a name
 * @param {string} name
 * @returns {string}
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Common timezone options
 */
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
];

export default {
  fetchLocations,
  fetchLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationStats,
  assignScreenToLocation,
  getScreensByLocation,
  TIMEZONE_OPTIONS,
};
