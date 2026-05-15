/**
 * Phase 177 gap-closure (177-09) RED → GREEN — BL-03 reject idempotency + race guard.
 *
 * Verifies the reject handler symmetrically guards against:
 *   1. Re-reject overwriting original reviewer's audit metadata (idempotency)
 *   2. Concurrent-approve race producing 'rejected' draft + active svg_templates row
 *
 * Pure file-source assertions (no env required, no Vite/Deno bridge needed).
 * The live end-to-end coverage comes from the existing approveDraftPipeline
 * test fixture (env-gated) when extended in a future cycle.
 *
 * Source: 177-VERIFICATION.md gap #3 (truth: "Reject is idempotent and audit-trail-preserving")
 *         + 177-REVIEW.md §BL-03.
 *
 * Requirements covered: TADM-02 (Reject row action audit-trail integrity).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REJECT_PATH = path.resolve(
  __dirname,
  '../../supabase/functions/generate-svg-template/handlers/reject.ts'
);

describe('Phase 177-09 — reject idempotency + race guard (BL-03)', () => {
  const src = fs.readFileSync(REJECT_PATH, 'utf8');

  it('Test 1: idempotency guard — reject.ts has draft.status === "rejected" check', () => {
    expect(src).toMatch(/draft\.status\s*===\s*["']rejected["']/);
  });

  it('Test 2: race guard — UPDATE has .in("status", ["pending", "needs_human_review"])', () => {
    // BL-NEW-02 widening: match approve.ts:124 status set so admins can reject
    // needs_human_review drafts (the queue surfaces both statuses).
    expect(src).toMatch(/\.in\(\s*["']status["']\s*,\s*\[\s*["']pending["']\s*,\s*["']needs_human_review["']\s*\]\s*\)/);
  });

  it('Test 3: PGRST116 race-error message documented', () => {
    expect(src).toMatch(/Cannot reject — draft was concurrently approved or already rejected|Cannot reject - draft was concurrently approved or already rejected/);
    expect(src).toMatch(/PGRST116|code === ["']PGRST116["']/);
  });

  it('Test 4: pre-existing T-177-11 guard preserved (cannot reject approved)', () => {
    expect(src).toMatch(/Cannot reject an already-approved draft/);
  });

  it('Test 5: idempotency guard appears BEFORE approved-check (re-reject is fast-path, not error)', () => {
    // Find positions of both guards
    const rejectedGuardIdx = src.search(/draft\.status\s*===\s*["']rejected["']/);
    const approvedGuardIdx = src.search(/Cannot reject an already-approved draft/);
    expect(rejectedGuardIdx).toBeGreaterThan(0);
    expect(approvedGuardIdx).toBeGreaterThan(0);
    // Idempotency guard MUST come first.
    expect(rejectedGuardIdx).toBeLessThan(approvedGuardIdx);
  });
});
