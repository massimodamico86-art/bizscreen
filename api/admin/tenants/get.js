/**
 * Admin API: Get Tenant Details
 * Phase 17: Get comprehensive tenant information
 *
 * GET /api/admin/tenants/get?id=<tenant_id>
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';
import { getAllQuotaStatuses } from '../../lib/usageTracker.js';

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { id: tenantId } = req.query || {};

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    // Fetch tenant with related data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        status,
        settings,
        created_at,
        updated_at,
        subscriptions (
          id,
          plan_slug,
          status,
          current_period_start,
          current_period_end,
          created_at
        )
      `)
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Get users for this tenant
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        status,
        created_at,
        last_sign_in_at
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Get screens for this tenant
    const { data: screens, error: screensError } = await supabase
      .from('screens')
      .select(`
        id,
        name,
        status,
        device_id,
        last_seen_at,
        created_at
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Get feature flag overrides
    const { data: featureOverrides, error: overridesError } = await supabase
      .from('feature_flag_overrides')
      .select(`
        id,
        enabled,
        created_at,
        feature_flags (
          key,
          name,
          description
        )
      `)
      .eq('tenant_id', tenantId);

    // Get quota overrides
    const { data: quotaOverrides, error: quotaError } = await supabase
      .from('quota_overrides')
      .select('*')
      .eq('tenant_id', tenantId);

    // Get usage summary
    const subscription = tenant.subscriptions?.[0];
    const planSlug = subscription?.plan_slug || 'free';
    let quotaStatuses = [];

    try {
      quotaStatuses = await getAllQuotaStatuses(tenantId, planSlug);
    } catch (e) {
      console.warn('Failed to get quota statuses:', e);
    }

    // Build response
    const response = {
      // Overview
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status || 'active',
      settings: tenant.settings || {},
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,

      // Plan info
      plan: {
        slug: planSlug,
        status: subscription?.status || 'active',
        periodStart: subscription?.current_period_start,
        periodEnd: subscription?.current_period_end,
      },

      // Usage summary
      usage: {
        quotas: quotaStatuses,
        summary: {
          totalFeatures: quotaStatuses.length,
          exceededCount: quotaStatuses.filter(q => q.isExceeded).length,
          warningCount: quotaStatuses.filter(q => q.status === 'warning').length,
          unlimitedCount: quotaStatuses.filter(q => q.isUnlimited).length,
        },
      },

      // Feature flags
      featureFlags: (featureOverrides || []).map(o => ({
        id: o.id,
        key: o.feature_flags?.key,
        name: o.feature_flags?.name,
        enabled: o.enabled,
        createdAt: o.created_at,
      })),

      // Quota overrides
      quotaOverrides: (quotaOverrides || []).map(o => ({
        id: o.id,
        featureKey: o.feature_key,
        monthlyLimit: o.monthly_limit,
        isUnlimited: o.is_unlimited,
        reason: o.reason,
        expiresAt: o.expires_at,
        createdAt: o.created_at,
      })),

      // Users
      users: (users || []).map(u => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        status: u.status || 'active',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
      })),

      // Screens
      screens: (screens || []).map(s => ({
        id: s.id,
        name: s.name,
        status: s.status || 'offline',
        deviceId: s.device_id,
        lastSeenAt: s.last_seen_at,
        createdAt: s.created_at,
      })),

      // Counts
      counts: {
        users: (users || []).length,
        activeUsers: (users || []).filter(u => u.status !== 'disabled').length,
        screens: (screens || []).length,
        onlineScreens: (screens || []).filter(s => s.status === 'online').length,
      },
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Admin get tenant error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
