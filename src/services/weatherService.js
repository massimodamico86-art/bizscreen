import { createScopedLogger } from './loggingService.js';
import { fetchCurrentWeather, fetchWeatherForecast } from './weatherProxyService.js';

const logger = createScopedLogger('WeatherService');

/**
 * Weather Service - Server-side Proxy Integration
 * Fetches current weather data through the weather-proxy Edge Function.
 * The OpenWeatherMap API key is kept server-side and never exposed to the client.
 */

// Cache weather data to avoid excessive proxy calls
const weatherCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_CACHE_SIZE = 50; // Limit cache to 50 entries to prevent memory issues

/**
 * Get weather data for a city
 * @param {string} city - City name (e.g., "Miami" or "Miami,US")
 * @param {string} units - Temperature units: 'metric' (Celsius) or 'imperial' (Fahrenheit)
 * @returns {Promise<Object>} Weather data object
 */
export async function getWeather(city, units = 'imperial') {
  if (!city || city.trim() === '') {
    return null;
  }

  // Check cache first
  const cacheKey = `${city}-${units}`;
  const cached = weatherCache.get(cacheKey);

  // Check if cached data is still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug(`Using cached weather data for ${city} (${units})`);
    return cached.data;
  }

  // Remove expired entry if it exists
  if (cached && Date.now() - cached.timestamp >= CACHE_DURATION) {
    weatherCache.delete(cacheKey);
  }

  try {
    const data = await fetchCurrentWeather(city, { units });
    const weatherData = formatWeatherData(data, units);

    // Implement cache size limit using LRU strategy
    if (weatherCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first entry in Map)
      const firstKey = weatherCache.keys().next().value;
      weatherCache.delete(firstKey);
      logger.debug(`Weather cache limit reached, removed oldest entry: ${firstKey}`);
    }

    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    logger.debug(`Cached weather data for ${city} (${units}). Cache size: ${weatherCache.size}`);

    return weatherData;
  } catch (error) {
    logger.error('Error fetching weather data:', { error: error });
    return getMockWeatherData(city, units);
  }
}

/**
 * Format OpenWeatherMap API response into our data structure
 */
function formatWeatherData(apiData, units) {
  const tempUnit = units === 'metric' ? '\u00B0C' : '\u00B0F';

  return {
    temp: Math.round(apiData.main.temp),
    tempUnit: tempUnit,
    tempFormatted: `${Math.round(apiData.main.temp)}${tempUnit}`,
    feelsLike: Math.round(apiData.main.feels_like),
    description: capitalizeWords(apiData.weather[0].description),
    main: apiData.weather[0].main,
    icon: apiData.weather[0].icon,
    iconUrl: `https://openweathermap.org/img/wn/${apiData.weather[0].icon}@2x.png`,
    humidity: apiData.main.humidity,
    windSpeed: Math.round(apiData.wind.speed),
    windUnit: units === 'metric' ? 'm/s' : 'mph',
    city: apiData.name,
    country: apiData.sys.country,
    sunrise: new Date(apiData.sys.sunrise * 1000),
    sunset: new Date(apiData.sys.sunset * 1000),
    timestamp: Date.now()
  };
}

/**
 * Get mock weather data (for development or when proxy is unavailable)
 */
