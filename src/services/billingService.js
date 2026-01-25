/**
 * Billing Service - Frontend Stripe Integration
 *
 * Provides functions for:
 * - Creating Stripe Checkout sessions (upgrades)
 * - Creating Stripe Billing Portal sessions (manage subscription)
 * - Mapping subscription status to UI state
 */
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('BillingService');

/**
 * Get the current session token for API authentication
 * @returns {Promise<string|null>}
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Start Stripe Checkout for upgrading to a paid plan
 * @param {'starter'|'pro'} planSlug - The plan to upgrade to
 * @returns {Promise<void>} - Redirects to Stripe Checkout
 */
export async function startCheckout(planSlug) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ planSlug }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  if (!data.url) {
    throw new Error('No checkout URL returned');
  }

  // Redirect to Stripe Checkout
  window.location.href = data.url;
}

/**
 * Open Stripe Billing Portal for managing subscription
 * @returns {Promise<void>} - Redirects to Stripe Billing Portal
 */
export async function openBillingPortal() {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create portal session');
  }

  if (!data.url) {
    throw new Error('No portal URL returned');
  }

  // Redirect to Stripe Billing Portal
  window.location.href = data.url;
}

/**
 * @typedef {Object} SubscriptionUiState
 * @property {'free'|'trialing'|'active'|'past_due'|'canceled'|'expired'} state
 * @property {string} message - User-friendly message about their subscription
 * @property {string} [renewalDate] - Next billing date (if applicable)
 * @property {string} [trialEndDate] - Trial end date (if applicable)
 * @property {number} [trialDaysLeft] - Days remaining in trial
 * @property {boolean} canUpgrade - Whether user can upgrade
 * @property {boolean} canManageBilling - Whether user can access billing portal
 * @property {boolean} showWarning - Whether to show a warning banner
 * @property {string} [warningMessage] - Warning message (if any)
 */

/**
 * Map subscription data to UI state
 * @param {object} subscription - Subscription data from getCurrentSubscription()
 * @returns {SubscriptionUiState}
 */
export function mapSubscriptionToUiState(subscription) {
  const state = {
    state: subscription?.status || 'free',
    message: '',
    canUpgrade: true,
    canManageBilling: false,
    showWarning: false,
    warningMessage: null,
  };

  // Calculate trial days if applicable
  if (subscription?.trialEndsAt) {
    const trialEnd = new Date(subscription.trialEndsAt);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      state.trialDaysLeft = daysLeft;
      state.trialEndDate = trialEnd.toLocaleDateString();
    }
  }

  // Format renewal date if applicable
  if (subscription?.currentPeriodEnd) {
    state.renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString();
  }

  // Determine if user has a Stripe subscription (can manage billing)
  // This is inferred from having a paid plan with active/trialing/past_due status
  const isPaid = subscription?.planSlug !== 'free' &&
    ['active', 'trialing', 'past_due'].includes(subscription?.status);
  state.canManageBilling = isPaid;

  // Set messages based on status
  switch (subscription?.status) {
    case 'none':
    case 'free':
      state.state = 'free';
      state.message = 'You are on the Free plan. Upgrade to unlock more screens and media.';
      state.canUpgrade = true;
      break;

    case 'trialing':
      state.state = 'trialing';
      if (state.trialDaysLeft) {
        state.message = `You are on a trial of the ${subscription.planName} plan. ${state.trialDaysLeft} day${state.trialDaysLeft !== 1 ? 's' : ''} remaining.`;
      } else {
        state.message = `You are trialing the ${subscription.planName} plan.`;
      }
      state.canUpgrade = subscription.planSlug !== 'pro';
      break;

    case 'active':
      state.state = 'active';
      if (subscription.cancelAtPeriodEnd) {
        state.message = `Your ${subscription.planName} subscription will end on ${state.renewalDate}.`;
        state.showWarning = true;
        state.warningMessage = 'Your subscription is set to cancel. You can reactivate it in the billing portal.';
      } else if (state.renewalDate) {
        state.message = `Your ${subscription.planName} subscription renews on ${state.renewalDate}.`;
      } else {
        state.message = `You are subscribed to the ${subscription.planName} plan.`;
      }
      state.canUpgrade = subscription.planSlug !== 'pro';
      break;

    case 'past_due':
      state.state = 'past_due';
      state.message = `Your ${subscription.planName} subscription payment failed.`;
      state.showWarning = true;
      state.warningMessage = 'We had trouble processing your payment. Please update your payment method in the billing portal to avoid service interruption.';
      state.canUpgrade = false;
      break;

    case 'canceled':
      state.state = 'canceled';
      state.message = 'Your subscription has been canceled. You are now on the Free plan.';
      state.canUpgrade = true;
      state.canManageBilling = false;
      break;

    case 'expired':
      state.state = 'expired';
      state.message = 'Your subscription has expired. You are now on the Free plan.';
      state.canUpgrade = true;
      state.canManageBilling = false;
      break;

    default:
      state.message = 'Manage your subscription and view usage limits.';
  }

  return state;
}

