/**
 * Tests for GDPR Deletion Service
 * Phase 11: GDPR Compliance
 *
 * Verifies URL parsing and media categorization for S3/Cloudinary deletion.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the logging service before importing gdprDeletionService
vi.mock('../../../src/services/loggingService.js', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  parseMediaUrl,
  categorizeMediaUrls,
} from '../../../src/services/gdprDeletionService.js';

describe('gdprDeletionService', () => {
  describe('parseMediaUrl', () => {
    describe('Cloudinary URLs', () => {
      it('should parse standard Cloudinary URL', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v1234/folder/image.jpg';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('cloudinary');
        expect(result.key).toBe('folder/image');
      });

      it('should parse Cloudinary URL without version', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/folder/subfolder/image.png';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('cloudinary');
        expect(result.key).toBe('folder/subfolder/image');
      });

      it('should handle Cloudinary URL with transformations', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v1234/folder/image.jpg';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('cloudinary');
        // Transformations before /v or folder path are not captured in key
      });

      it('should parse Cloudinary video URL', () => {
        const url = 'https://res.cloudinary.com/demo/video/upload/v1234/videos/clip.mp4';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('cloudinary');
        expect(result.key).toBe('videos/clip');
      });

      it('should handle Cloudinary URL with nested folders', () => {
        const url = 'https://res.cloudinary.com/demo/image/upload/v999/a/b/c/d/deep.jpg';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('cloudinary');
        expect(result.key).toBe('a/b/c/d/deep');
      });
    });

    describe('S3 URLs', () => {
      it('should parse S3 bucket-first URL format', () => {
        const url = 'https://mybucket.s3.us-east-1.amazonaws.com/uploads/user123/image.jpg';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('s3');
        expect(result.key).toBe('uploads/user123/image.jpg');
      });

      it('should parse S3 path-style URL format', () => {
        const url = 'https://s3.us-east-1.amazonaws.com/mybucket/uploads/file.png';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('s3');
        expect(result.key).toBe('mybucket/uploads/file.png');
      });

      it('should handle S3 URL with special characters (encoded)', () => {
        const url = 'https://mybucket.s3.amazonaws.com/uploads/file%20name.jpg';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('s3');
        expect(result.key).toContain('uploads/');
        expect(result.key).toContain('file');
      });

      it('should parse S3 URL without region', () => {
        const url = 'https://mybucket.s3.amazonaws.com/path/to/file.pdf';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('s3');
        expect(result.key).toBe('path/to/file.pdf');
      });

      it('should handle S3 URL with deeply nested path', () => {
        const url = 'https://bucket.s3.eu-west-2.amazonaws.com/a/b/c/d/e/f.txt';
        const result = parseMediaUrl(url);

        expect(result.provider).toBe('s3');
        expect(result.key).toBe('a/b/c/d/e/f.txt');
      });
    });

    describe('Unknown URLs', () => {
      it('should return unknown for null URL', () => {
        const result = parseMediaUrl(null);
        expect(result.provider).toBe('unknown');
        expect(result.key).toBeNull();
      });

      it('should return unknown for undefined URL', () => {
        const result = parseMediaUrl(undefined);
        expect(result.provider).toBe('unknown');
        expect(result.key).toBeNull();
      });

      it('should return unknown for empty URL', () => {
        const result = parseMediaUrl('');
        expect(result.provider).toBe('unknown');
        expect(result.key).toBeNull();
      });

      it('should return unknown for non-cloud URL', () => {
        const url = 'https://example.com/images/photo.jpg';
        const result = parseMediaUrl(url);
        expect(result.provider).toBe('unknown');
      });

      it('should return unknown for data URLs', () => {
        const url = 'data:image/png;base64,iVBORw0KGgo...';
        const result = parseMediaUrl(url);
        expect(result.provider).toBe('unknown');
      });

      it('should return unknown for local file paths', () => {
        const url = '/uploads/local/file.jpg';
        const result = parseMediaUrl(url);
        expect(result.provider).toBe('unknown');
      });

      it('should return unknown for relative URLs', () => {
        const url = '../images/photo.png';
        const result = parseMediaUrl(url);
        expect(result.provider).toBe('unknown');
      });
    });
  });

  describe('categorizeMediaUrls', () => {
    it('should separate S3 and Cloudinary URLs', () => {
      const mediaItems = [
        { url: 'https://mybucket.s3.us-east-1.amazonaws.com/file1.jpg' },
        { url: 'https://res.cloudinary.com/demo/image/upload/v1/file2.jpg' },
        { url: 'https://mybucket.s3.us-east-1.amazonaws.com/file3.jpg' },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(2);
      expect(result.cloudinaryPublicIds).toHaveLength(1);
    });

    it('should include thumbnail URLs', () => {
      const mediaItems = [
        {
          url: 'https://mybucket.s3.amazonaws.com/image.jpg',
          thumbnailUrl: 'https://mybucket.s3.amazonaws.com/thumb.jpg',
        },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(2);
      expect(result.s3Keys).toContain('image.jpg');
      expect(result.s3Keys).toContain('thumb.jpg');
    });

    it('should skip thumbnail if same as main URL', () => {
      const mediaItems = [
        {
          url: 'https://mybucket.s3.amazonaws.com/image.jpg',
          thumbnailUrl: 'https://mybucket.s3.amazonaws.com/image.jpg',
        },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(1);
    });

    it('should dedupe duplicate URLs', () => {
      const mediaItems = [
        { url: 'https://mybucket.s3.amazonaws.com/image.jpg' },
        { url: 'https://mybucket.s3.amazonaws.com/image.jpg' },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const result = categorizeMediaUrls([]);

      expect(result.s3Keys).toHaveLength(0);
      expect(result.cloudinaryPublicIds).toHaveLength(0);
    });

    it('should skip unknown provider URLs', () => {
      const mediaItems = [
        { url: 'https://example.com/image.jpg' },
        { url: null },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(0);
      expect(result.cloudinaryPublicIds).toHaveLength(0);
    });

    it('should handle mixed providers with thumbnails', () => {
      const mediaItems = [
        {
          url: 'https://mybucket.s3.amazonaws.com/main.jpg',
          thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/v1/thumb.jpg',
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1/video.mp4',
          thumbnailUrl: 'https://mybucket.s3.amazonaws.com/video-thumb.jpg',
        },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(2);
      expect(result.cloudinaryPublicIds).toHaveLength(2);
    });

    it('should handle items with undefined thumbnailUrl', () => {
      const mediaItems = [
        { url: 'https://mybucket.s3.amazonaws.com/file.jpg', thumbnailUrl: undefined },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toHaveLength(1);
    });

    it('should extract correct keys from URLs', () => {
      const mediaItems = [
        { url: 'https://bucket.s3.amazonaws.com/uploads/user1/photo.jpg' },
        { url: 'https://res.cloudinary.com/cloud/image/upload/v123/folder/img.png' },
      ];

      const result = categorizeMediaUrls(mediaItems);

      expect(result.s3Keys).toContain('uploads/user1/photo.jpg');
      expect(result.cloudinaryPublicIds).toContain('folder/img');
    });
  });
});
