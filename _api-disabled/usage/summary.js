/**
 * Usage Summary API
 * Returns usage statistics and quota status for the current tenant
 *
 * Usage:
 *   GET /api/usage/summary
 *   Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import { getAllQuotaStatuses, getTenantMonthlyUsage } from '../lib/usageTracker.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getTenantContext(req) {
  const supabase = getSupabaseClient();

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      tenant_id,
      role,
      tenants (
        id,
        name,
        subscriptions (
          plan_slug,
          status
        )
      )
    `
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const subscription = profile.tenants?.subscriptions?.[0];
  const planSlug = subscription?.plan_slug || 'free';

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    tenantName: profile.tenants?.name,
    planSlug,
    role: profile.role,
    isSuperAdmin: profile.role === 'super_admin',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const context = await getTenantContext(req);

    if (!context) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all quota statuses
    const quotaStatuses = await getAllQuotaStatuses(context.tenantId, context.planSlug);

    // Get monthly usage summary
    const usageSummary = await getTenantMonthlyUsage(context.tenantId);

    // Calculate billing period
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((billingPeriodEnd - now) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      success: true,
      data: {
        tenant: {
          id: context.tenantId,
          name: context.tenantName,
        },
        plan: context.planSlug,
        billingPeriod: {
          start: billingPeriodStart.toISOString(),
          end: billingPeriodEnd.toISOString(),
          daysRemaining,
        },
        quotas: quotaStatuses,
        usage: usageSummary,
        summary: {
          totalFeatures: quotaStatuses.length,
          exceededCount: quotaStatuses.filter((q) => q.isExceeded).length,
          warningCount: quotaStatuses.filter((q) => q.status === 'warning').length,
          criticalCount: quotaStatuses.filter((q) => q.status === 'critical').length,
          unlimitedCount: quotaStatuses.filter((q) => q.isUnlimited).length,
        },
      },
    });
  } catch (error) {
    console.error('Usage summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
