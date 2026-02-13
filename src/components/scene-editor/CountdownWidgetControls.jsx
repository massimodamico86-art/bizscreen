/**
 * CountdownWidgetControls
 *
 * Configuration UI for the countdown widget type in the scene editor.
 * Provides mode toggle (one-time vs daily), target date/time pickers,
 * timezone selection, label, locale, unit label style, display options,
 * and text color controls.
 */

import { Timer, Calendar, Clock, Globe, Type, Languages } from 'lucide-react';
import { TIMEZONE_OPTIONS } from '../../services/locationService.js';

/**
 * @param {Object} root0 - Component props
 * @param {Object} root0.props - Widget props from the block
 * @param {Function} root0.onPropChange - Callback to update a single prop
 */
export function CountdownWidgetControls({ props, onPropChange }) {
  const mode = props.mode || 'oneTime';
  const targetDate = props.targetDate || '';
  const targetTime = props.targetTime || '17:00';
  const timezone = props.timezone || 'device';
  const label = props.label || '';
  const locale = props.locale || 'en';
  const unitLabelStyle = props.unitLabelStyle || 'short';
  const showTargetDate = props.showTargetDate || false;
  const showUrgency = props.showUrgency !== false;
  const textColor = props.textColor || '#ffffff';

  // Strip timezone suffix from targetDate for datetime-local input
  const dateInputValue = targetDate ? targetDate.replace(/[Z+].*$/, '').slice(0, 16) : '';

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <Timer className="w-3 h-3 inline mr-1" />
          Mode
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => onPropChange('mode', 'oneTime')}
            className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded ${
              mode === 'oneTime'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Calendar className="w-3 h-3" />
            One-time
          </button>
          <button
            onClick={() => onPropChange('mode', 'daily')}
            className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded ${
              mode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            Daily
          </button>
        </div>
      </div>

      {/* Target Date (one-time mode) */}
      {mode === 'oneTime' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Target Date & Time
          </label>
          <input
            type="datetime-local"
            value={dateInputValue}
            onChange={(e) => onPropChange('targetDate', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
          />
        </div>
      )}

      {/* Target Time (daily mode) */}
      {mode === 'daily' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            <Clock className="w-3 h-3 inline mr-1" />
            Daily Target Time
          </label>
          <input
            type="time"
            value={targetTime}
            onChange={(e) => onPropChange('targetTime', e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
          />
        </div>
      )}

      {/* Timezone */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <Globe className="w-3 h-3 inline mr-1" />
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => onPropChange('timezone', e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
        >
          <option value="device">Screen timezone (auto)</option>
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <Type className="w-3 h-3 inline mr-1" />
          Display Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => onPropChange('label', e.target.value)}
          placeholder="e.g., Grand Opening in..."
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
        />
      </div>

      {/* Locale */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <Languages className="w-3 h-3 inline mr-1" />
          Language
        </label>
        <select
          value={locale}
          onChange={(e) => onPropChange('locale', e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
        </select>
      </div>

      {/* Unit Label Style */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Unit Labels</label>
        <div className="flex gap-1">
          <button
            onClick={() => onPropChange('unitLabelStyle', 'short')}
            className={`flex-1 text-xs py-1.5 rounded ${
              unitLabelStyle === 'short'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Short (D H M S)
          </button>
          <button
            onClick={() => onPropChange('unitLabelStyle', 'full')}
            className={`flex-1 text-xs py-1.5 rounded ${
              unitLabelStyle === 'full'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Full (Days Hours Min Sec)
          </button>
        </div>
      </div>

      {/* Display Options */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Display Options</label>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mb-1">
          <input
            type="checkbox"
            checked={showTargetDate}
            onChange={(e) => onPropChange('showTargetDate', e.target.checked)}
            className="accent-blue-500"
          />
          Show target date
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showUrgency}
            onChange={(e) => onPropChange('showUrgency', e.target.checked)}
            className="accent-blue-500"
          />
          Show urgency color
        </label>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Text Color</label>
        <input
          type="color"
          value={textColor}
          onChange={(e) => onPropChange('textColor', e.target.value)}
          className="w-full h-8 rounded cursor-pointer bg-gray-700 border border-gray-600"
        />
      </div>
    </div>
  );
}
