/**
 * Realtime Service for Player
 *
 * Unified realtime subscriptions for the TV player.
 * Replaces polling with instant WebSocket updates via Supabase Realtime.
 *
 * @module services/realtimeService
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('RealtimeService');

// Active subscriptions
const subscriptions = new Map();

// Subscription status
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 3000;

/**
 * Subscribe to device commands (refresh, restart, screenshot, etc.)
 * @param {string} deviceId - Device UUID
 * @param {function} onCommand - Callback when command received
 * @returns {function} Unsubscribe function
 */
export function subscribeToDeviceCommands(deviceId, onCommand) {
  if (!deviceId || !onCommand) {
    logger.warn('Invalid params for subscribeToDeviceCommands');
    return () => {};
  }

  const channelName = `device_commands:${deviceId}`;

  // Don't duplicate subscriptions
  if (subscriptions.has(channelName)) {
    logger.debug('Already subscribed to', { channelName });
    return subscriptions.get(channelName).unsubscribe;
  }

  logger.info('Subscribing to device commands', { deviceId });

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'device_commands',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => {
        logger.debug('Command received', { command: payload.new });
        onCommand(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'device_commands',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => {
        // Also handle updates (e.g., command status changes)
        if (payload.new.status === 'pending') {
          logger.debug('Command updated', { command: payload.new });
          onCommand(payload.new);
        }
      }
    )
    .subscribe((status) => {
      logger.debug('Commands channel status', { status, channelName });
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        connectionAttempts = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handleReconnect(channelName);
      }
    });

  const unsubscribe = () => {
    logger.debug('Unsubscribing from', { channelName });
    supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  };

  subscriptions.set(channelName, { channel, unsubscribe, type: 'commands' });

  return unsubscribe;
}

/**
 * Subscribe to device refresh events (when device needs to reload content)
 * @param {string} deviceId - Device UUID
 * @param {function} onRefresh - Callback when refresh triggered
 * @returns {function} Unsubscribe function
 */
export function subscribeToDeviceRefresh(deviceId, onRefresh) {
  if (!deviceId || !onRefresh) {
    logger.warn('Invalid params for subscribeToDeviceRefresh');
    return () => {};
  }

  const channelName = `device_refresh:${deviceId}`;

  if (subscriptions.has(channelName)) {
    logger.debug('Already subscribed to', { channelName });
    return subscriptions.get(channelName).unsubscribe;
  }

  logger.info('Subscribing to device refresh', { deviceId });

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tv_devices',
        filter: `id=eq.${deviceId}`,
      },
      (payload) => {
        const { old: prev, new: current } = payload;

        // Trigger refresh if active_scene_id changed
        if (prev.active_scene_id !== current.active_scene_id) {
          logger.info('Scene changed', { sceneId: current.active_scene_id });
          onRefresh({ type: 'scene_change', sceneId: current.active_scene_id });
        }

        // Trigger refresh if explicitly requested
        if (current.needs_refresh && !prev.needs_refresh) {
          logger.info('Refresh requested');
          onRefresh({ type: 'refresh_requested' });
        }
      }
    )
    .subscribe((status) => {
      logger.debug('Refresh channel status', { status, channelName });
      if (status === 'SUBSCRIBED') {
        isConnected = true;
      }
    });

  const unsubscribe = () => {
    logger.debug('Unsubscribing from', { channelName });
    supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  };

  subscriptions.set(channelName, { channel, unsubscribe, type: 'refresh' });

  return unsubscribe;
}

/**
 * Subscribe to content updates (scene slides, design changes)
 * @param {string} sceneId - Scene UUID
 * @param {function} onUpdate - Callback when content updated
 * @returns {function} Unsubscribe function
 */
export function subscribeToContentUpdates(sceneId, onUpdate) {
  if (!sceneId || !onUpdate) {
    logger.warn('Invalid params for subscribeToContentUpdates');
    return () => {};
  }

  const channelName = `scene_content:${sceneId}`;

  if (subscriptions.has(channelName)) {
    logger.debug('Already subscribed to', { channelName });
    return subscriptions.get(channelName).unsubscribe;
  }

  logger.info('Subscribing to content updates', { sceneId });

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'scene_slides',
        filter: `scene_id=eq.${sceneId}`,
      },
      (payload) => {
        logger.debug('Slide change', { eventType: payload.eventType, slideId: payload.new?.id || payload.old?.id });
        onUpdate({
          type: 'slide_change',
          event: payload.eventType,
          slide: payload.new || payload.old,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scenes',
        filter: `id=eq.${sceneId}`,
      },
      (payload) => {
        logger.debug('Scene metadata change', { sceneId });
        onUpdate({
          type: 'scene_change',
          scene: payload.new,
        });
      }
    )
    .subscribe((status) => {
      logger.debug('Content channel status', { status, channelName });
      if (status === 'SUBSCRIBED') {
        isConnected = true;
      }
    });

  const unsubscribe = () => {
    logger.debug('Unsubscribing from', { channelName });
    supabase.removeChannel(channel);
    subscriptions.delete(channelName);
  };

  subscriptions.set(channelName, { channel, unsubscribe, type: 'content' });

  return unsubscribe;
}

/**
 * Subscribe to all player-relevant events for a device
 * Convenience function that sets up all subscriptions at once
 * @param {string} deviceId - Device UUID
 * @param {string} sceneId - Active scene UUID (optional)
 * @param {object} callbacks - Callback handlers
 * @returns {function} Unsubscribe all function
 */
export function subscribeToPlayer(deviceId, sceneId, callbacks) {
  const { onCommand, onRefresh, onContentUpdate } = callbacks;

  const unsubscribers = [];

  if (onCommand) {
    unsubscribers.push(subscribeToDeviceCommands(deviceId, onCommand));
  }

  if (onRefresh) {
    unsubscribers.push(subscribeToDeviceRefresh(deviceId, onRefresh));
  }

  if (sceneId && onContentUpdate) {
    unsubscribers.push(subscribeToContentUpdates(sceneId, onContentUpdate));
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Unsubscribe from all active subscriptions
 */
export function unsubscribeAll() {
  logger.info('Unsubscribing from all channels');

  subscriptions.forEach((sub, channelName) => {
    logger.debug('Removing channel', { channelName });
    supabase.removeChannel(sub.channel);
  });

  subscriptions.clear();
  isConnected = false;
}

/**
 * Get current subscription status
 * @returns {object} Status info
 */
export function getStatus() {
  return {
    isConnected,
    activeSubscriptions: subscriptions.size,
    channels: Array.from(subscriptions.keys()),
  };
}

/**
 * Handle reconnection logic
 */
function handleReconnect(channelName) {
  connectionAttempts++;

  if (connectionAttempts > MAX_RECONNECT_ATTEMPTS) {
    logger.error('Max reconnection attempts reached', { channelName });
    return;
  }

  logger.warn('Reconnecting channel', { channelName, attempt: connectionAttempts });

  setTimeout(() => {
    const sub = subscriptions.get(channelName);
    if (sub) {
      sub.channel.subscribe();
    }
  }, RECONNECT_DELAY_MS * connectionAttempts);
}

/**
 * Check if a specific subscription is active
 * @param {string} channelName - Channel name to check
 * @returns {boolean}
 */
export function isSubscribed(channelName) {
  return subscriptions.has(channelName);
}

export default {
  subscribeToDeviceCommands,
  subscribeToDeviceRefresh,
  subscribeToContentUpdates,
  subscribeToPlayer,
  unsubscribeAll,
  getStatus,
  isSubscribed,
};
