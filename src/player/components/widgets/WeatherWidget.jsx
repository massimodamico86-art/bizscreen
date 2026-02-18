// src/player/components/widgets/WeatherWidget.jsx
// Weather widget component extracted from Player.jsx SceneWidgetRenderer
import { useCallback } from 'react';
import { getWeather, getWeatherForecast } from '../../../services/weatherService.js';
import { useWidgetData } from '../../hooks/useWidgetData.js';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';

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
 * Resolve timezone for weather display.
 * Duplicated per Phase 56 decision -- DO NOT import from a shared module.
 * @param {string} widgetTimezone - Widget-level timezone setting
 * @param {string} screenTimezone - Screen-level timezone from parent
 * @returns {string} Resolved IANA timezone string
 */
function resolveTimezone(widgetTimezone, screenTimezone) {
  if (widgetTimezone && widgetTimezone !== 'screen') return widgetTimezone;
  if (screenTimezone) return screenTimezone;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
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
 * Supports two modes:
 * - 'current' (default): Shows current conditions (temp, icon, location, description)
 * - 'forecast': Shows multi-day forecast (day name, icon, high/low temps)
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
 * @param {string} props.mode - Display mode: 'current' | 'forecast' (default: 'current')
 * @param {string} props.timezone - Timezone setting: 'screen' | IANA timezone (default: 'screen')
 * @param {number} props.forecastDays - Number of forecast days to show (default: 5, min: 3)
 * @param {string} timezone - Screen timezone passed from SceneWidgetRenderer/LayoutElementRenderer
 */
export function WeatherWidget({ props = {}, timezone }) {
  // Extract props with defaults
  const location = props.location || 'Miami, FL';
  const units = props.units || 'imperial';
  const style = props.style || 'minimal';
  const textColor = props.textColor || '#ffffff';
  const accentColor = props.accentColor || '#3b82f6';
  const size = props.size || 'medium';
  const customFontSize = props.customFontSize;
  const mode = props.mode || 'current';
  const forecastDays = Math.max(3, Math.min(5, props.forecastDays || 5));

  // Resolve timezone
  const resolvedTz = resolveTimezone(props.timezone, timezone);

  // Orchestrator integration - cache key differentiates by mode
  const sourceKey = `weather:${mode}:${location}:${units}`;
  const fetchFn = useCallback(async () => {
    if (mode === 'forecast') {
      const data = await getWeatherForecast(location, { units });
      return data;
    }
    const data = await getWeather(location, units);
    return data;
  }, [location, units, mode]);
  const { data: weatherData, lastFetchedAt, isLoading: orchestratorLoading } = useWidgetData(sourceKey, fetchFn, 10 * 60 * 1000, null);

  // Loading indicator style
  const loadingOpacity = orchestratorLoading ? 0.6 : 1;

  // Forecast mode rendering
  if (mode === 'forecast') {
    const forecastData = Array.isArray(weatherData) ? weatherData.slice(0, forecastDays) : [];

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontFamily: 'system-ui, sans-serif',
          opacity: loadingOpacity,
          transition: 'opacity 0.3s ease',
          padding: '4px',
        }}>
          {forecastData.length > 0 ? forecastData.map((day, i) => {
            // Use resolved timezone for day name formatting
            const dayName = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              timeZone: resolvedTz,
            }).format(day.date instanceof Date ? day.date : new Date(day.date));

            return (
              <div key={i} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                minWidth: 0,
              }}>
                <span style={{
                  color: textColor,
                  fontSize: getFontSize(size, customFontSize, 'secondary'),
                  fontWeight: '500',
                  opacity: 0.8,
                }}>
                  {dayName}
                </span>
                {day.iconUrl ? (
                  <img
                    src={day.iconUrl}
                    alt={day.condition || ''}
                    style={{ width: 28, height: 28, flexShrink: 0 }}
                  />
                ) : (
                  <FallbackIcon size={20} accentColor={accentColor} />
                )}
                <span style={{
                  color: textColor,
                  fontSize: getFontSize(size, customFontSize, 'secondary'),
                  fontWeight: '600',
                  lineHeight: 1,
                }}>
                  {day.high}{day.tempUnit}
                </span>
                <span style={{
                  color: textColor,
                  fontSize: getFontSize(size, customFontSize, 'secondary'),
                  opacity: 0.6,
                  lineHeight: 1,
                }}>
                  {day.low}{day.tempUnit}
                </span>
              </div>
            );
          }) : (
            // Loading placeholder for forecast
            <div style={{
              color: textColor,
              opacity: 0.5,
              fontSize: getFontSize(size, customFontSize, 'secondary'),
            }}>
              Loading forecast...
            </div>
          )}
        </div>
        <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
      </div>
    );
  }

  // Current mode rendering
  // Use fetched weather data, or fallback values while loading
  const displayTemp = weatherData?.tempFormatted || (units === 'metric' ? '22C' : '72F');
  const displayLocation = weatherData?.city || location.split(',')[0];
  const weatherIcon = weatherData?.iconUrl;
  const weatherDescription = weatherData?.description || 'Partly Cloudy';

  // Card style - vertical layout with background
  if (style === 'card') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
      </div>
    );
  }

  // Minimal style (default) - horizontal layout
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
      <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default WeatherWidget;
