/**
 * QuickCustomizePanel
 *
 * A collapsible brand customization panel that appears on the right side
 * of the SVG editor when opening a template for the first time.
 *
 * Features:
 * - Brand color swatches that replace the dominant template color on click
 * - Logo placement button that adds the brand logo to the canvas
 * - Text override inputs for each text element on the canvas
 * - Collapsible sections with smooth transitions
 * - Dark theme styling to match the editor
 *
 * @param root0
 * @param root0.canvas - Fabric.js canvas instance
 * @param root0.isLoading - Whether the SVG template is still loading
 * @param root0.onDismiss - Callback to close the panel
 * @param root0.onCanvasModified - Callback to mark unsaved changes
 */

import { useState, useEffect } from 'react';
import { X, Palette, Image, Type, ChevronRight } from 'lucide-react';
import { getBrandTheme, DEFAULT_THEME } from '../../services/brandThemeService';
import * as fabric from 'fabric';

export default function QuickCustomizePanel({ canvas, isLoading, onDismiss, onCanvasModified }) {
  const [brandTheme, setBrandTheme] = useState(DEFAULT_THEME);
  const [brandLoading, setBrandLoading] = useState(true);
  const [textElements, setTextElements] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    colors: true,
    logo: true,
    texts: true,
  });
  const [logoError, setLogoError] = useState(null);

  // Load brand theme on mount
  useEffect(() => {
    setBrandLoading(true);
    getBrandTheme()
      .then(({ data }) => {
        setBrandTheme(data || DEFAULT_THEME);
      })
      .catch(() => {
        setBrandTheme(DEFAULT_THEME);
      })
      .finally(() => {
        setBrandLoading(false);
      });
  }, []);

  // Discover text elements once canvas finishes loading
  useEffect(() => {
    if (!isLoading && canvas) {
      const texts = canvas
        .getObjects()
        .filter((obj) => obj.type === 'i-text' || obj.type === 'textbox')
        .map((obj) => ({
          id: obj.id || `text-${Math.random().toString(36).slice(2, 8)}`,
          text: obj.text,
          fabricObj: obj,
        }));
      setTextElements(texts);
    }
  }, [isLoading, canvas]);

  // Apply a brand color by replacing the dominant template color
  const handleApplyColor = (newColor) => {
    if (!canvas) return;

    // Collect all fill colors and find the most common non-white, non-black
    const colorCounts = {};
    canvas.getObjects().forEach((obj) => {
      const fill = obj.fill;
      if (
        fill &&
        typeof fill === 'string' &&
        fill !== '#ffffff' &&
        fill !== '#FFFFFF' &&
        fill !== '#000000' &&
        fill !== '#000'
      ) {
        colorCounts[fill.toLowerCase()] = (colorCounts[fill.toLowerCase()] || 0) + 1;
      }
    });

    const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominantColor) return;

    canvas.getObjects().forEach((obj) => {
      if (obj.fill && typeof obj.fill === 'string' && obj.fill.toLowerCase() === dominantColor) {
        obj.set('fill', newColor);
      }
      if (obj.stroke && typeof obj.stroke === 'string' && obj.stroke.toLowerCase() === dominantColor) {
        obj.set('stroke', newColor);
      }
    });
    canvas.renderAll();
    onCanvasModified?.();
  };

  // Place brand logo on canvas
  const handlePlaceLogo = async () => {
    const logoUrl = brandTheme?.logo_url;
    if (!logoUrl) {
      setLogoError('No brand logo configured');
      return;
    }
    setLogoError(null);

    try {
      const img = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' });
      const maxWidth = canvas.width * 0.2;
      const maxHeight = canvas.height * 0.15;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      img.set({
        left: 40,
        top: 40,
        scaleX: scale,
        scaleY: scale,
        id: `logo-${Date.now()}`,
        name: 'Brand Logo',
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      onCanvasModified?.();
    } catch (err) {
      console.error('Failed to place logo:', err);
      setLogoError('Failed to load logo image');
    }
  };

  // Update text on a canvas object
  const handleTextChange = (fabricObj, newText) => {
    fabricObj.set('text', newText);
    canvas.renderAll();
    onCanvasModified?.();
    setTextElements((prev) =>
      prev.map((t) => (t.fabricObj === fabricObj ? { ...t, text: newText } : t))
    );
  };

  // Toggle a collapsible section
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const brandColors = [
    { key: 'primary_color', label: 'Primary', color: brandTheme.primary_color },
    { key: 'secondary_color', label: 'Secondary', color: brandTheme.secondary_color },
    { key: 'accent_color', label: 'Accent', color: brandTheme.accent_color },
  ];

  const disabledOverlay = isLoading ? 'pointer-events-none opacity-50' : '';

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Quick Customize</h3>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
          aria-label="Close quick customize panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Brand Colors Section */}
        <div>
          <button
            onClick={() => toggleSection('colors')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Palette size={16} /> Brand Colors
            </span>
            <ChevronRight
              size={14}
              className={`text-gray-500 transition-transform ${expandedSections.colors ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedSections.colors && (
            <div className={`mt-3 ${disabledOverlay}`}>
              {brandLoading ? (
                <div className="flex gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-gray-600 animate-pulse" />
                      <div className="w-10 h-2 bg-gray-600 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    {brandColors.map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => handleApplyColor(color)}
                        className="flex flex-col items-center gap-1 group"
                        title={`Apply ${label} color (${color})`}
                      >
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-600 group-hover:border-white transition-colors shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-gray-400 group-hover:text-gray-200 transition-colors">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Click to replace dominant template color
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Logo Section */}
        <div>
          <button
            onClick={() => toggleSection('logo')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Image size={16} /> Brand Logo
            </span>
            <ChevronRight
              size={14}
              className={`text-gray-500 transition-transform ${expandedSections.logo ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedSections.logo && (
            <div className={`mt-3 ${disabledOverlay}`}>
              {brandTheme?.logo_url ? (
                <button
                  onClick={handlePlaceLogo}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg px-4 py-2 transition-colors"
                >
                  Place Logo
                </button>
              ) : (
                <p className="text-xs text-gray-500">
                  Set up brand logo in Branding Settings
                </p>
              )}
              {logoError && (
                <p className="text-xs text-red-400 mt-1">{logoError}</p>
              )}
            </div>
          )}
        </div>

        {/* Text Overrides Section */}
        <div>
          <button
            onClick={() => toggleSection('texts')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Type size={16} /> Text Overrides
            </span>
            <ChevronRight
              size={14}
              className={`text-gray-500 transition-transform ${expandedSections.texts ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedSections.texts && (
            <div className={`mt-3 space-y-3 ${disabledOverlay}`}>
              {textElements.length === 0 ? (
                <p className="text-xs text-gray-500">No editable text found</p>
              ) : (
                textElements.map((el) => (
                  <div key={el.id}>
                    <label className="block text-xs text-gray-400 mb-1 truncate" title={el.text}>
                      {el.text.slice(0, 20)}{el.text.length > 20 ? '...' : ''}
                    </label>
                    <input
                      type="text"
                      value={el.text}
                      onChange={(e) => handleTextChange(el.fabricObj, e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
