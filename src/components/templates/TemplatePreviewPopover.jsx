/**
 * Template Preview Popover (US-123)
 *
 * Shows an expanded preview of a template on hover/focus.
 * Appears after a 300ms delay to prevent flicker.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Package, List, Layout } from 'lucide-react';

// Badge colors for template types
const getBadgeVariant = (type) => {
  const variants = {
    playlist: 'blue',
    layout: 'purple',
    pack: 'green',
  };
  return variants[type] || 'gray';
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'pack':
      return Package;
    case 'layout':
      return Layout;
    default:
      return List;
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'pack':
      return 'Starter Pack';
    case 'layout':
      return 'Layout';
    default:
      return 'Playlist';
  }
};

export function TemplatePreviewPopover({
  template,
  isVisible,
  anchorRect,
  onClose,
  livePreview = null, // Optional live preview component
}) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on anchor element
  useEffect(() => {
    if (!isVisible || !anchorRect) return;

    const popoverWidth = 320;
    const popoverHeight = 400;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.right + margin;
    let top = anchorRect.top;

    // If popover would go off the right edge, show it on the left
    if (left + popoverWidth > viewportWidth - margin) {
      left = anchorRect.left - popoverWidth - margin;
    }

    // If popover would still go off left edge, center it
    if (left < margin) {
      left = Math.max(margin, (viewportWidth - popoverWidth) / 2);
    }

    // Vertical positioning - keep within viewport
    if (top + popoverHeight > viewportHeight - margin) {
      top = Math.max(margin, viewportHeight - popoverHeight - margin);
    }

    setPosition({ top, left });
  }, [isVisible, anchorRect]);

  if (!isVisible || !template) return null;

  const TypeIcon = getTypeIcon(template.type);

  const popoverContent = (
    <div
      ref={popoverRef}
      role="tooltip"
      aria-label={`Preview of ${template.title || template.name}`}
      className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={onClose}
    >
      {/* Preview Image Area */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200">
        {livePreview ? (
          <div className="w-full h-full">
            {livePreview}
          </div>
        ) : template.thumbnail || template.thumbnail_url ? (
          <img
            src={template.thumbnail || template.thumbnail_url}
            alt={template.title || template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={64} className="text-gray-300" />
          </div>
        )}

        {/* Type Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={getBadgeVariant(template.type)}>
            {getTypeLabel(template.type)}
          </Badge>
        </div>

        {/* Preview Label */}
        {livePreview && (
          <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Live Preview
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-1">
          {template.title || template.name}
        </h3>

        {/* Category */}
        {template.category && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
            <Tag size={14} />
            <span>{template.category}</span>
          </div>
        )}

        {/* Full Description */}
        <p className="text-sm text-gray-600 leading-relaxed">
          {template.description || 'No description available.'}
        </p>

        {/* Meta info */}
        {template.meta && (template.meta.includes || template.meta.estimated_items) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {template.meta.includes && (
              <p className="text-xs text-gray-400">
                <span className="font-medium">Includes:</span> {template.meta.includes.join(', ')}
              </p>
            )}
            {template.meta.estimated_items && (
              <p className="text-xs text-gray-400">
                {template.meta.estimated_items} items
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render to portal to avoid z-index issues
  return createPortal(popoverContent, document.body);
}

/**
 * Hook to manage hover preview state with delay
 */
export function useTemplatePreview(delay = 300) {
  const [isVisible, setIsVisible] = useState(false);
  const [template, setTemplate] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const timeoutRef = useRef(null);
  const isHoveringRef = useRef(false);

  const showPreview = useCallback((templateData, element) => {
    isHoveringRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to show preview after delay
    timeoutRef.current = setTimeout(() => {
      if (isHoveringRef.current) {
        const rect = element.getBoundingClientRect();
        setAnchorRect(rect);
        setTemplate(templateData);
        setIsVisible(true);
      }
    }, delay);
  }, [delay]);

  const hidePreview = useCallback(() => {
    isHoveringRef.current = false;

    // Clear pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Small delay before hiding to allow mouse to move to popover
    setTimeout(() => {
      if (!isHoveringRef.current) {
        setIsVisible(false);
        setTemplate(null);
        setAnchorRect(null);
      }
    }, 100);
  }, []);

  const keepVisible = useCallback(() => {
    isHoveringRef.current = true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isVisible,
    template,
    anchorRect,
    showPreview,
    hidePreview,
    keepVisible,
  };
}

export default TemplatePreviewPopover;
