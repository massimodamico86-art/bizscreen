/**
 * Layers Panel
 *
 * Floating panel for managing canvas layers/objects.
 * Features:
 * - List all objects with thumbnails
 * - Toggle visibility
 * - Toggle lock state
 * - Reorder layers (drag or buttons)
 * - Select object
 */

import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  X,
  Type,
  Image,
  Square,
  Circle,
  Triangle,
  Minus,
} from 'lucide-react';

// Get icon for object type
function getObjectIcon(type) {
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
      return Circle;
    case 'triangle':
      return Triangle;
    case 'line':
      return Minus;
    default:
      return Square;
  }
}

export default function LayersPanel({
  objects = [],
  selectedObjectId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onReorder,
  onClose,
}) {
  // Reverse objects for display (top layer first)
  const displayObjects = [...objects].reverse();

  const handleMoveUp = (index) => {
    const realIndex = objects.length - 1 - index;
    if (realIndex < objects.length - 1) {
      onReorder?.(realIndex, realIndex + 1);
    }
  };

  const handleMoveDown = (index) => {
    const realIndex = objects.length - 1 - index;
    if (realIndex > 0) {
      onReorder?.(realIndex, realIndex - 1);
    }
  };

  return (
    <div className="absolute right-80 top-4 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-medium text-sm">Layers</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Layers list */}
      <div className="max-h-80 overflow-y-auto">
        {displayObjects.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No objects on canvas
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {displayObjects.map((obj, displayIndex) => {
              const Icon = getObjectIcon(obj.type);
              const isSelected = obj.id === selectedObjectId;
              const realIndex = objects.length - 1 - displayIndex;

              return (
                <div
                  key={obj.id}
                  onClick={() => onSelect?.(obj.id)}
                  className={`
                    flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-orange-500/20 border border-orange-500/50'
                      : 'hover:bg-gray-700/50 border border-transparent'
                    }
                  `}
                >
                  {/* Object icon */}
                  <div className={`p-1 rounded ${isSelected ? 'text-orange-400' : 'text-gray-400'}`}>
                    <Icon size={14} />
                  </div>

                  {/* Object name */}
                  <span
                    className={`flex-1 text-sm truncate ${
                      obj.visible ? 'text-gray-200' : 'text-gray-500'
                    } ${obj.locked ? 'italic' : ''}`}
                  >
                    {obj.name}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5">
                    {/* Move up */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(displayIndex);
                      }}
                      disabled={displayIndex === 0}
                      className={`p-1 rounded transition-colors ${
                        displayIndex === 0
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                      title="Move up"
                    >
                      <ChevronUp size={12} />
                    </button>

                    {/* Move down */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(displayIndex);
                      }}
                      disabled={displayIndex === displayObjects.length - 1}
                      className={`p-1 rounded transition-colors ${
                        displayIndex === displayObjects.length - 1
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                      title="Move down"
                    >
                      <ChevronDown size={12} />
                    </button>

                    {/* Toggle visibility */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility?.(obj.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        obj.visible
                          ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                          : 'text-gray-600 hover:text-gray-400 hover:bg-gray-600'
                      }`}
                      title={obj.visible ? 'Hide' : 'Show'}
                    >
                      {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>

                    {/* Toggle lock */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock?.(obj.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        obj.locked
                          ? 'text-orange-400 hover:text-orange-300 hover:bg-gray-600'
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                      title={obj.locked ? 'Unlock' : 'Lock'}
                    >
                      {obj.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        {objects.length} object{objects.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
