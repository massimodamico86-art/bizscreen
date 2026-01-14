/**
 * Media Service Unit Tests
 * Phase 5: Tests for media library service operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MEDIA_TYPES,
  validateMediaFile,
  getMediaTypeFromMime,
  getFileExtension,
  APP_TYPE_KEYS,
} from '../../../src/services/mediaService';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}));

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('MEDIA_TYPES constant', () => {
    it('contains all required media types', () => {
      expect(MEDIA_TYPES.IMAGE).toBe('image');
      expect(MEDIA_TYPES.VIDEO).toBe('video');
      expect(MEDIA_TYPES.AUDIO).toBe('audio');
      expect(MEDIA_TYPES.DOCUMENT).toBe('document');
      expect(MEDIA_TYPES.WEB_PAGE).toBe('web_page');
      expect(MEDIA_TYPES.APP).toBe('app');
    });

    it('has exactly 6 media types', () => {
      expect(Object.keys(MEDIA_TYPES)).toHaveLength(6);
    });

    it('all values are lowercase strings', () => {
      Object.values(MEDIA_TYPES).forEach(type => {
        expect(typeof type).toBe('string');
        expect(type).toBe(type.toLowerCase());
      });
    });
  });

  describe('APP_TYPE_KEYS constant', () => {
    it('contains all required app types', () => {
      expect(APP_TYPE_KEYS.CLOCK).toBe('clock');
      expect(APP_TYPE_KEYS.WEB_PAGE).toBe('web_page');
      expect(APP_TYPE_KEYS.WEATHER).toBe('weather');
      expect(APP_TYPE_KEYS.RSS_TICKER).toBe('rss_ticker');
      expect(APP_TYPE_KEYS.DATA_TABLE).toBe('data_table');
      expect(APP_TYPE_KEYS.CALENDAR).toBe('calendar');
    });

    it('has exactly 6 app types', () => {
      expect(Object.keys(APP_TYPE_KEYS)).toHaveLength(6);
    });
  });

  describe('validateMediaFile', () => {
    it('accepts valid image file', () => {
      const file = { name: 'test.jpg', size: 1024 * 1024, type: 'image/jpeg' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.mediaType).toBe(MEDIA_TYPES.IMAGE);
    });

    it('accepts valid video file', () => {
      const file = { name: 'test.mp4', size: 50 * 1024 * 1024, type: 'video/mp4' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.VIDEO);
    });

    it('accepts valid audio file', () => {
      const file = { name: 'test.mp3', size: 5 * 1024 * 1024, type: 'audio/mpeg' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.AUDIO);
    });

    it('accepts valid document file', () => {
      const file = { name: 'test.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.DOCUMENT);
    });

    it('rejects file that is too large', () => {
      const file = { name: 'huge.mp4', size: 200 * 1024 * 1024, type: 'video/mp4' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds');
    });

    it('rejects unsupported file type', () => {
      const file = { name: 'test.exe', size: 1024, type: 'application/x-msdownload' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported');
    });

    it('handles file without recognized type', () => {
      const file = { name: 'test.unknown', size: 1024, type: 'application/octet-stream' };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.mediaType).toBeNull();
    });

    it('respects custom max size parameter', () => {
      const file = { name: 'test.jpg', size: 15 * 1024 * 1024, type: 'image/jpeg' };
      const result = validateMediaFile(file, 10); // 10MB limit
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('10MB');
    });
  });

  describe('getMediaTypeFromMime', () => {
    it('returns IMAGE for image mime types', () => {
      expect(getMediaTypeFromMime('image/jpeg')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromMime('image/png')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromMime('image/gif')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromMime('image/webp')).toBe(MEDIA_TYPES.IMAGE);
    });

    it('returns VIDEO for video mime types', () => {
      expect(getMediaTypeFromMime('video/mp4')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromMime('video/webm')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromMime('video/quicktime')).toBe(MEDIA_TYPES.VIDEO);
    });

    it('returns AUDIO for audio mime types', () => {
      expect(getMediaTypeFromMime('audio/mpeg')).toBe(MEDIA_TYPES.AUDIO);
      expect(getMediaTypeFromMime('audio/wav')).toBe(MEDIA_TYPES.AUDIO);
      expect(getMediaTypeFromMime('audio/ogg')).toBe(MEDIA_TYPES.AUDIO);
    });

    it('returns DOCUMENT for document mime types', () => {
      expect(getMediaTypeFromMime('application/pdf')).toBe(MEDIA_TYPES.DOCUMENT);
    });

    it('returns null for unknown or empty types', () => {
      expect(getMediaTypeFromMime('unknown/type')).toBeNull();
      expect(getMediaTypeFromMime('')).toBeNull();
      expect(getMediaTypeFromMime(null)).toBeNull();
      expect(getMediaTypeFromMime(undefined)).toBeNull();
    });
  });

  describe('getFileExtension', () => {
    it('extracts extension from filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('video.mp4')).toBe('mp4');
      expect(getFileExtension('document.pdf')).toBe('pdf');
    });

    it('returns lowercase extension', () => {
      expect(getFileExtension('photo.JPG')).toBe('jpg');
      expect(getFileExtension('video.MP4')).toBe('mp4');
    });

    it('handles files with multiple dots', () => {
      expect(getFileExtension('my.photo.final.jpg')).toBe('jpg');
    });

    it('returns the filename if no dot is present', () => {
      // When there's no dot, split('.').pop() returns the original string
      expect(getFileExtension('noextension')).toBe('noextension');
    });

    it('handles empty or null input', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension(null)).toBe('');
      expect(getFileExtension(undefined)).toBe('');
    });
  });
});

describe('mediaService API functions', () => {
  it('exports all required media functions', async () => {
    const mediaService = await import('../../../src/services/mediaService');

    // Core CRUD
    expect(typeof mediaService.fetchMediaAssets).toBe('function');
    expect(typeof mediaService.getMediaAsset).toBe('function');
    expect(typeof mediaService.createMediaAsset).toBe('function');
    expect(typeof mediaService.updateMediaAsset).toBe('function');
    expect(typeof mediaService.deleteMediaAsset).toBe('function');

    // Safe delete
    expect(typeof mediaService.deleteMediaAssetSafely).toBe('function');

    // Usage tracking
    expect(typeof mediaService.getMediaUsage).toBe('function');
    expect(typeof mediaService.isMediaInUse).toBe('function');

    // Batch operations
    expect(typeof mediaService.batchDeleteMediaAssets).toBe('function');
    expect(typeof mediaService.duplicateMediaAsset).toBe('function');

    // Web page
    expect(typeof mediaService.createWebPageAsset).toBe('function');

    // Folder operations
    expect(typeof mediaService.moveMediaToFolder).toBe('function');

    // Tag operations
    expect(typeof mediaService.addTagsToMedia).toBe('function');
    expect(typeof mediaService.removeTagsFromMedia).toBe('function');
  });

  it('exports all app creation functions', async () => {
    const mediaService = await import('../../../src/services/mediaService');

    // App factory
    expect(typeof mediaService.createAppAsset).toBe('function');

    // Specific app creators
    expect(typeof mediaService.createClockApp).toBe('function');
    expect(typeof mediaService.createWebPageApp).toBe('function');
    expect(typeof mediaService.createWeatherApp).toBe('function');
    expect(typeof mediaService.createRssTickerApp).toBe('function');
    expect(typeof mediaService.createDataTableApp).toBe('function');

    // App management
    expect(typeof mediaService.fetchApps).toBe('function');
    expect(typeof mediaService.deleteApp).toBe('function');
    expect(typeof mediaService.updateAppConfig).toBe('function');
  });

  it('exports validation and utility functions', async () => {
    const mediaService = await import('../../../src/services/mediaService');

    expect(typeof mediaService.validateMediaFile).toBe('function');
    expect(typeof mediaService.getMediaTypeFromMime).toBe('function');
    expect(typeof mediaService.getFileExtension).toBe('function');
  });

  it('exports constants', async () => {
    const mediaService = await import('../../../src/services/mediaService');

    expect(mediaService.MEDIA_TYPES).toBeDefined();
    expect(mediaService.APP_TYPE_KEYS).toBeDefined();
  });
});

describe('Media file size limits', () => {
  it('accepts files under 100MB', () => {
    const file = { name: 'video.mp4', size: 99 * 1024 * 1024, type: 'video/mp4' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects files over 100MB', () => {
    const file = { name: 'huge.mp4', size: 101 * 1024 * 1024, type: 'video/mp4' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('100MB'))).toBe(true);
  });

  it('accepts exactly 100MB file', () => {
    const file = { name: 'exact.mp4', size: 100 * 1024 * 1024, type: 'video/mp4' };
    const result = validateMediaFile(file);
    expect(result.valid).toBe(true);
  });
});

describe('Supported file formats', () => {
  const supportedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const supportedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
  const supportedAudio = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
  const supportedDocs = ['application/pdf'];

  supportedImages.forEach(mimeType => {
    it(`accepts ${mimeType}`, () => {
      const file = { name: 'test.file', size: 1024, type: mimeType };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.IMAGE);
    });
  });

  supportedVideos.forEach(mimeType => {
    it(`accepts ${mimeType}`, () => {
      const file = { name: 'test.file', size: 1024, type: mimeType };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.VIDEO);
    });
  });

  supportedAudio.forEach(mimeType => {
    it(`accepts ${mimeType}`, () => {
      const file = { name: 'test.file', size: 1024, type: mimeType };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.AUDIO);
    });
  });

  supportedDocs.forEach(mimeType => {
    it(`accepts ${mimeType}`, () => {
      const file = { name: 'test.file', size: 1024, type: mimeType };
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.DOCUMENT);
    });
  });
});
