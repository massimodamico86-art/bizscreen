// src/player/components/SceneRenderer.jsx
// Scene rendering with slides, blocks, transitions, and data binding
// Extracted from Player.jsx for maintainability

import { useState, useEffect, useRef } from 'react';
import {
  getBlockAnimationStyles,
  getSlideTransitionStyles,
  ANIMATION_KEYFRAMES,
} from '../../services/sceneDesignService';
import {
  preloadNextSlides,
} from '../../services/mediaPreloader';
import {
  resolveSlideBindings,
  prefetchSceneDataSources,
  extractDataSourceIds,
  clearCachedDataSource,
} from '../../services/dataBindingResolver';
import {
  subscribeToDataSource,
} from '../../services/dataSourceService';
import { useLogger } from '../../hooks/useLogger.js';
import { ClockWidget, DateWidget, WeatherWidget, QRCodeWidget } from './widgets';

/**
 * Scene Block - Renders individual blocks in a scene slide
 * Supports data-bound text blocks with resolvedContent
 */
function SceneBlock({ block, slideIndex }) {
  const { type, x, y, width, height, layer, props, widgetType, animation, resolvedContent } = block;

  // Get animation styles from block.animation
  const animationStyles = getBlockAnimationStyles(animation);

  const baseStyle = {
    position: 'absolute',
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    zIndex: layer || 1,
    overflow: 'hidden',
    ...animationStyles,
  };

  switch (type) {
    case 'text': {
      // Use resolved content from data binding if available, otherwise fall back to static text
      const displayText = resolvedContent || props?.text || '';

      return (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: props?.align === 'left' ? 'flex-start' : props?.align === 'right' ? 'flex-end' : 'center',
            padding: '0.5rem',
            fontSize: `${props?.fontSize || 24}px`,
            fontWeight: props?.fontWeight || '400',
            color: props?.color || '#ffffff',
            textAlign: props?.align || 'center',
            wordWrap: 'break-word',
          }}
        >
          {displayText}
        </div>
      );
    }

    case 'image':
      return (
        <div style={{
          ...baseStyle,
          borderRadius: `${props?.borderRadius || 0}px`,
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {props?.url ? (
            <img
              src={props.url}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: props?.fit || 'cover',
                borderRadius: `${props?.borderRadius || 0}px`,
              }}
            />
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>No image</div>
          )}
        </div>
      );

    case 'shape':
      return (
        <div style={{
          ...baseStyle,
          backgroundColor: props?.fill || '#3b82f6',
          opacity: props?.opacity ?? 1,
          borderRadius: `${props?.borderRadius || 0}px`,
        }} />
      );

    case 'widget':
      return (
        <div style={baseStyle}>
          <SceneWidgetRenderer widgetType={widgetType} props={props} />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Scene Widget Renderer - Renders widgets (clock, date, weather, qr) in scene blocks
 * Uses extracted widget components from player/components/widgets/
 */
function SceneWidgetRenderer({ widgetType, props }) {
  const safeProps = props || {};

  switch (widgetType) {
    case 'clock':
      return <ClockWidget props={safeProps} />;

    case 'date':
      return <DateWidget props={safeProps} />;

    case 'weather':
      return <WeatherWidget props={safeProps} />;

    case 'qr':
      return <QRCodeWidget props={safeProps} />;

    default:
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
          color: '#64748b',
          fontSize: '0.75rem',
        }}>
          {widgetType || 'Widget'}
        </div>
      );
  }
}

/**
 * Scene Renderer - Renders scene slides with drag-drop design blocks
 * Supports text, image, shape, and widget blocks
 * Phase 6: Added media preloading for smooth transitions
 */
