/**
 * Team Service - Handles organization/team member management
 *
 * Provides functions for:
 * - Fetching team members for the current tenant
 * - Inviting new members
 * - Updating member roles
 * - Revoking member access
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { clearPermissionsCache } from './permissionsService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('TeamService');

/**
 * Fetch all team members for the current tenant
 * Joins with profiles to get user details
 *
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function fetchTeamMembers() {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { data: [], error: 'No tenant context' };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        tenant_id,
        user_id,
        role,
        invited_email,
        status,
        invite_token,
        invite_token_expires_at,
        created_at,
        updated_at,
        profile:profiles!organization_members_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('fetchTeamMembers error:', { error: error });
      return { data: [], error: error.message };
    }

    // Transform data for easier consumption
    const members = (data || []).map((member) => ({
      id: member.id,
      tenantId: member.tenant_id,
      userId: member.user_id,
      role: member.role,
      invitedEmail: member.invited_email,
      status: member.status,
      hasInviteToken: !!member.invite_token,
      inviteExpired: member.invite_token_expires_at
        ? new Date(member.invite_token_expires_at) < new Date()
        : false,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      // Profile info (if user exists)
      email: member.profile?.email || member.invited_email,
      fullName: member.profile?.full_name || null,
      avatarUrl: member.profile?.avatar_url || null,
    }));

    return { data: members, error: null };
  } catch (err) {
    logger.error('fetchTeamMembers error:', { error: err });
    return { data: [], error: err.message };
  }
}

/**
 * Invite a new member to the team
 * If the user exists, creates an active membership
 * If not, creates a pending invite with token
 *
 * @param {object} params
 * @param {string} params.email - Email to invite
 * @param {string} params.role - Role to assign (manager, editor, viewer)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function inviteMember({ email, role }) {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { success: false, error: 'No tenant context' };
    }

    // Validate role
    if (!['manager', 'editor', 'viewer'].includes(role)) {
      return { success: false, error: 'Invalid role. Must be manager, editor, or viewer.' };
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingProfile) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('user_id', existingProfile.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          return { success: false, error: 'This user is already a team member.' };
        }
        // Reactivate if revoked
        if (existingMember.status === 'revoked') {
          const { error: updateError } = await supabase
            .from('organization_members')
            .update({ role, status: 'active' })
            .eq('id', existingMember.id);

          if (updateError) {
            return { success: false, error: updateError.message };
          }

          clearPermissionsCache();
          return { success: true, data: { reactivated: true } };
        }
      }

      // Create new active membership
      const { data: newMember, error: insertError } = await supabase
        .from('organization_members')
        .insert({
          tenant_id: tenantId,
          user_id: existingProfile.id,
          role,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      clearPermissionsCache();
      return { success: true, data: { member: newMember, isExistingUser: true } };
    }

    // User doesn't exist - create invite with token
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Check if there's already a pending invite for this email
    const { data: existingInvite } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('invited_email', email.toLowerCase())
      .single();

    if (existingInvite) {
      if (existingInvite.status === 'invited') {
        // Update existing invite with new token
        const { error: updateError } = await supabase
          .from('organization_members')
          .update({
            role,
            invite_token: inviteToken,
            invite_token_expires_at: expiresAt.toISOString(),
          })
          .eq('id', existingInvite.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        return { success: true, data: { inviteToken, isNewInvite: false } };
      }
    }

    // Create new invite
    const { data: newInvite, error: insertError } = await supabase
      .from('organization_members')
      .insert({
        tenant_id: tenantId,
        invited_email: email.toLowerCase(),
        role,
        status: 'invited',
        invite_token: inviteToken,
        invite_token_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, data: { member: newInvite, inviteToken, isNewInvite: true } };
  } catch (err) {
    logger.error('inviteMember error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Update a team member's role
 *
 * @param {string} memberId - Organization member ID
 * @param {string} newRole - New role (owner, manager, editor, viewer)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMemberRole(memberId, newRole) {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { success: false, error: 'No tenant context' };
    }

    // Validate role
    if (!['owner', 'manager', 'editor', 'viewer'].includes(newRole)) {
      return { success: false, error: 'Invalid role' };
    }

    // Check if trying to demote the last owner
    if (newRole !== 'owner') {
      const { data: currentMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('id', memberId)
        .single();

      if (currentMember?.role === 'owner') {
        // Count other owners
        const { count } = await supabase
          .from('organization_members')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('role', 'owner')
          .eq('status', 'active')
          .neq('id', memberId);

        if (count === 0) {
          return {
            success: false,
            error: 'Cannot demote the last owner. Promote another member to owner first.',
          };
        }
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('tenant_id', tenantId);

    if (error) {
      return { success: false, error: error.message };
    }

    clearPermissionsCache();
    return { success: true };
  } catch (err) {
    logger.error('updateMemberRole error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Revoke a team member's access
 *
 * @param {string} memberId - Organization member ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeMember(memberId) {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { success: false, error: 'No tenant context' };
    }

    // Check if trying to revoke the last owner
    const { data: memberToRevoke } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single();

    if (!memberToRevoke) {
      return { success: false, error: 'Member not found' };
    }

    // Cannot revoke yourself if you're the last owner
    const { data: { user } } = await supabase.auth.getUser();

    if (memberToRevoke.role === 'owner') {
      const { count } = await supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .eq('status', 'active')
        .neq('id', memberId);

      if (count === 0) {
        return {
          success: false,
          error: 'Cannot revoke the last owner. Transfer ownership first.',
        };
      }
    }

    // Cannot revoke yourself
    if (memberToRevoke.user_id === user?.id) {
      return { success: false, error: 'You cannot revoke your own access.' };
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ status: 'revoked' })
      .eq('id', memberId)
      .eq('tenant_id', tenantId);

    if (error) {
      return { success: false, error: error.message };
    }

    clearPermissionsCache();
    return { success: true };
  } catch (err) {
    logger.error('revokeMember error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Resend invitation to a pending member
 *
 * @param {string} memberId - Organization member ID
 * @returns {Promise<{success: boolean, inviteToken?: string, error?: string}>}
 */
