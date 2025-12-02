/**
 * i18n Module - Central exports
 *
 * Usage:
 *
 * 1. Wrap your app with I18nProvider:
 *    import { I18nProvider } from './i18n';
 *    <I18nProvider><App /></I18nProvider>
 *
 * 2. Use the translation hook in components:
 *    import { useTranslation } from './i18n';
 *    const { t, locale, setLocale } = useTranslation();
 *    return <h1>{t('dashboard.title')}</h1>;
 *
 * 3. Use formatting functions:
 *    import { useI18n } from './i18n';
 *    const { formatDate, formatNumber, formatCurrency } = useI18n();
 *
 * Translation key format:
 *    t('section.key')           - Simple key
 *    t('section.key', 'Default') - With fallback
 *    t('section.key', { name: 'John' }) - With interpolation
 *    t('section.key', 'Hello {{name}}', { name: 'John' }) - Both
 */

// Context and hooks
export {
  I18nProvider,
  useI18n,
  useTranslation,
  default as I18nContext,
} from './I18nContext';

// Configuration
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_CODES,
  getLocaleInfo,
  isLocaleSupported,
  detectBrowserLocale,
  DATE_FORMATS,
  NUMBER_FORMATS,
  CURRENCY_FORMATS,
} from './i18nConfig';
