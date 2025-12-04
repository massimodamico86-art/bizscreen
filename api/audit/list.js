/**
 * Audit Logs List API
 * Phase 18: List audit logs for a tenant
 *
 * GET /api/audit/list
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - event_type: Filter by event type
 * - entity_type: Filter by entity type
 * - user_id: Filter by user
 * - start_date: Filter from date (ISO format)
 * - end_date: Filter to date (ISO format)
 */

import { createClient } from '@supabase/supabase-js';
import { getAuditLogs, getEventTypes, getEntityTypes } from '../lib/auditLogger.js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// AUTH HELPER
// ============================================================================

async function getAuthContext(req) {
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
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    role: profile.role,
    isSuperAdmin: profile.role === 'super_admin',
    isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
  };
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Check authentication
    const context = await getAuthContext(req);
    if (!context) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Require at least admin role to view audit logs
    if (!context.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required to view audit logs',
      });
    }

    // Parse query parameters
    const {
      page = '1',
      limit = '50',
      event_type,
      entity_type,
      user_id,
      start_date,
      end_date,
      tenant_id, // Super admin can query other tenants
    } = req.query;

    // Determine which tenant to query
    let targetTenantId = context.tenantId;

    // Super admin can query any tenant
    if (context.isSuperAdmin && tenant_id) {
      targetTenantId = tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required',
      });
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Get audit logs
    const result = await getAuditLogs(targetTenantId, {
      limit: limitNum,
      offset,
      event_type: event_type || null,
      entity_type: entity_type || null,
      user_id: user_id || null,
      start_date: start_date || null,
      end_date: end_date || null,
    });

    // Get filter options for UI
    const [eventTypes, entityTypes] = await Promise.all([
      getEventTypes(targetTenantId),
      getEntityTypes(targetTenantId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
        filters: {
          eventTypes,
          entityTypes,
        },
      },
    });
  } catch (error) {
    console.error('Audit list error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
