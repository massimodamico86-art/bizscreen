// src/player/pages/ViewPage.jsx - Player View Page (extracted from Player.jsx)
// Full-screen slideshow playback with offline support, kiosk mode, and stuck detection
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import * as analytics from '../../services/playerAnalyticsService';


import {
  pollForCommand,
  initOfflineCache,
  calculateBackoff,
  cacheKioskPinHashes,
  COMMAND_POLL_INTERVAL,
  HEARTBEAT_INTERVAL
} from '../../services/playerService';
import { initOfflineService } from '../offlineService';
import {
  initTracking,
  stopTracking,
  trackSceneStart,
  trackSceneEnd,
  trackPlayerOnline,
  trackPlayerOffline,
  isInitialized as isTrackingInitialized,
} from '../../services/playbackTrackingService';
import {
  subscribeToDeviceCommands,
  subscribeToDeviceRefresh,
} from '../../services/realtimeService';
import { useLogger } from '../../hooks/useLogger.js';
import { createScopedLogger } from '../../services/loggingService.js';
import {
  usePlayerContent,
  usePlayerHeartbeat,
  usePlayerCommands,
  useKioskMode,
  usePlayerPlayback,
  useTapSequence,
  useStuckDetection,
} from '../hooks';
import { AppRenderer } from '../components/AppRenderer';

// Module-level logger for utility functions
const retryLogger = createScopedLogger('Player:retry');

// Storage keys
const STORAGE_KEYS = {
  screenId: 'player_screen_id',
  playlistId: 'player_playlist_id',
  contentHash: 'player_content_hash',
  kioskMode: 'player_kiosk_mode',
  kioskPassword: 'player_kiosk_password',
  lastActivity: 'player_last_activity'
};

// Player version for heartbeats
// Phase 6: Updated with media preloading and real-time sync
const PLAYER_VERSION = '1.2.0';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000
};

/**
 * Retry a function with exponential backoff
 * Uses calculateBackoff from playerService for full jitter (0-100%)
 * @param fn
 * @param maxRetries
 */
