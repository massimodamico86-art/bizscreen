/**
 * ClassicTheme Component
 *
 * Clean, traditional weather display with customizable solid color backgrounds.
 * Supports both landscape (16:9) and portrait (9:16) TV orientations.
 */


export default function ClassicTheme({ config, weatherData, loading, error, getWeatherEmoji }) {
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
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
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
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading weather...</div>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-2xl">{error}</div>
      </div>
    );
  }

  // Portrait/Vertical Layout (9:16)
  if (isPortrait) {
    return (
      <div
        className="w-full h-full bg-gray-900 text-white font-sans overflow-hidden"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="w-full h-full p-8 flex flex-col">
          {/* Header: Location, Logo */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-gray-400 text-lg mb-2">
                <MapPin size={18} />
                <span>
                  {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
                </span>
              </div>
              <div className="text-2xl font-medium">{formatDate()}</div>
              <div className="text-gray-400 text-lg">{formatTime()}</div>
            </div>
            {config?.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
            )}
          </div>

          {/* Weather icon and condition */}
          <div className="text-center mb-6">
            <span className="text-[160px] leading-none">{getWeatherEmoji(current?.icon)}</span>
            <div className="text-3xl font-medium capitalize mt-4">
              {current?.description || current?.main || 'Weather'}
            </div>
          </div>

          {/* Temperature */}
          <div className="text-center mb-8">
            <div className="text-[100px] font-light leading-none">{formatTemp(current?.temp)}</div>
            {config?.showBothUnits && current?.temp !== undefined && (
              <div className="text-4xl text-gray-500 mt-2">
                {getSecondaryTemp(current?.temp)}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xl mt-4">
              <ThermometerSun size={24} />
              <span>Feels like {formatTemp(current?.feelsLike)}</span>
            </div>
          </div>

          {/* Stats - 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Droplets size={20} />
                <span className="text-base">Humidity</span>
              </div>
              <div className="text-4xl font-semibold">{current?.humidity || '--'}%</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Wind size={20} />
                <span className="text-base">Wind</span>
              </div>
              <div className="text-4xl font-semibold">
                {current?.windSpeed || '--'} {current?.windUnit || 'mph'}
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Eye size={20} />
                <span className="text-base">Visibility</span>
              </div>
              <div className="text-4xl font-semibold">
                {config?.measurementSystem === 'metric' ? '10 km' : '6 mi'}
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Gauge size={20} />
                <span className="text-base">Air Quality</span>
              </div>
              <div className="text-4xl font-semibold">Good</div>
            </div>
          </div>

          {/* 5-day forecast - Vertical */}
          <div className="flex-1 flex flex-col justify-end">
            <h3 className="text-lg font-medium text-gray-400 mb-4">5-Day Forecast</h3>
            <div className="space-y-2">
              {forecast.slice(0, 5).map((day, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-xl px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{day.emoji || getWeatherEmoji(day.icon)}</span>
                    <div>
                      <div className="text-lg font-medium">{day.day}</div>
                      <div className="text-sm text-gray-400">{day.condition}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{formatTemp(day.high, false)}°</div>
                    <div className="text-lg text-gray-500">{formatTemp(day.low, false)}°</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landscape Layout (16:9) - Default
  return (
    <div
      className="w-full h-full bg-gray-900 text-white font-sans overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="w-full h-full p-10 flex flex-col">
        {/* Header: Location, Date, Logo */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-lg mb-1">
              <MapPin size={18} />
              <span>
                {config?.locationHeader || current?.city || weatherData?.locationName || 'Location'}
              </span>
            </div>
            <div className="text-2xl font-medium">{formatDate()}</div>
            <div className="text-gray-400 text-lg">{formatTime()}</div>
          </div>
          {config?.logoUrl && (
            <img src={config.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-10">
          {/* Left: Current conditions */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Weather icon and condition */}
            <div className="flex items-center gap-8 mb-10">
              <span className="text-[140px] leading-none">{getWeatherEmoji(current?.icon)}</span>
              <div>
                <div className="text-4xl font-medium capitalize">
                  {current?.description || current?.main || 'Weather'}
                </div>
                <div className="text-gray-400 text-xl mt-1">
                  {current?.main || ''}
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="mb-10">
              <div className="flex items-end gap-6">
                <span className="text-[120px] font-light leading-none">{formatTemp(current?.temp)}</span>
                {config?.showBothUnits && current?.temp !== undefined && (
                  <span className="text-5xl text-gray-500 mb-6">
                    {getSecondaryTemp(current?.temp)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-2xl mt-4">
                <ThermometerSun size={28} />
                <span>Feels like {formatTemp(current?.feelsLike)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Droplets size={22} />
                  <span className="text-base">Humidity</span>
                </div>
                <div className="text-4xl font-semibold">{current?.humidity || '--'}%</div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Wind size={22} />
                  <span className="text-base">Wind Speed</span>
                </div>
                <div className="text-4xl font-semibold">
                  {current?.windSpeed || '--'} {current?.windUnit || 'mph'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Eye size={22} />
                  <span className="text-base">Visibility</span>
                </div>
                <div className="text-4xl font-semibold">
                  {config?.measurementSystem === 'metric' ? '10 km' : '6 mi'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Gauge size={22} />
                  <span className="text-base">Air Quality</span>
                </div>
                <div className="text-4xl font-semibold">Good</div>
              </div>
            </div>
          </div>

          {/* Right: Forecast */}
          <div className="w-80 flex flex-col justify-center">
            <h3 className="text-xl font-medium text-gray-400 mb-6">5-Day Forecast</h3>
            <div className="space-y-3">
              {forecast.slice(0, 5).map((day, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-xl p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-5">
                    <span className="text-4xl">{day.emoji || getWeatherEmoji(day.icon)}</span>
                    <div>
                      <div className="text-lg font-medium">{day.day}</div>
                      <div className="text-sm text-gray-400">{day.condition}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{formatTemp(day.high, false)}°</div>
                    <div className="text-lg text-gray-500">{formatTemp(day.low, false)}°</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
