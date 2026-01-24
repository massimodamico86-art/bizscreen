/**
 * GDPR Export Processing API
 *
 * Processes pending data export requests.
 * Called by scheduled job or admin trigger.
 *
 * POST /api/gdpr/process-exports
 * Requires service role authorization
 */

import { createClient } from '@supabase/supabase-js';

// Create service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function POST(request) {
  try {
    // Verify service role auth (simple bearer token check)
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.GDPR_API_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get pending exports
    const { data: pendingExports, error: fetchError } = await supabaseAdmin
      .rpc('get_pending_exports');

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!pendingExports || pendingExports.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No pending exports' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // Process each export
    for (const exportRequest of pendingExports) {
      const { data: result, error } = await supabaseAdmin
        .rpc('process_data_export', { p_request_id: exportRequest.id });

      if (error) {
        results.push({ id: exportRequest.id, success: false, error: error.message });
      } else {
        // Send notification email
        try {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', exportRequest.user_id)
            .single();

          if (profile?.email) {
            // Dynamic import to avoid bundling issues in API routes
            const { sendExportReadyEmail } = await import('../../services/emailService.js');

            const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'https://app.bizscreen.com';
            await sendExportReadyEmail({
              to: profile.email,
              downloadUrl: `${appUrl}/settings/privacy?export=${exportRequest.id}`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
        } catch (emailError) {
          // Email is non-critical, log but don't fail the export
          console.error('Failed to send export ready email:', emailError.message);
        }
        results.push({ id: exportRequest.id, success: true });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