async function retryWithBackoff(fn, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Use calculateBackoff from playerService (0-100% full jitter)
        const delay = calculateBackoff(attempt, RETRY_CONFIG.baseDelayMs, RETRY_CONFIG.maxDelayMs);
        retryLogger.debug('Retry attempt', { attempt: attempt + 1, maxRetries, delayMs: Math.round(delay) });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Player View Page - Full-screen slideshow playback
 * Refactored to use extracted hooks for kiosk mode and playback
 */
export function ViewPage() {
  const logger = useLogger('ViewPage');
  const navigate = useNavigate();
  const screenId = localStorage.getItem(STORAGE_KEYS.screenId);

  // Content hook - manages all content state, loading, and polling
  const {
    content,
    items,
    currentIndex,
    loading,
    error,
    connectionStatus,
    isOfflineMode,
    loadContent,
    advanceToNext,
    setContent,
    setItems,
    setCurrentIndex,
    loadContentRef,
    lastActivityRef,
  } = usePlayerContent(screenId, navigate);

  // Kiosk mode hook - manages kiosk state, fullscreen, password/PIN exit
  const {
    kioskMode,
    showKioskExit,
    showPinEntry,
    kioskPasswordInput,
    kioskPasswordError,
    setKioskPasswordInput,
    handleKioskExit,
    handlePinExit,
    cancelKioskExit,
    showPinEntryDialog,
    dismissPinEntry,
  } = useKioskMode();

  // Tap sequence for hidden kiosk exit trigger (5 taps in bottom-right)
  const { handleTap: handleExitTap } = useTapSequence({
    requiredTaps: 5,
    timeoutMs: 2000,
    onTrigger: showPinEntryDialog,
  });

  // Playback hook - manages timing, video control, analytics
  const {
    videoRef,
    timerRef,
    lastVideoTimeRef,
    handleVideoEnd,
    handleAdvanceToNext,
  } = usePlayerPlayback(items, currentIndex, content, advanceToNext);

  // ViewPage-specific refs
  const contentContainerRef = useRef(null);
  const advanceToNextRef = useRef(null);

  // Commands hook - handles device commands
  const { handleCommand } = usePlayerCommands(
    screenId,
    setContent,
    setItems,
    setCurrentIndex,
    navigate,
    logger
  );

  // Heartbeat hook - handles device status updates and screenshots
  usePlayerHeartbeat(screenId, loadContentRef, contentContainerRef);

  // Stuck detection hook - monitors video and page activity
  useStuckDetection({
    videoRef,
    lastVideoTimeRef,
    lastActivityRef,
    onVideoStuck: () => {
      logger.warn('Video stuck detected, attempting recovery...');
      try {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(err => logger.error('Video play failed', { error: err }));
      } catch (err) {
        logger.error('Video recovery failed', { error: err });
        advanceToNextRef.current?.();
      }
    },
    onPageStuck: () => {
      logger.warn('Player inactive for too long, reloading...');
      window.location.reload();
    },
  });

  // Fetch and cache PIN hashes for offline validation
  useEffect(() => {
    if (!screenId || !kioskMode) return;

    const fetchPinHashes = async () => {
      try {
        const { data, error } = await supabase.rpc('get_device_kiosk_pins', {
          p_device_id: screenId
        });
        if (data && !error) {
          cacheKioskPinHashes(data.device_pin_hash, data.master_pin_hash);
        }
      } catch (err) {
        logger.debug('PIN hash fetch failed (offline?)', { error: err });
      }
    };

    fetchPinHashes();
    const interval = setInterval(fetchPinHashes, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [screenId, kioskMode, logger]);

  // Initialize analytics session on mount
  useEffect(() => {
    analytics.initSession();
    return () => {
      analytics.stopSession();
    };
  }, []);

  // Initialize offline cache and service worker on mount
  useEffect(() => {
    const init = async () => {
      // Initialize IndexedDB cache
      try {
        await initOfflineCache();
        logger.info('Offline cache initialized');
      } catch (err) {
        logger.warn('Failed to initialize offline cache', { error: err });
      }

      // Initialize enhanced offline service and service worker
      try {
        await initOfflineService();
        logger.info('Offline service initialized');
      } catch (err) {
        logger.warn('Failed to initialize offline service', { error: err });
      }
    };
    init();
  }, []);

  // Initialize playback tracking and track scene changes
  // Ref to track previous scene ID for change detection
  const prevSceneIdRef = useRef(null);

  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!content || !screenId) return;

    const tenantId = content.screen?.tenant_id;
    const groupId = content.screen?.screen_group_id;
    const locationId = content.screen?.location_id;
    const sceneId = content.scene?.id;

    // Initialize tracking if not already done
    if (!isTrackingInitialized() && tenantId) {
      initTracking({
        deviceId: screenId,
        tenantId,
        groupId,
        locationId,
      });
      logger.info('Playback tracking initialized');
      trackPlayerOnline();
    }

    // Track scene changes
    if (content.content_source === 'scene' && sceneId) {
      if (prevSceneIdRef.current !== sceneId) {
        // Scene changed - track the new scene
        logger.info('Scene changed', { from: prevSceneIdRef.current, to: sceneId });
        trackSceneStart({
          sceneId,
          groupId,
          scheduleId: content.schedule?.id,
        });
        prevSceneIdRef.current = sceneId;
      }
    } else if (prevSceneIdRef.current) {
      // Switched away from scene mode
      trackSceneEnd();
      prevSceneIdRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (isTrackingInitialized()) {
        trackSceneEnd();
        stopTracking();
      }
    };
  }, [content]);

  // Track online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      if (isTrackingInitialized()) {
        trackPlayerOnline();
      }
    };

    const handleOffline = () => {
      if (isTrackingInitialized()) {
        trackPlayerOffline();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Realtime command subscription - instant WebSocket updates instead of polling
  // Falls back to polling if WebSocket connection fails
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    let unsubscribeCommands = null;
    let unsubscribeRefresh = null;
    let fallbackPollInterval = null;

    // Handle incoming commands via realtime
    const onCommand = async (command) => {
      logger.debug('Realtime command received', { command });
      await handleCommand(command);
    };

    // Handle refresh events via realtime
    const onRefresh = async (event) => {
      logger.debug('Realtime refresh event', { event });
      if (event.type === 'scene_change' || event.type === 'refresh_requested') {
        loadContentRef.current?.(screenId, false);
      }
    };

    // Set up realtime subscriptions
    try {
      unsubscribeCommands = subscribeToDeviceCommands(screenId, onCommand);
      unsubscribeRefresh = subscribeToDeviceRefresh(screenId, onRefresh);
      logger.info('Realtime subscriptions active');
    } catch (err) {
      logger.warn('Realtime subscription failed, falling back to polling', { error: err });

      // Fallback to polling if realtime fails
      const pollCommands = async () => {
        try {
          const command = await pollForCommand(screenId);
          if (command) {
            logger.debug('Polled command', { command });
            await handleCommand(command);
          }
        } catch (pollErr) {
          logger.error('Command poll error', { error: pollErr });
        }
      };

      pollCommands();
      fallbackPollInterval = setInterval(pollCommands, COMMAND_POLL_INTERVAL);
    }

    return () => {
      if (unsubscribeCommands) unsubscribeCommands();
      if (unsubscribeRefresh) unsubscribeRefresh();
      if (fallbackPollInterval) clearInterval(fallbackPollInterval);
    };
  }, []);

  // Keep ref updated for use in stuck detection callback
  useEffect(() => {
    advanceToNextRef.current = handleAdvanceToNext;
  }, [handleAdvanceToNext]);

  // Disconnect and return to pairing
  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEYS.screenId);
    localStorage.removeItem(STORAGE_KEYS.playlistId);
    localStorage.removeItem(STORAGE_KEYS.contentHash);
    navigate('/player', { replace: true });
  };

  // Check if we have any content to display
  // RPC returns 'mode' field (playlist or layout)
  const contentMode = content?.mode || content?.type;
  const hasContent = contentMode === 'layout'
    ? (content.layout && content.layout.zones?.length > 0)
    : (items.length > 0);

  // Loading state
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #333',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          `}</style>
          <p style={{ fontSize: '1.25rem' }}>Loading content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: '#ef4444',
            borderRadius: '50%',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Error</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={handleDisconnect}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Re-pair Device
          </button>
        </div>
      </div>
    );
  }

  // No content assigned
  if (!hasContent) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '5rem',
            height: '5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '1.25rem',
            margin: '0 auto 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {content?.screen?.name || 'Screen'} Connected
          </h2>
          <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
            No content assigned yet
          </p>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>
            Assign a playlist, layout, or schedule from your BizScreen dashboard
          </p>
          <button
            onClick={handleDisconnect}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Scene mode - render scene slides with block-based designs
  // content_source === 'scene' when active_scene_id is set
  if (content.content_source === 'scene' && content.scene) {
    return (
      <div
        ref={contentContainerRef}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000',
          overflow: 'hidden'
        }}
      >
        <SceneRenderer
          scene={content.scene}
          screenId={localStorage.getItem(STORAGE_KEYS.screenId)}
          tenantId={content.screen?.tenant_id}
        />

        {/* Connection status indicator */}
        {connectionStatus !== 'connected' && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: connectionStatus === 'reconnecting' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '0.75rem',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <div style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              background: 'currentColor',
              animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s infinite' : 'none'
            }} />
            {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </div>
        )}

        {/* Scene indicator */}
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'rgba(139, 92, 246, 0.7)',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          opacity: 0.5
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          {content.scene.name}
        </div>

        {/* Offline mode watermark */}
        {isOfflineMode && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.8)',
            borderRadius: '0.25rem',
            color: 'white',
            fontSize: '0.625rem',
            fontFamily: 'system-ui, sans-serif',
            opacity: 0.7
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Offline Mode - Playing Cached Content
          </div>
        )}

        {/* Hidden disconnect button */}
        {!kioskMode && (
          <button
            onClick={handleDisconnect}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = 1}
            onMouseLeave={(e) => e.target.style.opacity = 0}
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  // Layout mode - render multi-zone layout
  // New format uses 'type' instead of 'mode', 'screen' instead of 'device'
  if (content.type === 'layout') {
    return (
      <div
        ref={contentContainerRef}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000',
          overflow: 'hidden'
        }}
      >
        <LayoutRenderer
          layout={content.layout}
          timezone={content.screen?.timezone}
          screenId={localStorage.getItem(STORAGE_KEYS.screenId)}
          tenantId={content.screen?.tenant_id}
          campaignId={content.campaign?.id}
        />

        {/* Connection status indicator */}
        {connectionStatus !== 'connected' && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: connectionStatus === 'reconnecting' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '0.75rem',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <div style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              background: 'currentColor',
              animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s infinite' : 'none'
            }} />
            {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </div>
        )}

        {/* Campaign indicator (debug mode) */}
        {content.campaign && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.9)',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '0.625rem',
            fontFamily: 'system-ui, sans-serif',
            opacity: 0.7
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Campaign: {content.campaign.name}
          </div>
        )}

        {/* Offline mode watermark */}
        {isOfflineMode && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.8)',
            borderRadius: '0.25rem',
            color: 'white',
            fontSize: '0.625rem',
            fontFamily: 'system-ui, sans-serif',
            opacity: 0.7
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Offline Mode - Playing Cached Content
          </div>
        )}

        {/* Hidden disconnect button */}
        <button
          onClick={handleDisconnect}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Current item to display
  const currentItem = items[currentIndex];

  return (
    <div
      ref={contentContainerRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        overflow: 'hidden'
      }}
    >
      {/* Media display */}
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={() => handleAdvanceToNext()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      ) : currentItem.mediaType === 'image' ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.name}
          onError={() => handleAdvanceToNext()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      ) : currentItem.mediaType === 'web_page' ? (
        <iframe
          key={currentItem.id}
          src={currentItem.url}
          title={currentItem.name}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      ) : currentItem.mediaType === 'app' ? (
        // App rendering (clock, web page app, etc.)
        <AppRenderer
          key={currentItem.id}
          item={currentItem}
          timezone={content?.screen?.timezone}
        />
      ) : (
        // Fallback for documents and other types
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '6rem',
              height: '6rem',
              background: '#1e293b',
              borderRadius: '1rem',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p style={{ color: '#94a3b8' }}>{currentItem.name}</p>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: connectionStatus === 'reconnecting' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '0.75rem',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 10
        }}>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: 'currentColor',
            animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s infinite' : 'none'
          }} />
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
        </div>
      )}

      {/* Progress indicator (small dots at bottom) */}
      {items.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          opacity: 0.6
        }}>
          {items.slice(0, Math.min(items.length, 10)).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentIndex ? '1.5rem' : '0.5rem',
                height: '0.5rem',
                borderRadius: '0.25rem',
                backgroundColor: idx === currentIndex ? '#3b82f6' : '#fff',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
          {items.length > 10 && (
            <span style={{ color: '#fff', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
              +{items.length - 10}
            </span>
          )}
        </div>
      )}

      {/* Campaign indicator (debug mode) */}
      {content?.campaign && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'rgba(139, 92, 246, 0.9)',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          opacity: 0.7,
          zIndex: 10
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Campaign: {content.campaign.name}
        </div>
      )}

      {/* Hidden disconnect button (press 'D' key) - disabled in kiosk mode */}
      {!kioskMode && (
        <button
          onClick={handleDisconnect}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
        >
          Disconnect
        </button>
      )}

      {/* Offline mode watermark */}
      {isOfflineMode && (
        <div style={{
          position: 'absolute',
          bottom: '2.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(239, 68, 68, 0.8)',
          borderRadius: '0.25rem',
          color: 'white',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          opacity: 0.7,
          zIndex: 10
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Offline Mode - Playing Cached Content
        </div>
      )}

      {/* Kiosk mode indicator */}
      {kioskMode && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.5rem',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '0.25rem',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.5rem',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 10
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Kiosk
        </div>
      )}

      {/* Hidden tap zone for kiosk exit (5 taps triggers PIN entry) */}
      {kioskMode && (
        <div
          onClick={handleExitTap}
          onTouchEnd={handleExitTap}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '100px',
            height: '100px',
            zIndex: 100,
          }}
          aria-hidden="true"
        />
      )}

      {/* PIN entry overlay for kiosk exit */}
      {showPinEntry && (
        <PinEntry
          onValidate={handlePinExit}
          onDismiss={dismissPinEntry}
          onSuccess={() => {}}
        />
      )}

      {/* Kiosk exit dialog (legacy password method) */}
      {showKioskExit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '20rem',
            width: '90%',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              Exit Kiosk Mode
            </h3>
            <p style={{
              color: '#64748b',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {localStorage.getItem(STORAGE_KEYS.kioskPassword)
                ? 'Enter the exit password to leave kiosk mode'
                : 'Are you sure you want to exit kiosk mode?'
              }
            </p>

            {localStorage.getItem(STORAGE_KEYS.kioskPassword) && (
              <input
                type="password"
                value={kioskPasswordInput}
                onChange={(e) => setKioskPasswordInput(e.target.value)}
                placeholder="Password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  marginBottom: '0.5rem',
                  boxSizing: 'border-box'
                }}
              />
            )}

            {kioskPasswordError && (
              <p style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                {kioskPasswordError}
              </p>
            )}

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem'
            }}>
              <button
                onClick={cancelKioskExit}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleKioskExit}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
