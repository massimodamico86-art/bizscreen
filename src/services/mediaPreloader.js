import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('MediaPreloader');

/**
 * Media Preloader Service
 *
 * Preloads images and videos before slide transitions to prevent
 * blank flicker on TV screens. Uses Image() objects and Promises
 * to ensure all media is loaded before displaying.
 */

// Cache of already loaded images (URL -> load status)
const loadedImages = new Map();
const loadedVideos = new Map();

// Loading queue to prevent duplicate loads
const loadingQueue = new Map();

// Bandwidth detection state
let lastBandwidth = null;
let lastBandwidthCheck = 0;
const BANDWIDTH_CHECK_INTERVAL = 60000; // Re-check every 60 seconds

/**
 * Network quality levels
 */
export const BANDWIDTH_LEVELS = {
  FAST_4G: 'fast-4g',   // > 10 Mbps
  FOUR_G: '4g',          // 4-10 Mbps
  THREE_G: '3g',         // 1-4 Mbps
  TWO_G: '2g',           // 300 Kbps - 1 Mbps
  SLOW_2G: 'slow-2g',    // < 300 Kbps
  UNKNOWN: 'unknown',
};

/**
 * Detect current network bandwidth
 * Uses Navigator.connection API if available, otherwise performs a timing probe
 * @returns {Promise<{level: string, downlink: number|null, effectiveType: string|null}>}
 */
export async function detectBandwidth() {
  const now = Date.now();

  // Return cached result if fresh
  if (lastBandwidth && (now - lastBandwidthCheck) < BANDWIDTH_CHECK_INTERVAL) {
    return lastBandwidth;
  }

  let result = {
    level: BANDWIDTH_LEVELS.UNKNOWN,
    downlink: null,
    effectiveType: null,
    rtt: null,
    saveData: false,
  };

  // Try Navigator.connection API (Chrome/Android)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    result.effectiveType = connection.effectiveType;
    result.downlink = connection.downlink; // Mbps
    result.rtt = connection.rtt; // ms
    result.saveData = connection.saveData || false;

    // Map effectiveType to our levels
    switch (connection.effectiveType) {
      case '4g':
        result.level = connection.downlink > 10 ? BANDWIDTH_LEVELS.FAST_4G : BANDWIDTH_LEVELS.FOUR_G;
        break;
      case '3g':
        result.level = BANDWIDTH_LEVELS.THREE_G;
        break;
      case '2g':
        result.level = BANDWIDTH_LEVELS.TWO_G;
        break;
      case 'slow-2g':
        result.level = BANDWIDTH_LEVELS.SLOW_2G;
        break;
      default:
        result.level = BANDWIDTH_LEVELS.FOUR_G; // Default assumption
    }
  } else {
    // Fallback: timing probe with a small test
    try {
      const probeResult = await performBandwidthProbe();
      result.level = probeResult.level;
      result.downlink = probeResult.downlink;
    } catch {
      result.level = BANDWIDTH_LEVELS.FOUR_G; // Default assumption
    }
  }

  lastBandwidth = result;
  lastBandwidthCheck = now;

  logger.info('Bandwidth detected:', result.level, result.downlink ? `(${result.downlink} Mbps)` : '');

  return result;
}

/**
 * Perform a bandwidth probe by timing a small fetch
 * @returns {Promise<{level: string, downlink: number}>}
 */
