/**
 * Conflict Warning Component (US-141, SCHED-03)
 *
 * Shows BLOCKING warnings when schedule entries conflict with existing entries.
 * - Blocks saving until conflict is resolved (cannot save with active conflicts)
 * - Red alert box with detailed conflict info
 * - Lists each conflicting entry with time range, content name, date overlap, and devices
 * - Provides resolution suggestions
 */

import { AlertTriangle, Clock, Monitor, Calendar } from 'lucide-react';
import { formatTime, formatDaysOfWeek } from '../../services/scheduleService';

/**
 * Format date for display (YYYY-MM-DD to readable format)
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * ConflictWarning - Blocking conflict display with device info
 *
 * @param {Array} conflicts - Array of conflict objects
 * @param {Function} onResolve - Optional callback for resolution actions (type, conflict)
 * @param {string} className - Additional CSS classes
 *
 * Note: Parent component should use conflicts.length > 0 to disable save button
 * This component does NOT have onDismiss - conflicts must be resolved, not dismissed
 */
export function ConflictWarning({
  conflicts = [],
  onResolve = null,
  className = ''
}) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      {/* Header - Blocking message */}
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800 text-sm">
            Cannot Save - Time Conflict Detected
          </h4>
          <p className="text-xs text-red-600 mt-0.5">
            This entry overlaps with {conflicts.length} existing {conflicts.length === 1 ? 'entry' : 'entries'}. Resolve {conflicts.length === 1 ? 'this conflict' : 'these conflicts'} to save.
          </p>
        </div>
      </div>

      {/* Conflict List */}
      <div className="mt-3 space-y-2">
        {conflicts.map((conflict, idx) => (
          <div
            key={conflict.id || idx}
            className="p-2 bg-white rounded border border-red-100"
          >
            <div className="flex items-center gap-2">
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

            {/* Date range overlap details */}
            {conflict.start_date && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                <Calendar size={12} className="shrink-0" />
                <span>
                  {formatDateDisplay(conflict.start_date)}
                  {conflict.end_date ? ` - ${formatDateDisplay(conflict.end_date)}` : ' (no end date)'}
                </span>
              </div>
            )}

            {/* Affected devices */}
            {conflict.devices && conflict.devices.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Monitor size={12} className="shrink-0" />
                <span>
                  {conflict.devices.length} affected device{conflict.devices.length !== 1 ? 's' : ''}:{' '}
                  {conflict.devices.map(d => d.device_name || d.name).join(', ')}
                </span>
              </div>
            )}

            {/* Resolution action */}
            {onResolve && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onResolve('adjust', conflict)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Adjust this entry
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resolution Suggestion */}
      <div className="mt-3 pt-3 border-t border-red-200">
        <p className="text-xs text-red-700">
          <strong>To resolve:</strong> Adjust the time range, dates, or days of week to avoid overlap with existing entries.
        </p>
      </div>
    </div>
  );
}

export default ConflictWarning;
