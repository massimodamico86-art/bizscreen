/**
 * Consent Service - GDPR Cookie Consent Management
 *
 * Manages user consent for cookies and data processing:
 * - Necessary cookies (always enabled)
 * - Analytics cookies (optional)
 * - Marketing cookies (optional)
 * - Preferences cookies (optional)
 */

import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('ConsentService');

// Consent categories
export const CONSENT_CATEGORIES = {
  necessary: {
    id: 'necessary',
    name: 'Necessary',
    description: 'Essential cookies required for the website to function. Cannot be disabled.',
    required: true,
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
    required: false,
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    description: 'Used to track visitors across websites to display relevant advertisements.',
    required: false,
  },
  preferences: {
    id: 'preferences',
    name: 'Preferences',
    description: 'Allow the website to remember your preferences and personalize your experience.',
    required: false,
  },
};

// Local storage key
const CONSENT_STORAGE_KEY = 'bizscreen_cookie_consent';
const CONSENT_VERSION = '1.0';

/**
 * Get default consent (only necessary)
 */
function getDefaultConsent() {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  };
}

/**
 * Get stored consent from localStorage
 */
export function getStoredConsent() {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Check if consent version matches
    if (data.version !== CONSENT_VERSION) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Check if consent has been given (banner shown)
 */
export function hasConsentBeenGiven() {
  return getStoredConsent() !== null;
}

/**
 * Get current consent preferences
 */
export function getConsentPreferences() {
  const stored = getStoredConsent();
  if (!stored) {
    return getDefaultConsent();
  }
  return stored.preferences;
}

/**
 * Check if a specific consent category is enabled
 */
export function hasConsent(category) {
  const preferences = getConsentPreferences();
  return preferences[category] === true;
}

/**
 * Save consent preferences
 */
export async function saveConsent(preferences, userId = null) {
  const consentData = {
    version: CONSENT_VERSION,
    preferences: {
      necessary: true, // Always true
      analytics: preferences.analytics || false,
      marketing: preferences.marketing || false,
      preferences: preferences.preferences || false,
    },
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  // Save to localStorage
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));

  // Save to database if user is authenticated
  if (userId) {
    await saveConsentToDatabase(userId, consentData);
  }

  // Apply consent settings
  applyConsentSettings(consentData.preferences);

  return consentData;
}

/**
 * Accept all cookies
 */
export async function acceptAllCookies(userId = null) {
  return saveConsent({
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true,
  }, userId);
}

/**
 * Reject all optional cookies
 */
export async function rejectAllCookies(userId = null) {
  return saveConsent({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  }, userId);
}

/**
 * Withdraw consent (reset to defaults)
 */
export async function withdrawConsent(userId = null) {
  localStorage.removeItem(CONSENT_STORAGE_KEY);

  if (userId) {
    await saveConsentToDatabase(userId, {
      version: CONSENT_VERSION,
      preferences: getDefaultConsent(),
      timestamp: new Date().toISOString(),
      withdrawn: true,
    });
  }

  // Remove non-essential cookies
  removeNonEssentialCookies();
}

/**
 * Save consent to database for audit trail
 */
async function saveConsentToDatabase(userId, consentData) {
  try {
    const { error } = await supabase.from('consent_records').insert({
      user_id: userId,
      consent_version: consentData.version,
      necessary: consentData.preferences.necessary,
      analytics: consentData.preferences.analytics,
      marketing: consentData.preferences.marketing,
      preferences: consentData.preferences.preferences,
      ip_address: null, // Would need server-side to get IP
      user_agent: consentData.userAgent,
      withdrawn: consentData.withdrawn || false,
    });

    if (error) {
      logger.error('Failed to save consent to database:', { error: error });
    }
  } catch (error) {
    logger.error('Consent database error:', { error: error });
  }
}

/**
 * Get consent history for a user
 */
export async function getConsentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to get consent history:', { error: error });
    return [];
  }
}

/**
 * Apply consent settings (enable/disable tracking)
 */
function applyConsentSettings(preferences) {
  // Dispatch event for other services to listen to
  window.dispatchEvent(new CustomEvent('consentChanged', {
    detail: preferences,
  }));

  // Analytics consent
  if (preferences.analytics) {
    enableAnalytics();
  } else {
    disableAnalytics();
  }

  // Marketing consent
  if (preferences.marketing) {
    enableMarketing();
  } else {
    disableMarketing();
  }
}

/**
 * Enable analytics tracking
 */
function enableAnalytics() {
  // Enable Sentry if configured
  if (window.__SENTRY__) {
    // Sentry is already initialized, just update consent
  }

  // Enable other analytics (Google Analytics, etc.)
  window.bizscreenAnalyticsEnabled = true;
}

/**
 * Disable analytics tracking
 */
function disableAnalytics() {
  window.bizscreenAnalyticsEnabled = false;

  // Disable Google Analytics if present
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
    });
  }
}

/**
 * Enable marketing tracking
 */
function enableMarketing() {
  window.bizscreenMarketingEnabled = true;

  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  }
}

/**
 * Disable marketing tracking
 */
function disableMarketing() {
  window.bizscreenMarketingEnabled = false;

  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}

/**
 * Remove non-essential cookies
 */
function removeNonEssentialCookies() {
  const cookies = document.cookie.split(';');

  // List of essential cookie prefixes to keep
  const essentialPrefixes = [
    'sb-', // Supabase
    'bizscreen_', // Our app cookies (except consent-related marketing)
  ];

  cookies.forEach(cookie => {
    const name = cookie.split('=')[0].trim();

    // Check if cookie is essential
    const isEssential = essentialPrefixes.some(prefix => name.startsWith(prefix));

    if (!isEssential) {
      // Delete the cookie
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    }
  });
}

/**
 * Initialize consent on app load
 */
export function initConsent() {
  const stored = getStoredConsent();
  if (stored) {
    applyConsentSettings(stored.preferences);
  } else {
    // Apply default (most restrictive) settings
    applyConsentSettings(getDefaultConsent());
  }
}

export default {
  CONSENT_CATEGORIES,
  getStoredConsent,
  hasConsentBeenGiven,
  getConsentPreferences,
  hasConsent,
  saveConsent,
  acceptAllCookies,
  rejectAllCookies,
  withdrawConsent,
  getConsentHistory,
  initConsent,
};
