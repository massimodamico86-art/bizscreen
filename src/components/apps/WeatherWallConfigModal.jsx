/**
 * WeatherWallConfigModal Component
 *
 * Full configuration modal for Weather Wall app matching Yodeck's design.
 * Features: themes, auto-location, language, advanced settings.
 */

import { useState, useEffect } from 'react';
import { X, CloudSun, Upload, Info, MapPin } from 'lucide-react';
import { Button, Card } from '../../design-system';

// Language options
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
];

// Date format options
const DATE_FORMATS = [
  { value: 'default', label: 'Default' },
  { value: 'us', label: 'US (MM/DD/YYYY)' },
  { value: 'eu', label: 'EU (DD/MM/YYYY)' },
  { value: 'iso', label: 'ISO (YYYY-MM-DD)' },
];

// Theme options
const THEMES = [
  { value: 'animated', label: 'Animated' },
  { value: 'classic', label: 'Classic' },
  { value: 'glass', label: 'Glass' },
];

// Orientation options
const ORIENTATIONS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
];

export default function WeatherWallConfigModal({ app, onClose, onCreate, creating }) {
  // App Settings
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [usePlayerLocation, setUsePlayerLocation] = useState(true);
  const [location, setLocation] = useState('');
  const [locationHeader, setLocationHeader] = useState('');
  const [tempUnit, setTempUnit] = useState('celsius');
  const [showBothUnits, setShowBothUnits] = useState(true);
  const [measurementSystem, setMeasurementSystem] = useState('metric');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('default');

  // Style Settings
  const [theme, setTheme] = useState('animated');
  const [logoUrl, setLogoUrl] = useState('');
  const [orientation, setOrientation] = useState('auto');

  // Advanced Settings
  const [tags, setTags] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(20);

  // Preview state
  const [previewWeather] = useState({
    location: 'London',
    condition: 'Snow',
    temp: 20,
    tempF: 68,
    humidity: 60,
    wind: 7,
    visibility: 10,
    airQuality: 2,
    forecast: [
      { day: 'Mon', icon: 'sun', high: 22, low: 15 },
      { day: 'Tue', icon: 'cloud', high: 19, low: 12 },
      { day: 'Wed', icon: 'rain', high: 16, low: 10 },
      { day: 'Thu', icon: 'sun', high: 21, low: 14 },
      { day: 'Fri', icon: 'cloud', high: 18, low: 11 },
    ],
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const config = {
      name: name || 'Weather Wall',
      description,
      usePlayerLocation,
      location: usePlayerLocation ? '' : location,
      locationHeader,
      tempUnit,
      showBothUnits,
      measurementSystem,
      language,
      dateFormat,
      theme,
      logoUrl,
      orientation,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      defaultDuration: parseInt(defaultDuration, 10),
      refreshMinutes: 15,
    };

    onCreate(config);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, upload to storage and get URL
      // For now, create object URL for preview
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    const icons = {
      sun: '☀️',
      cloud: '☁️',
      rain: '🌧️',
      snow: '❄️',
      storm: '⛈️',
    };
    return icons[condition] || '☀️';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CloudSun size={20} className="text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {app?.name || 'Weather Wall'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary">Preview</Button>
            <Button
              onClick={handleSubmit}
              disabled={creating || (!usePlayerLocation && !location)}
              className="bg-[#f26f21] hover:bg-[#e05e10] text-white"
            >
              {creating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Left: Preview */}
            <div className="w-[450px] p-6 bg-gray-50 border-r border-gray-200">
              {/* Weather Preview Card */}
              <div
                className={`rounded-xl overflow-hidden shadow-lg ${
                  theme === 'animated'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-800'
                    : theme === 'classic'
                    ? 'bg-gray-800'
                    : 'bg-white/20 backdrop-blur-lg border border-white/30'
                }`}
              >
                <div className="p-6 text-white">
                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm opacity-80 mb-1">
                    <MapPin size={14} />
                    <span>{locationHeader || previewWeather.location}</span>
                  </div>

                  {/* Condition */}
                  <div className="text-lg font-medium mb-4">
                    {previewWeather.condition}
                  </div>

                  {/* Main temp and icons row */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="text-6xl font-light">
                        {tempUnit === 'celsius'
                          ? `${previewWeather.temp}°C`
                          : `${previewWeather.tempF}°F`}
                        {showBothUnits && (
                          <span className="text-2xl ml-2 opacity-60">
                            {tempUnit === 'celsius'
                              ? `${previewWeather.tempF}°F`
                              : `${previewWeather.temp}°C`}
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-60 mt-1">
                        Feels like{' '}
                        {tempUnit === 'celsius' ? '18°C' : '65°F'}
                      </div>
                    </div>

                    {/* Weather icon grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {['sun', 'cloud', 'rain', 'snow'].map((icon, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl"
                        >
                          {getWeatherIcon(icon)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-4 py-4 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">
                        {previewWeather.humidity}%
                      </div>
                      <div className="text-xs opacity-60">Humidity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">0%</div>
                      <div className="text-xs opacity-60">Chance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">
                        {measurementSystem === 'metric' ? '10km' : '6mi'}
                      </div>
                      <div className="text-xs opacity-60">Visibility</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">
                        {previewWeather.airQuality}
                      </div>
                      <div className="text-xs opacity-60">Air Quality</div>
                    </div>
                  </div>

                  {/* Date/Time */}
                  <div className="text-sm opacity-60 mt-4">
                    Tuesday, 17 Dec 2025 • 02:58 PM
                  </div>

                  {/* Forecast */}
                  <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-white/20">
                    {previewWeather.forecast.map((day, i) => (
                      <div
                        key={i}
                        className="text-center bg-white/10 rounded-lg p-2"
                      >
                        <div className="text-xs opacity-80">{day.day}</div>
                        <div className="text-xl my-1">
                          {getWeatherIcon(day.icon)}
                        </div>
                        <div className="text-sm">
                          {tempUnit === 'celsius'
                            ? `${day.high}°`
                            : `${Math.round(day.high * 1.8 + 32)}°`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex justify-between py-1">
                  <span>ID</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Uploaded date</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Category</span>
                  <span>Weather</span>
                </div>
              </div>
            </div>

            {/* Right: Settings Form */}
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* APP SETTINGS Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      APP SETTINGS
                    </h3>
                    <a
                      href="#"
                      className="text-sm text-[#f26f21] hover:underline"
                    >
                      Help with this app
                    </a>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Name*
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter Name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>

                    {/* Description */}
                    <div className="flex items-start gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 pt-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter a Description"
                        rows={2}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] resize-none"
                      />
                    </div>

                    {/* Use Player's Location */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Use Player's Location
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setUsePlayerLocation(!usePlayerLocation)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          usePlayerLocation ? 'bg-[#f26f21]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            usePlayerLocation ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Location Header */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Location Header
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <input
                        type="text"
                        value={locationHeader}
                        onChange={(e) => setLocationHeader(e.target.value)}
                        placeholder={usePlayerLocation ? '' : 'Enter location'}
                        disabled={!usePlayerLocation}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] disabled:bg-gray-100"
                      />
                    </div>

                    {/* Manual Location (when not using player location) */}
                    {!usePlayerLocation && (
                      <div className="flex items-center gap-4">
                        <label className="w-40 text-sm font-medium text-gray-700">
                          Location*
                        </label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., London, UK or 51.5074,-0.1278"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                          required
                        />
                      </div>
                    )}

                    {/* Main Temperature in */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Main Temperature in
                      </label>
                      <select
                        value={tempUnit}
                        onChange={(e) => setTempUnit(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        <option value="celsius">Celsius</option>
                        <option value="fahrenheit">Fahrenheit</option>
                      </select>
                    </div>

                    {/* Also display in F */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Also display in °F
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBothUnits(!showBothUnits)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          showBothUnits ? 'bg-[#f26f21]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            showBothUnits ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Measurement System */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Measurement System
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <select
                        value={measurementSystem}
                        onChange={(e) => setMeasurementSystem(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        <option value="metric">Metric</option>
                        <option value="imperial">Imperial</option>
                      </select>
                    </div>

                    {/* Language */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date & Time Format */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Date & Time Format
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        {DATE_FORMATS.map((format) => (
                          <option key={format.value} value={format.value}>
                            {format.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* STYLE SETTINGS Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    STYLE SETTINGS
                  </h3>

                  <div className="space-y-4">
                    {/* Theme */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Theme
                      </label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        {THEMES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Logo
                      </label>
                      <div className="flex-1">
                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#f26f21] transition-colors">
                          <Upload size={18} className="text-gray-400" />
                          <span className="text-sm text-gray-500">
                            Choose file to Upload
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {logoUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={logoUrl}
                              alt="Logo preview"
                              className="w-8 h-8 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="text-sm text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Orientation */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Orientation
                      </label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        {ORIENTATIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ADVANCED SETTINGS Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    ADVANCED SETTINGS
                  </h3>

                  <div className="space-y-4">
                    {/* Tags */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="Add Tags"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                        />
                        <a
                          href="#"
                          className="text-sm text-[#f26f21] hover:underline mt-1 inline-block"
                        >
                          Manage Tags
                        </a>
                      </div>
                    </div>

                    {/* Default Duration */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Default Duration
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={defaultDuration}
                          onChange={(e) => setDefaultDuration(e.target.value)}
                          min={5}
                          max={300}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                        />
                        <span className="text-sm text-gray-500">seconds</span>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Availability
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <button
                        type="button"
                        className="relative w-12 h-6 bg-gray-300 rounded-full"
                        disabled
                      >
                        <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>

                    {/* Scheduling (disabled by default) */}
                    <div className="flex items-start gap-4 opacity-50">
                      <div className="w-40" />
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">
                            From
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-gray-400 bg-gray-50"
                          >
                            Set start Date | Time
                          </button>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">
                            To
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-gray-400 bg-gray-50"
                          >
                            Set expire Date | Time
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 opacity-50">
                      <div className="w-40" />
                      <div className="flex-1">
                        <a
                          href="#"
                          className="text-sm text-[#f26f21] hover:underline"
                        >
                          Add Scheduled Availability
                        </a>
                        <div className="flex items-center gap-2 mt-2">
                          <input type="checkbox" disabled />
                          <span className="text-sm text-gray-500">
                            Non-expiring
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
