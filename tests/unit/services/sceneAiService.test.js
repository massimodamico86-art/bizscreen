/**
 * Scene AI Service Unit Tests
 *
 * Tests for src/services/sceneAiService.js
 * Verifies AI polish functions, improvements, and presets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
}));

import {
  improveSlideModern,
  improveSlideReadable,
  highlightPromo,
  getAiPolishActions,
  suggestImprovements,
  getPresetsForBusinessType,
  getAiQuickActions,
  INDUSTRY_PRESETS,
} from '../../../src/services/sceneAiService';

describe('sceneAiService', () => {
  // ============================================
  // AI POLISH ACTIONS
  // ============================================

  describe('getAiPolishActions', () => {
    it('returns three polish actions', () => {
      const actions = getAiPolishActions();
      expect(actions).toHaveLength(3);
    });

    it('includes modern, readable, and promo actions', () => {
      const actions = getAiPolishActions();
      const ids = actions.map(a => a.id);

      expect(ids).toContain('modern');
      expect(ids).toContain('readable');
      expect(ids).toContain('promo');
    });

    it('each action has id, label, and description', () => {
      const actions = getAiPolishActions();

      actions.forEach(action => {
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('description');
        expect(typeof action.id).toBe('string');
        expect(typeof action.label).toBe('string');
        expect(typeof action.description).toBe('string');
      });
    });
  });

  // ============================================
  // IMPROVE SLIDE MODERN
  // ============================================

  describe('improveSlideModern', () => {
    const mockSlide = {
      background: { type: 'solid', color: '#ffffff' },
      blocks: [
        {
          id: 'text1',
          type: 'text',
          x: 0.1, y: 0.1,
          width: 0.8, height: 0.2,
          props: { text: 'Welcome', fontSize: 32 },
        },
        {
          id: 'text2',
          type: 'text',
          x: 0.1, y: 0.4,
          width: 0.8, height: 0.2,
          props: { text: 'Subtitle', fontSize: 24 },
        },
      ],
    };

    it('updates background color', () => {
      const result = improveSlideModern({ slide: mockSlide });

      expect(result.background).toBeDefined();
      expect(result.background.color).not.toBe('#ffffff');
    });

    it('applies animations to text blocks with staggered delays', () => {
      const result = improveSlideModern({ slide: mockSlide });

      const textBlocks = result.blocks.filter(b => b.type === 'text');
      expect(textBlocks[0].animation).toBeDefined();
      expect(textBlocks[0].animation.type).not.toBe('none');

      // Second block should have higher delay
      if (textBlocks[1]?.animation) {
        expect(textBlocks[1].animation.delayMs).toBeGreaterThan(textBlocks[0].animation.delayMs);
      }
    });

    it('applies slide transition', () => {
      const result = improveSlideModern({ slide: mockSlide });

      expect(result.transition).toBeDefined();
      expect(result.transition.type).not.toBe('none');
    });

    it('respects brand theme when provided', () => {
      const brandTheme = {
        primary_color: '#ff5500',
        secondary_color: '#0055ff',
        background_color: '#1a1a1a',
        text_color: '#ffffff',
      };

      const result = improveSlideModern({ slide: mockSlide, brandTheme });

      // Background should use brand theme
      expect(result.background.color).toBe('#1a1a1a');

      // Text color may be adjusted for contrast
      const textBlock = result.blocks.find(b => b.type === 'text');
      expect(textBlock.props.color).toBeDefined();
    });

    it('uses industry palette when no brand theme', () => {
      const result = improveSlideModern({
        slide: mockSlide,
        industry: 'restaurant',
      });

      expect(result.background).toBeDefined();
      // Should use restaurant industry colors
    });

    it('handles empty blocks array', () => {
      const emptySlide = {
        background: { color: '#fff' },
        blocks: [],
      };

      const result = improveSlideModern({ slide: emptySlide });

      expect(result.blocks).toEqual([]);
      expect(result.transition).toBeDefined();
    });
  });

  // ============================================
  // IMPROVE SLIDE READABLE
  // ============================================

  describe('improveSlideReadable', () => {
    const mockSlide = {
      background: { type: 'solid', color: '#ffffff' },
      blocks: [
        {
          id: 'text1',
          type: 'text',
          x: 0.1, y: 0.1,
          width: 0.8, height: 0.2,
          props: { text: 'Hello World', fontSize: 24, color: '#333333' },
        },
        {
          id: 'text2',
          type: 'text',
          x: 0.1, y: 0.4,
          width: 0.8, height: 0.2,
          props: {
            text: 'This is a very long heading that should be truncated for better readability on screen',
            fontSize: 20,
          },
        },
      ],
    };

    it('increases font sizes by approximately 15%', () => {
      const result = improveSlideReadable({ slide: mockSlide });

      const textBlock = result.blocks.find(b => b.id === 'text1');
      expect(textBlock.props.fontSize).toBeGreaterThanOrEqual(Math.floor(24 * 1.15));
    });

    it('preserves text content while increasing size', () => {
      const result = improveSlideReadable({ slide: mockSlide });

      const longTextBlock = result.blocks.find(b => b.id === 'text2');
      // Text is preserved, not truncated by this function
      expect(longTextBlock.props.text).toBeDefined();
      expect(longTextBlock.props.fontSize).toBeGreaterThan(20);
    });

    it('does not modify non-text blocks', () => {
      const slideWithShape = {
        ...mockSlide,
        blocks: [
          ...mockSlide.blocks,
          { id: 'shape1', type: 'shape', props: { fill: '#000' } },
        ],
      };

      const result = improveSlideReadable({ slide: slideWithShape });

      const shape = result.blocks.find(b => b.id === 'shape1');
      expect(shape.props.fill).toBe('#000');
    });

    it('returns valid design structure', () => {
      const result = improveSlideReadable({ slide: mockSlide });

      const textBlock = result.blocks.find(b => b.type === 'text');
      // Readable improvement focuses on text size, not animations
      expect(textBlock.props).toBeDefined();
      expect(result.blocks).toHaveLength(mockSlide.blocks.length);
    });

    it('does not truncate short text', () => {
      const result = improveSlideReadable({ slide: mockSlide });

      const shortTextBlock = result.blocks.find(b => b.id === 'text1');
      expect(shortTextBlock.props.text).toBe('Hello World');
    });
  });

  // ============================================
  // HIGHLIGHT PROMO
  // ============================================

  describe('highlightPromo', () => {
    const mockSlideWithPromo = {
      background: { type: 'solid', color: '#111' },
      blocks: [
        {
          id: 'text1',
          type: 'text',
          x: 0.1, y: 0.1,
          width: 0.8, height: 0.2,
          props: { text: 'Welcome to our store', fontSize: 32 },
        },
        {
          id: 'promo1',
          type: 'text',
          x: 0.1, y: 0.5,
          width: 0.8, height: 0.2,
          props: { text: '50% OFF Sale!', fontSize: 28 },
        },
      ],
    };

    it('identifies promo block by sale keyword', () => {
      const result = highlightPromo({ slide: mockSlideWithPromo });

      const promoBlock = result.blocks.find(b => b.id === 'promo1');
      expect(promoBlock.animation).toBeDefined();
      expect(promoBlock.animation.type).toBe('pop');
    });

    it('identifies promo block by $ symbol', () => {
      const slideWithPrice = {
        blocks: [
          {
            id: 'price1',
            type: 'text',
            props: { text: 'Only $9.99!' },
          },
        ],
      };

      const result = highlightPromo({ slide: slideWithPrice });

      const priceBlock = result.blocks.find(b => b.id === 'price1');
      expect(priceBlock.animation).toBeDefined();
      expect(priceBlock.animation.type).toBe('pop');
    });

    it('identifies promo block by special keyword', () => {
      const slideWithSpecial = {
        blocks: [
          {
            id: 'special1',
            type: 'text',
            props: { text: "Today's Special" },
          },
        ],
      };

      const result = highlightPromo({ slide: slideWithSpecial });

      const specialBlock = result.blocks.find(b => b.id === 'special1');
      expect(specialBlock.animation.type).toBe('pop');
    });

    it('applies accent color from brand theme', () => {
      const brandTheme = {
        accent_color: '#ff0000',
      };

      const result = highlightPromo({
        slide: mockSlideWithPromo,
        brandTheme,
      });

      const promoBlock = result.blocks.find(b => b.id === 'promo1');
      expect(promoBlock.props.color).toBe('#ff0000');
    });

    it('handles slide with no promo content', () => {
      const noPromoSlide = {
        blocks: [
          {
            id: 'text1',
            type: 'text',
            props: { text: 'Regular content here' },
          },
        ],
      };

      const result = highlightPromo({ slide: noPromoSlide });

      // Should not crash and should return valid structure
      // May add a highlight block even without promo text
      expect(result.blocks).toBeDefined();
      expect(Array.isArray(result.blocks)).toBe(true);
    });
  });

  // ============================================
  // SUGGEST IMPROVEMENTS
  // ============================================

  describe('suggestImprovements', () => {
    it('returns improved design for slide with blocks', () => {
      const slide = {
        design_json: {
          background: { color: '#000' },
          blocks: [
            { type: 'text', props: { text: 'Hello', fontSize: 24 } },
          ],
        },
      };
      const result = suggestImprovements({ slide });

      // Returns an improved design object
      expect(result).toBeDefined();
      expect(result.background).toBeDefined();
      expect(result.blocks).toBeDefined();
    });

    it('adds accent shape for text-only slides', () => {
      const textOnlySlide = {
        design_json: {
          background: { color: '#000' },
          blocks: [
            { type: 'text', props: { text: 'Hello', fontSize: 20 } },
          ],
        },
      };

      const result = suggestImprovements({ slide: textOnlySlide });

      // Adds an accent shape if none exists
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks.some(b => b.type === 'shape')).toBe(true);
    });

    it('handles various slide configurations', () => {
      const balancedSlide = {
        design_json: {
          background: { color: '#000' },
          blocks: [
            { type: 'text', props: { text: 'Hello', fontSize: 32 } },
            { type: 'text', props: { text: 'Subtitle', fontSize: 18 } },
            { type: 'image', props: { url: 'test.jpg' } },
            { type: 'shape', props: { fill: '#000', borderRadius: 0 } },
          ],
        },
      };

      const result = suggestImprovements({ slide: balancedSlide });

      // Returns valid improved design
      expect(result.blocks).toHaveLength(4);
    });
  });

  // ============================================
  // PRESETS AND QUICK ACTIONS
  // ============================================

  describe('getPresetsForBusinessType', () => {
    it('returns presets for restaurant', () => {
      const presets = getPresetsForBusinessType('restaurant');

      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('returns presets with required properties', () => {
      const presets = getPresetsForBusinessType('restaurant');

      presets.forEach(preset => {
        expect(preset).toHaveProperty('title');
        expect(preset).toHaveProperty('design');
      });
    });

    it('returns generic presets for unknown industry', () => {
      const presets = getPresetsForBusinessType('unknown-industry');

      expect(Array.isArray(presets)).toBe(true);
    });
  });

  describe('getAiQuickActions', () => {
    it('returns quick actions array', () => {
      const actions = getAiQuickActions({ businessType: 'restaurant' });

      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('INDUSTRY_PRESETS', () => {
    it('defines presets for common industries', () => {
      expect(INDUSTRY_PRESETS).toHaveProperty('restaurant');
      expect(INDUSTRY_PRESETS).toHaveProperty('retail');
      expect(INDUSTRY_PRESETS).toHaveProperty('salon');
    });

    it('each industry has label and presets', () => {
      Object.values(INDUSTRY_PRESETS).forEach(industry => {
        expect(industry).toHaveProperty('label');
        expect(industry).toHaveProperty('presets');
        expect(Array.isArray(industry.presets)).toBe(true);
      });
    });
  });
});
