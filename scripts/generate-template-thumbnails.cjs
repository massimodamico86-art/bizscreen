#!/usr/bin/env node
/**
 * generate-template-thumbnails.cjs — Phase 175 Plan 03 (TCTN-04)
 *
 * Walks svg_templates rows where thumbnail IS NULL or points at the inline
 * /templates/svg/<slug>/design.svg, rasterizes each SVG via @resvg/resvg-js,
 * uploads to S3 via /api/media/presign, UPDATEs the row.
 *
 * Pitfall 3 (RESEARCH.md): serial loop with 300ms delay — NEVER use unbounded parallelism (no Promise#all over the row set).
 *
 * Usage:
 *   node scripts/generate-template-thumbnails.cjs --dry-run
 *   node scripts/generate-template-thumbnails.cjs --slug restaurant-menu-1 --verbose
 *   node scripts/generate-template-thumbnails.cjs --limit 5
 *   node scripts/generate-template-thumbnails.cjs --help
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { createClient } = require('@supabase/supabase-js');

// dotenv (mirror scripts/batch-auto-tag-templates.cjs env-loading pattern)
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

// ----- CLI args -----
const args = process.argv.slice(2);
const options = {
  dryRun: false,
  slug: null,
  limit: null,
  verbose: false,
  outDir: '/tmp/phase175-thumbnails',
};
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--dry-run': options.dryRun = true; break;
    case '--slug': options.slug = args[++i]; break;
    case '--limit': options.limit = parseInt(args[++i], 10); break;
    case '--verbose': options.verbose = true; break;
    case '--out-dir': options.outDir = args[++i]; break;
    case '--help':
      console.log(`Usage: node scripts/generate-template-thumbnails.cjs [options]

Options:
  --dry-run         Rasterize to --out-dir (default /tmp/phase175-thumbnails); DO NOT upload to S3 or UPDATE DB
  --slug <slug>     Process only the row with this slug (single-row mode)
  --limit <N>       Process at most N rows (useful for batched runs)
  --verbose         Print each row + size + URL
  --out-dir <path>  Where to write PNGs in --dry-run mode (default /tmp/phase175-thumbnails)
  --help            Show this message`);
      process.exit(0);
  }
}

// ----- Resvg rasterizer -----
function rasterize(svgString, { width, height }) {
  const useWidthFit = width >= height;
  const resvg = new Resvg(svgString, {
    fitTo: useWidthFit
      ? { mode: 'width', value: width }
      : { mode: 'height', value: height },
    background: 'rgba(255, 255, 255, 1)',
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}

module.exports.rasterize = rasterize; // exported for tests/integration/thumbnails.test.js

// ----- S3 presign + PUT (mirrors src/services/svgTemplateService.js:27-66) -----
async function uploadToS3(buffer, slug) {
  const apiBase = process.env.VITE_API_URL || process.env.API_URL;
  if (!apiBase) throw new Error('VITE_API_URL or API_URL not set — cannot reach presign endpoint');

  const filename = `thumbnail-${slug}-${Date.now()}.png`;
  const presignRes = await fetch(`${apiBase}/api/media/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType: 'image/png', folder: 'thumbnails/system' }),
  });
  if (!presignRes.ok) {
    const errBody = await presignRes.text();
    throw new Error(`presign failed (${presignRes.status}): ${errBody.slice(0, 200)}`);
  }
  const { uploadUrl, fileUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`S3 PUT failed (${putRes.status})`);
  return fileUrl;
}

// ----- SVG source resolver -----
async function resolveSvgString(svgUrl) {
  if (!svgUrl) throw new Error('Empty svg_url');
  if (/^https?:\/\//.test(svgUrl)) {
    const res = await fetch(svgUrl);
    if (!res.ok) throw new Error(`fetch ${svgUrl} -> ${res.status}`);
    return await res.text();
  }
  // Treat as repo-relative path. svg_url like '/templates/svg/<slug>/design.svg'
  const rel = svgUrl.replace(/^\/+/, '');
  const filePath = path.resolve(__dirname, '..', 'public', rel);
  if (!fs.existsSync(filePath)) {
    // some rows may use a different filename like menu-design.svg — try the slug dir
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir)) {
      const candidates = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.svg'));
      if (candidates.length > 0) return fs.readFileSync(path.join(dir, candidates[0]), 'utf8');
    }
    throw new Error(`SVG not found on disk: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

// ----- Eligibility predicate -----
function isEligible(row) {
  if (!row.thumbnail) return true;
  if (row.thumbnail === '') return true;
  if (/\/templates\/svg\//.test(row.thumbnail)) return true; // existing inline pattern
  if (/\.svg($|\?)/i.test(row.thumbnail)) return true; // svg path, not raster
  if (/^https?:\/\//.test(row.thumbnail)) return false; // already an S3 URL — skip
  return true;
}

// ----- Main -----
async function main() {
  if (options.dryRun) {
    if (!fs.existsSync(options.outDir)) fs.mkdirSync(options.outDir, { recursive: true });
  }

  // Supabase is required when (a) we will write (non-dry-run), OR
  // (b) we need to look up a specific slug's metadata.
  // A bare `--dry-run` (no --slug) walks public/templates/svg/* from disk and
  // does not require Supabase credentials — this is the path exercised by the
  // acceptance-criteria smoke (`--dry-run --limit 1 --verbose`).
  let supabase = null;
  const needsSupabase = !options.dryRun || (options.dryRun && options.slug);
  if (needsSupabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not in env — set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
      process.exit(1);
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Fetch candidate rows
  let rows;
  if (supabase) {
    let query = supabase
      .from('svg_templates')
      .select('id, slug, svg_url, thumbnail, orientation, width, height')
      .eq('is_active', true)
      .is('tenant_id', null);
    if (options.slug) query = query.eq('slug', options.slug);
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) { console.error('Supabase select failed:', error); process.exit(1); }
    rows = (data || []).filter(isEligible);
  } else {
    // dry-run without slug, no DB needed — degrade to "process every public/templates/svg/* on disk"
    const baseDir = path.resolve(__dirname, '..', 'public', 'templates', 'svg');
    const slugs = fs.readdirSync(baseDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    rows = slugs.map((slug) => ({
      slug,
      svg_url: `/templates/svg/${slug}/design.svg`,
      orientation: 'landscape',
      width: 1920,
      height: 1080,
    }));
    if (options.limit) rows = rows.slice(0, options.limit);
  }

  if (rows.length === 0) {
    console.log('No eligible rows — nothing to do.');
    process.exit(0);
  }

  console.log(`Processing ${rows.length} row(s) ${options.dryRun ? '(dry-run)' : ''}`);

  let ok = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const orientation = row.orientation || 'landscape';
    const target = orientation === 'portrait' ? { width: 270, height: 480 } : { width: 480, height: 270 };

    try {
      const svg = await resolveSvgString(row.svg_url);
      const png = rasterize(svg, target);
      if (options.verbose) console.log(`[${i + 1}/${rows.length}] ${row.slug} (${orientation}) -> ${png.length} bytes`);

      if (options.dryRun) {
        const out = path.join(options.outDir, `${row.slug}.png`);
        fs.writeFileSync(out, png);
        console.log(`  wrote ${out}`);
      } else {
        const fileUrl = await uploadToS3(png, row.slug);
        const { error: updError } = await supabase
          .from('svg_templates')
          .update({ thumbnail: fileUrl })
          .eq('id', row.id);
        if (updError) throw new Error(`UPDATE failed: ${updError.message}`);
        if (options.verbose) console.log(`  uploaded -> ${fileUrl}`);
      }
      ok++;
    } catch (e) {
      console.error(`[${i + 1}/${rows.length}] FAIL ${row.slug}: ${e.message}`);
      failed++;
    }

    // Pitfall 3: serial 300ms delay between iterations (do NOT switch to unbounded parallel `Promise#all`).
    if (i < rows.length - 1) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== Summary ===\nProcessed: ${rows.length}\nSuccess:   ${ok}\nFailed:    ${failed}`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
}
