/**
 * LanguageSwitcher Component
 *
 * Dropdown to select the user's preferred language.
 * Updates both local state and server-side preference.
 */

import { useState, useCallback } from 'react';
import { Globe, Loader2 } from 'lucide-react'; // eslint-disable-line unused-imports/no-unused-imports
import { useI18n } from '../i18n';
import { setUserPreferredLocale } from '../services/localeService';
import { useLogger } from '../hooks/useLogger.js';

export function LanguageSwitcher({ showLabel = true, size = 'default' }) {
  const logger = useLogger('LanguageSwitcher');
  const { locale, setLocale, supportedLocales, t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = useCallback(async (newLocale) => {
    if (newLocale === locale) return;

    setSaving(true);
    setError(null);

    try {
      // Update local state immediately for responsiveness
      setLocale(newLocale);

      // Save to server
      const result = await setUserPreferredLocale(newLocale);
      if (!result.success) {
        setError(result.error);
        // Revert on error
        setLocale(locale);
      }
    } catch (e) {
      setError(e.message);
      setLocale(locale);
    } finally {
      setSaving(false);
    }
  }, [locale, setLocale]);

  const sizeClasses = {
    small: 'text-sm py-1.5 px-2',
    default: 'text-sm py-2 px-3',
    large: 'text-base py-2.5 px-4',
  };

  return (
    <div className="relative">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('settings.language', 'Language')}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {saving ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Globe className="h-4 w-4 text-gray-400" />
          )}
        </div>

        <select
          value={locale}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className={`
            block w-full pl-9 pr-8 rounded-lg
            border border-gray-300 bg-white
            focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${sizeClasses[size]}
          `}
        >
          {supportedLocales.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.nativeName} ({loc.name})
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {showLabel && (
        <p className="mt-1 text-xs text-gray-500">
          {t('settings.languageDescription', 'Choose your preferred language for the interface.')}
        </p>
      )}
    </div>
  );
}

/**
 * Compact language switcher for use in headers/footers
 */
export function CompactLanguageSwitcher() {
  const logger = useLogger('CompactLanguageSwitcher');
  const { locale, setLocale, supportedLocales } = useI18n();
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(async (newLocale) => {
    if (newLocale === locale) return;

    setSaving(true);
    try {
      setLocale(newLocale);
      await setUserPreferredLocale(newLocale);
    } catch (e) {
      logger.error('Failed to save locale preference', { error: e, locale: newLocale });
    } finally {
      setSaving(false);
    }
  }, [locale, setLocale, logger]);

  const currentLocale = supportedLocales.find(l => l.code === locale);

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="
          appearance-none bg-transparent
          text-sm text-gray-600 hover:text-gray-900
          cursor-pointer pr-6 py-1
          focus:outline-none
          disabled:opacity-50
        "
        title="Select language"
      >
        {supportedLocales.map((loc) => (
          <option key={loc.code} value={loc.code}>
            {loc.nativeName}
          </option>
        ))}
      </select>
      <Globe className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default LanguageSwitcher;
