/**
 * Permissions Service - Handles team role-based permissions
 *
 * Provides functions for checking user capabilities within a tenant.
 *
 * Roles within a tenant (organization_members.role):
 * - owner: Full control (billing, plan, team, locations, content, screens)
 * - manager: Everything except billing/subscription changes
 * - editor: Content management (media, playlists, layouts, schedules, screens)
 * - viewer: Read-only access
 *
 * Note: This is separate from the profile.role (super_admin, admin, client)
 * which controls platform-level access.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId, isImpersonating } from './tenantService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('PermissionsService');

// Cache for member role to avoid repeated queries
let memberRoleCache = {
  tenantId: null,
  role: null,
  timestamp: 0,
};

const CACHE_TTL = 30000; // 30 seconds

/**
 * Clear the role cache (call after role changes)
 */
export function clearPermissionsCache() {
  memberRoleCache = { tenantId: null, role: null, timestamp: 0 };
}

/**
 * Get the current user's role within the effective tenant
 * Returns the organization member role (owner, manager, editor, viewer)
 *
 * @returns {Promise<string|null>} Role or null if not a member
 */
export async function getCurrentMemberRole() {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) return null;

    // Check cache
    const now = Date.now();
    if (
      memberRoleCache.tenantId === tenantId &&
      memberRoleCache.timestamp > now - CACHE_TTL
    ) {
      return memberRoleCache.role;
    }

    // Query organization_members for current user's role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // If the user is the tenant owner directly, they're an owner
    if (user.id === tenantId) {
      memberRoleCache = { tenantId, role: 'owner', timestamp: now };
      return 'owner';
    }

    // Query for membership
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      // Not a member of this tenant
      memberRoleCache = { tenantId, role: null, timestamp: now };
      return null;
    }

    memberRoleCache = { tenantId, role: data.role, timestamp: now };
    return data.role;
  } catch (err) {
    logger.error('getCurrentMemberRole error:', { error: err });
    return null;
  }
}

/**
 * Get the current user's profile role (super_admin, admin, client)
 * This is the platform-level role, not the tenant role
 *
 * @returns {Promise<string|null>}
 */
export async function getProfileRole() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;
    return data.role;
  } catch (err) {
    logger.error('getProfileRole error:', { error: err });
    return null;
  }
}

/**
 * Check if the current user is a super_admin
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin() {
  const role = await getProfileRole();
  return role === 'super_admin';
}

/**
 * Check if the current user is an admin (reseller)
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  const role = await getProfileRole();
  return role === 'admin';
}

/**
 * Check if the current user is the tenant owner
 * @returns {Promise<boolean>}
 */
export async function isOwner() {
  const role = await getCurrentMemberRole();
  return role === 'owner';
}

/**
 * Check if the current user is at least a manager
 * @returns {Promise<boolean>}
 */
export async function isAtLeastManager() {
  const role = await getCurrentMemberRole();
  return role === 'owner' || role === 'manager';
}

/**
 * Check if the current user is at least an editor
 * @returns {Promise<boolean>}
 */
export async function isAtLeastEditor() {
  const role = await getCurrentMemberRole();
  return ['owner', 'manager', 'editor'].includes(role);
}

/**
 * Check if the current user is a viewer only
 * @returns {Promise<boolean>}
 */
export async function isViewerOnly() {
  const role = await getCurrentMemberRole();
  return role === 'viewer';
}

/**
 * Check if the current user requires content approval before publishing
 * Editors and viewers require approval; owners and managers can publish directly
 * @returns {Promise<boolean>} True if user needs approval, false if can publish directly
 */
export async function requiresApproval() {
  // Super admins and admins never need approval
  const profileRole = await getProfileRole();
  if (profileRole === 'super_admin' || profileRole === 'admin') return false;

  const memberRole = await getCurrentMemberRole();
  // Owners and managers can publish directly
  if (['owner', 'manager'].includes(memberRole)) return false;
  // Editors and viewers require approval
  // Also require approval if no role (not a member)
  return true;
}

/**
 * Check if the current user can approve/reject content
 * Only owners and managers can approve
 * @returns {Promise<boolean>}
 */
export async function canApproveContent() {
  // Super admins and admins can always approve
  const profileRole = await getProfileRole();
  if (profileRole === 'super_admin' || profileRole === 'admin') return true;

  return isAtLeastManager();
}

// =====================================================
// CAPABILITY CHECKS
// =====================================================

/**
 * Can the user manage billing (view/change plan, Stripe portal)?
 * Only owners can manage billing
 * @returns {Promise<boolean>}
 */
