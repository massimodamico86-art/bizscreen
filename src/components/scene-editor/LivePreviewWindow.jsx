/**
 * LivePreviewWindow
 *
 * Real-time TV preview that renders exactly as it would appear on a TV screen.
 * Features:
 * - 16:9 aspect ratio scaling
 * - Animations run in preview
 * - Slide transitions
 * - Instant updates on editor changes
 * - Safe zone overlay option
 * - Isolated rendering to prevent jank
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  Grid,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '../../design-system';
import {
  getBlockAnimationStyles,
  getSlideTransitionStyles,
  ANIMATION_KEYFRAMES,
} from '../../services/sceneDesignService';
import { preloadSlide } from '../../services/mediaPreloader';

/**
 * Main LivePreviewWindow component
 */
export default function LivePreviewWindow({
  slides,
  activeSlideIndex,
  onClose,
  brandTheme,
  showSafeZone = false,
  autoPlay = false,
}) {
  const [currentIndex, setCurrentIndex] = useState(activeSlideIndex);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showSafeZoneOverlay, setShowSafeZoneOverlay] = useState(showSafeZone);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // Sync with editor's active slide when not playing
  useEffect(() => {
    if (!isPlaying) {
      setCurrentIndex(activeSlideIndex);
      setAnimationKey(k => k + 1); // Reset animations
    }
  }, [activeSlideIndex, isPlaying]);

  // Current slide data
  const currentSlide = slides[currentIndex];
  const design = currentSlide?.design_json || { background: { color: '#111827' }, blocks: [] };

  // Preload next slide
  useEffect(() => {
    if (slides.length > 1) {
      const nextIndex = (currentIndex + 1) % slides.length;
      preloadSlide(slides[nextIndex]);
    }
  }, [currentIndex, slides]);

  // Auto-advance timer when playing
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const duration = (currentSlide?.duration_seconds || 10) * 1000;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
      setAnimationKey(k => k + 1);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPlaying, slides, currentSlide?.duration_seconds]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setAnimationKey(k => k + 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setAnimationKey(k => k + 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setAnimationKey(k => k + 1);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-gray-950 rounded-lg overflow-hidden shadow-2xl"
      style={{ height: isFullscreen ? '100vh' : 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-300">TV Preview</span>
          <span className="text-xs text-gray-500">
            Slide {currentIndex + 1} of {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSafeZoneOverlay(!showSafeZoneOverlay)}
            className={showSafeZoneOverlay ? 'text-blue-400' : 'text-gray-500'}
            title="Toggle safe zone"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-gray-500 hover:text-white"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Canvas - 16:9 aspect ratio */}
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <div
          className="relative w-full"
          style={{
            maxWidth: isFullscreen ? '100%' : '800px',
            aspectRatio: '16/9',
          }}
        >
          <PreviewRenderer
            key={animationKey}
            design={design}
            slideIndex={currentIndex}
            showSafeZone={showSafeZoneOverlay}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          className="text-gray-400 hover:text-white"
          disabled={slides.length <= 1}
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          className="text-gray-400 hover:text-white"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          className="text-gray-400 hover:text-white"
          disabled={slides.length <= 1}
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        {/* Slide dots */}
        {slides.length > 1 && slides.length <= 10 && (
          <div className="flex gap-1 ml-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setAnimationKey(k => k + 1);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-blue-500 w-4' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}

        <span className="text-xs text-gray-500 ml-4">
          {currentSlide?.duration_seconds || 10}s
        </span>
      </div>
    </div>
  );
}

/**
 * PreviewRenderer - Renders the slide content with animations
 */
function PreviewRenderer({ design, slideIndex, showSafeZone }) {
  // Background style
  const backgroundStyle = useMemo(() => {
    const bg = design.background || {};
    if (bg.type === 'solid') {
      return { backgroundColor: bg.color || '#111827' };
    }
    if (bg.type === 'gradient') {
      const direction = bg.direction || '180deg';
      const from = bg.from || '#1a1a2e';
      const to = bg.to || '#16213e';
      return { background: `linear-gradient(${direction}, ${from}, ${to})` };
    }
    if (bg.type === 'image' && bg.url) {
      return {
        backgroundImage: `url(${bg.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (bg.type === 'animated') {
      // Animated gradient background
      return {
        background: `linear-gradient(${bg.direction || '45deg'}, ${bg.colors?.join(', ') || '#1a1a2e, #16213e, #0f3460'})`,
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      };
    }
    return { backgroundColor: '#111827' };
  }, [design.background]);

  // Transition styles
  const transitionStyles = getSlideTransitionStyles(design.transition);

  // Sort blocks by layer
  const sortedBlocks = useMemo(() => {
    return [...(design.blocks || [])].sort((a, b) => (a.layer || 1) - (b.layer || 1));
  }, [design.blocks]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        ...backgroundStyle,
        ...transitionStyles,
      }}
    >
      {/* Inject animation keyframes */}
      <style>{ANIMATION_KEYFRAMES}</style>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Render blocks */}
      {sortedBlocks.map((block, index) => (
        <PreviewBlock key={block.id || index} block={block} />
      ))}

      {/* Safe zone overlay */}
      {showSafeZone && <SafeZoneOverlay />}
    </div>
  );
}

/**
 * PreviewBlock - Renders individual blocks with animations
 */
function PreviewBlock({ block }) {
  const { type, x = 0, y = 0, width = 0.5, height = 0.2, layer = 1, props = {}, widgetType, animation } = block;

  // Get animation styles
  const animationStyles = getBlockAnimationStyles(animation);

  const baseStyle = {
    position: 'absolute',
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    zIndex: layer,
    overflow: 'hidden',
    ...animationStyles,
  };

  switch (type) {
    case 'text':
      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: props.align === 'left' ? 'flex-start' : props.align === 'right' ? 'flex-end' : 'center',
            padding: '0.5rem',
            fontSize: `${props.fontSize || 24}px`,
            fontWeight: props.fontWeight || '400',
            color: props.color || '#ffffff',
            textAlign: props.align || 'center',
            wordWrap: 'break-word',
            lineHeight: props.lineHeight || 1.2,
          }}
        >
          {props.text || ''}
        </div>
      );

    case 'image':
      return (
        <div
          style={{
            ...baseStyle,
            borderRadius: `${props.borderRadius || 0}px`,
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {props.url ? (
            <img
              src={props.url}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: props.fit || 'cover',
                borderRadius: `${props.borderRadius || 0}px`,
              }}
            />
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>No image</div>
          )}
        </div>
      );

    case 'shape':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: props.fill || '#3b82f6',
            opacity: props.opacity ?? 1,
            borderRadius: `${props.borderRadius || 0}px`,
          }}
        />
      );

    case 'widget':
      return (
        <div style={baseStyle}>
          <PreviewWidget widgetType={widgetType} props={props} />
        </div>
      );

    default:
      return null;
  }
}

/**
 * PreviewWidget - Renders widget blocks (clock, date, etc.)
 */
function PreviewWidget({ widgetType, props = {} }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = () => {
    return time.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  switch (widgetType) {
    case 'clock':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: props.textColor || '#ffffff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 'clamp(1rem, 5vw, 3rem)',
            fontWeight: '300',
          }}
        >
          {formatTime()}
        </div>
      );

    case 'date':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: props.textColor || '#94a3b8',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
            fontWeight: '400',
          }}
        >
          {formatDate()}
        </div>
      );

    default:
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            color: '#64748b',
            fontSize: '0.75rem',
          }}
        >
          {widgetType || 'Widget'}
        </div>
      );
  }
}

/**
 * SafeZoneOverlay - Shows safe zone grid for editor reference
 */
function SafeZoneOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* 5% margin safe zone */}
      <div
        className="absolute border-2 border-dashed border-blue-500/40"
        style={{
          left: '5%',
          top: '5%',
          width: '90%',
          height: '90%',
        }}
      />

      {/* 10% action safe zone */}
      <div
        className="absolute border border-dashed border-yellow-500/30"
        style={{
          left: '10%',
          top: '10%',
          width: '80%',
          height: '80%',
        }}
      />

      {/* Center cross */}
      <div
        className="absolute bg-red-500/30"
        style={{
          left: '50%',
          top: '0',
          width: '1px',
          height: '100%',
          transform: 'translateX(-50%)',
        }}
      />
      <div
        className="absolute bg-red-500/30"
        style={{
          left: '0',
          top: '50%',
          width: '100%',
          height: '1px',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Corner labels */}
      <div className="absolute top-1 left-1 text-xs text-blue-400/60">Title Safe (5%)</div>
      <div className="absolute top-1 right-1 text-xs text-yellow-400/60 text-right">Action Safe (10%)</div>
    </div>
  );
}

/**
 * Inline Preview - Smaller version for side-by-side editing
 */
export function InlinePreview({ design, className = '' }) {
  if (!design) return null;

  return (
    <div className={`relative aspect-video bg-black rounded overflow-hidden ${className}`}>
      <PreviewRenderer design={design} slideIndex={0} showSafeZone={false} />
    </div>
  );
}
