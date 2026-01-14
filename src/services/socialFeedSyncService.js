/**
 * Social Feed Sync Service
 *
 * Manages the synchronization of social media feeds.
 * Runs on a schedule to fetch new posts while respecting rate limits.
 */

import { supabase } from '../supabase';
import { syncInstagramPosts } from './social/instagramService';
import { syncFacebookPosts } from './social/facebookService';
import { syncTiktokVideos } from './social/tiktokService';
import { syncGoogleReviews } from './social/googleReviewsService';
import { SOCIAL_PROVIDERS } from './social';
import {
  raiseSocialFeedSyncFailedAlert,
  autoResolveAlert,
  ALERT_TYPES,
} from './alertEngineService';

// Sync configuration
const DEFAULT_SYNC_INTERVAL_MS = 60000; // 1 minute check interval
const DEFAULT_STALE_THRESHOLD_MINUTES = 20;
const MAX_CONCURRENT_SYNCS = 3;
const RATE_LIMIT_COOLDOWN_MS = 60000; // 1 minute cooldown on rate limit

// Provider-specific rate limits (requests per minute)
const PROVIDER_RATE_LIMITS = {
  instagram: 200,
  facebook: 200,
  tiktok: 100,
  google: 100,
};

// State
let syncInterval = null;
let isSyncing = false;
let lastSyncTime = {};
let rateLimitCooldowns = {};

/**
 * Get sync function for a provider
 */
function getSyncFunction(provider) {
  switch (provider) {
    case SOCIAL_PROVIDERS.INSTAGRAM:
      return syncInstagramPosts;
    case SOCIAL_PROVIDERS.FACEBOOK:
      return syncFacebookPosts;
    case SOCIAL_PROVIDERS.TIKTOK:
      return syncTiktokVideos;
    case SOCIAL_PROVIDERS.GOOGLE:
      return syncGoogleReviews;
    default:
      return null;
  }
}

/**
 * Check if provider is in rate limit cooldown
 */
function isInCooldown(provider) {
  const cooldownUntil = rateLimitCooldowns[provider];
  if (!cooldownUntil) return false;
  return Date.now() < cooldownUntil;
}

/**
 * Set rate limit cooldown for provider
 */
function setRateLimitCooldown(provider) {
  rateLimitCooldowns[provider] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  console.warn(`[SocialSync] Rate limit hit for ${provider}, cooling down for 1 minute`);
}

/**
 * Sync a single account
 */
