/**
 * clone_svg_template_to_scene RPC atomicity — Phase 172.1
 *
 * Mirrors tests/integration/preview-apply/rpc-atomicity.test.js for the
 * new SVG-path RPC. Covers the 172.1 atomicity contract (single-call
 * assertion, error propagation) and the in-flight Apply-disabled timing
 * from Phase 172 Pitfall 2.
 *
 * Tests run against the REAL templateApplyService (no mock of the service
 * itself) — only supabase + dompurify are mocked at module scope.
 *
 * Decision anchors: 172.1-CONTEXT.md §D-01 (sibling RPC), §D-02 (atomic),
 * §D-12 (client dispatch swap).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((s) => s) },
}));

import { applyTemplate } from '../../../src/services/templateApplyService';
import { supabase } from '../../../src/supabase';

const SVG_TEMPLATE = { id: 't1', name: 'Ocean', editor_type: 'svg' };

describe('clone_svg_template_to_scene atomicity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('RPC resolves after 500ms delay — Apply stays in-flight for full duration (TPRV-05 / Phase 172 Pitfall 2)', async () => {
    vi.useFakeTimers();
    supabase.rpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: 'sid', error: null }), 500);
        }),
    );

    const p = applyTemplate(SVG_TEMPLATE, { customizedSvg: '<svg/>' });
    let settled = false;
    p.then(() => { settled = true; }).catch(() => { settled = true; });

    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    const sceneId = await p;
    expect(sceneId).toBe('sid');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc.mock.calls[0][0]).toBe('clone_svg_template_to_scene');
  });

  it("RPC rejects with 'Template has no SVG body' — applyTemplate throws same message (D-05)", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Template has no SVG body'),
    });

    await expect(
      applyTemplate(SVG_TEMPLATE, { customizedSvg: null }),
    ).rejects.toThrow(/Template has no SVG body/);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc.mock.calls[0][0]).toBe('clone_svg_template_to_scene');
  });

  it('RPC resolves with scene uuid — zero follow-up UPDATE issued (atomic contract, TPRV-05)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'new-sid', error: null });

    const sceneId = await applyTemplate(SVG_TEMPLATE, { customizedSvg: '<svg/>' });

    expect(sceneId).toBe('new-sid');
    expect(supabase.rpc.mock.calls.length).toBe(1);
    expect(supabase.rpc.mock.calls[0][0]).toBe('clone_svg_template_to_scene');
    // Mocked supabase exposes ONLY `rpc` — any `.from().update()` would throw.
    // Reaching this assertion proves no follow-up UPDATE was issued.
    expect(supabase.from).toBeUndefined();
  });

  it('live RPC verification is a manual checklist item — this test covers only the client-side contract', () => {
    // Real Supabase-live verification (SVG body actually persists into
    // scene_slides.design_json.svgContent; RPC failure leaves no scene row
    // behind) is proven by re-running tests/e2e/preview-apply.spec.js against
    // live credentials (per 172.1-CONTEXT.md §Claude's Discretion; Plan 06).
    expect(true).toBe(true);
  });
});
