/**
 * I18n Context and Provider
 *
 * Provides translation functions and locale management throughout the app.
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService.js';
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  isLocaleSupported,
  detectBrowserLocale,
  DATE_FORMATS,
  NUMBER_FORMATS,
  CURRENCY_FORMATS,
} from './i18nConfig';

const logger = createScopedLogger('I18n');

// Import locale files
import enMessages from './locales/en.json';

// Locale message catalogs
const MESSAGES = {
  en: enMessages,
  // Placeholder locales - will use English with some example translations
  es: enMessages, // Would be replaced with es.json when available
  pt: enMessages, // Would be replaced with pt.json when available
  it: enMessages, // Would be replaced with it.json when available
  fr: enMessages, // Would be replaced with fr.json when available
  de: enMessages, // Would be replaced with de.json when available
};

// Create context
const I18nContext = createContext(null);

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - The object to search
 * @param {string} path - Dot-notation path (e.g., 'nav.dashboard')
 * @returns {string|undefined}
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Interpolate variables in a string
 * @param {string} text - Text with {{variable}} placeholders
 * @param {Object} params - Key-value pairs to substitute
 * @returns {string}
 */
function interpolate(text, params) {
  if (!params || typeof text !== 'string') return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * I18n Provider Component
 */
export function I18nProvider({ children, initialLocale }) {
  // Initialize locale from prop, stored preference, or detection
  const [locale, setLocaleState] = useState(() => {
    if (initialLocale && isLocaleSupported(initialLocale)) {
      return initialLocale;
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

    // Detect from browser
    return detectBrowserLocale();
  });

  // Get current messages
  const messages = useMemo(() => {
    return MESSAGES[locale] || MESSAGES[FALLBACK_LOCALE];
  }, [locale]);

  // Fallback messages (always English)
  const fallbackMessages = MESSAGES[FALLBACK_LOCALE];

  /**
   * Translation function
   * @param {string} key - Translation key (dot notation, e.g., 'nav.dashboard')
   * @param {string|Object} defaultTextOrParams - Default text if key not found, or params object
   * @param {Object} [params] - Variables to interpolate
   * @returns {string}
   */
  const t = useCallback((key, defaultTextOrParams, params) => {
    // Handle overloaded parameters
    let defaultText;
    let interpolationParams;

    if (typeof defaultTextOrParams === 'object') {
      interpolationParams = defaultTextOrParams;
      defaultText = undefined;
    } else {
      defaultText = defaultTextOrParams;
      interpolationParams = params;
    }

    // Try to get translation from current locale
    let text = getNestedValue(messages, key);

    // Fallback to default locale if not found
    if (text === undefined && locale !== FALLBACK_LOCALE) {
      text = getNestedValue(fallbackMessages, key);
    }

    // Use default text if still not found
    if (text === undefined) {
      text = defaultText || key;
    }

    // Interpolate variables
    if (interpolationParams) {
      text = interpolate(text, interpolationParams);
    }

    return text;
  }, [messages, fallbackMessages, locale]);

  /**
   * Set locale and persist to localStorage
   */
  const setLocale = useCallback((newLocale) => {
    if (!isLocaleSupported(newLocale)) {
      logger.warn('Unsupported locale requested', {
        requestedLocale: newLocale,
        fallbackLocale: DEFAULT_LOCALE
      });
      newLocale = DEFAULT_LOCALE;
    }

    setLocaleState(newLocale);

    // Persist to localStorage
    try {
      localStorage.setItem('bizscreen_locale', newLocale);
    } catch (e) {
      // localStorage not available
    }

    // Update document lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  // Set initial document language
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  /**
   * Format a date according to current locale
   * @param {Date|string|number} date
   * @param {Object} options - Intl.DateTimeFormat options override
   * @returns {string}
   */
  const formatDate = useCallback((date, options = {}) => {
    const d = date instanceof Date ? date : new Date(date);
    const localeOptions = { ...DATE_FORMATS[locale], ...options };
    return new Intl.DateTimeFormat(locale, localeOptions).format(d);
  }, [locale]);

  /**
   * Format a number according to current locale
   * @param {number} num
   * @param {Object} options - Intl.NumberFormat options override
   * @returns {string}
   */
  const formatNumber = useCallback((num, options = {}) => {
    const localeOptions = { ...NUMBER_FORMATS[locale], ...options };
    return new Intl.NumberFormat(locale, localeOptions).format(num);
  }, [locale]);

  /**
   * Format currency according to current locale
   * @param {number} amount
   * @param {string} currency - Currency code override
   * @returns {string}
   */
  const formatCurrency = useCallback((amount, currency) => {
    const localeOptions = { ...CURRENCY_FORMATS[locale] };
    if (currency) {
      localeOptions.currency = currency;
    }
    return new Intl.NumberFormat(locale, localeOptions).format(amount);
  }, [locale]);

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {Date|string|number} date
   * @returns {string}
   */
  const formatRelativeTime = useCallback((date) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return t('time.justNow');
    if (diffMin < 60) return t(diffMin === 1 ? 'time.minutesAgo' : 'time.minutesAgo_plural', { count: diffMin });
    if (diffHour < 24) return t(diffHour === 1 ? 'time.hoursAgo' : 'time.hoursAgo_plural', { count: diffHour });
    if (diffDay < 7) return t(diffDay === 1 ? 'time.daysAgo' : 'time.daysAgo_plural', { count: diffDay });
    if (diffWeek < 4) return t(diffWeek === 1 ? 'time.weeksAgo' : 'time.weeksAgo_plural', { count: diffWeek });
    if (diffMonth < 12) return t(diffMonth === 1 ? 'time.monthsAgo' : 'time.monthsAgo_plural', { count: diffMonth });
    return t(diffYear === 1 ? 'time.yearsAgo' : 'time.yearsAgo_plural', { count: diffYear });
  }, [t]);

  /**
   * Format file size
   * @param {number} bytes
   * @returns {string}
   */
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return `0 ${t('units.bytes')}`;

    const k = 1024;
    const sizes = [
      t('units.bytes'),
      t('units.kilobytes'),
      t('units.megabytes'),
      t('units.gigabytes'),
      t('units.terabytes'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

    return `${formatNumber(value)} ${sizes[i]}`;
  }, [t, formatNumber]);

  // Context value
  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatFileSize,
    supportedLocales: SUPPORTED_LOCALES,
    isRTL: SUPPORTED_LOCALES.find(l => l.code === locale)?.direction === 'rtl',
  }), [locale, setLocale, t, formatDate, formatNumber, formatCurrency, formatRelativeTime, formatFileSize]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Hook for translation function only (convenience)
 */
export function useTranslation() {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
}

export default I18nContext;
