/**
 * DraggableTimeBlock Component
 *
 * Draggable and resizable time block for the week preview calendar grid.
 * Implements SCHED-04 requirements: drag-to-reschedule and resize-to-adjust-duration.
 *
 * Features:
 * - Drag-and-drop using @dnd-kit
 * - Resize handle for duration adjustment
 * - Content thumbnail display
 * - Priority badge integration
 *
 * @example
 * <DraggableTimeBlock
 *   entry={scheduleEntry}
 *   slotHeight={32}
 *   onResize={(entryId, newEndTime) => handleResize(entryId, newEndTime)}
 *   style={{ top: '64px', height: '64px' }}
 * />
 */

import { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PriorityBadge } from './PriorityBadge';

/**
 * Convert time string (HH:mm) to minutes from midnight
 */
function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
function minutesToTime(minutes) {
  const mins = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const hours = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  return `${String(hours).padStart(2, '0')}:${String(remainingMins).padStart(2, '0')}`;
}

/**
 * Format time for display (HH:mm to 12-hour format)
 */
function formatTimeShort(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes}${ampm}`;
}

/**
 * Get background color class based on event type
 */
function getBlockColor(eventType) {
  switch (eventType) {
    case 'screen_off':
      return 'bg-gray-200 border-gray-300 text-gray-700';
    default: // 'content'
      return 'bg-blue-100 border-blue-300 text-blue-900';
  }
}

export function DraggableTimeBlock({
  entry,
  slotHeight = 32, // Pixels per 30-min slot
  onResize = null,
  style = {},
  disabled = false,
  className = ''
}) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const originalEndTime = useRef(entry.end_time);

  // Setup draggable with @dnd-kit
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
    disabled: disabled || isResizing
  });

  // Calculate dynamic styles for drag transform
  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1000 : isResizing ? 999 : 1,
    ...style
  };

  // Handle resize start
  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!onResize || disabled) return;

    setIsResizing(true);
    resizeStartY.current = e.clientY;
    originalEndTime.current = entry.end_time;

    const handleResizeMove = (moveEvent) => {
      moveEvent.preventDefault();

      const deltaY = moveEvent.clientY - resizeStartY.current;
      // Each slot is 30 minutes, calculate delta in minutes
      const deltaMinutes = Math.round(deltaY / slotHeight) * 30;

      const originalEndMinutes = timeToMinutes(originalEndTime.current);
      const newEndMinutes = originalEndMinutes + deltaMinutes;

      // Minimum duration: 30 minutes, maximum: don't go past midnight
      const startMinutes = timeToMinutes(entry.start_time);
      const clampedEndMinutes = Math.max(startMinutes + 30, Math.min(24 * 60, newEndMinutes));

      const newEndTime = minutesToTime(clampedEndMinutes);
      onResize(entry.id, newEndTime);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [entry.id, entry.start_time, entry.end_time, onResize, slotHeight, disabled]);

  // Calculate display info
  const startTimeDisplay = formatTimeShort(entry.start_time);
  const endTimeDisplay = formatTimeShort(entry.end_time);
  const blockColor = getBlockColor(entry.event_type);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`
        absolute left-1 right-1 rounded border overflow-hidden
        ${blockColor}
        ${isDragging ? 'shadow-lg cursor-grabbing' : 'cursor-grab'}
        ${isResizing ? 'select-none' : ''}
        ${className}
      `.trim()}
      {...attributes}
      {...listeners}
    >
      {/* Content container */}
      <div className="p-1.5 h-full flex flex-col min-h-0 overflow-hidden">
        {/* Header row with thumbnail and name */}
        <div className="flex items-start gap-1.5 min-w-0">
          {/* Thumbnail */}
          {entry.thumbnail_url && (
            <img
              src={entry.thumbnail_url}
              alt=""
              className="w-8 h-8 object-cover rounded flex-shrink-0"
              draggable={false}
            />
          )}

          {/* Name and time info */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="font-medium text-xs truncate" title={entry.content_name}>
              {entry.content_name || 'Untitled'}
            </div>
            <div className="text-[10px] opacity-75 truncate">
              {startTimeDisplay} - {endTimeDisplay}
            </div>
          </div>
        </div>

        {/* Priority badge - show if there's room (entry is tall enough) */}
        {entry.priority != null && style.height && parseInt(style.height) > 48 && (
          <div className="mt-auto pt-1">
            <PriorityBadge priority={entry.priority} size="sm" />
          </div>
        )}
      </div>

      {/* Resize handle */}
      {onResize && !disabled && (
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-2
            cursor-ns-resize
            bg-blue-400/0 hover:bg-blue-400/30
            ${isResizing ? 'bg-blue-400/50' : ''}
            transition-colors
          `.trim()}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}
    </div>
  );
}

export default DraggableTimeBlock;
