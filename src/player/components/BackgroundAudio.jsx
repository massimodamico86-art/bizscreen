/**
 * BackgroundAudio - Thin component wrapper around useBackgroundAudio
 *
 * Placed in the ViewPage render tree so it mounts/unmounts with the player lifecycle.
 * Renders no visible DOM output.
 *
 * @module player/components/BackgroundAudio
 */

import { useBackgroundAudio } from '../hooks/useBackgroundAudio';

/**
 * Background audio player component.
 * Uses the useBackgroundAudio hook for Audio object management.
 * Renders null -- no visible DOM output.
 *
 * @param {Object} props
 * @param {string|null} props.audioUrl - URL of the audio file
 * @param {number} props.volume - Volume level 0-100
 * @param {boolean} props.isPlaying - Whether audio should be playing
 */
export function BackgroundAudio({ audioUrl, volume, isPlaying }) {
  useBackgroundAudio({ audioUrl, volume, isPlaying });
  return null;
}
