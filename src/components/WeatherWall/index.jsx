/**
 * WeatherWall Component
 *
 * Main Weather Wall component that routes to the appropriate theme.
 * Used in Player.jsx for rendering weather apps.
 */

import { useState, useEffect, useCallback } from 'react';
import AnimatedTheme from './AnimatedTheme';
import ClassicTheme from './ClassicTheme';
import GlassTheme from './GlassTheme';
import { getWeatherWallData, getWeatherEmoji } from '../../services/weatherService';

export default function WeatherWall({ config, appId }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = config?.theme || 'animated';
  const refreshMinutes = config?.refreshMinutes || 15;

  const fetchWeather = useCallback(async () => {
    try {
      setError(null);
      const data = await getWeatherWallData(config);
      setWeatherData(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchWeather();

    // Set up refresh interval
    const interval = setInterval(fetchWeather, refreshMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather, refreshMinutes]);

  // Common props for all themes
  const themeProps = {
    config,
    weatherData,
    loading,
    error,
    getWeatherEmoji,
  };

  // Route to appropriate theme component
  switch (theme) {
    case 'classic':
      return <ClassicTheme {...themeProps} />;
    case 'glass':
      return <GlassTheme {...themeProps} />;
    case 'animated':
    default:
      return <AnimatedTheme {...themeProps} />;
  }
}

// Re-export theme components for direct use if needed
export { AnimatedTheme, ClassicTheme, GlassTheme };
