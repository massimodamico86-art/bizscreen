/**
 * Element Settings Panel
 *
 * Left-side panel for editing element settings.
 * Features:
 * - Element name (display name in layers panel)
 * - Opacity slider
 * - Shadow controls (toggle, color, blur, offset)
 * - Border radius (for rect shapes)
 * - Hyperlink display with edit/remove
 */

import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { X, Link2, Eye } from 'lucide-react';

export default function ElementSettingsPanel({
  selectedObject,
  onUpdate,
  onClose,
  onOpenLink,
}) {
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(5);
  const [shadowOffsetX, setShadowOffsetX] = useState(2);
  const [shadowOffsetY, setShadowOffsetY] = useState(2);

  // Sync shadow state from selected object
  useEffect(() => {
    if (!selectedObject) return;
    const shadow = selectedObject.shadow;
    if (shadow) {
      setShadowEnabled(true);
      setShadowColor(shadow.color || '#000000');
      setShadowBlur(shadow.blur || 5);
      setShadowOffsetX(shadow.offsetX || 2);
      setShadowOffsetY(shadow.offsetY || 2);
    } else {
      setShadowEnabled(false);
      setShadowColor('#000000');
      setShadowBlur(5);
      setShadowOffsetX(2);
      setShadowOffsetY(2);
    }
  }, [selectedObject]);

  const updateShadow = (updates = {}) => {
    const color = updates.color ?? shadowColor;
    const blur = updates.blur ?? shadowBlur;
    const offsetX = updates.offsetX ?? shadowOffsetX;
    const offsetY = updates.offsetY ?? shadowOffsetY;

    onUpdate?.('shadow', new fabric.Shadow({ color, blur, offsetX, offsetY }));
  };

  const handleShadowToggle = () => {
    if (shadowEnabled) {
      setShadowEnabled(false);
      onUpdate?.('shadow', null);
    } else {
      setShadowEnabled(true);
      updateShadow();
    }
  };

  const handleShadowColorChange = (value) => {
    setShadowColor(value);
    updateShadow({ color: value });
  };

  const handleShadowBlurChange = (value) => {
    const v = Math.max(0, Math.min(50, Number(value) || 0));
    setShadowBlur(v);
    updateShadow({ blur: v });
  };

  const handleShadowOffsetXChange = (value) => {
    const v = Math.max(-50, Math.min(50, Number(value) || 0));
    setShadowOffsetX(v);
    updateShadow({ offsetX: v });
  };

  const handleShadowOffsetYChange = (value) => {
    const v = Math.max(-50, Math.min(50, Number(value) || 0));
    setShadowOffsetY(v);
    updateShadow({ offsetY: v });
  };

  const isRect = selectedObject?.type === 'rect';
  const opacity = Math.round((selectedObject?.opacity ?? 1) * 100);
  const hyperlink = selectedObject?.hyperlink;

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-white">Element Settings</span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Name Section */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Name</label>
          <input
            type="text"
            value={selectedObject?.name || ''}
            onChange={(e) => onUpdate?.('name', e.target.value)}
            placeholder="Element name"
            className="w-full px-3 py-1.5 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Opacity Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Opacity
            </label>
            <span className="text-xs text-white">{opacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => onUpdate?.('opacity', parseInt(e.target.value) / 100)}
            className="w-full"
          />
        </div>

        {/* Shadow Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Shadow</label>
            <button
              onClick={handleShadowToggle}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                shadowEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  shadowEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {shadowEnabled && (
            <div className="space-y-2 pl-1">
              {/* Shadow Color */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-12">Color</label>
                <input
                  type="color"
                  value={shadowColor}
                  onChange={(e) => handleShadowColorChange(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={shadowColor}
                  onChange={(e) => handleShadowColorChange(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-green-500 font-mono"
                />
              </div>

              {/* Shadow Blur */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-12">Blur</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={shadowBlur}
                  onChange={(e) => handleShadowBlurChange(e.target.value)}
                  className="w-16 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Shadow Offset X/Y */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-12">X</label>
                <input
                  type="number"
                  min="-50"
                  max="50"
                  value={shadowOffsetX}
                  onChange={(e) => handleShadowOffsetXChange(e.target.value)}
                  className="w-16 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-green-500"
                />
                <label className="text-xs text-gray-500 w-4 text-center">Y</label>
                <input
                  type="number"
                  min="-50"
                  max="50"
                  value={shadowOffsetY}
                  onChange={(e) => handleShadowOffsetYChange(e.target.value)}
                  className="w-16 px-2 py-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Border Radius Section (rect only) */}
        {isRect && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Border Radius</label>
            <input
              type="number"
              min="0"
              max="200"
              value={selectedObject?.rx || 0}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value) || 0);
                onUpdate?.('rx', v);
                onUpdate?.('ry', v);
              }}
              className="w-20 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
        )}

        {/* Hyperlink Section */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Hyperlink
          </label>
          {hyperlink ? (
            <div className="space-y-2">
              <div className="px-3 py-1.5 bg-gray-700 text-xs text-blue-400 rounded truncate" title={hyperlink}>
                {hyperlink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenLink}
                  className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    onUpdate?.('hyperlink', '');
                    onUpdate?.('hyperlinkTarget', '');
                  }}
                  className="px-3 py-1 text-xs bg-gray-700 text-red-400 rounded hover:bg-gray-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Add Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
