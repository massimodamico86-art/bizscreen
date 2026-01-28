/**
 * Seasonal Date Picker - Configure yearly seasonal recurrence for campaigns
 *
 * Allows setting:
 * - Enable/disable seasonal recurrence
 * - Month of activation (1-12)
 * - Day of activation (1-31, validated per month)
 * - Duration in days
 *
 * Shows preview of next activation date
 */
import { useState, useEffect } from 'react';
import { calculateNextActivation, formatRecurrenceRule } from '../../services/campaignTemplateService';

const MONTHS = [
  { value: 1, label: 'January', days: 31 },
  { value: 2, label: 'February', days: 29 }, // Leap year safe
  { value: 3, label: 'March', days: 31 },
  { value: 4, label: 'April', days: 30 },
  { value: 5, label: 'May', days: 31 },
  { value: 6, label: 'June', days: 30 },
  { value: 7, label: 'July', days: 31 },
  { value: 8, label: 'August', days: 31 },
  { value: 9, label: 'September', days: 30 },
  { value: 10, label: 'October', days: 31 },
  { value: 11, label: 'November', days: 30 },
  { value: 12, label: 'December', days: 31 }
];

export function SeasonalDatePicker({ value, onChange, disabled = false }) {
  // value: {type: 'yearly', month, day, duration_days} or null
  const [enabled, setEnabled] = useState(!!value);
  const [month, setMonth] = useState(value?.month || 1);
  const [day, setDay] = useState(value?.day || 1);
  const [durationDays, setDurationDays] = useState(value?.duration_days || 7);

  // Sync with external value
  useEffect(() => {
    if (value) {
      setEnabled(true);
      setMonth(value.month);
      setDay(value.day);
      setDurationDays(value.duration_days);
    } else {
      setEnabled(false);
    }
  }, [value]);

  // Get max days for selected month
  const selectedMonth = MONTHS.find(m => m.value === month);
  const maxDays = selectedMonth?.days || 31;

  // Clamp day if it exceeds max for month
  useEffect(() => {
    if (day > maxDays) {
      setDay(maxDays);
    }
  }, [month, maxDays, day]);

  // Build recurrence rule
  const buildRule = () => {
    if (!enabled) return null;
    return {
      type: 'yearly',
      month,
      day: Math.min(day, maxDays),
      duration_days: durationDays
    };
  };

  // Calculate next activation for preview
  const rule = buildRule();
  const nextActivation = rule ? calculateNextActivation(rule) : null;

  // Format end date preview
  const formatEndDate = () => {
    if (!nextActivation) return '';
    const start = new Date(nextActivation.startDate);
    const end = new Date(nextActivation.endDate);

    const startFormatted = start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const endFormatted = end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    return `${startFormatted} - ${endFormatted}`;
  };

  // Handle toggle
  const handleToggle = (newEnabled) => {
    setEnabled(newEnabled);
    if (newEnabled) {
      onChange({
        type: 'yearly',
        month,
        day: Math.min(day, maxDays),
        duration_days: durationDays
      });
    } else {
      onChange(null);
    }
  };

  // Handle field changes
  const handleMonthChange = (newMonth) => {
    const m = parseInt(newMonth);
    setMonth(m);
    const newMaxDays = MONTHS.find(mo => mo.value === m)?.days || 31;
    const newDay = Math.min(day, newMaxDays);
    setDay(newDay);
    if (enabled) {
      onChange({
        type: 'yearly',
        month: m,
        day: newDay,
        duration_days: durationDays
      });
    }
  };

  const handleDayChange = (newDay) => {
    const d = Math.max(1, Math.min(parseInt(newDay) || 1, maxDays));
    setDay(d);
    if (enabled) {
      onChange({
        type: 'yearly',
        month,
        day: d,
        duration_days: durationDays
      });
    }
  };

  const handleDurationChange = (newDuration) => {
    const dur = Math.max(1, parseInt(newDuration) || 1);
    setDurationDays(dur);
    if (enabled) {
      onChange({
        type: 'yearly',
        month,
        day,
        duration_days: dur
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">Seasonal Recurrence</span>
        </div>
        <Switch
          checked={enabled}
          onChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="pl-6 border-l-2 border-orange-200 space-y-4">
          {/* Month and Day */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-sm text-gray-600 mb-1">Day</label>
              <input
                type="number"
                min="1"
                max={maxDays}
                value={day}
                onChange={(e) => handleDayChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 text-center"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Duration (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => handleDurationChange(e.target.value)}
              disabled={disabled}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
            />
          </div>

          {/* Preview */}
          {nextActivation && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Calendar size={16} className="text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">
                    {formatRecurrenceRule(rule)}
                  </p>
                  <p className="text-orange-700 mt-1">
                    Next activation: {formatEndDate()}
                  </p>
                  {nextActivation.isActive && (
                    <Badge variant="green" size="sm" className="mt-2">
                      Currently Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              Campaign will automatically activate on this date each year and run for the specified duration.
              After the duration ends, it will pause until next year.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeasonalDatePicker;
