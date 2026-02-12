// src/player/components/widgets/RssCardWidget.jsx
// Article card layout widget for rendering RSS feed items on player screens
// Supports grid and carousel layouts with image, title, description, and date

import { useState, useEffect, useRef } from 'react';
import { fetchRssFeed } from '../../../services/rssFeedService';
import { cacheRssFeed, getCachedRssFeed } from '../../cacheService';
import { createScopedLogger } from '../../../services/loggingService.js';

const logger = createScopedLogger('RssCardWidget');

/**
 * RssCardWidget - Renders RSS feed items as article cards
 *
 * @param {Object} props - Widget props
 * @param {string} props.feedUrl - RSS feed URL (required)
 * @param {number} [props.refreshIntervalMinutes] - Refresh interval (default 15)
 * @param {number} [props.maxCards] - Max visible cards (default 4)
 * @param {number} [props.cardRotateSeconds] - Seconds per card in carousel (default 8)
 * @param {string} [props.layout] - 'grid' or 'carousel' (default 'grid')
 * @param {boolean} [props.showImages] - Show article images (default true)
 * @param {boolean} [props.showDate] - Show publication date (default true)
 * @param {string} [props.backgroundColor] - Container background
 * @param {string} [props.cardBgColor] - Card background color
 * @param {string} [props.textColor] - Text color
 * @param {string} [props.accentColor] - Accent color for dates
 */
export function RssCardWidget({ props = {} }) {
  const {
    feedUrl,
    refreshIntervalMinutes = 15,
    maxCards = 4,
    cardRotateSeconds = 8,
    layout = 'grid',
    showImages = true,
    showDate = true,
    backgroundColor = 'transparent',
    cardBgColor = 'rgba(255,255,255,0.05)',
    textColor = '#ffffff',
    accentColor = '#3b82f6',
  } = props;

  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());
  const itemsRef = useRef([]);

  // Keep itemsRef in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Initial data load
  useEffect(() => {
    if (!feedUrl) return;

    let cancelled = false;

    async function loadFeed() {
      try {
        const result = await fetchRssFeed(feedUrl);
        if (!cancelled && result?.items) {
          setItems(result.items);
          setCurrentIndex(0);
          setFailedImages(new Set());
          // Cache for offline use
          cacheRssFeed(feedUrl, result).catch((err) => {
            logger.warn('Failed to cache RSS feed', { error: err });
          });
        }
      } catch (err) {
        logger.warn('Failed to fetch RSS feed, trying cache', { error: err });
        // Silent fallback to cached data
        try {
          const cached = await getCachedRssFeed(feedUrl);
          if (!cancelled && cached?.items) {
            setItems(cached.items);
            setCurrentIndex(0);
            setFailedImages(new Set());
          }
        } catch (cacheErr) {
          logger.warn('Failed to get cached RSS feed', { error: cacheErr });
        }
      }
    }

    loadFeed();

    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  // Refresh timer
  useEffect(() => {
    if (!feedUrl || !refreshIntervalMinutes) return;

    const intervalMs = refreshIntervalMinutes * 60 * 1000;

    const interval = setInterval(async () => {
      try {
        const result = await fetchRssFeed(feedUrl);
        if (result?.items) {
          setItems(result.items);
          setCurrentIndex(0);
          setFailedImages(new Set());
          cacheRssFeed(feedUrl, result).catch((err) => {
            logger.warn('Failed to cache on refresh', { error: err });
          });
        }
      } catch (err) {
        logger.warn('Refresh failed, keeping current data', { error: err });
        // On refresh failure, try cache if we have no data yet
        if (itemsRef.current.length === 0) {
          try {
            const cached = await getCachedRssFeed(feedUrl);
            if (cached?.items) {
              setItems(cached.items);
            }
          } catch (cacheErr) {
            logger.warn('Cache fallback failed on refresh', { error: cacheErr });
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [feedUrl, refreshIntervalMinutes]);

  // Carousel rotation timer
  useEffect(() => {
    if (layout !== 'carousel' || items.length === 0 || !cardRotateSeconds) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(items.length, maxCards));
    }, cardRotateSeconds * 1000);

    return () => clearInterval(interval);
  }, [layout, items.length, cardRotateSeconds, maxCards]);

  // No items: render nothing (silent)
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, maxCards);

  const handleImageError = (imageUrl) => {
    setFailedImages((prev) => new Set(prev).add(imageUrl));
  };

  const renderCard = (item, index, style = {}) => {
    return (
      <div
        key={`${item.title}-${index}`}
        style={{
          backgroundColor: cardBgColor,
          borderRadius: '0.5rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
      >
        {/* Image area */}
        {showImages && item.imageUrl && !failedImages.has(item.imageUrl) && (
          <div style={{ height: '40%', minHeight: '60px', flexShrink: 0 }}>
            <img
              src={item.imageUrl}
              alt=""
              onError={() => handleImageError(item.imageUrl)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Content area */}
        <div
          style={{
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Title */}
          <div
            style={{
              color: textColor,
              fontWeight: 'bold',
              fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </div>

          {/* Description excerpt */}
          {item.description && (
            <div
              style={{
                color: textColor,
                opacity: 0.5,
                fontSize: 'clamp(0.6rem, 1.2vw, 0.85rem)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginTop: '0.4rem',
                lineHeight: 1.3,
              }}
            >
              {item.description}
            </div>
          )}

          {/* Date */}
          {showDate && item.pubDate && (
            <div
              style={{
                color: accentColor,
                fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
                marginTop: 'auto',
                paddingTop: '0.4rem',
              }}
            >
              {item.pubDate}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Carousel layout: single card with fade transition
  if (layout === 'carousel') {
    const safeIndex = currentIndex < visibleItems.length ? currentIndex : 0;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {visibleItems.map((item, index) => (
          renderCard(item, index, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: index === safeIndex ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            pointerEvents: index === safeIndex ? 'auto' : 'none',
          })
        ))}
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
        fontFamily: 'system-ui, sans-serif',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
        overflow: 'hidden',
        padding: '0.5rem',
      }}
    >
      {visibleItems.map((item, index) => renderCard(item, index))}
    </div>
  );
}

export default RssCardWidget;
