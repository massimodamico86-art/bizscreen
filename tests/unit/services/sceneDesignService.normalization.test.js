/**
 * Scene Design Service - Normalization Unit Tests
 *
 * Tests for the block and slide normalization functions that prevent
 * crashes from missing properties in legacy or wizard-generated designs.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeBlock,
  normalizeSlide,
  normalizeDesign,
  normalizeBackground,
  getBlockDefaults,
  TEXT_BLOCK_DEFAULTS,
  IMAGE_BLOCK_DEFAULTS,
  SHAPE_BLOCK_DEFAULTS,
  DEFAULT_BACKGROUND,
  DEFAULT_BLOCK_ANIMATION,
} from '../../../src/services/sceneDesignService';

// ============================================
// NORMALIZE BLOCK TESTS
// ============================================

describe('normalizeBlock', () => {
  describe('basic normalization', () => {
    it('returns null for null input', () => {
      expect(normalizeBlock(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
      expect(normalizeBlock(undefined)).toBe(null);
    });

    it('adds missing props object', () => {
      const block = { type: 'text', x: 0.5, y: 0.5 };
      const normalized = normalizeBlock(block);
      expect(normalized.props).toBeDefined();
      expect(normalized.props.text).toBeDefined();
    });

    it('generates ID if missing', () => {
      const block = { type: 'text' };
      const normalized = normalizeBlock(block);
      expect(normalized.id).toBeDefined();
      expect(normalized.id).toMatch(/^blk_/);
    });

    it('preserves existing ID', () => {
      const block = { id: 'my-custom-id', type: 'text' };
      const normalized = normalizeBlock(block);
      expect(normalized.id).toBe('my-custom-id');
    });
  });

  describe('text block normalization', () => {
    it('adds default text props', () => {
      const block = { type: 'text', x: 0.1, y: 0.2 };
      const normalized = normalizeBlock(block);

      expect(normalized.props.align).toBe('left');
      expect(normalized.props.color).toBe('#ffffff');
      expect(normalized.props.fontSize).toBe(32);
      expect(normalized.props.fontWeight).toBe('600');
    });

    it('preserves existing props', () => {
      const block = {
        type: 'text',
        props: { text: 'Hello', align: 'center', color: '#ff0000' },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.text).toBe('Hello');
      expect(normalized.props.align).toBe('center');
      expect(normalized.props.color).toBe('#ff0000');
      expect(normalized.props.fontSize).toBe(32); // default added
    });

    it('migrates root-level text props to props object', () => {
      // Legacy format from industry wizard
      const block = {
        type: 'text',
        x: 0.1,
        y: 0.2,
        text: 'Legacy Text',
        fontSize: 48,
        fontWeight: '700',
        color: '#00ff00',
        align: 'right',
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.text).toBe('Legacy Text');
      expect(normalized.props.fontSize).toBe(48);
      expect(normalized.props.fontWeight).toBe('700');
      expect(normalized.props.color).toBe('#00ff00');
      expect(normalized.props.align).toBe('right');
      // Root-level props should be removed
      expect(normalized.text).toBeUndefined();
      expect(normalized.fontSize).toBeUndefined();
    });
  });

  describe('image block normalization', () => {
    it('adds default image props', () => {
      const block = { type: 'image', x: 0.1, y: 0.2 };
      const normalized = normalizeBlock(block);

      expect(normalized.props.fit).toBe('cover');
      expect(normalized.props.borderRadius).toBe(0);
      expect(normalized.props.url).toBe('');
    });

    it('migrates root-level image props', () => {
      const block = {
        type: 'image',
        x: 0.1,
        y: 0.2,
        url: 'https://example.com/image.jpg',
        fit: 'contain',
        borderRadius: 12,
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.url).toBe('https://example.com/image.jpg');
      expect(normalized.props.fit).toBe('contain');
      expect(normalized.props.borderRadius).toBe(12);
    });
  });

  describe('shape block normalization', () => {
    it('adds default shape props', () => {
      const block = { type: 'shape', x: 0.1, y: 0.2 };
      const normalized = normalizeBlock(block);

      expect(normalized.props.shape).toBe('rect');
      expect(normalized.props.fill).toBe('#cccccc');
      expect(normalized.props.opacity).toBe(1);
      expect(normalized.props.borderRadius).toBe(0);
    });

    it('migrates root-level shape props', () => {
      const block = {
        type: 'shape',
        x: 0.1,
        y: 0.2,
        fill: '#ff5500',
        opacity: 0.5,
        borderRadius: 16,
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.fill).toBe('#ff5500');
      expect(normalized.props.opacity).toBe(0.5);
      expect(normalized.props.borderRadius).toBe(16);
    });
  });

  describe('widget block normalization', () => {
    it('adds default widget props', () => {
      const block = { type: 'widget', x: 0.8, y: 0.8 };
      const normalized = normalizeBlock(block);

      expect(normalized.props.style).toBe('minimal');
    });

    it('adds default size prop for clock widget', () => {
      const block = { type: 'widget', widgetType: 'clock' };
      const normalized = normalizeBlock(block);

      expect(normalized.props.size).toBe('medium');
    });

    it('adds default weather props', () => {
      const block = { type: 'widget', widgetType: 'weather' };
      const normalized = normalizeBlock(block);

      expect(normalized.props.location).toBe('Miami, FL');
      expect(normalized.props.units).toBe('imperial');
    });

    it('adds default QR props', () => {
      const block = { type: 'widget', widgetType: 'qr' };
      const normalized = normalizeBlock(block);

      expect(normalized.props.url).toBe('');
      expect(normalized.props.label).toBe('');
      expect(normalized.props.cornerRadius).toBe(8);
      expect(normalized.props.errorCorrection).toBe('M');
      expect(normalized.props.qrScale).toBe(1.0);
      expect(normalized.props.qrFgColor).toBe('#000000');
      expect(normalized.props.qrBgColor).toBe('#ffffff');
    });

    it('preserves custom size prop', () => {
      const block = {
        type: 'widget',
        widgetType: 'clock',
        props: { size: 'large' },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.size).toBe('large');
    });

    it('adds default customFontSize as null', () => {
      const block = { type: 'widget', widgetType: 'clock' };
      const normalized = normalizeBlock(block);

      expect(normalized.props.customFontSize).toBe(null);
    });

    it('preserves custom customFontSize value', () => {
      const block = {
        type: 'widget',
        widgetType: 'clock',
        props: { size: 'custom', customFontSize: 48 },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.size).toBe('custom');
      expect(normalized.props.customFontSize).toBe(48);
    });

    it('preserves customFontSize for date widget', () => {
      const block = {
        type: 'widget',
        widgetType: 'date',
        props: { size: 'custom', customFontSize: 24 },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.customFontSize).toBe(24);
    });

    it('preserves customFontSize for weather widget', () => {
      const block = {
        type: 'widget',
        widgetType: 'weather',
        props: { size: 'custom', customFontSize: 36 },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.customFontSize).toBe(36);
    });

    it('preserves custom weather props', () => {
      const block = {
        type: 'widget',
        widgetType: 'weather',
        props: {
          location: 'New York, NY',
          units: 'metric',
          style: 'card',
        },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.location).toBe('New York, NY');
      expect(normalized.props.units).toBe('metric');
      expect(normalized.props.style).toBe('card');
    });

    it('preserves custom QR props', () => {
      const block = {
        type: 'widget',
        widgetType: 'qr',
        props: {
          url: 'https://example.com',
          label: 'Scan me!',
          cornerRadius: 16,
          errorCorrection: 'H',
          qrScale: 1.5,
          qrFgColor: '#0000ff',
          qrBgColor: '#ffffcc',
        },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.props.url).toBe('https://example.com');
      expect(normalized.props.label).toBe('Scan me!');
      expect(normalized.props.cornerRadius).toBe(16);
      expect(normalized.props.errorCorrection).toBe('H');
      expect(normalized.props.qrScale).toBe(1.5);
      expect(normalized.props.qrFgColor).toBe('#0000ff');
      expect(normalized.props.qrBgColor).toBe('#ffffcc');
    });
  });

  describe('position and dimension validation', () => {
    it('clamps x and y to 0-1 range', () => {
      const block = { type: 'text', x: -0.5, y: 1.5 };
      const normalized = normalizeBlock(block);

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(1);
    });

    it('clamps width and height to min 0.01', () => {
      const block = { type: 'text', width: 0, height: -0.5 };
      const normalized = normalizeBlock(block);

      expect(normalized.width).toBeGreaterThanOrEqual(0.01);
      expect(normalized.height).toBeGreaterThanOrEqual(0.01);
    });

    it('uses defaults for non-numeric positions', () => {
      const block = { type: 'text', x: 'invalid', y: null };
      const normalized = normalizeBlock(block);

      expect(typeof normalized.x).toBe('number');
      expect(typeof normalized.y).toBe('number');
    });
  });

  describe('animation normalization', () => {
    it('adds default animation if missing', () => {
      const block = { type: 'text' };
      const normalized = normalizeBlock(block);

      expect(normalized.animation).toBeDefined();
      expect(normalized.animation.type).toBe('none');
    });

    it('preserves existing animation', () => {
      const block = {
        type: 'text',
        animation: { type: 'fade', duration: 1.0 },
      };
      const normalized = normalizeBlock(block);

      expect(normalized.animation.type).toBe('fade');
      expect(normalized.animation.duration).toBe(1.0);
    });
  });
});

// ============================================
// NORMALIZE BACKGROUND TESTS
// ============================================

describe('normalizeBackground', () => {
  it('returns default for null input', () => {
    const normalized = normalizeBackground(null);
    expect(normalized.type).toBe('solid');
    expect(normalized.color).toBeDefined();
  });

  it('returns default for undefined input', () => {
    const normalized = normalizeBackground(undefined);
    expect(normalized.type).toBe('solid');
  });

  it('adds color for solid type without color', () => {
    const bg = { type: 'solid' };
    const normalized = normalizeBackground(bg);
    expect(normalized.color).toBeDefined();
  });

  it('preserves valid background properties', () => {
    const bg = { type: 'gradient', from: '#000', to: '#fff', direction: '90deg' };
    const normalized = normalizeBackground(bg);
    expect(normalized.type).toBe('gradient');
    expect(normalized.from).toBe('#000');
    expect(normalized.to).toBe('#fff');
  });

  it('resets invalid type to solid', () => {
    const bg = { type: 'invalid-type' };
    const normalized = normalizeBackground(bg);
    expect(normalized.type).toBe('solid');
  });
});

// ============================================
// NORMALIZE DESIGN TESTS
// ============================================

describe('normalizeDesign', () => {
  it('returns default design for null input', () => {
    const normalized = normalizeDesign(null);
    expect(normalized.background).toBeDefined();
    expect(Array.isArray(normalized.blocks)).toBe(true);
  });

  it('normalizes all blocks in design', () => {
    const design = {
      background: { type: 'solid', color: '#000' },
      blocks: [
        { type: 'text', x: 0.1, y: 0.1 },
        { type: 'image', x: 0.5, y: 0.5 },
      ],
    };
    const normalized = normalizeDesign(design);

    expect(normalized.blocks).toHaveLength(2);
    expect(normalized.blocks[0].props).toBeDefined();
    expect(normalized.blocks[1].props).toBeDefined();
  });

  it('filters out null/undefined blocks', () => {
    const design = {
      blocks: [{ type: 'text' }, null, undefined, { type: 'shape' }],
    };
    const normalized = normalizeDesign(design);

    expect(normalized.blocks).toHaveLength(2);
  });

  it('creates empty blocks array if missing', () => {
    const design = { background: { type: 'solid', color: '#000' } };
    const normalized = normalizeDesign(design);

    expect(Array.isArray(normalized.blocks)).toBe(true);
    expect(normalized.blocks).toHaveLength(0);
  });

  it('normalizes background', () => {
    const design = { blocks: [] };
    const normalized = normalizeDesign(design);

    expect(normalized.background.type).toBeDefined();
  });
});

// ============================================
// NORMALIZE SLIDE TESTS
// ============================================

describe('normalizeSlide', () => {
  it('returns null for null input', () => {
    expect(normalizeSlide(null)).toBe(null);
  });

  it('normalizes design_json property', () => {
    const slide = {
      id: 'slide-1',
      design_json: {
        blocks: [{ type: 'text', text: 'Hello' }],
      },
    };
    const normalized = normalizeSlide(slide);

    expect(normalized.design_json.blocks[0].props.text).toBe('Hello');
  });

  it('normalizes design property (alternative name)', () => {
    const slide = {
      id: 'slide-1',
      design: {
        blocks: [{ type: 'shape', fill: '#ff0000' }],
      },
    };
    const normalized = normalizeSlide(slide);

    expect(normalized.design.blocks[0].props.fill).toBe('#ff0000');
  });

  it('preserves slide metadata', () => {
    const slide = {
      id: 'slide-123',
      title: 'Test Slide',
      position: 3,
      duration_seconds: 15,
      design_json: { blocks: [] },
    };
    const normalized = normalizeSlide(slide);

    expect(normalized.id).toBe('slide-123');
    expect(normalized.title).toBe('Test Slide');
    expect(normalized.position).toBe(3);
    expect(normalized.duration_seconds).toBe(15);
  });

  it('adds default duration if missing', () => {
    const slide = {
      id: 'slide-1',
      design_json: { blocks: [] },
    };
    const normalized = normalizeSlide(slide);

    expect(normalized.duration_seconds).toBeDefined();
  });
});

// ============================================
// GET BLOCK DEFAULTS TESTS
// ============================================

describe('getBlockDefaults', () => {
  it('returns text defaults for text type', () => {
    const defaults = getBlockDefaults('text');
    expect(defaults.type).toBe('text');
    expect(defaults.props.align).toBeDefined();
  });

  it('returns image defaults for image type', () => {
    const defaults = getBlockDefaults('image');
    expect(defaults.type).toBe('image');
    expect(defaults.props.fit).toBeDefined();
  });

  it('returns shape defaults for shape type', () => {
    const defaults = getBlockDefaults('shape');
    expect(defaults.type).toBe('shape');
    expect(defaults.props.fill).toBeDefined();
  });

  it('returns widget defaults for widget type', () => {
    const defaults = getBlockDefaults('widget');
    expect(defaults.type).toBe('widget');
    expect(defaults.props.style).toBeDefined();
  });

  it('returns text defaults for unknown type', () => {
    const defaults = getBlockDefaults('unknown');
    expect(defaults.type).toBe('text');
  });
});

// ============================================
// EXPORTED CONSTANTS TESTS
// ============================================

describe('exported constants', () => {
  it('TEXT_BLOCK_DEFAULTS has required properties', () => {
    expect(TEXT_BLOCK_DEFAULTS.type).toBe('text');
    expect(TEXT_BLOCK_DEFAULTS.props.align).toBeDefined();
    expect(TEXT_BLOCK_DEFAULTS.props.fontSize).toBeDefined();
    expect(TEXT_BLOCK_DEFAULTS.props.color).toBeDefined();
  });

  it('IMAGE_BLOCK_DEFAULTS has required properties', () => {
    expect(IMAGE_BLOCK_DEFAULTS.type).toBe('image');
    expect(IMAGE_BLOCK_DEFAULTS.props.fit).toBeDefined();
  });

  it('SHAPE_BLOCK_DEFAULTS has required properties', () => {
    expect(SHAPE_BLOCK_DEFAULTS.type).toBe('shape');
    expect(SHAPE_BLOCK_DEFAULTS.props.fill).toBeDefined();
    expect(SHAPE_BLOCK_DEFAULTS.props.opacity).toBeDefined();
  });

  it('DEFAULT_BACKGROUND has required properties', () => {
    expect(DEFAULT_BACKGROUND.type).toBeDefined();
    expect(DEFAULT_BACKGROUND.color).toBeDefined();
  });

  it('DEFAULT_BLOCK_ANIMATION has required properties', () => {
    expect(DEFAULT_BLOCK_ANIMATION.type).toBe('none');
    expect(DEFAULT_BLOCK_ANIMATION.duration).toBeDefined();
  });
});
