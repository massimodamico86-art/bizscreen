/**
 * AI Suggestion Panel Component
 *
 * Slide-over panel for displaying AI-generated translation suggestions.
 * Users can select a target language, generate suggestions via Claude,
 * and copy translations to use in their scene variants.
 */

import { useState, useEffect } from 'react';


import { drawer } from '../../design-system/motion';
import { getAiTranslationSuggestion } from '../../services/translationService';
import { getSupportedLanguages, getLanguageDisplayInfo } from '../../services/languageService';

export default function AiSuggestionPanel({ scene, isOpen, onClose, showToast }) {
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Get supported languages excluding the scene's current language
  const languages = getSupportedLanguages().filter(
    (lang) => lang.code !== (scene?.language_code || 'en')
  );

  // Reset state when panel opens with new scene
  useEffect(() => {
    if (isOpen && scene) {
      setSuggestions(null);
      setError(null);
      setCopiedIndex(null);
    }
  }, [isOpen, scene?.scene_id]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Generate suggestions
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setCopiedIndex(null);

    try {
      const result = await getAiTranslationSuggestion(scene.scene_id, targetLanguage);
      setSuggestions(result);
    } catch (err) {
      setError(err.message || 'Failed to generate translations');
      showToast?.('Failed to generate translations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copy single translation to clipboard
  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      showToast?.('Failed to copy to clipboard', 'error');
    }
  };

  // Copy all translations to clipboard
  const handleCopyAll = async () => {
    if (!suggestions?.translations) return;

    try {
      const allText = formatAllTranslations(suggestions);
      await navigator.clipboard.writeText(allText);
      showToast?.('All translations copied to clipboard', 'success');
    } catch (err) {
      showToast?.('Failed to copy to clipboard', 'error');
    }
  };

  // Format all translations for clipboard
  const formatAllTranslations = (data) => {
    const parts = [];

    if (data.translations.name) {
      parts.push(`Scene Name: ${data.translations.name}`);
    }

    if (data.translations.texts?.length > 0) {
      parts.push('\nText Elements:');
      data.translations.texts.forEach((item, idx) => {
        const original = data.originalTexts?.texts?.[idx]?.text || '';
        parts.push(`${idx + 1}. ${item.text || item}`);
        if (original) {
          parts.push(`   (Original: ${original})`);
        }
      });
    }

    if (data.translations.metadataTitle) {
      parts.push(`\nTitle: ${data.translations.metadataTitle}`);
    }
    if (data.translations.metadataSubtitle) {
      parts.push(`Subtitle: ${data.translations.metadataSubtitle}`);
    }
    if (data.translations.metadataDescription) {
      parts.push(`Description: ${data.translations.metadataDescription}`);
    }

    return parts.join('\n');
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const langInfo = getLanguageDisplayInfo(targetLanguage);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white shadow-xl z-40 flex flex-col"
            {...drawer.right}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-gray-900">
                  AI Translation Suggestions
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scene Info */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">Translating:</p>
              <p className="font-medium text-gray-900">{scene?.scene_name}</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Language
                </label>
                <Select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  options={languages.map((lang) => ({
                    value: lang.code,
                    label: `${lang.nativeName} (${lang.name})`,
                  }))}
                  className="w-full"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading}
                variant="primary"
                className="w-full"
                icon={
                  loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  )
                }
              >
                {loading ? 'Generating...' : 'Generate Suggestions'}
              </Button>

              {/* Error State */}
              {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Translation Failed
                      </p>
                      <p className="text-sm text-red-600 mt-0.5">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions Display */}
              {suggestions && !loading && (
                <div className="space-y-4">
                  {/* Header with Copy All */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">
                      Translations ({langInfo.name})
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyAll}
                      icon={<Copy className="w-3 h-3" aria-hidden="true" />}
                    >
                      Copy All
                    </Button>
                  </div>

                  {/* Scene Name Translation */}
                  {suggestions.translations?.name && (
                    <TranslationItem
                      label="Scene Name"
                      original={suggestions.originalTexts?.name}
                      translated={suggestions.translations.name}
                      onCopy={() => handleCopy(suggestions.translations.name, 'name')}
                      copied={copiedIndex === 'name'}
                    />
                  )}

                  {/* Text Elements */}
                  {suggestions.translations?.texts?.map((item, idx) => {
                    const text = typeof item === 'string' ? item : item.text;
                    const originalItem = suggestions.originalTexts?.texts?.[idx];
                    const originalText =
                      typeof originalItem === 'string'
                        ? originalItem
                        : originalItem?.text;

                    return (
                      <TranslationItem
                        key={idx}
                        label={`Text ${idx + 1}`}
                        original={originalText}
                        translated={text}
                        onCopy={() => handleCopy(text, idx)}
                        copied={copiedIndex === idx}
                      />
                    );
                  })}

                  {/* Metadata Fields */}
                  {suggestions.translations?.metadataTitle && (
                    <TranslationItem
                      label="Title"
                      original={suggestions.originalTexts?.metadataTitle}
                      translated={suggestions.translations.metadataTitle}
                      onCopy={() =>
                        handleCopy(suggestions.translations.metadataTitle, 'title')
                      }
                      copied={copiedIndex === 'title'}
                    />
                  )}
                  {suggestions.translations?.metadataSubtitle && (
                    <TranslationItem
                      label="Subtitle"
                      original={suggestions.originalTexts?.metadataSubtitle}
                      translated={suggestions.translations.metadataSubtitle}
                      onCopy={() =>
                        handleCopy(suggestions.translations.metadataSubtitle, 'subtitle')
                      }
                      copied={copiedIndex === 'subtitle'}
                    />
                  )}
                  {suggestions.translations?.metadataDescription && (
                    <TranslationItem
                      label="Description"
                      original={suggestions.originalTexts?.metadataDescription}
                      translated={suggestions.translations.metadataDescription}
                      onCopy={() =>
                        handleCopy(
                          suggestions.translations.metadataDescription,
                          'description'
                        )
                      }
                      copied={copiedIndex === 'description'}
                    />
                  )}

                  {/* Help Text */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Copy translations and paste them into your scene variant. Edit as
                      needed before publishing.
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!suggestions && !loading && !error && (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    Select a language and click Generate to get AI-powered translation
                    suggestions.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Translation Item Component
 * Displays a single translation with original text and copy button.
 */
function TranslationItem({ label, original, translated, onCopy, copied }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
        <button
          onClick={onCopy}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Copy translation"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {original && (
        <div className="text-sm text-gray-500">
          <span className="text-xs text-gray-400">Original:</span>
          <p className="mt-0.5">{original}</p>
        </div>
      )}

      <div className="flex items-start gap-2">
        <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-900 font-medium">{translated}</p>
      </div>
    </div>
  );
}
