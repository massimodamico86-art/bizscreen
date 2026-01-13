/**
 * Google Sheets Service Unit Tests
 * Tests for Google Sheets data fetching and change detection
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  INTEGRATION_TYPES,
  SYNC_STATUS,
  parseSheetId,
  convertSheetRowsToInternalRows,
  detectChangedRows,
  generateFieldDefinitions,
} from '../../../src/services/googleSheetsService';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('googleSheetsService constants', () => {
  describe('INTEGRATION_TYPES', () => {
    it('exports NONE type', () => {
      expect(INTEGRATION_TYPES.NONE).toBe('none');
    });

    it('exports GOOGLE_SHEETS type', () => {
      expect(INTEGRATION_TYPES.GOOGLE_SHEETS).toBe('google_sheets');
    });
  });

  describe('SYNC_STATUS', () => {
    it('exports all status types', () => {
      expect(SYNC_STATUS.OK).toBe('ok');
      expect(SYNC_STATUS.ERROR).toBe('error');
      expect(SYNC_STATUS.NO_CHANGE).toBe('no_change');
      expect(SYNC_STATUS.PENDING).toBe('pending');
    });
  });
});

// ============================================================================
// PARSE SHEET ID TESTS
// ============================================================================

describe('parseSheetId', () => {
  it('returns null for null input', () => {
    expect(parseSheetId(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseSheetId(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSheetId('')).toBeNull();
  });

  it('returns ID directly if no slashes', () => {
    const sheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    expect(parseSheetId(sheetId)).toBe(sheetId);
  });

  it('extracts ID from full Google Sheets URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    expect(parseSheetId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  });

  it('extracts ID from URL without hash', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123def456/edit';
    expect(parseSheetId(url)).toBe('abc123def456');
  });

  it('extracts ID from URL with hyphens and underscores', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc-123_def-456/edit';
    expect(parseSheetId(url)).toBe('abc-123_def-456');
  });

  it('returns null for invalid URL format', () => {
    const invalidUrl = 'https://example.com/something/else';
    expect(parseSheetId(invalidUrl)).toBeNull();
  });
});

// ============================================================================
// CONVERT SHEET ROWS TESTS
// ============================================================================

describe('convertSheetRowsToInternalRows', () => {
  it('converts empty array', () => {
    const result = convertSheetRowsToInternalRows(['name', 'price'], []);
    expect(result).toEqual([]);
  });

  it('converts single row', () => {
    const headers = ['name', 'price'];
    const sheetValues = [['Burger', '10.99']];
    const result = convertSheetRowsToInternalRows(headers, sheetValues);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      values: { name: 'Burger', price: '10.99' },
      orderIndex: 0,
    });
  });

  it('converts multiple rows', () => {
    const headers = ['name', 'price'];
    const sheetValues = [
      ['Burger', '10.99'],
      ['Pizza', '12.99'],
      ['Salad', '8.99'],
    ];
    const result = convertSheetRowsToInternalRows(headers, sheetValues);

    expect(result).toHaveLength(3);
    expect(result[0].values.name).toBe('Burger');
    expect(result[1].values.name).toBe('Pizza');
    expect(result[2].values.name).toBe('Salad');
    expect(result[2].orderIndex).toBe(2);
  });

  it('handles missing values in row', () => {
    const headers = ['name', 'price', 'description'];
    const sheetValues = [['Burger', '10.99']]; // Missing description
    const result = convertSheetRowsToInternalRows(headers, sheetValues);

    expect(result[0].values).toEqual({
      name: 'Burger',
      price: '10.99',
      description: '',
    });
  });

  it('converts all values to strings', () => {
    const headers = ['name', 'count', 'active'];
    const sheetValues = [['Item', 42, true]];
    const result = convertSheetRowsToInternalRows(headers, sheetValues);

    expect(result[0].values.count).toBe('42');
    expect(result[0].values.active).toBe('true');
  });
});

// ============================================================================
// DETECT CHANGED ROWS TESTS
// ============================================================================

describe('detectChangedRows', () => {
  it('detects no changes for empty arrays', () => {
    const result = detectChangedRows([], []);
    expect(result.changed).toBe(false);
    expect(result.summary).toBe('No changes detected');
  });

  it('detects added rows', () => {
    const oldRows = [];
    const newRows = [{ values: { name: 'New Item' } }];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(true);
    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(0);
  });

  it('detects removed rows', () => {
    const oldRows = [
      { values: { name: 'Item 1' } },
      { values: { name: 'Item 2' } },
    ];
    const newRows = [{ values: { name: 'Item 1' } }];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(true);
    expect(result.removedCount).toBe(1);
    expect(result.addedCount).toBe(0);
  });

  it('detects updated rows', () => {
    const oldRows = [
      { values: { name: 'Burger', price: '10.99' } },
    ];
    const newRows = [
      { values: { name: 'Burger', price: '11.99' } },
    ];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.summary).toContain('1 row updated');
  });

  it('detects no changes when values are identical', () => {
    const oldRows = [
      { values: { name: 'Burger', price: '10.99' } },
      { values: { name: 'Pizza', price: '12.99' } },
    ];
    const newRows = [
      { values: { name: 'Burger', price: '10.99' } },
      { values: { name: 'Pizza', price: '12.99' } },
    ];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(false);
    expect(result.updatedCount).toBe(0);
  });

  it('handles multiple updated rows', () => {
    const oldRows = [
      { values: { name: 'A', price: '1' } },
      { values: { name: 'B', price: '2' } },
      { values: { name: 'C', price: '3' } },
    ];
    const newRows = [
      { values: { name: 'A', price: '10' } },
      { values: { name: 'B', price: '2' } },
      { values: { name: 'C', price: '30' } },
    ];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(true);
    expect(result.updatedCount).toBe(2);
    expect(result.summary).toContain('2 rows updated');
  });

  it('handles null values in comparison', () => {
    const oldRows = [{ values: { name: null } }];
    const newRows = [{ values: { name: '' } }];
    const result = detectChangedRows(oldRows, newRows);

    expect(result.changed).toBe(false);
  });

  it('handles undefined old values', () => {
    const result = detectChangedRows(undefined, []);
    expect(result.changed).toBe(false);
  });
});

// ============================================================================
// GENERATE FIELD DEFINITIONS TESTS
// ============================================================================

describe('generateFieldDefinitions', () => {
  it('generates fields from headers', () => {
    const headers = ['name', 'price', 'description'];
    const result = generateFieldDefinitions(headers);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: 'name',
      label: 'Name',
      dataType: 'text',
      orderIndex: 0,
    });
    expect(result[1].name).toBe('price');
    expect(result[2].orderIndex).toBe(2);
  });

  it('creates labels from snake_case names', () => {
    const headers = ['item_name', 'unit_price', 'is_available'];
    const result = generateFieldDefinitions(headers);

    expect(result[0].label).toBe('Item Name');
    expect(result[1].label).toBe('Unit Price');
    expect(result[2].label).toBe('Is Available');
  });

  it('infers currency type from sample values', () => {
    const headers = ['price'];
    const sampleRows = [{ values: { price: '$10.99' } }];
    const result = generateFieldDefinitions(headers, sampleRows);

    expect(result[0].dataType).toBe('currency');
  });

  it('infers number type from sample values', () => {
    const headers = ['count'];
    // Use a negative number which triggers the number regex (with leading -)
    const sampleRows = [{ values: { count: '-42' } }];
    const result = generateFieldDefinitions(headers, sampleRows);

    expect(result[0].dataType).toBe('number');
  });

  it('infers boolean type from sample values', () => {
    const headers = ['active'];
    const sampleRows = [{ values: { active: 'true' } }];
    const result = generateFieldDefinitions(headers, sampleRows);

    expect(result[0].dataType).toBe('boolean');
  });

  it('infers date type from sample values', () => {
    const headers = ['created'];
    const sampleRows = [{ values: { created: '2024-01-15' } }];
    const result = generateFieldDefinitions(headers, sampleRows);

    expect(result[0].dataType).toBe('date');
  });

  it('defaults to text for unknown types', () => {
    const headers = ['description'];
    const sampleRows = [{ values: { description: 'Some text here' } }];
    const result = generateFieldDefinitions(headers, sampleRows);

    expect(result[0].dataType).toBe('text');
  });

  it('handles empty sample rows', () => {
    const headers = ['name', 'price'];
    const result = generateFieldDefinitions(headers, []);

    expect(result).toHaveLength(2);
    expect(result[0].dataType).toBe('text');
    expect(result[1].dataType).toBe('text');
  });
});
