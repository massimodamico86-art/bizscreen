/**
 * LayoutEditorCanvas
 *
 * Yodeck-style 16:9 canvas with:
 * - Blue grid overlay (Yodeck style)
 * - Drag to move elements
 * - White square resize handles with blue border
 * - Dotted blue selection border
 * - Smart snap guides
 * - Zoom support
 *
 * Matches Yodeck's visual design with light canvas area.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Move } from 'lucide-react';
import LayoutElementRenderer from './LayoutElementRenderer';
import { SNAP_THRESHOLD } from './types';
import { YODECK_GRID, YODECK_COLORS } from '../../config/yodeckTheme';

/**
 * Calculate snap position for element alignment
 */
function calculateSnapPosition(element, otherElements, threshold) {
  let { x, y } = element.position;
  const { width, height } = element.position;

  // Element edges
  const left = x;
  const right = x + width;
  const centerX = x + width / 2;
  const top = y;
  const bottom = y + height;
  const centerY = y + height / 2;

  // Canvas center snapping
  if (Math.abs(centerX - 0.5) < threshold) x = 0.5 - width / 2;
  if (Math.abs(centerY - 0.5) < threshold) y = 0.5 - height / 2;

  // Canvas edge snapping
  if (Math.abs(left) < threshold) x = 0;
  if (Math.abs(right - 1) < threshold) x = 1 - width;
  if (Math.abs(top) < threshold) y = 0;
  if (Math.abs(bottom - 1) < threshold) y = 1 - height;

  // Snap to other elements
  otherElements.forEach((other) => {
    const oLeft = other.position.x;
    const oRight = other.position.x + other.position.width;
    const oCenterX = other.position.x + other.position.width / 2;
    const oTop = other.position.y;
    const oBottom = other.position.y + other.position.height;
    const oCenterY = other.position.y + other.position.height / 2;

    // Horizontal snapping
    if (Math.abs(left - oLeft) < threshold) x = oLeft;
    if (Math.abs(left - oRight) < threshold) x = oRight;
    if (Math.abs(right - oLeft) < threshold) x = oLeft - width;
    if (Math.abs(right - oRight) < threshold) x = oRight - width;
    if (Math.abs(centerX - oCenterX) < threshold) x = oCenterX - width / 2;

    // Vertical snapping
    if (Math.abs(top - oTop) < threshold) y = oTop;
    if (Math.abs(top - oBottom) < threshold) y = oBottom;
    if (Math.abs(bottom - oTop) < threshold) y = oTop - height;
    if (Math.abs(bottom - oBottom) < threshold) y = oBottom - height;
    if (Math.abs(centerY - oCenterY) < threshold) y = oCenterY - height / 2;
  });

  return { x, y };
}

/**
 * Find alignment guides to display
 */
function findAlignmentGuides(element, otherElements, threshold) {
  const guides = [];
  const { x, y, width, height } = element.position;

  const left = x;
  const right = x + width;
  const centerX = x + width / 2;
  const top = y;
  const bottom = y + height;
  const centerY = y + height / 2;

  // Canvas center guides
  if (Math.abs(centerX - 0.5) < threshold) {
    guides.push({ axis: 'vertical', position: 0.5, from: 0, to: 1, type: 'canvas-center' });
  }
  if (Math.abs(centerY - 0.5) < threshold) {
    guides.push({ axis: 'horizontal', position: 0.5, from: 0, to: 1, type: 'canvas-center' });
  }

  // Element alignment guides
  otherElements.forEach((other) => {
    const oLeft = other.position.x;
    const oRight = other.position.x + other.position.width;
    const oCenterX = other.position.x + other.position.width / 2;
    const oTop = other.position.y;
    const oBottom = other.position.y + other.position.height;
    const oCenterY = other.position.y + other.position.height / 2;

    // Vertical guides (horizontal alignment)
    if (Math.abs(left - oLeft) < threshold || Math.abs(right - oLeft) < threshold) {
      guides.push({ axis: 'vertical', position: oLeft, from: Math.min(top, oTop), to: Math.max(bottom, oBottom), type: 'element' });
    }
    if (Math.abs(left - oRight) < threshold || Math.abs(right - oRight) < threshold) {
      guides.push({ axis: 'vertical', position: oRight, from: Math.min(top, oTop), to: Math.max(bottom, oBottom), type: 'element' });
    }
    if (Math.abs(centerX - oCenterX) < threshold) {
      guides.push({ axis: 'vertical', position: oCenterX, from: Math.min(top, oTop), to: Math.max(bottom, oBottom), type: 'element-center' });
    }

    // Horizontal guides (vertical alignment)
    if (Math.abs(top - oTop) < threshold || Math.abs(bottom - oTop) < threshold) {
      guides.push({ axis: 'horizontal', position: oTop, from: Math.min(left, oLeft), to: Math.max(right, oRight), type: 'element' });
    }
    if (Math.abs(top - oBottom) < threshold || Math.abs(bottom - oBottom) < threshold) {
      guides.push({ axis: 'horizontal', position: oBottom, from: Math.min(left, oLeft), to: Math.max(right, oRight), type: 'element' });
    }
    if (Math.abs(centerY - oCenterY) < threshold) {
      guides.push({ axis: 'horizontal', position: oCenterY, from: Math.min(left, oLeft), to: Math.max(right, oRight), type: 'element-center' });
    }
  });

  return guides;
}

