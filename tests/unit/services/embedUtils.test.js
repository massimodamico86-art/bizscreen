import { describe, it, expect } from 'vitest';
import {
  extractYouTubeId,
  buildYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  extractVimeoId,
  buildVimeoEmbedUrl,
  extractGoogleSlidesId,
  isPublishedSlidesUrl,
  buildGoogleSlidesEmbedUrl,
  validateEmbedUrl,
} from '../../../src/services/embedUtils.js';

// ============================================================================
// extractYouTubeId
// ============================================================================
describe('extractYouTubeId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from /v/ URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('handles watch URL with extra query params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
  });

  it('handles short URL with query params', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URL', () => {
    expect(extractYouTubeId('invalid')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://vimeo.com/76979871')).toBeNull();
  });

  it('handles URL without www', () => {
    expect(extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});

// ============================================================================
// buildYouTubeEmbedUrl
// ============================================================================
describe('buildYouTubeEmbedUrl', () => {
  it('builds embed URL with default muted and loop options', () => {
    const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ');
    expect(url).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('autoplay=1');
    expect(url).toContain('mute=1');
    expect(url).toContain('loop=1');
    expect(url).toContain('playlist=dQw4w9WgXcQ');
    expect(url).toContain('controls=0');
    expect(url).toContain('modestbranding=1');
    expect(url).toContain('rel=0');
    expect(url).toContain('playsinline=1');
  });

  it('builds URL with muted=false', () => {
    const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ', { muted: false });
    expect(url).toContain('mute=0');
  });

  it('builds URL with loop=false and excludes playlist param', () => {
    const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ', { loop: false });
    expect(url).toContain('loop=0');
    expect(url).not.toContain('playlist=');
  });

  it('includes playlist param when loop=true', () => {
    const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ', { muted: true, loop: true });
    expect(url).toContain('playlist=dQw4w9WgXcQ');
  });
});

// ============================================================================
// getYouTubeThumbnailUrl
// ============================================================================
describe('getYouTubeThumbnailUrl', () => {
  it('returns hqdefault thumbnail URL', () => {
    expect(getYouTubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });
});

// ============================================================================
// extractVimeoId
// ============================================================================
describe('extractVimeoId', () => {
  it('extracts ID from standard vimeo URL', () => {
    expect(extractVimeoId('https://vimeo.com/76979871')).toBe('76979871');
  });

  it('extracts ID from player embed URL', () => {
    expect(extractVimeoId('https://player.vimeo.com/video/76979871')).toBe('76979871');
  });

  it('returns null for invalid URL', () => {
    expect(extractVimeoId('invalid')).toBeNull();
  });

  it('returns null for non-Vimeo URL', () => {
    expect(extractVimeoId('https://youtube.com/watch?v=test')).toBeNull();
  });
});

// ============================================================================
// buildVimeoEmbedUrl
// ============================================================================
describe('buildVimeoEmbedUrl', () => {
  it('builds embed URL with default muted and loop options', () => {
    const url = buildVimeoEmbedUrl('76979871');
    expect(url).toContain('https://player.vimeo.com/video/76979871');
    expect(url).toContain('autoplay=1');
    expect(url).toContain('muted=1');
    expect(url).toContain('loop=1');
    expect(url).toContain('autopause=0');
  });

  it('uses muted param (not mute) for Vimeo', () => {
    const url = buildVimeoEmbedUrl('76979871', { muted: true });
    expect(url).toContain('muted=1');
    expect(url).not.toContain('mute=');
  });

  it('builds URL with loop=false', () => {
    const url = buildVimeoEmbedUrl('76979871', { loop: false });
    expect(url).toContain('loop=0');
  });
});

// ============================================================================
// extractGoogleSlidesId
// ============================================================================
describe('extractGoogleSlidesId', () => {
  it('extracts ID from published URL', () => {
    expect(extractGoogleSlidesId('https://docs.google.com/presentation/d/1BxiMVT0lYQ/pub')).toBe(
      '1BxiMVT0lYQ'
    );
  });

  it('extracts ID from edit URL', () => {
    expect(extractGoogleSlidesId('https://docs.google.com/presentation/d/1BxiMVT0lYQ/edit')).toBe(
      '1BxiMVT0lYQ'
    );
  });

  it('extracts ID from embed URL', () => {
    expect(
      extractGoogleSlidesId('https://docs.google.com/presentation/d/1BxiMVT0lYQ/embed')
    ).toBe('1BxiMVT0lYQ');
  });

  it('returns null for invalid URL', () => {
    expect(extractGoogleSlidesId('invalid')).toBeNull();
  });

  it('returns null for non-Google URL', () => {
    expect(extractGoogleSlidesId('https://youtube.com/watch?v=test')).toBeNull();
  });
});

// ============================================================================
// isPublishedSlidesUrl
// ============================================================================
describe('isPublishedSlidesUrl', () => {
  it('returns true for /pub URL', () => {
    expect(isPublishedSlidesUrl('https://docs.google.com/presentation/d/1BxiMVT0lYQ/pub')).toBe(
      true
    );
  });

  it('returns true for /embed URL', () => {
    expect(
      isPublishedSlidesUrl('https://docs.google.com/presentation/d/1BxiMVT0lYQ/embed')
    ).toBe(true);
  });

  it('returns false for /edit URL', () => {
    expect(isPublishedSlidesUrl('https://docs.google.com/presentation/d/1BxiMVT0lYQ/edit')).toBe(
      false
    );
  });

  it('returns false for random URL', () => {
    expect(isPublishedSlidesUrl('https://example.com')).toBe(false);
  });
});

// ============================================================================
// buildGoogleSlidesEmbedUrl
// ============================================================================
describe('buildGoogleSlidesEmbedUrl', () => {
  it('builds embed URL with default options', () => {
    const url = buildGoogleSlidesEmbedUrl('1BxiMVT0lYQ');
    expect(url).toContain('https://docs.google.com/presentation/d/1BxiMVT0lYQ/embed');
    expect(url).toContain('start=true');
    expect(url).toContain('loop=true');
    expect(url).toContain('delayms=5000');
  });

  it('builds embed URL with custom delayMs', () => {
    const url = buildGoogleSlidesEmbedUrl('1BxiMVT0lYQ', { delayMs: 10000 });
    expect(url).toContain('delayms=10000');
  });

  it('builds embed URL with loop=false', () => {
    const url = buildGoogleSlidesEmbedUrl('1BxiMVT0lYQ', { loop: false });
    expect(url).toContain('loop=false');
  });
});

// ============================================================================
// validateEmbedUrl
// ============================================================================
describe('validateEmbedUrl', () => {
  it('returns error for empty URL', () => {
    const result = validateEmbedUrl('', 'youtube');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL is required');
  });

  it('returns error for invalid URL format', () => {
    const result = validateEmbedUrl('not-a-url', 'youtube');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid URL format');
  });

  it('validates correct YouTube URL', () => {
    const result = validateEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ', 'youtube');
    expect(result.valid).toBe(true);
  });

  it('rejects non-YouTube URL for youtube type', () => {
    const result = validateEmbedUrl('https://vimeo.com/12345', 'youtube');
    expect(result.valid).toBe(false);
  });

  it('validates correct Vimeo URL', () => {
    const result = validateEmbedUrl('https://vimeo.com/76979871', 'vimeo');
    expect(result.valid).toBe(true);
  });

  it('validates correct Google Slides URL', () => {
    const result = validateEmbedUrl(
      'https://docs.google.com/presentation/d/1BxiMVT0lYQ/pub',
      'google-slides'
    );
    expect(result.valid).toBe(true);
  });

  it('returns warning for non-published Slides URL', () => {
    const result = validateEmbedUrl(
      'https://docs.google.com/presentation/d/1BxiMVT0lYQ/edit',
      'google-slides'
    );
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('publish it first');
  });

  it('validates any valid URL for webpage type', () => {
    const result = validateEmbedUrl('https://example.com', 'webpage');
    expect(result.valid).toBe(true);
  });
});
