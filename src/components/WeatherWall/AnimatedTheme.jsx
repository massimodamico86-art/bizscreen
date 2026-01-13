/**
 * AnimatedTheme Component
 *
 * Dynamic weather theme with animated backgrounds that change based on weather conditions.
 * Supports both landscape (16:9) and portrait (9:16) TV orientations.
 */

import { useMemo } from 'react';
import { MapPin, Droplets, Wind, Eye, Gauge } from 'lucide-react';

// Weather condition to background gradient mapping
const WEATHER_GRADIENTS = {
  Clear: {
    day: 'from-blue-400 via-blue-500 to-blue-600',
    night: 'from-indigo-900 via-purple-900 to-slate-900',
  },
  Clouds: {
    day: 'from-gray-400 via-gray-500 to-slate-600',
    night: 'from-slate-700 via-slate-800 to-gray-900',
  },
  Rain: {
    day: 'from-slate-500 via-slate-600 to-gray-700',
    night: 'from-slate-800 via-gray-900 to-slate-900',
  },
  Drizzle: {
    day: 'from-gray-400 via-slate-500 to-gray-600',
    night: 'from-slate-700 via-gray-800 to-slate-900',
  },
  Thunderstorm: {
    day: 'from-gray-600 via-slate-700 to-gray-800',
    night: 'from-gray-800 via-slate-900 to-black',
  },
  Snow: {
    day: 'from-blue-100 via-blue-200 to-slate-300',
    night: 'from-slate-600 via-blue-900 to-slate-800',
  },
  Mist: {
    day: 'from-gray-300 via-slate-400 to-gray-500',
    night: 'from-slate-600 via-gray-700 to-slate-800',
  },
  Fog: {
    day: 'from-gray-300 via-slate-400 to-gray-500',
    night: 'from-slate-600 via-gray-700 to-slate-800',
  },
  Haze: {
    day: 'from-amber-200 via-orange-300 to-amber-400',
    night: 'from-amber-800 via-orange-900 to-slate-900',
  },
};

