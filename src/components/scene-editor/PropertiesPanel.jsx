/**
 * PropertiesPanel
 *
 * Right panel for editing block properties.
 * Shows different controls based on block type.
 */

import { useState, useEffect } from 'react';
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
  Play,
  Sparkles,
  CloudSun,
  QrCode,
  Calendar,
  MapPin,
  Link,
  Grid3X3,
  Database,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '../../design-system';
import {
  ANIMATION_TYPES,
  ANIMATION_DIRECTIONS,
  TRANSITION_TYPES,
} from '../../services/sceneDesignService';
import { fetchDataSources, getDataSource, FIELD_DATA_TYPES } from '../../services/dataSourceService';
import { getBindingDisplayText } from '../../services/dataBindingResolver';

// Color presets
const COLOR_PRESETS = [
  '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569', '#1e293b', '#0f172a',
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export default function PropertiesPanel({
  block,
  design,
  onBlockUpdate,
  onDesignUpdate,
  smartGuidesEnabled = true,
  onSmartGuidesChange,
}) {
  if (!block) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-medium text-gray-300">Properties</h3>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="p-4">
            <p className="text-sm text-gray-500 text-center mb-4">
              Select a block to edit its properties
            </p>
          </div>

          {/* Slide transition settings (available without block selected) */}
          <SlideTransitionControls design={design} onDesignUpdate={onDesignUpdate} />

          {/* Editor settings */}
          <EditorSettings
            smartGuidesEnabled={smartGuidesEnabled}
            onSmartGuidesChange={onSmartGuidesChange}
          />
        </div>

        {/* Background settings */}
        <BackgroundSettings design={design} onDesignUpdate={onDesignUpdate} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BlockTypeIcon type={block.type} />
          <h3 className="font-medium text-gray-300 capitalize">{block.type}</h3>
        </div>
      </div>

      {/* Block-specific controls */}
      <div className="flex-1 overflow-y-auto">
        {block.type === 'text' && (
          <TextControls block={block} onUpdate={onBlockUpdate} />
        )}
        {block.type === 'image' && (
          <ImageControls block={block} onUpdate={onBlockUpdate} />
        )}
        {block.type === 'shape' && (
          <ShapeControls block={block} onUpdate={onBlockUpdate} />
        )}
        {block.type === 'widget' && (
          <WidgetControls block={block} onUpdate={onBlockUpdate} />
        )}

        {/* Common controls */}
        <PositionControls block={block} onUpdate={onBlockUpdate} />
        <LayerControls block={block} onUpdate={onBlockUpdate} />
        <AnimationControls block={block} onUpdate={onBlockUpdate} />
      </div>

      {/* Slide transition settings */}
      <SlideTransitionControls design={design} onDesignUpdate={onDesignUpdate} />

      {/* Editor settings */}
      <EditorSettings
        smartGuidesEnabled={smartGuidesEnabled}
        onSmartGuidesChange={onSmartGuidesChange}
      />

      {/* Background settings */}
      <BackgroundSettings design={design} onDesignUpdate={onDesignUpdate} />
    </div>
  );
}

function BlockTypeIcon({ type }) {
  const icons = {
    text: Type,
    image: Image,
    shape: Square,
    widget: Clock,
  };
  const Icon = icons[type] || Square;
  return <Icon className="w-4 h-4 text-gray-400" />;
}

// ===========================================
// TEXT CONTROLS
// ===========================================

