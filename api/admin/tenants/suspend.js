/**
 * Admin API: Suspend/Unsuspend Tenant
 * Phase 17: Suspend or reactivate a tenant
 *
 * POST /api/admin/tenants/suspend
 * Body: { tenantId, action: 'suspend' | 'unsuspend', reason }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';

const VALID_ACTIONS = ['suspend', 'unsuspend'];

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { tenantId, action, reason } = req.body || {};

    // Validation
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Action must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    // Determine new status
    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    // Check if action makes sense
    if (action === 'suspend' && tenant.status === 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'Tenant is already suspended',
      });
    }

    if (action === 'unsuspend' && tenant.status !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'Tenant is not suspended',
      });
    }

    // Update tenant status
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update tenant status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update tenant status',
      });
    }

    // If suspending, also update subscription
    if (action === 'suspend') {
      await supabase
        .from('subscriptions')
        .update({ status: 'suspended' })
        .eq('tenant_id', tenantId);
    } else {
      // If unsuspending, reactivate subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('tenant_id', tenantId);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: context.userId,
      action: `admin.tenant_${action}ed`,
      resource_type: 'tenant',
      resource_id: tenantId,
      metadata: {
        previousStatus: tenant.status,
        newStatus,
        reason: reason || 'Admin action',
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        tenantId,
        tenantName: tenant.name,
        previousStatus: tenant.status,
        newStatus,
        action,
        message: action === 'suspend'
          ? `Tenant "${tenant.name}" has been suspended`
          : `Tenant "${tenant.name}" has been reactivated`,
      },
    });
  } catch (error) {
    console.error('Admin suspend tenant error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
