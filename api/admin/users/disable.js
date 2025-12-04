/**
 * Admin API: Disable/Enable User
 * Phase 17: Disable or enable a user account
 *
 * POST /api/admin/users/disable
 * Body: { userId, action: 'disable' | 'enable', reason }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';

const VALID_ACTIONS = ['disable', 'enable'];

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { userId, action, reason } = req.body || {};

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Action must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    // Prevent disabling self
    if (userId === context.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot disable your own account',
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, tenant_id, status, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const newStatus = action === 'disable' ? 'disabled' : 'active';

    // Check if action makes sense
    if (action === 'disable' && profile.status === 'disabled') {
      return res.status(400).json({
        success: false,
        error: 'User is already disabled',
      });
    }

    if (action === 'enable' && profile.status !== 'disabled') {
      return res.status(400).json({
        success: false,
        error: 'User is not disabled',
      });
    }

    // Update profile status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update user status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user status',
      });
    }

    // Also update auth user metadata if disabling
    if (action === 'disable') {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { disabled: true },
      });
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { disabled: false },
      });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: context.userId,
      action: `admin.user_${action}d`,
      resource_type: 'user',
      resource_id: userId,
      metadata: {
        targetUserId: userId,
        targetEmail: profile.email,
        previousStatus: profile.status,
        newStatus,
        reason: reason || 'Admin action',
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        userId,
        email: profile.email,
        fullName: profile.full_name,
        previousStatus: profile.status,
        newStatus,
        action,
        message: action === 'disable'
          ? `User "${profile.full_name}" has been disabled`
          : `User "${profile.full_name}" has been enabled`,
      },
    });
  } catch (error) {
    console.error('Admin disable user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
