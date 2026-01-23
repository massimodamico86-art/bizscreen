/**
 * DataBoundWizardModal
 *
 * Wizard for creating data-bound slides (menus, price lists, schedules).
 * Creates text blocks with dataBinding properties that pull from data sources.
 *
 * Steps:
 * 1. Select Data Source - Choose from existing data sources
 * 2. Configure Layout - Choose layout type and fields to display
 * 3. Preview & Create - Preview the slide and create it
 */

import { useState, useEffect } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Database,
  Table2,
  Grid3X3,
  List,
  LayoutGrid,
  Plus,
  AlertCircle,
} from 'lucide-react';

import { Button } from '../../design-system';
import { fetchDataSources, getDataSource, FIELD_DATA_TYPES } from '../../services/dataSourceService';
import { createSlide } from '../../services/sceneDesignService';
import { getBrandTheme } from '../../services/brandThemeService';

// Layout options
const LAYOUT_OPTIONS = [
  {
    key: 'list',
    title: 'List Layout',
    description: 'Vertical list with item name, description, and price',
    icon: List,
    itemsPerSlide: 6,
  },
  {
    key: 'grid',
    title: 'Grid Layout',
    description: '2-column grid for more compact display',
    icon: Grid3X3,
    itemsPerSlide: 8,
  },
  {
    key: 'featured',
    title: 'Featured Item',
    description: 'Large single item display with image placeholder',
    icon: LayoutGrid,
    itemsPerSlide: 1,
  },
];

// Field type icons mapping
const FIELD_TYPE_ICONS = {
  [FIELD_DATA_TYPES.TEXT]: 'Aa',
  [FIELD_DATA_TYPES.NUMBER]: '#',
  [FIELD_DATA_TYPES.CURRENCY]: '$',
  [FIELD_DATA_TYPES.BOOLEAN]: '✓',
  [FIELD_DATA_TYPES.DATE]: '📅',
};

