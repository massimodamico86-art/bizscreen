/**
 * Weather Proxy Service
 *
 * Client-side interface for the weather-proxy Edge Function.
 * All OpenWeatherMap API calls are proxied server-side to keep the API key secure.
 *
 * Usage:
 *   import { fetchCurrentWeather, fetchWeatherForecast, fetchGeocode, fetchReverseGeocode } from './weatherProxyService.js';
 *   const weather = await fetchCurrentWeather('Miami', { units: 'imperial' });
 *   const forecast = await fetchWeatherForecast('Miami', { units: 'imperial' });
 *   const locations = await fetchGeocode('Miami');
 *   const location = await fetchReverseGeocode(25.76, -80.19);
 */

import { supabase } from '../supabase.js';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('WeatherProxyService');

const FUNCTION_NAME = 'weather-proxy';

/**
 * Fetch current weather through the server-side proxy.
 *
 * @param {string|null} city - City name (e.g., "Miami" or "Miami,US"). Pass null if using lat/lon.
 * @param {object} [options] - Options
 * @param {string} [options.units='imperial'] - Temperature units: 'metric' or 'imperial'
 * @param {number} [options.lat] - Latitude (used instead of city if provided)
 * @param {number} [options.lon] - Longitude (used instead of city if provided)
 * @returns {Promise<object>} Raw OpenWeatherMap current weather JSON
 */
export async function fetchCurrentWeather(city, options = {}) {
  const body = {
    action: 'current',
    units: options.units || 'imperial',
  };

  if (options.lat !== undefined && options.lon !== undefined) {
    body.lat = options.lat;
    body.lon = options.lon;
  } else {
    body.city = city;
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });

  if (error) {
    logger.error('Weather current invoke failed:', error.message);
    throw new Error(`Weather fetch failed: ${error.message}`);
  }

  if (data.ok === false) {
    const errorMessage = data.error?.message || 'Unknown proxy error';
    logger.error('Weather proxy error (current):', errorMessage);
    throw new Error(errorMessage);
  }

  return data.data;
}

/**
 * Fetch 5-day weather forecast through the server-side proxy.
 *
 * @param {string|null} city - City name or null if using lat/lon
 * @param {object} [options] - Options
 * @param {string} [options.units='imperial'] - Temperature units
 * @param {string} [options.lang='en'] - Language code
 * @param {number} [options.lat] - Latitude
 * @param {number} [options.lon] - Longitude
 * @returns {Promise<object>} Raw OpenWeatherMap forecast JSON
 */
export async function fetchWeatherForecast(city, options = {}) {
  const body = {
    action: 'forecast',
    units: options.units || 'imperial',
    lang: options.lang || 'en',
  };

  if (options.lat !== undefined && options.lon !== undefined) {
    body.lat = options.lat;
    body.lon = options.lon;
  } else {
    body.city = city;
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });

  if (error) {
    logger.error('Weather forecast invoke failed:', error.message);
    throw new Error(`Forecast fetch failed: ${error.message}`);
  }

  if (data.ok === false) {
    const errorMessage = data.error?.message || 'Unknown proxy error';
    logger.error('Weather proxy error (forecast):', errorMessage);
    throw new Error(errorMessage);
  }

  return data.data;
}

/**
 * Forward geocode a location query through the server-side proxy.
 *
 * @param {string} query - Location search query (e.g., "Miami")
 * @param {number} [limit=5] - Max results
 * @returns {Promise<Array>} Array of geocoding results from OpenWeatherMap
 */
export async function fetchGeocode(query, limit = 5) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'geocode',
      query,
      limit,
    },
  });

  if (error) {
    logger.error('Geocode invoke failed:', error.message);
    throw new Error(`Geocode failed: ${error.message}`);
  }

  if (data.ok === false) {
    const errorMessage = data.error?.message || 'Unknown proxy error';
    logger.error('Weather proxy error (geocode):', errorMessage);
    throw new Error(errorMessage);
  }

  return data.data;
}

/**
 * Reverse geocode coordinates through the server-side proxy.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Array of reverse geocoding results from OpenWeatherMap
 */
export async function fetchReverseGeocode(lat, lon) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'reverse-geocode',
      lat,
      lon,
    },
  });

  if (error) {
    logger.error('Reverse geocode invoke failed:', error.message);
    throw new Error(`Reverse geocode failed: ${error.message}`);
  }

  if (data.ok === false) {
    const errorMessage = data.error?.message || 'Unknown proxy error';
    logger.error('Weather proxy error (reverse-geocode):', errorMessage);
    throw new Error(errorMessage);
  }

  return data.data;
}
