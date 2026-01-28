/**
 * Effects Panel - OptiSigns Style
 *
 * Left panel for applying effects to selected objects.
 * Features:
 * - Color (fill) with "Used in design" section
 * - Opacity slider
 * - Outline (stroke) with toggle
 * - Shadow with toggle and controls
 * - Gradient presets
 */

import { useState } from 'react';
import * as fabric from 'fabric';

// Color presets matching OptiSigns
const COLOR_PRESETS = [
  // Row 1 - Basic
  '#000000', '#FFFFFF', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  // Row 2 - Vivid
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B',
];

// Gradient presets
const GRADIENT_PRESETS = [
  ['#FFE66D', '#4ECDC4'],
  ['#FF6B6B', '#FE5F75'],
  ['#667EEA', '#764BA2'],
  ['#F093FB', '#F5576C'],
  ['#4FACFE', '#00F2FE'],
  ['#43E97B', '#38F9D7'],
  ['#FA709A', '#FEE140'],
  ['#A8EDEA', '#FED6E3'],
];

export default function EffectsPanel({
  selectedObject,
  onUpdate,
  onClose,
  usedColors = [],
}) {
  const [expandedSections, setExpandedSections] = useState({
    color: true,
    opacity: true,
    outline: true,
    shadow: false,
    gradient: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Toggle switch component
  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  const SectionHeader = ({ title, section, hasToggle, toggleValue, onToggleChange }) => (
    <div className="flex items-center justify-between py-2">
      <button
        onClick={() => toggleSection(section)}
        className="flex items-center gap-2 text-white text-sm font-medium"
      >
        {expandedSections[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{title}</span>
      </button>
      {hasToggle && (
        <Toggle checked={toggleValue} onChange={onToggleChange} />
      )}
    </div>
  );

  // Rainbow picker button
  const RainbowPicker = ({ value, onChange }) => (
    <label className="relative cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="w-7 h-7 rounded-full bg-gradient-conic from-red-500 via-yellow-500 via-green-500 via-blue-500 to-red-500 border-2 border-gray-600 hover:border-gray-400 transition-colors"
           style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
    </label>
  );

  if (!selectedObject) return null;

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-white font-medium">Effects</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Color Section */}
        <div className="border-b border-gray-700 pb-3">
          <SectionHeader title="Color" section="color" />
          {expandedSections.color && (
            <div className="mt-2 space-y-3">
              {/* Color Input Row */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2 border-gray-600"
                  style={{ backgroundColor: selectedObject.fill || '#333333' }}
                />
                <input
                  type="text"
                  value={selectedObject.fill || '#333333'}
                  onChange={(e) => onUpdate?.('fill', e.target.value)}
                  className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm font-mono"
                />
                <RainbowPicker
                  value={selectedObject.fill || '#333333'}
                  onChange={(color) => onUpdate?.('fill', color)}
                />
              </div>

              {/* Used in this design */}
              {usedColors.length > 0 && (
                <div>
                  <span className="text-xs text-gray-400 mb-2 block">Used in this design</span>
                  <div className="flex flex-wrap gap-1">
                    {usedColors.slice(0, 8).map((color, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdate?.('fill', color)}
                        className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                          selectedObject.fill === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color presets */}
              <div>
                <span className="text-xs text-gray-400 mb-2 block">Colors</span>
                <div className="grid grid-cols-10 gap-1">
                  {COLOR_PRESETS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdate?.('fill', color)}
                      className={`w-5 h-5 rounded transition-transform hover:scale-110 ${
                        selectedObject.fill === color ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opacity Section */}
        <div className="border-b border-gray-700 pb-3">
          <SectionHeader title="Opacity" section="opacity" />
          {expandedSections.opacity && (
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((selectedObject.opacity || 1) * 100)}
                  onChange={(e) => onUpdate?.('opacity', parseInt(e.target.value) / 100)}
                  className="flex-1 accent-green-500 h-1"
                />
                <span className="text-sm text-white w-12 text-right">
                  {Math.round((selectedObject.opacity || 1) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Outline Section */}
        <div className="border-b border-gray-700 pb-3">
          <SectionHeader
            title="Outline"
            section="outline"
            hasToggle
            toggleValue={!!selectedObject.stroke && selectedObject.strokeWidth > 0}
            onToggleChange={(enabled) => {
              if (enabled) {
                onUpdate?.('stroke', '#000000');
                onUpdate?.('strokeWidth', 2);
              } else {
                onUpdate?.('stroke', null);
                onUpdate?.('strokeWidth', 0);
              }
            }}
          />
          {expandedSections.outline && selectedObject.stroke && selectedObject.strokeWidth > 0 && (
            <div className="mt-2 space-y-3">
              {/* Stroke Color Row */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2 border-gray-600"
                  style={{ backgroundColor: selectedObject.stroke || '#000000' }}
                />
                <input
                  type="text"
                  value={selectedObject.stroke || '#000000'}
                  onChange={(e) => onUpdate?.('stroke', e.target.value)}
                  className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded text-sm font-mono"
                />
                <RainbowPicker
                  value={selectedObject.stroke || '#000000'}
                  onChange={(color) => onUpdate?.('stroke', color)}
                />
              </div>

              {/* Width */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Width</span>
                  <span className="text-xs text-white">{selectedObject.strokeWidth || 2}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={selectedObject.strokeWidth || 2}
                  onChange={(e) => onUpdate?.('strokeWidth', parseInt(e.target.value))}
                  className="w-full accent-green-500 h-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Shadow Section */}
        <div className="border-b border-gray-700 pb-3">
          <SectionHeader
            title="Shadow"
            section="shadow"
            hasToggle
            toggleValue={!!selectedObject.shadow}
            onToggleChange={(enabled) => {
              if (enabled) {
                onUpdate?.('shadow', new fabric.Shadow({
                  color: 'rgba(0,0,0,0.5)',
                  blur: 10,
                  offsetX: 5,
                  offsetY: 5,
                }));
              } else {
                onUpdate?.('shadow', null);
              }
            }}
          />
          {expandedSections.shadow && selectedObject.shadow && (
            <div className="mt-2 space-y-3">
              {/* Shadow Color */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">Color</span>
                <input
                  type="color"
                  value="#000000"
                  onChange={(e) => {
                    onUpdate?.('shadow', new fabric.Shadow({
                      color: e.target.value,
                      blur: selectedObject.shadow?.blur || 10,
                      offsetX: selectedObject.shadow?.offsetX || 5,
                      offsetY: selectedObject.shadow?.offsetY || 5,
                    }));
                  }}
                  className="w-7 h-7 rounded cursor-pointer"
                />
              </div>

              {/* Blur */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Blur</span>
                  <span className="text-xs text-white">{selectedObject.shadow?.blur || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={selectedObject.shadow?.blur || 0}
                  onChange={(e) => {
                    onUpdate?.('shadow', new fabric.Shadow({
                      color: selectedObject.shadow?.color || 'rgba(0,0,0,0.5)',
                      blur: parseInt(e.target.value),
                      offsetX: selectedObject.shadow?.offsetX || 5,
                      offsetY: selectedObject.shadow?.offsetY || 5,
                    }));
                  }}
                  className="w-full accent-green-500 h-1"
                />
              </div>

              {/* Offset X */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Offset X</span>
                  <span className="text-xs text-white">{selectedObject.shadow?.offsetX || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={selectedObject.shadow?.offsetX || 0}
                  onChange={(e) => {
                    onUpdate?.('shadow', new fabric.Shadow({
                      color: selectedObject.shadow?.color || 'rgba(0,0,0,0.5)',
                      blur: selectedObject.shadow?.blur || 10,
                      offsetX: parseInt(e.target.value),
                      offsetY: selectedObject.shadow?.offsetY || 5,
                    }));
                  }}
                  className="w-full accent-green-500 h-1"
                />
              </div>

              {/* Offset Y */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Offset Y</span>
                  <span className="text-xs text-white">{selectedObject.shadow?.offsetY || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={selectedObject.shadow?.offsetY || 0}
                  onChange={(e) => {
                    onUpdate?.('shadow', new fabric.Shadow({
                      color: selectedObject.shadow?.color || 'rgba(0,0,0,0.5)',
                      blur: selectedObject.shadow?.blur || 10,
                      offsetX: selectedObject.shadow?.offsetX || 5,
                      offsetY: parseInt(e.target.value),
                    }));
                  }}
                  className="w-full accent-green-500 h-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Gradient Section */}
        <div className="pb-3">
          <SectionHeader title="Gradient" section="gradient" />
          {expandedSections.gradient && (
            <div className="mt-2">
              <div className="grid grid-cols-4 gap-2">
                {GRADIENT_PRESETS.map((gradient, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // Apply gradient as fill
                      const grad = new fabric.Gradient({
                        type: 'linear',
                        coords: { x1: 0, y1: 0, x2: selectedObject.width || 100, y2: selectedObject.height || 100 },
                        colorStops: [
                          { offset: 0, color: gradient[0] },
                          { offset: 1, color: gradient[1] },
                        ],
                      });
                      onUpdate?.('fill', grad);
                    }}
                    className="h-10 rounded-lg border border-gray-600 hover:border-white transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
