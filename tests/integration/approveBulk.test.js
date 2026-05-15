/**
 * Phase 178 Wave 0 RED — approve_bulk EF handler source-shape (BL-178-02).
 *
 * No env required — pure source-shape assertions on a not-yet-existing file.
 *
 * RED in Wave 0: handlers/approve_bulk.ts does not exist yet.
 * `fs.readFileSync` inside each `it()` body throws ENOENT → vitest reports a
 * failing test (not a module-load crash; the `it()` boundary catches it).
 *
 * Plan 05 (Wave 2) ships approve_bulk.ts following the per-row approve.ts atomic
 * 4-step flow (validateSvg → rasterize → uploadPng → rpc('approve_draft_atomic'))
 * looped serially (NO Promise.all) with 300ms throttle and a hard cap of 50 IDs/call.
 *
 * Mirror of: tests/integration/approveAtomicity.test.js Test 1 (file-source shape).
 *
 * Requirements covered: TCAT-01 (bulk approve gate), BL-178-02.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HANDLER = path.resolve(
  __dirname,
  '../../supabase/functions/generate-svg-template/handlers/approve_bulk.ts',
);

describe('Phase 178 Wave 0 RED — approve_bulk handler source contract (BL-178-02)', () => {
  it('handler imports the per-row approve(...) function from ./approve.ts (no logic duplication)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/import\s+\{\s*approve\s*\}\s+from\s+["']\.\/approve\.ts["']/);
  });

  it('handler enforces BULK_HARD_CAP = 50 (rejects 400 if exceeded)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/BULK_HARD_CAP\s*=\s*50/);
  });

  it('handler uses 300ms inter-call delay (Pitfall 3 — serial throttle)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/await\s+new\s+Promise\(\s*r\s*=>\s*setTimeout\(r,\s*300/);
  });

  it('handler does NOT use Promise.all over draftIds (zero unbounded fan-out)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).not.toMatch(/Promise\.all\s*\(/);
  });

  it('handler defines an ApproveBulkBody interface with draftIds: string[]', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/interface\s+ApproveBulkBody/);
    expect(src).toMatch(/draftIds\s*:\s*string\[\]/);
  });
});
