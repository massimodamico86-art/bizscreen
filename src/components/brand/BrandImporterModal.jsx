/**
 * BrandImporterModal
 *
 * Modal wizard for importing brand identity from a logo.
 * Flow:
 * 1. Upload logo image
 * 2. Extract colors and show palette preview
 * 3. Select font pairing
 * 4. Preview and confirm theme
 */

import { useState, useCallback } from 'react';
import {
  Upload,
  Palette,
  Type,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Modal, Button } from '../../design-system';
import {
  uploadLogo,
  createBrandTheme,
  FONT_PAIRINGS,
  DEFAULT_THEME,
} from '../../services/brandThemeService';
import { extractBrandIdentity, enhanceTheme } from '../../services/brandAiService';
import ThemePreviewCard, {
  ThemePreviewLarge,
  ColorPaletteGrid,
  FontPairingPreview,
} from './ThemePreviewCard';
import { useLogger } from '../../hooks/useLogger.js';

const STEPS = [
  { id: 'upload', title: 'Upload Logo', icon: Upload },
  { id: 'colors', title: 'Brand Colors', icon: Palette },
  { id: 'fonts', title: 'Typography', icon: Type },
  { id: 'preview', title: 'Preview & Save', icon: Check },
];

export default function BrandImporterModal({ isOpen, onClose, onThemeCreated }) {
  const logger = useLogger('BrandImporterModal');
  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  // Upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Brand identity state
  const [brandIdentity, setBrandIdentity] = useState(null);
  const [extracting, setExtracting] = useState(false);

  // Theme configuration
  const [selectedColors, setSelectedColors] = useState({
    primary_color: DEFAULT_THEME.primary_color,
    secondary_color: DEFAULT_THEME.secondary_color,
    accent_color: DEFAULT_THEME.accent_color,
    neutral_color: DEFAULT_THEME.neutral_color,
    background_color: DEFAULT_THEME.background_color,
    text_primary_color: DEFAULT_THEME.text_primary_color,
    text_secondary_color: DEFAULT_THEME.text_secondary_color,
  });
  const [selectedFont, setSelectedFont] = useState(FONT_PAIRINGS[0]);
  const [themeName, setThemeName] = useState('My Brand Theme');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reset modal state
  const resetModal = useCallback(() => {
    setCurrentStep(0);
    setLogoFile(null);
    setLogoUrl(null);
    setBrandIdentity(null);
    setSelectedColors({
      primary_color: DEFAULT_THEME.primary_color,
      secondary_color: DEFAULT_THEME.secondary_color,
      accent_color: DEFAULT_THEME.accent_color,
      neutral_color: DEFAULT_THEME.neutral_color,
      background_color: DEFAULT_THEME.background_color,
      text_primary_color: DEFAULT_THEME.text_primary_color,
      text_secondary_color: DEFAULT_THEME.text_secondary_color,
    });
    setSelectedFont(FONT_PAIRINGS[0]);
    setThemeName('My Brand Theme');
    setError(null);
  }, []);

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    setError(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  // Handle logo upload and extraction
  const handleUploadAndExtract = async () => {
    if (!logoFile) return;

    setUploading(true);
    setError(null);

    try {
      // Upload to Cloudinary
      const { url, error: uploadError } = await uploadLogo(logoFile);

      if (uploadError) {
        throw new Error(uploadError);
      }

      setLogoUrl(url);
      setUploading(false);

      // Extract brand identity
      setExtracting(true);
      const identity = await extractBrandIdentity(url);

      setBrandIdentity(identity);

      // Set initial colors from extraction
      setSelectedColors({
        primary_color: identity.colors.primary,
        secondary_color: identity.colors.secondary,
        accent_color: identity.colors.accent,
        neutral_color: identity.colors.neutral,
        background_color: identity.colors.background,
        text_primary_color: identity.colors.textPrimary,
        text_secondary_color: identity.colors.textSecondary,
      });

      // Set recommended font
      if (identity.fonts?.recommended?.[0]) {
        setSelectedFont(identity.fonts.recommended[0]);
      }

      setExtracting(false);
      setCurrentStep(1);
    } catch (err) {
      logger.error('Upload/Extract error', { error: err.message });
      setError(err.message || 'Failed to process logo');
      setUploading(false);
      setExtracting(false);
    }
  };

  // Handle color selection from palette
  const handleColorSelect = (colorKey, color) => {
    setSelectedColors(prev => ({
      ...prev,
      [colorKey]: color,
    }));
  };

  // Build the final theme object
  const buildTheme = () => {
    return {
      name: themeName,
      logo_url: logoUrl,
      source_image_url: logoUrl,
      ...selectedColors,
      font_heading: selectedFont.heading,
      font_body: selectedFont.body,
      background_style: {
        type: 'solid',
        color: selectedColors.background_color,
      },
      widget_style: {
        textColor: selectedColors.text_primary_color,
        backgroundColor: 'transparent',
        accentColor: selectedColors.accent_color,
        borderRadius: 8,
      },
      block_defaults: {
        text: {
          color: selectedColors.text_primary_color,
          fontFamily: selectedFont.body,
        },
        shape: {
          fill: selectedColors.primary_color,
          borderRadius: 12,
        },
      },
    };
  };

  // Save theme
  const handleSaveTheme = async () => {
    setSaving(true);
    setError(null);

    try {
      const theme = buildTheme();
      const { data, error: saveError } = await createBrandTheme(theme);

      if (saveError) {
        throw new Error(saveError);
      }

      onThemeCreated?.(data);
      onClose();
      resetModal();
    } catch (err) {
      logger.error('Save theme error', { error: err.message });
      setError(err.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return logoFile !== null;
      case 1:
        return true;
      case 2:
        return selectedFont !== null;
      case 3:
        return themeName.trim().length > 0;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep === 0 && logoFile && !logoUrl?.startsWith('http')) {
      // Need to upload first
      handleUploadAndExtract();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Brand Identity"
      size="lg"
    >
      <div className="flex flex-col h-[600px]">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-gray-800">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                    ${isActive ? 'bg-blue-500 text-white' : ''}
                    ${isComplete ? 'bg-green-500/20 text-green-400' : ''}
                    ${!isActive && !isComplete ? 'bg-gray-800 text-gray-500' : ''}
                  `}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-gray-700 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Upload Logo */}
          {currentStep === 0 && (
            <UploadStep
              logoFile={logoFile}
              logoUrl={logoUrl}
              onFileSelect={handleFileSelect}
              uploading={uploading}
              extracting={extracting}
            />
          )}

          {/* Step 1: Colors */}
          {currentStep === 1 && (
            <ColorsStep
              brandIdentity={brandIdentity}
              selectedColors={selectedColors}
              onColorSelect={handleColorSelect}
            />
          )}

          {/* Step 2: Fonts */}
          {currentStep === 2 && (
            <FontsStep
              brandIdentity={brandIdentity}
              selectedFont={selectedFont}
              onFontSelect={setSelectedFont}
            />
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && (
            <PreviewStep
              theme={buildTheme()}
              themeName={themeName}
              onNameChange={setThemeName}
              logoUrl={logoUrl}
            />
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            onClick={currentStep === 0 ? onClose : goBack}
            disabled={uploading || extracting || saving}
          >
            {currentStep === 0 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={goNext}
              disabled={!canGoNext() || uploading || extracting}
            >
              {uploading || extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleSaveTheme} disabled={saving || !canGoNext()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Brand Theme
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function UploadStep({ logoFile, logoUrl, onFileSelect, uploading, extracting }) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Upload Your Logo
        </h3>
        <p className="text-gray-400">
          We'll extract your brand colors and suggest a matching theme
        </p>
      </div>

      {/* Upload Area */}
      <label
        className={`
          relative block w-full max-w-md mx-auto aspect-video rounded-xl border-2 border-dashed
          transition-colors cursor-pointer overflow-hidden
          ${logoUrl
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          className="hidden"
          disabled={uploading || extracting}
        />

        {logoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={logoUrl}
              alt="Logo preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-300 font-medium mb-1">
              Click to upload your logo
            </p>
            <p className="text-gray-500 text-sm">
              PNG, JPG, SVG up to 5MB
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {(uploading || extracting) && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-gray-300 text-sm">
              {uploading ? 'Uploading...' : 'Extracting brand colors...'}
            </p>
          </div>
        )}
      </label>

      {logoFile && (
        <p className="mt-4 text-sm text-gray-400">
          Selected: {logoFile.name}
        </p>
      )}
    </div>
  );
}

function ColorsStep({ brandIdentity, selectedColors, onColorSelect }) {
  const extractedColors = brandIdentity?.colors?.extracted || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Your Brand Colors
        </h3>
        <p className="text-gray-400">
          We detected these colors from your logo. Click to customize.
        </p>
      </div>

      {/* Extracted Colors Palette */}
      {extractedColors.length > 0 && (
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <div className="text-sm text-gray-400 mb-3">Extracted from logo:</div>
          <ColorPaletteGrid
            colors={extractedColors}
            onColorClick={(color) => onColorSelect('primary_color', color)}
          />
        </div>
      )}

      {/* Color Assignment */}
      <div className="grid grid-cols-2 gap-4">
        <ColorPicker
          label="Primary Color"
          color={selectedColors.primary_color}
          onChange={(color) => onColorSelect('primary_color', color)}
        />
        <ColorPicker
          label="Secondary Color"
          color={selectedColors.secondary_color}
          onChange={(color) => onColorSelect('secondary_color', color)}
        />
        <ColorPicker
          label="Accent Color"
          color={selectedColors.accent_color}
          onChange={(color) => onColorSelect('accent_color', color)}
        />
        <ColorPicker
          label="Neutral Color"
          color={selectedColors.neutral_color}
          onChange={(color) => onColorSelect('neutral_color', color)}
        />
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-800/50 rounded-lg">
        <div className="text-sm text-gray-400 mb-3">Preview:</div>
        <div className="flex gap-2">
          {['primary_color', 'secondary_color', 'accent_color', 'neutral_color'].map(key => (
            <div
              key={key}
              className="flex-1 h-12 rounded-lg first:rounded-l-xl last:rounded-r-xl"
              style={{ backgroundColor: selectedColors[key] }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FontsStep({ brandIdentity, selectedFont, onFontSelect }) {
  const recommended = brandIdentity?.fonts?.recommended || FONT_PAIRINGS.slice(0, 3);
  const allFonts = FONT_PAIRINGS;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Choose Typography
        </h3>
        <p className="text-gray-400">
          Select a font pairing that matches your brand style
        </p>
      </div>

      {/* Recommended Fonts */}
      <div>
        <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Recommended for your brand
        </div>
        <div className="grid grid-cols-1 gap-3">
          {recommended.map((font, index) => (
            <FontPairingPreview
              key={`rec-${index}`}
              heading={font.heading}
              body={font.body}
              style={font.style}
              selected={selectedFont?.heading === font.heading}
              onClick={() => onFontSelect(font)}
            />
          ))}
        </div>
      </div>

      {/* All Fonts */}
      <div>
        <div className="text-sm text-gray-400 mb-3">All font pairings</div>
        <div className="grid grid-cols-2 gap-3">
          {allFonts
            .filter(f => !recommended.find(r => r.heading === f.heading))
            .map((font, index) => (
              <FontPairingPreview
                key={`all-${index}`}
                heading={font.heading}
                body={font.body}
                style={font.style}
                selected={selectedFont?.heading === font.heading}
                onClick={() => onFontSelect(font)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function PreviewStep({ theme, themeName, onNameChange, logoUrl }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Preview Your Brand Theme
        </h3>
        <p className="text-gray-400">
          This is how your brand will look across scenes and slides
        </p>
      </div>

      {/* Theme Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Theme Name
        </label>
        <input
          type="text"
          value={themeName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter theme name"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Logo Preview */}
      {logoUrl && (
        <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
          <img
            src={logoUrl}
            alt="Brand logo"
            className="w-16 h-16 object-contain rounded-lg bg-white/5"
          />
          <div>
            <div className="text-sm font-medium text-white">Logo uploaded</div>
            <div className="text-xs text-gray-400">Will be saved with your theme</div>
          </div>
        </div>
      )}

      {/* Large Preview */}
      <ThemePreviewLarge theme={theme} />

      {/* Summary */}
      <div className="p-4 bg-gray-800/50 rounded-lg">
        <div className="text-sm text-gray-400 mb-2">Theme Summary</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Heading Font:</span>{' '}
            <span className="text-white">{theme.font_heading}</span>
          </div>
          <div>
            <span className="text-gray-500">Body Font:</span>{' '}
            <span className="text-white">{theme.font_body}</span>
          </div>
          <div>
            <span className="text-gray-500">Primary:</span>{' '}
            <span
              className="inline-block w-4 h-4 rounded align-middle ml-1"
              style={{ backgroundColor: theme.primary_color }}
            />
          </div>
          <div>
            <span className="text-gray-500">Accent:</span>{' '}
            <span
              className="inline-block w-4 h-4 rounded align-middle ml-1"
              style={{ backgroundColor: theme.accent_color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ColorPicker({ label, color, onChange }) {
  return (
    <div className="p-3 bg-gray-800/50 rounded-lg">
      <label className="block text-xs text-gray-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border-0 cursor-pointer"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm uppercase"
        />
      </div>
    </div>
  );
}
