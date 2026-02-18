/**
 * VideoPlayer
 *
 * Reusable video player component for layout elements and scene blocks.
 * Handles both MP4 and HLS (.m3u8) URLs transparently.
 *
 * Features:
 * - MP4: direct <video> playback
 * - HLS: hls.js (light build) on non-Safari, native on Safari
 * - Automatic HLS error recovery (up to 3 fatal errors)
 * - Internal stall detection (30s without progress triggers recovery)
 * - Proper cleanup on unmount (hls.destroy())
 *
 * @module player/components/VideoPlayer
 */

import { useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js/dist/hls.light.min.js';

/**
 * Detect HLS URLs by .m3u8 suffix
 * @param {string} url - Video URL
 * @returns {boolean} True if URL is an HLS manifest
 */
function isHlsUrl(url) {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].split('#')[0];
  return cleanUrl.endsWith('.m3u8');
}

const MAX_HLS_ERRORS = 3;
const STALL_CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
const STALL_THRESHOLD_MS = 30000; // 30 seconds without progress = stall

/**
 * @param {Object} props
 * @param {string} props.url - Video URL (MP4 or .m3u8)
 * @param {'cover' | 'contain' | 'fill'} [props.fit='cover'] - Object fit
 * @param {number} [props.borderRadius=0] - Border radius in px
 * @param {number} [props.opacity=1] - Opacity (0-1)
 * @param {boolean} [props.loop=true] - Loop playback
 * @param {boolean} [props.muted=true] - Muted playback
 * @param {boolean} [props.autoplay=true] - Autoplay
 * @param {string} [props.posterUrl] - Poster image URL
 */
export default function VideoPlayer({
  url,
  fit = 'cover',
  borderRadius = 0,
  opacity = 1,
  loop = true,
  muted = true,
  autoplay = true,
  posterUrl,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const errorCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastProgressRef = useRef(Date.now());
  const stallIntervalRef = useRef(null);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    // Reset error count for new URL
    errorCountRef.current = 0;
    lastTimeRef.current = 0;
    lastProgressRef.current = Date.now();

    if (isHlsUrl(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return; // Non-fatal errors auto-recover

          errorCountRef.current++;
          if (errorCountRef.current > MAX_HLS_ERRORS) {
            // Too many errors, stop retrying
            hls.destroy();
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Network error: try to restart loading
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Media error: try to recover
              hls.recoverMediaError();
              break;
            default:
              // Unrecoverable error
              hls.destroy();
              break;
          }
        });

        // Reset error count on successful fragment load
        hls.on(Hls.Events.FRAG_LOADED, () => {
          errorCountRef.current = 0;
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = url;
      }
    } else {
      // Direct MP4 playback
      video.src = url;
    }

    return () => {
      destroyHls();
    };
  }, [url, destroyHls]);

  // Internal stall detection
  // Runs a 10-second interval that checks if video.currentTime has progressed.
  // If no progress for 30 seconds on a non-paused, non-ended video, it attempts
  // recovery via seek-and-play. This mirrors the existing useStuckDetection hook
  // pattern (same 30s threshold, same 10s check interval). Internal per-element
  // detection is correct for layout video elements because useStuckDetection
  // monitors a single videoRef at the page level (ViewPage) and cannot cover
  // multiple independent video zones in a layout.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    stallIntervalRef.current = setInterval(() => {
      if (!video || video.paused || video.ended) return;

      const currentTime = video.currentTime;

      if (currentTime === lastTimeRef.current) {
        // No progress since last check
        const stallDuration = Date.now() - lastProgressRef.current;

        if (stallDuration > STALL_THRESHOLD_MS) {
          // Stalled too long -- attempt recovery
          lastProgressRef.current = Date.now(); // Reset to avoid rapid retries
          // Self-assign triggers a seek to current position, forcing the browser to re-buffer
          // eslint-disable-next-line no-self-assign
          video.currentTime = video.currentTime;
          video.play().catch(() => {}); // Attempt to resume
        }
      } else {
        // Progress detected -- update tracking
        lastTimeRef.current = currentTime;
        lastProgressRef.current = Date.now();
      }
    }, STALL_CHECK_INTERVAL_MS);

    return () => {
      if (stallIntervalRef.current) {
        clearInterval(stallIntervalRef.current);
        stallIntervalRef.current = null;
      }
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoplay}
      muted={muted}
      loop={loop}
      playsInline
      poster={posterUrl || undefined}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        borderRadius: `${borderRadius}px`,
        opacity,
      }}
    />
  );
}

export { VideoPlayer };
