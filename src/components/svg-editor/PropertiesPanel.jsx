/**
 * Properties Panel
 *
 * Right sidebar panel for editing selected object properties.
 * Supports text styling, colors, position, and size.
 */

import { useState } from 'react';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ChevronDown,
} from 'lucide-react';

export default function PropertiesPanel({
  selectedObject,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  fonts = [],
  colorPresets = [],
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!selectedObject) {
    return (
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
        <p className="text-gray-500 text-sm text-center mt-8">
          Select an object to edit its properties
        </p>
      </div>
    );
  }

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox';

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-medium mb-2">
          {isText ? 'Text Properties' : 'Object Properties'}
        </h3>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-sm"
            title="Duplicate"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors text-sm"
            title="Delete"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Text Properties */}
      {isText && (
        <div className="p-4 border-b border-gray-700 space-y-4">
          {/* Font Family */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Font</label>
            <select
              value={selectedObject.fontFamily || 'Poppins'}
              onChange={(e) => onUpdate('fontFamily', e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            >
              {fonts.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Font Size</label>
            <input
              type="number"
              value={Math.round(selectedObject.fontSize || 16)}
              onChange={(e) => onUpdate('fontSize', parseInt(e.target.value) || 16)}
              min={8}
              max={200}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>

          {/* Font Style Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
              className={`flex-1 p-2 rounded transition-colors ${
                selectedObject.fontWeight === 'bold'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Bold"
            >
              <Bold size={16} className="mx-auto" />
            </button>
            <button
              onClick={() => onUpdate('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`flex-1 p-2 rounded transition-colors ${
                selectedObject.fontStyle === 'italic'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Italic"
            >
              <Italic size={16} className="mx-auto" />
            </button>
            <button
              onClick={() => onUpdate('underline', !selectedObject.underline)}
              className={`flex-1 p-2 rounded transition-colors ${
                selectedObject.underline
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Underline"
            >
              <Underline size={16} className="mx-auto" />
            </button>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Alignment</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate('textAlign', 'left')}
                className={`flex-1 p-2 rounded transition-colors ${
                  selectedObject.textAlign === 'left'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <AlignLeft size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => onUpdate('textAlign', 'center')}
                className={`flex-1 p-2 rounded transition-colors ${
                  selectedObject.textAlign === 'center'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <AlignCenter size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => onUpdate('textAlign', 'right')}
                className={`flex-1 p-2 rounded transition-colors ${
                  selectedObject.textAlign === 'right'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <AlignRight size={16} className="mx-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-gray-400 text-xs mb-2">
          {isText ? 'Text Color' : 'Fill Color'}
        </label>

        {/* Current Color */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-10 h-10 rounded border-2 border-gray-600 cursor-pointer"
            style={{ backgroundColor: selectedObject.fill || '#333333' }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />
          <input
            type="text"
            value={selectedObject.fill || '#333333'}
            onChange={(e) => onUpdate('fill', e.target.value)}
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm font-mono"
          />
        </div>

        {/* Color Presets */}
        <div className="grid grid-cols-5 gap-1.5">
          {colorPresets.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate('fill', color)}
              className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                selectedObject.fill === color ? 'border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke (for shapes) */}
      {!isText && (
        <div className="p-4 border-b border-gray-700">
          <label className="block text-gray-400 text-xs mb-2">Stroke</label>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border-2 border-gray-600"
              style={{ backgroundColor: selectedObject.stroke || 'transparent' }}
            />
            <input
              type="text"
              value={selectedObject.stroke || ''}
              onChange={(e) => onUpdate('stroke', e.target.value)}
              placeholder="No stroke"
              className="flex-1 bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm font-mono"
            />
            <input
              type="number"
              value={selectedObject.strokeWidth || 0}
              onChange={(e) => onUpdate('strokeWidth', parseInt(e.target.value) || 0)}
              min={0}
              max={50}
              className="w-16 bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      )}

      {/* Position & Size */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-gray-400 text-xs mb-2">Position & Size</label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500 text-xs">X</span>
            <input
              type="number"
              value={Math.round(selectedObject.left || 0)}
              onChange={(e) => onUpdate('left', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <span className="text-gray-500 text-xs">Y</span>
            <input
              type="number"
              value={Math.round(selectedObject.top || 0)}
              onChange={(e) => onUpdate('top', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <span className="text-gray-500 text-xs">Width</span>
            <input
              type="number"
              value={Math.round((selectedObject.width || 100) * (selectedObject.scaleX || 1))}
              onChange={(e) => {
                const newWidth = parseInt(e.target.value) || 100;
                const scale = newWidth / (selectedObject.width || 100);
                onUpdate('scaleX', scale);
              }}
              className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <span className="text-gray-500 text-xs">Height</span>
            <input
              type="number"
              value={Math.round((selectedObject.height || 100) * (selectedObject.scaleY || 1))}
              onChange={(e) => {
                const newHeight = parseInt(e.target.value) || 100;
                const scale = newHeight / (selectedObject.height || 100);
                onUpdate('scaleY', scale);
              }}
              className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Rotation */}
        <div className="mt-2">
          <span className="text-gray-500 text-xs">Rotation</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={selectedObject.angle || 0}
              onChange={(e) => onUpdate('angle', parseFloat(e.target.value))}
              min={0}
              max={360}
              className="flex-1"
            />
            <input
              type="number"
              value={Math.round(selectedObject.angle || 0)}
              onChange={(e) => onUpdate('angle', parseFloat(e.target.value) || 0)}
              min={0}
              max={360}
              className="w-16 bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-gray-400 text-xs mb-2">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={(selectedObject.opacity || 1) * 100}
            onChange={(e) => onUpdate('opacity', parseFloat(e.target.value) / 100)}
            min={0}
            max={100}
            className="flex-1"
          />
          <span className="text-gray-300 text-sm w-12 text-right">
            {Math.round((selectedObject.opacity || 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="p-4">
        <label className="block text-gray-400 text-xs mb-2">Layer</label>
        <div className="flex gap-2">
          <button
            onClick={onBringToFront}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors text-sm"
          >
            <ArrowUp size={14} />
            Bring to Front
          </button>
          <button
            onClick={onSendToBack}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors text-sm"
          >
            <ArrowDown size={14} />
            Send to Back
          </button>
        </div>
      </div>
    </div>
  );
}
