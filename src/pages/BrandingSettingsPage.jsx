/**
 * BrandingSettingsPage - Allows clients to customize their branding
 *
 * Features:
 * - Upload/change logo
 * - Set primary/secondary colors
 * - Toggle dark theme
 * - Edit business name
 * - Preview changes
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Upload,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  RotateCcw,
  Building2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  getBranding,
  updateBranding,
  uploadLogo,
  isValidHexColor,
  DEFAULT_BRANDING,
  getContrastColor,
} from '../services/brandingService';
import { useBranding } from '../contexts/BrandingContext';

export default function BrandingSettingsPage() {
  const { refreshBranding, isImpersonating, impersonatedClient } = useBranding();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    businessName: '',
    logoUrl: '',
    primaryColor: DEFAULT_BRANDING.primaryColor,
    secondaryColor: DEFAULT_BRANDING.secondaryColor,
    isDarkTheme: false,
  });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current branding
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await getBranding();

      if (fetchError) {
        setError(fetchError);
      } else if (data) {
        const brandingData = {
          businessName: data.businessName || '',
          logoUrl: data.logoUrl || '',
          primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          isDarkTheme: data.isDarkTheme || false,
        };
        setFormData(brandingData);
        setOriginalData(brandingData);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Check for changes
  useEffect(() => {
    if (originalData) {
      const changed =
        formData.businessName !== originalData.businessName ||
        formData.logoUrl !== originalData.logoUrl ||
        formData.primaryColor !== originalData.primaryColor ||
        formData.secondaryColor !== originalData.secondaryColor ||
        formData.isDarkTheme !== originalData.isDarkTheme;
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const { url, error: uploadError } = await uploadLogo(file);

    if (uploadError) {
      setError(uploadError);
    } else if (url) {
      setFormData((prev) => ({ ...prev, logoUrl: url }));
    }

    setUploading(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate colors
    if (formData.primaryColor && !isValidHexColor(formData.primaryColor)) {
      setError('Invalid primary color format. Use hex format like #3B82F6');
      setSaving(false);
      return;
    }
    if (formData.secondaryColor && !isValidHexColor(formData.secondaryColor)) {
      setError('Invalid secondary color format. Use hex format like #1D4ED8');
      setSaving(false);
      return;
    }

    const { success: updateSuccess, error: updateError } = await updateBranding({
      businessName: formData.businessName || null,
      logoUrl: formData.logoUrl || null,
      primaryColor: formData.primaryColor || null,
      secondaryColor: formData.secondaryColor || null,
      isDarkTheme: formData.isDarkTheme,
    });

    if (updateError) {
      setError(updateError);
    } else {
      setSuccess(true);
      setOriginalData({ ...formData });
      // Refresh global branding context
      await refreshBranding();
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  };

  // Handle reset
  const handleReset = () => {
    if (originalData) {
      setFormData({ ...originalData });
    }
  };

  // Handle reset to defaults
  const handleResetToDefaults = () => {
    setFormData({
      businessName: '',
      logoUrl: '',
      primaryColor: DEFAULT_BRANDING.primaryColor,
      secondaryColor: DEFAULT_BRANDING.secondaryColor,
      isDarkTheme: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
            <p className="text-sm text-gray-500">
              {isImpersonating
                ? `Editing branding for ${impersonatedClient?.businessName || 'client'}`
                : 'Customize your brand appearance'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--branding-primary)' }}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">Branding saved successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          {/* Business Name */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Name
            </h2>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, businessName: e.target.value }))
              }
              placeholder="Your Business Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Displayed in the sidebar and throughout the app
            </p>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Logo
            </h2>

            <div className="flex items-start gap-4">
              {/* Logo preview */}
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>

              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  PNG, JPG up to 2MB. Recommended: 400x400px
                </p>

                {formData.logoUrl && (
                  <button
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, logoUrl: '' }))
                    }
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>

            {/* Logo URL input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or paste logo URL
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Brand Colors
            </h2>

            <div className="space-y-4">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    placeholder="#3B82F6"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Used for buttons, links, and active states
                </p>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    placeholder="#1D4ED8"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Used for hover states and backgrounds
                </p>
              </div>
            </div>
          </div>

          {/* Dark Theme Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dark Theme</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Use dark color scheme for the app interface
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDarkTheme}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isDarkTheme: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Reset to Defaults */}
          <button
            onClick={handleResetToDefaults}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Default Branding
          </button>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview
            </h2>

            {/* Sidebar Preview */}
            <div
              className={`rounded-lg overflow-hidden border border-gray-200 ${
                formData.isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'
              }`}
            >
              {/* Sidebar Header */}
              <div
                className={`p-4 border-b ${
                  formData.isDarkTheme
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-10 h-10 rounded-lg object-contain"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      <span
                        className="text-lg font-bold"
                        style={{ color: getContrastColor(formData.primaryColor) }}
                      >
                        {(formData.businessName || 'B')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span
                    className={`font-semibold ${
                      formData.isDarkTheme ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {formData.businessName || 'BizScreen'}
                  </span>
                </div>
              </div>

              {/* Sidebar Nav Items */}
              <div className="p-2">
                {['Dashboard', 'Media', 'Playlists', 'Screens'].map(
                  (item, index) => (
                    <div
                      key={item}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        index === 0
                          ? 'text-white'
                          : formData.isDarkTheme
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}
                      style={
                        index === 0
                          ? { backgroundColor: formData.primaryColor }
                          : {}
                      }
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Button Preview */}
            <div className="mt-6">
              <h3
                className={`text-sm font-medium mb-3 ${
                  formData.isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Buttons
              </h3>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: formData.secondaryColor }}
                >
                  Secondary
                </button>
              </div>
            </div>

            {/* Link Preview */}
            <div className="mt-6">
              <h3
                className={`text-sm font-medium mb-3 ${
                  formData.isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Links & Accents
              </h3>
              <p className={formData.isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                This is regular text with a{' '}
                <span
                  className="font-medium underline"
                  style={{ color: formData.primaryColor }}
                >
                  link styled
                </span>{' '}
                using your primary color.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