async function syncAccount(account) {
  const provider = account.provider;

  // Check cooldown
  if (isInCooldown(provider)) {
    console.log(`[SocialSync] Skipping ${account.account_name} - provider in cooldown`);
    return { success: false, reason: 'cooldown' };
  }

  const syncFn = getSyncFunction(provider);
  if (!syncFn) {
    console.warn(`[SocialSync] No sync function for provider: ${provider}`);
    return { success: false, reason: 'unknown_provider' };
  }

  try {
    console.log(`[SocialSync] Syncing ${provider} account: ${account.account_name}`);
    const results = await syncFn(account);
    console.log(`[SocialSync] Synced ${results.length} posts for ${account.account_name}`);

    // Update last sync time
    lastSyncTime[account.id] = Date.now();

    // Auto-resolve any open sync failure alerts for this account
    try {
      await autoResolveAlert({
        type: ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED,
        tenantId: account.tenant_id,
        notes: `Social feed sync succeeded for ${account.account_name}`,
      });
    } catch (alertError) {
      console.warn('[SocialSync] Error resolving alert:', alertError);
    }

    return { success: true, postsCount: results.length };
  } catch (error) {
    console.error(`[SocialSync] Error syncing ${account.account_name}:`, error);

    // Raise sync failure alert
    try {
      await raiseSocialFeedSyncFailedAlert(account, error);
    } catch (alertError) {
      console.warn('[SocialSync] Error raising alert:', alertError);
    }

    // Check for rate limit errors
    if (
      error.message?.includes('rate limit') ||
      error.message?.includes('too many requests') ||
      error.code === 429
    ) {
      setRateLimitCooldown(provider);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Run sync cycle for all stale accounts
 */
async function runSyncCycle(staleThresholdMinutes = DEFAULT_STALE_THRESHOLD_MINUTES) {
  if (isSyncing) {
    console.log('[SocialSync] Sync already in progress, skipping');
    return;
  }

  isSyncing = true;

  try {
    // Get accounts needing sync
    const { data: accounts, error } = await supabase.rpc('get_accounts_needing_sync', {
      p_stale_minutes: staleThresholdMinutes,
    });

    if (error) {
      console.error('[SocialSync] Error fetching accounts:', error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[SocialSync] No accounts need syncing');
      return;
    }

    console.log(`[SocialSync] Found ${accounts.length} accounts to sync`);

    // Group accounts by provider to manage rate limits
    const accountsByProvider = accounts.reduce((acc, account) => {
      if (!acc[account.provider]) acc[account.provider] = [];
      acc[account.provider].push(account);
      return acc;
    }, {});

    // Process accounts with concurrency limit
    const syncPromises = [];
    let syncedCount = 0;

    for (const [provider, providerAccounts] of Object.entries(accountsByProvider)) {
      if (isInCooldown(provider)) {
        console.log(`[SocialSync] Skipping ${provider} accounts - in cooldown`);
        continue;
      }

      for (const account of providerAccounts) {
        if (syncedCount >= MAX_CONCURRENT_SYNCS) {
          // Wait for some syncs to complete
          await Promise.race(syncPromises);
          syncPromises.length = Math.max(0, syncPromises.length - 1);
        }

        const syncPromise = syncAccount(account).then((result) => {
          if (result.success) {
            syncedCount++;
          }
          return result;
        });

        syncPromises.push(syncPromise);
      }
    }

    // Wait for all remaining syncs
    await Promise.allSettled(syncPromises);

    console.log(`[SocialSync] Sync cycle complete, synced ${syncedCount} accounts`);
  } catch (error) {
    console.error('[SocialSync] Sync cycle error:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start the sync scheduler
 */
export function startSocialFeedSync(intervalMs = DEFAULT_SYNC_INTERVAL_MS) {
  if (syncInterval) {
    console.warn('[SocialSync] Sync already running');
    return;
  }

  console.log(`[SocialSync] Starting sync scheduler (interval: ${intervalMs}ms)`);

  // Run immediately
  runSyncCycle();

  // Schedule recurring sync
  syncInterval = setInterval(runSyncCycle, intervalMs);

  return syncInterval;
}

/**
 * Stop the sync scheduler
 */
export function stopSocialFeedSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SocialSync] Sync scheduler stopped');
  }
}

/**
 * Force sync for a specific account
 */
export async function forceSyncAccount(accountId) {
  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error('Account not found');
  }

  return syncAccount(account);
}

/**
 * Get sync status for all accounts
 */
export async function getSyncStatus() {
  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('id, provider, account_name, last_sync_at, last_sync_error, is_active')
    .order('last_sync_at', { ascending: false });

  if (error) {
    throw error;
  }

  return accounts.map((account) => ({
    ...account,
    isStale:
      !account.last_sync_at ||
      Date.now() - new Date(account.last_sync_at).getTime() >
        DEFAULT_STALE_THRESHOLD_MINUTES * 60 * 1000,
    inCooldown: isInCooldown(account.provider),
  }));
}

/**
 * Get social feed posts for a widget
 */
export async function getSocialFeedPosts(widgetId, tenantId = null) {
  const { data, error } = await supabase.rpc('get_social_feed_posts', {
    p_widget_id: widgetId,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('[SocialSync] Error fetching feed posts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get cached posts for an account (for offline mode)
 */
export async function getCachedPosts(accountId, limit = 20) {
  const { data, error } = await supabase
    .from('social_feeds')
    .select('*')
    .eq('account_id', accountId)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get all connected accounts for a tenant
 */
export async function getConnectedAccounts(tenantId = null) {
  let query = supabase
    .from('social_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create or update feed widget settings
 */
export async function saveFeedWidgetSettings(settings) {
  const { data, error } = await supabase
    .from('social_feed_settings')
    .upsert(settings, {
      onConflict: 'widget_id',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get feed widget settings
 */
export async function getFeedWidgetSettings(widgetId) {
  const { data, error } = await supabase
    .from('social_feed_settings')
    .select('*')
    .eq('widget_id', widgetId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Update moderation status for a post
 */
export async function moderatePost(feedId, approved, notes = '') {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('social_feed_moderation')
    .upsert({
      feed_id: feedId,
      approved,
      notes,
      moderated_by: user?.id,
      moderated_at: new Date().toISOString(),
    }, {
      onConflict: 'tenant_id,feed_id',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get moderation queue for a tenant
 */
export async function getModerationQueue(accountId = null) {
  let query = supabase
    .from('social_feeds')
    .select(`
      *,
      moderation:social_feed_moderation(approved, moderated_at, notes)
    `)
    .order('posted_at', { ascending: false });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export default {
  startSocialFeedSync,
  stopSocialFeedSync,
  forceSyncAccount,
  getSyncStatus,
  getSocialFeedPosts,
  getCachedPosts,
  getConnectedAccounts,
  saveFeedWidgetSettings,
  getFeedWidgetSettings,
  moderatePost,
  getModerationQueue,
};
