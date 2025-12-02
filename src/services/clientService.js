/**
 * Client Service - Manages client accounts for the agency platform
 *
 * Provides functions for:
 * - Fetching list of clients (for super_admin/admin)
 * - Creating new client accounts
 * - Updating client profiles
 * - Getting client statistics (screens, media, etc.)
 *
 * Note: This service is for managing client accounts, not client data.
 * Client data (media, playlists, etc.) is managed via their respective services
 * with owner_id filtering.
 */

import { supabase } from '../supabase';

/**
 * @typedef {Object} ClientProfile
 * @property {string} id - UUID
 * @property {string} email
 * @property {string} full_name
 * @property {string} role - Always 'client'
 * @property {string|null} business_name
 * @property {string|null} branding_logo_url
 * @property {string|null} branding_primary_color
 * @property {string|null} managed_by
 * @property {string|null} created_by
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ClientWithStats
 * @property {ClientProfile} profile
 * @property {object} subscription - Current subscription info
 * @property {object} stats - Usage statistics
 */

/**
 * Fetch all clients accessible to the current user
 * - Super_admin: all clients
 * - Admin: only clients they manage
 *
 * @returns {Promise<{data: ClientProfile[]|null, error: string|null}>}
 */
export async function fetchClients() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get current user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Permission denied' };
    }

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        business_name,
        branding_logo_url,
        branding_primary_color,
        branding_secondary_color,
        branding_is_dark_theme,
        managed_by,
        created_by,
        created_at,
        updated_at,
        last_active_at
      `)
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    // Admin only sees their managed clients
    if (profile.role === 'admin') {
      query = query.eq('managed_by', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('fetchClients error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Fetch clients with their subscription and stats
 *
 * @returns {Promise<{data: ClientWithStats[]|null, error: string|null}>}
 */
export async function fetchClientsWithStats() {
  try {
    const { data: clients, error: clientsError } = await fetchClients();

    if (clientsError || !clients) {
      return { data: null, error: clientsError };
    }

    // Fetch subscriptions for all clients
    const clientIds = clients.map((c) => c.id);

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        owner_id,
        plan_slug,
        status,
        trial_ends_at,
        current_period_end,
        cancel_at_period_end
      `)
      .in('owner_id', clientIds);

    // Create subscription lookup
    const subLookup = {};
    (subscriptions || []).forEach((sub) => {
      subLookup[sub.owner_id] = sub;
    });

    // Fetch screen counts for each client
    const { data: screenCounts } = await supabase
      .from('tv_devices')
      .select('owner_id')
      .in('owner_id', clientIds);

    // Count screens per client
    const screenCountLookup = {};
    (screenCounts || []).forEach((screen) => {
      screenCountLookup[screen.owner_id] = (screenCountLookup[screen.owner_id] || 0) + 1;
    });

    // Fetch media counts
    const { data: mediaCounts } = await supabase
      .from('media_assets')
      .select('owner_id')
      .in('owner_id', clientIds);

    const mediaCountLookup = {};
    (mediaCounts || []).forEach((media) => {
      mediaCountLookup[media.owner_id] = (mediaCountLookup[media.owner_id] || 0) + 1;
    });

    // Combine data
    const clientsWithStats = clients.map((client) => ({
      ...client,
      subscription: subLookup[client.id] || {
        plan_slug: 'free',
        status: 'none',
      },
      stats: {
        screens: screenCountLookup[client.id] || 0,
        media: mediaCountLookup[client.id] || 0,
      },
    }));

    return { data: clientsWithStats, error: null };
  } catch (err) {
    console.error('fetchClientsWithStats error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Get a single client by ID
 *
 * @param {string} clientId
 * @returns {Promise<{data: ClientProfile|null, error: string|null}>}
 */
export async function getClient(clientId) {
  try {
    const { data, error } = await supabase.rpc('get_profile_for_impersonation', {
      target_id: clientId,
    });

    if (error) {
      console.error('Error fetching client:', error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: 'Client not found' };
    }

    return { data: data[0], error: null };
  } catch (err) {
    console.error('getClient error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Create a new client account
 * Creates auth user via edge function or admin API
 *
 * @param {object} data
 * @param {string} data.email - Required
 * @param {string} data.fullName - Required
 * @param {string} data.businessName - Optional
 * @param {string} data.password - Required (temporary password)
 * @param {boolean} data.createDemo - Whether to create demo content
 * @returns {Promise<{data: ClientProfile|null, error: string|null}>}
 */
export async function createClient({ email, fullName, businessName, password, createDemo = false }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get current user's role
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentProfile || !['super_admin', 'admin'].includes(currentProfile.role)) {
      return { data: null, error: 'Permission denied' };
    }

    // Use edge function to create user (since client-side can't create users directly)
    const response = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        businessName,
        managedBy: currentProfile.role === 'admin' ? user.id : null,
        createdBy: user.id,
        createDemo,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error || 'Failed to create client' };
    }

    return { data: result.client, error: null };
  } catch (err) {
    console.error('createClient error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Update a client's profile
 *
 * @param {string} clientId
 * @param {object} data
 * @param {string} data.fullName
 * @param {string} data.businessName
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateClient(clientId, { fullName, businessName }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check permission
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentProfile || !['super_admin', 'admin'].includes(currentProfile.role)) {
      return { success: false, error: 'Permission denied' };
    }

    // For admin, verify they manage this client
    if (currentProfile.role === 'admin') {
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('managed_by')
        .eq('id', clientId)
        .single();

      if (!clientProfile || clientProfile.managed_by !== user.id) {
        return { success: false, error: 'Permission denied' };
      }
    }

    const updateData = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (businessName !== undefined) updateData.business_name = businessName;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('updateClient error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get statistics for a specific client
 *
 * @param {string} clientId
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function getClientStats(clientId) {
  try {
    // Screens count
    const { count: screensCount } = await supabase
      .from('tv_devices')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', clientId);

    // Media count
    const { count: mediaCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', clientId);

    // Playlists count
    const { count: playlistsCount } = await supabase
      .from('playlists')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', clientId);

    // Layouts count
    const { count: layoutsCount } = await supabase
      .from('layouts')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', clientId);

    // Schedules count
    const { count: schedulesCount } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', clientId);

    return {
      data: {
        screens: screensCount || 0,
        media: mediaCount || 0,
        playlists: playlistsCount || 0,
        layouts: layoutsCount || 0,
        schedules: schedulesCount || 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('getClientStats error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Get subscription info for a client
 *
 * @param {string} clientId
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function getClientSubscription(clientId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('owner_id', clientId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return { data: null, error: error.message };
    }

    // If no subscription, return free plan info
    if (!data) {
      return {
        data: {
          plan_slug: 'free',
          status: 'none',
          plan: {
            slug: 'free',
            name: 'Free',
          },
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error('getClientSubscription error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Get the status display string for a subscription
 *
 * @param {object} subscription
 * @returns {string}
 */
export function getSubscriptionStatusDisplay(subscription) {
  if (!subscription || subscription.status === 'none') {
    return 'Free';
  }

  switch (subscription.status) {
    case 'trialing':
      return 'Trial';
    case 'active':
      if (subscription.cancel_at_period_end) {
        return 'Canceling';
      }
      return 'Active';
    case 'past_due':
      return 'Past Due';
    case 'canceled':
      return 'Canceled';
    case 'expired':
      return 'Expired';
    default:
      return subscription.status;
  }
}

/**
 * Get the status badge color for a subscription
 *
 * @param {object} subscription
 * @returns {string} Tailwind color class
 */
export function getSubscriptionStatusColor(subscription) {
  if (!subscription || subscription.status === 'none') {
    return 'bg-gray-100 text-gray-800';
  }

  switch (subscription.status) {
    case 'trialing':
      return 'bg-blue-100 text-blue-800';
    case 'active':
      if (subscription.cancel_at_period_end) {
        return 'bg-yellow-100 text-yellow-800';
      }
      return 'bg-green-100 text-green-800';
    case 'past_due':
      return 'bg-red-100 text-red-800';
    case 'canceled':
    case 'expired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default {
  fetchClients,
  fetchClientsWithStats,
  getClient,
  createClient,
  updateClient,
  getClientStats,
  getClientSubscription,
  getSubscriptionStatusDisplay,
  getSubscriptionStatusColor,
};
