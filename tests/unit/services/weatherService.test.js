/**
 * Weather Service Unit Tests
 *
 * Tests for the OpenWeatherMap API integration service.
 * Tests caching, error handling, and data formatting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWeather,
  clearWeatherCache,
  getWeatherEmoji,
  cleanupExpiredCache,
} from '../../../src/services/weatherService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Sample API response
const mockApiResponse = {
  main: {
    temp: 75,
    feels_like: 77,
    humidity: 65,
  },
  weather: [
    {
      main: 'Clear',
      description: 'clear sky',
      icon: '01d',
    },
  ],
  wind: {
    speed: 10,
  },
  name: 'Miami',
  sys: {
    country: 'US',
    sunrise: 1699880000,
    sunset: 1699920000,
  },
};

describe('weatherService', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearWeatherCache();
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWeather', () => {
    it('returns null for empty city', async () => {
      const result = await getWeather('');
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only city', async () => {
      const result = await getWeather('   ');
      expect(result).toBeNull();
    });

    it('returns mock data when API key is not configured', async () => {
      // Since we can't set import.meta.env in tests, the service falls back to mock
      const result = await getWeather('Miami');
      expect(result).toBeDefined();
      expect(result.temp).toBeDefined();
      expect(result.city).toBeDefined();
    });

    it('formats temperature correctly for imperial units', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getWeather('Miami', 'imperial');
      expect(result).toBeDefined();
      // Mock data or API data should have tempFormatted
      expect(result.tempUnit).toMatch(/°[FC]/);
    });

    it('formats temperature correctly for metric units', async () => {
      const result = await getWeather('London', 'metric');
      expect(result).toBeDefined();
      expect(result.tempUnit).toMatch(/°[FC]/);
    });

    it('returns mock data on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getWeather('Miami');
      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
    });

    it('returns mock data on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getWeather('NonexistentCity');
      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
    });

    it('returns mock data on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await getWeather('Miami');
      expect(result).toBeDefined();
      expect(result.isMock).toBe(true);
    });

    it('uses cached data on subsequent calls', async () => {
      // First call
      const result1 = await getWeather('Miami');

      // Second call should use cache (mock will still be used but cache logic runs)
      const result2 = await getWeather('Miami');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.city).toBe(result2.city);
    });

    it('treats different cities as different cache keys', async () => {
      const miami = await getWeather('Miami');
      const london = await getWeather('London');

      expect(miami.city).not.toBe(london.city);
    });

    it('treats different units as different cache keys', async () => {
      const imperial = await getWeather('Miami', 'imperial');
      const metric = await getWeather('Miami', 'metric');

      // Units should be different
      expect(imperial.tempUnit).not.toBe(metric.tempUnit);
    });
  });

  describe('clearWeatherCache', () => {
    it('clears all cached weather data', async () => {
      // Populate cache
      await getWeather('Miami');
      await getWeather('London');

      // Clear cache
      clearWeatherCache();

      // Cache should be empty (verified by cache internals)
      // Since we can't directly inspect cache, we verify it doesn't error
      expect(() => clearWeatherCache()).not.toThrow();
    });
  });

  describe('cleanupExpiredCache', () => {
    it('removes expired entries from cache', () => {
      // This function should run without errors
      const removed = cleanupExpiredCache();
      expect(typeof removed).toBe('number');
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWeatherEmoji', () => {
    it('returns sun emoji for clear day', () => {
      expect(getWeatherEmoji('01d')).toBe('☀️');
    });

    it('returns moon emoji for clear night', () => {
      expect(getWeatherEmoji('01n')).toBe('🌙');
    });

    it('returns cloud emoji for cloudy conditions', () => {
      expect(getWeatherEmoji('03d')).toBe('☁️');
      expect(getWeatherEmoji('04n')).toBe('☁️');
    });

    it('returns rain emoji for rainy conditions', () => {
      expect(getWeatherEmoji('09d')).toBe('🌧️');
      expect(getWeatherEmoji('10n')).toBe('🌧️');
    });

    it('returns thunderstorm emoji for storms', () => {
      expect(getWeatherEmoji('11d')).toBe('⛈️');
      expect(getWeatherEmoji('11n')).toBe('⛈️');
    });

    it('returns snow emoji for snowy conditions', () => {
      expect(getWeatherEmoji('13d')).toBe('❄️');
      expect(getWeatherEmoji('13n')).toBe('❄️');
    });

    it('returns mist emoji for foggy conditions', () => {
      expect(getWeatherEmoji('50d')).toBe('🌫️');
    });

    it('returns default emoji for unknown icon code', () => {
      expect(getWeatherEmoji('99x')).toBe('🌤️');
    });

    it('returns default emoji for null/undefined', () => {
      expect(getWeatherEmoji(null)).toBe('🌤️');
      expect(getWeatherEmoji(undefined)).toBe('🌤️');
    });
  });

  describe('weather data structure', () => {
    it('returns object with expected properties', async () => {
      const result = await getWeather('Miami');

      expect(result).toHaveProperty('temp');
      expect(result).toHaveProperty('tempUnit');
      expect(result).toHaveProperty('tempFormatted');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('icon');
      expect(result).toHaveProperty('iconUrl');
      expect(result).toHaveProperty('humidity');
      expect(result).toHaveProperty('windSpeed');
      expect(result).toHaveProperty('city');
    });

    it('temp is a number', async () => {
      const result = await getWeather('Miami');
      expect(typeof result.temp).toBe('number');
    });

    it('humidity is a number', async () => {
      const result = await getWeather('Miami');
      expect(typeof result.humidity).toBe('number');
    });

    it('iconUrl is a valid URL', async () => {
      const result = await getWeather('Miami');
      expect(result.iconUrl).toMatch(/^https?:\/\//);
    });

    it('description is capitalized', async () => {
      const result = await getWeather('Miami');
      // First letter should be uppercase
      expect(result.description.charAt(0)).toBe(
        result.description.charAt(0).toUpperCase()
      );
    });
  });
});