function TextControls({ block, onUpdate }) {
  const { props, dataBinding } = block;
  const hasBinding = dataBinding?.sourceId && dataBinding?.field;

  function handleTextChange(e) {
    onUpdate({ props: { ...props, text: e.target.value } });
  }

  function handleFontSizeChange(e) {
    onUpdate({ props: { ...props, fontSize: parseInt(e.target.value) || 16 } });
  }

  function handleAlignChange(align) {
    onUpdate({ props: { ...props, align } });
  }

  function handleBoldToggle() {
    const newWeight = props.fontWeight === '700' || props.fontWeight === 'bold' ? '400' : '700';
    onUpdate({ props: { ...props, fontWeight: newWeight } });
  }

  function handleColorChange(color) {
    onUpdate({ props: { ...props, color } });
  }

  function handleBindingChange(binding) {
    onUpdate({ dataBinding: binding });
  }

  const isBold = props.fontWeight === '700' || props.fontWeight === 'bold';

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      {/* Data Binding Section */}
      <DataBindingSection
        binding={dataBinding}
        onChange={handleBindingChange}
      />

      {/* Text input - disabled when data-bound */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">
          {hasBinding ? 'Text (from data source)' : 'Text'}
        </label>
        <textarea
          value={hasBinding ? `{{${getBindingDisplayText(dataBinding)}}}` : props.text || ''}
          onChange={handleTextChange}
          disabled={hasBinding}
          className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none ${
            hasBinding ? 'text-blue-400 italic cursor-not-allowed' : 'text-white'
          }`}
          rows={3}
        />
        {hasBinding && (
          <p className="text-xs text-gray-500 mt-1">
            Content bound to data source. Remove binding to edit manually.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1.5">Size</label>
          <input
            type="number"
            value={props.fontSize || 16}
            onChange={handleFontSizeChange}
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
            onClick={handleBoldToggle}
            className={isBold ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAlignChange('left')}
            className={props.align === 'left' ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAlignChange('center')}
            className={props.align === 'center' || !props.align ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAlignChange('right')}
            className={props.align === 'right' ? 'bg-gray-700 text-white' : 'text-gray-400'}
          >
            <AlignRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ColorPicker
        label="Color"
        value={props.color || '#ffffff'}
        onChange={handleColorChange}
      />
    </div>
  );
}

// ===========================================
// DATA BINDING SECTION
// ===========================================

function DataBindingSection({ binding, onChange }) {
  const [dataSources, setDataSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasBinding = binding?.sourceId && binding?.field;

  // Load data sources on mount
  useEffect(() => {
    async function loadDataSources() {
      try {
        const sources = await fetchDataSources();
        setDataSources(sources || []);
      } catch (error) {
        console.error('Failed to load data sources:', error);
      }
    }
    loadDataSources();
  }, []);

  // Load selected data source details when binding changes
  useEffect(() => {
    async function loadSelectedSource() {
      if (binding?.sourceId) {
        setLoading(true);
        try {
          const source = await getDataSource(binding.sourceId);
          setSelectedSource(source);
        } catch (error) {
          console.error('Failed to load data source:', error);
          setSelectedSource(null);
        }
        setLoading(false);
      } else {
        setSelectedSource(null);
      }
    }
    loadSelectedSource();
  }, [binding?.sourceId]);

  function handleSourceChange(sourceId) {
    if (!sourceId) {
      onChange(null);
      setSelectedSource(null);
      return;
    }

    // Create new binding with selected source
    onChange({
      sourceId,
      field: null,
      rowSelector: { mode: 'index', index: 0 },
    });
  }

  function handleFieldChange(field) {
    onChange({
      ...binding,
      field,
    });
  }

  function handleRowModeChange(mode) {
    const newSelector = { mode };
    if (mode === 'index') {
      newSelector.index = 0;
    }
    onChange({
      ...binding,
      rowSelector: newSelector,
    });
  }

  function handleRowIndexChange(index) {
    onChange({
      ...binding,
      rowSelector: { mode: 'index', index: parseInt(index) || 0 },
    });
  }

  function handleClearBinding() {
    onChange(null);
    setSelectedSource(null);
  }

  // No data sources available
  if (dataSources.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Database className="w-4 h-4" />
          <span>No data sources available</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Create data sources in the Data Sources page to enable data binding.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Data Binding</span>
          {hasBinding && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
              Active
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Data Source Selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Data Source</label>
            <select
              value={binding?.sourceId || ''}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
            >
              <option value="">Select a data source...</option>
              {dataSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.row_count || 0} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Field Selection (only if source selected) */}
          {binding?.sourceId && selectedSource && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Field</label>
                <select
                  value={binding?.field || ''}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                  disabled={loading}
                >
                  <option value="">Select a field...</option>
                  {(selectedSource.fields || []).map((field) => (
                    <option key={field.id || field.name} value={field.name}>
                      {field.label || field.name} ({field.dataType || 'text'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row Selector */}
              {binding?.field && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Row Selection</label>
                  <div className="flex gap-1 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRowModeChange('index')}
                      className={`flex-1 text-xs ${binding?.rowSelector?.mode === 'index' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    >
                      By Index
                    </Button>
                  </div>

                  {binding?.rowSelector?.mode === 'index' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Row #</span>
                      <input
                        type="number"
                        min={0}
                        max={(selectedSource.rows?.length || 1) - 1}
                        value={binding?.rowSelector?.index || 0}
                        onChange={(e) => handleRowIndexChange(e.target.value)}
                        className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                      <span className="text-xs text-gray-500">
                        of {selectedSource.rows?.length || 0}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {binding?.field && selectedSource.rows?.length > 0 && (
                <div className="bg-gray-900/50 rounded p-2">
                  <span className="text-xs text-gray-500">Preview: </span>
                  <span className="text-xs text-green-400">
                    {selectedSource.rows[binding?.rowSelector?.index || 0]?.values?.[binding.field] || '(empty)'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-xs text-gray-400 text-center py-2">
              Loading...
            </div>
          )}

          {/* Clear Binding Button */}
          {hasBinding && (
            <button
              onClick={handleClearBinding}
              className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            >
              <X className="w-3 h-3" />
              Remove Binding
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// IMAGE CONTROLS
// ===========================================

function ImageControls({ block, onUpdate }) {
  const { props } = block;

  function handleUrlChange(e) {
    onUpdate({ props: { ...props, url: e.target.value } });
  }

  function handleFitChange(fit) {
    onUpdate({ props: { ...props, fit } });
  }

  function handleBorderRadiusChange(e) {
    onUpdate({ props: { ...props, borderRadius: parseInt(e.target.value) || 0 } });
  }

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Image URL</label>
        <input
          type="url"
          value={props.url || ''}
          onChange={handleUrlChange}
          placeholder="https://..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Fit</label>
        <div className="flex gap-1">
          {['cover', 'contain', 'fill'].map(fit => (
            <Button
              key={fit}
              variant="ghost"
              size="sm"
              onClick={() => handleFitChange(fit)}
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
          onChange={handleBorderRadiusChange}
          min={0}
          max={50}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{props.borderRadius || 0}px</div>
      </div>
    </div>
  );
}

// ===========================================
// SHAPE CONTROLS
// ===========================================

function ShapeControls({ block, onUpdate }) {
  const { props } = block;

  function handleFillChange(color) {
    onUpdate({ props: { ...props, fill: color } });
  }

  function handleOpacityChange(e) {
    onUpdate({ props: { ...props, opacity: parseFloat(e.target.value) } });
  }

  function handleBorderRadiusChange(e) {
    onUpdate({ props: { ...props, borderRadius: parseInt(e.target.value) || 0 } });
  }

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      <ColorPicker
        label="Fill Color"
        value={props.fill || '#3b82f6'}
        onChange={handleFillChange}
      />

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Opacity</label>
        <input
          type="range"
          value={props.opacity ?? 1}
          onChange={handleOpacityChange}
          min={0}
          max={1}
          step={0.1}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{Math.round((props.opacity ?? 1) * 100)}%</div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Corner Radius</label>
        <input
          type="range"
          value={props.borderRadius || 0}
          onChange={handleBorderRadiusChange}
          min={0}
          max={100}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-right">{props.borderRadius || 0}px</div>
      </div>
    </div>
  );
}

// ===========================================
// WIDGET CONTROLS
// ===========================================

function WidgetControls({ block, onUpdate }) {
  const widgetTypes = [
    { key: 'clock', icon: Clock, label: 'Clock' },
    { key: 'date', icon: Calendar, label: 'Date' },
    { key: 'weather', icon: CloudSun, label: 'Weather' },
    { key: 'qr', icon: QrCode, label: 'QR Code' },
  ];

  const props = block.props || {};
  const widgetType = block.widgetType || 'clock';

  function handleTypeChange(newType) {
    onUpdate({ widgetType: newType });
  }

  function handlePropChange(key, value) {
    onUpdate({ props: { ...props, [key]: value } });
  }

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      {/* Widget Type Selection */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Widget Type</label>
        <div className="grid grid-cols-2 gap-1">
          {widgetTypes.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => handleTypeChange(key)}
              className={`flex items-center gap-1 ${widgetType === key ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clock / Date / Weather Size Controls */}
      {(widgetType === 'clock' || widgetType === 'date' || widgetType === 'weather') && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Size</label>
            <div className="grid grid-cols-4 gap-1">
              {['small', 'medium', 'large', 'custom'].map(size => (
                <Button
                  key={size}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePropChange('size', size)}
                  className={`capitalize text-xs ${props.size === size ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                  {size === 'custom' ? 'Custom' : size.charAt(0).toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          {/* Custom Font Size Input */}
          {props.size === 'custom' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Font Size (px)</label>
              <input
                type="number"
                min={8}
                max={200}
                value={props.customFontSize || 32}
                onChange={(e) => handlePropChange('customFontSize', parseInt(e.target.value) || 32)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          )}
        </>
      )}

      {/* Weather Controls */}
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
              onChange={(e) => handlePropChange('location', e.target.value)}
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
                onClick={() => handlePropChange('units', 'imperial')}
                className={`flex-1 ${props.units !== 'metric' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                °F
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePropChange('units', 'metric')}
                className={`flex-1 ${props.units === 'metric' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                °C
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Style</label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePropChange('style', 'minimal')}
                className={`flex-1 ${props.style !== 'card' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Minimal
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePropChange('style', 'card')}
                className={`flex-1 ${props.style === 'card' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Card
              </Button>
            </div>
          </div>
        </>
      )}

      {/* QR Code Controls */}
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
              onChange={(e) => handlePropChange('url', e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Label</label>
            <input
              type="text"
              value={props.label || ''}
              onChange={(e) => handlePropChange('label', e.target.value)}
              placeholder="Scan me!"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Corner Radius</label>
            <input
              type="range"
              value={props.cornerRadius || 8}
              onChange={(e) => handlePropChange('cornerRadius', parseInt(e.target.value))}
              min={0}
              max={24}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-right">{props.cornerRadius || 8}px</div>
          </div>
        </>
      )}

      {/* Text Color for all widgets */}
      <ColorPicker
        label="Text Color"
        value={props.textColor || '#ffffff'}
        onChange={(color) => handlePropChange('textColor', color)}
      />
    </div>
  );
}

// ===========================================
// POSITION CONTROLS
// ===========================================

function PositionControls({ block, onUpdate }) {
  return (
    <div className="p-4 border-b border-gray-800">
      <label className="block text-xs text-gray-500 mb-2">Position & Size</label>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">X</span>
          <input
            type="number"
            value={Math.round(block.x * 100)}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) / 100 })}
            min={0}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">Y</span>
          <input
            type="number"
            value={Math.round(block.y * 100)}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) / 100 })}
            min={0}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">W</span>
          <input
            type="number"
            value={Math.round(block.width * 100)}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value) / 100 })}
            min={5}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <span className="text-gray-500">H</span>
          <input
            type="number"
            value={Math.round(block.height * 100)}
            onChange={(e) => onUpdate({ height: parseInt(e.target.value) / 100 })}
            min={5}
            max={100}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// LAYER CONTROLS
