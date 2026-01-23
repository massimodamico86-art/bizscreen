/**
 * usePlayerPlayback - Playback timing and analytics hook
 *
 * Manages slide timing, video control, and playback analytics tracking.
 * Extracted from Player.jsx ViewPage as part of Phase 7 refactoring.
 *
 * @module player/hooks/usePlayerPlayback
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import * as analytics from '../../services/playerAnalyticsService';

const STORAGE_KEYS = {
  screenId: 'player_screen_id',
};

/**
 * Hook for managing playback timing and analytics in the player
 *
 * @param {Array} items - List of playlist items
 * @param {number} currentIndex - Current item index
 * @param {Object} content - Content object from usePlayerContent
 * @param {Function} advanceToNext - Function to advance to next item
 * @returns {Object} Playback state and handlers
 * @returns {Object} videoRef - Ref for video element
 * @returns {Object} timerRef - Ref for duration timer
 * @returns {Object} lastActivityRef - Ref for last activity timestamp
 * @returns {Object} lastVideoTimeRef - Ref for last video time (stuck detection)
 * @returns {Function} handleVideoEnd - Handler for video end event
 * @returns {Function} handleAdvanceToNext - Wrapper that includes analytics
 */
export function usePlayerPlayback(items, currentIndex, content, advanceToNext) {
  const logger = useLogger('usePlayerPlayback');

  // Refs for video and timers
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastVideoTimeRef = useRef(0);

  // Wrapper for advanceToNext that includes analytics tracking
  const handleAdvanceToNext = useCallback(() => {
    // End current playback tracking before advancing
    analytics.endPlaybackEvent();
    advanceToNext();
    // Update activity timestamp
    lastActivityRef.current = Date.now();
  }, [advanceToNext]);

  // Track playback analytics for playlist mode
  useEffect(() => {
    // RPC returns 'mode' field (playlist or layout)
    const mode = content?.mode || content?.type;
    if (mode !== 'playlist' || items.length === 0) return;
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    // Start tracking this item
    analytics.startPlaybackEvent({
      screenId,
      tenantId: content.screen?.tenant_id,
      locationId: content.screen?.location_id || null,
      playlistId: content.playlist?.id || null,
      layoutId: null,
      zoneId: null,
      mediaId: currentItem.mediaType !== 'app' ? currentItem.id : null,
      appId: currentItem.mediaType === 'app' ? currentItem.id : null,
      campaignId: content.campaign?.id || null,
      itemType: currentItem.mediaType === 'app' ? 'app' : 'media',
      itemName: currentItem.name,
    });

    // Cleanup: end tracking when component unmounts or item changes
    return () => {
      // Note: handleAdvanceToNext handles ending, but this catches unmount
    };
  }, [
    currentIndex,
    items,
    content?.type,
    content?.mode,
    content?.playlist?.id,
    content?.campaign?.id,
    content?.screen?.tenant_id,
    content?.screen?.location_id,
  ]);

  // Timer for image/document duration
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // For videos, let the onEnded handler advance
    if (currentItem.mediaType === 'video') {
      return;
    }

    // For images and other types, use duration timer
    const duration =
      (currentItem.duration || content?.playlist?.defaultDuration || 10) * 1000;
    timerRef.current = setTimeout(handleAdvanceToNext, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, items, content?.playlist?.defaultDuration, handleAdvanceToNext]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    handleAdvanceToNext();
  }, [handleAdvanceToNext]);

  return {
    videoRef,
    timerRef,
    lastActivityRef,
    lastVideoTimeRef,
    handleVideoEnd,
    handleAdvanceToNext,
  };
}
