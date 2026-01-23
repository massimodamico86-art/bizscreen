/**
 * Demo Service
 *
 * Manages demo tenant creation, reset, and demo mode functionality.
 * Used by super_admin for sales demos and tenant management.
 *
 * @module services/demoService
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('DemoService');

/**
 * Business types for demo tenants
 */
export const DEMO_BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: 'Utensils' },
  { value: 'salon', label: 'Salon / Spa', icon: 'Scissors' },
  { value: 'gym', label: 'Gym / Fitness', icon: 'Dumbbell' },
  { value: 'retail', label: 'Retail Store', icon: 'ShoppingBag' },
  { value: 'other', label: 'Other / General', icon: 'Building2' }
];

/**
 * Plan levels for demo tenants
 */
export const DEMO_PLAN_LEVELS = [
  { value: 'free', label: 'Free', description: '1 screen, basic features' },
  { value: 'starter', label: 'Starter', description: 'Up to 5 screens' },
  { value: 'pro', label: 'Pro', description: 'Unlimited screens' }
];

/**
 * Create a new demo tenant
 * @param {string} businessType - Business type (restaurant, salon, gym, retail, other)
 * @param {string} planLevel - Plan level (free, starter, pro)
 * @param {string} [email] - Optional custom email
 * @returns {Promise<{success: boolean, userId?: string, email?: string, error?: string}>}
 */
export async function createDemoTenant(businessType, planLevel, email = null) {
  const { data, error } = await supabase.rpc('create_demo_tenant', {
    p_business_type: businessType,
    p_plan_level: planLevel,
    p_email: email
  });

  if (error) {
    logger.error('Error creating demo tenant:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Reset a demo tenant's data
 * @param {string} tenantId - Tenant UUID to reset
 * @returns {Promise<{success: boolean, resetAt?: string, error?: string}>}
 */
export async function resetDemoTenant(tenantId) {
  const { data, error } = await supabase.rpc('reset_demo_tenant', {
    p_tenant_id: tenantId
  });

  if (error) {
    logger.error('Error resetting demo tenant:', { error: error });
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * List all demo tenants
 * @returns {Promise<Array>}
 */
export async function listDemoTenants() {
  const { data, error } = await supabase.rpc('list_demo_tenants');

  if (error) {
    logger.error('Error listing demo tenants:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Get stale demo tenants that need reset
 * @returns {Promise<Array>}
 */
export async function getStaleDemoTenants() {
  const { data, error } = await supabase.rpc('get_stale_demo_tenants');

  if (error) {
    logger.error('Error getting stale demo tenants:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Check if current user is a demo tenant
 * @returns {Promise<{isDemoTenant: boolean, businessType?: string, lastResetAt?: string}>}
 */
export async function checkIsDemoTenant() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isDemoTenant: false };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_demo_tenant, demo_business_type, demo_last_reset_at, demo_reset_interval_minutes')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return { isDemoTenant: false };
  }

  return {
    isDemoTenant: profile.is_demo_tenant || false,
    businessType: profile.demo_business_type,
    lastResetAt: profile.demo_last_reset_at,
    resetIntervalMinutes: profile.demo_reset_interval_minutes
  };
}

/**
 * Check if an asset is protected from deletion in demo mode
 * @param {string} assetType - Type of asset (playlist, layout, screen)
 * @param {string} assetName - Name of the asset
 * @returns {Promise<boolean>}
 */
export async function isProtectedAsset(assetType, assetName) {
  const { data, error } = await supabase.rpc('is_demo_protected_asset', {
    p_asset_type: assetType,
    p_asset_name: assetName
  });

  if (error) {
    logger.error('Error checking protected asset:', { error: error });
    return false;
  }

  return data || false;
}

/**
 * Update demo tenant settings
 * @param {string} tenantId - Tenant UUID
 * @param {Object} settings - Settings to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateDemoSettings(tenantId, settings) {
  const allowedFields = ['demo_reset_interval_minutes', 'demo_business_type'];
  const updates = {};

  for (const key of allowedFields) {
    if (key in settings) {
      updates[key] = settings[key];
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', tenantId)
    .eq('is_demo_tenant', true);

  if (error) {
    logger.error('Error updating demo settings:', { error: error });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Generate a shareable demo preview link
 * @param {string} type - Type of preview (analytics, playlist, screen)
 * @param {string} id - ID of the resource
 * @returns {string}
 */
export function generateDemoLink(type, id) {
  const baseUrl = window.location.origin;

  switch (type) {
    case 'analytics':
      return `${baseUrl}/preview/analytics?demo=true`;
    case 'playlist':
      return `${baseUrl}/preview/playlist/${id}?demo=true`;
    case 'screen':
      return `${baseUrl}/preview/screen/${id}?demo=true`;
    case 'layout':
      return `${baseUrl}/preview/layout/${id}?demo=true`;
    default:
      return `${baseUrl}/preview?demo=true`;
  }
}

/**
 * Get demo content packs
 * @returns {Promise<Array>}
 */
export async function getDemoContentPacks() {
  const { data, error } = await supabase
    .from('demo_content_packs')
    .select('*')
    .eq('is_active', true)
    .order('business_type');

  if (error) {
    logger.error('Error getting demo content packs:', { error: error });
    return [];
  }

  return data || [];
}
