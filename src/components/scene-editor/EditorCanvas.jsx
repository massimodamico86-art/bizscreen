/**
 * EditorCanvas
 *
 * 16:9 canvas for drag-and-drop block editing.
 * Supports:
 * - Click to select blocks
 * - Drag to move blocks
 * - Resize handles on selected blocks
 * - Smart snap guides for alignment
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Type, Image, Square, Clock, Move, CloudSun, QrCode, Calendar, Database } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  calculateSnapPosition,
  findAlignmentGuides,
  SNAP_THRESHOLD,
} from '../../services/sceneDesignService';
import {
  resolveSlideBindings,
  hasBindings,
  extractDataSourceIds,
  clearCachedDataSource,
} from '../../services/dataBindingResolver';
import { subscribeToDataSource } from '../../services/dataSourceService';
import { useLogger } from '../../hooks/useLogger.js';

// Block type icons
const BLOCK_ICONS = {
  text: Type,
  image: Image,
  shape: Square,
  widget: Clock,
};

// Widget type icons
const WIDGET_ICONS = {
  clock: Clock,
  date: Calendar,
  weather: CloudSun,
  qr: QrCode,
};

export default function EditorCanvas({
  design,
  selectedBlockId,
  onBlockSelect,
  onBlockUpdate,
  smartGuidesEnabled = true,
}) {
  const logger = useLogger('EditorCanvas');
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  const [initialBlock, setInitialBlock] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [resolvedBlocks, setResolvedBlocks] = useState(new Map());

  // Defensive: ensure design properties exist with safe defaults
  const background = design?.background || { type: 'solid', color: '#1a1a2e' };
  const blocks = design?.blocks || [];

  // Resolve data bindings for blocks
  useEffect(() => {
    let cancelled = false;

    async function resolveBindings() {
      // Find blocks with bindings
      const blocksWithBindings = blocks.filter(hasBindings);
      if (blocksWithBindings.length === 0) {
        setResolvedBlocks(new Map());
        return;
      }

      try {
        const resolved = await resolveSlideBindings(blocksWithBindings);
        if (!cancelled) {
          const resolvedMap = new Map();
          resolved.forEach((block) => {
            if (block.resolvedContent || block.resolvedProperties) {
              resolvedMap.set(block.id, {
                content: block.resolvedContent,
                properties: block.resolvedProperties,
              });
            }
          });
          setResolvedBlocks(resolvedMap);
        }
      } catch (error) {
        logger.error('Failed to resolve bindings', { error });
      }
    }

    resolveBindings();

    return () => {
      cancelled = true;
    };
  }, [blocks]);

  // Subscribe to real-time data source updates for the editor
  useEffect(() => {
    // Extract all data source IDs used in the current design
    const dataSourceIds = extractDataSourceIds(design);

    if (dataSourceIds.size === 0) return;

    const subscriptions = [];

    // Subscribe to each data source
    dataSourceIds.forEach((dataSourceId) => {
      try {
        const subscription = subscribeToDataSource(dataSourceId, async (update) => {
          logger.debug('Data source updated', { dataSourceId, updateType: update.type });

          // Clear the cache for this data source
          clearCachedDataSource(dataSourceId);

          // Re-resolve bindings for affected blocks
          const blocksWithBindings = blocks.filter(hasBindings);
          if (blocksWithBindings.length === 0) return;

          try {
            const resolved = await resolveSlideBindings(blocksWithBindings);
            const resolvedMap = new Map();
            resolved.forEach((block) => {
              if (block.resolvedContent || block.resolvedProperties) {
                resolvedMap.set(block.id, {
                  content: block.resolvedContent,
                  properties: block.resolvedProperties,
                });
              }
            });
            setResolvedBlocks(resolvedMap);
          } catch (err) {
            logger.error('Failed to re-resolve bindings', { error: err });
          }
        });
        subscriptions.push(subscription);
      } catch (err) {
        logger.error('Failed to subscribe to data source', { dataSourceId, error: err });
      }
    });

    return () => {
      // Cleanup subscriptions
      subscriptions.forEach((sub) => {
        if (sub?.unsubscribe) {
          sub.unsubscribe().catch((err) => {
            logger.warn('Error unsubscribing', { error: err });
          });
        }
      });
    };
  }, [design, blocks]);

  // Get canvas dimensions for position calculations
  const getCanvasDimensions = useCallback(() => {
    if (!canvasRef.current) return { width: 0, height: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // Convert pixel position to percentage
  const pixelToPercent = useCallback((px, dimension) => {
    const dims = getCanvasDimensions();
    const total = dimension === 'x' ? dims.width : dims.height;
    return total > 0 ? px / total : 0;
  }, [getCanvasDimensions]);

  // ===========================================
  // DRAG HANDLING
  // ===========================================

  const handleMouseDown = useCallback((e, blockId) => {
    e.stopPropagation();
    onBlockSelect(blockId);

    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setInitialBlock({ ...block });
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  }, [blocks, onBlockSelect]);

  const handleResizeStart = useCallback((e, blockId, handle) => {
    e.stopPropagation();

    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setInitialBlock({ ...block });
    setDragStart({ x: e.clientX, y: e.clientY });
    setResizeHandle(handle);
    setIsResizing(true);
  }, [blocks]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing) return;
    if (!initialBlock) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const deltaXPercent = pixelToPercent(deltaX, 'x');
    const deltaYPercent = pixelToPercent(deltaY, 'y');

    if (isDragging) {
      // Move block
      let newX = Math.max(0, Math.min(1 - initialBlock.width, initialBlock.x + deltaXPercent));
      let newY = Math.max(0, Math.min(1 - initialBlock.height, initialBlock.y + deltaYPercent));

      // Apply smart snapping if enabled
      if (smartGuidesEnabled) {
        const otherBlocks = blocks.filter(b => b.id !== initialBlock.id);
        const tempBlock = { ...initialBlock, x: newX, y: newY };

        // Calculate snap position
        const snapped = calculateSnapPosition(tempBlock, otherBlocks, SNAP_THRESHOLD);
        newX = snapped.x;
        newY = snapped.y;

        // Find alignment guides
        const guides = findAlignmentGuides(
          { ...tempBlock, x: newX, y: newY },
          otherBlocks,
          SNAP_THRESHOLD
        );
        setAlignmentGuides(guides);
      }

      onBlockUpdate(initialBlock.id, { x: newX, y: newY });
    } else if (isResizing && resizeHandle) {
      // Resize block
      let newX = initialBlock.x;
      let newY = initialBlock.y;
      let newWidth = initialBlock.width;
      let newHeight = initialBlock.height;

      if (resizeHandle.includes('e')) {
        newWidth = Math.max(0.05, Math.min(1 - initialBlock.x, initialBlock.width + deltaXPercent));
      }
      if (resizeHandle.includes('w')) {
        const widthDelta = -deltaXPercent;
        newWidth = Math.max(0.05, initialBlock.width + widthDelta);
        newX = Math.max(0, initialBlock.x - widthDelta);
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(0.05, Math.min(1 - initialBlock.y, initialBlock.height + deltaYPercent));
      }
      if (resizeHandle.includes('n')) {
        const heightDelta = -deltaYPercent;
        newHeight = Math.max(0.05, initialBlock.height + heightDelta);
        newY = Math.max(0, initialBlock.y - heightDelta);
      }

      onBlockUpdate(initialBlock.id, { x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, initialBlock, dragStart, resizeHandle, pixelToPercent, onBlockUpdate, smartGuidesEnabled, blocks]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setInitialBlock(null);
    setAlignmentGuides([]); // Clear guides when done
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

  // Click outside to deselect
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      onBlockSelect(null);
    }
  };

  // ===========================================
  // BLOCK RENDERING
  // ===========================================

  function renderBlock(block) {
    const isSelected = block.id === selectedBlockId;
    const Icon = BLOCK_ICONS[block.type] || Square;

    const style = {
      position: 'absolute',
      left: `${block.x * 100}%`,
      top: `${block.y * 100}%`,
      width: `${block.width * 100}%`,
      height: `${block.height * 100}%`,
      zIndex: block.layer || 1,
      cursor: isDragging ? 'grabbing' : 'grab',
    };

    const selectedStyles = isSelected
      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
      : '';

    return (
      <div
        key={block.id}
        className={`group ${selectedStyles}`}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, block.id)}
      >
        {/* Block content */}
        {renderBlockContent(block)}

        {/* Selection overlay */}
        {isSelected && (
          <>
            {/* Resize handles */}
            <ResizeHandle position="nw" onMouseDown={(e) => handleResizeStart(e, block.id, 'nw')} />
            <ResizeHandle position="ne" onMouseDown={(e) => handleResizeStart(e, block.id, 'ne')} />
            <ResizeHandle position="sw" onMouseDown={(e) => handleResizeStart(e, block.id, 'sw')} />
            <ResizeHandle position="se" onMouseDown={(e) => handleResizeStart(e, block.id, 'se')} />
            <ResizeHandle position="n" onMouseDown={(e) => handleResizeStart(e, block.id, 'n')} />
            <ResizeHandle position="s" onMouseDown={(e) => handleResizeStart(e, block.id, 's')} />
            <ResizeHandle position="e" onMouseDown={(e) => handleResizeStart(e, block.id, 'e')} />
            <ResizeHandle position="w" onMouseDown={(e) => handleResizeStart(e, block.id, 'w')} />
          </>
        )}
      </div>
    );
  }

  function renderBlockContent(block) {
    const { type } = block;
    // Defensive: ensure props exists with safe defaults
    const props = block.props || {};

    switch (type) {
      case 'text': {
        // Safe defaults for text blocks
        const align = props.align || 'left';
        const fontSize = props.fontSize ?? 32;
        const fontWeight = props.fontWeight || '600';
        const color = props.color || '#ffffff';
        const text = props.text || '';

        // Check for resolved binding content
        const resolved = resolvedBlocks.get(block.id);
        const displayText = resolved?.content || text;
        const isBound = hasBindings(block);

        return (
          <div
            className="w-full h-full flex items-center overflow-hidden relative"
            style={{
              justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: color,
              textAlign: align,
              padding: '4px 8px',
            }}
          >
            {displayText}
            {/* Data binding indicator */}
            {isBound && (
              <div className="absolute top-0.5 right-0.5 z-10" title="Data-bound text">
                <Database className="w-3 h-3 text-blue-400" />
              </div>
            )}
          </div>
        );
      }

      case 'image': {
        // Safe defaults for image blocks
        const borderRadius = props.borderRadius ?? 0;
        const fit = props.fit || 'cover';
        const url = props.url || '';

        return (
          <div
            className="w-full h-full rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            {url ? (
              <img
                src={url}
                alt=""
                className="w-full h-full"
                style={{ objectFit: fit }}
              />
            ) : (
              <Image className="w-8 h-8 text-gray-600" />
            )}
          </div>
        );
      }

      case 'shape': {
        // Safe defaults for shape blocks
        const fill = props.fill || '#3B82F6';
        const opacity = props.opacity ?? 0.8;
        const shapeBorderRadius = props.borderRadius ?? 0;

        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: fill,
              opacity: opacity,
              borderRadius: `${shapeBorderRadius}px`,
            }}
          />
        );
      }

      case 'widget': {
        // Safe defaults for widget blocks
        const textColor = props.textColor || '#ffffff';
        const accentColor = props.accentColor || '#3b82f6';
        const widgetType = block.widgetType || 'clock';
        const size = props.size || 'medium';
        const customFontSize = props.customFontSize;
        const location = props.location || 'Miami, FL';
        const units = props.units || 'imperial';
        const style = props.style || 'minimal';
        const cornerRadius = props.cornerRadius || 8;
        const label = props.label || '';
        const url = props.url || '';

        // Size mappings for clock/date/weather
        const sizeMap = {
          small: { clock: '1rem', date: '0.7rem', weatherTemp: '0.9rem', weatherSecondary: '0.5rem' },
          medium: { clock: '1.5rem', date: '0.9rem', weatherTemp: '1.25rem', weatherSecondary: '0.6rem' },
          large: { clock: '2.5rem', date: '1.2rem', weatherTemp: '1.75rem', weatherSecondary: '0.75rem' },
        };

        // Get font size - handles custom size with explicit px value
        const getFontSize = (widgetKey, fallback) => {
          if (size === 'custom' && customFontSize) {
            return `${customFontSize}px`;
          }
          return sizeMap[size]?.[widgetKey] || fallback;
        };

        // Mock temperature for preview
        const mockTemp = units === 'metric' ? '22°' : '72°';

        // Render based on widget type
        switch (widgetType) {
          case 'clock':
            return (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: textColor, fontSize: getFontSize('clock', '1.5rem'), fontWeight: '300' }}
              >
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            );

          case 'date':
            return (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: textColor, fontSize: getFontSize('date', '0.9rem'), fontWeight: '400' }}
              >
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            );

          case 'weather':
            return style === 'card' ? (
              <div
                className="w-full h-full flex flex-col items-center justify-center rounded-lg p-2"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <CloudSun className="w-6 h-6 mb-1" style={{ color: accentColor }} />
                <span style={{ color: textColor, fontSize: getFontSize('weatherTemp', '1.25rem'), fontWeight: '600' }}>{mockTemp}</span>
                <span style={{ color: textColor, opacity: 0.7, fontSize: getFontSize('weatherSecondary', '0.6rem') }}>{location}</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center gap-2">
                <CloudSun className="w-5 h-5" style={{ color: accentColor }} />
                <div className="flex flex-col">
                  <span style={{ color: textColor, fontSize: getFontSize('weatherTemp', '1rem'), fontWeight: '600', lineHeight: 1 }}>{mockTemp}</span>
                  <span style={{ color: textColor, opacity: 0.7, fontSize: getFontSize('weatherSecondary', '0.5rem'), lineHeight: 1 }}>{location}</span>
                </div>
              </div>
            );

          case 'qr': {
            const qrFgColor = props.qrFgColor || '#000000';
            const qrBgColor = props.qrBgColor || '#ffffff';
            const errorCorrection = props.errorCorrection || 'M';

            // Placeholder pattern for when URL is empty
            const QRPlaceholder = () => (
              <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-0.5">
                {[0,1,2,3,4,5,6,7,8,10,14,15,16,17,18,19,20,21,22,24].map(i => (
                  <div key={i} style={{ background: qrFgColor, borderRadius: '1px' }} />
                ))}
                {[9,11,12,13,23].map(i => (
                  <div key={i} style={{ background: qrFgColor, opacity: 0.4, borderRadius: '1px' }} />
                ))}
              </div>
            );

            return (
              <div className="w-full h-full flex flex-col items-center justify-center p-1">
                <div
                  className="flex-1 w-full flex items-center justify-center overflow-hidden"
                  style={{
                    maxWidth: '80%',
                    aspectRatio: '1',
                    backgroundColor: qrBgColor,
                    borderRadius: `${cornerRadius}px`,
                    padding: '4px',
                  }}
                >
                  {url ? (
                    <QRCodeSVG
                      value={url}
                      size={128}
                      level={errorCorrection}
                      fgColor={qrFgColor}
                      bgColor={qrBgColor}
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }}
                    />
                  ) : (
                    <QRPlaceholder />
                  )}
                </div>
                {(label || url) && (
                  <span
                    className="mt-1 text-center truncate w-full"
                    style={{ color: textColor, fontSize: '0.5rem' }}
                  >
                    {label || (url.length > 20 ? url.slice(0, 20) + '...' : url)}
                  </span>
                )}
              </div>
            );
          }

          default:
            const WidgetIcon = WIDGET_ICONS[widgetType] || Clock;
            return (
              <div
                className="w-full h-full flex items-center justify-center rounded-lg border"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', borderColor: accentColor }}
              >
                <div className="text-center">
                  <WidgetIcon className="w-6 h-6 mx-auto mb-1" style={{ color: accentColor }} />
                  <span className="text-xs uppercase" style={{ color: textColor }}>
                    {widgetType}
                  </span>
                </div>
              </div>
            );
        }
      }

      default:
        return (
          <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400">Unknown</span>
          </div>
        );
    }
  }

  // ===========================================
  // RENDER
  // ===========================================

  // Build background styles with safe defaults
  const backgroundStyle = {};
  const bgType = background?.type || 'solid';
  if (bgType === 'solid') {
    backgroundStyle.backgroundColor = background?.color || '#1a1a2e';
  } else if (bgType === 'gradient') {
    const direction = background?.direction || '180deg';
    const from = background?.from || '#1a1a2e';
    const to = background?.to || '#0d0d1a';
    backgroundStyle.background = `linear-gradient(${direction}, ${from}, ${to})`;
  } else if (bgType === 'image') {
    const bgUrl = background?.url || '';
    if (bgUrl) {
      backgroundStyle.backgroundImage = `url(${bgUrl})`;
      backgroundStyle.backgroundSize = 'cover';
      backgroundStyle.backgroundPosition = 'center';
    } else {
      backgroundStyle.backgroundColor = '#1a1a2e';
    }
  }

  // Sort blocks by layer
  const sortedBlocks = [...blocks].sort((a, b) => (a.layer || 1) - (b.layer || 1));

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        ref={canvasRef}
        className="relative aspect-video w-full max-h-full rounded-lg overflow-hidden shadow-2xl"
        style={{
          maxWidth: 'calc((100vh - 200px) * 16 / 9)',
          ...backgroundStyle,
        }}
        onClick={handleCanvasClick}
      >
        {sortedBlocks.map(renderBlock)}

        {/* Alignment guides */}
        {smartGuidesEnabled && alignmentGuides.map((guide, index) => (
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
                    boxShadow: guide.type.includes('canvas')
                      ? '0 0 4px rgba(245, 158, 11, 0.8)'
                      : '0 0 4px rgba(236, 72, 153, 0.8)',
                  }
                : {
                    top: `${guide.position * 100}%`,
                    left: `${guide.from * 100}%`,
                    height: '1px',
                    width: `${(guide.to - guide.from) * 100}%`,
                    background: guide.type.includes('canvas') ? '#f59e0b' : '#ec4899',
                    boxShadow: guide.type.includes('canvas')
                      ? '0 0 4px rgba(245, 158, 11, 0.8)'
                      : '0 0 4px rgba(236, 72, 153, 0.8)',
                  }),
              zIndex: 1000,
            }}
          />
        ))}

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Move className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Click "Add" buttons above to add content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Resize handle component
function ResizeHandle({ position, onMouseDown }) {
  const positionStyles = {
    nw: 'top-0 left-0 cursor-nw-resize',
    ne: 'top-0 right-0 cursor-ne-resize',
    sw: 'bottom-0 left-0 cursor-sw-resize',
    se: 'bottom-0 right-0 cursor-se-resize',
    n: 'top-0 left-1/2 -translate-x-1/2 cursor-n-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize',
    e: 'top-1/2 right-0 -translate-y-1/2 cursor-e-resize',
    w: 'top-1/2 left-0 -translate-y-1/2 cursor-w-resize',
  };

  return (
    <div
      className={`absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow ${positionStyles[position]}`}
      onMouseDown={onMouseDown}
      style={{ zIndex: 100 }}
    />
  );
}
