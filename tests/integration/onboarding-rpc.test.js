/**
 * Phase 174 — Onboarding RPC contract tests (TONB-03).
 *
 * RED state until Plan 02 deploys the migration (extends get_onboarding_progress
 * + update_onboarding_step) and Plan 07 wires the markGalleryTourSeen export.
 *
 * Decision anchors:
 *   - 174-CONTEXT.md §D-12 (completed_starter_pack column)
 *   - 174-CONTEXT.md §D-14 (RPC extensions — get_onboarding_progress return shape, update_onboarding_step allowlist)
 *   - 174-CONTEXT.md §D-16 (completed_gallery_tour column)
 *   - 174-CONTEXT.md §D-17, D-19 (markGalleryTourSeen mutation)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import {
  updateOnboardingStep,
  getOnboardingProgress,
  markGalleryTourSeen,
} from '../../src/services/onboardingService';
import { supabase } from '../../src/supabase';

describe('Phase 174 onboarding RPC contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updateOnboardingStep("starter_pack", true) calls update_onboarding_step RPC with p_step="starter_pack" (D-14)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await updateOnboardingStep('starter_pack', true);
    expect(supabase.rpc).toHaveBeenCalledWith('update_onboarding_step', {
      p_step: 'starter_pack',
      p_completed: true,
    });
  });

  it('getOnboardingProgress maps completed_starter_pack and completed_gallery_tour to camelCase (D-14, D-17)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [
        {
          completed_welcome: true,
          completed_logo: false,
          completed_first_media: false,
          completed_first_playlist: false,
          completed_first_screen: false,
          completed_screen_pairing: false,
          completed_starter_pack: true,
          completed_gallery_tour: false,
          is_complete: false,
          skipped_at: null,
          completed_at: null,
          current_step: 'starter_pack',
        },
      ],
      error: null,
    });
    const progress = await getOnboardingProgress();
    expect(progress.completedStarterPack).toBe(true);
    expect(progress.completedGalleryTour).toBe(false);
  });

  it('markGalleryTourSeen calls update_onboarding_step with p_step="gallery_tour", p_completed=true (D-17, D-19)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await markGalleryTourSeen();
    expect(supabase.rpc).toHaveBeenCalledWith('update_onboarding_step', {
      p_step: 'gallery_tour',
      p_completed: true,
    });
  });
});
