/**
 * RssWidgetControls
 *
 * Configuration UI for the rss-ticker and rss-card widget types in the scene editor.
 * Provides feed URL input with validation, refresh interval, and type-specific
 * display options (ticker speed/separator, card layout/images/dates).
 */

import { useState } from 'react';
import { Rss } from 'lucide-react';
import { validateRssUrl } from '../../services/rssFeedService';

/**
 * @param {Object} props - Component props
 * @param {string} props.widgetType - 'rss-ticker' or 'rss-card'
 * @param {Object} props.props - Widget props from the block
 * @param {Function} props.onPropChange - Callback to update a single prop
 */
export function RssWidgetControls({ widgetType, props, onPropChange }) {
  const [urlError, setUrlError] = useState(null);

  function handleFeedUrlBlur() {
    if (!props.feedUrl) {
      setUrlError(null);
      return;
    }
    const result = validateRssUrl(props.feedUrl);
    setUrlError(result.valid ? null : result.error);
  }

  return (
    <div className="space-y-3">
      {/* Feed URL Input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <Rss className="w-3 h-3 inline mr-1" />
          Feed URL
        </label>
        <input
          type="text"
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          placeholder="https://example.com/rss"
          value={props.feedUrl || ''}
          onChange={(e) => onPropChange('feedUrl', e.target.value)}
          onBlur={handleFeedUrlBlur}
        />
        {urlError && (
          <p className="text-xs text-red-400 mt-0.5">{urlError}</p>
        )}
      </div>

      {/* Refresh Interval (shared) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Refresh Interval</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.refreshIntervalMinutes || 15}
          onChange={(e) => onPropChange('refreshIntervalMinutes', parseInt(e.target.value, 10))}
        >
          {[5, 10, 15, 30, 60].map((m) => (
            <option key={m} value={m}>
              Every {m} minutes
            </option>
          ))}
        </select>
      </div>

      {/* Ticker-specific controls */}
      {widgetType === 'rss-ticker' && (
        <>
          {/* Scroll Speed */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Scroll Speed: {props.speed || 50}
            </label>
            <input
              type="range"
              min={20}
              max={120}
              step={10}
              value={props.speed || 50}
              onChange={(e) => onPropChange('speed', parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>

          {/* Separator */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Separator</label>
            <select
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.separator || '|'}
              onChange={(e) => onPropChange('separator', e.target.value)}
            >
              <option value="|">| (Pipe)</option>
              <option value={'\u2022'}>{'\u2022'} (Bullet)</option>
              <option value={'\u2014'}>{'\u2014'} (Em-dash)</option>
              <option value={' \u2022 '}> {'\u2022'} (Spaced Bullet)</option>
            </select>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Background</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.backgroundColor || 'rgba(0,0,0,0.85)'}
              onChange={(e) => onPropChange('backgroundColor', e.target.value)}
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Text Color</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.textColor || '#ffffff'}
              onChange={(e) => onPropChange('textColor', e.target.value)}
            />
          </div>
        </>
      )}

      {/* Card-specific controls */}
      {widgetType === 'rss-card' && (
        <>
          {/* Layout */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Layout</label>
            <div className="flex gap-1">
              {['grid', 'carousel'].map((layout) => (
                <button
                  key={layout}
                  onClick={() => onPropChange('layout', layout)}
                  className={`flex-1 text-xs py-1 rounded border capitalize ${
                    (props.layout || 'grid') === layout
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          {/* Max Cards */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Cards</label>
            <input
              type="number"
              min={1}
              max={12}
              value={props.maxCards || 4}
              onChange={(e) => onPropChange('maxCards', parseInt(e.target.value, 10))}
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
            />
          </div>

          {/* Card Rotate Speed (carousel only) */}
          {(props.layout || 'grid') === 'carousel' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Rotate Speed: {props.cardRotateSeconds || 8}s
              </label>
              <input
                type="range"
                min={4}
                max={20}
                value={props.cardRotateSeconds || 8}
                onChange={(e) => onPropChange('cardRotateSeconds', parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          )}

          {/* Show Images */}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={props.showImages !== false}
              onChange={(e) => onPropChange('showImages', e.target.checked)}
              className="rounded border-gray-600 text-blue-500 bg-gray-800"
            />
            Show Images
          </label>

          {/* Show Date */}
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={props.showDate !== false}
              onChange={(e) => onPropChange('showDate', e.target.checked)}
              className="rounded border-gray-600 text-blue-500 bg-gray-800"
            />
            Show Date
          </label>

          {/* Card Background */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Card Background</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.cardBgColor || 'rgba(255,255,255,0.05)'}
              onChange={(e) => onPropChange('cardBgColor', e.target.value)}
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Text Color</label>
            <input
              type="text"
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.textColor || '#ffffff'}
              onChange={(e) => onPropChange('textColor', e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
