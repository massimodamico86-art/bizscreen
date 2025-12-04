/**
 * Admin API: Override Feature Flag
 * Phase 17: Enable/disable feature flags for a tenant
 *
 * POST /api/admin/tenants/override-feature
 * Body: { tenantId, featureKey, enabled, reason }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { tenantId, featureKey, enabled, reason } = req.body || {};

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

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Enabled must be a boolean',
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

    // Get or create feature flag
    let { data: featureFlag, error: flagError } = await supabase
      .from('feature_flags')
      .select('id, key, name')
      .eq('key', featureKey)
      .maybeSingle();

    if (!featureFlag) {
      // Create the feature flag
      const { data: newFlag, error: createError } = await supabase
        .from('feature_flags')
        .insert({
          key: featureKey,
          name: featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Feature flag for ${featureKey}`,
          enabled: false,
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create feature flag:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create feature flag',
        });
      }

      featureFlag = newFlag;
    }

    // Upsert the override
    const { data: override, error: overrideError } = await supabase
      .from('feature_flag_overrides')
      .upsert(
        {
          tenant_id: tenantId,
          flag_id: featureFlag.id,
          enabled,
          created_by: context.userId,
        },
        {
          onConflict: 'tenant_id,flag_id',
        }
      )
      .select()
      .single();

    if (overrideError) {
      console.error('Failed to upsert override:', overrideError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save feature override',
      });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: context.userId,
      action: 'admin.feature_override',
      resource_type: 'feature_flag_override',
      resource_id: override.id,
      metadata: {
        featureKey,
        enabled,
        reason: reason || 'Admin action',
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        tenantId,
        tenantName: tenant.name,
        featureKey,
        featureName: featureFlag.name,
        enabled,
        overrideId: override.id,
        message: `Feature "${featureFlag.name}" ${enabled ? 'enabled' : 'disabled'} for ${tenant.name}`,
      },
    });
  } catch (error) {
    console.error('Admin feature override error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
