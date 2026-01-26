/**
 * Campaign Analytics Service
 *
 * Frontend service for fetching campaign-level analytics.
 * Follows existing analyticsService.js patterns.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { createScopedLogger } from './loggingService';
import { getDateRange, DATE_RANGES } from './analyticsService';

const logger = createScopedLogger('CampaignAnalyticsService');

// Re-export date utilities for consistent API
export { DATE_RANGES, getDateRange };

/**
 * Get analytics for all campaigns or a specific campaign
 * @param {string} dateRange - Date range preset (e.g., '7d', '30d', '90d')
 * @param {string|null} campaignId - Optional campaign ID to filter
 * @returns {Promise<Array>} Campaign analytics data
 */
export async function getCampaignAnalytics(dateRange = '7d', campaignId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) {
    logger.warn('No tenant context for campaign analytics');
    return [];
  }

  const { fromTs, toTs } = getDateRange(dateRange);

  logger.debug('Fetching campaign analytics', { tenantId, dateRange, campaignId });

  const { data, error } = await supabase.rpc('get_campaign_analytics', {
    p_tenant_id: tenantId,
    p_campaign_id: campaignId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
  });

  if (error) {
    logger.error('Failed to fetch campaign analytics', { error, dateRange, campaignId });
    return [];
  }

  return data || [];
}

/**
 * Get rotation stats for a campaign (how content actually played vs configured weights)
 * @param {string} campaignId - Campaign UUID
 * @param {string} dateRange - Date range preset (e.g., '7d', '30d')
 * @returns {Promise<Array>} Rotation stats with actual vs expected percentages
 */
export async function getCampaignRotationStats(campaignId, dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) {
    logger.warn('No tenant context for rotation stats');
    return [];
  }

  const { fromTs, toTs } = getDateRange(dateRange);

  logger.debug('Fetching campaign rotation stats', { campaignId, dateRange });

  // Get playback events for this campaign grouped by content
  const { data: playbackData, error: playbackError } = await supabase
    .from('playback_events')
    .select('content_type, content_id, duration_seconds')
    .eq('campaign_id', campaignId)
    .gte('started_at', fromTs)
    .lte('started_at', toTs);

  if (playbackError) {
    logger.error('Failed to fetch rotation stats', { error: playbackError, campaignId });
    return [];
  }

  // Get campaign contents with configured weights
  const { data: contentsData, error: contentsError } = await supabase
    .from('campaign_contents')
    .select('id, content_type, content_id, weight, position')
    .eq('campaign_id', campaignId)
    .order('position');

  if (contentsError) {
    logger.error('Failed to fetch campaign contents', { error: contentsError, campaignId });
    return [];
  }

  // Calculate total weight for percentage calculation
  const totalWeight = contentsData.reduce((sum, c) => sum + (c.weight || 1), 0);

  // Calculate actual play counts per content
  const actualCounts = {};
  let totalPlays = 0;
  (playbackData || []).forEach((event) => {
    const key = `${event.content_type}:${event.content_id}`;
    actualCounts[key] = (actualCounts[key] || 0) + 1;
    totalPlays++;
  });

  // Build comparison data
  return contentsData.map((content) => {
    const key = `${content.content_type}:${content.content_id}`;
    const actualCount = actualCounts[key] || 0;
    const expectedPercent = Math.round(((content.weight || 1) / totalWeight) * 100);
    const actualPercent = totalPlays > 0 ? Math.round((actualCount / totalPlays) * 100) : 0;

    return {
      contentId: content.content_id,
      contentType: content.content_type,
      weight: content.weight || 1,
      position: content.position,
      expectedPercent,
      actualPercent,
      actualCount,
      deviation: actualPercent - expectedPercent,
    };
  });
}

/**
 * Get single campaign analytics (convenience wrapper)
 * @param {string} campaignId - Campaign UUID
 * @param {string} dateRange - Date range preset
 * @returns {Promise<Object|null>} Analytics for the campaign or null
 */
export async function getSingleCampaignAnalytics(campaignId, dateRange = '7d') {
  const data = await getCampaignAnalytics(dateRange, campaignId);
  return data.length > 0 ? data[0] : null;
}
