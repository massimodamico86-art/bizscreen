// src/player/components/ZonePlayer.jsx
// Single zone playback for multi-zone layouts
// Extracted from Player.jsx for maintainability

import { useState, useEffect, useRef, useCallback } from 'react';
import * as analytics from '../../services/playerAnalyticsService';
import { AppRenderer } from './AppRenderer';

/**
 * Zone Player - Plays content in a single zone (used by LayoutRenderer)
 * Handles content cycling, duration, and analytics for individual zones
 */
export function ZonePlayer({ zone, timezone, screenId, tenantId, layoutId, campaignId }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (zone.content?.type === 'playlist' && zone.content.items) {
      setItems(zone.content.items);
      setCurrentIndex(0);
    } else if (zone.content?.type === 'media' && zone.content.item) {
      setItems([zone.content.item]);
      setCurrentIndex(0);
    } else {
      setItems([]);
    }
  }, [zone]);

  // Track playback analytics for zone items
  useEffect(() => {
    if (items.length === 0 || !screenId) return;
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Start tracking this item
    analytics.startPlaybackEvent({
      screenId,
      tenantId,
      locationId: null,
      playlistId: zone.content?.playlist?.id || null,
      layoutId,
      zoneId: zone.id,
      mediaId: currentItem.mediaType !== 'app' ? currentItem.id : null,
      appId: currentItem.mediaType === 'app' ? currentItem.id : null,
      campaignId: campaignId || null,
      itemType: currentItem.mediaType === 'app' ? 'app' : 'media',
      itemName: currentItem.name,
    });

    // End tracking on cleanup
    return () => {
      analytics.endPlaybackEvent();
    };
  }, [currentIndex, items, screenId, tenantId, layoutId, zone.id, zone.content?.playlist?.id, campaignId]);

  const advanceToNext = useCallback(() => {
    if (items.length <= 1) return;
    analytics.endPlaybackEvent(); // End current before advancing
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  // Timer for duration-based advancement
  useEffect(() => {
    if (items.length === 0) return;
    const currentItem = items[currentIndex];
    if (!currentItem || currentItem.mediaType === 'video') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const duration = (currentItem.duration || zone.content?.playlist?.defaultDuration || 10) * 1000;
    timerRef.current = setTimeout(advanceToNext, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items, zone.content?.playlist?.defaultDuration, advanceToNext]);

  if (!zone.content || items.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>{zone.zone_name}</p>
          <p style={{ opacity: 0.5 }}>No content</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={advanceToNext}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'image' ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.name}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'app' ? (
        <AppRenderer item={currentItem} timezone={timezone} />
      ) : currentItem.mediaType === 'web_page' ? (
        <iframe
          key={currentItem.id}
          src={currentItem.url}
          title={currentItem.name}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e293b',
          color: 'white'
        }}>
          <p>{currentItem.name}</p>
        </div>
      )}
    </div>
  );
}

export default ZonePlayer;
