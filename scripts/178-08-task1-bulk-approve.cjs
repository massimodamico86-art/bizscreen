#!/usr/bin/env node
/**
 * Phase 178 Plan 08 Task 1 — auto-bulk-approve all pending Restaurants drafts
 * via the EF action=approve_bulk (Plan 05's work). Mirrors the UI flow from
 * Plan 06 (REAL chunking, ≤50 IDs per call, sequential dispatch).
 */
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL;
const TEST_SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD;
const SINCE = process.argv[2] || '2026-05-10T16:34:00Z';
const VERTICAL = process.argv[3] || 'restaurants';

const BULK_HARD_CAP = 50;

(async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY ||
      !TEST_SUPERADMIN_EMAIL || !TEST_SUPERADMIN_PASSWORD) {
    console.error('Missing required env vars');
    process.exit(1);
  }

  // Service-role client for the SELECT
  const dbClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // JWT-bound client for the EF call (admin gate)
  const efClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signin, error: signinErr } = await efClient.auth.signInWithPassword({
    email: TEST_SUPERADMIN_EMAIL,
    password: TEST_SUPERADMIN_PASSWORD,
  });
  if (signinErr || !signin.session) {
    console.error('Admin signin failed');
    process.exit(1);
  }
  console.log('Admin signin OK');

  // Fetch all pending IDs for this vertical
  const { data: drafts, error: selErr } = await dbClient
    .from('template_drafts')
    .select('id, created_at')
    .eq('vertical', VERTICAL)
    .eq('status', 'pending')
    .gte('created_at', SINCE)
    .order('created_at', { ascending: true });

  if (selErr) {
    console.error('SELECT failed:', selErr.message);
    process.exit(1);
  }
  console.log('Pending ' + VERTICAL + ' drafts (since ' + SINCE + '): ' + drafts.length);

  if (drafts.length === 0) {
    console.log('Nothing to approve');
    process.exit(0);
  }

  // Chunk into ≤50-sized batches (matches BULK_HARD_CAP in EF approve_bulk handler)
  const ids = drafts.map((d) => d.id);
  const chunks = [];
  for (let i = 0; i < ids.length; i += BULK_HARD_CAP) {
    chunks.push(ids.slice(i, i + BULK_HARD_CAP));
  }
  console.log('Chunked into ' + chunks.length + ' bulk calls (sizes: ' +
    chunks.map((c) => c.length).join(', ') + ')');

  let totalOk = 0;
  let totalFail = 0;
  const failures = [];
  const startMs = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkStart = Date.now();
    process.stdout.write('Chunk ' + (i + 1) + '/' + chunks.length +
      ' (' + chunk.length + ' IDs)... ');
    const { data, error } = await efClient.functions.invoke('generate-svg-template', {
      body: { action: 'approve_bulk', draftIds: chunk },
    });
    if (error) {
      console.log('ERROR: ' + error.message);
      totalFail += chunk.length;
      failures.push({ chunk: i + 1, error: error.message });
      continue;
    }
    if (!data || !Array.isArray(data.results)) {
      console.log('UNEXPECTED RESPONSE');
      console.log(JSON.stringify(data).slice(0, 300));
      totalFail += chunk.length;
      failures.push({ chunk: i + 1, error: 'no results array' });
      continue;
    }
    const ok = data.results.filter((r) => r.ok).length;
    const fail = data.results.length - ok;
    totalOk += ok;
    totalFail += fail;
    if (fail > 0) {
      for (const r of data.results) {
        if (!r.ok) failures.push({ id: r.draftId, error: r.error });
      }
    }
    const chunkMs = Date.now() - chunkStart;
    console.log(ok + '/' + data.results.length + ' ok, ' + chunkMs + 'ms');
  }

  const elapsedMs = Date.now() - startMs;
  console.log('---');
  console.log('Total: ' + totalOk + ' approved, ' + totalFail + ' failed (' +
    elapsedMs + 'ms)');
  if (failures.length > 0) {
    console.log('First 10 failures:');
    for (const f of failures.slice(0, 10)) {
      console.log('  ' + JSON.stringify(f).slice(0, 200));
    }
  }
  process.exit(totalFail > 0 ? 2 : 0);
})();
