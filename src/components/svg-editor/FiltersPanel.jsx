/**
 * Filters Panel - OptiSigns Style
 *
 * Left panel for applying image filters.
 * Features:
 * - Grayscale
 * - Black & White
 * - Sepia / Vintage
 * - Invert
 * - Blur
 * - Brightness / Contrast
 * - Saturation
 */

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import * as fabric from 'fabric';

// Filter presets with preview thumbnails (using CSS filters for preview)
const FILTER_PRESETS = [
  { id: 'none', name: 'None', cssFilter: 'none' },
  { id: 'grayscale', name: 'Grayscale', cssFilter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', cssFilter: 'sepia(100%)' },
  { id: 'invert', name: 'Invert', cssFilter: 'invert(100%)' },
  { id: 'blur', name: 'Blur', cssFilter: 'blur(3px)' },
  { id: 'brightness', name: 'Bright', cssFilter: 'brightness(150%)' },
  { id: 'contrast', name: 'Contrast', cssFilter: 'contrast(150%)' },
  { id: 'saturate', name: 'Vivid', cssFilter: 'saturate(200%)' },
  { id: 'vintage', name: 'Vintage', cssFilter: 'sepia(50%) contrast(90%) brightness(90%)' },
  { id: 'cool', name: 'Cool', cssFilter: 'hue-rotate(180deg) saturate(80%)' },
  { id: 'warm', name: 'Warm', cssFilter: 'sepia(30%) saturate(120%)' },
  { id: 'dramatic', name: 'Dramatic', cssFilter: 'contrast(150%) saturate(80%)' },
];

export default function FiltersPanel({
  selectedObject,
  canvas,
  onClose,
  onUpdate,
}) {
  const [expandedSections, setExpandedSections] = useState({
    presets: true,
    adjustments: true,
  });

  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-white text-sm font-medium"
    >
      <div className="flex items-center gap-2">
        {expandedSections[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{title}</span>
      </div>
    </button>
  );

  // Apply Fabric.js filter to image
  const applyFilter = (filterId) => {
    if (!selectedObject || selectedObject.type !== 'image' || !canvas) return;

    // Clear existing filters
    selectedObject.filters = [];

    switch (filterId) {
      case 'none':
        // No filter
        break;
      case 'grayscale':
        selectedObject.filters.push(new fabric.filters.Grayscale());
        break;
      case 'sepia':
        selectedObject.filters.push(new fabric.filters.Sepia());
        break;
      case 'invert':
        selectedObject.filters.push(new fabric.filters.Invert());
        break;
      case 'blur':
        selectedObject.filters.push(new fabric.filters.Blur({ blur: 0.2 }));
        break;
      case 'brightness':
        selectedObject.filters.push(new fabric.filters.Brightness({ brightness: 0.3 }));
        break;
      case 'contrast':
        selectedObject.filters.push(new fabric.filters.Contrast({ contrast: 0.3 }));
        break;
      case 'saturate':
        selectedObject.filters.push(new fabric.filters.Saturation({ saturation: 0.5 }));
        break;
      case 'vintage':
        selectedObject.filters.push(new fabric.filters.Sepia());
        selectedObject.filters.push(new fabric.filters.Contrast({ contrast: -0.1 }));
        selectedObject.filters.push(new fabric.filters.Brightness({ brightness: -0.1 }));
        break;
      case 'cool':
        selectedObject.filters.push(new fabric.filters.HueRotation({ rotation: 0.5 }));
        selectedObject.filters.push(new fabric.filters.Saturation({ saturation: -0.2 }));
        break;
      case 'warm':
        selectedObject.filters.push(new fabric.filters.Sepia());
        selectedObject.filters.push(new fabric.filters.Saturation({ saturation: 0.2 }));
        break;
      case 'dramatic':
        selectedObject.filters.push(new fabric.filters.Contrast({ contrast: 0.4 }));
        selectedObject.filters.push(new fabric.filters.Saturation({ saturation: -0.2 }));
        break;
    }

    selectedObject.applyFilters();
    canvas.renderAll();
  };

  // Apply adjustment filters
  const applyAdjustments = (newAdjustments) => {
    if (!selectedObject || selectedObject.type !== 'image' || !canvas) return;

    setAdjustments(newAdjustments);

    // Clear and rebuild filters
    selectedObject.filters = [];

    if (newAdjustments.brightness !== 0) {
      selectedObject.filters.push(new fabric.filters.Brightness({
        brightness: newAdjustments.brightness / 100
      }));
    }

    if (newAdjustments.contrast !== 0) {
      selectedObject.filters.push(new fabric.filters.Contrast({
        contrast: newAdjustments.contrast / 100
      }));
    }

    if (newAdjustments.saturation !== 0) {
      selectedObject.filters.push(new fabric.filters.Saturation({
        saturation: newAdjustments.saturation / 100
      }));
    }

    if (newAdjustments.blur > 0) {
      selectedObject.filters.push(new fabric.filters.Blur({
        blur: newAdjustments.blur / 100
      }));
    }

    selectedObject.applyFilters();
    canvas.renderAll();
  };

  // Reset all filters
  const resetFilters = () => {
    if (!selectedObject || selectedObject.type !== 'image' || !canvas) return;

    selectedObject.filters = [];
    selectedObject.applyFilters();
    canvas.renderAll();

    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
    });
  };

  const isImage = selectedObject?.type === 'image';

  if (!selectedObject) return null;

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-white font-medium">Filters</span>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="p-1 text-gray-400 hover:text-white rounded"
            title="Reset all filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {!isImage ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Select an image to apply filters</p>
          </div>
        ) : (
          <>
            {/* Filter Presets */}
            <div className="border-b border-gray-700 pb-3">
              <SectionHeader title="Filter Presets" section="presets" />
              {expandedSections.presets && (
                <div className="mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {FILTER_PRESETS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => applyFilter(filter.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-600 hover:border-green-500 transition-colors group"
                      >
                        {/* Preview thumbnail */}
                        <div
                          className="w-14 h-14 rounded bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center"
                          style={{ filter: filter.cssFilter }}
                        >
                          <span className="text-white text-2xl">🖼</span>
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-white truncate w-full text-center">
                          {filter.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Manual Adjustments */}
            <div className="pb-3">
              <SectionHeader title="Adjustments" section="adjustments" />
              {expandedSections.adjustments && (
                <div className="mt-2 space-y-4">
                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Brightness</span>
                      <span className="text-xs text-white">{adjustments.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments.brightness}
                      onChange={(e) => applyAdjustments({
                        ...adjustments,
                        brightness: parseInt(e.target.value)
                      })}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Contrast</span>
                      <span className="text-xs text-white">{adjustments.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments.contrast}
                      onChange={(e) => applyAdjustments({
                        ...adjustments,
                        contrast: parseInt(e.target.value)
                      })}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Saturation</span>
                      <span className="text-xs text-white">{adjustments.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments.saturation}
                      onChange={(e) => applyAdjustments({
                        ...adjustments,
                        saturation: parseInt(e.target.value)
                      })}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>

                  {/* Blur */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Blur</span>
                      <span className="text-xs text-white">{adjustments.blur}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={adjustments.blur}
                      onChange={(e) => applyAdjustments({
                        ...adjustments,
                        blur: parseInt(e.target.value)
                      })}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reset Button */}
      {isImage && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={resetFilters}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
