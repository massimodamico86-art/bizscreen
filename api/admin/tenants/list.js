/**
 * Admin API: List Tenants
 * Phase 17: Get paginated list of all tenants with summary info
 *
 * GET /api/admin/tenants/list
 * Query params: page, limit, search, plan, status
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Parse query params
    const {
      page = '1',
      limit = '20',
      search = '',
      plan = '',
      status = '',
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query for tenants
    let query = supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        status,
        created_at,
        updated_at,
        subscriptions (
          plan_slug,
          status
        )
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data: tenants, error: tenantsError, count } = await query;

    if (tenantsError) {
      console.error('Failed to fetch tenants:', tenantsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tenants',
      });
    }

    // Get user counts for each tenant
    const tenantIds = tenants.map(t => t.id);

    const { data: userCounts, error: userCountsError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    // Get screen counts for each tenant
    const { data: screenCounts, error: screenCountsError } = await supabase
      .from('screens')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    // Aggregate counts
    const userCountMap = {};
    const screenCountMap = {};

    (userCounts || []).forEach(p => {
      userCountMap[p.tenant_id] = (userCountMap[p.tenant_id] || 0) + 1;
    });

    (screenCounts || []).forEach(s => {
      screenCountMap[s.tenant_id] = (screenCountMap[s.tenant_id] || 0) + 1;
    });

    // Enrich tenant data
    const enrichedTenants = tenants.map(tenant => {
      const subscription = tenant.subscriptions?.[0];
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status || 'active',
        plan: subscription?.plan_slug || 'free',
        planStatus: subscription?.status || 'active',
        activeUsers: userCountMap[tenant.id] || 0,
        screensCount: screenCountMap[tenant.id] || 0,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
      };
    });

    // Apply plan filter (post-query since it's in a relation)
    let filteredTenants = enrichedTenants;
    if (plan) {
      filteredTenants = enrichedTenants.filter(t => t.plan === plan);
    }

    return res.status(200).json({
      success: true,
      data: {
        tenants: filteredTenants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Admin tenants list error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
