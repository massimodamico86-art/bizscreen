/**
 * Conflict Warning Component (US-141)
 *
 * Shows clear warnings when schedule entries conflict with existing entries.
 * - Red alert box with conflict details
 * - Lists each conflicting entry with time range and content name
 * - Provides resolution suggestions
 */

import { AlertTriangle, Clock, X } from 'lucide-react';
import { formatTime, formatDaysOfWeek } from '../../services/scheduleService';

export function ConflictWarning({
  conflicts = [],
  onDismiss = null,
  className = ''
}) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800 text-sm">
            Time Conflict Detected
          </h4>
          <p className="text-xs text-red-600 mt-0.5">
            This entry overlaps with {conflicts.length} existing {conflicts.length === 1 ? 'entry' : 'entries'}.
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Conflict List */}
      <div className="mt-3 space-y-2">
        {conflicts.map((conflict, idx) => (
          <div
            key={conflict.id || idx}
            className="flex items-center gap-2 p-2 bg-white rounded border border-red-100"
          >
            <Clock size={14} className="text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {conflict.content_name || 'Unknown content'}
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(conflict.start_time)} - {formatTime(conflict.end_time)}
                {conflict.days_of_week && (
                  <span className="ml-1">
                    ({formatDaysOfWeek(conflict.days_of_week)})
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-red-500 px-1.5 py-0.5 bg-red-50 rounded">
              {conflict.content_type}
            </span>
          </div>
        ))}
      </div>

      {/* Resolution Suggestion */}
      <div className="mt-3 pt-3 border-t border-red-200">
        <p className="text-xs text-red-700">
          <strong>To resolve:</strong> Adjust the time range or days of week to avoid overlap with existing entries.
        </p>
      </div>
    </div>
  );
}

export default ConflictWarning;
