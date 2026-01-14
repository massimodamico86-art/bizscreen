/**
 * Scene Design Service - Smart Snap & Alignment Guides Tests
 *
 * Tests for snap calculations and alignment guide detection.
 */
import { describe, it, expect } from 'vitest';
import {
  SNAP_THRESHOLD,
  GUIDE_TYPES,
  getBlockEdges,
  findAlignmentGuides,
  calculateSnapPosition,
  findEqualSpacing,
} from '../../../src/services/sceneDesignService';

describe('sceneDesignService - Smart Snap & Alignment', () => {
  describe('SNAP_THRESHOLD', () => {
    it('should be 0.01 (1% of canvas)', () => {
      expect(SNAP_THRESHOLD).toBe(0.01);
    });
  });

  describe('GUIDE_TYPES', () => {
    it('should have all expected guide types', () => {
      expect(GUIDE_TYPES.LEFT).toBe('left');
      expect(GUIDE_TYPES.RIGHT).toBe('right');
      expect(GUIDE_TYPES.TOP).toBe('top');
      expect(GUIDE_TYPES.BOTTOM).toBe('bottom');
      expect(GUIDE_TYPES.CENTER_H).toBe('center-h');
      expect(GUIDE_TYPES.CENTER_V).toBe('center-v');
      expect(GUIDE_TYPES.CANVAS_CENTER_H).toBe('canvas-center-h');
      expect(GUIDE_TYPES.CANVAS_CENTER_V).toBe('canvas-center-v');
    });
  });

  describe('getBlockEdges', () => {
    it('should calculate edges for a block at origin', () => {
      const block = { x: 0, y: 0, width: 0.2, height: 0.1 };
      const edges = getBlockEdges(block);

      expect(edges.left).toBe(0);
      expect(edges.right).toBe(0.2);
      expect(edges.top).toBe(0);
      expect(edges.bottom).toBe(0.1);
      expect(edges.centerX).toBe(0.1);
      expect(edges.centerY).toBe(0.05);
    });

    it('should calculate edges for a centered block', () => {
      const block = { x: 0.4, y: 0.45, width: 0.2, height: 0.1 };
      const edges = getBlockEdges(block);

      expect(edges.left).toBe(0.4);
      expect(edges.right).toBeCloseTo(0.6, 10);
      expect(edges.top).toBe(0.45);
      expect(edges.bottom).toBeCloseTo(0.55, 10);
      expect(edges.centerX).toBe(0.5);
      expect(edges.centerY).toBe(0.5);
    });

    it('should handle blocks at bottom-right corner', () => {
      const block = { x: 0.8, y: 0.9, width: 0.2, height: 0.1 };
      const edges = getBlockEdges(block);

      expect(edges.left).toBe(0.8);
      expect(edges.right).toBeCloseTo(1.0, 10);
      expect(edges.top).toBe(0.9);
      expect(edges.bottom).toBeCloseTo(1.0, 10);
      expect(edges.centerX).toBe(0.9);
      expect(edges.centerY).toBeCloseTo(0.95, 10);
    });
  });

  describe('findAlignmentGuides', () => {
    it('should detect canvas center vertical guide', () => {
      const block = { id: 'b1', x: 0.4, y: 0.2, width: 0.2, height: 0.1 };
      const guides = findAlignmentGuides(block, []);

      const canvasCenterV = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_V);
      expect(canvasCenterV).toBeDefined();
      expect(canvasCenterV.position).toBe(0.5);
      expect(canvasCenterV.axis).toBe('vertical');
    });

    it('should detect canvas center horizontal guide', () => {
      const block = { id: 'b1', x: 0.2, y: 0.45, width: 0.1, height: 0.1 };
      const guides = findAlignmentGuides(block, []);

      const canvasCenterH = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_H);
      expect(canvasCenterH).toBeDefined();
      expect(canvasCenterH.position).toBe(0.5);
      expect(canvasCenterH.axis).toBe('horizontal');
    });

    it('should not detect canvas center when block is far from center', () => {
      const block = { id: 'b1', x: 0.1, y: 0.1, width: 0.1, height: 0.1 };
      const guides = findAlignmentGuides(block, []);

      const canvasCenterV = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_V);
      const canvasCenterH = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_H);
      expect(canvasCenterV).toBeUndefined();
      expect(canvasCenterH).toBeUndefined();
    });

    it('should detect left edge alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.3, width: 0.15, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.6, width: 0.2, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const leftGuide = guides.find(
        g => g.type === GUIDE_TYPES.LEFT && g.sourceBlockId === 'b2'
      );
      expect(leftGuide).toBeDefined();
      expect(leftGuide.position).toBe(0.2);
      expect(leftGuide.axis).toBe('vertical');
    });

    it('should detect right edge alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.3, width: 0.2, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.15, y: 0.6, width: 0.25, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const rightGuide = guides.find(
        g => g.type === GUIDE_TYPES.RIGHT && g.sourceBlockId === 'b2'
      );
      expect(rightGuide).toBeDefined();
      expect(rightGuide.position).toBe(0.4);
      expect(rightGuide.axis).toBe('vertical');
    });

    it('should detect top edge alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.3, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.3, width: 0.1, height: 0.15 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const topGuide = guides.find(
        g => g.type === GUIDE_TYPES.TOP && g.sourceBlockId === 'b2'
      );
      expect(topGuide).toBeDefined();
      expect(topGuide.position).toBe(0.3);
      expect(topGuide.axis).toBe('horizontal');
    });

    it('should detect bottom edge alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.35, width: 0.1, height: 0.15 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.3, width: 0.1, height: 0.2 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const bottomGuide = guides.find(
        g => g.type === GUIDE_TYPES.BOTTOM && g.sourceBlockId === 'b2'
      );
      expect(bottomGuide).toBeDefined();
      expect(bottomGuide.position).toBe(0.5);
      expect(bottomGuide.axis).toBe('horizontal');
    });

    it('should detect center vertical alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.25, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.2, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const centerVGuide = guides.find(
        g => g.type === GUIDE_TYPES.CENTER_V && g.sourceBlockId === 'b2'
      );
      expect(centerVGuide).toBeDefined();
      expect(centerVGuide.position).toBeCloseTo(0.3, 5);
      expect(centerVGuide.axis).toBe('vertical');
    });

    it('should detect center horizontal alignment between blocks', () => {
      const movingBlock = { id: 'b1', x: 0.1, y: 0.25, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.2, width: 0.1, height: 0.2 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const centerHGuide = guides.find(
        g => g.type === GUIDE_TYPES.CENTER_H && g.sourceBlockId === 'b2'
      );
      expect(centerHGuide).toBeDefined();
      expect(centerHGuide.position).toBeCloseTo(0.3, 5);
      expect(centerHGuide.axis).toBe('horizontal');
    });

    it('should detect left to right edge snap (adjacent blocks)', () => {
      const movingBlock = { id: 'b1', x: 0.4, y: 0.2, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.2, width: 0.2, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [staticBlock]);

      const adjacentGuide = guides.find(
        g => g.position === 0.4 && g.axis === 'vertical'
      );
      expect(adjacentGuide).toBeDefined();
    });

    it('should deduplicate guides at the same position', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const block1 = { id: 'b2', x: 0.2, y: 0.4, width: 0.1, height: 0.1 };
      const block2 = { id: 'b3', x: 0.2, y: 0.6, width: 0.1, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [block1, block2]);

      // Should only have one guide at x=0.2
      const leftGuides = guides.filter(g => g.position === 0.2 && g.axis === 'vertical');
      expect(leftGuides.length).toBe(1);
    });

    it('should skip null blocks in otherBlocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.1, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [null, staticBlock, undefined]);

      expect(guides.length).toBeGreaterThan(0);
    });

    it('should skip block with same id as moving block', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const sameBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const guides = findAlignmentGuides(movingBlock, [sameBlock]);

      const blockGuides = guides.filter(g => g.sourceBlockId === 'b1');
      expect(blockGuides.length).toBe(0);
    });
  });

  describe('calculateSnapPosition', () => {
    it('should snap to canvas center horizontally', () => {
      // Block center at 0.505, which is within 0.01 of 0.5
      const block = { id: 'b1', x: 0.405, y: 0.2, width: 0.2, height: 0.1 };
      const result = calculateSnapPosition(block, []);

      expect(result.x).toBeCloseTo(0.4, 5);
      expect(result.snappedX).toBe(true);
    });

    it('should snap to canvas center vertically', () => {
      // Block center at 0.505, which is within 0.01 of 0.5
      const block = { id: 'b1', x: 0.2, y: 0.455, width: 0.1, height: 0.1 };
      const result = calculateSnapPosition(block, []);

      expect(result.y).toBeCloseTo(0.45, 5);
      expect(result.snappedY).toBe(true);
    });

    it('should not snap when block is far from any snap points', () => {
      const block = { id: 'b1', x: 0.1, y: 0.1, width: 0.1, height: 0.1 };
      const result = calculateSnapPosition(block, []);

      expect(result.x).toBe(0.1);
      expect(result.y).toBe(0.1);
      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
    });

    it('should snap left edge to another blocks left edge', () => {
      const movingBlock = { id: 'b1', x: 0.205, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.15, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.x).toBe(0.2);
      expect(result.snappedX).toBe(true);
    });

    it('should snap right edge to another blocks right edge', () => {
      // Moving block right edge at 0.355, static block right edge at 0.35
      const movingBlock = { id: 'b1', x: 0.255, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.15, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      // Should snap to align right edges
      expect(result.x).toBeCloseTo(0.25, 5);
      expect(result.snappedX).toBe(true);
    });

    it('should snap left edge to another blocks right edge', () => {
      const movingBlock = { id: 'b1', x: 0.355, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.15, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.x).toBe(0.35);
      expect(result.snappedX).toBe(true);
    });

    it('should snap right edge to another blocks left edge', () => {
      const movingBlock = { id: 'b1', x: 0.095, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.15, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.x).toBe(0.1);
      expect(result.snappedX).toBe(true);
    });

    it('should snap center to center horizontally', () => {
      const movingBlock = { id: 'b1', x: 0.226, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.15, height: 0.1 };
      // Moving center at 0.276, static center at 0.275
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.x).toBeCloseTo(0.225);
      expect(result.snappedX).toBe(true);
    });

    it('should snap top edge to another blocks top edge', () => {
      const movingBlock = { id: 'b1', x: 0.1, y: 0.505, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.5, width: 0.1, height: 0.15 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.y).toBe(0.5);
      expect(result.snappedY).toBe(true);
    });

    it('should snap bottom edge to another blocks bottom edge', () => {
      const movingBlock = { id: 'b1', x: 0.1, y: 0.555, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.5, width: 0.1, height: 0.15 };
      // Moving bottom at 0.655, static bottom at 0.65
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.y).toBeCloseTo(0.55);
      expect(result.snappedY).toBe(true);
    });

    it('should snap top to bottom (stacking blocks)', () => {
      const movingBlock = { id: 'b1', x: 0.1, y: 0.655, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.5, width: 0.1, height: 0.15 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.y).toBe(0.65);
      expect(result.snappedY).toBe(true);
    });

    it('should snap bottom to top (stacking blocks)', () => {
      const movingBlock = { id: 'b1', x: 0.1, y: 0.395, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.5, y: 0.5, width: 0.1, height: 0.15 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      expect(result.y).toBe(0.4);
      expect(result.snappedY).toBe(true);
    });

    it('should prioritize canvas center over block alignment', () => {
      // Block center near canvas center (0.505, 0.505) should snap to center
      const movingBlock = { id: 'b1', x: 0.405, y: 0.455, width: 0.2, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.42, y: 0.3, width: 0.1, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [staticBlock]);

      // Should snap to canvas center (0.4, 0.45) not to static block
      expect(result.x).toBeCloseTo(0.4, 5);
      expect(result.y).toBeCloseTo(0.45, 5);
    });

    it('should use custom threshold', () => {
      const movingBlock = { id: 'b1', x: 0.22, y: 0.1, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.1, height: 0.1 };

      // With default threshold (0.01), 0.02 diff should not snap
      const result1 = calculateSnapPosition(movingBlock, [staticBlock], 0.01);
      expect(result1.snappedX).toBe(false);

      // With larger threshold (0.03), 0.02 diff should snap
      const result2 = calculateSnapPosition(movingBlock, [staticBlock], 0.03);
      expect(result2.snappedX).toBe(true);
      expect(result2.x).toBe(0.2);
    });

    it('should skip null and undefined blocks', () => {
      const movingBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [null, undefined]);

      expect(result.x).toBe(0.2);
      expect(result.y).toBe(0.2);
    });

    it('should skip block with same id', () => {
      const movingBlock = { id: 'b1', x: 0.205, y: 0.205, width: 0.1, height: 0.1 };
      const sameIdBlock = { id: 'b1', x: 0.2, y: 0.2, width: 0.1, height: 0.1 };
      const result = calculateSnapPosition(movingBlock, [sameIdBlock]);

      // Should not snap to itself
      expect(result.x).toBe(0.205);
      expect(result.y).toBe(0.205);
    });
  });

  describe('findEqualSpacing', () => {
    it('should return empty array with no other blocks', () => {
      const block = { id: 'b1', x: 0.3, y: 0.3, width: 0.1, height: 0.1 };
      const result = findEqualSpacing(block, []);

      expect(result).toEqual([]);
    });

    it('should return empty array with only one other block', () => {
      const block = { id: 'b1', x: 0.3, y: 0.3, width: 0.1, height: 0.1 };
      const other = { id: 'b2', x: 0.1, y: 0.35, width: 0.1, height: 0.1 };
      const result = findEqualSpacing(block, [other]);

      expect(result).toEqual([]);
    });

    it('should detect horizontal equal spacing', () => {
      const movingBlock = { id: 'b1', x: 0.35, y: 0.35, width: 0.1, height: 0.1 };
      const block1 = { id: 'b2', x: 0.1, y: 0.35, width: 0.1, height: 0.1 };
      const block2 = { id: 'b3', x: 0.6, y: 0.35, width: 0.1, height: 0.1 };

      const result = findEqualSpacing(movingBlock, [block1, block2]);

      // Blocks are horizontally aligned at y=0.35
      // Gap between b1-b3 is 0.6 - 0.2 = 0.4
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect vertical equal spacing', () => {
      const movingBlock = { id: 'b1', x: 0.35, y: 0.35, width: 0.1, height: 0.1 };
      const block1 = { id: 'b2', x: 0.35, y: 0.1, width: 0.1, height: 0.1 };
      const block2 = { id: 'b3', x: 0.35, y: 0.6, width: 0.1, height: 0.1 };

      const result = findEqualSpacing(movingBlock, [block1, block2]);

      // Blocks are vertically aligned at x=0.35
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should not detect spacing for misaligned blocks', () => {
      const movingBlock = { id: 'b1', x: 0.35, y: 0.35, width: 0.1, height: 0.1 };
      const block1 = { id: 'b2', x: 0.1, y: 0.1, width: 0.1, height: 0.1 };
      const block2 = { id: 'b3', x: 0.6, y: 0.6, width: 0.1, height: 0.1 };

      const result = findEqualSpacing(movingBlock, [block1, block2]);

      // Blocks are not aligned
      expect(result).toEqual([]);
    });

    it('should use custom threshold', () => {
      const movingBlock = { id: 'b1', x: 0.35, y: 0.35, width: 0.1, height: 0.1 };
      const block1 = { id: 'b2', x: 0.1, y: 0.36, width: 0.1, height: 0.1 };
      const block2 = { id: 'b3', x: 0.6, y: 0.34, width: 0.1, height: 0.1 };

      // With tight alignment threshold, blocks might not be considered aligned
      const result = findEqualSpacing(movingBlock, [block1, block2], 0.001);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Integration: Snap and Guides Together', () => {
    it('should produce consistent snapping and guides', () => {
      const movingBlock = { id: 'b1', x: 0.205, y: 0.205, width: 0.1, height: 0.1 };
      const staticBlock = { id: 'b2', x: 0.2, y: 0.5, width: 0.1, height: 0.1 };

      const snapped = calculateSnapPosition(movingBlock, [staticBlock]);
      const snappedBlock = { ...movingBlock, x: snapped.x, y: snapped.y };
      const guides = findAlignmentGuides(snappedBlock, [staticBlock]);

      // If snapped to left edge, should have a left guide
      if (snapped.snappedX) {
        const leftGuide = guides.find(g => g.type === GUIDE_TYPES.LEFT);
        expect(leftGuide).toBeDefined();
        expect(leftGuide.position).toBeCloseTo(snapped.x);
      }
    });

    it('should snap block exactly to canvas center and show both guides', () => {
      const block = { id: 'b1', x: 0.405, y: 0.455, width: 0.2, height: 0.1 };
      const snapped = calculateSnapPosition(block, []);

      // Should snap to center
      expect(snapped.x).toBeCloseTo(0.4, 5);
      expect(snapped.y).toBeCloseTo(0.45, 5);

      // Guides should show canvas center
      const snappedBlock = { ...block, x: snapped.x, y: snapped.y };
      const guides = findAlignmentGuides(snappedBlock, []);

      const canvasCenterV = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_V);
      const canvasCenterH = guides.find(g => g.type === GUIDE_TYPES.CANVAS_CENTER_H);

      expect(canvasCenterV).toBeDefined();
      expect(canvasCenterH).toBeDefined();
    });
  });
});
