// Campaign Service - CRUD operations for campaigns
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('CampaignService');

/**
 * Campaign statuses
 */
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused'
};

/**
 * Target types for campaigns
 */
export const TARGET_TYPES = {
  SCREEN: 'screen',
  SCREEN_GROUP: 'screen_group',
  LOCATION: 'location',
  ALL: 'all'
};

/**
 * Content types for campaigns
 */
export const CONTENT_TYPES = {
  PLAYLIST: 'playlist',
  LAYOUT: 'layout',
  MEDIA: 'media'
};

/**
 * Fetch all campaigns for the current tenant
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status
 * @param {string} options.search - Search by name
 * @returns {Promise<Array>} Campaigns with stats
 */
export async function fetchCampaigns({ status = null, search = '' } = {}) {
  let query = supabase
    .from('v_campaigns_with_stats')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a single campaign with full details
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign with targets and contents
 */
export async function getCampaign(id) {
  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campaignError) throw campaignError;

  // Get targets with resolved names
  const { data: targets, error: targetsError } = await supabase
    .from('campaign_targets')
    .select('*')
    .eq('campaign_id', id);

  if (targetsError) throw targetsError;

  // Resolve target names
  const resolvedTargets = await Promise.all(
    (targets || []).map(async (target) => {
      let targetName = 'Unknown';

      if (target.target_type === 'all') {
        targetName = 'All Screens';
      } else if (target.target_type === 'screen' && target.target_id) {
        const { data } = await supabase
          .from('tv_devices')
          .select('name')
          .eq('id', target.target_id)
          .single();
        targetName = data?.name || 'Unknown Screen';
      } else if (target.target_type === 'screen_group' && target.target_id) {
        const { data } = await supabase
          .from('screen_groups')
          .select('name')
          .eq('id', target.target_id)
          .single();
        targetName = data?.name || 'Unknown Group';
      } else if (target.target_type === 'location' && target.target_id) {
        const { data } = await supabase
          .from('locations')
          .select('name')
          .eq('id', target.target_id)
          .single();
        targetName = data?.name || 'Unknown Location';
      }

      return { ...target, target_name: targetName };
    })
  );

  // Get contents with resolved names
  const { data: contents, error: contentsError } = await supabase
    .from('campaign_contents')
    .select('*')
    .eq('campaign_id', id)
    .order('position', { ascending: true });

  if (contentsError) throw contentsError;

  // Resolve content names
  const resolvedContents = await Promise.all(
    (contents || []).map(async (content) => {
      let contentName = 'Unknown';

      if (content.content_type === 'playlist' && content.content_id) {
        const { data } = await supabase
          .from('playlists')
          .select('name')
          .eq('id', content.content_id)
          .single();
        contentName = data?.name || 'Unknown Playlist';
      } else if (content.content_type === 'layout' && content.content_id) {
        const { data } = await supabase
          .from('layouts')
          .select('name')
          .eq('id', content.content_id)
          .single();
        contentName = data?.name || 'Unknown Layout';
      } else if (content.content_type === 'media' && content.content_id) {
        const { data } = await supabase
          .from('media_assets')
          .select('name')
          .eq('id', content.content_id)
          .single();
        contentName = data?.name || 'Unknown Media';
      }

      return { ...content, content_name: contentName };
    })
  );

  return {
    ...campaign,
    targets: resolvedTargets,
    contents: resolvedContents
  };
}

/**
 * Create a new campaign
 * @param {Object} data - Campaign data
 * @returns {Promise<Object>} Created campaign
 */
