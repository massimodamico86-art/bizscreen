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
        // Send notification email (fire and forget)
        await sendExportReadyEmail(exportRequest.user_id, exportRequest.id);
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

async function sendExportReadyEmail(userId, requestId) {
  try {
    // Get user email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    // TODO: Integrate with emailService when running server-side
    // For now, log the notification
    console.log(`Export ready notification for ${profile.email}, request ${requestId}`);
  } catch {
    // Silent fail - email is non-critical
  }
}
