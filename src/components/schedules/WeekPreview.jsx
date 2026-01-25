/**
 * Week Preview Component (US-142, SCHED-04)
 *
 * Interactive calendar grid showing what plays each day of the week.
 * Features:
 * - 7-day calendar grid with days as columns, time slots as rows
 * - Drag-to-reschedule: drag entry blocks to different day/time
 * - Resize-to-adjust-duration: drag bottom edge to change end time
 * - Content thumbnails in entry blocks
 * - Week navigation with previous/next buttons
 * - Filler content display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, useDroppable, DragOverlay } from '@dnd-kit/core';
import { TZDate } from '@date-fns/tz';
import { useLogger } from '../../hooks/useLogger.js';
import { ChevronLeft, ChevronRight, Calendar, Loader2, Film } from 'lucide-react';
import { getWeekPreview, formatTime, updateScheduleEntry } from '../../services/scheduleService';
import { DraggableTimeBlock } from './DraggableTimeBlock';

// Generate 30-minute time slots for 24 hours
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

// Slot height in pixels (h-8 = 32px)
const SLOT_HEIGHT = 32;

// Get Monday of the week containing the given date
function getWeekStart(date) {
  // Use TZDate for DST-safe week start calculation
  const d = new TZDate(date, 'UTC');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const result = new TZDate(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0, 'UTC');
  return result;
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

// Convert time string (HH:mm) to minutes from midnight
function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to time string (HH:mm)
function minutesToTime(minutes) {
  const mins = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const hours = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  return `${String(hours).padStart(2, '0')}:${String(remainingMins).padStart(2, '0')}`;
}

// Calculate absolute position for an entry based on time
function calculateEntryPosition(entry) {
  const startMinutes = timeToMinutes(entry.start_time);
  const endMinutes = timeToMinutes(entry.end_time);
  const duration = Math.max(30, endMinutes - startMinutes); // Minimum 30 min

  const top = (startMinutes / 30) * SLOT_HEIGHT;
  const height = (duration / 30) * SLOT_HEIGHT;

  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
  };
}

// Format time for time gutter (show hours only for full hours)
function formatTimeGutter(time) {
  const [hours, minutes] = time.split(':');
  if (minutes === '00') {
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12} ${ampm}`;
  }
  return '';
}

// Droppable slot component
function DroppableSlot({ id, date, time, isOver }) {
  const { setNodeRef } = useDroppable({
    id,
    data: { date, time }
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-8 border-b border-gray-100 ${isOver ? 'bg-blue-100' : ''}`}
      data-date={date}
      data-time={time}
    />
  );
}

export function WeekPreview({
  scheduleId,
  onDayClick = null,
  onEntryUpdate = null,
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
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  // Configure sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

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
  }, [scheduleId, weekStart, logger]);

  // Load data when scheduleId or weekStart changes
  useEffect(() => {
    loadWeekPreview();
  }, [loadWeekPreview]);

  // Navigation handlers
  const goToPreviousWeek = () => {
    const prevTime = weekStart.getTime() - 7 * 24 * 60 * 60 * 1000;
    setWeekStart(new TZDate(prevTime, 'UTC'));
  };

  const goToNextWeek = () => {
    const nextTime = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000;
    setWeekStart(new TZDate(nextTime, 'UTC'));
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new TZDate(Date.now(), 'UTC')));
  };

  // Check if current week is selected
  const isCurrentWeek = getWeekStart(new TZDate(Date.now(), 'UTC')).getTime() === weekStart.getTime();

  // Get the active entry being dragged
  const activeEntry = useMemo(() => {
    if (!activeId) return null;
    for (const day of weekData) {
      const entry = day.entries.find(e => e.id === activeId);
      if (entry) return entry;
    }
    return null;
  }, [activeId, weekData]);

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  // Handle drag over - track which slot we're over
  const handleDragOver = useCallback((event) => {
    setOverId(event.over?.id || null);
  }, []);

  // Handle drag end - update schedule entry
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const entry = active.data.current?.entry;
    if (!entry) return;

    const dropData = over.data.current;
    if (!dropData?.date || !dropData?.time) return;

    const { date: newDate, time: newStartTime } = dropData;

    // Calculate new end_time based on original duration
    const originalDuration = timeToMinutes(entry.end_time) - timeToMinutes(entry.start_time);
    const newStartMinutes = timeToMinutes(newStartTime);
    const newEndMinutes = Math.min(24 * 60, newStartMinutes + originalDuration);
    const newEndTime = minutesToTime(newEndMinutes);

    // Optimistic update
    setWeekData(prevData => {
      return prevData.map(day => {
        // Remove entry from its current day
        const filteredEntries = day.entries.filter(e => e.id !== entry.id);

        // If this is the new date, add the entry
        if (day.date === newDate) {
          const updatedEntry = {
            ...entry,
            start_time: newStartTime,
            end_time: newEndTime
          };
          return {
            ...day,
            entries: [...filteredEntries, updatedEntry].sort((a, b) =>
              (a.start_time || '').localeCompare(b.start_time || '')
            )
          };
        }

        return { ...day, entries: filteredEntries };
      });
    });

    // Persist to database
    try {
      await updateScheduleEntry(entry.id, {
        start_time: newStartTime,
        end_time: newEndTime,
        start_date: newDate
      });

      // Notify parent of update
      onEntryUpdate?.(entry.id, { start_time: newStartTime, end_time: newEndTime, start_date: newDate });

      // Refresh preview to get accurate data
      loadWeekPreview();
    } catch (err) {
      logger.error('Failed to update entry after drag', { err });
      // Revert by reloading
      loadWeekPreview();
    }
  }, [loadWeekPreview, onEntryUpdate, logger]);

  // Handle resize - update entry duration
  const handleResize = useCallback(async (entryId, newEndTime) => {
    // Optimistic update
    setWeekData(prevData => {
      return prevData.map(day => ({
        ...day,
        entries: day.entries.map(entry =>
          entry.id === entryId
            ? { ...entry, end_time: newEndTime }
            : entry
        )
      }));
    });

    // Persist to database
    try {
      await updateScheduleEntry(entryId, { end_time: newEndTime });

      // Notify parent of update
      onEntryUpdate?.(entryId, { end_time: newEndTime });
    } catch (err) {
      logger.error('Failed to resize entry', { err });
      // Revert by reloading
      loadWeekPreview();
    }
  }, [loadWeekPreview, onEntryUpdate, logger]);

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
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-auto max-h-[600px]">
            {/* Day Headers */}
            <div
              className="grid sticky top-0 z-20 bg-white border-b border-gray-200"
              style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
            >
              {/* Time column header */}
              <div className="p-2 border-r border-gray-200 bg-gray-50" />

              {/* Day column headers */}
              {weekData.map((day) => (
                <div
                  key={day.date}
                  className={`p-2 text-center border-r border-gray-100 ${
                    isToday(day.date) ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500">{day.dayShort}</div>
                  <div className={`text-sm font-semibold ${isToday(day.date) ? 'text-blue-700' : 'text-gray-700'}`}>
                    {new Date(day.date + 'T00:00:00').getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid with entries */}
            <div
              className="grid"
              style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
            >
              {/* Time gutter column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {TIME_SLOTS.map((time) => (
                  <div
                    key={time}
                    className="h-8 pr-2 text-right text-xs text-gray-400 flex items-start justify-end pt-0"
                  >
                    {formatTimeGutter(time)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekData.map((day) => (
                <div
                  key={day.date}
                  className={`relative border-r border-gray-100 ${
                    isToday(day.date) ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => !activeId && onDayClick?.(day.date)}
                >
                  {/* Droppable time slots */}
                  {TIME_SLOTS.map((time) => {
                    const slotId = `${day.date}-${time}`;
                    return (
                      <DroppableSlot
                        key={slotId}
                        id={slotId}
                        date={day.date}
                        time={time}
                        isOver={overId === slotId}
                      />
                    );
                  })}

                  {/* Positioned entries */}
                  {day.entries.map((entry) => (
                    <DraggableTimeBlock
                      key={entry.id}
                      entry={entry}
                      slotHeight={SLOT_HEIGHT}
                      style={calculateEntryPosition(entry)}
                      onResize={handleResize}
                    />
                  ))}

                  {/* Filler content indicator (shown at bottom if no entries) */}
                  {day.entries.length === 0 && day.filler && (
                    <div className="absolute bottom-2 left-1 right-1 p-1.5 rounded text-xs bg-gray-100 text-gray-500 border border-dashed border-gray-300">
                      <div className="flex items-center gap-1">
                        <Film size={10} />
                        <span className="truncate">{day.filler.name}</span>
                      </div>
                      <div className="text-[10px] opacity-75">Filler</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Drag overlay - shows entry being dragged */}
          <DragOverlay dropAnimation={null}>
            {activeEntry && (
              <div
                className="bg-blue-200 border border-blue-400 rounded p-1.5 shadow-lg opacity-90"
                style={{ width: '120px', height: '48px' }}
              >
                <div className="text-xs font-medium truncate">{activeEntry.content_name}</div>
                <div className="text-[10px] opacity-75">
                  {formatTime(activeEntry.start_time)} - {formatTime(activeEntry.end_time)}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