export async function canManageBilling() {
  // Super admins always can (even when impersonating)
  if (await isSuperAdmin()) return true;

  const role = await getCurrentMemberRole();
  return role === 'owner';
}

/**
 * Can the user manage team members (invite, change roles, revoke)?
 * Owners and managers can manage team
 * @returns {Promise<boolean>}
 */
export async function canManageTeam() {
  // Super admins always can
  if (await isSuperAdmin()) return true;
  // Admins can manage their clients' teams
  if (await isAdmin()) return true;

  return isAtLeastManager();
}

/**
 * Can the user manage locations (create, update, delete)?
 * Owners and managers can manage locations
 * @returns {Promise<boolean>}
 */
export async function canManageLocations() {
  // Super admins and admins always can
  const profileRole = await getProfileRole();
  if (profileRole === 'super_admin' || profileRole === 'admin') return true;

  return isAtLeastManager();
}

/**
 * Can the user edit content (media, playlists, layouts, schedules)?
 * Owners, managers, and editors can edit content
 * @returns {Promise<boolean>}
 */
export async function canEditContent() {
  // Super admins and admins always can
  const profileRole = await getProfileRole();
  if (profileRole === 'super_admin' || profileRole === 'admin') return true;

  return isAtLeastEditor();
}

/**
 * Can the user edit screens (create, update, delete)?
 * Owners, managers, and editors can edit screens
 * @returns {Promise<boolean>}
 */
export async function canEditScreens() {
  // Super admins and admins always can
  const profileRole = await getProfileRole();
  if (profileRole === 'super_admin' || profileRole === 'admin') return true;

  return isAtLeastEditor();
}

/**
 * Can the user view the plan/limits page?
 * Everyone can view, but only owners can change
 * @returns {Promise<boolean>}
 */
export async function canViewPlan() {
  return true; // Everyone can view plan info
}

/**
 * Get all permissions at once (useful for initial load)
 * @returns {Promise<object>}
 */
export async function getAllPermissions() {
  const [
    profileRole,
    memberRole,
  ] = await Promise.all([
    getProfileRole(),
    getCurrentMemberRole(),
  ]);

  const isSuperAdminUser = profileRole === 'super_admin';
  const isAdminUser = profileRole === 'admin';
  const isOwnerMember = memberRole === 'owner';
  const isManagerMember = memberRole === 'manager';
  const isEditorMember = memberRole === 'editor';
  const isViewerMember = memberRole === 'viewer';

  // Check if impersonating
  const impersonating = isImpersonating();

  return {
    // Profile-level roles
    profileRole,
    isSuperAdmin: isSuperAdminUser,
    isAdmin: isAdminUser,

    // Tenant-level roles
    memberRole,
    isOwner: isOwnerMember,
    isManager: isManagerMember,
    isEditor: isEditorMember,
    isViewer: isViewerMember,

    // Impersonation
    isImpersonating: impersonating,

    // Capabilities
    canManageBilling: isSuperAdminUser || isOwnerMember,
    canManageTeam: isSuperAdminUser || isAdminUser || isOwnerMember || isManagerMember,
    canManageLocations: isSuperAdminUser || isAdminUser || isOwnerMember || isManagerMember,
    canEditContent: isSuperAdminUser || isAdminUser || isOwnerMember || isManagerMember || isEditorMember,
    canEditScreens: isSuperAdminUser || isAdminUser || isOwnerMember || isManagerMember || isEditorMember,
    canViewPlan: true,
    isReadOnly: isViewerMember && !isSuperAdminUser && !isAdminUser,
  };
}

/**
 * React hook-friendly wrapper for getting permissions
 * Returns permissions object synchronously if cached, or fetches if needed
 */
let permissionsPromise = null;
let lastFetchTime = 0;

export async function getPermissions() {
  const now = Date.now();

  // Return cached promise if fresh
  if (permissionsPromise && now - lastFetchTime < CACHE_TTL) {
    return permissionsPromise;
  }

  lastFetchTime = now;
  permissionsPromise = getAllPermissions();
  return permissionsPromise;
}

/**
 * Force refresh permissions
 */
export async function refreshPermissions() {
  clearPermissionsCache();
  lastFetchTime = 0;
  permissionsPromise = null;
  return getAllPermissions();
}

export default {
  clearPermissionsCache,
  getCurrentMemberRole,
  getProfileRole,
  isSuperAdmin,
  isAdmin,
  isOwner,
  isAtLeastManager,
  isAtLeastEditor,
  isViewerOnly,
  requiresApproval,
  canApproveContent,
  canManageBilling,
  canManageTeam,
  canManageLocations,
  canEditContent,
  canEditScreens,
  canViewPlan,
  getAllPermissions,
  getPermissions,
  refreshPermissions,
};
