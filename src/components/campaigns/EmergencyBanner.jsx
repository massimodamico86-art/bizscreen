/**
 * Emergency Banner Component
 *
 * Displays a fixed top banner when an emergency is active.
 * Shows emergency content name, time remaining, and stop button.
 */

import { useEmergency } from '../../contexts/EmergencyContext';

/**
 * Calculate time remaining for emergency
 * @param {Date} startedAt - When emergency started
 * @param {number|null} durationMinutes - Duration in minutes
 * @returns {string} Human-readable time remaining
 */
function getTimeRemaining(startedAt, durationMinutes) {
  if (durationMinutes === null || durationMinutes === undefined) {
    return 'Until manually stopped';
  }

  const startTime = new Date(startedAt).getTime();
  const expiryTime = startTime + durationMinutes * 60 * 1000;
  const remaining = expiryTime - Date.now();

  if (remaining <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${mins}m remaining`;
}

/**
 * EmergencyBanner component
 * Renders a fixed top banner when emergency content is active
 */
export default function EmergencyBanner() {
  const { isActive, contentName, contentType, startedAt, durationMinutes, stopEmergency, stopping } = useEmergency();

  // Don't render if no active emergency
  if (!isActive) {
    return null;
  }

  const timeRemaining = getTimeRemaining(startedAt, durationMinutes);
  const contentLabel = contentName || `${contentType || 'Content'} (unnamed)`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2 shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Alert icon and status */}
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" aria-hidden="true" />
          <span className="font-bold text-sm uppercase tracking-wide">
            Emergency Active
          </span>
        </div>

        {/* Center: Content info and time */}
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:inline">
            Showing: <strong>{contentLabel}</strong>
          </span>
          <span className="text-red-200">
            {timeRemaining}
          </span>
        </div>

        {/* Right: Stop button */}
        <button
          onClick={stopEmergency}
          disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-md font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Stop emergency broadcast"
        >
          {stopping ? (
            <>
              <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Stopping...
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Stop Emergency
            </>
          )}
        </button>
      </div>
    </div>
  );
}
