/**
 * VideoWallSync - Player-side video wall synchronization module
 *
 * Provides:
 * 1. useVideoWallSync(wallId, screenPosition, isLeader) - Realtime Broadcast sync hook
 * 2. VideoWallTransform - CSS transform wrapper for bezel-compensated content
 * 3. getWallTransform() - Pure function returning CSS style object
 *
 * Leader screens broadcast sync state every 500ms via Supabase Realtime Broadcast.
 * Follower screens listen and adjust playback index within 200ms of leader.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';

// --- 1. useVideoWallSync Hook ---

/**
 * Hook for video wall leader/follower synchronization via Supabase Realtime Broadcast.
 *
 * @param {string} wallId - UUID of the video wall
 * @param {{ row: number, col: number }} screenPosition - This screen's position in the grid
 * @param {boolean} isLeader - Whether this screen is the sync leader
 * @returns {{ broadcastSync: Function|null, onSyncReceived: { current: Function|null }, isSubscribed: boolean }}
 */
export function useVideoWallSync(wallId, screenPosition, isLeader) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef(null);
  const onSyncReceivedRef = useRef(null);

  useEffect(() => {
    if (!wallId) return;

    const channel = supabase.channel(`video-wall:${wallId}`, {
      config: { broadcast: { self: false } },
    });

    // Listen for sync events (follower behavior)
    if (!isLeader) {
      channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
        if (!payload) return;

        const drift = Date.now() - payload.timestamp;

        // Only process if drift is within acceptable range (< 200ms)
        if (drift < 200 && onSyncReceivedRef.current) {
          onSyncReceivedRef.current(payload);
        }
      });
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsSubscribed(true);

        // Announce readiness
        channel.send({
          type: 'broadcast',
          event: 'ready',
          payload: {
            screenPosition,
            isLeader,
          },
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallId, isLeader]);

  /**
   * Broadcast sync state to all followers. Called by the leader every 500ms.
   *
   * @param {{ currentIndex: number, itemStartTime: number }} state
   */
  const broadcastSync = useCallback(
    (state) => {
      if (!isLeader || !channelRef.current) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          currentIndex: state.currentIndex,
          timestamp: Date.now(),
          itemStartTime: state.itemStartTime,
        },
      });
    },
    [isLeader]
  );

  return {
    broadcastSync: isLeader ? broadcastSync : null,
    onSyncReceived: onSyncReceivedRef,
    isSubscribed,
  };
}

// --- 2. getWallTransform Utility ---

/**
 * Pure function returning CSS style object for bezel-compensated video wall transform.
 *
 * Each screen shows only its portion of the full content, scaled up so the
 * complete content spans all screens in the wall.
 *
 * @param {{ row: number, col: number, rows: number, cols: number, bezelGapX: number, bezelGapY: number }} params
 * @returns {Object} CSS style object
 */
export function getWallTransform({ row, col, rows, cols, bezelGapX = 0, bezelGapY = 0 }) {
  const scaleX = cols;
  const scaleY = rows;

  // Calculate the offset for this screen's portion
  // Each screen shows 1/cols of the width and 1/rows of the height
  // Bezel compensation adds extra offset to account for physical bezels
  const translateX = -(col * 100) - (col * bezelGapX) / cols;
  const translateY = -(row * 100) - (row * bezelGapY) / rows;

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    transformOrigin: '0 0',
    transform: `scale(${scaleX}, ${scaleY}) translate(${translateX}%, ${translateY}%)`,
  };
}

// --- 3. VideoWallTransform Component ---

/**
 * Wrapper component that applies bezel-compensated CSS transform to show
 * only this screen's portion of the full content.
 *
 * @param {Object} props
 * @param {number} props.row - This screen's row position (0-indexed)
 * @param {number} props.col - This screen's column position (0-indexed)
 * @param {number} props.rows - Total rows in the wall
 * @param {number} props.cols - Total columns in the wall
 * @param {number} [props.bezelGapX=0] - Horizontal bezel gap in mm
 * @param {number} [props.bezelGapY=0] - Vertical bezel gap in mm
 * @param {React.ReactNode} props.children - Content to transform
 */
export function VideoWallTransform({
  row,
  col,
  rows,
  cols,
  bezelGapX = 0,
  bezelGapY = 0,
  children,
}) {
  const style = getWallTransform({ row, col, rows, cols, bezelGapX, bezelGapY });

  return (
    <div style={style}>
      {children}
    </div>
  );
}
