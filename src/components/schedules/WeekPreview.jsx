/**
 * Week Preview Component (US-142)
 *
 * Calendar grid showing what plays each day of the week.
 * - 7-column grid with day headers
 * - Each day cell shows stacked content blocks with times
 * - Color coding: content entries (blue), filler content (gray dashed)
 * - Week navigation with previous/next buttons
 */

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { ChevronLeft, ChevronRight, Calendar, Loader2, Film } from 'lucide-react';
import { getWeekPreview, formatTime } from '../../services/scheduleService';

// Get Monday of the week containing the given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date for display
function formatWeekRange(startDate) {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startMonth} - ${endMonth}`;
}

// Check if date is today
function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

export function WeekPreview({
  scheduleId,
  onDayClick = null,
  className = '',
  collapsible = true,
  defaultCollapsed = false
}) {
  const logger = useLogger('WeekPreview');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekData, setWeekData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [error, setError] = useState(null);

  // Load week preview data
  const loadWeekPreview = useCallback(async () => {
    if (!scheduleId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getWeekPreview(scheduleId, weekStart.toISOString().split('T')[0]);
      setWeekData(data);
    } catch (err) {
      logger.error('Failed to load week preview', { err });
      setError(err.message);
      setWeekData([]);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId, weekStart]);

  // Load data when scheduleId or weekStart changes
  useEffect(() => {
    loadWeekPreview();
  }, [loadWeekPreview]);

  // Navigation handlers
  const goToPreviousWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  // Check if current week is selected
  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  if (isCollapsed && collapsible) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className={`w-full flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 text-sm transition-colors ${className}`}
      >
        <Calendar size={16} />
        <span>Show Week Preview</span>
        <ChevronRight size={16} className="ml-auto" />
      </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Week Preview</span>
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
              title="Collapse"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Previous week"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-sm text-gray-600 min-w-[140px] text-center">
            {formatWeekRange(weekStart)}
          </span>

          <button
            type="button"
            onClick={goToNextWeek}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Next week"
          >
            <ChevronRight size={16} />
          </button>

          {!isCurrentWeek && (
            <button
              type="button"
              onClick={goToCurrentWeek}
              className="ml-2 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 text-center text-red-600 text-sm">
          Failed to load preview: {error}
        </div>
      )}

      {/* Week Grid */}
      {!isLoading && !error && weekData.length > 0 && (
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {weekData.map((day) => (
            <div
              key={day.date}
              className={`min-h-[120px] ${isToday(day.date) ? 'bg-blue-50' : ''}`}
            >
              {/* Day Header */}
              <div
                className={`p-2 text-center border-b border-gray-100 ${
                  isToday(day.date) ? 'bg-blue-100' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium text-gray-500">{day.dayShort}</div>
                <div className={`text-sm font-semibold ${isToday(day.date) ? 'text-blue-700' : 'text-gray-700'}`}>
                  {new Date(day.date + 'T00:00:00').getDate()}
                </div>
              </div>

              {/* Day Content */}
              <div
                className={`p-1.5 space-y-1 ${onDayClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => onDayClick?.(day.date)}
              >
                {/* Scheduled Entries */}
                {day.entries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className={`p-1.5 rounded text-xs ${
                      entry.event_type === 'screen_off'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <div className="font-medium truncate">{entry.content_name}</div>
                    <div className="text-[10px] opacity-75">
                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                    </div>
                  </div>
                ))}

                {/* Filler Content */}
                {day.filler && (
                  <div className="p-1.5 rounded text-xs bg-gray-100 text-gray-500 border border-dashed border-gray-300">
                    <div className="flex items-center gap-1">
                      <Film size={10} />
                      <span className="truncate">{day.filler.name}</span>
                    </div>
                    <div className="text-[10px] opacity-75">Filler</div>
                  </div>
                )}

                {/* Empty State */}
                {day.entries.length === 0 && !day.filler && (
                  <div className="text-center text-gray-400 text-xs py-2">
                    No content
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && weekData.length === 0 && (
        <div className="p-8 text-center text-gray-400 text-sm">
          No schedule data available
        </div>
      )}
    </div>
  );
}

export default WeekPreview;