// ===========================================

function LayerControls({ block, onUpdate }) {
  return (
    <div className="p-4 border-b border-gray-800">
      <label className="block text-xs text-gray-500 mb-1.5">Layer (Z-Index)</label>
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-500" />
        <input
          type="number"
          value={block.layer || 1}
          onChange={(e) => onUpdate({ layer: parseInt(e.target.value) || 1 })}
          min={0}
          max={100}
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
        />
      </div>
    </div>
  );
}

// ===========================================
// ANIMATION CONTROLS
// ===========================================

function AnimationControls({ block, onUpdate }) {
  const animation = block.animation || { type: 'none' };

  function handleTypeChange(type) {
    if (type === 'none') {
      // Remove animation
      const { animation: _, ...rest } = block;
      onUpdate(rest);
    } else {
      onUpdate({
        animation: {
          type,
          direction: type === 'slide' ? (animation.direction || 'up') : undefined,
          delayMs: animation.delayMs || 0,
          durationMs: animation.durationMs || 600,
        },
      });
    }
  }

  function handleDirectionChange(direction) {
    onUpdate({
      animation: { ...animation, direction },
    });
  }

  function handleDelayChange(e) {
    onUpdate({
      animation: { ...animation, delayMs: parseInt(e.target.value) || 0 },
    });
  }

  function handleDurationChange(e) {
    onUpdate({
      animation: { ...animation, durationMs: parseInt(e.target.value) || 600 },
    });
  }

  return (
    <div className="p-4 border-b border-gray-800 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">Animation</span>
      </div>

      {/* Animation Type */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Effect</label>
        <select
          value={animation.type || 'none'}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          {ANIMATION_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Direction (only for slide) */}
      {animation.type === 'slide' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Direction</label>
          <div className="grid grid-cols-2 gap-1">
            {ANIMATION_DIRECTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => handleDirectionChange(value)}
                className={animation.direction === value ? 'bg-gray-700 text-white' : 'text-gray-400'}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Timing controls (only if animation is active) */}
      {animation.type !== 'none' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Delay: {animation.delayMs || 0}ms
            </label>
            <input
              type="range"
              value={animation.delayMs || 0}
              onChange={handleDelayChange}
              min={0}
              max={2000}
              step={100}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Duration: {animation.durationMs || 600}ms
            </label>
            <input
              type="range"
              value={animation.durationMs || 600}
              onChange={handleDurationChange}
              min={200}
              max={2000}
              step={100}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// SLIDE TRANSITION CONTROLS
// ===========================================

function SlideTransitionControls({ design, onDesignUpdate }) {
  const transition = design.transition || { type: 'none' };

  function handleTypeChange(type) {
    if (type === 'none') {
      const { transition: _, ...rest } = design;
      onDesignUpdate(rest);
    } else {
      onDesignUpdate({
        ...design,
        transition: {
          type,
          durationMs: transition.durationMs || 700,
        },
      });
    }
  }

  function handleDurationChange(e) {
    onDesignUpdate({
      ...design,
      transition: { ...transition, durationMs: parseInt(e.target.value) || 700 },
    });
  }

  return (
    <div className="p-4 border-b border-gray-800 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">Slide Transition</span>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Effect</label>
        <select
          value={transition.type || 'none'}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          {TRANSITION_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {transition.type !== 'none' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Duration: {transition.durationMs || 700}ms
          </label>
          <input
            type="range"
            value={transition.durationMs || 700}
            onChange={handleDurationChange}
            min={300}
            max={1500}
            step={100}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

// ===========================================
// EDITOR SETTINGS
// ===========================================

function EditorSettings({ smartGuidesEnabled, onSmartGuidesChange }) {
  return (
    <div className="p-4 border-b border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Grid3X3 className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Editor Settings</span>
      </div>
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-gray-400">Smart Guides</span>
        <button
          onClick={() => onSmartGuidesChange?.(!smartGuidesEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            smartGuidesEnabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              smartGuidesEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
      <p className="text-xs text-gray-500 mt-1.5">
        Show alignment guides when moving blocks
      </p>
    </div>
  );
}

// ===========================================
// BACKGROUND SETTINGS
// ===========================================

function BackgroundSettings({ design, onDesignUpdate }) {
  const { background } = design;

  function handleColorChange(color) {
    onDesignUpdate({
      ...design,
      background: { type: 'solid', color },
    });
  }

  return (
    <div className="p-4 border-t border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Background</span>
      </div>
      <ColorPicker
        label=""
        value={background?.color || '#111827'}
        onChange={handleColorChange}
        compact
      />
    </div>
  );
}

// ===========================================
// COLOR PICKER
// ===========================================

function ColorPicker({ label, value, onChange, compact }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-1.5">{label}</label>}
      <div className="relative">
        <button
          className="flex items-center gap-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-left"
          onClick={() => setShowPicker(!showPicker)}
        >
          <div
            className="w-5 h-5 rounded border border-gray-600"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-gray-300">{value}</span>
        </button>

        {showPicker && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl">
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border ${value === color ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-600'}`}
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
              onChange={(e) => {
                onChange(e.target.value);
              }}
              className="w-full h-8 mt-2 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