function getMockWeatherData(city, units) {
  const tempUnit = units === 'metric' ? '\u00B0C' : '\u00B0F';
  const mockTemp = units === 'metric' ? 24 : 75;

  return {
    temp: mockTemp,
    tempUnit: tempUnit,
    tempFormatted: `${mockTemp}${tempUnit}`,
    feelsLike: mockTemp + 2,
    description: 'Partly Cloudy',
    main: 'Clouds',
    icon: '02d',
    iconUrl: 'https://openweathermap.org/img/wn/02d@2x.png',
    humidity: 65,
    windSpeed: units === 'metric' ? 5 : 11,
    windUnit: units === 'metric' ? 'm/s' : 'mph',
    city: city || 'City',
    country: 'US',
    sunrise: new Date(),
    sunset: new Date(),
    timestamp: Date.now(),
    isMock: true
  };
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Clear weather cache (useful for testing or manual refresh)
 */
export function clearWeatherCache() {
  weatherCache.clear();
  logger.info('Weather cache cleared');
}

/**
 * Remove expired entries from cache
 * This helps keep memory usage low by periodically cleaning up old data
 */
export function cleanupExpiredCache() {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, value] of weatherCache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      weatherCache.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    logger.debug(`Cleaned up ${removedCount} expired weather cache entries. Remaining: ${weatherCache.size}`);
  }

  return removedCount;
}

// Automatically cleanup expired cache entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 10 * 60 * 1000); // 10 minutes
}

/**
 * Get weather icon emoji based on condition
 */
export function getWeatherEmoji(iconCode) {
  const iconMap = {
    '01d': '\u2600\uFE0F',  // clear sky day
    '01n': '\uD83C\uDF19',  // clear sky night
    '02d': '\u26C5',  // few clouds day
    '02n': '\u2601\uFE0F',  // few clouds night
    '03d': '\u2601\uFE0F',  // scattered clouds
    '03n': '\u2601\uFE0F',  // scattered clouds
    '04d': '\u2601\uFE0F',  // broken clouds
    '04n': '\u2601\uFE0F',  // broken clouds
    '09d': '\uD83C\uDF27\uFE0F',  // shower rain
    '09n': '\uD83C\uDF27\uFE0F',  // shower rain
    '10d': '\uD83C\uDF26\uFE0F',  // rain day
    '10n': '\uD83C\uDF27\uFE0F',  // rain night
    '11d': '\u26C8\uFE0F',  // thunderstorm
    '11n': '\u26C8\uFE0F',  // thunderstorm
    '13d': '\u2744\uFE0F',  // snow
    '13n': '\u2744\uFE0F',  // snow
    '50d': '\uD83C\uDF2B\uFE0F',  // mist
    '50n': '\uD83C\uDF2B\uFE0F',  // mist
  };

  return iconMap[iconCode] || '\uD83C\uDF24\uFE0F';
}

/**
 * Get weather data by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} options - Configuration options
 * @param {string} options.units - 'metric' or 'imperial'
 * @param {string} options.lang - Language code (e.g., 'en', 'es', 'fr')
 * @returns {Promise<Object>} Weather data object
 */
export async function getWeatherByCoords(lat, lon, options = {}) {
  const { units = 'metric', lang = 'en' } = options;

  const cacheKey = `coords-${lat.toFixed(2)}-${lon.toFixed(2)}-${units}-${lang}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const data = await fetchCurrentWeather(null, { lat, lon, units });
    const weatherData = formatWeatherData(data, units);

    // Cache management
    if (weatherCache.size >= MAX_CACHE_SIZE) {
      const firstKey = weatherCache.keys().next().value;
      weatherCache.delete(firstKey);
    }

    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    return weatherData;
  } catch (error) {
    logger.error('Error fetching weather by coords:', { error: error });
    return getMockWeatherData('Location', units);
  }
}

/**
 * Get 5-day weather forecast
 * @param {string} city - City name or "lat,lon" coordinates
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of daily forecast objects
 */
export async function getWeatherForecast(city, options = {}) {
  const { units = 'metric', lang = 'en' } = options;

  const cacheKey = `forecast-${city}-${units}-${lang}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Check if city is coordinates
    const coordMatch = city.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    let proxyOptions = { units, lang };

    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      proxyOptions = { ...proxyOptions, lat, lon };
    }

    const data = await fetchWeatherForecast(coordMatch ? null : city, proxyOptions);
    const forecast = formatForecastData(data, units);

    weatherCache.set(cacheKey, {
      data: forecast,
      timestamp: Date.now()
    });

    return forecast;
  } catch (error) {
    logger.error('Error fetching forecast:', { error: error });
    return getMockForecast(units);
  }
}

