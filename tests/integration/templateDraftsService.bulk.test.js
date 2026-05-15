/**
 * Phase 178 Wave 0 RED — templateDraftsService bulk helper contract (D-05/D-06).
 *
 * No env required — mocks `../../supabase` so `supabase.functions.invoke` is
 * a vi.fn spy.
 *
 * RED in Wave 0: bulkApproveDrafts and bulkRejectDrafts do not exist on the
 * service yet. The dynamic import inside each `it()` body resolves to the
 * existing module, but the named export is undefined → TypeError at call site,
 * vitest reports a failing test.
 *
 * Plan 06 (Wave 3) ships:
 *   bulkApproveDrafts(draftIds: string[]) → invokes EF body { action: 'approve_bulk', draftIds }
 *   bulkRejectDrafts(draftIds: string[], reason?: string) → invokes EF body { action: 'reject_bulk', draftIds, reason }
 * Both helpers throw when `error` is truthy (mirrors existing approveDraft/rejectDraft).
 *
 * Requirements covered: D-05/D-06 (service contract), TCAT-01 + TCAT-03 indirectly
 * (they're the consumer of the EF bulk handlers).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeSpy = vi.fn();

vi.mock('../../src/supabase', () => ({
  supabase: {
    functions: { invoke: invokeSpy },
  },
}));

beforeEach(() => {
  invokeSpy.mockReset();
});

describe('Phase 178 Wave 0 RED — bulkApproveDrafts / bulkRejectDrafts service helpers (D-05/D-06)', () => {
  it('bulkApproveDrafts invokes EF with action=approve_bulk and forwards draftIds', async () => {
    invokeSpy.mockResolvedValueOnce({
      data: { ok: true, results: [{ ok: true }, { ok: true }] },
      error: null,
    });
    const { bulkApproveDrafts } = await import(
      '../../src/services/aiTemplate/templateDraftsService.js'
    );
    const out = await bulkApproveDrafts(['id-1', 'id-2']);
    expect(invokeSpy).toHaveBeenCalledWith('generate-svg-template', {
      body: { action: 'approve_bulk', draftIds: ['id-1', 'id-2'] },
    });
    expect(out).toEqual({ ok: true, results: [{ ok: true }, { ok: true }] });
  });

  it('bulkApproveDrafts throws when invoke returns truthy error', async () => {
    invokeSpy.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    const { bulkApproveDrafts } = await import(
      '../../src/services/aiTemplate/templateDraftsService.js'
    );
    await expect(bulkApproveDrafts(['id-1'])).rejects.toThrow(/boom/);
  });

  it('bulkRejectDrafts invokes EF with action=reject_bulk and forwards draftIds + reason', async () => {
    invokeSpy.mockResolvedValueOnce({ data: { ok: true, results: [{ ok: true }] }, error: null });
    const { bulkRejectDrafts } = await import(
      '../../src/services/aiTemplate/templateDraftsService.js'
    );
    const out = await bulkRejectDrafts(['id-9'], 'duplicate');
    expect(invokeSpy).toHaveBeenCalledWith('generate-svg-template', {
      body: { action: 'reject_bulk', draftIds: ['id-9'], reason: 'duplicate' },
    });
    expect(out).toEqual({ ok: true, results: [{ ok: true }] });
  });

  it('bulkRejectDrafts throws when invoke returns truthy error', async () => {
    invokeSpy.mockResolvedValueOnce({ data: null, error: new Error('rejected') });
    const { bulkRejectDrafts } = await import(
      '../../src/services/aiTemplate/templateDraftsService.js'
    );
    await expect(bulkRejectDrafts(['id-9'], 'duplicate')).rejects.toThrow(/rejected/);
  });
});
