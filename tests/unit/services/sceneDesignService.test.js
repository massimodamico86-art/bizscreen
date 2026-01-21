/**
 * Scene Design Service Unit Tests
 *
 * Tests for src/services/sceneDesignService.js
 * Verifies animation helpers, block creation, and design manipulation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
  },
}));

import {
  ANIMATION_TYPES,
  ANIMATION_DIRECTIONS,
  TRANSITION_TYPES,
  DEFAULT_ANIMATION,
  DEFAULT_TRANSITION,
  applyBlockAnimation,
  clearBlockAnimation,
  applySlideTransition,
  clearSlideTransition,
  getBlockAnimation,
  getSlideTransition,
  getBlockAnimationStyles,
  getSlideTransitionStyles,
  ANIMATION_KEYFRAMES,
  getDefaultDesign,
  generateBlockId,
  createTextBlock,
  createImageBlock,
  createShapeBlock,
  createWidgetBlock,
  updateBlockInDesign,
  removeBlockFromDesign,
  addBlockToDesign,
} from '../../../src/services/sceneDesignService';

describe('sceneDesignService', () => {
  // ============================================
  // ANIMATION TYPES AND CONSTANTS
  // ============================================

  describe('Animation Constants', () => {
    it('defines all animation types', () => {
      expect(ANIMATION_TYPES).toHaveLength(5);
      const values = ANIMATION_TYPES.map(t => t.value);
      expect(values).toContain('none');
      expect(values).toContain('fade');
      expect(values).toContain('slide');
      expect(values).toContain('zoom');
      expect(values).toContain('pop');
    });

    it('defines all animation directions', () => {
      expect(ANIMATION_DIRECTIONS).toHaveLength(4);
      const values = ANIMATION_DIRECTIONS.map(d => d.value);
      expect(values).toContain('up');
      expect(values).toContain('down');
      expect(values).toContain('left');
      expect(values).toContain('right');
    });

    it('defines all transition types', () => {
      expect(TRANSITION_TYPES).toHaveLength(14);
      const values = TRANSITION_TYPES.map(t => t.value);
      // Core transitions
      expect(values).toContain('none');
      expect(values).toContain('fade');
      expect(values).toContain('slide');
      expect(values).toContain('zoom');
      // Extended transitions
      expect(values).toContain('dissolve');
      expect(values).toContain('wipe-right');
      expect(values).toContain('wipe-left');
      expect(values).toContain('cube');
    });

    it('defines default animation settings', () => {
      expect(DEFAULT_ANIMATION).toEqual({
        type: 'none',
        direction: 'up',
        delayMs: 0,
        durationMs: 600,
      });
    });

    it('defines default transition settings', () => {
      expect(DEFAULT_TRANSITION).toEqual({
        type: 'none',
        durationMs: 700,
      });
    });

    it('provides animation keyframes CSS', () => {
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes fadeIn');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes slideInUp');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes slideInDown');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes slideInLeft');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes slideInRight');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes zoomIn');
      expect(ANIMATION_KEYFRAMES).toContain('@keyframes popIn');
    });
  });

  // ============================================
  // BLOCK ANIMATION FUNCTIONS
  // ============================================

  describe('applyBlockAnimation', () => {
    const mockDesign = {
      background: { type: 'solid', color: '#000' },
      blocks: [
        { id: 'block1', type: 'text', props: { text: 'Hello' } },
        { id: 'block2', type: 'image', props: { url: 'test.jpg' } },
      ],
    };

    it('applies animation to the correct block', () => {
      const result = applyBlockAnimation(mockDesign, 'block1', { type: 'fade' });

      expect(result.blocks[0].animation).toBeDefined();
      expect(result.blocks[0].animation.type).toBe('fade');
      expect(result.blocks[1].animation).toBeUndefined();
    });

    it('merges with default animation settings', () => {
      const result = applyBlockAnimation(mockDesign, 'block1', { type: 'slide' });

      expect(result.blocks[0].animation.type).toBe('slide');
      expect(result.blocks[0].animation.direction).toBe('up');
      expect(result.blocks[0].animation.delayMs).toBe(0);
      expect(result.blocks[0].animation.durationMs).toBe(600);
    });

    it('preserves custom animation settings', () => {
      const result = applyBlockAnimation(mockDesign, 'block1', {
        type: 'slide',
        direction: 'left',
        delayMs: 200,
        durationMs: 1000,
      });

      expect(result.blocks[0].animation).toEqual({
        type: 'slide',
        direction: 'left',
        delayMs: 200,
        durationMs: 1000,
      });
    });

    it('does not mutate original design', () => {
      const original = JSON.parse(JSON.stringify(mockDesign));
      applyBlockAnimation(mockDesign, 'block1', { type: 'fade' });
      expect(mockDesign).toEqual(original);
    });
  });

  describe('clearBlockAnimation', () => {
    it('removes animation from block', () => {
      const design = {
        blocks: [
          { id: 'block1', type: 'text', animation: { type: 'fade' } },
        ],
      };

      const result = clearBlockAnimation(design, 'block1');

      expect(result.blocks[0].animation).toBeUndefined();
    });

    it('preserves other block properties', () => {
      const design = {
        blocks: [
          { id: 'block1', type: 'text', props: { text: 'Hello' }, animation: { type: 'fade' } },
        ],
      };

      const result = clearBlockAnimation(design, 'block1');

      expect(result.blocks[0].type).toBe('text');
      expect(result.blocks[0].props.text).toBe('Hello');
    });
  });

  describe('getBlockAnimation', () => {
    it('returns animation from block', () => {
      const block = { animation: { type: 'fade', durationMs: 500 } };
      expect(getBlockAnimation(block)).toEqual({ type: 'fade', durationMs: 500 });
    });

    it('returns default for block without animation', () => {
      const block = { type: 'text' };
      expect(getBlockAnimation(block)).toEqual({ type: 'none' });
    });

    it('returns default for null block', () => {
      expect(getBlockAnimation(null)).toEqual({ type: 'none' });
    });
  });

  // ============================================
  // SLIDE TRANSITION FUNCTIONS
  // ============================================

  describe('applySlideTransition', () => {
    const mockDesign = {
      background: { type: 'solid', color: '#000' },
      blocks: [],
    };

    it('applies transition to design', () => {
      const result = applySlideTransition(mockDesign, { type: 'fade' });

      expect(result.transition).toBeDefined();
      expect(result.transition.type).toBe('fade');
    });

    it('merges with default transition settings', () => {
      const result = applySlideTransition(mockDesign, { type: 'slide' });

      expect(result.transition.type).toBe('slide');
      expect(result.transition.durationMs).toBe(700);
    });

    it('preserves custom duration', () => {
      const result = applySlideTransition(mockDesign, {
        type: 'zoom',
        durationMs: 1200,
      });

      expect(result.transition.durationMs).toBe(1200);
    });
  });

  describe('clearSlideTransition', () => {
    it('removes transition from design', () => {
      const design = {
        blocks: [],
        transition: { type: 'fade', durationMs: 700 },
      };

      const result = clearSlideTransition(design);

      expect(result.transition).toBeUndefined();
    });

    it('preserves other design properties', () => {
      const design = {
        background: { color: '#fff' },
        blocks: [{ id: '1' }],
        transition: { type: 'fade' },
      };

      const result = clearSlideTransition(design);

      expect(result.background).toEqual({ color: '#fff' });
      expect(result.blocks).toHaveLength(1);
    });
  });

  describe('getSlideTransition', () => {
    it('returns transition from design', () => {
      const design = { transition: { type: 'zoom', durationMs: 500 } };
      expect(getSlideTransition(design)).toEqual({ type: 'zoom', durationMs: 500 });
    });

    it('returns default for design without transition', () => {
      const design = { blocks: [] };
      expect(getSlideTransition(design)).toEqual({ type: 'none' });
    });
  });

  // ============================================
  // ANIMATION STYLES
  // ============================================

  describe('getBlockAnimationStyles', () => {
    it('returns empty object for no animation', () => {
      expect(getBlockAnimationStyles(null)).toEqual({});
      expect(getBlockAnimationStyles({ type: 'none' })).toEqual({});
    });

    it('returns correct styles for fade animation', () => {
      const styles = getBlockAnimationStyles({ type: 'fade', durationMs: 600, delayMs: 0 });

      expect(styles.animationName).toBe('fadeIn');
      expect(styles.animationDuration).toBe('600ms');
      expect(styles.animationDelay).toBe('0ms');
      expect(styles.animationFillMode).toBe('both');
    });

    it('returns correct styles for slide animation with direction', () => {
      const styles = getBlockAnimationStyles({
        type: 'slide',
        direction: 'left',
        durationMs: 800,
        delayMs: 100,
      });

      expect(styles.animationName).toBe('slideInLeft');
      expect(styles.animationDuration).toBe('800ms');
      expect(styles.animationDelay).toBe('100ms');
    });

    it('handles all slide directions', () => {
      expect(getBlockAnimationStyles({ type: 'slide', direction: 'up' }).animationName).toBe('slideInUp');
      expect(getBlockAnimationStyles({ type: 'slide', direction: 'down' }).animationName).toBe('slideInDown');
      expect(getBlockAnimationStyles({ type: 'slide', direction: 'left' }).animationName).toBe('slideInLeft');
      expect(getBlockAnimationStyles({ type: 'slide', direction: 'right' }).animationName).toBe('slideInRight');
    });

    it('returns correct styles for zoom animation', () => {
      const styles = getBlockAnimationStyles({ type: 'zoom' });
      expect(styles.animationName).toBe('zoomIn');
    });

    it('returns correct styles for pop animation with custom timing', () => {
      const styles = getBlockAnimationStyles({ type: 'pop' });
      expect(styles.animationName).toBe('popIn');
      expect(styles.animationTimingFunction).toBe('cubic-bezier(0.175, 0.885, 0.32, 1.275)');
    });
  });

  describe('getSlideTransitionStyles', () => {
    it('returns empty object for no transition', () => {
      expect(getSlideTransitionStyles(null)).toEqual({});
      expect(getSlideTransitionStyles({ type: 'none' })).toEqual({});
    });

    it('returns correct styles for fade transition', () => {
      const styles = getSlideTransitionStyles({ type: 'fade', durationMs: 700 });

      expect(styles.animationName).toBe('fadeIn');
      expect(styles.animationDuration).toBe('700ms');
    });

    it('returns correct styles for slide transition', () => {
      const styles = getSlideTransitionStyles({ type: 'slide' });
      expect(styles.animationName).toBe('slideInRight');
    });

    it('returns correct styles for zoom transition', () => {
      const styles = getSlideTransitionStyles({ type: 'zoom' });
      expect(styles.animationName).toBe('zoomIn');
    });
  });

  // ============================================
  // BLOCK CREATION FUNCTIONS
  // ============================================

  describe('Block Creation', () => {
    it('generates unique block IDs', () => {
      const id1 = generateBlockId();
      const id2 = generateBlockId();

      expect(id1).toMatch(/^blk_/);
      expect(id2).toMatch(/^blk_/);
      expect(id1).not.toBe(id2);
    });

    it('creates text block with defaults', () => {
      const block = createTextBlock();

      expect(block.type).toBe('text');
      expect(block.id).toMatch(/^blk_/);
      expect(block.props.text).toBe('New Text');
      expect(block.props.fontSize).toBe(32);
    });

    it('creates text block with custom options', () => {
      const block = createTextBlock({
        text: 'Custom',
        fontSize: 48,
        color: '#ff0000',
      });

      expect(block.props.text).toBe('Custom');
      expect(block.props.fontSize).toBe(48);
      expect(block.props.color).toBe('#ff0000');
    });

    it('creates image block with defaults', () => {
      const block = createImageBlock();

      expect(block.type).toBe('image');
      expect(block.props.fit).toBe('cover');
      expect(block.props.borderRadius).toBe(8);
    });

    it('creates shape block with defaults', () => {
      const block = createShapeBlock();

      expect(block.type).toBe('shape');
      expect(block.props.fill).toBe('#3B82F6');
      expect(block.props.opacity).toBe(0.8);
    });

    it('creates widget block with defaults', () => {
      const block = createWidgetBlock();

      expect(block.type).toBe('widget');
      expect(block.widgetType).toBe('clock');
      expect(block.layer).toBe(10);
    });
  });

  // ============================================
  // DESIGN MANIPULATION
  // ============================================

  describe('Design Manipulation', () => {
    const mockDesign = {
      background: { color: '#000' },
      blocks: [
        { id: 'block1', type: 'text', props: { text: 'Hello' } },
      ],
    };

    it('adds block to design', () => {
      const newBlock = { id: 'block2', type: 'image' };
      const result = addBlockToDesign(mockDesign, newBlock);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[1].id).toBe('block2');
    });

    it('updates block in design', () => {
      const result = updateBlockInDesign(mockDesign, 'block1', {
        props: { text: 'Updated' },
      });

      expect(result.blocks[0].props.text).toBe('Updated');
    });

    it('removes block from design', () => {
      const result = removeBlockFromDesign(mockDesign, 'block1');

      expect(result.blocks).toHaveLength(0);
    });

    it('getDefaultDesign returns valid structure', () => {
      const design = getDefaultDesign();

      expect(design.background).toBeDefined();
      expect(design.background.type).toBe('solid');
      expect(design.blocks).toEqual([]);
    });
  });
});