async function performBandwidthProbe() {
  // Use a small, cacheable resource to test speed
  // We fetch a small data URL to avoid cross-origin issues
  const testSize = 10000; // ~10KB test
  const testData = 'x'.repeat(testSize);
  const blob = new Blob([testData], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const startTime = performance.now();

  try {
    await fetch(url, { cache: 'no-store' });
    const endTime = performance.now();
    URL.revokeObjectURL(url);

    const durationMs = endTime - startTime;
    const bitsPerSecond = (testSize * 8) / (durationMs / 1000);
    const mbps = bitsPerSecond / 1_000_000;

    let level;
    if (mbps > 10) {
      level = BANDWIDTH_LEVELS.FAST_4G;
    } else if (mbps > 4) {
      level = BANDWIDTH_LEVELS.FOUR_G;
    } else if (mbps > 1) {
      level = BANDWIDTH_LEVELS.THREE_G;
    } else if (mbps > 0.3) {
      level = BANDWIDTH_LEVELS.TWO_G;
    } else {
      level = BANDWIDTH_LEVELS.SLOW_2G;
    }

    return { level, downlink: Math.round(mbps * 100) / 100 };
  } catch {
    URL.revokeObjectURL(url);
    return { level: BANDWIDTH_LEVELS.FOUR_G, downlink: null };
  }
}

/**
 * Get preload settings based on bandwidth
 * @param {string} bandwidthLevel - Bandwidth level
 * @returns {Object} Preload settings
 */
export function getPreloadSettings(bandwidthLevel) {
  switch (bandwidthLevel) {
    case BANDWIDTH_LEVELS.FAST_4G:
      return {
        preloadVideos: true,
        videoPreloadType: 'auto', // Full preload
        preloadAhead: 3, // Slides
        imageQuality: 'high',
        timeout: 15000,
      };
    case BANDWIDTH_LEVELS.FOUR_G:
      return {
        preloadVideos: true,
        videoPreloadType: 'metadata',
        preloadAhead: 2,
        imageQuality: 'high',
        timeout: 12000,
      };
    case BANDWIDTH_LEVELS.THREE_G:
      return {
        preloadVideos: true,
        videoPreloadType: 'metadata',
        preloadAhead: 1,
        imageQuality: 'medium',
        timeout: 20000,
      };
    case BANDWIDTH_LEVELS.TWO_G:
      return {
        preloadVideos: false,
        videoPreloadType: 'none',
        preloadAhead: 1,
        imageQuality: 'low',
        timeout: 30000,
      };
    case BANDWIDTH_LEVELS.SLOW_2G:
      return {
        preloadVideos: false,
        videoPreloadType: 'none',
        preloadAhead: 0,
        imageQuality: 'thumbnail',
        timeout: 45000,
      };
    default:
      return {
        preloadVideos: true,
        videoPreloadType: 'metadata',
        preloadAhead: 2,
        imageQuality: 'high',
        timeout: 15000,
      };
  }
}

/**
 * Clear cached bandwidth result (force re-detection)
 */
export function clearBandwidthCache() {
  lastBandwidth = null;
  lastBandwidthCheck = 0;
}

/**
 * Preload a single image
 * @param {string} url - Image URL to preload
 * @param {number} timeout - Timeout in ms (default 10s)
 * @returns {Promise<{url: string, success: boolean, cached: boolean}>}
 */
export function preloadImage(url, timeout = 10000) {
  if (!url) {
    return Promise.resolve({ url, success: false, cached: false, error: 'No URL provided' });
  }

  // Already loaded
  if (loadedImages.has(url)) {
    return Promise.resolve({ url, success: true, cached: true });
  }

  // Currently loading
  if (loadingQueue.has(url)) {
    return loadingQueue.get(url);
  }

  // Start loading
  const promise = new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      loadingQueue.delete(url);
      resolve({ url, success: false, cached: false, error: 'Timeout' });
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      loadedImages.set(url, true);
      loadingQueue.delete(url);
      resolve({ url, success: true, cached: false });
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      loadingQueue.delete(url);
      resolve({ url, success: false, cached: false, error: 'Load error' });
    };

    img.src = url;
  });

  loadingQueue.set(url, promise);
  return promise;
}

/**
 * Preload a video (load metadata only)
 * @param {string} url - Video URL to preload
 * @param {number} timeout - Timeout in ms (default 15s)
 * @returns {Promise<{url: string, success: boolean, cached: boolean}>}
 */
export function preloadVideo(url, timeout = 15000) {
  if (!url) {
    return Promise.resolve({ url, success: false, cached: false, error: 'No URL provided' });
  }

  // Already loaded
  if (loadedVideos.has(url)) {
    return Promise.resolve({ url, success: true, cached: true });
  }

  // Currently loading
  const videoKey = `video_${url}`;
  if (loadingQueue.has(videoKey)) {
    return loadingQueue.get(videoKey);
  }

  // Start loading (just metadata)
  const promise = new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const timeoutId = setTimeout(() => {
      loadingQueue.delete(videoKey);
      resolve({ url, success: false, cached: false, error: 'Timeout' });
    }, timeout);

    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      loadedVideos.set(url, true);
      loadingQueue.delete(videoKey);
      resolve({ url, success: true, cached: false });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      loadingQueue.delete(videoKey);
      resolve({ url, success: false, cached: false, error: 'Load error' });
    };

    video.src = url;
  });

  loadingQueue.set(videoKey, promise);
  return promise;
}

/**
 * Extract all media URLs from a slide design
 * @param {Object} design - Slide design JSON
 * @returns {{images: string[], videos: string[]}}
 */
export function extractMediaUrls(design) {
  const images = [];
  const videos = [];

  if (!design) return { images, videos };

  // Background image
  if (design.background?.type === 'image' && design.background?.url) {
    images.push(design.background.url);
  }

  // Block media
  (design.blocks || []).forEach(block => {
    if (block.type === 'image' && block.props?.url) {
      images.push(block.props.url);
    }
    if (block.type === 'video' && block.props?.url) {
      videos.push(block.props.url);
    }
  });

  return { images, videos };
}

/**
 * Preload all media for a single slide
 * @param {Object} slide - Slide object with design_json
 * @param {Object} options - Preload options
 * @returns {Promise<{slideId: string, success: boolean, results: Object[]}>}
 */
