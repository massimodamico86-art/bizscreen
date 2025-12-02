/**
 * i18n Configuration
 *
 * Central configuration for internationalization settings.
 */

// Supported locales with display names and metadata
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
];

// Default locale
export const DEFAULT_LOCALE = 'en';

// Fallback locale when translation is missing
export const FALLBACK_LOCALE = 'en';

// Get locale codes as array
export const LOCALE_CODES = SUPPORTED_LOCALES.map(l => l.code);

// Get locale by code
export function getLocaleInfo(code) {
  return SUPPORTED_LOCALES.find(l => l.code === code) || SUPPORTED_LOCALES[0];
}

// Check if locale is supported
export function isLocaleSupported(code) {
  return LOCALE_CODES.includes(code);
}

// Detect browser locale
export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const browserLang = navigator.language || navigator.userLanguage;
  if (!browserLang) return DEFAULT_LOCALE;

  // Try exact match first (e.g., 'en-US' -> 'en')
  const exactCode = browserLang.split('-')[0].toLowerCase();
  if (isLocaleSupported(exactCode)) {
    return exactCode;
  }

  return DEFAULT_LOCALE;
}

// Date/time format options per locale
export const DATE_FORMATS = {
  en: { dateStyle: 'medium', timeStyle: 'short' },
  es: { dateStyle: 'medium', timeStyle: 'short' },
  pt: { dateStyle: 'medium', timeStyle: 'short' },
  it: { dateStyle: 'medium', timeStyle: 'short' },
  fr: { dateStyle: 'medium', timeStyle: 'short' },
  de: { dateStyle: 'medium', timeStyle: 'short' },
};

// Number format options per locale
export const NUMBER_FORMATS = {
  en: { style: 'decimal', minimumFractionDigits: 0 },
  es: { style: 'decimal', minimumFractionDigits: 0 },
  pt: { style: 'decimal', minimumFractionDigits: 0 },
  it: { style: 'decimal', minimumFractionDigits: 0 },
  fr: { style: 'decimal', minimumFractionDigits: 0 },
  de: { style: 'decimal', minimumFractionDigits: 0 },
};

// Currency format per locale
export const CURRENCY_FORMATS = {
  en: { style: 'currency', currency: 'USD' },
  es: { style: 'currency', currency: 'EUR' },
  pt: { style: 'currency', currency: 'BRL' },
  it: { style: 'currency', currency: 'EUR' },
  fr: { style: 'currency', currency: 'EUR' },
  de: { style: 'currency', currency: 'EUR' },
};
