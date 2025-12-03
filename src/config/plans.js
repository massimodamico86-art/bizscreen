/**
 * Plans Configuration
 * Phase 14: Centralized plan tier definitions and feature mappings
 *
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Plan tiers (FREE, STARTER, PRO, ENTERPRISE, RESELLER)
 * - Feature flags and their plan requirements
 * - Resource limits per plan
 *
 * Usage:
 *   import { PLANS, FEATURES, getPlanFeatures } from '../config/plans';
 */

// ============================================================================
// PLAN TIER DEFINITIONS
// ============================================================================

/**
 * Plan slugs - use these constants throughout the codebase
 */
export const PlanSlug = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
  RESELLER: 'reseller',
};

/**
 * Plan tier order (for comparisons)
 */
export const PLAN_ORDER = {
  [PlanSlug.FREE]: 0,
  [PlanSlug.STARTER]: 1,
  [PlanSlug.PRO]: 2,
  [PlanSlug.ENTERPRISE]: 3,
  [PlanSlug.RESELLER]: 4,
};

/**
 * Complete plan definitions
 */
export const PLANS = {
  [PlanSlug.FREE]: {
    slug: PlanSlug.FREE,
    name: 'Free',
    description: 'Get started with basic digital signage',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxScreens: 1,
      maxMediaAssets: 50,
      maxPlaylists: 3,
      maxLayouts: 2,
      maxSchedules: 1,
      maxTeamMembers: 1,
      maxStorageMb: 500,
      maxBandwidthGb: 5,
    },
    features: [
      'basic_screens',
      'basic_playlists',
      'basic_media',
      'templates_gallery',
    ],
    displayOrder: 1,
    recommended: false,
  },

  [PlanSlug.STARTER]: {
    slug: PlanSlug.STARTER,
    name: 'Starter',
    description: 'Perfect for small businesses',
    priceMonthly: 2900, // cents
    priceYearly: 29000,
    limits: {
      maxScreens: 5,
      maxMediaAssets: 500,
      maxPlaylists: 20,
      maxLayouts: 10,
      maxSchedules: 10,
      maxTeamMembers: 3,
      maxStorageMb: 5000,
      maxBandwidthGb: 50,
    },
    features: [
      'basic_screens',
      'basic_playlists',
      'basic_media',
      'templates_gallery',
      'advanced_scheduling',
      'screen_groups',
      'basic_analytics',
      'email_support',
      'usage_dashboard',
    ],
    displayOrder: 2,
    recommended: false,
  },

  [PlanSlug.PRO]: {
    slug: PlanSlug.PRO,
    name: 'Pro',
    description: 'For growing businesses with advanced needs',
    priceMonthly: 9900, // cents
    priceYearly: 99000,
    limits: {
      maxScreens: 25,
      maxMediaAssets: 2000,
      maxPlaylists: 100,
      maxLayouts: 50,
      maxSchedules: 50,
      maxTeamMembers: 10,
      maxStorageMb: 25000,
      maxBandwidthGb: 250,
    },
    features: [
      'basic_screens',
      'basic_playlists',
      'basic_media',
      'templates_gallery',
      'advanced_scheduling',
      'screen_groups',
      'basic_analytics',
      'advanced_analytics',
      'ai_assistant',
      'campaigns',
      'bulk_operations',
      'api_access',
      'webhooks',
      'priority_support',
      'usage_dashboard',
    ],
    displayOrder: 3,
    recommended: true,
  },

  [PlanSlug.ENTERPRISE]: {
    slug: PlanSlug.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    priceMonthly: null, // Custom pricing
    priceYearly: null,
    limits: {
      maxScreens: null, // Unlimited
      maxMediaAssets: null,
      maxPlaylists: null,
      maxLayouts: null,
      maxSchedules: null,
      maxTeamMembers: null,
      maxStorageMb: null,
      maxBandwidthGb: null,
    },
    features: [
      'basic_screens',
      'basic_playlists',
      'basic_media',
      'templates_gallery',
      'advanced_scheduling',
      'screen_groups',
      'basic_analytics',
      'advanced_analytics',
      'ai_assistant',
      'campaigns',
      'bulk_operations',
      'api_access',
      'webhooks',
      'enterprise_sso',
      'scim_provisioning',
      'custom_domains',
      'white_label',
      'audit_logs',
      'sla_guarantee',
      'dedicated_support',
      'pms_integration',
      'usage_dashboard',
    ],
    displayOrder: 4,
    recommended: false,
  },

  [PlanSlug.RESELLER]: {
    slug: PlanSlug.RESELLER,
    name: 'Reseller',
    description: 'For partners managing multiple client accounts',
    priceMonthly: null, // Custom pricing
    priceYearly: null,
    limits: {
      maxScreens: null, // Based on license allocation
      maxMediaAssets: null,
      maxPlaylists: null,
      maxLayouts: null,
      maxSchedules: null,
      maxTeamMembers: null,
      maxStorageMb: null,
      maxBandwidthGb: null,
    },
    features: [
      'basic_screens',
      'basic_playlists',
      'basic_media',
      'templates_gallery',
      'advanced_scheduling',
      'screen_groups',
      'basic_analytics',
      'advanced_analytics',
      'ai_assistant',
      'campaigns',
      'bulk_operations',
      'api_access',
      'webhooks',
      'reseller_portal',
      'client_management',
      'license_management',
      'reseller_billing',
      'white_label',
      'custom_domains',
      'priority_support',
      'usage_dashboard',
    ],
    displayOrder: 5,
    recommended: false,
  },
};

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