/**
 * LayoutEditorCanvas Modes:
 * - 'edit' (default): Full editing capabilities with selection, resize handles, and snap guides
 * - 'preview': Read-only view that shows exactly how the layout will appear on screen
 */
export default function LayoutEditorCanvas({
  elements = [],
  selectedElementId,
  onElementSelect,
  onElementUpdate,
  background = { type: 'solid', color: '#1a1a2e' },
  zoom = 1,
  showGrid = true,
  smartGuidesEnabled = true,
  onDoubleClick,
  mode = 'edit', // 'edit' | 'preview'
}) {
  // In preview mode, disable all editing interactions
  const isPreviewMode = mode === 'preview';
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  const [initialElement, setInitialElement] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);

  // Get canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    if (!canvasRef.current) return { width: 0, height: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // Convert pixel to fraction
  const pixelToFraction = useCallback(
    (px, dimension) => {
      const dims = getCanvasDimensions();
      const total = dimension === 'x' ? dims.width : dims.height;
      return total > 0 ? px / total : 0;
    },
    [getCanvasDimensions]
  );

  // Handle element drag start
  const handleDragStart = useCallback(
    (e, elementId) => {
      e.stopPropagation();

      // In preview mode, don't allow drag/selection
      if (isPreviewMode) return;

      onElementSelect(elementId);

      const element = elements.find((el) => el.id === elementId);
      if (!element || element.locked) return;

      setInitialElement({ ...element, position: { ...element.position } });
      setDragStart({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
    },
    [elements, onElementSelect, isPreviewMode]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e, elementId, handle) => {
      e.stopPropagation();

      // In preview mode, don't allow resize
      if (isPreviewMode) return;

      const element = elements.find((el) => el.id === elementId);
      if (!element || element.locked) return;

      setInitialElement({ ...element, position: { ...element.position } });
      setDragStart({ x: e.clientX, y: e.clientY });
      setResizeHandle(handle);
      setIsResizing(true);
    },
    [elements, isPreviewMode]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging && !isResizing) return;
      if (!initialElement) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const deltaXFraction = pixelToFraction(deltaX, 'x');
      const deltaYFraction = pixelToFraction(deltaY, 'y');

      if (isDragging) {
        // Move element
        let newX = Math.max(0, Math.min(1 - initialElement.position.width, initialElement.position.x + deltaXFraction));
        let newY = Math.max(0, Math.min(1 - initialElement.position.height, initialElement.position.y + deltaYFraction));

        // Apply smart snapping
        if (smartGuidesEnabled) {
          const otherElements = elements.filter((el) => el.id !== initialElement.id);
          const tempElement = {
            ...initialElement,
            position: { ...initialElement.position, x: newX, y: newY },
          };

          const snapped = calculateSnapPosition(tempElement, otherElements, SNAP_THRESHOLD);
          newX = snapped.x;
          newY = snapped.y;

          const guides = findAlignmentGuides(
            { ...tempElement, position: { ...tempElement.position, x: newX, y: newY } },
            otherElements,
            SNAP_THRESHOLD
          );
          setAlignmentGuides(guides);
        }

        onElementUpdate(initialElement.id, {
          position: { ...initialElement.position, x: newX, y: newY },
        });
      } else if (isResizing && resizeHandle) {
        // Resize element
        let { x, y, width, height } = initialElement.position;

        if (resizeHandle.includes('e')) {
          width = Math.max(0.05, Math.min(1 - x, width + deltaXFraction));
        }
        if (resizeHandle.includes('w')) {
          const widthDelta = -deltaXFraction;
          const newWidth = Math.max(0.05, width + widthDelta);
          x = Math.max(0, x - (newWidth - width));
          width = newWidth;
        }
        if (resizeHandle.includes('s')) {
          height = Math.max(0.05, Math.min(1 - y, height + deltaYFraction));
        }
        if (resizeHandle.includes('n')) {
          const heightDelta = -deltaYFraction;
          const newHeight = Math.max(0.05, height + heightDelta);
          y = Math.max(0, y - (newHeight - height));
          height = newHeight;
        }

        onElementUpdate(initialElement.id, {
          position: { x, y, width, height },
        });
      }
    },
    [isDragging, isResizing, initialElement, dragStart, resizeHandle, pixelToFraction, onElementUpdate, smartGuidesEnabled, elements]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setInitialElement(null);
    setAlignmentGuides([]);
  }, []);

  // Global mouse events
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Click canvas to deselect
  const handleCanvasClick = (e) => {
    // In preview mode, don't handle clicks
    if (isPreviewMode) return;
    if (e.target === canvasRef.current || e.target.classList.contains('grid-overlay')) {
      onElementSelect(null);
    }
  };

  // Double-click to edit
  const handleElementDoubleClick = (e, elementId) => {
    e.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(elementId);
    }
  };

  // Build background styles
  const getBackgroundStyle = () => {
    const style = {};
    if (background.type === 'solid') {
      style.backgroundColor = background.color || '#1a1a2e';
    } else if (background.type === 'gradient') {
      const direction = background.direction || '180deg';
      const from = background.from || '#1a1a2e';
      const to = background.to || '#0d0d1a';
      style.background = `linear-gradient(${direction}, ${from}, ${to})`;
    } else if (background.type === 'image' && background.url) {
      style.backgroundImage = `url(${background.url})`;
      style.backgroundSize = background.fit || 'cover';
      style.backgroundPosition = 'center';
    }
    return style;
  };

  // Sort elements by layer
  const sortedElements = [...elements].sort((a, b) => (a.layer || 1) - (b.layer || 1));

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-gray-100">
      <div
        ref={canvasRef}
        className="relative aspect-video rounded-lg overflow-hidden shadow-xl"
        style={{
          width: `${100 * zoom}%`,
          maxWidth: `calc((100vh - 200px) * 16 / 9 * ${zoom})`,
          ...getBackgroundStyle(),
        }}
        onClick={handleCanvasClick}
      >
        {/* Grid overlay - Yodeck blue style (hidden in preview mode) */}
        {showGrid && !isPreviewMode && (
          <div
            className="grid-overlay absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, ${YODECK_GRID.color} ${YODECK_GRID.strokeWidth}px, transparent ${YODECK_GRID.strokeWidth}px),
                linear-gradient(to bottom, ${YODECK_GRID.color} ${YODECK_GRID.strokeWidth}px, transparent ${YODECK_GRID.strokeWidth}px)
              `,
              backgroundSize: `${YODECK_GRID.size}px ${YODECK_GRID.size}px`,
            }}
          />
        )}

        {/* Elements */}
        {sortedElements.map((element) => {
          const isSelected = element.id === selectedElementId && !isPreviewMode;
          return (
            <div
              key={element.id}
              className="absolute group"
              style={{
                left: `${element.position.x * 100}%`,
                top: `${element.position.y * 100}%`,
                width: `${element.position.width * 100}%`,
                height: `${element.position.height * 100}%`,
                zIndex: element.layer || 1,
                // In preview mode, use default cursor; in edit mode, use grab cursor
                cursor: isPreviewMode
                  ? 'default'
                  : element.locked
                    ? 'not-allowed'
                    : isDragging
                      ? 'grabbing'
                      : 'grab',
                // Yodeck-style dotted blue selection border (hidden in preview mode)
                ...(isSelected && {
                  outline: `2px dashed ${YODECK_COLORS.selectionBorder}`,
                  outlineOffset: '2px',
                }),
              }}
              onMouseDown={(e) => handleDragStart(e, element.id)}
              onDoubleClick={(e) => handleElementDoubleClick(e, element.id)}
            >
              <LayoutElementRenderer element={element} />

              {/* Selection overlay with resize handles - Yodeck white square style (hidden in preview mode) */}
              {isSelected && !element.locked && !isPreviewMode && (
                <>
                  <ResizeHandle position="nw" onMouseDown={(e) => handleResizeStart(e, element.id, 'nw')} />
                  <ResizeHandle position="ne" onMouseDown={(e) => handleResizeStart(e, element.id, 'ne')} />
                  <ResizeHandle position="sw" onMouseDown={(e) => handleResizeStart(e, element.id, 'sw')} />
                  <ResizeHandle position="se" onMouseDown={(e) => handleResizeStart(e, element.id, 'se')} />
                  <ResizeHandle position="n" onMouseDown={(e) => handleResizeStart(e, element.id, 'n')} />
                  <ResizeHandle position="s" onMouseDown={(e) => handleResizeStart(e, element.id, 's')} />
                  <ResizeHandle position="e" onMouseDown={(e) => handleResizeStart(e, element.id, 'e')} />
                  <ResizeHandle position="w" onMouseDown={(e) => handleResizeStart(e, element.id, 'w')} />
                </>
              )}
            </div>
          );
        })}

        {/* Alignment guides (hidden in preview mode) */}
        {smartGuidesEnabled && !isPreviewMode &&
          alignmentGuides.map((guide, index) => (
            <div
              key={`guide-${index}`}
              className="absolute pointer-events-none"
              style={{
                ...(guide.axis === 'vertical'
                  ? {
                      left: `${guide.position * 100}%`,
                      top: `${guide.from * 100}%`,
                      width: '1px',
                      height: `${(guide.to - guide.from) * 100}%`,
                      background: guide.type.includes('canvas') ? '#f59e0b' : '#ec4899',
                      boxShadow: guide.type.includes('canvas') ? '0 0 4px rgba(245, 158, 11, 0.8)' : '0 0 4px rgba(236, 72, 153, 0.8)',
                    }
                  : {
                      top: `${guide.position * 100}%`,
                      left: `${guide.from * 100}%`,
                      height: '1px',
                      width: `${(guide.to - guide.from) * 100}%`,
                      background: guide.type.includes('canvas') ? '#f59e0b' : '#ec4899',
                      boxShadow: guide.type.includes('canvas') ? '0 0 4px rgba(245, 158, 11, 0.8)' : '0 0 4px rgba(236, 72, 153, 0.8)',
                    }),
                zIndex: 1000,
              }}
            />
          ))}

        {/* Empty state (only show in edit mode) */}
        {elements.length === 0 && !isPreviewMode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Move className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Add elements from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Resize handle component - Yodeck style (white squares with blue border)
function ResizeHandle({ position, onMouseDown }) {
  const positionStyles = {
    nw: 'top-0 left-0 cursor-nw-resize -translate-x-1/2 -translate-y-1/2',
    ne: 'top-0 right-0 cursor-ne-resize translate-x-1/2 -translate-y-1/2',
    sw: 'bottom-0 left-0 cursor-sw-resize -translate-x-1/2 translate-y-1/2',
    se: 'bottom-0 right-0 cursor-se-resize translate-x-1/2 translate-y-1/2',
    n: 'top-0 left-1/2 cursor-n-resize -translate-x-1/2 -translate-y-1/2',
    s: 'bottom-0 left-1/2 cursor-s-resize -translate-x-1/2 translate-y-1/2',
    e: 'top-1/2 right-0 cursor-e-resize translate-x-1/2 -translate-y-1/2',
    w: 'top-1/2 left-0 cursor-w-resize -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`absolute w-2.5 h-2.5 bg-white rounded-sm shadow-sm ${positionStyles[position]}`}
      onMouseDown={onMouseDown}
      style={{
        zIndex: 100,
        border: `2px solid ${YODECK_COLORS.selectionBorder}`,
      }}
    />
  );
}