/**
 * Check if checkout was successful (from URL params)
 * @returns {{success: boolean, sessionId?: string, canceled?: boolean}}
 */
export function checkCheckoutResult() {
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // Check for session_id (successful checkout)
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    return { success: true, sessionId };
  }

  // Check for canceled flag
  const canceled = urlParams.get('canceled');
  if (canceled === '1') {
    return { success: false, canceled: true };
  }

  // Also check hash params (for SPA routing)
  if (hash.includes('session_id=')) {
    const hashParams = new URLSearchParams(hash.split('?')[1] || '');
    const hashSessionId = hashParams.get('session_id');
    if (hashSessionId) {
      return { success: true, sessionId: hashSessionId };
    }
  }

  if (hash.includes('canceled=1')) {
    return { success: false, canceled: true };
  }

  return { success: false };
}

/**
 * Clear checkout result from URL (after showing message)
 */
export function clearCheckoutResult() {
  // Remove query params and hash params related to checkout
  const url = new URL(window.location.href);
  url.searchParams.delete('session_id');
  url.searchParams.delete('canceled');

  // Clean the hash
  let hash = window.location.hash;
  if (hash.includes('?')) {
    hash = hash.split('?')[0];
  }

  window.history.replaceState(null, '', url.pathname + hash);
}

// =====================================================
// TENANT LIFECYCLE MANAGEMENT (Phase 24)
// =====================================================

/**
 * @typedef {Object} TenantLifecycleStatus
 * @property {string} ownerId - Owner UUID
 * @property {string} email - Owner email
 * @property {string} planSlug - Current plan slug
 * @property {string} planName - Current plan display name
 * @property {string} status - Subscription status
 * @property {string|null} trialEndsAt - ISO timestamp when trial ends
 * @property {number|null} trialDaysLeft - Days remaining in trial
 * @property {boolean} isTrialExpired - Whether trial has expired
 * @property {string|null} suspendedAt - ISO timestamp when suspended
 * @property {string|null} suspensionReason - Reason for suspension
 * @property {string|null} overdueSince - ISO timestamp when payment became overdue
 * @property {number|null} overdueDays - Days payment is overdue
 * @property {boolean} frozenReadonly - Whether account is in read-only mode
 * @property {boolean} canCreateContent - Whether user can create new content
 * @property {string|null} billingWarning - Warning message to display
 */

/**
 * Get current tenant lifecycle status
 * @returns {Promise<TenantLifecycleStatus>}
 */
