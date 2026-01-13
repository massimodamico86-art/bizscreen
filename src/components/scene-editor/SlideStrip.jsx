/**
 * SlideStrip
 *
 * Left panel showing slide thumbnails.
 * Supports:
 * - Click to select slide
 * - Add new slide
 * - Delete slide (context menu)
 */

import { useState } from 'react';
import { Plus, Trash2, MoreVertical, GripVertical } from 'lucide-react';
import { Button } from '../../design-system';

export default function SlideStrip({
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
}) {
  const [contextMenuSlide, setContextMenuSlide] = useState(null);

  function handleContextMenu(e, slideId) {
    e.preventDefault();
    setContextMenuSlide(contextMenuSlide === slideId ? null : slideId);
  }

  function handleDelete(slideId) {
    setContextMenuSlide(null);
    onDelete(slideId);
  }

  // Close context menu when clicking outside
  function handleContainerClick() {
    if (contextMenuSlide) {
      setContextMenuSlide(null);
    }
  }

  return (
    <div className="h-full flex flex-col" onClick={handleContainerClick}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Slides</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdd}
            className="text-gray-400 hover:text-white p-1"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Slide List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.map((slide, index) => (
          <SlideThumb
            key={slide.id}
            slide={slide}
            index={index}
            isActive={index === activeIndex}
            onClick={() => onSelect(index)}
            onContextMenu={(e) => handleContextMenu(e, slide.id)}
            showContextMenu={contextMenuSlide === slide.id}
            onDelete={() => handleDelete(slide.id)}
            canDelete={slides.length > 1}
          />
        ))}
      </div>

      {/* Add Slide Button (bottom) */}
      <div className="p-3 border-t border-gray-800">
        <Button
          variant="secondary"
          size="sm"
          onClick={onAdd}
          className="w-full justify-center text-gray-400"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Slide
        </Button>
      </div>
    </div>
  );
}

function SlideThumb({
  slide,
  index,
  isActive,
  onClick,
  onContextMenu,
  showContextMenu,
  onDelete,
  canDelete,
}) {
  const design = slide.design_json || { background: { color: '#111827' }, blocks: [] };
  const bgColor = design.background?.color || '#111827';

  return (
    <div className="relative">
      <div
        className={`
          relative cursor-pointer rounded-lg overflow-hidden transition-all
          ${isActive
            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
            : 'hover:ring-1 hover:ring-gray-600'
          }
        `}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {/* Slide number */}
        <div className="absolute top-1 left-1 z-10 bg-gray-900/80 rounded px-1.5 py-0.5 text-xs text-gray-400">
          {index + 1}
        </div>

        {/* Menu button */}
        <button
          className="absolute top-1 right-1 z-10 p-1 rounded hover:bg-gray-800/80 text-gray-400 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
        >
          <MoreVertical className="w-3 h-3" />
        </button>

        {/* Thumbnail */}
        <div
          className="aspect-video w-full"
          style={{ backgroundColor: bgColor }}
        >
          {/* Mini preview of blocks */}
          <div className="relative w-full h-full overflow-hidden">
            {design.blocks?.slice(0, 5).map((block, i) => (
              <div
                key={block.id || i}
                className="absolute"
                style={{
                  left: `${block.x * 100}%`,
                  top: `${block.y * 100}%`,
                  width: `${block.width * 100}%`,
                  height: `${block.height * 100}%`,
                  backgroundColor: block.type === 'shape'
                    ? block.props?.fill
                    : block.type === 'text'
                    ? 'transparent'
                    : 'rgba(255,255,255,0.1)',
                  opacity: block.type === 'shape' ? block.props?.opacity : 1,
                }}
              >
                {block.type === 'text' && (
                  <div
                    className="w-full h-full flex items-center overflow-hidden"
                    style={{
                      justifyContent: block.props?.align === 'left' ? 'flex-start' : block.props?.align === 'right' ? 'flex-end' : 'center',
                      fontSize: `${Math.max(4, (block.props?.fontSize || 16) / 6)}px`,
                      color: block.props?.color || '#fff',
                    }}
                  >
                    {block.props?.text?.substring(0, 20)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Slide title */}
        <div className="px-2 py-1.5 bg-gray-800/80">
          <span className="text-xs text-gray-400 truncate block">
            {slide.title || `Slide ${index + 1}`}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="absolute right-0 top-8 z-50 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onDelete}
            disabled={!canDelete}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
