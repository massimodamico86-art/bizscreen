/**
 * Onboarding Service
 *
 * Manages the new tenant onboarding wizard flow including:
 * - Progress tracking across steps
 * - Step completion detection
 * - Skip functionality
 *
 * @module services/onboardingService
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('OnboardingService');

/**
 * @typedef {Object} OnboardingProgress
 * @property {boolean} completedWelcome - Welcome step done
 * @property {boolean} completedLogo - Logo uploaded
 * @property {boolean} completedFirstScreen - First screen created
 * @property {boolean} completedFirstPlaylist - First playlist created
 * @property {boolean} completedFirstMedia - First media uploaded
 * @property {boolean} completedScreenPairing - Screen paired
 * @property {boolean} isComplete - All steps complete
 * @property {string} currentStep - Current step name
 * @property {string|null} completedAt - When completed
 * @property {string|null} skippedAt - When skipped
 */

/**
 * Onboarding step definitions
 */
export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to BizScreen',
    description: 'Let\'s get you set up in just a few minutes.',
    icon: 'Sparkles'
  },
  {
    id: 'logo',
    title: 'Upload Your Logo',
    description: 'Add your brand logo to personalize your screens.',
    icon: 'Image',
    navigateTo: 'branding-settings'
  },
  {
    id: 'first_media',
    title: 'Add Your First Media',
    description: 'Upload an image or video to display on your screens.',
    icon: 'Upload',
    navigateTo: 'media-library'
  },
  {
    id: 'first_playlist',
    title: 'Create a Playlist',
    description: 'Organize your media into a playlist for playback.',
    icon: 'List',
    navigateTo: 'playlists'
  },
  {
    id: 'first_screen',
    title: 'Set Up a Screen',
    description: 'Register your first display screen.',
    icon: 'Monitor',
    navigateTo: 'screens'
  },
  {
    id: 'screen_pairing',
    title: 'Pair Your Screen',
    description: 'Connect your TV or display to start showing content.',
    icon: 'Link',
    navigateTo: 'screens'
  }
];

/**
 * Check if the current user is on their first run (no content created yet)
 * @returns {Promise<{hasScreens: boolean, hasPlaylists: boolean, hasMedia: boolean, isFirstRun: boolean}>}
 */
export async function checkIsFirstRun() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      hasScreens: false,
      hasPlaylists: false,
      hasMedia: false,
      isFirstRun: true
    };
  }

  // Run all checks in parallel for performance
  const [screensResult, playlistsResult, mediaResult] = await Promise.all([
    supabase
      .from('tv_devices')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
    supabase
      .from('playlists')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
  ]);

  const hasScreens = (screensResult.count || 0) > 0;
  const hasPlaylists = (playlistsResult.count || 0) > 0;
  const hasMedia = (mediaResult.count || 0) > 0;

  return {
    hasScreens,
    hasPlaylists,
    hasMedia,
    isFirstRun: !hasScreens && !hasPlaylists && !hasMedia
  };
}

/**
 * Get current onboarding progress from database
 * @returns {Promise<OnboardingProgress>}
 */
