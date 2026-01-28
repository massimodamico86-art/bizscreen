/**
 * Media Preloader Service Unit Tests
 *
 * Tests for src/services/mediaPreloader.js
 * Verifies image/video preloading, caching, and media extraction.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Image constructor
class MockImage {
  constructor() {
    this.src = '';
    this.onload = null;
    this.onerror = null;
  }
}

// Store mock instances for testing
let mockImageInstances = [];

// Setup global mocks
beforeEach(() => {
  mockImageInstances = [];
  vi.stubGlobal('Image', class extends MockImage {
    constructor() {
      super();
      mockImageInstances.push(this);
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

import {
  preloadImage,
  extractMediaUrls,
  preloadSlide,
  preloadScene,
  preloadNextSlides,
  clearPreloadCache,
  getCacheStats,
  isCached,
} from '../../../src/services/mediaPreloader';

describe('mediaPreloader', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearPreloadCache('all');
  });

  // ============================================
  // EXTRACT MEDIA URLS
  // ============================================

  describe('extractMediaUrls', () => {
    it('extracts background image URL', () => {
      const design = {
        background: { type: 'image', url: 'https://example.com/bg.jpg' },
        blocks: [],
      };

      const { images, videos } = extractMediaUrls(design);

      expect(images).toHaveLength(1);
      expect(images[0]).toBe('https://example.com/bg.jpg');
      expect(videos).toHaveLength(0);
    });

    it('extracts image block URLs', () => {
      const design = {
        background: { type: 'solid', color: '#000' },
        blocks: [
          { type: 'image', props: { url: 'https://example.com/img1.jpg' } },
          { type: 'image', props: { url: 'https://example.com/img2.png' } },
        ],
      };

      const { images } = extractMediaUrls(design);

      expect(images).toHaveLength(2);
      expect(images).toContain('https://example.com/img1.jpg');
      expect(images).toContain('https://example.com/img2.png');
    });

    it('extracts video block URLs', () => {
      const design = {
        background: { type: 'solid', color: '#000' },
        blocks: [
          { type: 'video', props: { url: 'https://example.com/video.mp4' } },
        ],
      };

      const { videos } = extractMediaUrls(design);

      expect(videos).toHaveLength(1);
      expect(videos[0]).toBe('https://example.com/video.mp4');
    });

    it('handles empty design', () => {
      const { images, videos } = extractMediaUrls(null);

      expect(images).toEqual([]);
      expect(videos).toEqual([]);
    });

    it('ignores non-media blocks', () => {
      const design = {
        blocks: [
          { type: 'text', props: { text: 'Hello' } },
          { type: 'shape', props: { fill: '#000' } },
          { type: 'widget', widgetType: 'clock' },
        ],
      };

      const { images, videos } = extractMediaUrls(design);

      expect(images).toHaveLength(0);
      expect(videos).toHaveLength(0);
    });

    it('handles blocks without props', () => {
      const design = {
        blocks: [
          { type: 'image' },
          { type: 'video' },
        ],
      };

      const { images, videos } = extractMediaUrls(design);

      expect(images).toHaveLength(0);
      expect(videos).toHaveLength(0);
    });
  });

  // ============================================
  // PRELOAD IMAGE
  // ============================================

  describe('preloadImage', () => {
    it('returns error for empty URL', async () => {
      const result = await preloadImage('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No URL provided');
    });

    it('returns cached result for already loaded image', async () => {
      const url = 'https://example.com/cached.jpg';

      // First load (simulate success)
      const promise1 = preloadImage(url);
      // Trigger onload
      setTimeout(() => {
        const img = mockImageInstances[mockImageInstances.length - 1];
        if (img.onload) img.onload();
      }, 0);

      const result1 = await promise1;
      expect(result1.success).toBe(true);
      expect(result1.cached).toBe(false);

      // Second load should be cached
      const result2 = await preloadImage(url);
      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
    });

    it('handles load timeout', async () => {
      vi.useFakeTimers();

      const url = 'https://example.com/slow.jpg';
      const promise = preloadImage(url, 100);

      // Advance time past timeout
      vi.advanceTimersByTime(150);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');

      vi.useRealTimers();
    });

    it('returns same promise for duplicate concurrent requests', async () => {
      const url = 'https://example.com/concurrent.jpg';

      const promise1 = preloadImage(url);
      const promise2 = preloadImage(url);

      expect(promise1).toBe(promise2);

      // Trigger success
      setTimeout(() => {
        const img = mockImageInstances[mockImageInstances.length - 1];
        if (img.onload) img.onload();
      }, 0);

      await promise1;
    });
  });

  // ============================================
  // PRELOAD SLIDE
  // ============================================

  describe('preloadSlide', () => {
    it('preloads all images in slide', async () => {
      const slide = {
        id: 'slide-1',
        design_json: {
          background: { type: 'solid', color: '#000' },
          blocks: [
            { type: 'image', props: { url: 'https://example.com/img1.jpg' } },
          ],
        },
      };

      // Mock image load success
      setTimeout(() => {
        mockImageInstances.forEach(img => {
          if (img.onload) img.onload();
        });
      }, 0);

      const result = await preloadSlide(slide);

      expect(result.slideId).toBe('slide-1');
      expect(result.results).toHaveLength(1);
    });

    it('handles slide with design property', async () => {
      const slide = {
        id: 'slide-2',
        design: {
          background: { type: 'solid', color: '#000' },
          blocks: [],
        },
      };

      const result = await preloadSlide(slide);

      expect(result.slideId).toBe('slide-2');
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('handles raw design object', async () => {
      const design = {
        background: { type: 'solid', color: '#000' },
        blocks: [],
      };

      const result = await preloadSlide(design);

      expect(result.slideId).toBe('unknown');
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PRELOAD SCENE
  // ============================================

  describe('preloadScene', () => {
    it('preloads all slides in scene', async () => {
      const scene = {
        id: 'scene-1',
        slides: [
          { id: 's1', design_json: { blocks: [] } },
          { id: 's2', design_json: { blocks: [] } },
        ],
      };

      const result = await preloadScene(scene);

      expect(result.sceneId).toBe('scene-1');
      expect(result.success).toBe(true);
      expect(result.slideResults).toHaveLength(2);
    });

    it('handles scene with no slides', async () => {
      const scene = {
        id: 'scene-empty',
        slides: [],
      };

      const result = await preloadScene(scene);

      expect(result.success).toBe(true);
      expect(result.slideResults).toHaveLength(0);
    });

    it('handles null scene', async () => {
      const result = await preloadScene(null);

      expect(result.sceneId).toBe('unknown');
      expect(result.success).toBe(true);
      expect(result.slideResults).toHaveLength(0);
    });
  });

  // ============================================
  // PRELOAD NEXT SLIDES
  // ============================================

  describe('preloadNextSlides', () => {
    it('preloads correct number of slides ahead', async () => {
      const slides = [
        { id: 's0', design_json: { blocks: [] } },
        { id: 's1', design_json: { blocks: [] } },
        { id: 's2', design_json: { blocks: [] } },
        { id: 's3', design_json: { blocks: [] } },
      ];

      const results = await preloadNextSlides(slides, 0, 2);

      expect(results).toHaveLength(2);
    });

    it('wraps around to beginning', async () => {
      const slides = [
        { id: 's0', design_json: { blocks: [] } },
        { id: 's1', design_json: { blocks: [] } },
        { id: 's2', design_json: { blocks: [] } },
      ];

      // At index 2, next slides should be 0 and 1
      const results = await preloadNextSlides(slides, 2, 2);

      expect(results).toHaveLength(2);
    });

    it('handles empty slides array', async () => {
      const results = await preloadNextSlides([], 0, 2);

      expect(results).toEqual([]);
    });

    it('handles null slides', async () => {
      const results = await preloadNextSlides(null, 0, 2);

      expect(results).toEqual([]);
    });
  });

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  describe('clearPreloadCache', () => {
    it('clears all caches', () => {
      clearPreloadCache('all');
      const stats = getCacheStats();

      expect(stats.images).toBe(0);
      expect(stats.videos).toBe(0);
      expect(stats.loading).toBe(0);
    });

    it('clears only images', async () => {
      // Add an image to cache
      const promise = preloadImage('https://example.com/test.jpg');
      setTimeout(() => {
        const img = mockImageInstances[mockImageInstances.length - 1];
        if (img.onload) img.onload();
      }, 0);
      await promise;

      clearPreloadCache('images');
      const stats = getCacheStats();

      expect(stats.images).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('returns correct counts', () => {
      clearPreloadCache('all');
      const stats = getCacheStats();

      expect(stats).toHaveProperty('images');
      expect(stats).toHaveProperty('videos');
      expect(stats).toHaveProperty('loading');
      expect(typeof stats.images).toBe('number');
    });
  });

  describe('isCached', () => {
    it('returns false for uncached URL', () => {
      expect(isCached('https://example.com/uncached.jpg', 'image')).toBe(false);
    });

    it('returns true for cached URL', async () => {
      const url = 'https://example.com/cached-check.jpg';

      const promise = preloadImage(url);
      setTimeout(() => {
        const img = mockImageInstances[mockImageInstances.length - 1];
        if (img.onload) img.onload();
      }, 0);
      await promise;

      expect(isCached(url, 'image')).toBe(true);
    });
  });
});