export async function preloadSlide(slide, options = {}) {
  const { timeout = 10000, includeVideos = true } = options;
  const design = slide?.design_json || slide?.design || slide;
  const slideId = slide?.id || 'unknown';

  const { images, videos } = extractMediaUrls(design);

  const results = [];

  // Preload images
  const imageResults = await Promise.all(
    images.map(url => preloadImage(url, timeout))
  );
  results.push(...imageResults);

  // Preload videos if enabled
  if (includeVideos && videos.length > 0) {
    const videoResults = await Promise.all(
      videos.map(url => preloadVideo(url, timeout))
    );
    results.push(...videoResults);
  }

  const success = results.every(r => r.success);

  return { slideId, success, results };
}

/**
 * Preload all media for a scene (all slides)
 * @param {Object} scene - Scene object with slides array
 * @param {Object} options - Preload options
 * @returns {Promise<{sceneId: string, success: boolean, slideResults: Object[]}>}
 */
export async function preloadScene(scene, options = {}) {
  const slides = scene?.slides || [];
  const sceneId = scene?.id || 'unknown';

  if (slides.length === 0) {
    return { sceneId, success: true, slideResults: [] };
  }

  const slideResults = await Promise.all(
    slides.map(slide => preloadSlide(slide, options))
  );

  const success = slideResults.every(r => r.success);

  return { sceneId, success, slideResults };
}

/**
 * Preload next N slides from current position
 * @param {Object[]} slides - Array of slides
 * @param {number} currentIndex - Current slide index
 * @param {number} count - Number of slides to preload ahead (default 2)
 * @returns {Promise<Object[]>}
 */
export async function preloadNextSlides(slides, currentIndex, count = 2) {
  if (!slides || slides.length === 0) return [];

  const toPreload = [];
  for (let i = 1; i <= count; i++) {
    const nextIndex = (currentIndex + i) % slides.length;
    if (slides[nextIndex]) {
      toPreload.push(slides[nextIndex]);
    }
  }

  return Promise.all(toPreload.map(slide => preloadSlide(slide)));
}

/**
 * Clear the preload cache
 * @param {string} type - 'images', 'videos', or 'all'
 */
export function clearPreloadCache(type = 'all') {
  if (type === 'images' || type === 'all') {
    loadedImages.clear();
  }
  if (type === 'videos' || type === 'all') {
    loadedVideos.clear();
  }
  if (type === 'all') {
    loadingQueue.clear();
  }
}

/**
 * Get cache statistics
 * @returns {{images: number, videos: number, loading: number}}
 */
export function getCacheStats() {
  return {
    images: loadedImages.size,
    videos: loadedVideos.size,
    loading: loadingQueue.size,
  };
}

/**
 * Check if a URL is already cached
 * @param {string} url - URL to check
 * @param {string} type - 'image' or 'video'
 * @returns {boolean}
 */
export function isCached(url, type = 'image') {
  if (type === 'video') {
    return loadedVideos.has(url);
  }
  return loadedImages.has(url);
}

/**
 * Adaptive preload - automatically adjusts settings based on detected bandwidth
 * @param {Object[]} slides - Array of slides
 * @param {number} currentIndex - Current slide index
 * @returns {Promise<{bandwidth: object, settings: object, results: object[]}>}
 */
export async function adaptivePreload(slides, currentIndex) {
  // Detect bandwidth first
  const bandwidth = await detectBandwidth();
  const settings = getPreloadSettings(bandwidth.level);

  // If data saver is on, be more conservative
  if (bandwidth.saveData) {
    settings.preloadVideos = false;
    settings.preloadAhead = Math.min(settings.preloadAhead, 1);
  }

  // Preload based on settings
  if (!slides || slides.length === 0) {
    return { bandwidth, settings, results: [] };
  }

  const toPreload = [];
  for (let i = 1; i <= settings.preloadAhead; i++) {
    const nextIndex = (currentIndex + i) % slides.length;
    if (slides[nextIndex]) {
      toPreload.push(slides[nextIndex]);
    }
  }

  const results = await Promise.all(
    toPreload.map(slide => preloadSlide(slide, {
      timeout: settings.timeout,
      includeVideos: settings.preloadVideos,
    }))
  );

  return { bandwidth, settings, results };
}

/**
 * Subscribe to bandwidth changes (Chrome only)
 * @param {function} callback - Called when bandwidth changes
 * @returns {function} Unsubscribe function
 */
export function onBandwidthChange(callback) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return () => {}; // No-op unsubscribe
  }

  const handler = async () => {
    clearBandwidthCache();
    const bandwidth = await detectBandwidth();
    callback(bandwidth);
  };

  connection.addEventListener('change', handler);

  return () => {
    connection.removeEventListener('change', handler);
  };
}

export default {
  preloadImage,
  preloadVideo,
  preloadSlide,
  preloadScene,
  preloadNextSlides,
  extractMediaUrls,
  clearPreloadCache,
  getCacheStats,
  isCached,
  // Bandwidth detection
  BANDWIDTH_LEVELS,
  detectBandwidth,
  getPreloadSettings,
  clearBandwidthCache,
  adaptivePreload,
  onBandwidthChange,
};
