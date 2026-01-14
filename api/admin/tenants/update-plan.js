/**
 * Admin API: Update Tenant Plan
 * Phase 17: Change a tenant's subscription plan
 *
 * POST /api/admin/tenants/update-plan
 * Body: { tenantId, planSlug, reason }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';
import { PlanSlug } from '../../lib/featureCheck.js';
import { logAudit, AUDIT_EVENT_TYPES } from '../../lib/auditLogger.js';

const VALID_PLANS = Object.values(PlanSlug);

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { tenantId, planSlug, reason } = req.body || {};

    // Validation
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    if (!planSlug || !VALID_PLANS.includes(planSlug)) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}`,
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

    // Get plan ID
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, slug, name')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return res.status(400).json({
        success: false,
        error: `Plan "${planSlug}" not found`,
      });
    }

    // Update or create subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    let subscriptionResult;

    if (existingSub) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: plan.id,
          plan_slug: planSlug,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      subscriptionResult = { data, error };
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: plan.id,
          plan_slug: planSlug,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      subscriptionResult = { data, error };
    }

    if (subscriptionResult.error) {
      console.error('Failed to update subscription:', subscriptionResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
      });
    }

    // Log the action using Phase 18 audit logger
    await logAudit(req, {
      tenant_id: tenantId,
      user_id: context.userId,
      event_type: AUDIT_EVENT_TYPES.TENANT_PLAN_CHANGED,
      entity_type: 'subscription',
      entity_id: subscriptionResult.data.id,
      metadata: {
        new_plan: planSlug,
        plan_name: plan.name,
        reason: reason || 'Admin action',
        admin_email: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        tenantId,
        tenantName: tenant.name,
        planSlug,
        planName: plan.name,
        subscriptionId: subscriptionResult.data.id,
        message: `Plan updated to ${plan.name}`,
      },
    });
  } catch (error) {
    console.error('Admin update plan error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
