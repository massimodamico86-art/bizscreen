/**
 * ViewingHeatmap Component
 *
 * Displays a 7x24 heatmap grid showing viewing patterns by day of week and hour.
 * Uses pure Tailwind CSS for styling (no external chart library needed).
 */

import { useMemo, useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Get color class based on intensity (0-1 scale)
 * Uses blue color scale per design system
 */
function getColorClass(value, maxValue) {
  if (value === 0 || maxValue === 0) return 'bg-gray-100';
  const intensity = value / maxValue;
  if (intensity > 0.75) return 'bg-blue-600';
  if (intensity > 0.5) return 'bg-blue-400';
  if (intensity > 0.25) return 'bg-blue-300';
  return 'bg-blue-200';
}

/**
 * Format hour for display (12h format)
 */
function formatHour(hour) {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function ViewingHeatmap({ data = [], metric = 'view_count', loading = false }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Reshape data into grid and find max value
  const { grid, maxValue } = useMemo(() => {
    // Initialize empty 7x24 grid
    const gridData = DAYS.map(() => HOURS.map(() => ({ views: 0, duration: 0 })));
    let max = 0;

    // Populate grid from data
    data.forEach((cell) => {
      const day = cell.day_of_week;
      const hour = cell.hour_of_day;
      if (day >= 0 && day <= 6 && hour >= 0 && hour <= 23) {
        const value = metric === 'duration' ? cell.total_duration_seconds : cell.view_count;
        gridData[day][hour] = {
          views: cell.view_count || 0,
          duration: cell.total_duration_seconds || 0,
        };
        if (value > max) max = value;
      }
    });

    return { grid: gridData, maxValue: max };
  }, [data, metric]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2">
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: 'auto repeat(24, minmax(14px, 1fr))' }}
        >
          {/* Header row - hours */}
          <div className="h-5" /> {/* Empty corner cell */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-5 text-[9px] text-gray-400 text-center flex items-end justify-center"
            >
              {hour % 4 === 0 ? formatHour(hour) : ''}
            </div>
          ))}

          {/* Data rows - one per day */}
          {DAYS.map((day, dayIndex) => (
            <>
              {/* Day label */}
              <div
                key={`label-${day}`}
                className="text-xs text-gray-500 pr-2 flex items-center justify-end"
              >
                {day}
              </div>
              {/* Hour cells for this day */}
              {grid[dayIndex].map((cell, hourIndex) => {
                const value = metric === 'duration' ? cell.duration : cell.views;
                const isHovered =
                  hoveredCell?.day === dayIndex && hoveredCell?.hour === hourIndex;

                return (
                  <div
                    key={`cell-${dayIndex}-${hourIndex}`}
                    className={`
                      h-5 rounded-sm cursor-pointer transition-all
                      ${getColorClass(value, maxValue)}
                      ${isHovered ? 'ring-2 ring-gray-400 ring-offset-1' : ''}
                    `}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour: hourIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="font-medium">
              {DAYS[hoveredCell.day]} {formatHour(hoveredCell.hour)}
            </p>
            <p className="text-gray-300">
              {grid[hoveredCell.day][hoveredCell.hour].views.toLocaleString()} views
            </p>
            <p className="text-gray-300">
              {Math.round(grid[hoveredCell.day][hoveredCell.hour].duration / 60)} min
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 bg-gray-100 rounded-sm" />
          <div className="w-3 h-3 bg-blue-200 rounded-sm" />
          <div className="w-3 h-3 bg-blue-300 rounded-sm" />
          <div className="w-3 h-3 bg-blue-400 rounded-sm" />
          <div className="w-3 h-3 bg-blue-600 rounded-sm" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default ViewingHeatmap;
