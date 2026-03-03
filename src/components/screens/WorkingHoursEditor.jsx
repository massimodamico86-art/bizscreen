/**
 * WorkingHoursEditor
 *
 * Per-day on/off time picker for screen working hours.
 * Renders a toggle to enable working hours plus a 7-day schedule grid.
 *
 * @module components/screens/WorkingHoursEditor
 */
import { useState } from 'react';
import { Clock, Copy } from 'lucide-react';
import { Switch } from '../../design-system';
import { DEFAULT_WORKING_HOURS, validateWorkingHours } from '../../services/workingHoursService';

const DAY_LABELS = [
  { key: '0', label: 'Sun' },
  { key: '1', label: 'Mon' },
  { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' },
  { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' },
  { key: '6', label: 'Sat' },
];

/**
 * WorkingHoursEditor component
 *
 * @param {Object} props
 * @param {Object|null} props.value - JSONB working hours object or null (always on)
 * @param {Function} props.onChange - Callback receiving updated JSONB or null
 */
export const WorkingHoursEditor = ({ value, onChange }) => {
  const [validationError, setValidationError] = useState(null);

  const isEnabled = value !== null && value !== undefined;

  const handleToggleEnabled = (e) => {
    if (e.target.checked) {
      // Enable with defaults
      const defaults = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS));
      setValidationError(null);
      onChange(defaults);
    } else {
      // Disable - set to null (always on)
      setValidationError(null);
      onChange(null);
    }
  };

  const handleDayToggle = (dayKey, checked) => {
    const updated = { ...value, [dayKey]: { ...value[dayKey], enabled: checked } };
    validateAndUpdate(updated);
  };

  const handleTimeChange = (dayKey, field, timeValue) => {
    const updated = { ...value, [dayKey]: { ...value[dayKey], [field]: timeValue } };
    validateAndUpdate(updated);
  };

  const validateAndUpdate = (updated) => {
    const result = validateWorkingHours(updated);
    if (!result.valid) {
      setValidationError(result.error);
    } else {
      setValidationError(null);
    }
    onChange(updated);
  };

  const handleApplyWeekdayHours = () => {
    if (!value || !value['1']) return;
    const mondayHours = value['1'];
    const updated = { ...value };
    for (let day = 2; day <= 5; day++) {
      updated[String(day)] = {
        ...updated[String(day)],
        start: mondayHours.start,
        end: mondayHours.end,
        enabled: mondayHours.enabled,
      };
    }
    validateAndUpdate(updated);
  };

  return (
    <div className="space-y-3">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-orange-500" />
          <span className="text-sm font-medium text-gray-700">Enable Working Hours</span>
        </div>
        <Switch
          checked={isEnabled}
          onChange={handleToggleEnabled}
        />
      </div>

      {isEnabled && value && (
        <>
          {/* Per-day schedule */}
          <div className="space-y-1.5">
            {DAY_LABELS.map(({ key, label }) => {
              const daySchedule = value[key];
              if (!daySchedule) return null;

              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                    daySchedule.enabled ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {/* Day label */}
                  <span className={`text-xs font-medium w-8 ${
                    daySchedule.enabled ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>

                  {/* Day toggle */}
                  <Switch
                    checked={daySchedule.enabled}
                    onChange={(e) => handleDayToggle(key, e.target.checked)}
                  />

                  {/* Time inputs */}
                  <input
                    type="time"
                    value={daySchedule.start}
                    onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                    disabled={!daySchedule.enabled}
                    className="px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    value={daySchedule.end}
                    onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                    disabled={!daySchedule.enabled}
                    className="px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              );
            })}
          </div>

          {/* Apply weekday hours button */}
          <button
            type="button"
            onClick={handleApplyWeekdayHours}
            className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
          >
            <Copy size={12} />
            Apply Monday hours to Tue-Fri
          </button>

          {/* Validation error */}
          {validationError && (
            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{validationError}</p>
          )}
        </>
      )}

      {!isEnabled && (
        <p className="text-xs text-gray-400">Screen will stay on 24/7</p>
      )}
    </div>
  );
};
