/**
 * Drop Zone Overlay (US-159)
 *
 * Full-page overlay that appears when dragging files over the window.
 * Provides visual feedback and handles the drop event.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Supported file types
const SUPPORTED_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mp3': 'audio',
  'application/pdf': 'document',
};

/**
 * Hook to handle drag-and-drop file uploads
 */
export function useDropZone(onDrop, options = {}) {
  const { disabled = false, accept = Object.keys(SUPPORTED_TYPES) } = options;
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounterRef.current += 1;
    setDragCounter(dragCounterRef.current);

    if (e.dataTransfer?.items?.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounterRef.current -= 1;
    setDragCounter(dragCounterRef.current);

    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    setIsDragging(false);
    dragCounterRef.current = 0;
    setDragCounter(0);

    const files = Array.from(e.dataTransfer?.files || []);

    // Filter to supported types if accept is specified
    const validFiles = files.filter(file => {
      if (accept.length === 0) return true;
      return accept.some(type => {
        if (type.endsWith('/*')) {
          const category = type.replace('/*', '');
          return file.type.startsWith(category);
        }
        return file.type === type;
      });
    });

    if (validFiles.length > 0) {
      onDrop?.(validFiles);
    }
  }, [disabled, accept, onDrop]);

  // Attach listeners to window
  useEffect(() => {
    if (disabled) return;

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [disabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

/**
 * Drop Zone Overlay Component
 */
export function DropZoneOverlay({
  isVisible,
  onClose,
  onDrop,
  targetFolder = null,
  maxFiles = 50,
  maxSize = 100 * 1024 * 1024, // 100MB per file
}) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer?.files || []);

    // Filter valid files
    const validFiles = files
      .filter(file => SUPPORTED_TYPES[file.type])
      .slice(0, maxFiles)
      .filter(file => file.size <= maxSize);

    if (validFiles.length > 0) {
      onDrop?.(validFiles);
    }
    onClose?.();
  }, [onDrop, onClose, maxFiles, maxSize]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm animate-in fade-in duration-150"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        // Only close if leaving the window entirely
        if (e.relatedTarget === null) {
          onClose?.();
        }
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
      >
        <X size={20} className="text-gray-600" />
      </button>

      {/* Drop zone content */}
      <div className="absolute inset-8 border-4 border-dashed border-blue-500 rounded-2xl flex items-center justify-center bg-white/80">
        <div className="text-center p-8">
          {/* Upload icon with animation */}
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
              <Upload size={40} className="text-white" />
            </div>
          </div>

          {/* Main text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Drop files to upload
          </h2>
          <p className="text-gray-500 mb-6">
            {targetFolder ? (
              <>Upload to <span className="font-medium text-gray-700">{targetFolder}</span></>
            ) : (
              'Files will be added to your media library'
            )}
          </p>

          {/* Supported types */}
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Image size={16} className="text-blue-500" />
              <span>Images</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Video size={16} className="text-purple-500" />
              <span>Videos</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Music size={16} className="text-green-500" />
              <span>Audio</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <FileText size={16} className="text-amber-500" />
              <span>PDFs</span>
            </div>
          </div>

          {/* Size limit notice */}
          <p className="text-xs text-gray-400 mt-4">
            Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline drop zone for specific areas (e.g., folder cards)
 */
export function InlineDropZone({
  onDrop,
  children,
  className = '',
  activeClassName = 'ring-2 ring-blue-500 bg-blue-50',
  disabled = false,
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer?.files || []);
    const validFiles = files.filter(file => SUPPORTED_TYPES[file.type]);

    if (validFiles.length > 0) {
      onDrop?.(validFiles);
    }
  };

  return (
    <div
      className={`${className} ${isOver && !disabled ? activeClassName : ''} transition-all duration-150`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}

export default DropZoneOverlay;
