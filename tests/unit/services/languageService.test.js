/**
 * Language Service Unit Tests
 * Tests for location mapping and language utility functions
 *
 * Phase 21-04: Test coverage for multi-language features
 *
 * Note: Most tests here are for pure functions (no database mocking needed).
 * Supabase mocking is only required for database operation tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing (needed for some functions that import supabase)
vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock loggingService
vi.mock('../../../src/services/loggingService', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('languageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LOCATION_LANGUAGE_MAP constant', () => {
    it('has expected country codes', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      // Check key countries are mapped
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('US');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('GB');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('ES');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('FR');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('DE');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('IT');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('PT');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('BR');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('MX');
      expect(LOCATION_LANGUAGE_MAP).toHaveProperty('JP');
    });

    it('has correct English mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.US).toBe('en');
      expect(LOCATION_LANGUAGE_MAP.GB).toBe('en');
      expect(LOCATION_LANGUAGE_MAP.CA).toBe('en');
      expect(LOCATION_LANGUAGE_MAP.AU).toBe('en');
      expect(LOCATION_LANGUAGE_MAP.NZ).toBe('en');
      expect(LOCATION_LANGUAGE_MAP.IE).toBe('en');
    });

    it('has correct Spanish mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.ES).toBe('es');
      expect(LOCATION_LANGUAGE_MAP.MX).toBe('es');
      expect(LOCATION_LANGUAGE_MAP.AR).toBe('es');
      expect(LOCATION_LANGUAGE_MAP.CO).toBe('es');
      expect(LOCATION_LANGUAGE_MAP.CL).toBe('es');
      expect(LOCATION_LANGUAGE_MAP.PE).toBe('es');
    });

    it('has correct French mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.FR).toBe('fr');
      expect(LOCATION_LANGUAGE_MAP.BE).toBe('fr');
    });

    it('has correct German mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.DE).toBe('de');
      expect(LOCATION_LANGUAGE_MAP.AT).toBe('de');
      expect(LOCATION_LANGUAGE_MAP.CH).toBe('de');
    });

    it('has correct Portuguese mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.PT).toBe('pt');
      expect(LOCATION_LANGUAGE_MAP.BR).toBe('pt');
    });

    it('has correct Asian language mappings', async () => {
      const { LOCATION_LANGUAGE_MAP } = await import('../../../src/services/languageService');

      expect(LOCATION_LANGUAGE_MAP.JP).toBe('ja');
      expect(LOCATION_LANGUAGE_MAP.CN).toBe('zh');
      expect(LOCATION_LANGUAGE_MAP.TW).toBe('zh');
      expect(LOCATION_LANGUAGE_MAP.HK).toBe('zh');
      expect(LOCATION_LANGUAGE_MAP.KR).toBe('ko');
    });
  });

  describe('getLanguageForLocation', () => {
    it('returns correct language for known locations', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation('US')).toBe('en');
      expect(getLanguageForLocation('ES')).toBe('es');
      expect(getLanguageForLocation('FR')).toBe('fr');
      expect(getLanguageForLocation('DE')).toBe('de');
      expect(getLanguageForLocation('IT')).toBe('it');
      expect(getLanguageForLocation('PT')).toBe('pt');
      expect(getLanguageForLocation('BR')).toBe('pt');
      expect(getLanguageForLocation('JP')).toBe('ja');
    });

    it('returns "en" for null input', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation(null)).toBe('en');
    });

    it('returns "en" for undefined input', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation(undefined)).toBe('en');
    });

    it('returns "en" for empty string', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation('')).toBe('en');
    });

    it('returns "en" for unknown location codes', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation('XX')).toBe('en');
      expect(getLanguageForLocation('UNKNOWN')).toBe('en');
      expect(getLanguageForLocation('ZZ')).toBe('en');
    });

    it('handles lowercase input (converts to uppercase)', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation('us')).toBe('en');
      expect(getLanguageForLocation('es')).toBe('es');
      expect(getLanguageForLocation('fr')).toBe('fr');
      expect(getLanguageForLocation('de')).toBe('de');
    });

    it('handles mixed case input', async () => {
      const { getLanguageForLocation } = await import('../../../src/services/languageService');

      expect(getLanguageForLocation('Us')).toBe('en');
      expect(getLanguageForLocation('Es')).toBe('es');
      expect(getLanguageForLocation('Fr')).toBe('fr');
    });
  });

  describe('getAvailableLocations', () => {
    it('returns an array', async () => {
      const { getAvailableLocations } = await import('../../../src/services/languageService');

      const locations = getAvailableLocations();

      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
    });

    it('each item has code and name properties', async () => {
      const { getAvailableLocations } = await import('../../../src/services/languageService');

      const locations = getAvailableLocations();

      locations.forEach((location) => {
        expect(location).toHaveProperty('code');
        expect(location).toHaveProperty('name');
        expect(typeof location.code).toBe('string');
        expect(typeof location.name).toBe('string');
      });
    });

    it('is sorted alphabetically by name', async () => {
      const { getAvailableLocations } = await import('../../../src/services/languageService');

      const locations = getAvailableLocations();
      const names = locations.map((l) => l.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });

    it('includes expected countries', async () => {
      const { getAvailableLocations } = await import('../../../src/services/languageService');

      const locations = getAvailableLocations();
      const names = locations.map((l) => l.name);

      // Check some expected country names (using Intl.DisplayNames format)
      expect(names.some((n) => n.includes('Argentina') || n.includes('AR'))).toBe(true);
      expect(names.some((n) => n.includes('Australia') || n.includes('AU'))).toBe(true);
      expect(names.some((n) => n.includes('Germany') || n.includes('DE'))).toBe(true);
      expect(names.some((n) => n.includes('Spain') || n.includes('ES'))).toBe(true);
      expect(names.some((n) => n.includes('France') || n.includes('FR'))).toBe(true);
    });

    it('includes US, GB, ES, FR, DE codes', async () => {
      const { getAvailableLocations } = await import('../../../src/services/languageService');

      const locations = getAvailableLocations();
      const codes = locations.map((l) => l.code);

      expect(codes).toContain('US');
      expect(codes).toContain('GB');
      expect(codes).toContain('ES');
      expect(codes).toContain('FR');
      expect(codes).toContain('DE');
    });
  });

  describe('getLanguageColor', () => {
    it('returns correct color for English', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('en');

      expect(color).toContain('blue');
      expect(color).toContain('bg-');
      expect(color).toContain('text-');
    });

    it('returns correct color for Spanish', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('es');

      expect(color).toContain('orange');
    });

    it('returns correct color for French', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('fr');

      expect(color).toContain('purple');
    });

    it('returns correct color for German', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('de');

      expect(color).toContain('amber');
    });

    it('returns correct color for Italian', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('it');

      expect(color).toContain('red');
    });

    it('returns correct color for Portuguese', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('pt');

      expect(color).toContain('green');
    });

    it('returns gray fallback for unknown codes', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor('unknown');

      expect(color).toContain('gray');
    });

    it('returns gray fallback for null', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor(null);

      expect(color).toContain('gray');
    });

    it('returns gray fallback for undefined', async () => {
      const { getLanguageColor } = await import('../../../src/services/languageService');

      const color = getLanguageColor(undefined);

      expect(color).toContain('gray');
    });

    it('all colors contain Tailwind class patterns', async () => {
      const { getLanguageColor, LANGUAGE_COLORS } = await import('../../../src/services/languageService');

      Object.keys(LANGUAGE_COLORS).forEach((code) => {
        const color = getLanguageColor(code);
        expect(color).toContain('bg-');
        expect(color).toContain('text-');
        expect(color).toContain('border-');
      });
    });
  });

  describe('getSupportedLanguages', () => {
    it('returns array with code, name, nativeName properties', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);

      languages.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('nativeName');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.nativeName).toBe('string');
      });
    });

    it('includes expected languages', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();
      const codes = languages.map((l) => l.code);

      expect(codes).toContain('en');
      expect(codes).toContain('es');
      expect(codes).toContain('fr');
      expect(codes).toContain('de');
      expect(codes).toContain('it');
      expect(codes).toContain('pt');
    });

    it('has correct English entry', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();
      const english = languages.find((l) => l.code === 'en');

      expect(english).toBeDefined();
      expect(english.name).toBe('English');
      expect(english.nativeName).toBe('English');
    });

    it('has correct Spanish entry', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();
      const spanish = languages.find((l) => l.code === 'es');

      expect(spanish).toBeDefined();
      expect(spanish.name).toBe('Spanish');
      expect(spanish.nativeName).toBe('Español');
    });

    it('has direction property on languages', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();

      // All supported languages should have direction
      languages.forEach((lang) => {
        expect(lang).toHaveProperty('direction');
        expect(['ltr', 'rtl']).toContain(lang.direction);
      });
    });

    it('all current languages are left-to-right', async () => {
      const { getSupportedLanguages } = await import('../../../src/services/languageService');

      const languages = getSupportedLanguages();

      // Current supported languages are all LTR
      languages.forEach((lang) => {
        expect(lang.direction).toBe('ltr');
      });
    });
  });

  describe('getLanguageDisplayInfo', () => {
    it('returns info for known language codes', async () => {
      const { getLanguageDisplayInfo } = await import('../../../src/services/languageService');

      const english = getLanguageDisplayInfo('en');

      expect(english).toHaveProperty('code', 'en');
      expect(english).toHaveProperty('name', 'English');
      expect(english).toHaveProperty('nativeName', 'English');
    });

    it('returns Spanish info correctly', async () => {
      const { getLanguageDisplayInfo } = await import('../../../src/services/languageService');

      const spanish = getLanguageDisplayInfo('es');

      expect(spanish.code).toBe('es');
      expect(spanish.name).toBe('Spanish');
    });

    it('returns fallback for unknown codes', async () => {
      const { getLanguageDisplayInfo } = await import('../../../src/services/languageService');

      const unknown = getLanguageDisplayInfo('xx');

      expect(unknown.code).toBe('xx');
      // Fallback uses uppercase code for name
      expect(unknown.name).toBe('XX');
      expect(unknown.nativeName).toBe('XX');
    });
  });

  describe('LANGUAGE_COLORS constant', () => {
    it('has all supported language codes', async () => {
      const { LANGUAGE_COLORS } = await import('../../../src/services/languageService');

      expect(LANGUAGE_COLORS).toHaveProperty('en');
      expect(LANGUAGE_COLORS).toHaveProperty('es');
      expect(LANGUAGE_COLORS).toHaveProperty('fr');
      expect(LANGUAGE_COLORS).toHaveProperty('de');
      expect(LANGUAGE_COLORS).toHaveProperty('it');
      expect(LANGUAGE_COLORS).toHaveProperty('pt');
    });

    it('all values are Tailwind class strings', async () => {
      const { LANGUAGE_COLORS } = await import('../../../src/services/languageService');

      Object.values(LANGUAGE_COLORS).forEach((classes) => {
        expect(typeof classes).toBe('string');
        expect(classes).toContain('bg-');
        expect(classes).toContain('text-');
        expect(classes).toContain('border-');
      });
    });
  });

  describe('default export', () => {
    it('exports all location mapping functions', async () => {
      const service = await import('../../../src/services/languageService');

      expect(typeof service.getLanguageForLocation).toBe('function');
      expect(typeof service.getAvailableLocations).toBe('function');
      expect(typeof service.getLanguageColor).toBe('function');
      expect(typeof service.getSupportedLanguages).toBe('function');
      expect(typeof service.getLanguageDisplayInfo).toBe('function');
    });

    it('exports constants', async () => {
      const service = await import('../../../src/services/languageService');

      expect(service.LOCATION_LANGUAGE_MAP).toBeDefined();
      expect(service.LANGUAGE_COLORS).toBeDefined();
    });

    it('exports database operation functions', async () => {
      const service = await import('../../../src/services/languageService');

      expect(typeof service.createLanguageGroup).toBe('function');
      expect(typeof service.getLanguageGroup).toBe('function');
      expect(typeof service.updateLanguageGroup).toBe('function');
      expect(typeof service.createLanguageVariant).toBe('function');
      expect(typeof service.fetchLanguageVariants).toBe('function');
      expect(typeof service.resolveSceneForDevice).toBe('function');
    });
  });
});
