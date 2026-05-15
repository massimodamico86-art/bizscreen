/**
 * Phase 178 Wave 0 RED — reject_bulk EF handler source-shape (BL-178-03).
 *
 * No env required — pure source-shape assertions on a not-yet-existing file.
 *
 * RED in Wave 0: handlers/reject_bulk.ts does not exist yet.
 * Plan 05 (Wave 2) ships reject_bulk.ts mirroring approve_bulk.ts but looping
 * the per-row reject(...) function from ./reject.ts. Shared `reason?: string`
 * field applies to every row in the batch.
 *
 * BL-03 race guard from reject.ts (.in('status', ['pending','needs_human_review']))
 * is preserved per-ID — bulk introduces no new mutation site.
 *
 * Requirements covered: TCAT-03 (bulk reject gate), BL-178-03.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const HANDLER = path.resolve(
  __dirname,
  '../../supabase/functions/generate-svg-template/handlers/reject_bulk.ts',
);

describe('Phase 178 Wave 0 RED — reject_bulk handler source contract (BL-178-03)', () => {
  it('handler imports the per-row reject(...) function from ./reject.ts (no logic duplication)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/import\s+\{\s*reject\s*\}\s+from\s+["']\.\/reject\.ts["']/);
  });

  it('handler uses 300ms inter-call delay (Pitfall 3 — serial throttle)', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/await\s+new\s+Promise\(\s*r\s*=>\s*setTimeout\(r,\s*300/);
  });

  it('handler does NOT use Promise.all over draftIds', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).not.toMatch(/Promise\.all\s*\(/);
  });

  it('handler defines a RejectBulkBody interface with draftIds: string[] and reason?: string', () => {
    const src = fs.readFileSync(HANDLER, 'utf8');
    expect(src).toMatch(/interface\s+RejectBulkBody/);
    expect(src).toMatch(/draftIds\s*:\s*string\[\]/);
    expect(src).toMatch(/reason\?\s*:\s*string/);
  });
});