export async function getTenantLifecycleStatus() {
  const { data, error } = await supabase.rpc('get_tenant_lifecycle_status');

  if (error) {
    logger.error('Error fetching lifecycle status:', { error: error });
    return {
      planSlug: 'free',
      planName: 'Free',
      status: 'none',
      canCreateContent: true,
      billingWarning: null
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    ownerId: row?.owner_id,
    email: row?.email,
    planSlug: row?.plan_slug || 'free',
    planName: row?.plan_name || 'Free',
    status: row?.status || 'none',
    trialEndsAt: row?.trial_ends_at,
    trialDaysLeft: row?.trial_days_left,
    isTrialExpired: row?.is_trial_expired || false,
    suspendedAt: row?.suspended_at,
    suspensionReason: row?.suspension_reason,
    overdueSince: row?.overdue_since,
    overdueDays: row?.overdue_days,
    frozenReadonly: row?.frozen_readonly || false,
    gracePeriodEndsAt: row?.grace_period_ends_at,
    canCreateContent: row?.can_create_content ?? true,
    billingWarning: row?.billing_warning
  };
}

/**
 * Start a trial for the current user
 * @param {string} planSlug - Plan to trial (default: 'starter')
 * @param {number} trialDays - Number of trial days (default: 14)
 * @returns {Promise<{success: boolean, trialEndsAt?: string, error?: string}>}
 */
export async function startTrial(planSlug = 'starter', trialDays = 14) {
  const { data, error } = await supabase.rpc('start_trial', {
    p_plan_slug: planSlug,
    p_trial_days: trialDays
  });

  if (error) {
    logger.error('Error starting trial:', { error: error });
    return { success: false, error: error.message };
  }

  return {
    success: data?.success || false,
    trialEndsAt: data?.trial_ends_at,
    planSlug: data?.plan_slug,
    error: data?.error
  };
}

/**
 * Get all available plans
 * @returns {Promise<Array>}
 */
export async function getPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    logger.error('Error fetching plans:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Cancel subscription at period end
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelSubscription() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('owner_id', user.id);

  if (error) {
    logger.error('Error canceling subscription:', { error: error });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a canceled subscription
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reactivateSubscription() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    })
    .eq('owner_id', user.id);

  if (error) {
    logger.error('Error reactivating subscription:', { error: error });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get billing events history
 * @param {number} limit - Number of events to fetch
 * @returns {Promise<Array>}
 */
export async function getBillingHistory(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('billing_events')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching billing history:', { error: error });
    return [];
  }

  return data || [];
}

// =====================================================
// SUPER ADMIN FUNCTIONS
// =====================================================

/**
 * Get all tenants with billing status (super_admin only)
 * @returns {Promise<Array>}
 */
export async function getAllTenantsStatus() {
  const { data, error } = await supabase.rpc('get_all_tenants_status');

  if (error) {
    logger.error('Error fetching tenants status:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Suspend a tenant (super_admin only)
 * @param {string} ownerId - Owner UUID to suspend
 * @param {string} reason - Suspension reason
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function suspendTenant(ownerId, reason = 'manual') {
  const { data, error } = await supabase.rpc('suspend_tenant', {
    p_owner_id: ownerId,
    p_reason: reason
  });

  if (error) {
    logger.error('Error suspending tenant:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Reactivate a tenant (super_admin only)
 * @param {string} ownerId - Owner UUID to reactivate
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reactivateTenant(ownerId) {
  const { data, error } = await supabase.rpc('reactivate_tenant', {
    p_owner_id: ownerId
  });

  if (error) {
    logger.error('Error reactivating tenant:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Reset a tenant's trial (super_admin only)
 * @param {string} ownerId - Owner UUID
 * @param {number} trialDays - Number of trial days
 * @returns {Promise<{success: boolean, trialEndsAt?: string, error?: string}>}
 */
export async function resetTrial(ownerId, trialDays = 14) {
  const { data, error } = await supabase.rpc('reset_trial', {
    p_owner_id: ownerId,
    p_trial_days: trialDays
  });

  if (error) {
    logger.error('Error resetting trial:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Force expire a tenant's trial (super_admin only)
 * @param {string} ownerId - Owner UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function expireTrial(ownerId) {
  const { data, error } = await supabase.rpc('set_trial_expired', {
    p_owner_id: ownerId
  });

  if (error) {
    logger.error('Error expiring trial:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

// =====================================================
// BILLING STATUS HELPERS
// =====================================================

/**
 * Get billing status badge color
 * @param {string} status - Subscription status
 * @returns {string} Tailwind color class
 */
export function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'trialing':
      return 'bg-blue-100 text-blue-700';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-700';
    case 'canceled':
    case 'expired':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get billing status display text
 * @param {string} status - Subscription status
 * @returns {string}
 */
export function getStatusText(status) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past Due';
    case 'canceled':
      return 'Canceled';
    case 'expired':
      return 'Expired';
    case 'none':
      return 'Free';
    default:
      return status;
  }
}

/**
 * Format trial remaining text
 * @param {number} daysLeft - Days remaining
 * @returns {string}
 */
export function formatTrialRemaining(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return '';
  if (daysLeft <= 0) return 'Trial expired';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}
