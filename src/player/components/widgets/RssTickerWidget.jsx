// src/player/components/widgets/RssTickerWidget.jsx
// Scrolling news ticker widget for rendering RSS feed items on player screens
// GPU-accelerated CSS transform animation with seamless loop

import { useState, useEffect, useRef } from 'react';
import { fetchRssFeed } from '../../../services/rssFeedService';
import { cacheRssFeed, getCachedRssFeed } from '../../cacheService';
import { createScopedLogger } from '../../../services/loggingService.js';

const logger = createScopedLogger('RssTickerWidget');

/**
 * RssTickerWidget - Renders RSS feed items as a horizontally scrolling ticker
 *
 * @param {Object} props - Widget props
 * @param {string} props.feedUrl - RSS feed URL (required)
 * @param {number} [props.refreshIntervalMinutes] - Refresh interval (default 15)
 * @param {number} [props.speed] - Pixels per second scroll speed (default 50)
 * @param {string} [props.separator] - Character between items (default '|')
 * @param {string} [props.backgroundColor] - Ticker background color
 * @param {string} [props.textColor] - Text color
 * @param {string} [props.fontSize] - Font size
 */
export function RssTickerWidget({ props = {} }) {
  const {
    feedUrl,
    refreshIntervalMinutes = 15,
    speed = 50,
    separator = '|',
    backgroundColor = 'rgba(0,0,0,0.85)',
    textColor = '#ffffff',
    fontSize = 'clamp(0.8rem, 2vw, 1.2rem)',
  } = props;

  const [items, setItems] = useState([]);
  const [duration, setDuration] = useState(0);
  const contentRef = useRef(null);
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

  // Calculate animation duration based on content width
  useEffect(() => {
    if (!contentRef.current || items.length === 0) {
      setDuration(0);
      return;
    }

    // Allow a frame for the DOM to render before measuring
    const raf = requestAnimationFrame(() => {
      if (contentRef.current) {
        const scrollWidth = contentRef.current.scrollWidth;
        // Duration = distance / speed. Since we duplicated content, half scrollWidth is one copy
        const calculatedDuration = scrollWidth / (speed * 2);
        setDuration(Math.max(calculatedDuration, 5)); // minimum 5s
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [items, speed]);

  // No items: render nothing (silent)
  if (items.length === 0) {
    return null;
  }

  // Duplicate items for seamless loop
  const tickerItems = [...items, ...items];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rss-ticker-content {
            animation: none !important;
          }
        }
      `}</style>

      <div
        ref={contentRef}
        className="rss-ticker-content"
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: duration > 0
            ? `ticker-scroll ${duration}s linear infinite`
            : 'none',
        }}
      >
        {tickerItems.map((item, index) => (
          <span key={`${item.title}-${index}`} style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                padding: '0 2rem',
                color: textColor,
                fontSize,
              }}
            >
              {item.title}
            </span>
            {index < tickerItems.length - 1 && (
              <span
                style={{
                  opacity: 0.4,
                  padding: '0 1rem',
                  color: textColor,
                  fontSize,
                }}
              >
                {separator}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default RssTickerWidget;
