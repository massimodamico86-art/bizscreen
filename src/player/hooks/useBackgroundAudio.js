/**
 * useBackgroundAudio - Hook for managing background audio playback
 *
 * Creates and manages an Audio object (not a DOM element) that plays
 * continuously behind visual content transitions. Handles autoplay
 * policy restrictions gracefully.
 *
 * @module player/hooks/useBackgroundAudio
 */

import { useEffect, useRef, useState } from 'react';
import { createScopedLogger } from '../../services/loggingService';

const logger = createScopedLogger('Player:BackgroundAudio');

/**
 * Hook that manages background audio playback via the Web Audio API.
 *
 * @param {Object} params
 * @param {string|null} params.audioUrl - URL of the audio file, or null/falsy for no audio
 * @param {number} params.volume - Volume level 0-100
 * @param {boolean} params.isPlaying - Whether audio should be playing
 * @returns {{ isAudioPlaying: boolean }} Current playback status
 */
export function useBackgroundAudio({ audioUrl, volume, isPlaying }) {
  const audioRef = useRef(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Initialize Audio object on mount
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.preload = 'auto';

    logger.debug('Audio object initialized');

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
        logger.debug('Audio object cleaned up');
      }
    };
  }, []);

  // Handle audioUrl changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (!audioUrl) {
      // No audio URL -- pause and clear source
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsAudioPlaying(false);
      return;
    }

    // Only update src if it actually changed
    if (audioRef.current.src !== audioUrl) {
      const wasPlaying = !audioRef.current.paused;
      if (wasPlaying) {
        audioRef.current.pause();
      }

      audioRef.current.src = audioUrl;
      logger.info('Audio source updated', { audioUrl });

      // Resume playback if isPlaying is true
      if (isPlaying) {
        audioRef.current.play().then(() => {
          setIsAudioPlaying(true);
        }).catch((err) => {
          logger.debug('Autoplay prevented on source change', { error: err.message });
          setIsAudioPlaying(false);
        });
      }
    }
  }, [audioUrl, isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = (volume ?? 100) / 100;
  }, [volume]);

  // Handle isPlaying changes
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.play().then(() => {
        setIsAudioPlaying(true);
        logger.debug('Audio playback started');
      }).catch((err) => {
        logger.debug('Autoplay prevented', { error: err.message });
        setIsAudioPlaying(false);
      });
    } else {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      logger.debug('Audio playback paused');
    }
  }, [isPlaying, audioUrl]);

  return { isAudioPlaying };
}
