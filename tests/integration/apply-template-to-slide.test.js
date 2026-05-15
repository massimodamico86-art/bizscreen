/**
 * Phase 174 — apply_template_to_active_slide atomicity contract (TEDR-02).
 *
 * RED state until Plan 04 wires the client wrapper and Plan 03 deploys the RPC.
 * After Plan 04 + Plan 03 (db push), all 4 cases must go GREEN.
 *
 * Decision anchors:
 *   - 174-CONTEXT.md §D-05 (RPC contract — single PL/pgSQL transaction, returns slide UUID)
 *   - 174-CONTEXT.md §D-02 (polotno rejection at RPC layer)
 *   - 174-CONTEXT.md §D-06 (client wrapper signature)
 *
 * Mirrors the structure of tests/integration/preview-apply/apply-starter-pack-atomicity.test.js
 * (Phase 173 blueprint — supabase mock + single-rpc atomicity proof).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { applyTemplateToActiveSlide } from '../../src/services/marketplaceService';
import { supabase } from '../../src/supabase';

describe('apply_template_to_active_slide atomicity (Phase 174 TEDR-02)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves with slide UUID on success (D-05)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-uuid-1', error: null });
    const id = await applyTemplateToActiveSlide('scene-1', 'slide-1', 'tmpl-1', 'svg');
    expect(id).toBe('slide-uuid-1');
    expect(supabase.rpc.mock.calls[0][0]).toBe('apply_template_to_active_slide');
    expect(supabase.rpc.mock.calls[0][1]).toEqual({
      p_scene_id: 'scene-1',
      p_slide_id: 'slide-1',
      p_template_id: 'tmpl-1',
      p_editor_type: 'svg',
    });
  });

  it('throws on RPC error (atomicity contract)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Template has no SVG body'),
    });
    await expect(
      applyTemplateToActiveSlide('scene-1', 'slide-1', 'tmpl-1', 'svg'),
    ).rejects.toThrow(/Template has no SVG body/);
  });

  it('zero follow-up calls — single RPC round-trip proves atomicity', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-uuid-2', error: null });
    await applyTemplateToActiveSlide('scene-1', 'slide-1', 'tmpl-1', 'svg');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    // Mocked supabase exposes ONLY `rpc` — any `.from().update()` would throw.
    expect(supabase.from).toBeUndefined();
  });

  it('polotno editor_type is rejected server-side (D-02)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Only SVG templates supported in editor-return mode'),
    });
    await expect(
      applyTemplateToActiveSlide('scene-1', 'slide-1', 'tmpl-1', 'polotno'),
    ).rejects.toThrow(/Only SVG templates supported/);
  });
});