/**
 * Format forecast API response - group by day and get daily summary
 */
function formatForecastData(apiData, units) {
  const tempUnit = units === 'metric' ? '\u00B0C' : '\u00B0F';
  const dailyData = {};

  // Group forecasts by day
  apiData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split('T')[0];

    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        temps: [],
        icons: [],
        conditions: [],
        date: date
      };
    }

    dailyData[dayKey].temps.push(item.main.temp);
    dailyData[dayKey].icons.push(item.weather[0].icon);
    dailyData[dayKey].conditions.push(item.weather[0].main);
  });

  // Convert to array and calculate daily highs/lows
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return Object.entries(dailyData)
    .slice(0, 5) // Only 5 days
    .map(([, dayData]) => {
      const high = Math.round(Math.max(...dayData.temps));
      const low = Math.round(Math.min(...dayData.temps));
      // Get most common condition
      const conditionCounts = {};
      dayData.conditions.forEach(c => {
        conditionCounts[c] = (conditionCounts[c] || 0) + 1;
      });
      const mainCondition = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
      // Get midday icon (or first available)
      const middayIndex = Math.floor(dayData.icons.length / 2);
      const icon = dayData.icons[middayIndex] || dayData.icons[0];

      return {
        day: days[dayData.date.getDay()],
        date: dayData.date,
        high,
        low,
        tempUnit,
        condition: mainCondition,
        icon,
        iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`,
        emoji: getWeatherEmoji(icon)
      };
    });
}

/**
 * Get mock forecast data
 */
function getMockForecast(units) {
  const tempUnit = units === 'metric' ? '\u00B0C' : '\u00B0F';
  const baseTemp = units === 'metric' ? 20 : 68;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const conditions = ['Clear', 'Clouds', 'Rain', 'Clear', 'Clouds'];
  const icons = ['01d', '03d', '10d', '01d', '02d'];

  return days.map((day, i) => ({
    day,
    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
    high: baseTemp + Math.floor(Math.random() * 5),
    low: baseTemp - 5 + Math.floor(Math.random() * 3),
    tempUnit,
    condition: conditions[i],
    icon: icons[i],
    iconUrl: `https://openweathermap.org/img/wn/${icons[i]}@2x.png`,
    emoji: getWeatherEmoji(icons[i])
  }));
}

/**
 * Get comprehensive weather data including forecast
 * @param {Object} config - Weather Wall configuration
 * @returns {Promise<Object>} Complete weather data
 */
export async function getWeatherWallData(config) {
  const {
    location,
    usePlayerLocation,
    _tempUnit = 'celsius',
    measurementSystem = 'metric',
    language = 'en'
  } = config;

  const units = measurementSystem;
  let lat, lon, _locationName;

  // Determine location
  if (usePlayerLocation) {
    // This should be handled by the player with device location
    // For now, return mock data
    return getMockWeatherWallData(units, language);
  }

  // Parse location string
  const coordMatch = location?.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lon = parseFloat(coordMatch[2]);
  }

  try {
    // Get current weather
    const current = lat !== undefined
      ? await getWeatherByCoords(lat, lon, { units, lang: language })
      : await getWeather(location, units);

    // Get forecast
    const forecast = await getWeatherForecast(
      lat !== undefined ? `${lat},${lon}` : location,
      { units, lang: language }
    );

    return {
      current,
      forecast,
      locationName: current?.city || location,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('Error getting weather wall data:', { error: error });
    return getMockWeatherWallData(units, language);
  }
}

/**
 * Get mock Weather Wall data
 */
function getMockWeatherWallData(units) {
  const current = getMockWeatherData('Demo City', units);
  const forecast = getMockForecast(units);

  return {
    current,
    forecast,
    locationName: 'Demo City',
    timestamp: Date.now(),
    isMock: true
  };
}
