/**
 * Admin Authentication Helper
 * Phase 17: Super Admin authorization for admin panel endpoints
 *
 * Usage:
 *   import { requireSuperAdmin, getSuperAdminContext } from '../lib/adminAuth.js';
 *
 *   // Option 1: Middleware wrapper
 *   export default requireSuperAdmin(async (req, res, context) => {
 *     // context.userId, context.tenantId, context.role
 *   });
 *
 *   // Option 2: Manual check
 *   const context = await getSuperAdminContext(req);
 *   if (!context) return res.status(403).json({ error: 'Forbidden' });
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Create a Supabase client with service role for admin operations
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Error for unauthorized admin access
 */
export class AdminUnauthorizedError extends Error {
  constructor(message = 'Admin access required') {
    super(message);
    this.name = 'AdminUnauthorizedError';
    this.code = 'ADMIN_UNAUTHORIZED';
    this.statusCode = 403;
  }
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get super admin context from request
 * Returns null if not authenticated or not a super admin
 *
 * @param {Request} req
 * @returns {Promise<Object|null>}
 */
export async function getSuperAdminContext(req) {
  const supabase = getSupabaseAdmin();

  // Get authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the token and get user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name, email')
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
    email: user.email,
    tenantId: profile.tenant_id,
    role: profile.role,
    fullName: profile.full_name,
    isSuperAdmin: true,
  };
}

/**
 * Middleware wrapper that requires super_admin role
 *
 * @param {Function} handler - Route handler
 * @returns {Function}
 */
export function requireSuperAdmin(handler) {
  return async (req, res) => {
    try {
      const context = await getSuperAdminContext(req);

      if (!context) {
        return res.status(403).json({
          success: false,
          error: 'Super admin access required',
          code: 'ADMIN_UNAUTHORIZED',
        });
      }

      return handler(req, res, context);
    } catch (error) {
      if (error instanceof AdminUnauthorizedError) {
        return res.status(403).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }

      console.error('Admin auth error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getSupabaseAdmin,
  getSuperAdminContext,
  requireSuperAdmin,
  AdminUnauthorizedError,
};
