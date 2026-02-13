// src/player/components/widgets/RssCardWidget.jsx
// Article card layout widget for rendering RSS feed items on player screens
// Supports grid and carousel layouts with image, title, description, and date

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRssFeed } from '../../../services/rssFeedService';
import { cacheRssFeed, getCachedRssFeed } from '../../cacheService';
import { useWidgetData } from '../../hooks/useWidgetData.js';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';

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
  const [dataFadeOpacity, setDataFadeOpacity] = useState(1);
  const dataVersion = useRef(0);

  // Orchestrator integration
  const sourceKey = feedUrl ? `rss-feed:${feedUrl}` : null;
  const fetchFnCb = useCallback(async () => {
    const result = await fetchRssFeed(feedUrl);
    return result;
  }, [feedUrl]);
  const cacheFnCb = useCallback(async (_key, data) => {
    await cacheRssFeed(feedUrl, data);
  }, [feedUrl]);
  const { data: orchestratorData, lastFetchedAt } = useWidgetData(sourceKey, fetchFnCb, refreshIntervalMinutes * 60 * 1000, cacheFnCb);

  // Offline cache fallback
  useEffect(() => {
    if (!feedUrl || orchestratorData) return;
    let cancelled = false;
    getCachedRssFeed(feedUrl).then(cached => {
      if (!cancelled && cached?.items && !orchestratorData) setItems(cached.items);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [feedUrl, orchestratorData]);

  // Reset failedImages when new data arrives
  useEffect(() => {
    if (orchestratorData?.items) setFailedImages(new Set());
  }, [orchestratorData]);

  // Data refresh fade transition (200ms opacity dip on subsequent fetches)
  useEffect(() => {
    if (!orchestratorData) return;
    dataVersion.current += 1;
    if (dataVersion.current <= 1) return; // Skip first load
    setDataFadeOpacity(0);
    const timeout = setTimeout(() => {
      setDataFadeOpacity(1);
    }, 200);
    return () => clearTimeout(timeout);
  }, [orchestratorData]);

  // Use orchestrator data with local cache fallback
  const activeItems = orchestratorData?.items || items;

  // Carousel rotation timer
  useEffect(() => {
    if (layout !== 'carousel' || activeItems.length === 0 || !cardRotateSeconds) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(activeItems.length, maxCards));
    }, cardRotateSeconds * 1000);

    return () => clearInterval(interval);
  }, [layout, activeItems.length, cardRotateSeconds, maxCards]);

  // No items: render nothing (silent)
  if (activeItems.length === 0) {
    return null;
  }

  const visibleItems = activeItems.slice(0, maxCards);

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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor,
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            opacity: dataFadeOpacity,
            transition: 'opacity 0.2s ease-in-out',
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
        <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          opacity: dataFadeOpacity,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {visibleItems.map((item, index) => renderCard(item, index))}
      </div>
      <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default RssCardWidget;
