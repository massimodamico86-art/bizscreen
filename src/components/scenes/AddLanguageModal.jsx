/**
 * AddLanguageModal
 *
 * Modal for creating a new language variant of a scene.
 * Per CONTEXT.md: User picks from fixed list of common languages.
 */
import { useState } from 'react';
import { SUPPORTED_LOCALES } from '../../i18n/i18nConfig';
import { createLanguageVariant } from '../../services/languageService';

export function AddLanguageModal({
  isOpen,
  onClose,
  sceneId,
  existingLanguages = [], // codes already in use
  onVariantCreated, // callback with new variant { id, language_code }
}) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Filter out already-used languages
  const availableLanguages = SUPPORTED_LOCALES.filter(
    l => !existingLanguages.includes(l.code)
  );

  const handleCreate = async () => {
    if (!selectedLanguage) return;

    setIsCreating(true);
    setError(null);

    try {
      const newVariant = await createLanguageVariant(sceneId, selectedLanguage);
      onVariantCreated({
        id: newVariant.id,
        name: newVariant.name,
        language_code: selectedLanguage,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create language variant');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setSelectedLanguage('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader>
        <ModalTitle>Add Language Variant</ModalTitle>
      </ModalHeader>

      <ModalContent>
        <p className="text-sm text-gray-600 mb-4">
          Create a new language version of this scene. The content will be copied from the original for you to translate.
        </p>

        {availableLanguages.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            All supported languages have been added.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Language
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedLanguage === lang.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs text-gray-500">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!selectedLanguage || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 mr-2" />
              Create Variant
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default AddLanguageModal;
