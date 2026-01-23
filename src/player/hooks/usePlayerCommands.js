/**
 * usePlayerCommands - Custom hook for device command handling
 *
 * Extracted from ViewPage to handle:
 * - Command execution (reboot, reload, clear_cache, reset)
 * - Command result reporting
 * - Content reload on command
 *
 * @module player/hooks/usePlayerCommands
 */

import { useCallback } from 'react';
import { supabase } from '../../supabase';
import {
  reportCommandResult,
  clearCache,
} from '../../services/playerService';

// Storage keys
const STORAGE_KEYS = {
  screenId: 'player_screen_id',
  playlistId: 'player_playlist_id',
  contentHash: 'player_content_hash',
};

/**
 * Get resolved content from database RPC
 * @param {string} screenId - Screen UUID
 * @returns {Promise<Object>} Resolved content data
 */
async function getResolvedContent(screenId) {
  const { data, error } = await supabase.rpc('get_resolved_player_content', { p_screen_id: screenId });
  if (error) throw error;
  return data;
}

/**
 * Custom hook for handling device commands
 *
 * @param {string} screenId - Screen UUID from localStorage
 * @param {Function} setContent - State setter for content
 * @param {Function} setItems - State setter for playlist items
 * @param {Function} setCurrentIndex - State setter for current item index
 * @param {Function} navigate - React Router navigate function
 * @param {Object} logger - Logger instance
 * @returns {Object} Command handling function
 */
export function usePlayerCommands(screenId, setContent, setItems, setCurrentIndex, navigate, logger) {
  /**
   * Handle a device command
   * @param {Object} command - Command object with commandId and commandType
   */
  const handleCommand = useCallback(async (command) => {
    const { commandId, commandType } = command;

    try {
      switch (commandType) {
        case 'reboot':
          await reportCommandResult(commandId, true);
          setTimeout(() => window.location.reload(), 500);
          break;

        case 'reload':
          await reportCommandResult(commandId, true);
          if (screenId) {
            try {
              const newContent = await getResolvedContent(screenId);
              setContent(newContent);
              // New format uses 'type' instead of 'mode', and items are in playlist.items
              if (newContent.type === 'playlist') {
                setItems(newContent.playlist?.items || []);
                setCurrentIndex(0);
              }
            } catch (err) {
              logger.error('Content reload failed', { error: err });
            }
          }
          break;

        case 'clear_cache':
          await clearCache();
          await reportCommandResult(commandId, true);
          break;

        case 'reset':
          await clearCache();
          localStorage.clear();
          sessionStorage.clear();
          await reportCommandResult(commandId, true);
          setTimeout(() => window.location.reload(), 500);
          break;

        default:
          logger.warn('Unknown command', { commandType });
          await reportCommandResult(commandId, false, 'Unknown command');
      }
    } catch (err) {
      logger.error('Command execution failed', { error: err });
      await reportCommandResult(commandId, false, err.message);
    }
  }, [screenId, setContent, setItems, setCurrentIndex, logger]);

  return { handleCommand };
}
