/**
 * Shared formatting utilities for BizScreen
 */

/**
 * Format a date string to a human-readable format
 * @param {string} dateString - ISO date string
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-';

  const {
    includeTime = true,
    shortMonth = true
  } = options;

  const formatOptions = {
    month: shortMonth ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric'
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return new Date(dateString).toLocaleDateString('en-US', formatOptions);
}

/**
 * Format a date to relative time (e.g., "2 minutes ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString, { includeTime: false });
  }
}

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format time for schedule display (e.g., "9:00 AM")
 * @param {string} timeString - Time in HH:mm:ss format
 * @returns {string} Formatted time
 */
export function formatTime(timeString) {
  if (!timeString) return 'All day';

  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format time range for display
 * @param {string} startTime - Start time in HH:mm:ss format
 * @param {string} endTime - End time in HH:mm:ss format
 * @returns {string} Formatted time range
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return 'All day';
  if (!startTime) return `Until ${formatTime(endTime)}`;
  if (!endTime) return `From ${formatTime(startTime)}`;
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Days of week constants for schedule handling
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' }
];

/**
 * Format days of week array to display string
 * @param {number[]} daysArray - Array of day numbers (0-6)
 * @returns {string} Formatted days string
 */
export function formatDaysOfWeek(daysArray) {
  if (!daysArray || daysArray.length === 0) return 'No days';
  if (daysArray.length === 7) return 'Every day';

  const sortedDays = [...daysArray].sort((a, b) => a - b);

  // Check for weekdays (Mon-Fri)
  if (sortedDays.length === 5 &&
      sortedDays.every(d => d >= 1 && d <= 5)) {
    return 'Weekdays';
  }

  // Check for weekends (Sat-Sun)
  if (sortedDays.length === 2 &&
      sortedDays.includes(0) && sortedDays.includes(6)) {
    return 'Weekends';
  }

  // Return abbreviated day names
  return sortedDays.map(day =>
    DAYS_OF_WEEK.find(d => d.value === day)?.short || day
  ).join(', ');
}
