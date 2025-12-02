/**
 * Account Plan Service - Subscription and billing management
 *
 * Handles plan changes, subscription queries, and billing operations.
 * For now, this is "fake billing" - actual Stripe integration will come later.
 */
import { supabase } from '../supabase';

/**
 * @typedef {Object} Plan
 * @property {string} id - Plan UUID
 * @property {string} slug - Plan slug (free, starter, pro)
 * @property {string} name - Display name
 * @property {string} description - Plan description
 * @property {number} priceMonthly - Monthly price in cents
 * @property {number|null} maxScreens - Maximum screens allowed
 * @property {number|null} maxMediaAssets - Maximum media assets
 * @property {number|null} maxPlaylists - Maximum playlists
 * @property {number|null} maxLayouts - Maximum layouts
 * @property {number|null} maxSchedules - Maximum schedules
 * @property {string[]} features - Feature list for display
 * @property {boolean} isDefault - Whether this is the default plan
 */

/**
 * @typedef {Object} Subscription
 * @property {string|null} subscriptionId - Subscription UUID (null if no subscription)
 * @property {string} planId - Plan UUID
 * @property {string} planSlug - Plan slug
 * @property {string} planName - Plan display name
 * @property {string} status - Subscription status
 * @property {string|null} trialEndsAt - Trial end date ISO string
 * @property {string|null} currentPeriodEnd - Current period end date ISO string
 * @property {boolean} cancelAtPeriodEnd - Whether subscription will cancel
 * @property {number|null} maxScreens - Maximum screens
 * @property {number|null} maxMediaAssets - Maximum media assets
 * @property {number|null} maxPlaylists - Maximum playlists
 * @property {number|null} maxLayouts - Maximum layouts
 * @property {number|null} maxSchedules - Maximum schedules
 * @property {number} priceMonthly - Monthly price in cents
 * @property {string[]} features - Feature list
 */

/**
 * Fetch all available plans
 * @returns {Promise<Plan[]>}
 */
export async function fetchPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;

  return (data || []).map(plan => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    priceMonthly: plan.price_monthly_cents,
    maxScreens: plan.max_screens,
    maxMediaAssets: plan.max_media_assets,
    maxPlaylists: plan.max_playlists,
    maxLayouts: plan.max_layouts,
    maxSchedules: plan.max_schedules,
    features: plan.features || [],
    isDefault: plan.is_default
  }));
}

/**
 * Get the current user's subscription with plan details
 * @returns {Promise<Subscription>}
 */
export async function getCurrentSubscription() {
  const { data, error } = await supabase.rpc('get_current_subscription');

  if (error) throw error;

  // RPC returns an array, take the first row
  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error('No subscription data returned');
  }

  return {
    subscriptionId: row.subscription_id,
    planId: row.plan_id,
    planSlug: row.plan_slug,
    planName: row.plan_name,
    status: row.status,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    maxScreens: row.max_screens,
    maxMediaAssets: row.max_media_assets,
    maxPlaylists: row.max_playlists,
    maxLayouts: row.max_layouts,
    maxSchedules: row.max_schedules,
    priceMonthly: row.price_monthly_cents,
    features: row.features || []
  };
}

/**
 * Change the user's subscription to a new plan
 * This is a "fake billing" operation for testing purposes.
 * In production, this would integrate with Stripe.
 *
 * @param {'free'|'starter'|'pro'} planSlug - The plan to switch to
 * @returns {Promise<{success: boolean, subscription: Subscription}>}
 */
export async function changePlan(planSlug) {
  const { data, error } = await supabase.rpc('change_subscription_plan', {
    new_plan_slug: planSlug
  });

  if (error) {
    console.error('Error changing plan:', error);
    throw new Error(error.message || 'Failed to change plan');
  }

  // RPC returns an array, take the first row
  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.success) {
    throw new Error('Plan change failed');
  }

  // Fetch the full subscription details
  const subscription = await getCurrentSubscription();

  return {
    success: true,
    subscription
  };
}

/**
 * Calculate days remaining in trial
 * @param {string|null} trialEndsAt - Trial end date ISO string
 * @returns {number|null} - Days remaining, or null if not in trial
 */
export function getTrialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();

  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format price for display
 * @param {number} cents - Price in cents
 * @returns {string} - Formatted price (e.g., "$29")
 */
export function formatPrice(cents) {
  if (cents === 0) return 'Free';

  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(dollars);
}

/**
 * Get human-readable subscription status
 * @param {string} status - Subscription status
 * @returns {{label: string, color: string, description: string}}
 */
export function getStatusInfo(status) {
  const statusMap = {
    trialing: {
      label: 'Trial',
      color: 'blue',
      description: 'Your trial is active'
    },
    active: {
      label: 'Active',
      color: 'green',
      description: 'Your subscription is active'
    },
    past_due: {
      label: 'Past Due',
      color: 'yellow',
      description: 'Payment failed - please update your payment method'
    },
    canceled: {
      label: 'Canceled',
      color: 'red',
      description: 'Your subscription has been canceled'
    },
    expired: {
      label: 'Expired',
      color: 'gray',
      description: 'Your subscription has expired'
    },
    none: {
      label: 'Free',
      color: 'gray',
      description: 'You are on the free plan'
    }
  };

  return statusMap[status] || statusMap.none;
}

/**
 * Check if upgrade is available from current plan
 * @param {string} currentSlug - Current plan slug
 * @param {string} targetSlug - Target plan slug
 * @returns {boolean}
 */
export function canUpgradeTo(currentSlug, targetSlug) {
  const planOrder = { free: 0, starter: 1, pro: 2 };
  return (planOrder[targetSlug] || 0) > (planOrder[currentSlug] || 0);
}

/**
 * Check if downgrade is happening
 * @param {string} currentSlug - Current plan slug
 * @param {string} targetSlug - Target plan slug
 * @returns {boolean}
 */
export function isDowngrade(currentSlug, targetSlug) {
  const planOrder = { free: 0, starter: 1, pro: 2 };
  return (planOrder[targetSlug] || 0) < (planOrder[currentSlug] || 0);
}

/**
 * Format limit value for display
 * @param {number|null} value - Limit value
 * @returns {string}
 */
export function formatLimitValue(value) {
  if (value === null || value === undefined) {
    return 'Unlimited';
  }
  return value.toLocaleString();
}
