/**
 * FloatingLayersPanel
 *
 * Yodeck-style floating layers panel with:
 * - Draggable panel
 * - Layer list with icons and names
 * - Visibility toggles (checkboxes)
 * - Drag handles for reordering
 * - Lock toggle
 *
 * @module components/layout-editor/FloatingLayersPanel
 */

import { useState, useCallback } from 'react';
import {
  X,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Image,
  Type,
  Square,
  Video,
  Music,
  Clock,
  Calendar,
  CloudSun,
  QrCode,
  Database,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
} from 'lucide-react';
import { YODECK_COLORS } from '../../config/yodeckTheme';

const ELEMENT_ICONS = {
  image: Image,
  video: Video,
  text: Type,
  shape: Square,
  audio: Music,
  widget: Clock,
};

const WIDGET_ICONS = {
  clock: Clock,
  date: Calendar,
  weather: CloudSun,
  qr: QrCode,
  data: Database,
};

export default function FloatingLayersPanel({
  isOpen,
  onClose,
  elements = [],
  selectedId,
  onSelectElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  onToggleVisibility,
  onToggleLock,
  position = { x: 20, y: 80 },
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState(position);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedLayer, setDraggedLayer] = useState(null);

  // Panel drag handlers
  const handlePanelDragStart = useCallback((e) => {
    if (e.target.closest('.layer-item') || e.target.closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y,
    });
  }, [panelPosition]);

  const handlePanelDrag = useCallback((e) => {
    if (!isDragging) return;
    setPanelPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset]);

  const handlePanelDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Layer drag handlers for reordering
  const handleLayerDragStart = useCallback((e, elementId) => {
    e.stopPropagation();
    setDraggedLayer(elementId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleLayerDragOver = useCallback((e, targetId) => {
    e.preventDefault();
    if (draggedLayer && draggedLayer !== targetId) {
      onReorderElement?.(draggedLayer, targetId);
    }
  }, [draggedLayer, onReorderElement]);

  const handleLayerDragEnd = useCallback(() => {
    setDraggedLayer(null);
  }, []);

  // Get display name for element
  const getElementName = (element) => {
    if (element.props?.name) return element.props.name;
    if (element.type === 'text') return element.props?.text?.slice(0, 20) || 'Text';
    if (element.type === 'widget') return element.widgetType?.charAt(0).toUpperCase() + element.widgetType?.slice(1) || 'Widget';
    if (element.type === 'shape') return element.shapeType?.charAt(0).toUpperCase() + element.shapeType?.slice(1) || 'Shape';
    return element.type?.charAt(0).toUpperCase() + element.type?.slice(1) || 'Element';
  };

  // Get icon for element
  const getElementIcon = (element) => {
    if (element.type === 'widget') {
      return WIDGET_ICONS[element.widgetType] || Clock;
    }
    return ELEMENT_ICONS[element.type] || Square;
  };

  if (!isOpen) return null;

  // Sort elements by layer (highest first)
  const sortedElements = [...elements].sort((a, b) => (b.layer || 0) - (a.layer || 0));

  return (
    <div
      className="fixed bg-white rounded-xl shadow-xl border border-gray-200 w-72 z-50 select-none"
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
      onMouseMove={handlePanelDrag}
      onMouseUp={handlePanelDragEnd}
      onMouseLeave={handlePanelDragEnd}
    >
      {/* Header - draggable */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-move"
        onMouseDown={handlePanelDragStart}
      >
        <h3 className="text-sm font-semibold text-gray-800">Layers</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer list */}
      <div className="max-h-80 overflow-y-auto">
        {sortedElements.length === 0 ? (
          <div className="p-6 text-center">
            <Square className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No layers yet</p>
            <p className="text-xs text-gray-300">Add elements to see them here</p>
          </div>
        ) : (
          <ul className="py-1">
            {sortedElements.map((element) => {
              const Icon = getElementIcon(element);
              const isSelected = element.id === selectedId;
              const isVisible = element.visible !== false;
              const isLocked = element.locked === true;

              return (
                <li
                  key={element.id}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, element.id)}
                  onDragOver={(e) => handleLayerDragOver(e, element.id)}
                  onDragEnd={handleLayerDragEnd}
                  className={`layer-item group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-50 border-l-2 border-l-[#f26f21]'
                      : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                  } ${draggedLayer === element.id ? 'opacity-50' : ''}`}
                  onClick={() => onSelectElement?.(element.id)}
                >
                  {/* Drag handle */}
                  <button
                    className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  {/* Visibility checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility?.(element.id);
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      isVisible ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300'
                    }`}
                    title={isVisible ? 'Hide layer' : 'Show layer'}
                  >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Type icon */}
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isSelected ? '#fff5f0' : '#f3f4f6' }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: isSelected ? YODECK_COLORS.primary : '#6b7280' }}
                    />
                  </div>

                  {/* Layer name */}
                  <span
                    className={`flex-1 text-sm truncate ${
                      isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'
                    } ${!isVisible ? 'opacity-50' : ''}`}
                  >
                    {getElementName(element)}
                  </span>

                  {/* Lock button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock?.(element.id);
                    }}
                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isLocked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'
                    }`}
                    title={isLocked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer actions */}
      {selectedId && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex gap-1">
            <button
              onClick={() => {
                const element = elements.find((e) => e.id === selectedId);
                if (element) {
                  const currentIndex = sortedElements.findIndex((e) => e.id === selectedId);
                  if (currentIndex > 0) {
                    onReorderElement?.(selectedId, sortedElements[currentIndex - 1].id);
                  }
                }
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const currentIndex = sortedElements.findIndex((e) => e.id === selectedId);
                if (currentIndex < sortedElements.length - 1) {
                  onReorderElement?.(selectedId, sortedElements[currentIndex + 1].id);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onDuplicateElement?.(selectedId)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteElement?.(selectedId)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
