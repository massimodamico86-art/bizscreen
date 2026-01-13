/**
 * Industry Wizard Service Unit Tests
 *
 * Tests for src/services/industryWizardService.js
 * Verifies wizard definitions, blueprint generation, and industry mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/services/sceneDesignService', () => ({
  createSlide: vi.fn().mockResolvedValue({ id: 'mock-slide-id' }),
  getDefaultDesign: vi.fn().mockReturnValue({ background: {}, blocks: [] }),
  normalizeDesign: vi.fn().mockImplementation((design) => design), // Pass through
}));

vi.mock('../../../src/services/brandThemeService', () => ({
  getBrandTheme: vi.fn().mockResolvedValue(null),
  getThemedBlockDefaults: vi.fn().mockReturnValue({}),
}));

// Import after mocks
import {
  getAvailableWizards,
  getSupportedIndustries,
  getDefaultBlueprint,
  getWizardByKey,
  buildWizardSlides,
} from '../../../src/services/industryWizardService';
import { createSlide } from '../../../src/services/sceneDesignService';

describe('industryWizardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSupportedIndustries', () => {
    it('returns all 10 supported industries', () => {
      const industries = getSupportedIndustries();
      expect(industries).toHaveLength(10);
    });

    it('includes all expected industry types', () => {
      const industries = getSupportedIndustries();
      const keys = industries.map(i => i.key);

      expect(keys).toContain('restaurant');
      expect(keys).toContain('salon');
      expect(keys).toContain('gym');
      expect(keys).toContain('retail');
      expect(keys).toContain('medical');
      expect(keys).toContain('hotel');
      expect(keys).toContain('coffee');
      expect(keys).toContain('realestate');
      expect(keys).toContain('auto');
      expect(keys).toContain('other');
    });

    it('returns industries with both key and label', () => {
      const industries = getSupportedIndustries();

      industries.forEach(industry => {
        expect(industry).toHaveProperty('key');
        expect(industry).toHaveProperty('label');
        expect(typeof industry.key).toBe('string');
        expect(typeof industry.label).toBe('string');
        expect(industry.key.length).toBeGreaterThan(0);
        expect(industry.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAvailableWizards', () => {
    it('returns wizards for restaurant industry', () => {
      const wizards = getAvailableWizards('restaurant');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('menu');
      expect(wizards.map(w => w.key)).toContain('specials');
      expect(wizards.map(w => w.key)).toContain('happy-hour');
      expect(wizards.map(w => w.key)).toContain('welcome');
    });

    it('returns wizards for salon industry', () => {
      const wizards = getAvailableWizards('salon');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('services');
      expect(wizards.map(w => w.key)).toContain('promotions');
      expect(wizards.map(w => w.key)).toContain('team');
      expect(wizards.map(w => w.key)).toContain('booking');
    });

    it('returns wizards for gym industry', () => {
      const wizards = getAvailableWizards('gym');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('classes');
      expect(wizards.map(w => w.key)).toContain('membership');
      expect(wizards.map(w => w.key)).toContain('motivation');
      expect(wizards.map(w => w.key)).toContain('trainers');
    });

    it('returns wizards for retail industry', () => {
      const wizards = getAvailableWizards('retail');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('sale');
      expect(wizards.map(w => w.key)).toContain('new-arrivals');
      expect(wizards.map(w => w.key)).toContain('featured');
      expect(wizards.map(w => w.key)).toContain('loyalty');
    });

    it('returns wizards for medical industry', () => {
      const wizards = getAvailableWizards('medical');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('services');
      expect(wizards.map(w => w.key)).toContain('health-tips');
      expect(wizards.map(w => w.key)).toContain('team');
      expect(wizards.map(w => w.key)).toContain('appointment');
    });

    it('returns wizards for hotel industry', () => {
      const wizards = getAvailableWizards('hotel');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('welcome');
      expect(wizards.map(w => w.key)).toContain('amenities');
      expect(wizards.map(w => w.key)).toContain('dining');
      expect(wizards.map(w => w.key)).toContain('events');
    });

    it('returns wizards for coffee industry', () => {
      const wizards = getAvailableWizards('coffee');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('menu');
      expect(wizards.map(w => w.key)).toContain('specials');
      expect(wizards.map(w => w.key)).toContain('loyalty');
      expect(wizards.map(w => w.key)).toContain('wifi');
    });

    it('returns wizards for real estate industry', () => {
      const wizards = getAvailableWizards('realestate');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('listing');
      expect(wizards.map(w => w.key)).toContain('open-house');
      expect(wizards.map(w => w.key)).toContain('agent');
      expect(wizards.map(w => w.key)).toContain('just-sold');
    });

    it('returns wizards for auto industry', () => {
      const wizards = getAvailableWizards('auto');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('featured');
      expect(wizards.map(w => w.key)).toContain('specials');
      expect(wizards.map(w => w.key)).toContain('service');
      expect(wizards.map(w => w.key)).toContain('inventory');
    });

    it('returns generic wizards for other industry', () => {
      const wizards = getAvailableWizards('other');

      expect(wizards.length).toBeGreaterThan(0);
      expect(wizards.map(w => w.key)).toContain('welcome');
      expect(wizards.map(w => w.key)).toContain('services');
      expect(wizards.map(w => w.key)).toContain('contact');
      expect(wizards.map(w => w.key)).toContain('announcement');
    });

    it('falls back to other for unknown industry', () => {
      const wizards = getAvailableWizards('unknown_industry');
      const otherWizards = getAvailableWizards('other');

      expect(wizards).toEqual(otherWizards);
    });

    it('normalizes industry variations', () => {
      const variations = [
        { input: 'Restaurant', expected: 'restaurant' },
        { input: 'RESTAURANT', expected: 'restaurant' },
        { input: ' restaurant ', expected: 'restaurant' },
        { input: 'food', expected: 'restaurant' },
        { input: 'dining', expected: 'restaurant' },
        { input: 'spa', expected: 'salon' },
        { input: 'beauty', expected: 'salon' },
        { input: 'fitness', expected: 'gym' },
        { input: 'store', expected: 'retail' },
        { input: 'clinic', expected: 'medical' },
        { input: 'lobby', expected: 'hotel' },
        { input: 'cafe', expected: 'coffee' },
        { input: 'property', expected: 'realestate' },
        { input: 'dealership', expected: 'auto' },
      ];

      variations.forEach(({ input, expected }) => {
        const wizards = getAvailableWizards(input);
        const expectedWizards = getAvailableWizards(expected);
        expect(wizards.map(w => w.key)).toEqual(expectedWizards.map(w => w.key));
      });
    });

    it('each wizard has required properties', () => {
      const industries = getSupportedIndustries();

      industries.forEach(({ key }) => {
        const wizards = getAvailableWizards(key);

        wizards.forEach(wizard => {
          expect(wizard).toHaveProperty('key');
          expect(wizard).toHaveProperty('title');
          expect(wizard).toHaveProperty('description');
          expect(wizard).toHaveProperty('icon');
          expect(typeof wizard.key).toBe('string');
          expect(typeof wizard.title).toBe('string');
          expect(typeof wizard.description).toBe('string');
        });
      });
    });
  });

  describe('getWizardByKey', () => {
    it('returns wizard definition for valid key', () => {
      const wizard = getWizardByKey('restaurant', 'menu');

      expect(wizard).not.toBeNull();
      expect(wizard.key).toBe('menu');
      expect(wizard.title).toBe('Digital Menu Board');
    });

    it('returns null for invalid wizard key', () => {
      const wizard = getWizardByKey('restaurant', 'nonexistent');

      expect(wizard).toBeNull();
    });

    it('returns null for invalid industry', () => {
      const wizard = getWizardByKey('nonexistent', 'menu');

      // Should fall back to 'other' which doesn't have 'menu'
      expect(wizard).toBeNull();
    });
  });

  describe('getDefaultBlueprint', () => {
    it('returns valid blueprint structure', () => {
      const blueprint = getDefaultBlueprint('restaurant', 'menu', {});

      expect(blueprint).toHaveProperty('background');
      expect(blueprint).toHaveProperty('blocks');
      expect(Array.isArray(blueprint.blocks)).toBe(true);
    });

    it('generates unique block IDs', () => {
      const blueprint = getDefaultBlueprint('restaurant', 'menu', {});
      const ids = blueprint.blocks.map(b => b.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('includes form data in generated blocks', () => {
      const blueprint = getDefaultBlueprint('restaurant', 'welcome', {
        restaurantName: 'Test Restaurant',
        tagline: 'Test Tagline',
      });

      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');
      const hasRestaurantName = textBlocks.some(b => b.text === 'Test Restaurant');
      const hasTagline = textBlocks.some(b => b.text === 'Test Tagline');

      expect(hasRestaurantName || hasTagline).toBe(true);
    });

    it('blocks have valid position values', () => {
      const blueprint = getDefaultBlueprint('coffee', 'menu', {});

      blueprint.blocks.forEach(block => {
        expect(block.x).toBeGreaterThanOrEqual(0);
        expect(block.x).toBeLessThanOrEqual(1);
        expect(block.y).toBeGreaterThanOrEqual(0);
        expect(block.y).toBeLessThanOrEqual(1);
        expect(block.width).toBeGreaterThan(0);
        expect(block.width).toBeLessThanOrEqual(1);
        expect(block.height).toBeGreaterThan(0);
        expect(block.height).toBeLessThanOrEqual(1);
      });
    });

    it('text blocks have text property', () => {
      const blueprint = getDefaultBlueprint('gym', 'motivation', {
        quote: 'Test Quote',
      });

      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');
      textBlocks.forEach(block => {
        expect(block).toHaveProperty('text');
        expect(typeof block.text).toBe('string');
      });
    });

    it('shape blocks have fill property', () => {
      const blueprint = getDefaultBlueprint('retail', 'sale', {});

      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');
      shapeBlocks.forEach(block => {
        expect(block).toHaveProperty('fill');
      });
    });

    it('image blocks have placeholder', () => {
      const blueprint = getDefaultBlueprint('realestate', 'listing', {});

      const imageBlocks = blueprint.blocks.filter(b => b.type === 'image');
      imageBlocks.forEach(block => {
        expect(block).toHaveProperty('placeholder');
      });
    });
  });

  describe('Gym Membership Plans wizard', () => {
    it('generates 2 plan cards when planCount is 2', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', { planCount: '2' });

      // Should have: 1 title text + 2 plans * (1 shape + 2 texts) = 1 + 6 = 7 blocks
      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');
      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');

      expect(shapeBlocks).toHaveLength(2); // 2 card backgrounds
      // 1 title + 2 plan names + 2 prices = 5 text blocks
      expect(textBlocks).toHaveLength(5);
    });

    it('generates 3 plan cards when planCount is 3', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', { planCount: '3' });

      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');
      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');

      expect(shapeBlocks).toHaveLength(3); // 3 card backgrounds
      // 1 title + 3 plan names + 3 prices = 7 text blocks
      expect(textBlocks).toHaveLength(7);
    });

    it('generates 4 plan cards when planCount is 4', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', { planCount: '4' });

      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');
      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');

      expect(shapeBlocks).toHaveLength(4); // 4 card backgrounds
      // 1 title + 4 plan names + 4 prices = 9 text blocks
      expect(textBlocks).toHaveLength(9);
    });

    it('defaults to 3 plans when planCount is not specified', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', {});

      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');
      expect(shapeBlocks).toHaveLength(3);
    });

    it('cards have correct plan names', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', { planCount: '4' });
      const textBlocks = blueprint.blocks.filter(b => b.type === 'text');

      const planNames = textBlocks
        .filter(b => ['Basic', 'Pro', 'Elite', 'Premium'].includes(b.text))
        .map(b => b.text);

      expect(planNames).toContain('Basic');
      expect(planNames).toContain('Pro');
      expect(planNames).toContain('Elite');
      expect(planNames).toContain('Premium');
    });

    it('cards are evenly spaced across the canvas', () => {
      const blueprint = getDefaultBlueprint('gym', 'membership', { planCount: '3' });
      const shapeBlocks = blueprint.blocks.filter(b => b.type === 'shape');

      // Cards should be positioned with even spacing
      const xPositions = shapeBlocks.map(b => b.x);
      expect(xPositions[0]).toBeGreaterThanOrEqual(0);
      expect(xPositions[1]).toBeGreaterThan(xPositions[0]);
      expect(xPositions[2]).toBeGreaterThan(xPositions[1]);
      expect(xPositions[2] + shapeBlocks[2].width).toBeLessThanOrEqual(1);
    });
  });

  describe('buildWizardSlides', () => {
    it('calls createSlide with correct parameters', async () => {
      await buildWizardSlides({
        sceneId: 'test-scene-id',
        industry: 'restaurant',
        wizardKey: 'menu',
        formData: { restaurantName: 'Test' },
      });

      expect(createSlide).toHaveBeenCalledTimes(1);
      expect(createSlide).toHaveBeenCalledWith(
        'test-scene-id',
        expect.objectContaining({
          title: 'Digital Menu Board',
          kind: 'menu',
          design_json: expect.objectContaining({
            background: expect.any(Object),
            blocks: expect.any(Array),
          }),
        })
      );
    });

    it('returns created slide', async () => {
      const result = await buildWizardSlides({
        sceneId: 'test-scene-id',
        industry: 'restaurant',
        wizardKey: 'welcome',
        formData: {},
      });

      expect(result).toEqual({ id: 'mock-slide-id' });
    });
  });
});
