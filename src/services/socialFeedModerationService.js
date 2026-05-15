/**
 * Social Feed Moderation Service
 *
 * Data access layer for the Social Feed Moderation Queue UI.
 * - fetchPendingModerationItems(): lists social_feeds rows that have
 *   no row in social_feed_moderation for the current tenant.
 * - approveModerationItem(feedId): upserts a moderation row with approved=true.
 * - rejectModerationItem(feedId): upserts a moderation row with approved=false.
 *
 * Tenant scoping mirrors src/services/social/* — we pass tenant_id explicitly
 * and rely on the existing RLS policies on social_feed_moderation
 * (migration 081 lines 185-192).
 */
import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

/**
 * Fetches social_feeds rows that have no matching social_feed_moderation row
 * for the current tenant (i.e., pending moderation items).
 *
 * @returns {Promise<Array>} Array of feed items awaiting moderation
 */
export async function fetchPendingModerationItems() {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) {
    console.warn('[socialFeedModerationService] No owner id; returning empty list.');
    return [];
  }

  // Left join social_feed_moderation via PostgREST embedding; keep only rows
  // where the moderation row is absent (i.e., moderation.id IS NULL → pending).
  const { data, error } = await supabase
    .from('social_feeds')
    .select(`
      id,
      provider,
      content_text,
      media_url,
      media_type,
      thumbnail_url,
      permalink,
      author_name,
      author_avatar,
      posted_at,
      created_at,
      moderation:social_feed_moderation!left(id)
    `)
    .eq('tenant_id', ownerId)
    .is('moderation.id', null)
    .order('posted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending moderation items: ${error.message}`);
  }

  // Defensive post-filter: strip any rows that have a non-null moderation entry
  // (guards against PostgREST silently ignoring the embedded-resource IS NULL
  // filter on older server/client versions — WR-02). Then strip the embedded
  // `moderation` key before returning — callers only need the feed shape.
  return (data || [])
    .filter((row) => row.moderation === null || row.moderation?.id == null)
    .map(({ moderation, ...rest }) => rest);
}

/**
 * Approves a social feed item by upserting a moderation row with approved=true.
 *
 * @param {string} feedId - The social_feeds.id to approve
 * @returns {Promise<Object>} The upserted moderation row
 */
export async function approveModerationItem(feedId) {
  return upsertModeration(feedId, true);
}

/**
 * Rejects a social feed item by upserting a moderation row with approved=false.
 *
 * @param {string} feedId - The social_feeds.id to reject
 * @returns {Promise<Object>} The upserted moderation row
 */
export async function rejectModerationItem(feedId) {
  return upsertModeration(feedId, false);
}

/**
 * Shared internal helper for approve/reject operations.
 *
 * @param {string} feedId - The social_feeds.id to moderate
 * @param {boolean} approved - true for approve, false for reject
 * @returns {Promise<Object>} The upserted moderation row
 */
async function upsertModeration(feedId, approved) {
  if (!feedId) {
    throw new Error('feedId is required');
  }
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) {
    throw new Error('No authenticated tenant context');
  }
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  if (authError) {
    // Surface auth failures so a stale session doesn't silently drop the
    // audit trail (moderated_by would otherwise be null) — WR-03.
    console.warn('[socialFeedModerationService] auth.getUser failed:', authError.message);
  }
  const moderatedBy = userResult?.user?.id ?? null;

  const { data, error } = await supabase
    .from('social_feed_moderation')
    .upsert(
      {
        tenant_id: ownerId,
        feed_id: feedId,
        approved,
        moderated_by: moderatedBy,
      },
      { onConflict: 'tenant_id,feed_id' }
    )
    .select()
    .single();

  if (error) {
    const verb = approved ? 'approve' : 'reject';
    throw new Error(`Failed to ${verb} moderation item: ${error.message}`);
  }
  return data;
}
