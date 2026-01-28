/**
 * Media Preview Popover (US-156)
 *
 * Shows an expanded preview of a media asset on hover.
 * Appears after a 300ms delay to prevent flicker.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Image, Video, Music, FileText, Globe } from 'lucide-react';

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
};

const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
};

const getBadgeVariant = (type) => {
  const variants = {
    image: 'blue',
    video: 'purple',
    audio: 'green',
    document: 'orange',
    web_page: 'gray',
  };
  return variants[type] || 'gray';
};

export function MediaPreviewPopover({
  asset,
  isVisible,
  anchorRect,
  onClose,
}) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Calculate position based on anchor element
  useEffect(() => {
    if (!isVisible || !anchorRect) return;

    const popoverWidth = 320;
    const popoverHeight = 380;
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

  // Pause media when hidden
  useEffect(() => {
    if (!isVisible) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isVisible]);

  if (!isVisible || !asset) return null;

  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

  const popoverContent = (
    <div
      ref={popoverRef}
      role="tooltip"
      aria-label={`Preview of ${asset.name}`}
      className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={onClose}
    >
      {/* Preview Area */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200">
        {asset.type === 'video' && asset.url ? (
          <video
            ref={videoRef}
            src={asset.url}
            className="w-full h-full object-contain bg-black"
            controls
            muted
            preload="metadata"
          />
        ) : asset.type === 'audio' && asset.url ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200 p-4">
            <Music size={48} className="text-purple-500 mb-4" />
            <audio
              ref={audioRef}
              src={asset.url}
              controls
              className="w-full"
              preload="metadata"
            />
          </div>
        ) : asset.thumbnail_url || asset.url ? (
          <img
            src={asset.thumbnail_url || asset.url}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={64} className="text-gray-300" />
          </div>
        )}

        {/* Type Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={getBadgeVariant(asset.type)}>
            {MEDIA_TYPE_LABELS[asset.type]}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
          {asset.name}
        </h3>

        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* File Size */}
          {asset.formattedSize && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <HardDrive size={14} />
              <span>{asset.formattedSize}</span>
            </div>
          )}

          {/* Dimensions */}
          {asset.dimensions && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Maximize2 size={14} />
              <span>{asset.dimensions}</span>
            </div>
          )}

          {/* Duration (for video/audio) */}
          {asset.formattedDuration && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Clock size={14} />
              <span>{asset.formattedDuration}</span>
            </div>
          )}

          {/* Created date */}
          {asset.createdAt && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar size={14} />
              <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
            {asset.tags.slice(0, 5).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {asset.tags.length > 5 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{asset.tags.length - 5} more
              </span>
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
export function useMediaPreview(delay = 300) {
  const [isVisible, setIsVisible] = useState(false);
  const [asset, setAsset] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const timeoutRef = useRef(null);
  const isHoveringRef = useRef(false);

  const showPreview = useCallback((assetData, element) => {
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
        setAsset(assetData);
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
        setAsset(null);
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
    asset,
    anchorRect,
    showPreview,
    hidePreview,
    keepVisible,
  };
}

export default MediaPreviewPopover;