export async function getOnboardingProgress() {
  const { data, error } = await supabase.rpc('get_onboarding_progress');

  if (error) {
    logger.error('Error fetching onboarding progress:', { error: error });
    // Fall back to checking resources directly
    const status = await checkIsFirstRun();
    return {
      completedWelcome: false,
      completedLogo: false,
      completedFirstScreen: status.hasScreens,
      completedFirstPlaylist: status.hasPlaylists,
      completedFirstMedia: status.hasMedia,
      completedScreenPairing: false,
      isComplete: !status.isFirstRun,
      currentStep: 'welcome',
      completedAt: null,
      skippedAt: null
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    completedWelcome: row?.completed_welcome || false,
    completedLogo: row?.completed_logo || false,
    completedFirstScreen: row?.completed_first_screen || false,
    completedFirstPlaylist: row?.completed_first_playlist || false,
    completedFirstMedia: row?.completed_first_media || false,
    completedScreenPairing: row?.completed_screen_pairing || false,
    isComplete: row?.is_complete || false,
    currentStep: row?.current_step || 'welcome',
    completedAt: row?.completed_at,
    skippedAt: row?.skipped_at
  };
}

/**
 * Update an onboarding step
 * @param {string} step - Step name (welcome, logo, first_screen, etc.)
 * @param {boolean} completed - Whether step is completed
 * @returns {Promise<{success: boolean, nextStep?: string, isComplete?: boolean, error?: string}>}
 */
export async function updateOnboardingStep(step, completed = true) {
  const { data, error } = await supabase.rpc('update_onboarding_step', {
    p_step: step,
    p_completed: completed
  });

  if (error) {
    logger.error('Error updating onboarding step:', { error: error });
    return { success: false, error: error.message };
  }

  return {
    success: data?.success || false,
    step: data?.step,
    completed: data?.completed,
    isComplete: data?.is_complete || false,
    nextStep: data?.next_step,
    error: data?.error
  };
}

/**
 * Skip the onboarding wizard
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function skipOnboarding() {
  const { data, error } = await supabase.rpc('skip_onboarding');

  if (error) {
    logger.error('Error skipping onboarding:', { error: error });
    return { success: false, error: error.message };
  }

  return { success: data?.success || false };
}

/**
 * Check if onboarding is needed (not complete and not skipped)
 * @returns {Promise<boolean>}
 */
export async function needsOnboarding() {
  const progress = await getOnboardingProgress();
  return !progress.isComplete && !progress.skippedAt;
}

/**
 * Get the next incomplete step
 * @param {OnboardingProgress} progress - Current progress
 * @returns {Object|null} Next step definition or null if complete
 */
export function getNextStep(progress) {
  if (progress.isComplete || progress.skippedAt) return null;

  const stepChecks = [
    { id: 'welcome', check: progress.completedWelcome },
    { id: 'logo', check: progress.completedLogo },
    { id: 'first_media', check: progress.completedFirstMedia },
    { id: 'first_playlist', check: progress.completedFirstPlaylist },
    { id: 'first_screen', check: progress.completedFirstScreen },
    { id: 'screen_pairing', check: progress.completedScreenPairing }
  ];

  for (const step of stepChecks) {
    if (!step.check) {
      return ONBOARDING_STEPS.find(s => s.id === step.id);
    }
  }

  return null;
}

/**
 * Get completed step count
 * @param {OnboardingProgress} progress - Current progress
 * @returns {number}
 */
export function getCompletedCount(progress) {
  let count = 0;
  if (progress.completedWelcome) count++;
  if (progress.completedLogo) count++;
  if (progress.completedFirstMedia) count++;
  if (progress.completedFirstPlaylist) count++;
  if (progress.completedFirstScreen) count++;
  if (progress.completedScreenPairing) count++;
  return count;
}

/**
 * Get progress percentage
 * @param {OnboardingProgress} progress - Current progress
 * @returns {number} 0-100
 */
export function getProgressPercent(progress) {
  const completed = getCompletedCount(progress);
  return Math.round((completed / ONBOARDING_STEPS.length) * 100);
}

/**
 * Auto-detect completed steps from existing data
 * This syncs onboarding with actual resource creation
 * @returns {Promise<OnboardingProgress>}
 */
export async function syncOnboardingProgress() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getOnboardingProgress();

  // Check for existing resources
  const [
    { count: mediaCount },
    { count: playlistCount },
    { count: screenCount },
    { data: profile },
    { count: pairedCount }
  ] = await Promise.all([
    supabase.from('media_assets').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('playlists').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('tv_devices').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
    supabase.from('profiles').select('business_logo_url').eq('id', user.id).single(),
    supabase.from('tv_devices').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('is_paired', true)
  ]);

  // Update steps based on existing data
  const updates = [];

  if (profile?.business_logo_url) {
    updates.push(updateOnboardingStep('logo', true));
  }
  if (mediaCount > 0) {
    updates.push(updateOnboardingStep('first_media', true));
  }
  if (playlistCount > 0) {
    updates.push(updateOnboardingStep('first_playlist', true));
  }
  if (screenCount > 0) {
    updates.push(updateOnboardingStep('first_screen', true));
  }
  if (pairedCount > 0) {
    updates.push(updateOnboardingStep('screen_pairing', true));
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return getOnboardingProgress();
}

// ============================================================================
// WELCOME TOUR FUNCTIONS
// ============================================================================

/**
 * @typedef {Object} WelcomeTourProgress
 * @property {boolean} completedWelcomeTour - Whether tour is complete
 * @property {number} currentTourStep - Current step index (0-based)
 * @property {string|null} tourSkippedAt - When tour was skipped
 * @property {string|null} skippedAt - When onboarding was skipped
 * @property {boolean} starterPackApplied - Whether starter pack was applied
 */

/**
 * Get welcome tour progress (extended with starter pack status)
 * @returns {Promise<WelcomeTourProgress>}
 */
export async function getWelcomeTourProgress() {
  const { data, error } = await supabase.rpc('get_welcome_tour_progress');

  if (error) {
    logger.error('Error fetching welcome tour progress:', { error });
    return {
      completedWelcomeTour: false,
      currentTourStep: 0,
      tourSkippedAt: null,
      skippedAt: null,
      starterPackApplied: false
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  // Also fetch starter pack status from onboarding_progress table
  const { data: progressData } = await supabase
    .from('onboarding_progress')
    .select('starter_pack_applied')
    .single();

  return {
    completedWelcomeTour: row?.completed_welcome_tour || false,
    currentTourStep: row?.current_tour_step || 0,
    tourSkippedAt: row?.tour_skipped_at || null,
    skippedAt: row?.skipped_at || null,
    starterPackApplied: progressData?.starter_pack_applied || false
  };
}

/**
 * Update welcome tour step progress
 * @param {number} step - Current step index (0-based)
 * @param {boolean} completed - Whether tour is complete
 * @returns {Promise<{success: boolean, step?: number, completed?: boolean, error?: string}>}
 */
export async function updateWelcomeTourStep(step, completed = false) {
  const { data, error } = await supabase.rpc('update_welcome_tour_step', {
    p_step: step,
    p_completed: completed
  });

  if (error) {
    logger.error('Error updating welcome tour step:', { error });
    return { success: false, error: error.message };
  }

  return data || { success: true };
}

/**
 * Skip welcome tour
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function skipWelcomeTour() {
  const { data, error } = await supabase.rpc('skip_welcome_tour');

  if (error) {
    logger.error('Error skipping welcome tour:', { error });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if welcome tour should be shown
 * Shows tour if: not completed, not tour-skipped, and not onboarding-skipped
 * @returns {Promise<boolean>}
 */
export async function shouldShowWelcomeTour() {
  const progress = await getWelcomeTourProgress();
  return !progress.completedWelcomeTour && !progress.tourSkippedAt && !progress.skippedAt;
}

// ============================================================================
// INDUSTRY SELECTION FUNCTIONS (Phase 23-02)
// ============================================================================

/**
 * Set user's selected industry
 * @param {string} industry - Industry ID (e.g., 'restaurant', 'retail', 'salon')
 * @returns {Promise<{success: boolean, industry?: string, error?: string}>}
 */
export async function setSelectedIndustry(industry) {
  const { data, error } = await supabase.rpc('set_selected_industry', {
    p_industry: industry
  });

  if (error) {
    logger.error('Error setting industry:', { error });
    return { success: false, error: error.message };
  }

  return data || { success: true, industry };
}

/**
 * Get user's selected industry
 * @returns {Promise<string|null>}
 */
export async function getSelectedIndustry() {
  const { data, error } = await supabase.rpc('get_selected_industry');

  if (error) {
    logger.error('Error getting industry:', { error });
    return null;
  }

  return data;
}

/**
 * Mark starter pack as applied during onboarding
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markStarterPackApplied() {
  const { data, error } = await supabase.rpc('mark_starter_pack_applied');

  if (error) {
    logger.error('Error marking starter pack applied:', { error });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reset welcome tour to allow restart from Settings
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetWelcomeTour() {
  const { data, error } = await supabase.rpc('reset_welcome_tour');

  if (error) {
    logger.error('Error resetting welcome tour:', { error });
    return { success: false, error: error.message };
  }

  return data || { success: true };
}
