/**
 * LanguageBadges
 *
 * Displays language code chips for available translations.
 * Per CONTEXT.md: Hide when only default language exists.
 *
 * @module components/scenes/LanguageBadges
 */
import { LANGUAGE_COLORS } from '../../services/languageService';

/**
 * Display language badges for available translations
 *
 * @param {Object} props
 * @param {string[]} props.languages - Array of language codes (e.g., ['en', 'es', 'fr'])
 * @param {boolean} props.showDefault - Show badge even when only default language exists (default: false)
 * @returns {JSX.Element|null}
 */
export function LanguageBadges({ languages, showDefault = false }) {
  // Per CONTEXT.md: hide badge when only default language
  if (!languages || languages.length === 0) return null;
  if (languages.length === 1 && languages[0] === 'en' && !showDefault) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {languages.map((code) => (
        <span
          key={code}
          className={`
            inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border
            ${LANGUAGE_COLORS[code] || 'bg-gray-50 text-gray-700 border-gray-200'}
          `}
        >
          {code.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export default LanguageBadges;
