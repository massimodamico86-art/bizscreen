import { createScopedLogger } from './loggingService.js';
import { fetchGeocode, fetchReverseGeocode } from './weatherProxyService.js';

const logger = createScopedLogger('GeolocationService');

/**
 * Geolocation Service
 *
 * Provides location detection and reverse geocoding for Weather Wall app.
 * All OpenWeatherMap geocoding calls route through the weather-proxy Edge Function.
 */

/**
 * Get current device location using browser Geolocation API
 * @returns {Promise<{lat: number, lon: number}>}
 */
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        let message = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

/**
 * Reverse geocode coordinates to city name using weather-proxy Edge Function
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{city: string, country: string, fullName: string}>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const data = await fetchReverseGeocode(lat, lon);

    if (!data || data.length === 0) {
      return {
        city: 'Unknown',
        country: 'Location',
        fullName: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      };
    }

    const location = data[0];
    return {
      city: location.name,
      country: location.country,
      state: location.state,
      fullName: location.state
        ? `${location.name}, ${location.state}, ${location.country}`
        : `${location.name}, ${location.country}`,
    };
  } catch (error) {
    logger.error('Reverse geocoding error:', { error: error });
    return {
      city: 'Unknown',
      country: 'Location',
      fullName: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    };
  }
}

/**
 * Search for locations by name using weather-proxy Edge Function
 * @param {string} query - Location search query
 * @param {number} limit - Max results (default 5)
 * @returns {Promise<Array<{name: string, lat: number, lon: number, country: string, state?: string}>>}
 */
export async function searchLocations(query, limit = 5) {
  try {
    const data = await fetchGeocode(query, limit);

    return data.map((loc) => ({
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      country: loc.country,
      state: loc.state,
      fullName: loc.state
        ? `${loc.name}, ${loc.state}, ${loc.country}`
        : `${loc.name}, ${loc.country}`,
    }));
  } catch (error) {
    logger.error('Location search error:', { error: error });
    return [];
  }
}

/**
 * Get location either from device or by searching
 * @param {boolean} useDeviceLocation - Whether to use device GPS
 * @param {string} manualLocation - Manual location string if not using device
 * @returns {Promise<{lat: number, lon: number, name: string}>}
 */
export async function getLocation(useDeviceLocation, manualLocation) {
  if (useDeviceLocation) {
    const coords = await getCurrentLocation();
    const geo = await reverseGeocode(coords.lat, coords.lon);
    return {
      lat: coords.lat,
      lon: coords.lon,
      name: geo.fullName,
    };
  }

  // Parse manual location (could be "City, Country" or "lat,lon")
  const coordMatch = manualLocation.match(
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  );
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    const geo = await reverseGeocode(lat, lon);
    return {
      lat,
      lon,
      name: geo.fullName,
    };
  }

  // Search for location by name
  const results = await searchLocations(manualLocation, 1);
  if (results.length === 0) {
    throw new Error(`Location not found: ${manualLocation}`);
  }

  return {
    lat: results[0].lat,
    lon: results[0].lon,
    name: results[0].fullName,
  };
}

export default {
  getCurrentLocation,
  reverseGeocode,
  searchLocations,
  getLocation,
};