/**
 * Feature keys - use these constants for feature checks
 */
export const Feature = {
  // Basic features (all plans)
  BASIC_SCREENS: 'basic_screens',
  BASIC_PLAYLISTS: 'basic_playlists',
  BASIC_MEDIA: 'basic_media',
  TEMPLATES_GALLERY: 'templates_gallery',

  // Starter+ features
  ADVANCED_SCHEDULING: 'advanced_scheduling',
  SCREEN_GROUPS: 'screen_groups',
  BASIC_ANALYTICS: 'basic_analytics',
  EMAIL_SUPPORT: 'email_support',

  // Pro+ features
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AI_ASSISTANT: 'ai_assistant',
  CAMPAIGNS: 'campaigns',
  BULK_OPERATIONS: 'bulk_operations',
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
  PRIORITY_SUPPORT: 'priority_support',

  // Enterprise features
  ENTERPRISE_SSO: 'enterprise_sso',
  SCIM_PROVISIONING: 'scim_provisioning',
  CUSTOM_DOMAINS: 'custom_domains',
  WHITE_LABEL: 'white_label',
  AUDIT_LOGS: 'audit_logs',
  SLA_GUARANTEE: 'sla_guarantee',
  DEDICATED_SUPPORT: 'dedicated_support',
  PMS_INTEGRATION: 'pms_integration',

  // Reseller features
  RESELLER_PORTAL: 'reseller_portal',
  CLIENT_MANAGEMENT: 'client_management',
  LICENSE_MANAGEMENT: 'license_management',
  RESELLER_BILLING: 'reseller_billing',

  // Usage & Billing features
  USAGE_DASHBOARD: 'usage_dashboard',
};

// ============================================================================
// QUOTA DEFINITIONS
// ============================================================================

/**
 * Monthly quotas per plan per feature
 * null = unlimited
 */
export const PLAN_QUOTAS = {
  [PlanSlug.FREE]: {
    ai_assistant: 10,
    campaigns: 2,
    audit_logs: 100,
    api_calls: 100,
    screen_groups: 1,
    bulk_operations: 5,
    webhooks: 10,
  },

  [PlanSlug.STARTER]: {
    ai_assistant: 50,
    campaigns: 10,
    audit_logs: 1000,
    api_calls: 1000,
    screen_groups: 10,
    bulk_operations: 50,
    webhooks: 100,
  },

  [PlanSlug.PRO]: {
    ai_assistant: 200,
    campaigns: 50,
    audit_logs: 10000,
    api_calls: 10000,
    screen_groups: 100,
    bulk_operations: 500,
    webhooks: 1000,
  },

  [PlanSlug.ENTERPRISE]: {
    ai_assistant: null, // Unlimited
    campaigns: null,
    audit_logs: null,
    api_calls: null,
    screen_groups: null,
    bulk_operations: null,
    webhooks: null,
  },

  [PlanSlug.RESELLER]: {
    ai_assistant: null, // Unlimited
    campaigns: null,
    audit_logs: null,
    api_calls: null,
    screen_groups: null,
    bulk_operations: null,
    webhooks: null,
  },
};

/**
 * Quota feature names for display
 */
export const QUOTA_FEATURE_NAMES = {
  ai_assistant: 'AI Assistant Requests',
  campaigns: 'Campaign Creations',
  audit_logs: 'Audit Log Entries',
  api_calls: 'API Calls',
  screen_groups: 'Screen Group Operations',
  bulk_operations: 'Bulk Operations',
  webhooks: 'Webhook Deliveries',
};

