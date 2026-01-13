/**
 * Social Services Unit Tests
 *
 * Tests for social media provider services and shared constants.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the services
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

// Import after mocking
import {
  SOCIAL_PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  PROVIDER_ICONS,
  FILTER_MODES,
  FILTER_MODE_LABELS,
  LAYOUT_OPTIONS,
  LAYOUT_LABELS,
} from '../../../src/services/social';

// ============================================================================
// SOCIAL PROVIDERS CONSTANTS
// ============================================================================

describe('social service constants', () => {
  describe('SOCIAL_PROVIDERS', () => {
    it('exports INSTAGRAM provider', () => {
      expect(SOCIAL_PROVIDERS.INSTAGRAM).toBe('instagram');
    });

    it('exports FACEBOOK provider', () => {
      expect(SOCIAL_PROVIDERS.FACEBOOK).toBe('facebook');
    });

    it('exports TIKTOK provider', () => {
      expect(SOCIAL_PROVIDERS.TIKTOK).toBe('tiktok');
    });

    it('exports GOOGLE provider', () => {
      expect(SOCIAL_PROVIDERS.GOOGLE).toBe('google');
    });
  });

  describe('PROVIDER_LABELS', () => {
    it('exports Instagram label', () => {
      expect(PROVIDER_LABELS.instagram).toBe('Instagram');
    });

    it('exports Facebook label', () => {
      expect(PROVIDER_LABELS.facebook).toBe('Facebook');
    });

    it('exports TikTok label', () => {
      expect(PROVIDER_LABELS.tiktok).toBe('TikTok');
    });

    it('exports Google Reviews label', () => {
      expect(PROVIDER_LABELS.google).toBe('Google Reviews');
    });

    it('has labels for all providers', () => {
      const providers = Object.values(SOCIAL_PROVIDERS);
      providers.forEach((provider) => {
        expect(PROVIDER_LABELS[provider]).toBeDefined();
        expect(typeof PROVIDER_LABELS[provider]).toBe('string');
      });
    });
  });

  describe('PROVIDER_COLORS', () => {
    it('exports Instagram colors with gradient', () => {
      expect(PROVIDER_COLORS.instagram.bg).toContain('gradient');
      expect(PROVIDER_COLORS.instagram.text).toBe('text-white');
    });

    it('exports Facebook colors', () => {
      expect(PROVIDER_COLORS.facebook.bg).toContain('blue');
      expect(PROVIDER_COLORS.facebook.text).toBe('text-white');
    });

    it('exports TikTok colors', () => {
      expect(PROVIDER_COLORS.tiktok.bg).toContain('black');
      expect(PROVIDER_COLORS.tiktok.text).toBe('text-white');
    });

    it('exports Google colors', () => {
      expect(PROVIDER_COLORS.google.bg).toContain('white');
    });

    it('has colors for all providers', () => {
      const providers = Object.values(SOCIAL_PROVIDERS);
      providers.forEach((provider) => {
        expect(PROVIDER_COLORS[provider]).toBeDefined();
        expect(PROVIDER_COLORS[provider].bg).toBeDefined();
        expect(PROVIDER_COLORS[provider].text).toBeDefined();
        expect(PROVIDER_COLORS[provider].border).toBeDefined();
        expect(PROVIDER_COLORS[provider].light).toBeDefined();
      });
    });
  });

  describe('PROVIDER_ICONS', () => {
    it('exports Instagram SVG icon', () => {
      expect(PROVIDER_ICONS.instagram).toContain('<svg');
      expect(PROVIDER_ICONS.instagram).toContain('</svg>');
    });

    it('exports Facebook SVG icon', () => {
      expect(PROVIDER_ICONS.facebook).toContain('<svg');
    });

    it('exports TikTok SVG icon', () => {
      expect(PROVIDER_ICONS.tiktok).toContain('<svg');
    });

    it('exports Google SVG icon', () => {
      expect(PROVIDER_ICONS.google).toContain('<svg');
    });

    it('has icons for all providers', () => {
      const providers = Object.values(SOCIAL_PROVIDERS);
      providers.forEach((provider) => {
        expect(PROVIDER_ICONS[provider]).toBeDefined();
        expect(PROVIDER_ICONS[provider]).toContain('svg');
      });
    });
  });
});

// ============================================================================
// FILTER MODES
// ============================================================================

describe('social service filter modes', () => {
  describe('FILTER_MODES', () => {
    it('exports ALL filter mode', () => {
      expect(FILTER_MODES.ALL).toBe('all');
    });

    it('exports APPROVED filter mode', () => {
      expect(FILTER_MODES.APPROVED).toBe('approved');
    });

    it('exports HASHTAG filter mode', () => {
      expect(FILTER_MODES.HASHTAG).toBe('hashtag');
    });

    it('exports LATEST filter mode', () => {
      expect(FILTER_MODES.LATEST).toBe('latest');
    });
  });

  describe('FILTER_MODE_LABELS', () => {
    it('exports all filter label', () => {
      expect(FILTER_MODE_LABELS.all).toBe('Show All Posts');
    });

    it('exports approved filter label', () => {
      expect(FILTER_MODE_LABELS.approved).toBe('Approved Only');
    });

    it('exports hashtag filter label', () => {
      expect(FILTER_MODE_LABELS.hashtag).toBe('Filter by Hashtags');
    });

    it('exports latest filter label', () => {
      expect(FILTER_MODE_LABELS.latest).toBe('Latest Posts Only');
    });

    it('has labels for all filter modes', () => {
      const modes = Object.values(FILTER_MODES);
      modes.forEach((mode) => {
        expect(FILTER_MODE_LABELS[mode]).toBeDefined();
        expect(typeof FILTER_MODE_LABELS[mode]).toBe('string');
      });
    });
  });
});

// ============================================================================
// LAYOUT OPTIONS
// ============================================================================

describe('social service layout options', () => {
  describe('LAYOUT_OPTIONS', () => {
    it('exports CAROUSEL layout', () => {
      expect(LAYOUT_OPTIONS.CAROUSEL).toBe('carousel');
    });

    it('exports GRID layout', () => {
      expect(LAYOUT_OPTIONS.GRID).toBe('grid');
    });

    it('exports LIST layout', () => {
      expect(LAYOUT_OPTIONS.LIST).toBe('list');
    });

    it('exports SINGLE layout', () => {
      expect(LAYOUT_OPTIONS.SINGLE).toBe('single');
    });

    it('exports MASONRY layout', () => {
      expect(LAYOUT_OPTIONS.MASONRY).toBe('masonry');
    });
  });

  describe('LAYOUT_LABELS', () => {
    it('exports carousel label', () => {
      expect(LAYOUT_LABELS.carousel).toBe('Carousel');
    });

    it('exports grid label', () => {
      expect(LAYOUT_LABELS.grid).toBe('Grid');
    });

    it('exports list label', () => {
      expect(LAYOUT_LABELS.list).toBe('Vertical List');
    });

    it('exports single label', () => {
      expect(LAYOUT_LABELS.single).toBe('Single Post');
    });

    it('exports masonry label', () => {
      expect(LAYOUT_LABELS.masonry).toBe('Masonry Grid');
    });

    it('has labels for all layout options', () => {
      const layouts = Object.values(LAYOUT_OPTIONS);
      layouts.forEach((layout) => {
        expect(LAYOUT_LABELS[layout]).toBeDefined();
        expect(typeof LAYOUT_LABELS[layout]).toBe('string');
      });
    });
  });
});
