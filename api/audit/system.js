/**
 * System Events API
 * Phase 18: List system events (super admin only)
 *
 * GET /api/audit/system
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - source: Filter by source (api, scheduler, system, admin, worker)
 * - event_type: Filter by event type
 * - severity: Filter by severity (debug, info, warning, error, critical)
 * - start_date: Filter from date (ISO format)
 * - end_date: Filter to date (ISO format)
 */

import { createClient } from '@supabase/supabase-js';
import { getSystemEvents, SYSTEM_EVENT_SOURCES, SEVERITY_LEVELS } from '../lib/auditLogger.js';

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

async function requireSuperAdmin(req) {
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

  // Must be super_admin
  if (profile.role !== 'super_admin') {
    return null;
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    role: profile.role,
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
    // Check super admin authentication
    const context = await requireSuperAdmin(req);
    if (!context) {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required',
      });
    }

    // Parse query parameters
    const {
      page = '1',
      limit = '50',
      source,
      event_type,
      severity,
      start_date,
      end_date,
    } = req.query;

    // Validate source if provided
    if (source && !Object.values(SYSTEM_EVENT_SOURCES).includes(source)) {
      return res.status(400).json({
        success: false,
        error: `Invalid source. Must be one of: ${Object.values(SYSTEM_EVENT_SOURCES).join(', ')}`,
      });
    }

    // Validate severity if provided
    if (severity && !Object.values(SEVERITY_LEVELS).includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${Object.values(SEVERITY_LEVELS).join(', ')}`,
      });
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Get system events
    const result = await getSystemEvents({
      limit: limitNum,
      offset,
      source: source || null,
      event_type: event_type || null,
      severity: severity || null,
      start_date: start_date || null,
      end_date: end_date || null,
    });

    return res.status(200).json({
      success: true,
      data: {
        events: result.events,
        pagination: {
          page: pageNum,
          limit: limitNum,
        },
        filters: {
          sources: Object.values(SYSTEM_EVENT_SOURCES),
          severities: Object.values(SEVERITY_LEVELS),
        },
      },
    });
  } catch (error) {
    console.error('System events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch system events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
