/**
 * DateDurationPicker Component
 *
 * Inline calendar with duration presets for schedule entry date range selection.
 * Implements SCHED-01 requirements: start date + duration approach.
 *
 * Uses @date-fns/tz TZDate for DST-safe date calculations.
 * All internal date operations use UTC timezone to ensure consistent
 * behavior. Display formatting respects the provided timezone prop.
 *
 * @example
 * <DateDurationPicker
 *   startDate={new Date()}
 *   endDate={null}
 *   startTime="09:00"
 *   endTime="17:00"
 *   onChange={({ startDate, endDate, startTime, endTime }) => {}}
 * />
 */

import { useState, useMemo, useCallback } from 'react';
import { TZDate } from '@date-fns/tz';
import {
  format,
  addDays,
  addMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  getDay,
  subMonths,
  addMonths as addMonthsFn
} from 'date-fns';

// Duration presets per CONTEXT.md decisions
const DURATION_PRESETS = [
  // Time-based
  { value: '1d', label: '1 day', days: 1 },
  { value: '3d', label: '3 days', days: 3 },
  { value: '1w', label: '1 week', days: 7 },
  { value: '2w', label: '2 weeks', days: 14 },
  { value: '1m', label: '1 month', months: 1 },
  // Use-case based
  { value: 'daily', label: 'Daily special', days: 1 },
  { value: 'weekend', label: 'Weekend only', special: 'weekend' },
  { value: 'this_week', label: 'This week', special: 'this_week' },
  { value: 'seasonal', label: 'Seasonal (30 days)', days: 30 },
  // Open-ended
  { value: 'forever', label: 'No end date', forever: true },
  // Custom
  { value: 'custom', label: 'Custom end date', custom: true }
];

export function DateDurationPicker({
  startDate = null,
  endDate = null,
  startTime = '09:00',
  endTime = '17:00',
  onChange,
  timezone = 'UTC',
  className = ''
}) {
  // Calendar navigation state
  const [viewMonth, setViewMonth] = useState(() => startDate || new Date());
  const [duration, setDuration] = useState(() => {
    if (!endDate) return 'forever';
    // Try to detect preset from dates
    if (startDate && endDate) {
      const daysDiff = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) return '1d';
      if (daysDiff === 3) return '3d';
      if (daysDiff === 7) return '1w';
      if (daysDiff === 14) return '2w';
      if (daysDiff === 30) return '1m';
    }
    return 'custom';
  });

  // Generate calendar days for current view month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [viewMonth]);

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    setViewMonth(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth(prev => addMonthsFn(prev, 1));
  }, []);

  // Calculate end date based on duration preset
  const calculateEndDate = useCallback((start, durationValue) => {
    if (!start) return null;
    // Use TZDate for DST-safe duration calculations
    const startDateObj = new TZDate(start, 'UTC');
    const preset = DURATION_PRESETS.find(p => p.value === durationValue);

    if (!preset) return null;
    if (preset.forever) return null;
    if (preset.custom) return endDate; // Keep existing end date for custom

    if (preset.days) {
      return addDays(startDateObj, preset.days - 1); // -1 because start day counts
    }
    if (preset.months) {
      return addDays(addMonths(startDateObj, preset.months), -1);
    }
    if (preset.special === 'weekend') {
      // Next Sunday from start
      const dayOfWeek = getDay(startDateObj);
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      return addDays(startDateObj, daysToSunday);
    }
    if (preset.special === 'this_week') {
      return endOfWeek(startDateObj, { weekStartsOn: 1 });
    }

    return null;
  }, [endDate]);

  // Handle start date selection from calendar
  const handleDayClick = useCallback((day) => {
    const newEndDate = calculateEndDate(day, duration);
    onChange?.({
      startDate: day,
      endDate: newEndDate,
      startTime,
      endTime
    });
  }, [duration, startTime, endTime, onChange, calculateEndDate]);

  // Handle duration preset change
  const handleDurationChange = useCallback((newDuration) => {
    setDuration(newDuration);
    if (startDate) {
      const newEndDate = calculateEndDate(startDate, newDuration);
      onChange?.({
        startDate,
        endDate: newEndDate,
        startTime,
        endTime
      });
    }
  }, [startDate, startTime, endTime, onChange, calculateEndDate]);

  // Handle custom end date selection
  const handleCustomEndDate = useCallback((e) => {
    const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
    onChange?.({
      startDate,
      endDate: date,
      startTime,
      endTime
    });
  }, [startDate, startTime, endTime, onChange]);

  // Handle time changes
  const handleStartTimeChange = useCallback((e) => {
    onChange?.({
      startDate,
      endDate,
      startTime: e.target.value,
      endTime
    });
  }, [startDate, endDate, endTime, onChange]);

  const handleEndTimeChange = useCallback((e) => {
    onChange?.({
      startDate,
      endDate,
      startTime,
      endTime: e.target.value
    });
  }, [startDate, endDate, startTime, onChange]);

  // Format date for display
  const formatDateDisplay = (date) => {
    if (!date) return 'No end date';
    return format(new Date(date), 'MMM d, yyyy');
  };

  // Format date for input value
  const formatDateInput = (date) => {
    if (!date) return '';
    return format(new Date(date), 'yyyy-MM-dd');
  };

  // Check if a day is in the selected range
  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return day >= start && day <= end;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="font-medium text-gray-900">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, viewMonth);
            const isSelected = startDate && isSameDay(day, new Date(startDate));
            const isEnd = endDate && isSameDay(day, new Date(endDate));
            const inRange = isInRange(day);
            const isTodayDate = isToday(day);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  w-8 h-8 text-sm rounded-full flex items-center justify-center
                  transition-colors relative
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${isSelected ? 'bg-[#f26f21] text-white font-medium' : ''}
                  ${isEnd && !isSelected ? 'bg-[#f26f21]/80 text-white' : ''}
                  ${inRange && !isSelected && !isEnd ? 'bg-[#f26f21]/10' : ''}
                  ${isTodayDate && !isSelected ? 'ring-1 ring-[#f26f21] ring-inset' : ''}
                  ${!isSelected && !isEnd && isCurrentMonth ? 'hover:bg-gray-100' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration presets */}
      <div className="px-4 py-3 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
          Duration
        </label>
        <select
          value={duration}
          onChange={(e) => handleDurationChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
        >
          <optgroup label="Time-based">
            {DURATION_PRESETS.filter(p => p.days && p.days <= 30 && !p.special).map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Use-case">
            {DURATION_PRESETS.filter(p => p.special || p.value === 'seasonal').map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other">
            <option value="forever">No end date</option>
            <option value="custom">Custom end date</option>
          </optgroup>
        </select>

        {/* Custom end date picker */}
        {duration === 'custom' && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={formatDateInput(endDate)}
                onChange={handleCustomEndDate}
                min={formatDateInput(startDate)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Time inputs */}
      <div className="px-4 py-3 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
          Time Range
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="time"
              value={startTime}
              onChange={handleStartTimeChange}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
            />
          </div>
          <span className="text-gray-400 text-sm">to</span>
          <div className="flex-1 relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="time"
              value={endTime}
              onChange={handleEndTimeChange}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Selected: </span>
          {startDate ? formatDateDisplay(startDate) : 'No start date'}
          {' - '}
          {formatDateDisplay(endDate)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Timezone: {timezone}
        </div>
      </div>
    </div>
  );
}

export default DateDurationPicker;
