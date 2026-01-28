/**
 * Template Customization Wizard
 *
 * Full-screen wizard for customizing a newly created scene from a template.
 * Shows form fields on left, live preview on right.
 * Supports: logo upload, primary color, text replacements.
 *
 * Triggers after Quick Apply when template has customizable fields.
 * Per CONTEXT.md: Single-screen form (not multi-step), side-by-side layout.
 */

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Helper to approximate hue rotation from hex color (simplified visual hint)
 * In production, this would use proper color math for accurate preview
 */
function getHueRotation(hexColor) {
  if (!hexColor || hexColor.length < 7) return 0;
  try {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Very rough hue estimation for visual hint
    return Math.round((r - b) / 2);
  } catch {
    return 0;
  }
}

export function TemplateCustomizationWizard({
  template,
  sceneId,
  onComplete,
  onSkip,
}) {
  // Customization state
  const [customization, setCustomization] = useState({
    logo: null,
    logoPreview: null,
    primaryColor: '#3B82F6',
    texts: {},
  });
  const [applying, setApplying] = useState(false);

  // Extract customizable fields from template metadata
  const customizableFields = template?.metadata?.customizable_fields || {};
  const textFields = customizableFields.texts || [];
  const hasLogo = customizableFields.logo !== false;
  const hasColor = customizableFields.color !== false;

  // Initialize text fields with template defaults
  useEffect(() => {
    if (textFields.length > 0) {
      const initialTexts = {};
      textFields.forEach((field) => {
        initialTexts[field.key] = field.default || '';
      });
      setCustomization((prev) => ({ ...prev, texts: initialTexts }));
    }
  }, [template?.id]); // Re-initialize when template changes

  // Handle logo file selection
  const handleLogoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomization((prev) => ({
          ...prev,
          logo: file,
          logoPreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle logo removal
  const handleLogoRemove = useCallback(() => {
    setCustomization((prev) => ({
      ...prev,
      logo: null,
      logoPreview: null,
    }));
  }, []);

  // Handle color change
  const handleColorChange = useCallback((e) => {
    setCustomization((prev) => ({
      ...prev,
      primaryColor: e.target.value,
    }));
  }, []);

  // Handle text change
  const handleTextChange = useCallback((key, value) => {
    setCustomization((prev) => ({
      ...prev,
      texts: { ...prev.texts, [key]: value },
    }));
  }, []);

  // Handle apply
  const handleApply = async () => {
    setApplying(true);
    try {
      await onComplete(customization);
    } catch (error) {
      console.error('Failed to apply customization:', error);
      setApplying(false);
    }
  };

  // Handle skip
  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !applying) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [applying, handleSkip]);

  // Check if any customization is available
  const hasAnyCustomization = hasLogo || hasColor || textFields.length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Left Panel: Form */}
      <div className="w-[400px] flex-shrink-0 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Customize Template
            </h2>
            <p className="text-sm text-gray-500">{template?.name}</p>
          </div>
          <button
            onClick={handleSkip}
            disabled={applying}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Skip customization"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Logo Upload */}
          {hasLogo && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Upload size={16} />
                Logo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                {customization.logoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={customization.logoPreview}
                      alt="Logo preview"
                      className="max-h-20 mx-auto object-contain"
                    />
                    <button
                      onClick={handleLogoRemove}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <Upload size={24} className="mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Click to upload logo
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Primary Color */}
          {hasColor && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Palette size={16} />
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customization.primaryColor}
                  onChange={handleColorChange}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={customization.primaryColor}
                  onChange={handleColorChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          )}

          {/* Text Replacements */}
          {textFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Type size={16} />
                Text Content
              </h3>
              {textFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={customization.texts[field.key] || ''}
                      onChange={(e) =>
                        handleTextChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={customization.texts[field.key] || ''}
                      onChange={(e) =>
                        handleTextChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No customizations available */}
          {!hasAnyCustomization && (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon size={48} className="mx-auto mb-3 text-gray-300" />
              <p>This template doesn&apos;t have customizable fields.</p>
              <p className="text-sm mt-1">You can edit it in the scene editor.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleSkip}
            disabled={applying}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {applying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Applying...
              </>
            ) : (
              'Apply & Edit'
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-4xl aspect-video bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Preview - shows template image with color tint as visual hint */}
          {template?.thumbnail_url || template?.preview_url ? (
            <img
              src={template.preview_url || template.thumbnail_url}
              alt="Template preview"
              className="w-full h-full object-cover transition-all duration-300"
              style={{
                filter: `hue-rotate(${getHueRotation(customization.primaryColor)}deg)`,
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon size={64} className="mb-4" />
              <p>Preview will update as you customize</p>
            </div>
          )}
        </div>
        <p className="absolute bottom-4 text-sm text-gray-500">
          Preview may not reflect all changes until you open the editor
        </p>
      </div>
    </motion.div>
  );
}

TemplateCustomizationWizard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    preview_url: PropTypes.string,
    metadata: PropTypes.object,
  }).isRequired,
  sceneId: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
};

export default TemplateCustomizationWizard;
