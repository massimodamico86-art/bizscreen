/**
 * LayoutPropertiesPanel
 *
 * Right sidebar for editing element properties.
 * Adapts controls based on selected element type.
 */

import { useState } from 'react';
import {
  Type,
  Image,
  Square,
  Clock,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Layers,
  MapPin,
  Link,
  Calendar,
  CloudSun,
  QrCode,
  Edit3,
} from 'lucide-react';
import { Button } from '../../design-system';

// Color presets
const COLOR_PRESETS = [
  '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569', '#1e293b', '#0f172a',
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export default function LayoutPropertiesPanel({
  element,
  onElementUpdate,
  onEditImage,
}) {
  if (!element) {
    return (
      <div className="w-72 bg-gray-900 border-l border-gray-800 p-4">
        <h3 className="font-medium text-gray-300 mb-4">Properties</h3>
        <p className="text-sm text-gray-500 text-center py-8">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const handleUpdate = (updates) => {
    onElementUpdate(element.id, updates);
  };

  const handlePropsUpdate = (propUpdates) => {
    handleUpdate({
      props: { ...element.props, ...propUpdates },
    });
  };

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ElementTypeIcon type={element.type} />
          <h3 className="font-medium text-gray-300 capitalize">{element.type}</h3>
        </div>
      </div>

      {/* Element-specific controls */}
      <div className="flex-1 overflow-y-auto">
        {element.type === 'text' && (
          <TextControls element={element} onUpdate={handlePropsUpdate} />
        )}
        {element.type === 'image' && (
          <ImageControls element={element} onUpdate={handlePropsUpdate} onEditImage={onEditImage} />
        )}
        {element.type === 'widget' && (
          <WidgetControls element={element} onUpdate={handleUpdate} onPropsUpdate={handlePropsUpdate} />
        )}
        {element.type === 'shape' && (
          <ShapeControls element={element} onUpdate={handlePropsUpdate} />
        )}

        {/* Common controls */}
        <PositionControls element={element} onUpdate={handleUpdate} />
        <LayerControls element={element} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}

function ElementTypeIcon({ type }) {
  const icons = {
    text: Type,
    image: Image,
    shape: Square,
    widget: Clock,
  };
  const Icon = icons[type] || Square;
  return <Icon className="w-4 h-4 text-gray-400" />;
}

// Text controls
function TextControls({ element, onUpdate }) {
  const props = element.props || {};

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Text</label>
        <textarea
          value={props.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5">Size</label>
          <input
            type="number"
            value={props.fontSize || 32}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 16 })}
            min={8}
            max={200}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Style</label>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ fontWeight: props.fontWeight === 'bold' ? 'normal' : 'bold' })}
            className={props.fontWeight === 'bold' ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ align: 'left' })}
            className={props.align === 'left' ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ align: 'center' })}
            className={props.align === 'center' || !props.align ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ align: 'right' })}
            className={props.align === 'right' ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ColorPicker
        label="Color"
        value={props.color || '#ffffff'}
        onChange={(color) => onUpdate({ color })}
      />
    </div>
  );
}

// Image controls
function ImageControls({ element, onUpdate, onEditImage }) {
  const props = element.props || {};

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Image URL</label>
        <input
          type="url"
          value={props.url || ''}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>

      {props.url && onEditImage && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onEditImage(element)}
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit with Pixie
        </Button>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Fit</label>
        <div className="flex gap-1">
          {['cover', 'contain', 'fill'].map((fit) => (
            <Button
              key={fit}
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ fit })}
              className={props.fit === fit ? 'bg-gray-700 text-white' : 'text-gray-400'}
            >
              {fit}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Corner Radius</label>
        <input
          type="range"
          value={props.borderRadius || 0}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })}
          min={0}
          max={50}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{props.borderRadius || 0}px</div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Opacity</label>
        <input
          type="range"
          value={(props.opacity ?? 1) * 100}
          onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
          min={0}
          max={100}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{Math.round((props.opacity ?? 1) * 100)}%</div>
      </div>
    </div>
  );
}

