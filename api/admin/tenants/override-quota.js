/**
 * Admin API: Override Quota
 * Phase 17: Set custom quota limits for a tenant
 *
 * POST /api/admin/tenants/override-quota
 * Body: { tenantId, featureKey, monthlyLimit, isUnlimited, reason, expiresAt }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';
import { QUOTA_FEATURE_NAMES } from '../../lib/usageTracker.js';

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { tenantId, featureKey, monthlyLimit, isUnlimited, reason, expiresAt } = req.body || {};

    // Validation
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    if (!featureKey) {
      return res.status(400).json({
        success: false,
        error: 'Feature key is required',
      });
    }

    // Validate feature key
    if (!QUOTA_FEATURE_NAMES[featureKey]) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature key. Must be one of: ${Object.keys(QUOTA_FEATURE_NAMES).join(', ')}`,
      });
    }

    // Validate monthly limit or unlimited
    if (!isUnlimited && (monthlyLimit === undefined || monthlyLimit < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Monthly limit must be a non-negative number, or isUnlimited must be true',
      });
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Upsert the quota override
    const overrideData = {
      tenant_id: tenantId,
      feature_key: featureKey,
      monthly_limit: isUnlimited ? null : monthlyLimit,
      is_unlimited: !!isUnlimited,
      reason: reason || 'Admin action',
      created_by: context.userId,
      expires_at: expiresAt || null,
    };

    const { data: override, error: overrideError } = await supabase
      .from('quota_overrides')
      .upsert(overrideData, {
        onConflict: 'tenant_id,feature_key',
      })
      .select()
      .single();

    if (overrideError) {
      console.error('Failed to upsert quota override:', overrideError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save quota override',
      });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: context.userId,
      action: 'admin.quota_override',
      resource_type: 'quota_override',
      resource_id: override.id,
      metadata: {
        featureKey,
        monthlyLimit: isUnlimited ? 'unlimited' : monthlyLimit,
        isUnlimited,
        reason: reason || 'Admin action',
        expiresAt,
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        tenantId,
        tenantName: tenant.name,
        featureKey,
        featureName: QUOTA_FEATURE_NAMES[featureKey],
        monthlyLimit: isUnlimited ? null : monthlyLimit,
        isUnlimited: !!isUnlimited,
        expiresAt: override.expires_at,
        overrideId: override.id,
        message: isUnlimited
          ? `Quota for "${QUOTA_FEATURE_NAMES[featureKey]}" set to unlimited`
          : `Quota for "${QUOTA_FEATURE_NAMES[featureKey]}" set to ${monthlyLimit}/month`,
      },
    });
  } catch (error) {
    console.error('Admin quota override error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
