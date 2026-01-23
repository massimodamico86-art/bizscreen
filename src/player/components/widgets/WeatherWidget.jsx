// src/player/components/widgets/WeatherWidget.jsx
// Weather widget component extracted from Player.jsx SceneWidgetRenderer
import { useState, useEffect } from 'react';
import { getWeather } from '../../../services/weatherService.js';
import { useLogger } from '../../../hooks/useLogger.js';

// Size mappings for weather display
const sizeMap = {
  small: {
    temp: 'clamp(0.8rem, 2.5vw, 1.5rem)',
    secondary: 'clamp(0.4rem, 1vw, 0.625rem)',
  },
  medium: {
    temp: 'clamp(1rem, 3vw, 2rem)',
    secondary: 'clamp(0.5rem, 1vw, 0.75rem)',
  },
  large: {
    temp: 'clamp(1.2rem, 4vw, 2.5rem)',
    secondary: 'clamp(0.6rem, 1.2vw, 0.875rem)',
  },
};

/**
 * Get font size based on size setting or custom value
 */
function getFontSize(size, customFontSize, fontKey) {
  if (size === 'custom' && customFontSize) {
    return `${customFontSize}px`;
  }
  return sizeMap[size]?.[fontKey] || sizeMap.medium[fontKey];
}

/**
 * FallbackIcon - Sun icon displayed when weather API icon is unavailable
 */
function FallbackIcon({ size = 24, accentColor }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={accentColor} />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * WeatherWidget - Displays weather information with configurable styling
 *
 * Supports two styles:
 * - 'minimal' (default): Compact horizontal layout with icon, temp, and location
 * - 'card': Vertical card layout with background
 *
 * @param {Object} props - Widget props
 * @param {string} props.location - Location for weather lookup (default: 'Miami, FL')
 * @param {string} props.units - Temperature units: 'imperial' | 'metric' (default: 'imperial')
 * @param {string} props.style - Display style: 'minimal' | 'card' (default: 'minimal')
 * @param {string} props.textColor - Text color (default: '#ffffff')
 * @param {string} props.accentColor - Accent color for fallback icon (default: '#3b82f6')
 * @param {string} props.size - Size preset: 'small' | 'medium' | 'large' | 'custom' (default: 'medium')
 * @param {number} props.customFontSize - Custom font size in pixels (used when size='custom')
 */
export function WeatherWidget({ props = {} }) {
  const logger = useLogger('WeatherWidget');
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Extract props with defaults
  const location = props.location || 'Miami, FL';
  const units = props.units || 'imperial';
  const style = props.style || 'minimal';
  const textColor = props.textColor || '#ffffff';
  const accentColor = props.accentColor || '#3b82f6';
  const size = props.size || 'medium';
  const customFontSize = props.customFontSize;

  // Fetch weather data with 10-minute auto-refresh
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      try {
        const data = await getWeather(location, units);
        setWeather(data);
      } catch (err) {
        logger.error('Failed to fetch weather', { error: err, location, units });
      } finally {
        setWeatherLoading(false);
      }
    };

    // Fetch immediately
    fetchWeatherData();

    // Set up 10-minute refresh interval
    const weatherInterval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [location, units, logger]);

  // Use fetched weather data, or fallback values while loading
  const displayTemp = weather?.tempFormatted || (units === 'metric' ? '22C' : '72F');
  const displayLocation = weather?.city || location.split(',')[0];
  const weatherIcon = weather?.iconUrl;
  const weatherDescription = weather?.description || 'Partly Cloudy';

  // Loading indicator style
  const loadingOpacity = weatherLoading ? 0.6 : 1;

  // Card style - vertical layout with background
  if (style === 'card') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        padding: '8px',
        fontFamily: 'system-ui, sans-serif',
        opacity: loadingOpacity,
        transition: 'opacity 0.3s ease',
      }}>
        {/* Weather Icon - from API or fallback */}
        {weatherIcon ? (
          <img
            src={weatherIcon}
            alt={weatherDescription}
            style={{ width: 48, height: 48, marginBottom: '4px' }}
          />
        ) : (
          <div style={{ marginBottom: '4px' }}>
            <FallbackIcon size={32} accentColor={accentColor} />
          </div>
        )}
        <div style={{ color: textColor, fontSize: getFontSize(size, customFontSize, 'temp'), fontWeight: '600' }}>
          {displayTemp}
        </div>
        <div style={{ color: textColor, opacity: 0.8, fontSize: getFontSize(size, customFontSize, 'secondary') }}>
          {weatherDescription}
        </div>
        <div style={{ color: textColor, opacity: 0.6, fontSize: getFontSize(size, customFontSize, 'secondary') }}>
          {displayLocation}
        </div>
      </div>
    );
  }

  // Minimal style (default) - horizontal layout
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'system-ui, sans-serif',
      opacity: loadingOpacity,
      transition: 'opacity 0.3s ease',
    }}>
      {/* Weather Icon - from API or fallback */}
      {weatherIcon ? (
        <img
          src={weatherIcon}
          alt={weatherDescription}
          style={{ width: 36, height: 36 }}
        />
      ) : (
        <FallbackIcon size={24} accentColor={accentColor} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: textColor, fontSize: getFontSize(size, customFontSize, 'temp'), fontWeight: '600', lineHeight: 1 }}>
          {displayTemp}
        </span>
        <span style={{ color: textColor, opacity: 0.7, fontSize: getFontSize(size, customFontSize, 'secondary'), lineHeight: 1 }}>
          {displayLocation}
        </span>
      </div>
    </div>
  );
}

export default WeatherWidget;
