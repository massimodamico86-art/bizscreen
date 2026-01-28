/**
 * EditorLanguageSwitcher
 *
 * Dropdown selector for switching between language variants in the editor.
 * Per CONTEXT.md: Dropdown (not tabs), shows native names only.
 */
import { useState } from 'react';
import { getLanguageDisplayInfo } from '../../services/languageService';
import { SUPPORTED_LOCALES } from '../../i18n/i18nConfig';

export function EditorLanguageSwitcher({
  currentLanguage,
  availableVariants, // Array of { id, name, language_code }
  onLanguageChange,
  onAddLanguage,
  hasUnsavedChanges,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (variant) => {
    if (variant.language_code === currentLanguage) {
      setIsOpen(false);
      return;
    }

    if (hasUnsavedChanges) {
      const proceed = window.confirm(
        'You have unsaved changes. Discard and switch language?'
      );
      if (!proceed) {
        setIsOpen(false);
        return;
      }
    }

    onLanguageChange(variant);
    setIsOpen(false);
  };

  const currentInfo = getLanguageDisplayInfo(currentLanguage);

  // Languages not yet added
  const availableCodes = availableVariants.map(v => v.language_code);
  const addableLanguages = SUPPORTED_LOCALES.filter(
    l => !availableCodes.includes(l.code)
  );

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-600 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200"
      >
        <Globe className="w-4 h-4 text-gray-400" />
        <span>{currentInfo.nativeName}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
            {/* Existing variants */}
            <div className="py-1">
              {availableVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleSelect(variant)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                    variant.language_code === currentLanguage
                      ? 'bg-blue-900/50 text-blue-300 font-medium'
                      : 'text-gray-200'
                  }`}
                >
                  {getLanguageDisplayInfo(variant.language_code).nativeName}
                </button>
              ))}
            </div>

            {/* Add new language */}
            {addableLanguages.length > 0 && (
              <>
                <div className="border-t border-gray-700" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onAddLanguage();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Language...
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EditorLanguageSwitcher;
