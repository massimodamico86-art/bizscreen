// src/player/components/widgets/RssTickerWidget.jsx
// Scrolling news ticker widget for rendering RSS feed items on player screens
// GPU-accelerated CSS transform animation with seamless loop

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRssFeed } from '../../../services/rssFeedService';
import { cacheRssFeed, getCachedRssFeed } from '../../cacheService';
import { useWidgetData } from '../../hooks/useWidgetData.js';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';

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

  // Use orchestrator data with local cache fallback
  const activeItems = orchestratorData?.items || items;

  // Calculate animation duration based on content width
  useEffect(() => {
    if (!contentRef.current || activeItems.length === 0) {
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
  }, [activeItems, speed]);

  // No items: render nothing (silent)
  if (activeItems.length === 0) {
    return null;
  }

  // Duplicate items for seamless loop
  const tickerItems = [...activeItems, ...activeItems];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
      <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default RssTickerWidget;
