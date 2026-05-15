#!/usr/bin/env node
/**
 * Phase 178 Plan 08 Task 1 — sanitize SVG content for failed drafts so they
 * can pass the rasterizer's strict XML parser, then re-bulk-approve.
 *
 * Failure modes observed in Wave 1 bulk-approve attempt:
 *   1. Bare `&` in text content (entity reference malformed) — the EF
 *      validator-at-ingest accepts these as `pending` but DOMPurify/sharp
 *      reject them. Fix: replace `&` not followed by a known entity with
 *      `&amp;`.
 *   2. SVG wrapped in `<![CDATA[ ... ]]>` (LLM pollution) — fix: strip the
 *      wrapper so content begins with `<svg ...`.
 *
 * Sanitization rule (mirrors what DOMPurify/sharp expect):
 *   - Replace bare `&` (not part of `&amp;|&lt;|&gt;|&quot;|&apos;|&#NNN;|&#xHEX;`)
 *     with `&amp;`.
 *   - If content begins with `<![CDATA[`, strip the wrapper + matching `]]>`.
 *   - If content begins with `<?xml ... ?>`, leave it (rasterizer handles it).
 */
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SINCE = process.argv[2] || '2026-05-10T16:34:00Z';
const VERTICAL = process.argv[3] || 'restaurants';

function sanitizeSvg(raw) {
  let s = raw;
  let changed = false;

  // 1. Strip CDATA wrapper if present
  if (s.startsWith('<![CDATA[')) {
    s = s.slice('<![CDATA['.length);
    if (s.endsWith(']]>')) s = s.slice(0, -3);
    changed = true;
  }

  // 2. Strip ```svg / ``` code fences (another LLM pollution pattern)
  s = s.replace(/^```(?:svg|xml)?\s*\n/, (m) => { changed = true; return ''; });
  s = s.replace(/\n```\s*$/, (m) => { changed = true; return ''; });

  // 3. Escape bare ampersands. JS regex supports negative lookahead.
  // We replace `&` NOT followed by a valid entity start.
  const before = s;
  s = s.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
  if (s !== before) changed = true;

  return { svg: s, changed };
}

(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch all still-pending drafts (the ones approve_bulk failed on, plus any
  // not yet attempted).
  const { data: drafts, error } = await db
    .from('template_drafts')
    .select('id, svg_content')
    .eq('vertical', VERTICAL)
    .eq('status', 'pending')
    .gte('created_at', SINCE);
  if (error) {
    console.error('SELECT failed:', error.message);
    process.exit(1);
  }
  console.log('Pending ' + VERTICAL + ' drafts to sanitize: ' + drafts.length);

  let fixed = 0;
  let unchanged = 0;
  for (const d of drafts) {
    const { svg, changed } = sanitizeSvg(d.svg_content);
    if (!changed) {
      unchanged++;
      continue;
    }
    const { error: updErr } = await db
      .from('template_drafts')
      .update({ svg_content: svg })
      .eq('id', d.id);
    if (updErr) {
      console.error('UPDATE failed for ' + d.id + ': ' + updErr.message);
      continue;
    }
    fixed++;
  }
  console.log('Fixed: ' + fixed + ', unchanged: ' + unchanged);
})();
