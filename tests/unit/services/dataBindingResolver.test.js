/**
 * Data Binding Resolver Unit Tests
 * Tests for data binding resolution and caching utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dataSourceService
vi.mock('../../../src/services/dataSourceService', () => ({
  getDataSource: vi.fn().mockResolvedValue(null),
  formatValue: vi.fn((value) => String(value)),
  FIELD_DATA_TYPES: {
    TEXT: 'text',
    NUMBER: 'number',
    CURRENCY: 'currency',
    IMAGE_URL: 'image_url',
    BOOLEAN: 'boolean',
    DATE: 'date',
  },
}));

import {
  clearBindingCache,
  clearCachedDataSource,
  getCachedDataSource,
  preloadDataSources,
  resolveBinding,
  resolveBlockBindings,
  resolveSlideBindings,
  extractDataSourceIds,
  hasBindings,
  getBindingDisplayText,
  createBinding,
  indexRowSelector,
  matchRowSelector,
  allRowsSelector,
  prefetchSceneDataSources,
  getStaleDataSourceIds,
} from '../../../src/services/dataBindingResolver';

describe('dataBindingResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBindingCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearBindingCache', () => {
    it('clears the cache without errors', () => {
      expect(() => clearBindingCache()).not.toThrow();
    });
  });

  describe('clearCachedDataSource', () => {
    it('clears specific data source without errors', () => {
      expect(() => clearCachedDataSource('test-id')).not.toThrow();
    });
  });

  describe('getCachedDataSource', () => {
    it('returns null for null ID', async () => {
      const result = await getCachedDataSource(null);
      expect(result).toBeNull();
    });

    it('returns null for empty string ID', async () => {
      const result = await getCachedDataSource('');
      expect(result).toBeNull();
    });
  });

  describe('preloadDataSources', () => {
    it('returns empty map for empty array', async () => {
      const result = await preloadDataSources([]);
      expect(result.size).toBe(0);
    });

    it('returns empty map for null array', async () => {
      const result = await preloadDataSources(null);
      expect(result).toEqual(new Map());
    });

    it('filters out null/undefined IDs', async () => {
      const result = await preloadDataSources([null, undefined, '']);
      expect(result.size).toBe(0);
    });
  });

  describe('resolveBinding', () => {
    it('returns empty string for null binding', async () => {
      const result = await resolveBinding(null);
      expect(result).toBe('');
    });

    it('returns empty string for binding without sourceId', async () => {
      const result = await resolveBinding({ field: 'test' });
      expect(result).toBe('');
    });

    it('returns empty string for binding without field', async () => {
      const result = await resolveBinding({ sourceId: 'test' });
      expect(result).toBe('');
    });
  });

  describe('resolveBlockBindings', () => {
    it('returns block unchanged if no bindings', async () => {
      const block = { id: 'block-1', type: 'text', props: { text: 'Hello' } };
      const result = await resolveBlockBindings(block);

      expect(result.id).toBe('block-1');
      expect(result.props.text).toBe('Hello');
    });

    it('returns null for null block', async () => {
      const result = await resolveBlockBindings(null);
      expect(result).toBeNull();
    });

    it('returns undefined for undefined block', async () => {
      const result = await resolveBlockBindings(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('resolveSlideBindings', () => {
    it('returns blocks unchanged for empty array', async () => {
      const result = await resolveSlideBindings([]);
      expect(result).toEqual([]);
    });

    it('returns original value for non-array', async () => {
      const result = await resolveSlideBindings(null);
      expect(result).toBeNull();
    });
  });

  describe('extractDataSourceIds', () => {
    it('returns empty array for null design', () => {
      const result = extractDataSourceIds(null);
      expect(result).toEqual([]);
    });

    it('returns empty array for design without slides', () => {
      const result = extractDataSourceIds({});
      expect(result).toEqual([]);
    });

    it('returns empty array for design with empty slides', () => {
      const result = extractDataSourceIds({ slides: [] });
      expect(result).toEqual([]);
    });

    it('extracts source IDs from block dataBinding', () => {
      const designJson = {
        slides: [
          {
            blocks: [
              { id: 'block-1', dataBinding: { sourceId: 'source-1', field: 'name' } },
              { id: 'block-2', dataBinding: { sourceId: 'source-2', field: 'price' } },
            ],
          },
        ],
      };

      const result = extractDataSourceIds(designJson);
      expect(result).toContain('source-1');
      expect(result).toContain('source-2');
      expect(result).toHaveLength(2);
    });

    it('extracts source IDs from propertyBindings', () => {
      const designJson = {
        slides: [
          {
            blocks: [
              {
                id: 'block-1',
                propertyBindings: {
                  text: { sourceId: 'source-1', field: 'name' },
                  color: { sourceId: 'source-2', field: 'color' },
                },
              },
            ],
          },
        ],
      };

      const result = extractDataSourceIds(designJson);
      expect(result).toContain('source-1');
      expect(result).toContain('source-2');
    });

    it('deduplicates source IDs', () => {
      const designJson = {
        slides: [
          {
            blocks: [
              { id: 'block-1', dataBinding: { sourceId: 'source-1', field: 'name' } },
              { id: 'block-2', dataBinding: { sourceId: 'source-1', field: 'price' } },
            ],
          },
        ],
      };

      const result = extractDataSourceIds(designJson);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('source-1');
    });
  });

  describe('hasBindings', () => {
    it('returns false for null block', () => {
      expect(hasBindings(null)).toBe(false);
    });

    it('returns false for block without bindings', () => {
      expect(hasBindings({ id: 'block-1', type: 'text' })).toBe(false);
    });

    it('returns false for block with empty dataBinding', () => {
      expect(hasBindings({ id: 'block-1', dataBinding: {} })).toBe(false);
    });

    it('returns true for block with dataBinding', () => {
      expect(
        hasBindings({
          id: 'block-1',
          dataBinding: { sourceId: 'source-1', field: 'name' },
        })
      ).toBe(true);
    });

    it('returns true for block with propertyBindings', () => {
      expect(
        hasBindings({
          id: 'block-1',
          propertyBindings: { text: { sourceId: 'source-1', field: 'name' } },
        })
      ).toBe(true);
    });

    it('returns false for block with empty propertyBindings', () => {
      expect(hasBindings({ id: 'block-1', propertyBindings: {} })).toBe(false);
    });
  });

  describe('getBindingDisplayText', () => {
    it('returns "No binding" for null binding', () => {
      expect(getBindingDisplayText(null)).toBe('No binding');
    });

    it('returns "No binding" for empty binding', () => {
      expect(getBindingDisplayText({})).toBe('No binding');
    });

    it('returns "No binding" for binding without sourceId', () => {
      expect(getBindingDisplayText({ field: 'name' })).toBe('No binding');
    });

    it('returns "No binding" for binding without field', () => {
      expect(getBindingDisplayText({ sourceId: 'source-1' })).toBe('No binding');
    });

    it('returns field name with row info for index mode', () => {
      const result = getBindingDisplayText({
        sourceId: 'source-1',
        field: 'name',
        rowSelector: { mode: 'index', index: 2 },
      });
      expect(result).toBe('name (Row 3)'); // 0-indexed to 1-indexed
    });

    it('returns field name with default row for missing rowSelector', () => {
      const result = getBindingDisplayText({
        sourceId: 'source-1',
        field: 'price',
      });
      expect(result).toBe('price (Row 1)');
    });

    it('returns field name with match info for match mode', () => {
      const result = getBindingDisplayText({
        sourceId: 'source-1',
        field: 'name',
        rowSelector: { mode: 'match', matchField: 'id', matchValue: '123' },
      });
      expect(result).toBe('name (id="123")');
    });

    it('returns field name with all rows for all mode', () => {
      const result = getBindingDisplayText({
        sourceId: 'source-1',
        field: 'name',
        rowSelector: { mode: 'all' },
      });
      expect(result).toBe('name (All rows)');
    });
  });

  describe('createBinding', () => {
    it('creates binding with default rowSelector', () => {
      const binding = createBinding({ sourceId: 'source-1', field: 'name' });

      expect(binding.sourceId).toBe('source-1');
      expect(binding.field).toBe('name');
      expect(binding.rowSelector).toEqual({ mode: 'index', index: 0 });
    });

    it('creates binding with custom rowSelector', () => {
      const binding = createBinding({
        sourceId: 'source-1',
        field: 'name',
        rowSelector: { mode: 'all' },
      });

      expect(binding.rowSelector).toEqual({ mode: 'all' });
    });

    it('includes format options when provided', () => {
      const binding = createBinding({
        sourceId: 'source-1',
        field: 'price',
        format: { symbol: '€', decimals: 2 },
      });

      expect(binding.format).toEqual({ symbol: '€', decimals: 2 });
    });

    it('excludes format when not provided', () => {
      const binding = createBinding({ sourceId: 'source-1', field: 'name' });

      expect(binding).not.toHaveProperty('format');
    });
  });

  describe('row selector helpers', () => {
    it('indexRowSelector creates index-mode selector', () => {
      const selector = indexRowSelector(5);
      expect(selector).toEqual({ mode: 'index', index: 5 });
    });

    it('matchRowSelector creates match-mode selector', () => {
      const selector = matchRowSelector('id', '123');
      expect(selector).toEqual({ mode: 'match', matchField: 'id', matchValue: '123' });
    });

    it('allRowsSelector creates all-mode selector', () => {
      const selector = allRowsSelector();
      expect(selector).toEqual({ mode: 'all' });
    });
  });

  describe('prefetchSceneDataSources', () => {
    it('returns true for design without data sources', async () => {
      const result = await prefetchSceneDataSources({ slides: [] });
      expect(result).toBe(true);
    });

    it('returns true for null design', async () => {
      const result = await prefetchSceneDataSources(null);
      expect(result).toBe(true);
    });
  });

  describe('getStaleDataSourceIds', () => {
    it('returns all IDs when cache is empty', () => {
      clearBindingCache();
      const result = getStaleDataSourceIds(['source-1', 'source-2']);
      expect(result).toContain('source-1');
      expect(result).toContain('source-2');
    });

    it('returns empty array for empty input', () => {
      const result = getStaleDataSourceIds([]);
      expect(result).toEqual([]);
    });
  });
});

describe('dataBindingResolver exports', () => {
  it('exports all required functions', async () => {
    const resolver = await import('../../../src/services/dataBindingResolver');

    // Cache management
    expect(typeof resolver.clearBindingCache).toBe('function');
    expect(typeof resolver.clearCachedDataSource).toBe('function');
    expect(typeof resolver.getCachedDataSource).toBe('function');
    expect(typeof resolver.preloadDataSources).toBe('function');

    // Binding resolution
    expect(typeof resolver.resolveBinding).toBe('function');
    expect(typeof resolver.resolveBlockBindings).toBe('function');
    expect(typeof resolver.resolveSlideBindings).toBe('function');

    // Utilities
    expect(typeof resolver.extractDataSourceIds).toBe('function');
    expect(typeof resolver.hasBindings).toBe('function');
    expect(typeof resolver.getBindingDisplayText).toBe('function');

    // Binding creation
    expect(typeof resolver.createBinding).toBe('function');
    expect(typeof resolver.indexRowSelector).toBe('function');
    expect(typeof resolver.matchRowSelector).toBe('function');
    expect(typeof resolver.allRowsSelector).toBe('function');

    // Player utilities
    expect(typeof resolver.prefetchSceneDataSources).toBe('function');
    expect(typeof resolver.getStaleDataSourceIds).toBe('function');
    expect(typeof resolver.refreshStaleDataSources).toBe('function');
  });
});
