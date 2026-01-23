/**
 * Locale Service - User and tenant locale preference management
 *
 * Handles fetching and setting locale preferences, with fallback logic.
 */
import { supabase } from '../supabase';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_CODES,
  isLocaleSupported,
  detectBrowserLocale,
} from '../i18n/i18nConfig';

// Cache for effective locale
let cachedLocale = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the list of supported locales
 * @returns {Array}
 */
export function getSupportedLocales() {
  return SUPPORTED_LOCALES;
}

/**
 * Get locale codes as array
 * @returns {string[]}
 */
export function getSupportedLocaleCodes() {
  return LOCALE_CODES;
}

/**
 * Clear the locale cache (call on user change)
 */
export function clearLocaleCache() {
  cachedLocale = null;
  cacheTimestamp = null;
}

/**
 * Get effective locale for the current user
 *
 * Resolution order:
 * 1. User preferred locale (from database)
 * 2. Tenant default locale (from database)
 * 3. Browser locale (navigator.language)
 * 4. Default locale ('en')
 *
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<string>}
 */
export async function getEffectiveLocale(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cachedLocale && cacheTimestamp) {
    if (Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedLocale;
    }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in - use browser locale
      cachedLocale = detectBrowserLocale();
      cacheTimestamp = Date.now();
      return cachedLocale;
    }

    // Try to get from RPC
    const { data, error } = await supabase.rpc('get_user_effective_locale');

    if (error) {
      logger.warn('Error fetching locale from RPC:', { data: error });
      // Fallback to profile direct query
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_locale, tenant_default_locale')
        .eq('id', user.id)
        .single();

      if (profile) {
        cachedLocale = profile.preferred_locale ||
          profile.tenant_default_locale ||
          detectBrowserLocale();
      } else {
        cachedLocale = detectBrowserLocale();
      }
    } else {
      cachedLocale = data || detectBrowserLocale();
    }

    // Validate the locale
    if (!isLocaleSupported(cachedLocale)) {
      cachedLocale = DEFAULT_LOCALE;
    }

    cacheTimestamp = Date.now();
    return cachedLocale;
  } catch (e) {
    logger.error('Error getting effective locale:', { error: e });
    return detectBrowserLocale();
  }
}

/**
 * Get effective locale synchronously (uses cache or default)
 * @returns {string}
 */
export function getEffectiveLocaleSync() {
  if (cachedLocale) {
    return cachedLocale;
  }

  // Try localStorage
  try {
    const stored = localStorage.getItem('bizscreen_locale');
    if (stored && isLocaleSupported(stored)) {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }

  return detectBrowserLocale();
}

/**
 * Set user's preferred locale
 * @param {string} locale - Locale code (e.g., 'en', 'es')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setUserPreferredLocale(locale) {
  // Validate locale
  if (!isLocaleSupported(locale)) {
    return { success: false, error: `Unsupported locale: ${locale}` };
  }

  try {
    const { data, error } = await supabase.rpc('set_user_preferred_locale', {
      p_locale: locale,
    });

    if (error) {
      logger.error('Error setting user locale:', { error: error });

      // Fallback to direct update
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ preferred_locale: locale })
          .eq('id', user.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      }
    }

    // Update cache and localStorage
    cachedLocale = locale;
    cacheTimestamp = Date.now();

    try {
      localStorage.setItem('bizscreen_locale', locale);
    } catch (e) {
      // localStorage not available
    }

    return { success: true };
  } catch (e) {
    logger.error('Error setting user locale:', { error: e });
    return { success: false, error: e.message };
  }
}

/**
 * Set tenant default locale (admin only)
 * @param {string} locale - Locale code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setTenantDefaultLocale(locale) {
  // Validate locale
  if (!isLocaleSupported(locale)) {
    return { success: false, error: `Unsupported locale: ${locale}` };
  }

  try {
    const { error } = await supabase.rpc('set_tenant_default_locale', {
      p_locale: locale,
    });

    if (error) {
      logger.error('Error setting tenant locale:', { error: error });
      return { success: false, error: error.message };
    }

    // Clear cache to pick up new tenant default
    clearLocaleCache();

    return { success: true };
  } catch (e) {
    logger.error('Error setting tenant locale:', { error: e });
    return { success: false, error: e.message };
  }
}

/**
 * Get user's current locale preferences
 * @returns {Promise<{userLocale: string|null, tenantLocale: string, effectiveLocale: string}>}
 */
export async function getLocalePreferences() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        userLocale: null,
        tenantLocale: DEFAULT_LOCALE,
        effectiveLocale: detectBrowserLocale(),
      };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferred_locale, tenant_default_locale')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return {
        userLocale: null,
        tenantLocale: DEFAULT_LOCALE,
        effectiveLocale: detectBrowserLocale(),
      };
    }

    const effectiveLocale = profile.preferred_locale ||
      profile.tenant_default_locale ||
      detectBrowserLocale();

    return {
      userLocale: profile.preferred_locale,
      tenantLocale: profile.tenant_default_locale || DEFAULT_LOCALE,
      effectiveLocale: isLocaleSupported(effectiveLocale) ? effectiveLocale : DEFAULT_LOCALE,
    };
  } catch (e) {
    logger.error('Error getting locale preferences:', { error: e });
    return {
      userLocale: null,
      tenantLocale: DEFAULT_LOCALE,
      effectiveLocale: DEFAULT_LOCALE,
    };
  }
}

/**
 * Initialize locale on app start
 * Call this early in the app lifecycle to set up the locale
 * @returns {Promise<string>}
 */
export async function initializeLocale() {
  const locale = await getEffectiveLocale(true);

  // Update document language attribute
  document.documentElement.lang = locale;

  return locale;
}
