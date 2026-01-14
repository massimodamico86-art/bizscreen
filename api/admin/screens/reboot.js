/**
 * Admin API: Reboot Screen
 * Phase 17: Force reboot a screen device
 *
 * POST /api/admin/screens/reboot
 * Body: { screenId, reason }
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
    const { screenId, reason } = req.body || {};

    // Validation
    if (!screenId) {
      return res.status(400).json({
        success: false,
        error: 'Screen ID is required',
      });
    }

    // Get screen
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('id, name, device_id, status, tenant_id')
      .eq('id', screenId)
      .single();

    if (screenError || !screen) {
      return res.status(404).json({
        success: false,
        error: 'Screen not found',
      });
    }

    // Queue a reboot command by updating the screen's pending_command
    const { error: updateError } = await supabase
      .from('screens')
      .update({
        pending_command: 'reboot',
        pending_command_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', screenId);

    if (updateError) {
      console.error('Failed to queue reboot command:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to queue reboot command',
      });
    }

    // Also create a screen_commands record for tracking
    await supabase.from('screen_commands').insert({
      screen_id: screenId,
      command: 'reboot',
      status: 'pending',
      issued_by: context.userId,
      issued_at: new Date().toISOString(),
      metadata: {
        reason: reason || 'Admin action',
        adminEmail: context.email,
      },
    }).catch(err => {
      // Table might not exist, that's OK
      console.warn('Could not log screen command:', err.message);
    });

    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: screen.tenant_id,
      user_id: context.userId,
      action: 'admin.screen_reboot',
      resource_type: 'screen',
      resource_id: screenId,
      metadata: {
        screenName: screen.name,
        deviceId: screen.device_id,
        previousStatus: screen.status,
        reason: reason || 'Admin action',
        adminEmail: context.email,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        screenId,
        screenName: screen.name,
        deviceId: screen.device_id,
        command: 'reboot',
        status: 'pending',
        message: `Reboot command queued for screen "${screen.name}"`,
      },
    });
  } catch (error) {
    console.error('Admin screen reboot error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
