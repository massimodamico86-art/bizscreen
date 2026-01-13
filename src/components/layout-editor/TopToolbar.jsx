/**
 * TopToolbar
 *
 * Yodeck-style top toolbar with:
 * - Layout name and save status
 * - Orientation dropdown (16:9, 4:3, custom)
 * - Background color picker
 * - Layers panel toggle
 * - Zoom controls
 * - Undo/Redo
 * - Preview and Save buttons (coral/orange theme)
 *
 * Matches Yodeck's visual design with light background and coral accents.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Palette,
  Layers,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Eye,
  Save,
  ChevronDown,
  Monitor,
  Smartphone,
  Square,
  Plus,
  X,
  ListVideo,
  Calendar,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '../../design-system';
import { ZOOM_LEVELS } from './types';
import { YODECK_COLORS, YODECK_ORIENTATIONS } from '../../config/yodeckTheme';

// Color presets for background
const BG_COLOR_PRESETS = [
  '#000000', '#111827', '#1a1a2e', '#1e293b', '#0f172a',
  '#1e3a5f', '#3b0764', '#4a044e', '#450a0a', '#14532d',
  '#ffffff', '#f8fafc', '#e2e8f0', '#3b82f6', '#8b5cf6',
];

export default function TopToolbar({
  layoutName = 'Untitled Layout',
  onNameChange,
  background,
  onBackgroundChange,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onSave,
  isSaving,
  hasUnsavedChanges,
  onBack,
  showLayersPanel,
  onToggleLayersPanel,
  orientation = '16:9',
  canvasSize = { width: 1920, height: 1080 },
  onOrientationChange,
  onCanvasSizeChange,
  onNavigate, // For "What's next?" navigation
  justSaved = false, // Show "What's next?" after save
}) {
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showOrientationMenu, setShowOrientationMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(layoutName);
  const [showCustomRatio, setShowCustomRatio] = useState(false);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [showNextSteps, setShowNextSteps] = useState(false);

  const bgPickerRef = useRef(null);
  const orientationMenuRef = useRef(null);
  const nextStepsRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (bgPickerRef.current && !bgPickerRef.current.contains(event.target)) {
        setShowBgPicker(false);
      }
      if (orientationMenuRef.current && !orientationMenuRef.current.contains(event.target)) {
        setShowOrientationMenu(false);
      }
      if (nextStepsRef.current && !nextStepsRef.current.contains(event.target)) {
        setShowNextSteps(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentZoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const canZoomIn = currentZoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = currentZoomIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex - 1]);
    }
  };

  const handleNameSubmit = () => {
    onNameChange?.(tempName);
    setEditingName(false);
  };

  const handleBgColorChange = (color) => {
    onBackgroundChange({ type: 'solid', color });
    setShowBgPicker(false);
  };

  const handleOrientationSelect = (preset) => {
    if (preset.isCustom) {
      setShowCustomRatio(true);
      return;
    }
    if (preset.isSeparator) return;

    onOrientationChange?.(preset.id);
    onCanvasSizeChange?.({ width: preset.width, height: preset.height });
    setShowOrientationMenu(false);
  };

  const handleCustomRatioSubmit = () => {
    onOrientationChange?.('custom');
    onCanvasSizeChange?.({ width: customWidth, height: customHeight });
    setShowCustomRatio(false);
    setShowOrientationMenu(false);
  };

  // Get current orientation label
  const currentOrientation = YODECK_ORIENTATIONS.find((o) => o.id === orientation);
  const orientationLabel = currentOrientation?.label || `${canvasSize.width} x ${canvasSize.height}`;

  // Determine orientation icon
  const isLandscape = canvasSize.width > canvasSize.height;
  const isPortrait = canvasSize.height > canvasSize.width;
  const OrientationIcon = isPortrait ? Smartphone : isLandscape ? Monitor : Square;

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      {/* Left section: Back button and layout name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-[#f26f21] hover:bg-[#fff5f0] rounded-lg transition-all duration-200 group"
          title="Back to layouts"
        >
          <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </button>

        {editingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setTempName(layoutName);
              setEditingName(true);
            }}
            className="text-gray-900 font-semibold hover:text-[#f26f21] transition-colors"
          >
            {layoutName}
            {hasUnsavedChanges && <span className="text-amber-500 ml-1">*</span>}
          </button>
        )}
      </div>

      {/* Center section: Tools */}
      <div className="flex items-center gap-1">
        {/* Orientation dropdown */}
        <div className="relative" ref={orientationMenuRef}>
          <button
            onClick={() => setShowOrientationMenu(!showOrientationMenu)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            title="Canvas orientation"
          >
            <OrientationIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{orientationLabel}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showOrientationMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-56">
              {showCustomRatio ? (
                <div className="p-3 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Custom Ratio</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
                      placeholder="Width"
                    />
                    <span className="text-gray-400">x</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
                      placeholder="Height"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCustomRatio(false)}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCustomRatioSubmit}
                      className="flex-1 px-3 py-1.5 text-sm text-white rounded"
                      style={{ backgroundColor: YODECK_COLORS.primary }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {YODECK_ORIENTATIONS.map((preset, index) => {
                    if (preset.isSeparator) {
                      return (
                        <div key={preset.id} className="px-3 py-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                            {preset.label}
                          </span>
                        </div>
                      );
                    }
                    if (preset.isCustom) {
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleOrientationSelect(preset)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                          style={{ color: YODECK_COLORS.primary }}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="font-medium">{preset.label}</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleOrientationSelect(preset)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
                          orientation === preset.id ? 'bg-orange-50' : ''
                        }`}
                      >
                        {preset.width > preset.height ? (
                          <Monitor className="w-4 h-4 text-gray-400" />
                        ) : preset.height > preset.width ? (
                          <Smartphone className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        <span>{preset.label}</span>
                        {orientation === preset.id && (
                          <span
                            className="ml-auto w-2 h-2 rounded-full"
                            style={{ backgroundColor: YODECK_COLORS.primary }}
                          />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Background color */}
        <div className="relative" ref={bgPickerRef}>
          <button
            onClick={() => setShowBgPicker(!showBgPicker)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            title="Background color"
          >
            <span className="text-sm font-medium">BG Color</span>
            <div
              className="w-5 h-5 rounded border border-gray-300"
              style={{ backgroundColor: background?.color || '#1a1a2e' }}
            />
          </button>

          {showBgPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
              <div className="grid grid-cols-5 gap-2 mb-3">
                {BG_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleBgColorChange(color)}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      background?.color === color
                        ? 'border-[#f26f21] scale-110'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={background?.color || '#1a1a2e'}
                onChange={(e) => handleBgColorChange(e.target.value)}
                className="w-full h-8 cursor-pointer rounded border border-gray-200"
              />
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Layers panel toggle */}
        <button
          onClick={onToggleLayersPanel}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            showLayersPanel
              ? 'bg-[#f26f21] text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          title="Layers"
        >
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">Layers</span>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 text-gray-500 hover:text-[#f26f21] hover:bg-[#fff5f0] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          title="Undo"
        >
          <Undo className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 text-gray-500 hover:text-[#f26f21] hover:bg-[#fff5f0] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          title="Redo"
        >
          <Redo className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 border border-gray-200">
          <button
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            className="p-2 text-gray-500 hover:text-[#f26f21] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center font-medium select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            className="p-2 text-gray-500 hover:text-[#f26f21] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right section: Preview, Save, and What's Next */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#f26f21] hover:border-[#f26f21]/30 border border-gray-200 rounded-lg transition-all duration-200 text-sm font-medium group"
        >
          <Eye className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          Preview
        </button>

        {/* Save with What's Next dropdown */}
        <div className="relative" ref={nextStepsRef}>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-70 hover:shadow-lg hover:shadow-[#f26f21]/30 active:scale-[0.98]"
            style={{ backgroundColor: YODECK_COLORS.primary }}
          >
            {justSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save'}
          </button>

          {/* What's Next dropdown - only show if navigation is available */}
          {onNavigate && !isSaving && (
            <button
              onClick={() => setShowNextSteps(!showNextSteps)}
              className="ml-1 px-2 py-2 text-gray-600 hover:text-[#f26f21] hover:bg-[#fff5f0] rounded-lg transition-all duration-200 text-sm"
              title="What's next?"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {showNextSteps && onNavigate && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-64">
              <div className="px-4 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  What's next?
                </span>
              </div>
              <button
                onClick={() => {
                  setShowNextSteps(false);
                  onNavigate('playlists');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#fff5f0] transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ListVideo className="w-4 h-4 text-[#f26f21]" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add to a Playlist</div>
                  <div className="text-xs text-gray-500">Sequence this layout with other content</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setShowNextSteps(false);
                  onNavigate('schedules');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#fff5f0] transition-colors"
              >
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Schedule It</div>
                  <div className="text-xs text-gray-500">Set when this layout plays</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setShowNextSteps(false);
                  onNavigate('screens');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#fff5f0] transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Assign to Screen</div>
                  <div className="text-xs text-gray-500">Push this layout to a display</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
