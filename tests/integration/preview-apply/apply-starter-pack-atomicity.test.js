/**
 * Phase 173 — apply_starter_pack atomicity contract.
 *
 * RED state until Plan 05 wires the client wrapper and Plan 03 deploys the RPC.
 * After Plan 05 + Plan 04 (db push), all 4 cases must go GREEN.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { applyStarterPack } from '../../../src/services/marketplaceService';
import { supabase } from '../../../src/supabase';

describe('apply_starter_pack atomicity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves with uuid[] of new scene IDs when all members succeed (D-07, TPCK-02)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1','s2','s3'], error: null });
    const ids = await applyStarterPack('pack-uuid-1');
    expect(ids).toEqual(['s1','s2','s3']);
    expect(supabase.rpc.mock.calls[0][0]).toBe('apply_starter_pack');
    expect(supabase.rpc.mock.calls[0][1]).toEqual({ p_pack_id: 'pack-uuid-1' });
  });

  it('throws original error message when RPC fails mid-pack (rollback contract, D-07)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('SVG member template has no SVG body: <uuid>'),
    });
    await expect(applyStarterPack('pack-uuid-2')).rejects.toThrow(/SVG member template has no SVG body/);
    expect(supabase.rpc.mock.calls.length).toBe(1);
  });

  it('empty pack returns [] without error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    const ids = await applyStarterPack('empty-pack');
    expect(ids).toEqual([]);
  });

  it('zero follow-up UPDATEs — proves atomic contract (no client-side stitching)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1'], error: null });
    await applyStarterPack('pack-uuid-3');
    expect(supabase.rpc.mock.calls.length).toBe(1);
    expect(supabase.from).toBeUndefined();
  });
});
