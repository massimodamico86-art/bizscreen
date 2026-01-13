/**
 * AutoBuild Service
 *
 * Orchestrates the AI onboarding flow by:
 * 1. Selecting an appropriate starter pack based on business type
 * 2. Applying the pack (creates layouts, playlists, schedules)
 * 3. Creating a scene that links everything together
 * 4. Marking the tenant's onboarding as complete
 */

import { supabase } from '../supabase';
import { applyPack } from './templateService';
import { createScene } from './sceneService';

/**
 * Business type to pack slug mapping
 */
const BUSINESS_TYPE_PACK_MAP = {
  restaurant: 'restaurant_starter_pack',
  salon: 'salon_starter_pack',
  gym: 'gym_starter_pack',
  retail: 'retail_starter_pack',
  medical: 'generic_starter_pack',
  realestate: 'generic_starter_pack',
  hotel: 'generic_starter_pack',
  auto: 'retail_starter_pack',
  coffee: 'restaurant_starter_pack',
  other: 'generic_starter_pack',
};

/**
 * Business type display names
 */
export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'Utensils' },
  { id: 'salon', label: 'Salon / Spa', icon: 'Scissors' },
  { id: 'gym', label: 'Gym / Fitness', icon: 'Dumbbell' },
  { id: 'retail', label: 'Retail Store', icon: 'ShoppingBag' },
  { id: 'medical', label: 'Medical Office', icon: 'Stethoscope' },
  { id: 'realestate', label: 'Real Estate', icon: 'Home' },
  { id: 'hotel', label: 'Hotel / Lobby', icon: 'Building' },
  { id: 'auto', label: 'Auto Dealer', icon: 'Car' },
  { id: 'coffee', label: 'Coffee Shop', icon: 'Coffee' },
  { id: 'other', label: 'Other', icon: 'Building2' },
];

/**
 * Get the pack slug for a given business type
 * @param {string} businessType - Business type identifier
 * @returns {string} Pack slug
 */
export function getPackSlugForBusinessType(businessType) {
  return BUSINESS_TYPE_PACK_MAP[businessType] || BUSINESS_TYPE_PACK_MAP.other;
}

/**
 * Generate a scene name based on business type
 * @param {string} businessType - Business type identifier
 * @returns {string} Scene name
 */
export function generateSceneName(businessType) {
  const names = {
    restaurant: 'Restaurant TV Scene',
    salon: 'Salon TV Scene',
    gym: 'Gym Lobby TV Scene',
    retail: 'Retail Display Scene',
    medical: 'Waiting Room Scene',
    realestate: 'Office Display Scene',
    hotel: 'Lobby TV Scene',
    auto: 'Showroom Display Scene',
    coffee: 'Coffee Shop Scene',
    other: 'Business TV Scene',
  };
  return names[businessType] || names.other;
}

/**
 * Main autobuild function - creates a complete scene for a tenant
 *
 * @param {Object} params
 * @param {string} params.tenantId - The tenant/user ID
 * @param {string} params.businessType - Business type (restaurant, salon, etc.)
 * @param {Object} params.brand - Brand settings (primaryColor, logo, tagline)
 * @returns {Promise<Object>} Created scene with pack details
 */
export async function autoBuildSceneForTenant({ tenantId, businessType, brand = {} }) {
  // 1. Determine which starter pack to use
  const packSlug = getPackSlugForBusinessType(businessType);

  // 2. Apply the starter pack
  // This creates playlists, layouts, and schedules via the RPC function
  const packResult = await applyPack(packSlug);

  // Extract created IDs from pack result
  // packResult format: { playlists: [{id, name}], layouts: [{id, name}], schedules: [{id, name}] }
  const layoutId = packResult?.layouts?.[0]?.id || null;
  const primaryPlaylistId = packResult?.playlists?.[0]?.id || null;
  const secondaryPlaylistId = packResult?.playlists?.[1]?.id || null;

  // 3. Create the scene
  const sceneName = generateSceneName(businessType);
  const scene = await createScene({
    tenantId,
    name: sceneName,
    businessType,
    layoutId,
    primaryPlaylistId,
    secondaryPlaylistId,
    settings: {
      brand,
      packSlug,
      createdAt: new Date().toISOString()
    }
  });

  // 4. Return the scene with pack details
  return {
    scene,
    packResult,
    layoutId,
    primaryPlaylistId,
    secondaryPlaylistId
  };
}

/**
 * Mark onboarding as completed for a profile
 * @param {string} profileId - The user's profile ID
 * @returns {Promise<void>}
 */
export async function markOnboardingCompleted(profileId) {
  const { error } = await supabase
    .from('profiles')
    .update({ has_completed_onboarding: true })
    .eq('id', profileId);

  if (error) throw error;
}

/**
 * Check if a user should see the onboarding modal
 * @param {string} profileId - The user's profile ID
 * @returns {Promise<boolean>} True if user should see onboarding
 */
export async function shouldShowOnboarding(profileId) {
  // Check profile's onboarding status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('has_completed_onboarding')
    .eq('id', profileId)
    .single();

  if (profileError) throw profileError;

  // If already completed, don't show
  if (profile?.has_completed_onboarding) {
    return false;
  }

  // Check if user has any scenes
  const { count, error: scenesError } = await supabase
    .from('scenes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profileId);

  if (scenesError) throw scenesError;

  // Show onboarding if no scenes exist
  return (count || 0) === 0;
}

/**
 * Complete the full onboarding flow
 * @param {Object} params
 * @param {string} params.tenantId - The tenant/user ID
 * @param {string} params.businessType - Business type
 * @param {Object} params.brand - Brand settings
 * @returns {Promise<Object>} Result with scene and status
 */
export async function completeOnboarding({ tenantId, businessType, brand = {} }) {
  // 1. Build the scene
  const result = await autoBuildSceneForTenant({
    tenantId,
    businessType,
    brand
  });

  // 2. Mark onboarding as completed
  await markOnboardingCompleted(tenantId);

  return {
    ...result,
    onboardingCompleted: true
  };
}

export default {
  BUSINESS_TYPES,
  getPackSlugForBusinessType,
  generateSceneName,
  autoBuildSceneForTenant,
  markOnboardingCompleted,
  shouldShowOnboarding,
  completeOnboarding
};