export async function resendInvite(memberId) {
  try {
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
      .from('organization_members')
      .update({
        invite_token: inviteToken,
        invite_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', memberId)
      .eq('status', 'invited');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, inviteToken };
  } catch (err) {
    logger.error('resendInvite error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Delete a pending invite (not yet accepted)
 *
 * @param {string} memberId - Organization member ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteInvite(memberId) {
  try {
    const tenantId = await getEffectiveOwnerId();
    if (!tenantId) {
      return { success: false, error: 'No tenant context' };
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .eq('status', 'invited');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    logger.error('deleteInvite error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Accept an invitation using token
 * Called from the accept-invite page
 *
 * @param {string} token - Invite token
 * @returns {Promise<{success: boolean, tenantId?: string, error?: string}>}
 */
export async function acceptInvite(token) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to accept an invitation.' };
    }

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('organization_members')
      .select('id, tenant_id, invited_email, role, status, invite_token_expires_at')
      .eq('invite_token', token)
      .eq('status', 'invited')
      .single();

    if (findError || !invite) {
      return { success: false, error: 'Invalid or expired invitation.' };
    }

    // Check expiry
    if (new Date(invite.invite_token_expires_at) < new Date()) {
      return { success: false, error: 'This invitation has expired.' };
    }

    // Get user's email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Verify email matches (optional but recommended)
    if (profile && invite.invited_email && profile.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
      return {
        success: false,
        error: `This invitation was sent to ${invite.invited_email}. Please log in with that email address.`,
      };
    }

    // Accept the invite
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({
        user_id: user.id,
        status: 'active',
        invite_token: null,
        invite_token_expires_at: null,
      })
      .eq('id', invite.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    clearPermissionsCache();
    return { success: true, tenantId: invite.tenant_id };
  } catch (err) {
    logger.error('acceptInvite error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Get invitation details by token (for display on accept page)
 *
 * @param {string} token - Invite token
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function getInviteDetails(token) {
  try {
    // Query using RPC to bypass RLS for public invite lookup
    const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token });

    if (error) {
      // Fallback to direct query if RPC doesn't exist
      const { data: invite, error: queryError } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          invited_email,
          status,
          invite_token_expires_at,
          tenant:profiles!organization_members_tenant_id_fkey (
            id,
            full_name,
            business_name,
            email
          )
        `)
        .eq('invite_token', token)
        .eq('status', 'invited')
        .single();

      if (queryError || !invite) {
        return { data: null, error: 'Invalid or expired invitation.' };
      }

      // Check expiry
      if (new Date(invite.invite_token_expires_at) < new Date()) {
        return { data: null, error: 'This invitation has expired.' };
      }

      return {
        data: {
          role: invite.role,
          email: invite.invited_email,
          tenantName: invite.tenant?.business_name || invite.tenant?.full_name || 'Unknown',
          tenantId: invite.tenant?.id,
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (err) {
    logger.error('getInviteDetails error:', { error: err });
    return { data: null, error: err.message };
  }
}

/**
 * Generate a cryptographically secure random invite token
 * Uses Web Crypto API for browser-safe secure randomness
 * @returns {string}
 */
function generateInviteToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(randomValues[i] % chars.length);
  }
  return token;
}

/**
 * Get role display name
 * @param {string} role
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  const names = {
    owner: 'Owner',
    manager: 'Manager',
    editor: 'Editor',
    viewer: 'Viewer',
  };
  return names[role] || role;
}

/**
 * Get role description
 * @param {string} role
 * @returns {string}
 */
export function getRoleDescription(role) {
  const descriptions = {
    owner: 'Full control including billing and team management',
    manager: 'Manage locations, screens, and content. Cannot change billing.',
    editor: 'Create and edit media, playlists, layouts, and screens',
    viewer: 'View-only access to all content and screens',
  };
  return descriptions[role] || '';
}

export default {
  fetchTeamMembers,
  inviteMember,
  updateMemberRole,
  revokeMember,
  resendInvite,
  deleteInvite,
  acceptInvite,
  getInviteDetails,
  getRoleDisplayName,
  getRoleDescription,
};