export async function createCampaign({
  name,
  description = '',
  status = CAMPAIGN_STATUS.DRAFT,
  startAt = null,
  endAt = null,
  priority = 100
}) {
  if (!name?.trim()) throw new Error('Name is required');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, managed_tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.managed_tenant_id || user.id;

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      status,
      start_at: startAt,
      end_at: endAt,
      priority,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a campaign
 * @param {string} id - Campaign ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated campaign
 */
export async function updateCampaign(id, updates) {
  const fieldMapping = {
    name: 'name',
    description: 'description',
    status: 'status',
    startAt: 'start_at',
    endAt: 'end_at',
    priority: 'priority'
  };

  const filteredUpdates = {};
  for (const [key, dbKey] of Object.entries(fieldMapping)) {
    if (key in updates) {
      filteredUpdates[dbKey] = updates[key];
    }
  }

  // Also accept snake_case directly
  for (const key of ['start_at', 'end_at']) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteCampaign(id) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Update campaign status
 * @param {string} id - Campaign ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated campaign
 */
export async function updateCampaignStatus(id, status) {
  return updateCampaign(id, { status });
}

/**
 * Activate a campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Updated campaign
 */
export async function activateCampaign(id) {
  // Get campaign to check start_at
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('start_at')
    .eq('id', id)
    .single();

  const now = new Date();
  const startAt = campaign?.start_at ? new Date(campaign.start_at) : null;

  // If start_at is in the future, set as scheduled; otherwise active
  const status = (startAt && startAt > now)
    ? CAMPAIGN_STATUS.SCHEDULED
    : CAMPAIGN_STATUS.ACTIVE;

  return updateCampaignStatus(id, status);
}

/**
 * Pause a campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Updated campaign
 */
export async function pauseCampaign(id) {
  return updateCampaignStatus(id, CAMPAIGN_STATUS.PAUSED);
}

// ============================================================================
// CAMPAIGN TARGETS
// ============================================================================

/**
 * Add a target to a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} targetType - Target type (screen, screen_group, location, all)
 * @param {string} targetId - Target ID (null for 'all')
 * @returns {Promise<Object>} Created target
 */
export async function addTarget(campaignId, targetType, targetId = null) {
  // Validate
  if (!Object.values(TARGET_TYPES).includes(targetType)) {
    throw new Error('Invalid target type');
  }

  if (targetType !== 'all' && !targetId) {
    throw new Error('Target ID required for non-all targets');
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('campaign_targets')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('target_type', targetType)
    .eq('target_id', targetType === 'all' ? null : targetId)
    .maybeSingle();

  if (existing) {
    throw new Error('Target already exists');
  }

  const { data, error } = await supabase
    .from('campaign_targets')
    .insert({
      campaign_id: campaignId,
      target_type: targetType,
      target_id: targetType === 'all' ? null : targetId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a target from a campaign
 * @param {string} targetId - Campaign target ID
 * @returns {Promise<boolean>} Success
 */
export async function removeTarget(targetId) {
  const { error } = await supabase
    .from('campaign_targets')
    .delete()
    .eq('id', targetId);

  if (error) throw error;
  return true;
}

/**
 * Get targets for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Array>} Targets
 */
export async function getTargets(campaignId) {
  const { data, error } = await supabase
    .from('campaign_targets')
    .select('*')
    .eq('campaign_id', campaignId);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// CAMPAIGN CONTENTS
// ============================================================================

/**
 * Add content to a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} contentType - Content type (playlist, layout, media)
 * @param {string} contentId - Content ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Created content
 */
export async function addContent(campaignId, contentType, contentId, { weight = 1, position = 0 } = {}) {
  // Validate
  if (!Object.values(CONTENT_TYPES).includes(contentType)) {
    throw new Error('Invalid content type');
  }

  // Get next position if not specified
  if (position === 0) {
    const { data: existing } = await supabase
      .from('campaign_contents')
      .select('position')
      .eq('campaign_id', campaignId)
      .order('position', { ascending: false })
      .limit(1);

    position = existing?.[0]?.position ? existing[0].position + 1 : 0;
  }

  const { data, error } = await supabase
    .from('campaign_contents')
    .insert({
      campaign_id: campaignId,
      content_type: contentType,
      content_id: contentId,
      weight,
      position
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove content from a campaign
 * @param {string} contentId - Campaign content ID
 * @returns {Promise<boolean>} Success
 */
export async function removeContent(contentId) {
  const { error } = await supabase
    .from('campaign_contents')
    .delete()
    .eq('id', contentId);

  if (error) throw error;
  return true;
}

/**
 * Update content weight or position
 * @param {string} contentId - Campaign content ID
 * @param {Object} updates - Updates (weight, position)
 * @returns {Promise<Object>} Updated content
 */
export async function updateContent(contentId, updates) {
  const { data, error } = await supabase
    .from('campaign_contents')
    .update(updates)
    .eq('id', contentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get contents for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Array>} Contents
 */
export async function getContents(campaignId) {
  const { data, error } = await supabase
    .from('campaign_contents')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Reorder campaign contents
 * @param {string} campaignId - Campaign ID
 * @param {Array} orderedIds - Array of content IDs in new order
 * @returns {Promise<boolean>} Success
 */
export async function reorderContents(campaignId, orderedIds) {
  // Update each content's position
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('campaign_contents')
      .update({ position: update.position })
      .eq('id', update.id)
      .eq('campaign_id', campaignId);

    if (error) throw error;
  }

  return true;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get campaign playback statistics
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Campaign stats
 */
export async function getCampaignStats(startDate = null, endDate = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, managed_tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.managed_tenant_id || user.id;

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await supabase.rpc('get_campaign_playback_stats', {
    p_tenant_id: tenantId,
    p_start_date: start.toISOString().split('T')[0],
    p_end_date: end.toISOString().split('T')[0]
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get campaign options for dropdowns
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Campaigns as {value, label}
 */
export async function getCampaignOptions(status = null) {
  let query = supabase
    .from('campaigns')
    .select('id, name, status')
    .order('name', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(c => ({
    value: c.id,
    label: c.name,
    status: c.status
  }));
}

export default {
  CAMPAIGN_STATUS,
  TARGET_TYPES,
  CONTENT_TYPES,
  fetchCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignStatus,
  activateCampaign,
  pauseCampaign,
  addTarget,
  removeTarget,
  getTargets,
  addContent,
  removeContent,
  updateContent,
  getContents,
  reorderContents,
  getCampaignStats,
  getCampaignOptions
};