/**
 * Get quota for a feature based on plan
 * @param {string} featureKey
 * @param {string} planSlug
 * @returns {number|null} Quota limit or null for unlimited
 */
export function getQuotaForFeature(featureKey, planSlug) {
  const planQuotas = PLAN_QUOTAS[planSlug] || PLAN_QUOTAS[PlanSlug.FREE];
  return planQuotas[featureKey] ?? null;
}

/**
 * Check if a quota is unlimited
 * @param {string} featureKey
 * @param {string} planSlug
 * @returns {boolean}
 */
export function isQuotaUnlimited(featureKey, planSlug) {
  return getQuotaForFeature(featureKey, planSlug) === null;
}

/**
 * Feature metadata for UI display
 */
export const FEATURE_METADATA = {
  [Feature.BASIC_SCREENS]: {
    name: 'Screen Management',
    description: 'Add and manage digital signage screens',
    category: 'core',
  },
  [Feature.BASIC_PLAYLISTS]: {
    name: 'Playlists',
    description: 'Create content playlists for your screens',
    category: 'core',
  },
  [Feature.BASIC_MEDIA]: {
    name: 'Media Library',
    description: 'Upload and manage images and videos',
    category: 'core',
  },
  [Feature.TEMPLATES_GALLERY]: {
    name: 'Templates Gallery',
    description: 'Access pre-designed content templates',
    category: 'core',
  },
  [Feature.ADVANCED_SCHEDULING]: {
    name: 'Advanced Scheduling',
    description: 'Schedule content by time, day, and date',
    category: 'scheduling',
  },
  [Feature.SCREEN_GROUPS]: {
    name: 'Screen Groups',
    description: 'Organize screens into manageable groups',
    category: 'management',
  },
  [Feature.BASIC_ANALYTICS]: {
    name: 'Basic Analytics',
    description: 'View screen uptime and playback stats',
    category: 'analytics',
  },
  [Feature.ADVANCED_ANALYTICS]: {
    name: 'Advanced Analytics',
    description: 'Detailed performance metrics and reports',
    category: 'analytics',
  },
  [Feature.AI_ASSISTANT]: {
    name: 'AI Content Assistant',
    description: 'AI-powered content creation and suggestions',
    category: 'ai',
  },
  [Feature.CAMPAIGNS]: {
    name: 'Campaigns',
    description: 'Create time-limited promotional campaigns',
    category: 'marketing',
  },
  [Feature.BULK_OPERATIONS]: {
    name: 'Bulk Operations',
    description: 'Manage multiple screens and content at once',
    category: 'management',
  },
  [Feature.API_ACCESS]: {
    name: 'API Access',
    description: 'Integrate with external systems via REST API',
    category: 'integration',
  },
  [Feature.WEBHOOKS]: {
    name: 'Webhooks',
    description: 'Receive real-time notifications for events',
    category: 'integration',
  },
  [Feature.ENTERPRISE_SSO]: {
    name: 'Enterprise SSO',
    description: 'SAML/OIDC single sign-on integration',
    category: 'security',
  },
  [Feature.SCIM_PROVISIONING]: {
    name: 'SCIM Provisioning',
    description: 'Automated user provisioning from your IdP',
    category: 'security',
  },
  [Feature.CUSTOM_DOMAINS]: {
    name: 'Custom Domains',
    description: 'Use your own domain for player URLs',
    category: 'branding',
  },
  [Feature.WHITE_LABEL]: {
    name: 'White Label',
    description: 'Remove BizScreen branding completely',
    category: 'branding',
  },
  [Feature.AUDIT_LOGS]: {
    name: 'Audit Logs',
    description: 'Complete activity history for compliance',
    category: 'security',
  },
  [Feature.PMS_INTEGRATION]: {
    name: 'PMS Integration',
    description: 'Property Management System integrations',
    category: 'integration',
  },
  [Feature.RESELLER_PORTAL]: {
    name: 'Reseller Portal',
    description: 'Manage multiple client accounts',
    category: 'reseller',
  },
  [Feature.CLIENT_MANAGEMENT]: {
    name: 'Client Management',
    description: 'Create and manage client tenants',
    category: 'reseller',
  },
  [Feature.LICENSE_MANAGEMENT]: {
    name: 'License Management',
    description: 'Generate and distribute license keys',
    category: 'reseller',
  },
  [Feature.RESELLER_BILLING]: {
    name: 'Reseller Billing',
    description: 'Commission tracking and payouts',
    category: 'reseller',
  },
  [Feature.EMAIL_SUPPORT]: {
    name: 'Email Support',
    description: 'Support via email within 24 hours',
    category: 'support',
  },
  [Feature.PRIORITY_SUPPORT]: {
    name: 'Priority Support',
    description: 'Faster response times and chat support',
    category: 'support',
  },
  [Feature.DEDICATED_SUPPORT]: {
    name: 'Dedicated Support',
    description: 'Dedicated account manager',
    category: 'support',
  },
  [Feature.SLA_GUARANTEE]: {
    name: 'SLA Guarantee',
    description: '99.9% uptime guarantee with credits',
    category: 'support',
  },
  [Feature.USAGE_DASHBOARD]: {
    name: 'Usage Dashboard',
    description: 'View usage analytics and quota status',
    category: 'analytics',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get features enabled for a specific plan
 * @param {string} planSlug
 * @returns {string[]} Array of feature keys
 */
export function getPlanFeatures(planSlug) {
  const plan = PLANS[planSlug];
  return plan ? plan.features : PLANS[PlanSlug.FREE].features;
}

/**
 * Check if a feature is included in a plan
 * @param {string} planSlug
 * @param {string} featureKey
 * @returns {boolean}
 */
export function isPlanFeature(planSlug, featureKey) {
  const features = getPlanFeatures(planSlug);
  return features.includes(featureKey);
}

/**
 * Get the minimum plan required for a feature
 * @param {string} featureKey
 * @returns {string|null} Plan slug or null if not found
 */
export function getMinimumPlanForFeature(featureKey) {
  const planOrder = [PlanSlug.FREE, PlanSlug.STARTER, PlanSlug.PRO, PlanSlug.ENTERPRISE];

  for (const planSlug of planOrder) {
    if (isPlanFeature(planSlug, featureKey)) {
      return planSlug;
    }
  }

  // Check reseller separately
  if (isPlanFeature(PlanSlug.RESELLER, featureKey)) {
    return PlanSlug.RESELLER;
  }

  return null;
}

/**
 * Compare two plans
 * @param {string} planA
 * @param {string} planB
 * @returns {number} -1 if A < B, 0 if equal, 1 if A > B
 */
export function comparePlans(planA, planB) {
  const orderA = PLAN_ORDER[planA] ?? 0;
  const orderB = PLAN_ORDER[planB] ?? 0;
  return orderA - orderB;
}

/**
 * Check if planA is at least as high as planB
 * @param {string} planA - Current plan
 * @param {string} planB - Required plan
 * @returns {boolean}
 */
export function isPlanAtLeast(planA, planB) {
  return comparePlans(planA, planB) >= 0;
}

/**
 * Get plan limits
 * @param {string} planSlug
 * @returns {Object} Limits object
 */
export function getPlanLimits(planSlug) {
  const plan = PLANS[planSlug];
  return plan ? plan.limits : PLANS[PlanSlug.FREE].limits;
}

/**
 * Get all plans as array (for dropdowns, etc.)
 * @param {boolean} includeCustom - Include Enterprise/Reseller
 * @returns {Array}
 */
export function getAllPlans(includeCustom = true) {
  return Object.values(PLANS)
    .filter((plan) => includeCustom || plan.priceMonthly !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get features grouped by category
 * @param {string[]} featureKeys
 * @returns {Object} Features grouped by category
 */
export function groupFeaturesByCategory(featureKeys) {
  const grouped = {};

  featureKeys.forEach((key) => {
    const meta = FEATURE_METADATA[key];
    if (meta) {
      const category = meta.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        key,
        ...meta,
      });
    }
  });

  return grouped;
}

/**
 * Format price for display
 * @param {number|null} priceCents
 * @param {string} period - 'monthly' or 'yearly'
 * @returns {string}
 */
export function formatPlanPrice(priceCents, period = 'monthly') {
  if (priceCents === null) {
    return 'Contact Sales';
  }
  if (priceCents === 0) {
    return 'Free';
  }
  const dollars = priceCents / 100;
  return `$${dollars}/${period === 'yearly' ? 'year' : 'mo'}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PlanSlug,
  PLANS,
  PLAN_ORDER,
  Feature,
  FEATURE_METADATA,
  PLAN_QUOTAS,
  QUOTA_FEATURE_NAMES,
  getPlanFeatures,
  isPlanFeature,
  getMinimumPlanForFeature,
  comparePlans,
  isPlanAtLeast,
  getPlanLimits,
  getAllPlans,
  groupFeaturesByCategory,
  formatPlanPrice,
  getQuotaForFeature,
  isQuotaUnlimited,
};
