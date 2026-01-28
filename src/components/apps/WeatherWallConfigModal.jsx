/**
 * WeatherWallConfigModal Component
 *
 * Full configuration modal for Weather Wall app matching Yodeck's design.
 * Features: themes, auto-location, language, advanced settings.
 */

import { useState, useEffect } from 'react';

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

  // Full-screen preview modal state
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Handle ESC key to close preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showFullPreview) {
        setShowFullPreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullPreview]);

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
            <Button variant="secondary" onClick={() => setShowFullPreview(true)}>
              <Maximize2 className="w-4 h-4 mr-1" />
              Preview
            </Button>
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
            <div className="w-[450px] p-6 bg-gray-900 border-r border-gray-200 flex flex-col items-center">
              {/* Live Weather Preview using actual WeatherWall component */}
              {/* Container simulates a TV scaled down to fit */}
              {orientation === 'portrait' ? (
                // Portrait: 1080x1920 scaled to fit ~300px height
                <div className="rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '9/16', height: '350px' }}>
                  <div
                    style={{
                      width: '1080px',
                      height: '1920px',
                      transform: 'scale(0.182)', // Scale to fit ~350px height
                      transformOrigin: 'top left',
                    }}
                  >
                    <WeatherWall
                      config={{
                        theme,
                        location: usePlayerLocation ? 'auto' : location,
                        locationHeader,
                        tempUnit,
                        showBothUnits,
                        measurementSystem,
                        language,
                        dateFormat,
                        logoUrl,
                        orientation: 'portrait',
                      }}
                    />
                  </div>
                </div>
              ) : (
                // Landscape (default): 1920x1080 scaled to fit ~420px width
                <div className="rounded-xl overflow-hidden shadow-lg w-full" style={{ aspectRatio: '16/9' }}>
                  <div
                    style={{
                      width: '1920px',
                      height: '1080px',
                      transform: 'scale(0.219)', // Scale to fit ~420px width
                      transformOrigin: 'top left',
                    }}
                  >
                    <WeatherWall
                      config={{
                        theme,
                        location: usePlayerLocation ? 'auto' : location,
                        locationHeader,
                        tempUnit,
                        showBothUnits,
                        measurementSystem,
                        language,
                        dateFormat,
                        logoUrl,
                        orientation: 'landscape',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-4 text-sm text-gray-400 w-full">
                <div className="flex justify-between py-1">
                  <span>ID</span>
                  <span className="text-gray-300">-</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Uploaded date</span>
                  <span className="text-gray-300">-</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Category</span>
                  <span className="text-gray-300">Weather</span>
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
                        Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Weather Wall"
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
                        Display Name
                        <Info size={14} className="text-gray-400" title="Override the location name shown on screen" />
                      </label>
                      <input
                        type="text"
                        value={locationHeader}
                        onChange={(e) => setLocationHeader(e.target.value)}
                        placeholder="e.g., Our Store, Lobby Display"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
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

                    {/* Also display secondary unit */}
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        Also display in {tempUnit === 'celsius' ? '°F' : '°C'}
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

      {/* Full-screen Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setShowFullPreview(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Preview info */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
            <div className="font-medium">{name || 'Weather Wall'}</div>
            <div className="text-white/60 text-xs">
              Theme: {theme} • {orientation === 'portrait' ? '9:16' : '16:9'}
            </div>
          </div>

          {/* Weather Wall Preview */}
          <div
            className={`${
              orientation === 'portrait'
                ? 'h-[90vh] aspect-[9/16]'
                : 'w-[90vw] aspect-video'
            } max-w-full max-h-full`}
          >
            <WeatherWall
              config={{
                theme,
                location: usePlayerLocation ? 'auto' : location,
                locationHeader,
                tempUnit,
                showBothUnits,
                measurementSystem,
                language,
                dateFormat,
                logoUrl,
                orientation,
              }}
            />
          </div>

          {/* Press ESC hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
            Press ESC or click X to close
          </div>
        </div>
      )}
    </div>
  );
}
