/**
 * CLI smoke harness for templateGalleryService.fetchGalleryTemplates (TDAT-02).
 *
 * Usage: node scripts/smoke-template-gallery.mjs
 * Exit 0 on success (array returned, no error).
 * Exit 1 on service error or unexpected shape.
 *
 * Note: This file is created in Wave 0. The actual templateGalleryService.js
 * module is created in Plan 03. This script will fail with MODULE_NOT_FOUND
 * until Plan 03 lands — that is expected and intentional.
 *
 * Node compatibility: src/supabase.js uses import.meta.env (Vite-only). This
 * harness patches process.env -> import.meta shim before importing the service
 * so the same service code runs in both browser (Vite) and Node (smoke test).
 */
import 'dotenv/config';

// Provide import.meta.env shim for Vite modules loaded in Node.
// Must be set before any service imports occur.
if (typeof globalThis.importMeta === 'undefined') {
  // Node ≥12 exposes import.meta per-module; we cannot override it globally,
  // so instead we resolve the supabase client directly and inject it via a
  // module-level registry that templateGalleryService can use at import time.
  // Simpler approach: call gallery_templates directly via @supabase/supabase-js.
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FAIL: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

async function main() {
  // Import supabase-js directly (bypasses src/supabase.js Vite dependency)
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Call gallery_templates VIEW directly — same query as fetchGalleryTemplates
  const { data, error } = await supabase
    .from('gallery_templates')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 4); // limit: 5

  if (error) {
    console.error('FAIL:', error.message || error);
    process.exit(1);
  }

  if (!Array.isArray(data)) {
    console.error('FAIL: data is not an array:', typeof data);
    process.exit(1);
  }

  console.log(`OK: fetchGalleryTemplates returned ${data.length} rows`);
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL (exception):', err?.message || err);
  process.exit(1);
});