// Widget controls
function WidgetControls({ element, onUpdate, onPropsUpdate }) {
  const { widgetType = 'clock', props = {} } = element;

  const widgetTypes = [
    { key: 'clock', icon: Clock, label: 'Clock' },
    { key: 'date', icon: Calendar, label: 'Date' },
    { key: 'weather', icon: CloudSun, label: 'Weather' },
    { key: 'qr', icon: QrCode, label: 'QR Code' },
  ];

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Widget Type</label>
        <div className="grid grid-cols-2 gap-1">
          {widgetTypes.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ widgetType: key })}
              className={`flex items-center gap-1 ${widgetType === key ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {widgetType === 'weather' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={props.location || 'Miami, FL'}
              onChange={(e) => onPropsUpdate({ location: e.target.value })}
              placeholder="City, State"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Units</label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPropsUpdate({ units: 'imperial' })}
                className={`flex-1 ${props.units !== 'metric' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                °F
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPropsUpdate({ units: 'metric' })}
                className={`flex-1 ${props.units === 'metric' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                °C
              </Button>
            </div>
          </div>
        </>
      )}

      {widgetType === 'qr' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              <Link className="w-3 h-3 inline mr-1" />
              URL
            </label>
            <input
              type="text"
              value={props.url || ''}
              onChange={(e) => onPropsUpdate({ url: e.target.value })}
              placeholder="https://example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Label</label>
            <input
              type="text"
              value={props.label || ''}
              onChange={(e) => onPropsUpdate({ label: e.target.value })}
              placeholder="Scan me!"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
        </>
      )}

      <ColorPicker
        label="Text Color"
        value={props.textColor || '#ffffff'}
        onChange={(color) => onPropsUpdate({ textColor: color })}
      />
    </div>
  );
}

// Shape controls
function ShapeControls({ element, onUpdate }) {
  const props = element.props || {};

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <ColorPicker
        label="Fill Color"
        value={props.fill || '#3b82f6'}
        onChange={(fill) => onUpdate({ fill })}
      />

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Opacity</label>
        <input
          type="range"
          value={(props.opacity ?? 1) * 100}
          onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
          min={0}
          max={100}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{Math.round((props.opacity ?? 1) * 100)}%</div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Corner Radius</label>
        <input
          type="range"
          value={props.borderRadius || 0}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })}
          min={0}
          max={100}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{props.borderRadius || 0}px</div>
      </div>
    </div>
  );
}

// Position controls
function PositionControls({ element, onUpdate }) {
  const pos = element.position || { x: 0, y: 0, width: 0.2, height: 0.2 };

  return (
    <div className="p-4 border-b border-gray-800">
      <label className="block text-xs text-gray-500 mb-2">Position & Size</label>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">X</span>
          <input
            type="number"
            value={Math.round(pos.x * 100)}
            onChange={(e) => onUpdate({ position: { ...pos, x: parseInt(e.target.value) / 100 } })}
            min={0}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">Y</span>
          <input
            type="number"
            value={Math.round(pos.y * 100)}
            onChange={(e) => onUpdate({ position: { ...pos, y: parseInt(e.target.value) / 100 } })}
            min={0}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">W</span>
          <input
            type="number"
            value={Math.round(pos.width * 100)}
            onChange={(e) => onUpdate({ position: { ...pos, width: parseInt(e.target.value) / 100 } })}
            min={5}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">H</span>
          <input
            type="number"
            value={Math.round(pos.height * 100)}
            onChange={(e) => onUpdate({ position: { ...pos, height: parseInt(e.target.value) / 100 } })}
            min={5}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
      </div>
    </div>
  );
}

// Layer controls
function LayerControls({ element, onUpdate }) {
  return (
    <div className="p-4 border-b border-gray-800">
      <label className="block text-xs text-gray-500 mb-1.5">Layer (Z-Index)</label>
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-500" />
        <input
          type="number"
          value={element.layer || 1}
          onChange={(e) => onUpdate({ layer: parseInt(e.target.value) || 1 })}
          min={0}
          max={100}
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
        />
      </div>
    </div>
  );
}

// Color picker component
function ColorPicker({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1.5">{label}</label>}
      <div className="relative">
        <button
          className="flex items-center gap-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-left"
          onClick={() => setShowPicker(!showPicker)}
        >
          <div className="w-5 h-5 rounded border border-gray-600" style={{ backgroundColor: value }} />
          <span className="text-sm text-gray-300">{value}</span>
        </button>

        {showPicker && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl">
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border ${
                    value === color ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onChange(color);
                    setShowPicker(false);
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 mt-2 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
