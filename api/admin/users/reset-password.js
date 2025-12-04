/**
 * Admin API: Reset User Password
 * Phase 17: Send password reset email or set temporary password
 *
 * POST /api/admin/users/reset-password
 * Body: { userId, sendEmail: boolean }
 *
 * Authorization: Requires super_admin role
 */

import { requireSuperAdmin, getSupabaseAdmin } from '../../lib/adminAuth.js';

export default requireSuperAdmin(async (req, res, context) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { userId, sendEmail = true } = req.body || {};

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, tenant_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get user's auth record
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser?.user) {
      return res.status(404).json({
        success: false,
        error: 'User auth record not found',
      });
    }

    let result;

    if (sendEmail) {
      // Send password reset email
      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: authUser.user.email,
      });

      if (resetError) {
        console.error('Failed to generate reset link:', resetError);
        return res.status(500).json({
          success: false,
          error: 'Failed to send password reset email',
        });
      }

      result = {
        method: 'email',
        message: `Password reset email sent to ${authUser.user.email}`,
      };
    } else {
      // Generate a temporary password
      const tempPassword = generateTempPassword();

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });

      if (updateError) {
        console.error('Failed to set temporary password:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to set temporary password',
        });
      }

      result = {
        method: 'temporary_password',
        tempPassword,
        message: 'Temporary password set. User must change it on next login.',
      };
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: context.userId,
      action: 'admin.password_reset',
      resource_type: 'user',
      resource_id: userId,
      metadata: {
        targetUserId: userId,
        targetEmail: authUser.user.email,
        method: result.method,
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        userId,
        email: authUser.user.email,
        fullName: profile.full_name,
        ...result,
      },
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Generate a temporary password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
