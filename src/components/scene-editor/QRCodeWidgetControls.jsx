/**
 * QRCodeWidgetControls
 *
 * Configuration UI for the QR code widget type in the scene editor.
 * Provides QR type selection (URL/WiFi/Text), type-specific content fields,
 * error correction level, foreground/background color pickers with contrast
 * warning, corner radius, label, and text color controls.
 *
 * Follows the same pattern as CountdownWidgetControls.
 */

import { useState } from 'react';
import { Link, QrCode, Type, Wifi, AlertTriangle, Palette, Eye, EyeOff, Image as ImageIcon, Info } from 'lucide-react';
import { useBranding } from '../../contexts/BrandingContext.jsx';

/**
 * Calculate relative luminance from a hex color string.
 * Uses the sRGB linearization formula per WCAG 2.0.
 */
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const linearize = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculate contrast ratio between two hex colors.
 */
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {Object} root0 - Component props
 * @param {Object} root0.props - Widget props from the block
 * @param {Function} root0.onPropChange - Callback to update a single prop
 */
export function QRCodeWidgetControls({ props, onPropChange }) {
  const { branding } = useBranding();

  const qrType = props.qrType || 'url';
  const url = props.url || '';
  const text = props.text || '';
  const ssid = props.ssid || '';
  const password = props.password || '';
  const encryption = props.encryption || 'WPA';
  const hiddenNetwork = props.hiddenNetwork || false;
  const errorCorrection = props.errorCorrection || 'M';
  const qrFgColor = props.qrFgColor || '#000000';
  const qrBgColor = props.qrBgColor || '#ffffff';
  const cornerRadius = props.cornerRadius ?? 8;
  const label = props.label || '';
  const textColor = props.textColor || '#ffffff';
  const logoEnabled = props.logoEnabled || false;
  const logoUrl = props.logoUrl || '';

  const [showPassword, setShowPassword] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  // When logo toggle is turned on, pre-fill with tenant brand logo if available
  const handleLogoToggle = (enabled) => {
    onPropChange('logoEnabled', enabled);
    if (enabled && !props.logoUrl && branding?.logoUrl) {
      onPropChange('logoUrl', branding.logoUrl);
    }
  };

  // URL validation (soft hint, not blocking)
  const urlLooksInvalid = qrType === 'url' && url.length > 0 && !/^https?:\/\//.test(url);

  // Contrast warning
  const contrast = contrastRatio(qrFgColor, qrBgColor);
  const lowContrast = contrast < 3;

  return (
    <div className="space-y-3">
      {/* QR Type Picker (segmented control) */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <QrCode className="w-3 h-3 inline mr-1" />
          QR Type
        </label>
        <div className="flex gap-1">
          {[
            { key: 'url', label: 'URL', icon: Link },
            { key: 'wifi', label: 'WiFi', icon: Wifi },
            { key: 'text', label: 'Text', icon: Type },
          ].map(({ key, label: btnLabel, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onPropChange('qrType', key)}
              className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded ${
                qrType === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Icon className="w-3 h-3" />
              {btnLabel}
            </button>
          ))}
        </div>
      </div>

      {/* URL type fields */}
      {qrType === 'url' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            <Link className="w-3 h-3 inline mr-1" />
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => onPropChange('url', e.target.value)}
            placeholder="https://example.com"
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
          />
          {urlLooksInvalid && (
            <p className="flex items-center gap-1 text-xs text-yellow-400 mt-1">
              <AlertTriangle className="w-3 h-3 inline" />
              This doesn&apos;t look like a URL. QR will still work.
            </p>
          )}
        </div>
      )}

      {/* WiFi type fields */}
      {qrType === 'wifi' && (
        <div className="space-y-2">
          {/* SSID */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">SSID</label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => onPropChange('ssid', e.target.value)}
              placeholder="Network name"
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
            />
          </div>

          {/* Password with show/hide toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => onPropChange('password', e.target.value)}
                placeholder="Network password"
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Encryption segmented control */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Encryption</label>
            <div className="flex gap-1">
              <button
                onClick={() => onPropChange('encryption', 'WPA')}
                className={`flex-1 text-xs py-1.5 rounded ${
                  encryption !== 'nopass'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                WPA/WPA2
              </button>
              <button
                onClick={() => onPropChange('encryption', 'nopass')}
                className={`flex-1 text-xs py-1.5 rounded ${
                  encryption === 'nopass'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                Open
              </button>
            </div>
          </div>

          {/* Hidden network checkbox */}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={hiddenNetwork}
              onChange={(e) => onPropChange('hiddenNetwork', e.target.checked)}
              className="accent-blue-500"
            />
            Hidden network
          </label>

          {/* Human-readable summary */}
          <p className="text-xs text-gray-500">
            WiFi: {ssid || 'No network'} ({encryption === 'nopass' ? 'Open' : 'WPA'})
          </p>
        </div>
      )}

      {/* Text type fields */}
      {qrType === 'text' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            <Type className="w-3 h-3 inline mr-1" />
            Text Content
          </label>
          <textarea
            value={text}
            onChange={(e) => onPropChange('text', e.target.value)}
            placeholder="Enter any text..."
            rows={3}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full resize-none"
          />
          <div className="text-xs text-gray-500 text-right mt-0.5">
            {text.length} characters
          </div>
        </div>
      )}

      {/* Error Correction Level */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Error Correction
        </label>
        <p className="text-xs text-gray-500 mb-1.5">(Higher = more reliable scanning)</p>
        <div className="flex gap-1">
          {['L', 'M', 'Q', 'H'].map((level) => (
            <button
              key={level}
              onClick={() => !logoEnabled && onPropChange('errorCorrection', level)}
              className={`flex-1 text-xs py-1.5 rounded font-medium ${
                (logoEnabled ? level === 'H' : errorCorrection === level)
                  ? 'bg-blue-600 text-white'
                  : logoEnabled
                    ? 'bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        {logoEnabled && (
          <p className="text-xs text-blue-500 mt-1">(Auto: H with logo)</p>
        )}
      </div>

      {/* Color Pickers */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <Palette className="w-3 h-3 inline mr-1" />
          QR Color
        </label>
        <input
          type="color"
          value={qrFgColor}
          onChange={(e) => onPropChange('qrFgColor', e.target.value)}
          className="w-full h-8 rounded cursor-pointer bg-gray-700 border border-gray-600"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Background</label>
        <input
          type="color"
          value={qrBgColor}
          onChange={(e) => onPropChange('qrBgColor', e.target.value)}
          className="w-full h-8 rounded cursor-pointer bg-gray-700 border border-gray-600"
        />
      </div>

      {/* Contrast warning */}
      {lowContrast && (
        <p className="flex items-center gap-1 text-xs text-yellow-400">
          <AlertTriangle className="w-3 h-3 inline" />
          Low contrast may affect scanning reliability
        </p>
      )}

      {/* Brand Logo */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <ImageIcon className="w-3 h-3 inline mr-1" />
          Brand Logo
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-400">Add brand logo</span>
          <button
            type="button"
            onClick={() => handleLogoToggle(!logoEnabled)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              logoEnabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                logoEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
        {logoEnabled && (
          <div className="mt-2 space-y-2">
            <p className="flex items-center gap-1 text-xs text-blue-500">
              <Info className="w-3 h-3 inline" />
              Error correction automatically set to H for scan reliability
            </p>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => {
                onPropChange('logoUrl', e.target.value);
                setLogoPreviewError(false);
              }}
              placeholder="https://example.com/logo.png"
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
            />
            <p className="text-xs text-gray-500">
              {branding?.logoUrl && logoUrl === branding.logoUrl ? (
                <span className="text-green-500">Using your brand logo</span>
              ) : (
                'Enter your logo image URL'
              )}
            </p>
            {logoUrl && !logoPreviewError && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                    onError={() => setLogoPreviewError(true)}
                  />
                </div>
                <span className="text-xs text-gray-500">Preview</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corner Radius */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Corner Radius</label>
        <input
          type="range"
          value={cornerRadius}
          onChange={(e) => onPropChange('cornerRadius', parseInt(e.target.value))}
          min={0}
          max={24}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{cornerRadius}px</div>
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => onPropChange('label', e.target.value)}
          placeholder="Scan me!"
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
        />
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Text Color</label>
        <input
          type="color"
          value={textColor}
          onChange={(e) => onPropChange('textColor', e.target.value)}
          className="w-full h-8 rounded cursor-pointer bg-gray-700 border border-gray-600"
        />
      </div>
    </div>
  );
}
