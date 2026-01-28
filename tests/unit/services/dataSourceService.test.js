/**
 * Data Source Service Unit Tests
 * Tests for data source CRUD operations and CSV parsing
 */
import { describe, it, expect, vi } from 'vitest';
import {
  DATA_SOURCE_TYPES,
  FIELD_DATA_TYPES,
  parseCSV,
  formatValue,
} from '../../../src/services/dataSourceService';

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
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('dataSourceService constants', () => {
  describe('DATA_SOURCE_TYPES', () => {
    it('exports INTERNAL_TABLE type', () => {
      expect(DATA_SOURCE_TYPES.INTERNAL_TABLE).toBe('internal_table');
    });

    it('exports CSV_IMPORT type', () => {
      expect(DATA_SOURCE_TYPES.CSV_IMPORT).toBe('csv_import');
    });
  });

  describe('FIELD_DATA_TYPES', () => {
    it('exports all required field types', () => {
      expect(FIELD_DATA_TYPES.TEXT).toBe('text');
      expect(FIELD_DATA_TYPES.NUMBER).toBe('number');
      expect(FIELD_DATA_TYPES.CURRENCY).toBe('currency');
      expect(FIELD_DATA_TYPES.IMAGE_URL).toBe('image_url');
      expect(FIELD_DATA_TYPES.BOOLEAN).toBe('boolean');
      expect(FIELD_DATA_TYPES.DATE).toBe('date');
    });
  });
});