export default function DataBoundWizardModal({
  isOpen,
  onClose,
  sceneId,
  onSlideCreated,
  onShowToast,
}) {
  const logger = useLogger('DataBoundWizardModal');
  // Wizard state
  const [step, setStep] = useState(1);
  const [dataSources, setDataSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourceDetails, setSourceDetails] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('list');
  const [selectedFields, setSelectedFields] = useState({
    title: null,
    subtitle: null,
    price: null,
  });
  const [brandTheme, setBrandTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Load data sources and brand theme on mount
  useEffect(() => {
    if (isOpen) {
      loadDataSources();
      getBrandTheme()
        .then(setBrandTheme)
        .catch(() => setBrandTheme(null));
    }
  }, [isOpen]);

  // Load source details when source is selected
  useEffect(() => {
    if (selectedSource) {
      loadSourceDetails(selectedSource);
    }
  }, [selectedSource]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSource(null);
      setSourceDetails(null);
      setSelectedLayout('list');
      setSelectedFields({ title: null, subtitle: null, price: null });
      setError(null);
    }
  }, [isOpen]);

  async function loadDataSources() {
    setIsLoading(true);
    setError(null);
    try {
      const sources = await fetchDataSources();
      setDataSources(sources);
    } catch (err) {
      logger.error('Error loading data sources', { error: err });
      setError('Failed to load data sources');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSourceDetails(sourceId) {
    try {
      const details = await getDataSource(sourceId);
      setSourceDetails(details);

      // Auto-select fields based on names
      if (details?.fields) {
        const newSelectedFields = { title: null, subtitle: null, price: null };

        details.fields.forEach(field => {
          const name = field.name.toLowerCase();
          if (!newSelectedFields.title && (name.includes('name') || name.includes('title') || name.includes('item'))) {
            newSelectedFields.title = field.id;
          } else if (!newSelectedFields.subtitle && (name.includes('description') || name.includes('desc') || name.includes('detail'))) {
            newSelectedFields.subtitle = field.id;
          } else if (!newSelectedFields.price && (name.includes('price') || name.includes('cost') || field.data_type === FIELD_DATA_TYPES.CURRENCY)) {
            newSelectedFields.price = field.id;
          }
        });

        setSelectedFields(newSelectedFields);
      }
    } catch (err) {
      logger.error('Error loading source details', { error: err });
    }
  }

  if (!isOpen) return null;

  // ===========================================
  // HANDLERS
  // ===========================================

  function handleSelectSource(sourceId) {
    setSelectedSource(sourceId);
  }

  function handleSelectLayout(layoutKey) {
    setSelectedLayout(layoutKey);
  }

  function handleFieldChange(role, fieldId) {
    setSelectedFields(prev => ({ ...prev, [role]: fieldId }));
  }

  function handleNext() {
    if (step === 1 && selectedSource) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  async function handleCreate() {
    if (!selectedSource || !sourceDetails || isCreating) return;

    setIsCreating(true);
    try {
      const layout = LAYOUT_OPTIONS.find(l => l.key === selectedLayout);
      const blueprint = generateBlueprint(sourceDetails, selectedFields, layout, brandTheme);

      const slide = await createSlide(sceneId, {
        title: `${sourceDetails.name} - ${layout.title}`,
        kind: 'data-bound',
        design_json: blueprint,
        duration_seconds: 15,
      });

      onShowToast?.(`Created data-bound slide from "${sourceDetails.name}"`, 'success');
      onSlideCreated?.(slide);
      onClose();
    } catch (err) {
      logger.error('Error creating data-bound slide', { error: err });
      onShowToast?.('Failed to create slide', 'error');
    } finally {
      setIsCreating(false);
    }
  }

  // ===========================================
  // BLUEPRINT GENERATION
  // ===========================================

  function generateBlueprint(source, fields, layout, theme) {
    const primaryColor = theme?.primary_color || '#3B82F6';
    const bgColor = theme?.background_color || '#0F172A';
    const textColor = theme?.text_color || '#FFFFFF';
    const secondaryText = '#94A3B8';

    const blueprint = {
      background: {
        type: 'solid',
        color: bgColor,
      },
      blocks: [],
    };

    // Add title block
    blueprint.blocks.push({
      id: 'title',
      type: 'text',
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.1,
      text: source.name,
      fontSize: 48,
      fontWeight: 'bold',
      color: textColor,
      align: 'center',
    });

    // Get field info for binding
    const titleField = source.fields?.find(f => f.id === fields.title);
    const subtitleField = source.fields?.find(f => f.id === fields.subtitle);
    const priceField = source.fields?.find(f => f.id === fields.price);

    // Generate item blocks based on layout
    const itemCount = Math.min(layout.itemsPerSlide, source.rows?.length || 3);

    if (layout.key === 'featured') {
      // Featured layout - single large item
      blueprint.blocks.push(
        {
          id: 'item-bg',
          type: 'shape',
          x: 0.1,
          y: 0.2,
          width: 0.8,
          height: 0.7,
          fill: `${primaryColor}15`,
          borderRadius: 16,
        },
        {
          id: 'item-name',
          type: 'text',
          x: 0.15,
          y: 0.35,
          width: 0.7,
          height: 0.15,
          text: titleField ? `{{${titleField.name}}}` : 'Item Name',
          fontSize: 64,
          fontWeight: 'bold',
          color: textColor,
          align: 'center',
          ...(titleField && {
            dataBinding: {
              sourceId: source.id,
              field: titleField.name,
              rowSelector: { mode: 'index', index: 0 },
            },
          }),
        },
        {
          id: 'item-desc',
          type: 'text',
          x: 0.15,
          y: 0.52,
          width: 0.7,
          height: 0.15,
          text: subtitleField ? `{{${subtitleField.name}}}` : 'Description text here',
          fontSize: 28,
          color: secondaryText,
          align: 'center',
          ...(subtitleField && {
            dataBinding: {
              sourceId: source.id,
              field: subtitleField.name,
              rowSelector: { mode: 'index', index: 0 },
            },
          }),
        },
        {
          id: 'item-price',
          type: 'text',
          x: 0.15,
          y: 0.72,
          width: 0.7,
          height: 0.12,
          text: priceField ? `{{${priceField.name}}}` : '$0.00',
          fontSize: 56,
          fontWeight: 'bold',
          color: primaryColor,
          align: 'center',
          ...(priceField && {
            dataBinding: {
              sourceId: source.id,
              field: priceField.name,
              rowSelector: { mode: 'index', index: 0 },
              format: { type: priceField.data_type },
            },
          }),
        }
      );
    } else if (layout.key === 'grid') {
      // Grid layout - 2 columns
      const cols = 2;
      const itemWidth = 0.42;
      const itemHeight = 0.18;
      const startY = 0.2;
      const gapX = 0.06;
      const gapY = 0.02;

      for (let i = 0; i < itemCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 0.05 + col * (itemWidth + gapX);
        const y = startY + row * (itemHeight + gapY);

        // Item background
        blueprint.blocks.push({
          id: `item-${i}-bg`,
          type: 'shape',
          x,
          y,
          width: itemWidth,
          height: itemHeight,
          fill: `${primaryColor}10`,
          borderRadius: 8,
        });

        // Item name
        blueprint.blocks.push({
          id: `item-${i}-name`,
          type: 'text',
          x: x + 0.02,
          y: y + 0.02,
          width: itemWidth - 0.04,
          height: 0.06,
          text: titleField ? `{{${titleField.name}}}` : `Item ${i + 1}`,
          fontSize: 24,
          fontWeight: 'bold',
          color: textColor,
          ...(titleField && {
            dataBinding: {
              sourceId: source.id,
              field: titleField.name,
              rowSelector: { mode: 'index', index: i },
            },
          }),
        });

        // Item price
        if (priceField) {
          blueprint.blocks.push({
            id: `item-${i}-price`,
            type: 'text',
            x: x + 0.02,
            y: y + 0.1,
            width: itemWidth - 0.04,
            height: 0.05,
            text: `{{${priceField.name}}}`,
            fontSize: 20,
            color: primaryColor,
            dataBinding: {
              sourceId: source.id,
              field: priceField.name,
              rowSelector: { mode: 'index', index: i },
              format: { type: priceField.data_type },
            },
          });
        }
      }
    } else {
      // List layout - vertical list
      const itemHeight = 0.11;
      const startY = 0.18;
      const gapY = 0.02;

      for (let i = 0; i < itemCount; i++) {
        const y = startY + i * (itemHeight + gapY);

        // Item background
        blueprint.blocks.push({
          id: `item-${i}-bg`,
          type: 'shape',
          x: 0.05,
          y,
          width: 0.9,
          height: itemHeight,
          fill: i % 2 === 0 ? `${primaryColor}08` : 'transparent',
          borderRadius: 8,
        });

        // Item name
        blueprint.blocks.push({
          id: `item-${i}-name`,
          type: 'text',
          x: 0.07,
          y: y + 0.015,
          width: 0.55,
          height: 0.05,
          text: titleField ? `{{${titleField.name}}}` : `Item ${i + 1}`,
          fontSize: 26,
          fontWeight: 'bold',
          color: textColor,
          ...(titleField && {
            dataBinding: {
              sourceId: source.id,
              field: titleField.name,
              rowSelector: { mode: 'index', index: i },
            },
          }),
        });

        // Item description
        if (subtitleField) {
          blueprint.blocks.push({
            id: `item-${i}-desc`,
            type: 'text',
            x: 0.07,
            y: y + 0.055,
            width: 0.55,
            height: 0.04,
            text: `{{${subtitleField.name}}}`,
            fontSize: 16,
            color: secondaryText,
            dataBinding: {
              sourceId: source.id,
              field: subtitleField.name,
              rowSelector: { mode: 'index', index: i },
            },
          });
        }

        // Item price
        if (priceField) {
          blueprint.blocks.push({
            id: `item-${i}-price`,
            type: 'text',
            x: 0.7,
            y: y + 0.025,
            width: 0.23,
            height: 0.06,
            text: `{{${priceField.name}}}`,
            fontSize: 24,
            fontWeight: 'bold',
            color: primaryColor,
            align: 'right',
            dataBinding: {
              sourceId: source.id,
              field: priceField.name,
              rowSelector: { mode: 'index', index: i },
              format: { type: priceField.data_type },
            },
          });
        }
      }
    }

    return blueprint;
  }

  // ===========================================
  // RENDER HELPERS
  // ===========================================

  function renderSourceCard(source) {
    const isSelected = selectedSource === source.id;
    const rowCount = source.row_count || 0;
    const fieldCount = source.field_count || 0;

    return (
      <button
        key={source.id}
        className={`
          w-full p-4 rounded-xl border text-left transition-all
          ${isSelected
            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
          }
        `}
        onClick={() => handleSelectSource(source.id)}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white">{source.name}</div>
            <div className="text-sm text-gray-400 mt-0.5">
              {fieldCount} fields • {rowCount} rows
            </div>
            {source.description && (
              <div className="text-xs text-gray-500 mt-1 truncate">{source.description}</div>
            )}
          </div>
          {isSelected && (
            <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </button>
    );
  }

  function renderLayoutCard(layout) {
    const isSelected = selectedLayout === layout.key;
    const IconComponent = layout.icon;

    return (
      <button
        key={layout.key}
        className={`
          p-4 rounded-xl border text-left transition-all
          ${isSelected
            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
          }
        `}
        onClick={() => handleSelectLayout(layout.key)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-white">{layout.title}</div>
            <div className="text-sm text-gray-400">{layout.description}</div>
          </div>
          {isSelected && <Check className="w-5 h-5 text-blue-500" />}
        </div>
      </button>
    );
  }

  function renderFieldSelector(role, label) {
    const selectedFieldId = selectedFields[role];

    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <select
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={selectedFieldId || ''}
          onChange={(e) => handleFieldChange(role, e.target.value || null)}
        >
          <option value="">-- None --</option>
          {sourceDetails?.fields?.map(field => (
            <option key={field.id} value={field.id}>
              {FIELD_TYPE_ICONS[field.data_type] || '?'} {field.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function renderPreview() {
    if (!sourceDetails) return null;

    const layout = LAYOUT_OPTIONS.find(l => l.key === selectedLayout);
    const titleField = sourceDetails.fields?.find(f => f.id === selectedFields.title);
    const subtitleField = sourceDetails.fields?.find(f => f.id === selectedFields.subtitle);
    const priceField = sourceDetails.fields?.find(f => f.id === selectedFields.price);

    // Get sample data from first few rows
    const sampleRows = sourceDetails.rows?.slice(0, layout?.itemsPerSlide || 3) || [];

    return (
      <div
        className="w-full aspect-video rounded-lg overflow-hidden relative"
        style={{ backgroundColor: brandTheme?.background_color || '#0F172A' }}
      >
        {/* Title */}
        <div
          className="absolute text-center font-bold"
          style={{
            left: '5%',
            top: '5%',
            width: '90%',
            color: brandTheme?.text_color || '#fff',
            fontSize: '12px',
          }}
        >
          {sourceDetails.name}
        </div>

        {/* Items preview */}
        {selectedLayout === 'featured' && sampleRows[0] && (
          <div className="absolute left-[15%] top-[25%] w-[70%] text-center">
            <div
              className="font-bold"
              style={{ color: brandTheme?.text_color || '#fff', fontSize: '16px' }}
            >
              {titleField ? sampleRows[0].values?.[titleField.name] : 'Item Name'}
            </div>
            <div className="text-gray-400 mt-1" style={{ fontSize: '8px' }}>
              {subtitleField ? sampleRows[0].values?.[subtitleField.name] : 'Description'}
            </div>
            <div
              className="font-bold mt-2"
              style={{ color: brandTheme?.primary_color || '#3B82F6', fontSize: '14px' }}
            >
              {priceField ? `$${sampleRows[0].values?.[priceField.name] || '0.00'}` : '$0.00'}
            </div>
          </div>
        )}

        {selectedLayout === 'list' && (
          <div className="absolute left-[5%] top-[18%] w-[90%] space-y-1">
            {sampleRows.slice(0, 4).map((row, i) => (
              <div
                key={i}
                className="flex justify-between items-center px-2 py-1 rounded"
                style={{
                  backgroundColor: i % 2 === 0 ? `${brandTheme?.primary_color || '#3B82F6'}10` : 'transparent',
                }}
              >
                <div>
                  <div style={{ color: brandTheme?.text_color || '#fff', fontSize: '7px', fontWeight: 'bold' }}>
                    {titleField ? row.values?.[titleField.name] : `Item ${i + 1}`}
                  </div>
                  {subtitleField && (
                    <div style={{ color: '#94A3B8', fontSize: '5px' }}>
                      {row.values?.[subtitleField.name]}
                    </div>
                  )}
                </div>
                {priceField && (
                  <div style={{ color: brandTheme?.primary_color || '#3B82F6', fontSize: '6px', fontWeight: 'bold' }}>
                    ${row.values?.[priceField.name] || '0.00'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedLayout === 'grid' && (
          <div className="absolute left-[5%] top-[20%] w-[90%] grid grid-cols-2 gap-1">
            {sampleRows.slice(0, 4).map((row, i) => (
              <div
                key={i}
                className="p-1 rounded"
                style={{ backgroundColor: `${brandTheme?.primary_color || '#3B82F6'}10` }}
              >
                <div style={{ color: brandTheme?.text_color || '#fff', fontSize: '6px', fontWeight: 'bold' }}>
                  {titleField ? row.values?.[titleField.name] : `Item ${i + 1}`}
                </div>
                {priceField && (
                  <div style={{ color: brandTheme?.primary_color || '#3B82F6', fontSize: '5px' }}>
                    ${row.values?.[priceField.name] || '0.00'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Data binding indicator */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded text-purple-300" style={{ fontSize: '5px' }}>
          <Database className="w-2 h-2" />
          Data-bound
        </div>
      </div>
    );
  }

  // ===========================================
  // STEP CONTENT
  // ===========================================

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Select Data Source</h3>
            <p className="text-sm text-gray-400">
              Choose a data source to bind to your slide
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : dataSources.length === 0 ? (
          <div className="text-center py-8">
            <Table2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No data sources found</p>
            <p className="text-sm text-gray-500">
              Create a data source first in Settings → Data Sources
            </p>
          </div>
        ) : (
          <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-2">
            {dataSources.map(renderSourceCard)}
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Configure Layout</h3>
          <p className="text-sm text-gray-400 mt-1">
            Choose how to display your data
          </p>
        </div>

        {/* Layout selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Layout Style</label>
          <div className="grid gap-3">
            {LAYOUT_OPTIONS.map(renderLayoutCard)}
          </div>
        </div>

        {/* Field mapping */}
        <div className="pt-4 border-t border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-3">Field Mapping</label>
          <div className="grid gap-4">
            {renderFieldSelector('title', 'Item Name Field')}
            {selectedLayout !== 'grid' && renderFieldSelector('subtitle', 'Description Field')}
            {renderFieldSelector('price', 'Price Field')}
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const layout = LAYOUT_OPTIONS.find(l => l.key === selectedLayout);

    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Preview & Create</h3>
          <p className="text-sm text-gray-400 mt-1">
            Review your data-bound slide
          </p>
        </div>

        {/* Preview */}
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-3">Preview (with sample data)</div>
          {renderPreview()}
        </div>

        {/* Summary */}
        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Data Source</span>
            <span className="text-sm text-white font-medium">{sourceDetails?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Layout</span>
            <span className="text-sm text-white">{layout?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Items per slide</span>
            <span className="text-sm text-white">{layout?.itemsPerSlide}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Total rows in source</span>
            <span className="text-sm text-white">{sourceDetails?.rows?.length || 0}</span>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-purple-300">
              This slide will automatically update when you change your data source.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================
  // MAIN RENDER
  // ===========================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">Data-Bound Slide</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? 'bg-blue-500' : s < step ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isCreating}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>

            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={step === 1 && !selectedSource}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !selectedFields.title}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Create Slide
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
