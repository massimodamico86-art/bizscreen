/**
 * GlassTheme Component
 *
 * Modern glassmorphism weather display with frosted glass effects.
 * Features: blur backgrounds, translucent cards, elegant design.
 */

import { MapPin, Droplets, Wind, Eye, Gauge, Sunrise, Sunset } from 'lucide-react';

export default function GlassTheme({ config, weatherData, loading, error, getWeatherEmoji }) {
  const current = weatherData?.current;
  const forecast = weatherData?.forecast || [];
  const isPortrait = config?.orientation === 'portrait';

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

  // Format sunrise/sunset time
  const formatSunTime = (date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString(config?.language || 'en', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !weatherData) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading weather...</div>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-900 via-rose-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">{error}</div>
      </div>
    );
  }

  // Portrait/Vertical Layout (9:16)
  if (isPortrait) {
    return (
      <div
        className="w-full h-full relative overflow-hidden"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600 via-purple-600 to-pink-500" />

        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 w-full h-full p-8 flex flex-col text-white">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="backdrop-blur-md bg-white/10 rounded-2xl px-5 py-3 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} className="text-white/70" />
                <span className="text-lg font-medium">
                  {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
                </span>
              </div>
              <div className="text-white/60 text-sm">{formatDate()}</div>
            </div>
            {config?.logoUrl && (
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-3 border border-white/20">
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
            )}
          </div>

          {/* Weather icon */}
          <div className="text-center mb-4">
            <span className="text-[140px] leading-none">
              {getWeatherEmoji(current?.icon)}
            </span>
          </div>

          {/* Current weather card */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 mb-6 text-center">
            <div className="text-8xl font-extralight mb-2">
              {formatTemp(current?.temp)}
            </div>
            {config?.showBothUnits && current?.temp !== undefined && (
              <div className="text-2xl text-white/50">
                {getSecondaryTemp(current?.temp)}
              </div>
            )}
            <div className="text-xl text-white/70 mt-3 capitalize">
              {current?.description || current?.main || 'Weather'}
            </div>
            <div className="text-white/50 mt-1">
              Feels like {formatTemp(current?.feelsLike)}
            </div>
          </div>

          {/* Stats grid - 2x2 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20 text-center">
              <Droplets size={22} className="mx-auto mb-2 text-blue-300" />
              <div className="text-2xl font-semibold">{current?.humidity || '--'}%</div>
              <div className="text-xs text-white/60">Humidity</div>
            </div>
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20 text-center">
              <Wind size={22} className="mx-auto mb-2 text-cyan-300" />
              <div className="text-2xl font-semibold">{current?.windSpeed || '--'}</div>
              <div className="text-xs text-white/60">{current?.windUnit || 'mph'}</div>
            </div>
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20 text-center">
              <Sunrise size={22} className="mx-auto mb-2 text-amber-300" />
              <div className="text-xl font-semibold">{formatSunTime(current?.sunrise)}</div>
              <div className="text-xs text-white/60">Sunrise</div>
            </div>
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20 text-center">
              <Sunset size={22} className="mx-auto mb-2 text-orange-400" />
              <div className="text-xl font-semibold">{formatSunTime(current?.sunset)}</div>
              <div className="text-xs text-white/60">Sunset</div>
            </div>
          </div>

          {/* 5-day forecast - Vertical stack */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20">
              <h3 className="text-xs font-medium text-white/60 mb-3 uppercase tracking-wide">
                5-Day Forecast
              </h3>
              <div className="space-y-2">
                {forecast.slice(0, 5).map((day, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{day.emoji || getWeatherEmoji(day.icon)}</span>
                      <span className="font-medium">{day.day}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">{formatTemp(day.low, false)}°</span>
                      <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"
                          style={{ width: `${((day.high - day.low) / 30) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">{formatTemp(day.high, false)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: Time */}
          <div className="mt-4 text-center text-white/50 text-sm">
            Last updated: {formatTime()}
          </div>
        </div>
      </div>
    );
  }

  // Landscape Layout (16:9) - Default
  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500" />

      {/* Decorative circles */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 w-full h-full p-8 flex flex-col text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="backdrop-blur-md bg-white/10 rounded-2xl px-6 py-4 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-white/70" />
              <span className="text-lg font-medium">
                {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
              </span>
            </div>
            <div className="text-white/60 text-sm">{formatDate()}</div>
          </div>
          {config?.logoUrl && (
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-3 border border-white/20">
              <img
                src={config.logoUrl}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-3 gap-6">
          {/* Left column: Main weather */}
          <div className="col-span-2 flex flex-col">
            {/* Current weather card */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-9xl font-extralight mb-2">
                    {formatTemp(current?.temp)}
                  </div>
                  {config?.showBothUnits && current?.temp !== undefined && (
                    <div className="text-3xl text-white/50">
                      {getSecondaryTemp(current?.temp)}
                    </div>
                  )}
                  <div className="text-xl text-white/70 mt-4 capitalize">
                    {current?.description || current?.main || 'Weather'}
                  </div>
                  <div className="text-white/50 mt-1">
                    Feels like {formatTemp(current?.feelsLike)}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[120px] leading-none">
                    {getWeatherEmoji(current?.icon)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20 text-center">
                <Droplets size={24} className="mx-auto mb-2 text-blue-300" />
                <div className="text-2xl font-semibold">{current?.humidity || '--'}%</div>
                <div className="text-sm text-white/60">Humidity</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20 text-center">
                <Wind size={24} className="mx-auto mb-2 text-cyan-300" />
                <div className="text-2xl font-semibold">{current?.windSpeed || '--'}</div>
                <div className="text-sm text-white/60">{current?.windUnit || 'mph'}</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20 text-center">
                <Eye size={24} className="mx-auto mb-2 text-purple-300" />
                <div className="text-2xl font-semibold">
                  {config?.measurementSystem === 'metric' ? '10km' : '6mi'}
                </div>
                <div className="text-sm text-white/60">Visibility</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20 text-center">
                <Gauge size={24} className="mx-auto mb-2 text-green-300" />
                <div className="text-2xl font-semibold">Good</div>
                <div className="text-sm text-white/60">Air Quality</div>
              </div>
            </div>
          </div>

          {/* Right column: Forecast and sun times */}
          <div className="flex flex-col gap-4">
            {/* 5-day forecast */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20 flex-1">
              <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wide">
                5-Day Forecast
              </h3>
              <div className="space-y-3">
                {forecast.slice(0, 5).map((day, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{day.emoji || getWeatherEmoji(day.icon)}</span>
                      <span className="font-medium">{day.day}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">{formatTemp(day.low, false)}°</span>
                      <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"
                          style={{ width: `${((day.high - day.low) / 30) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">{formatTemp(day.high, false)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sunrise/Sunset */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-5 border border-white/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Sunrise size={24} className="mx-auto mb-2 text-amber-300" />
                  <div className="text-xl font-semibold">{formatSunTime(current?.sunrise)}</div>
                  <div className="text-sm text-white/60">Sunrise</div>
                </div>
                <div className="text-center">
                  <Sunset size={24} className="mx-auto mb-2 text-orange-400" />
                  <div className="text-xl font-semibold">{formatSunTime(current?.sunset)}</div>
                  <div className="text-sm text-white/60">Sunset</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Time */}
        <div className="mt-4 text-center text-white/50">
          Last updated: {formatTime()}
        </div>
      </div>
    </div>
  );
}