describe('parseCSV', () => {
  it('parses simple CSV with headers', () => {
    const csv = 'name,price\nBurger,10.99\nPizza,12.99';
    const result = parseCSV(csv);

    expect(result.headers).toEqual(['name', 'price']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['Burger', '10.99']);
    expect(result.rows[1]).toEqual(['Pizza', '12.99']);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,description\n"Burger, Deluxe",Great food\nPizza,Classic';
    const result = parseCSV(csv);

    expect(result.headers).toEqual(['name', 'description']);
    expect(result.rows[0]).toEqual(['Burger, Deluxe', 'Great food']);
    expect(result.rows[1]).toEqual(['Pizza', 'Classic']);
  });

  it('handles escaped quotes inside quoted fields', () => {
    const csv = 'name,quote\nItem,"He said ""hello"""';
    const result = parseCSV(csv);

    expect(result.rows[0]).toEqual(['Item', 'He said "hello"']);
  });

  it('handles Windows-style line endings (CRLF)', () => {
    const csv = 'name,price\r\nBurger,10.99\r\nPizza,12.99';
    const result = parseCSV(csv);

    expect(result.rows).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('returns empty for null input', () => {
    const result = parseCSV(null);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('handles CSV without headers when hasHeaders is false', () => {
    const csv = 'Burger,10.99\nPizza,12.99';
    const result = parseCSV(csv, { hasHeaders: false });

    expect(result.headers).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['Burger', '10.99']);
  });

  it('handles custom delimiter', () => {
    const csv = 'name;price\nBurger;10.99';
    const result = parseCSV(csv, { delimiter: ';' });

    expect(result.headers).toEqual(['name', 'price']);
    expect(result.rows[0]).toEqual(['Burger', '10.99']);
  });
});

describe('formatValue', () => {
  describe('currency formatting', () => {
    it('formats number as currency with default options', () => {
      const result = formatValue(10.99, FIELD_DATA_TYPES.CURRENCY);
      expect(result).toBe('$10.99');
    });

    it('formats with custom symbol', () => {
      const result = formatValue(10.99, FIELD_DATA_TYPES.CURRENCY, { symbol: '€' });
      expect(result).toBe('€10.99');
    });

    it('formats with custom decimals', () => {
      const result = formatValue(10, FIELD_DATA_TYPES.CURRENCY, { decimals: 0 });
      expect(result).toBe('$10');
    });

    it('handles string input', () => {
      const result = formatValue('10.99', FIELD_DATA_TYPES.CURRENCY);
      expect(result).toBe('$10.99');
    });

    it('returns original value for non-numeric input', () => {
      const result = formatValue('not a number', FIELD_DATA_TYPES.CURRENCY);
      expect(result).toBe('not a number');
    });
  });

  describe('number formatting', () => {
    it('formats number with default decimals', () => {
      const result = formatValue(42.567, FIELD_DATA_TYPES.NUMBER);
      expect(result).toBe('43'); // 0 decimals by default
    });

    it('formats number with custom decimals', () => {
      const result = formatValue(42.567, FIELD_DATA_TYPES.NUMBER, { decimals: 2 });
      expect(result).toBe('42.57');
    });
  });

  describe('boolean formatting', () => {
    it('formats true as Yes', () => {
      expect(formatValue(true, FIELD_DATA_TYPES.BOOLEAN)).toBe('Yes');
      expect(formatValue('true', FIELD_DATA_TYPES.BOOLEAN)).toBe('Yes');
      expect(formatValue('1', FIELD_DATA_TYPES.BOOLEAN)).toBe('Yes');
    });

    it('formats false as No', () => {
      expect(formatValue(false, FIELD_DATA_TYPES.BOOLEAN)).toBe('No');
      expect(formatValue('false', FIELD_DATA_TYPES.BOOLEAN)).toBe('No');
      expect(formatValue('0', FIELD_DATA_TYPES.BOOLEAN)).toBe('No');
    });
  });

  describe('date formatting', () => {
    it('formats date with default format', () => {
      const result = formatValue('2025-01-15', FIELD_DATA_TYPES.DATE);
      expect(result).toBe('01/15/2025');
    });

    it('returns original value for invalid date', () => {
      const result = formatValue('not a date', FIELD_DATA_TYPES.DATE);
      expect(result).toBe('not a date');
    });
  });

  describe('text formatting', () => {
    it('returns text as-is', () => {
      const result = formatValue('Hello World', FIELD_DATA_TYPES.TEXT);
      expect(result).toBe('Hello World');
    });

    it('converts numbers to string', () => {
      const result = formatValue(42, FIELD_DATA_TYPES.TEXT);
      expect(result).toBe('42');
    });
  });

  describe('empty values', () => {
    it('returns empty string for null', () => {
      expect(formatValue(null, FIELD_DATA_TYPES.TEXT)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatValue(undefined, FIELD_DATA_TYPES.TEXT)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(formatValue('', FIELD_DATA_TYPES.TEXT)).toBe('');
    });
  });
});

describe('dataSourceService exports', () => {
  it('exports all required functions', async () => {
    const service = await import('../../../src/services/dataSourceService');

    // Data source CRUD
    expect(typeof service.fetchDataSources).toBe('function');
    expect(typeof service.getDataSource).toBe('function');
    expect(typeof service.getDataSourceByName).toBe('function');
    expect(typeof service.createDataSource).toBe('function');
    expect(typeof service.updateDataSource).toBe('function');
    expect(typeof service.deleteDataSource).toBe('function');

    // Field CRUD
    expect(typeof service.getDataSourceFields).toBe('function');
    expect(typeof service.createField).toBe('function');
    expect(typeof service.updateField).toBe('function');
    expect(typeof service.deleteField).toBe('function');
    expect(typeof service.reorderFields).toBe('function');

    // Row CRUD
    expect(typeof service.getDataSourceRows).toBe('function');
    expect(typeof service.createRow).toBe('function');
    expect(typeof service.updateRow).toBe('function');
    expect(typeof service.updateRowValue).toBe('function');
    expect(typeof service.deleteRow).toBe('function');
    expect(typeof service.deactivateRow).toBe('function');
    expect(typeof service.reactivateRow).toBe('function');
    expect(typeof service.reorderRows).toBe('function');

    // CSV
    expect(typeof service.parseCSV).toBe('function');
    expect(typeof service.importCSVData).toBe('function');
    expect(typeof service.createDataSourceFromCSV).toBe('function');

    // Binding resolution
    expect(typeof service.resolveBinding).toBe('function');
    expect(typeof service.resolveMultipleBindings).toBe('function');
    expect(typeof service.getBindingKey).toBe('function');

    // Value formatting
    expect(typeof service.formatValue).toBe('function');
  });
});

describe('validation', () => {
  it('getDataSource throws for missing ID', async () => {
    const { getDataSource } = await import('../../../src/services/dataSourceService');

    await expect(getDataSource(null)).rejects.toThrow('Data source ID is required');
    await expect(getDataSource('')).rejects.toThrow('Data source ID is required');
  });

  it('createDataSource throws for missing name', async () => {
    const { createDataSource } = await import('../../../src/services/dataSourceService');

    await expect(createDataSource({ clientId: 'test' })).rejects.toThrow('Data source name is required');
    await expect(createDataSource({ name: '', clientId: 'test' })).rejects.toThrow('Data source name is required');
  });

  it('createDataSource throws for missing clientId', async () => {
    const { createDataSource } = await import('../../../src/services/dataSourceService');

    await expect(createDataSource({ name: 'Test' })).rejects.toThrow('Client ID is required');
  });

  it('createField throws for missing dataSourceId', async () => {
    const { createField } = await import('../../../src/services/dataSourceService');

    await expect(createField({ name: 'test', label: 'Test' })).rejects.toThrow('Data source ID is required');
  });

  it('createField throws for missing name', async () => {
    const { createField } = await import('../../../src/services/dataSourceService');

    await expect(createField({ dataSourceId: 'test', label: 'Test' })).rejects.toThrow('Field name is required');
  });

  it('createField throws for missing label', async () => {
    const { createField } = await import('../../../src/services/dataSourceService');

    await expect(createField({ dataSourceId: 'test', name: 'test' })).rejects.toThrow('Field label is required');
  });

  it('getDataSourceFields throws for missing ID', async () => {
    const { getDataSourceFields } = await import('../../../src/services/dataSourceService');

    await expect(getDataSourceFields(null)).rejects.toThrow('Data source ID is required');
  });

  it('getDataSourceRows throws for missing ID', async () => {
    const { getDataSourceRows } = await import('../../../src/services/dataSourceService');

    await expect(getDataSourceRows(null)).rejects.toThrow('Data source ID is required');
  });

  it('createRow throws for missing dataSourceId', async () => {
    const { createRow } = await import('../../../src/services/dataSourceService');

    await expect(createRow({ values: {} })).rejects.toThrow('Data source ID is required');
  });
});

describe('getBindingKey', () => {
  it('returns empty string for invalid binding', async () => {
    const { getBindingKey } = await import('../../../src/services/dataSourceService');

    expect(getBindingKey(null)).toBe('');
    expect(getBindingKey({})).toBe('');
    expect(getBindingKey({ sourceId: 'test' })).toBe('');
    expect(getBindingKey({ field: 'test' })).toBe('');
  });

  it('generates key for valid binding', async () => {
    const { getBindingKey } = await import('../../../src/services/dataSourceService');

    const key = getBindingKey({
      sourceId: 'source-123',
      field: 'price',
      rowSelector: { mode: 'index', index: 0 },
    });

    expect(key).toBe('source-123:price:{"mode":"index","index":0}');
  });

  it('uses default row selector', async () => {
    const { getBindingKey } = await import('../../../src/services/dataSourceService');

    const key = getBindingKey({
      sourceId: 'source-123',
      field: 'price',
    });

    expect(key).toBe('source-123:price:{"mode":"index","index":0}');
  });
});
