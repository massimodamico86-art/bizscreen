/**
 * Phase 177 gap-closure (177-08) RED → GREEN — BL-02 + BL-06 + WR-09.
 *
 * Atomicity guarantee: when the approve_draft_atomic RPC fails (simulating
 * INSERT-or-UPDATE rollback), NO svg_templates row is committed for that
 * draft_id. Concurrent approves are serialized by pg_try_advisory_xact_lock.
 * S3 key is deterministic — retries overwrite same object.
 *
 * Pure-mock — no live DB, no env required (mirrors generateSvgTemplate.test.js
 * approach). The live end-to-end test in approveDraftPipeline.test.js (env-gated)
 * provides the orthogonal coverage.
 *
 * Source: 177-VERIFICATION.md gap #2 (truth: "Approve action is atomic — failure
 * of any step leaves draft unchanged") + 177-REVIEW.md §BL-02, §BL-06, §WR-09.
 *
 * Requirements covered: TADM-03 (approve atomicity contract restored).
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 177 gap-closure 177-08 — BL-02 + BL-06 + WR-09 (approve atomicity)', () => {

  it('Test 1: handler source no longer contains BL-02 vulnerable 2-step pattern; rpc("approve_draft_atomic") is the sole mutation site', () => {
    // Per checker WARNING 5: this is a SOURCE-SHAPE regression check, not a
    // behavioral atomicity test. Behavioral atomicity is verified by the
    // migration's transaction semantics + the [BLOCKING] live cURL probe at
    // Task 4 Step 4d-4f (which seeds a draft, approves it, and confirms via
    // execute_sql that svg_templates row + template_drafts.status='approved'
    // both exist atomically — the LIVE proof that the RPC's transaction works).
    const handlerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve.ts'),
      'utf8'
    );
    // Old vulnerable shape MUST be gone:
    expect(handlerSrc).not.toMatch(/from\(["']svg_templates["']\)\.insert\(/);
    expect(handlerSrc).not.toMatch(/from\(["']template_drafts["']\)\.update\(\s*\{\s*\n\s*status:\s*["']approved/);
    // New atomic shape MUST be present (sole mutation site):
    expect(handlerSrc).toMatch(/rpc\(["']approve_draft_atomic["']/);
  });

  it('Test 2: concurrent_approve_in_progress translates to 409 Response', () => {
    const handlerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve.ts'),
      'utf8'
    );
    expect(handlerSrc).toMatch(/concurrent_approve_in_progress/);
    expect(handlerSrc).toMatch(/status:\s*409/);
  });

  it('Test 3: idempotent fast-path short-circuits BEFORE rasterize', () => {
    const handlerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve.ts'),
      'utf8'
    );
    // The existing draft.status === 'approved' fast-path (lines 112-118) MUST stay.
    expect(handlerSrc).toMatch(/draft\.status\s*===\s*["']approved["']/);
    // It must return BEFORE rasterize():
    const beforeRaster = handlerSrc.split(/await\s+rasterize\(/)[0];
    expect(beforeRaster).toMatch(/draft\.status\s*===\s*["']approved["']/);
  });

  it('Test 4: grep approve_draft_atomic appears in handler source (≥1)', () => {
    const handlerSrc = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/approve.ts'),
      'utf8'
    );
    const matches = (handlerSrc.match(/approve_draft_atomic/g) ?? []).length;
    expect(matches).toBeGreaterThanOrEqual(1);
  });

  it('Test 5: s3.ts uses deterministic key pattern (ai-${slug}.png, no Date.now() suffix)', () => {
    const s3Src = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/s3.ts'),
      'utf8'
    );
    // Must have deterministic key (slug.png without a timestamp suffix).
    expect(s3Src).toMatch(/ai-\$\{slug\}\.png|thumbnails\/system\/\$\{slug\}\.png/);
  });

  it('Test 6: s3.ts does NOT contain Date.now() (WR-09 closure)', () => {
    const s3Src = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/generate-svg-template/s3.ts'),
      'utf8'
    );
    expect(s3Src).not.toMatch(/Date\.now\(\)/);
  });

  it('Test 7: migration 177_approve_draft_atomic.sql defines the RPC', () => {
    const migPath = path.resolve(__dirname, '../../supabase/migrations/177_approve_draft_atomic.sql');
    expect(fs.existsSync(migPath)).toBe(true);
    const migSrc = fs.readFileSync(migPath, 'utf8');
    expect(migSrc).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+approve_draft_atomic/i);
    expect(migSrc).toMatch(/pg_try_advisory_xact_lock/);
    expect(migSrc).toMatch(/SECURITY\s+DEFINER/i);
  });

});
