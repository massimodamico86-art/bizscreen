/**
 * Position Panel - OptiSigns Style
 *
 * Left panel for positioning, layers, and history.
 * Features:
 * - Arrange tab: alignment, distribute, flip
 * - Layers tab: object list with reordering
 * - History tab: undo/redo actions
 */

import { useState } from 'react';
import {
  Type,
  Image,
  Square,
  Circle,
  Triangle,
  Minus,
} from 'lucide-react';

const TABS = [
  { id: 'arrange', label: 'Arrange' },
  { id: 'layers', label: 'Layers' },
  { id: 'history', label: 'History' },
];

// Helper to get icon for object type
const getObjectIcon = (type) => {
  switch (type) {
    case 'i-text':
    case 'text':
    case 'textbox':
      return Type;
    case 'image':
      return Image;
    case 'rect':
      return Square;
    case 'circle':
    case 'ellipse':
      return Circle;
    case 'triangle':
      return Triangle;
    case 'line':
      return Minus;
    default:
      return Square;
  }
};

export default function PositionPanel({
  selectedObject,
  objects = [],
  historyItems = [],
  currentHistoryIndex = 0,
  onAlign,
  onDistribute,
  onFlip,
  onSelectObject,
  onToggleVisibility,
  onToggleLock,
  onDeleteObject,
  onReorderObjects,
  onUndo,
  onRedo,
  onHistoryJump,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('arrange');

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-white font-medium">Position</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-green-500 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Arrange Tab */}
        {activeTab === 'arrange' && (
          <div className="p-4 space-y-4">
            {/* Align */}
            <div>
              <span className="text-xs text-gray-400 block mb-2">Align</span>
              <div className="grid grid-cols-6 gap-1">
                <button
                  onClick={() => onAlign?.('left')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Left"
                >
                  <AlignStartVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAlign?.('center-h')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Center Horizontally"
                >
                  <AlignCenterVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAlign?.('right')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Right"
                >
                  <AlignEndVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAlign?.('top')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Top"
                >
                  <AlignStartHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAlign?.('center-v')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Center Vertically"
                >
                  <AlignCenterHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAlign?.('bottom')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Align Bottom"
                >
                  <AlignEndHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Distribute */}
            <div>
              <span className="text-xs text-gray-400 block mb-2">Distribute</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onDistribute?.('horizontal')}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition-colors"
                >
                  Horizontal
                </button>
                <button
                  onClick={() => onDistribute?.('vertical')}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition-colors"
                >
                  Vertical
                </button>
              </div>
            </div>

            {/* Flip */}
            <div>
              <span className="text-xs text-gray-400 block mb-2">Flip</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onFlip?.('horizontal')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition-colors"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  Horizontal
                </button>
                <button
                  onClick={() => onFlip?.('vertical')}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-xs transition-colors"
                >
                  <FlipVertical className="w-4 h-4" />
                  Vertical
                </button>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <span className="text-xs text-gray-400 block mb-2">Spacing</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Horizontal</label>
                  <input
                    type="number"
                    defaultValue={0}
                    className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Vertical</label>
                  <input
                    type="number"
                    defaultValue={0}
                    className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-green-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            {selectedObject && (
              <div>
                <span className="text-xs text-gray-400 block mb-2">Size</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Width</label>
                    <input
                      type="number"
                      value={Math.round((selectedObject.width || 100) * (selectedObject.scaleX || 1))}
                      readOnly
                      className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Height</label>
                    <input
                      type="number"
                      value={Math.round((selectedObject.height || 100) * (selectedObject.scaleY || 1))}
                      readOnly
                      className="w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="p-2">
            {objects.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No objects on canvas
              </p>
            ) : (
              <div className="space-y-1">
                {objects.map((obj, index) => {
                  const IconComponent = getObjectIcon(obj.type);
                  const isSelected = selectedObject?.id === obj.id;
                  const isLocked = obj.lockMovementX && obj.lockMovementY;
                  const isVisible = obj.visible !== false;

                  return (
                    <div
                      key={obj.id || index}
                      onClick={() => onSelectObject?.(obj)}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-green-500/20 border border-green-500/50'
                          : 'hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      {/* Drag Handle */}
                      <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />

                      {/* Icon */}
                      <IconComponent className="w-4 h-4 text-gray-400" />

                      {/* Name */}
                      <span className="flex-1 text-sm text-white truncate">
                        {obj.name || obj.text?.substring(0, 20) || `${obj.type} ${index + 1}`}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility?.(obj);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title={isVisible ? 'Hide' : 'Show'}
                        >
                          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock?.(obj);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title={isLocked ? 'Unlock' : 'Lock'}
                        >
                          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteObject?.(obj);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-4">
            {/* Undo/Redo Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={onUndo}
                disabled={currentHistoryIndex <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-gray-300 text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={onRedo}
                disabled={currentHistoryIndex >= historyItems.length - 1}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-gray-300 text-sm transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                Redo
              </button>
            </div>

            {/* History List */}
            {historyItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No history yet
              </p>
            ) : (
              <div className="space-y-1">
                {historyItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => onHistoryJump?.(index)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      index === currentHistoryIndex
                        ? 'bg-green-500/20 text-green-500'
                        : index < currentHistoryIndex
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-500 hover:bg-gray-700'
                    }`}
                  >
                    {item.label || `Action ${index + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