export default function AnimatedTheme({ config, weatherData, loading, error, getWeatherEmoji }) {
  const current = weatherData?.current;
  const forecast = weatherData?.forecast || [];
  const isPortrait = config?.orientation === 'portrait';

  // Determine if it's day or night based on current time and sunrise/sunset
  const isNight = useMemo(() => {
    if (!current?.sunrise || !current?.sunset) {
      const hour = new Date().getHours();
      return hour < 6 || hour >= 20;
    }
    const now = new Date();
    return now < current.sunrise || now > current.sunset;
  }, [current]);

  // Get gradient based on weather condition
  const gradient = useMemo(() => {
    const condition = current?.main || 'Clear';
    const gradients = WEATHER_GRADIENTS[condition] || WEATHER_GRADIENTS.Clear;
    return isNight ? gradients.night : gradients.day;
  }, [current?.main, isNight]);

  // Format temperature display
  const formatTemp = (temp, showUnit = true) => {
    if (temp === undefined || temp === null) return '--';
    const unit = config?.tempUnit === 'fahrenheit' ? '°F' : '°C';
    return showUnit ? `${Math.round(temp)}${unit}` : Math.round(temp);
  };

  // Get secondary temperature if showing both units
  const getSecondaryTemp = (temp) => {
    if (!config?.showBothUnits || temp === undefined) return null;
    if (config?.tempUnit === 'celsius') {
      return `${Math.round(temp * 1.8 + 32)}°F`;
    } else {
      return `${Math.round((temp - 32) / 1.8)}°C`;
    }
  };

  // Format date based on config
  const formatDate = () => {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    return now.toLocaleDateString(config?.language || 'en', options);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString(config?.language || 'en', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !weatherData) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <div className="text-white text-2xl animate-pulse">Loading weather...</div>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
        <div className="text-white text-2xl">{error}</div>
      </div>
    );
  }

  // Portrait/Vertical Layout (9:16)
  if (isPortrait) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-b ${gradient} text-white font-sans overflow-hidden relative`}
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Weather effects */}
        {current?.main === 'Rain' && <div className="absolute inset-0 opacity-20 pointer-events-none rain-animation" />}
        {current?.main === 'Snow' && <div className="absolute inset-0 opacity-30 pointer-events-none snow-animation" />}

        <div className="w-full h-full p-8 flex flex-col">
          {/* Header: Logo and Location */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MapPin size={24} className="opacity-80" />
              <span className="text-2xl font-medium">
                {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
              </span>
            </div>
            {config?.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            )}
          </div>

          {/* Main Weather Icon */}
          <div className="text-center mb-6">
            <span className="text-[180px] leading-none">{getWeatherEmoji(current?.icon)}</span>
          </div>

          {/* Condition */}
          <div className="text-center text-3xl font-medium mb-2 capitalize">
            {current?.description || current?.main || 'Weather'}
          </div>

          {/* Main Temperature */}
          <div className="text-center mb-8">
            <div className="text-[120px] font-light leading-none">
              {formatTemp(current?.temp)}
            </div>
            {config?.showBothUnits && current?.temp !== undefined && (
              <div className="text-4xl opacity-60 mt-2">
                {getSecondaryTemp(current?.temp)}
              </div>
            )}
            <div className="text-xl opacity-70 mt-4">
              Feels like {formatTemp(current?.feelsLike)}
            </div>
          </div>

          {/* Stats Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <Droplets size={32} className="mx-auto mb-2 opacity-70" />
              <div className="text-3xl font-semibold">{current?.humidity || '--'}%</div>
              <div className="text-sm opacity-60">Humidity</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <Wind size={32} className="mx-auto mb-2 opacity-70" />
              <div className="text-3xl font-semibold">{current?.windSpeed || '--'}</div>
              <div className="text-sm opacity-60">{current?.windUnit || 'mph'}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <Eye size={32} className="mx-auto mb-2 opacity-70" />
              <div className="text-3xl font-semibold">
                {config?.measurementSystem === 'metric' ? '10km' : '6mi'}
              </div>
              <div className="text-sm opacity-60">Visibility</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <Gauge size={32} className="mx-auto mb-2 opacity-70" />
              <div className="text-3xl font-semibold">Good</div>
              <div className="text-sm opacity-60">Air Quality</div>
            </div>
          </div>

          {/* Date/Time */}
          <div className="text-center text-lg opacity-70 mb-6">
            {formatDate()} • {formatTime()}
          </div>

          {/* 5-day forecast - Vertical stack */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="space-y-2">
              {forecast.slice(0, 5).map((day, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{day.emoji || getWeatherEmoji(day.icon)}</span>
                    <span className="text-lg font-medium w-12">{day.day}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg opacity-60">{formatTemp(day.low, false)}°</span>
                    <span className="text-xl font-semibold">{formatTemp(day.high, false)}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          .rain-animation {
            background: linear-gradient(transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
            background-size: 2px 20px;
            animation: rain 0.5s linear infinite;
          }
          @keyframes rain { 0% { background-position: 0 0; } 100% { background-position: 0 20px; } }
          .snow-animation {
            background: radial-gradient(circle, white 1px, transparent 1px);
            background-size: 20px 20px;
            animation: snow 3s linear infinite;
          }
          @keyframes snow { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        `}</style>
      </div>
    );
  }

  // Landscape Layout (16:9) - Default
  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${gradient} text-white font-sans overflow-hidden relative`}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Weather effects */}
      {current?.main === 'Rain' && <div className="absolute inset-0 opacity-20 pointer-events-none rain-animation" />}
      {current?.main === 'Snow' && <div className="absolute inset-0 opacity-30 pointer-events-none snow-animation" />}

      <div className="w-full h-full p-10 flex flex-col">
        {/* Header: Location and Logo */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin size={24} className="opacity-80" />
            <span className="text-2xl font-medium">
              {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
            </span>
          </div>
          {config?.logoUrl && (
            <img src={config.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
          )}
        </div>

        {/* Condition */}
        <div className="text-3xl font-medium mb-6 capitalize">
          {current?.description || current?.main || 'Weather'}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Left side: Temperature and stats */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Main temperature */}
            <div className="mb-8">
              <div className="text-[140px] font-light leading-none">
                {formatTemp(current?.temp)}
              </div>
              {config?.showBothUnits && current?.temp !== undefined && (
                <div className="text-4xl opacity-60 mt-2">
                  {getSecondaryTemp(current?.temp)}
                </div>
              )}
              <div className="text-2xl opacity-70 mt-4">
                Feels like {formatTemp(current?.feelsLike)}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center gap-4">
                <Droplets size={32} className="opacity-70" />
                <div>
                  <div className="text-3xl font-semibold">{current?.humidity || '--'}%</div>
                  <div className="text-base opacity-60">Humidity</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Wind size={32} className="opacity-70" />
                <div>
                  <div className="text-3xl font-semibold">
                    {current?.windSpeed || '--'} {current?.windUnit || 'mph'}
                  </div>
                  <div className="text-base opacity-60">Wind</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Eye size={32} className="opacity-70" />
                <div>
                  <div className="text-3xl font-semibold">
                    {config?.measurementSystem === 'metric' ? '10km' : '6mi'}
                  </div>
                  <div className="text-base opacity-60">Visibility</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Gauge size={32} className="opacity-70" />
                <div>
                  <div className="text-3xl font-semibold">Good</div>
                  <div className="text-base opacity-60">Air Quality</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Weather icon */}
          <div className="w-96 flex items-center justify-center">
            <span className="text-[200px] leading-none">{getWeatherEmoji(current?.icon)}</span>
          </div>
        </div>

        {/* Date/Time */}
        <div className="text-xl opacity-70 mb-6">
          {formatDate()} • {formatTime()}
        </div>

        {/* 5-day forecast */}
        <div className="grid grid-cols-5 gap-4">
          {forecast.slice(0, 5).map((day, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center"
            >
              <div className="text-lg font-medium opacity-80">{day.day}</div>
              <div className="text-5xl my-3">{day.emoji || getWeatherEmoji(day.icon)}</div>
              <div className="text-2xl font-semibold">{formatTemp(day.high, false)}°</div>
              <div className="text-lg opacity-60">{formatTemp(day.low, false)}°</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .rain-animation {
          background: linear-gradient(transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          background-size: 2px 20px;
          animation: rain 0.5s linear infinite;
        }
        @keyframes rain { 0% { background-position: 0 0; } 100% { background-position: 0 20px; } }
        .snow-animation {
          background: radial-gradient(circle, white 1px, transparent 1px);
          background-size: 20px 20px;
          animation: snow 3s linear infinite;
        }
        @keyframes snow { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
      `}</style>
    </div>
  );
}