export function SceneRenderer({ scene, screenId, tenantId }) {
  const logger = useLogger('SceneRenderer');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [resolvedBlocksMap, setResolvedBlocksMap] = useState(new Map());
  const timerRef = useRef(null);
  const preloadedRef = useRef(new Set());

  const slides = scene?.slides || [];

  // Prefetch and resolve data bindings for the scene
  useEffect(() => {
    if (!scene || slides.length === 0) return;

    let cancelled = false;

    async function resolveBindings() {
      try {
        // First, prefetch all data sources used in the scene
        await prefetchSceneDataSources(scene);

        // Then resolve bindings for all slides
        const resolvedMap = new Map();

        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i];
          const blocks = slide?.design?.blocks || [];

          if (blocks.length > 0) {
            const resolved = await resolveSlideBindings(blocks);
            resolved.forEach((block) => {
              if (block.resolvedContent) {
                resolvedMap.set(block.id, block.resolvedContent);
              }
            });
          }
        }

        if (!cancelled) {
          setResolvedBlocksMap(resolvedMap);
        }
      } catch (error) {
        logger.error('Failed to resolve data bindings', { error });
      }
    }

    resolveBindings();

    return () => {
      cancelled = true;
    };
  }, [scene, slides, logger]);

  // Subscribe to real-time data source updates
  useEffect(() => {
    if (!scene || slides.length === 0) return;

    // Extract all data source IDs used in the scene
    const dataSourceIds = new Set();
    for (const slide of slides) {
      const ids = extractDataSourceIds(slide?.design);
      ids.forEach((id) => dataSourceIds.add(id));
    }

    if (dataSourceIds.size === 0) return;

    const subscriptions = [];

    // Subscribe to each data source
    dataSourceIds.forEach((dataSourceId) => {
      try {
        const subscription = subscribeToDataSource(dataSourceId, async (update) => {
          logger.debug('Data source updated', { dataSourceId, updateType: update.type });

          // Clear the cache for this data source
          clearCachedDataSource(dataSourceId);

          // Re-resolve bindings for affected slides
          const resolvedMap = new Map(resolvedBlocksMap);

          for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            const blocks = slide?.design?.blocks || [];

            // Check if this slide uses the updated data source
            const slideIds = extractDataSourceIds(slide?.design);
            if (!slideIds.has(dataSourceId)) continue;

            if (blocks.length > 0) {
              try {
                const resolved = await resolveSlideBindings(blocks);
                resolved.forEach((block) => {
                  if (block.resolvedContent) {
                    resolvedMap.set(block.id, block.resolvedContent);
                  }
                });
              } catch (err) {
                logger.error('Failed to re-resolve bindings', { error: err });
              }
            }
          }

          setResolvedBlocksMap(resolvedMap);
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
  }, [scene, slides, resolvedBlocksMap, logger]);

  // Preload initial scene content on mount
  useEffect(() => {
    if (slides.length > 0) {
      // Preload first few slides
      preloadNextSlides(slides, 0, 3).catch(err => {
        logger.warn('Initial preload error', { error: err });
      });
    }
  }, [slides, logger]);

  // Auto-advance slides based on duration with preloading
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlide = slides[currentSlideIndex];
    const duration = (currentSlide?.duration_seconds || 10) * 1000;

    // Preload next slide before transition (2 seconds early)
    const preloadDelay = Math.max(0, duration - 2000);
    const preloadTimer = setTimeout(() => {
      const nextIndex = (currentSlideIndex + 1) % slides.length;
      const slideKey = `${scene?.id}-${nextIndex}`;

      if (!preloadedRef.current.has(slideKey)) {
        setIsPreloading(true);
        preloadNextSlides(slides, nextIndex, 2)
          .then(() => {
            preloadedRef.current.add(slideKey);
          })
          .catch(err => logger.warn('Preload error', { error: err }))
          .finally(() => setIsPreloading(false));
      }
    }, preloadDelay);

    // Advance to next slide
    timerRef.current = setTimeout(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(preloadTimer);
    };
  }, [currentSlideIndex, slides, scene?.id, logger]);

  if (!scene || slides.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{scene?.name || 'Scene'}</p>
          <p style={{ color: '#64748b' }}>No slides configured</p>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const design = currentSlide?.design || { background: { color: '#111827' }, blocks: [] };

  // Background style
  const backgroundStyle = {};
  if (design.background?.type === 'solid') {
    backgroundStyle.backgroundColor = design.background.color || '#111827';
  } else if (design.background?.type === 'gradient') {
    backgroundStyle.background = `linear-gradient(${design.background.direction || '180deg'}, ${design.background.from}, ${design.background.to})`;
  } else if (design.background?.type === 'image') {
    backgroundStyle.backgroundImage = `url(${design.background.url})`;
    backgroundStyle.backgroundSize = 'cover';
    backgroundStyle.backgroundPosition = 'center';
  } else {
    backgroundStyle.backgroundColor = '#111827';
  }

  // Sort blocks by layer
  const sortedBlocks = [...(design.blocks || [])].sort((a, b) => (a.layer || 1) - (b.layer || 1));

  // Get slide transition styles
  const transitionStyles = getSlideTransitionStyles(design.transition);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      ...backgroundStyle,
      ...transitionStyles
    }}>
      {/* Inject animation keyframes */}
      <style>{ANIMATION_KEYFRAMES}</style>

      {sortedBlocks.map((block) => (
        <SceneBlock
          key={block.id}
          block={{
            ...block,
            // Inject resolved content from data binding
            resolvedContent: resolvedBlocksMap.get(block.id) || block.resolvedContent,
          }}
          slideIndex={currentSlideIndex}
        />
      ))}

      {/* Slide progress indicators */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          opacity: 0.6
        }}>
          {slides.slice(0, Math.min(slides.length, 10)).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentSlideIndex ? '1.5rem' : '0.5rem',
                height: '0.5rem',
                borderRadius: '0.25rem',
                backgroundColor: idx === currentSlideIndex ? '#3b82f6' : '#fff',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SceneRenderer;
