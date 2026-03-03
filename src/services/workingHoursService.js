/**
 * Working Hours Service
 *
 * Validation, time-check, and display utilities for per-screen working hours.
 * Working hours are stored as JSONB on tv_devices with keys '0'-'6' (Sun-Sat).
 *
 * @module services/workingHoursService
 */
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('WorkingHoursService');

/**
 * Day names indexed by day-of-week number (0=Sunday)
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Default working hours template.
 * Mon-Fri 08:00-18:00 enabled, Sat-Sun disabled.
 * Keys are strings '0'-'6' for JSON compatibility.
 */
export const DEFAULT_WORKING_HOURS = {
  '0': { enabled: false, start: '08:00', end: '18:00' }, // Sunday
  '1': { enabled: true, start: '08:00', end: '18:00' },  // Monday
  '2': { enabled: true, start: '08:00', end: '18:00' },  // Tuesday
  '3': { enabled: true, start: '08:00', end: '18:00' },  // Wednesday
  '4': { enabled: true, start: '08:00', end: '18:00' },  // Thursday
  '5': { enabled: true, start: '08:00', end: '18:00' },  // Friday
  '6': { enabled: false, start: '08:00', end: '18:00' }, // Saturday
};

/**
 * Validate the HH:MM time format
 * @param {string} time - Time string to validate
 * @returns {boolean}
 */
function isValidTimeFormat(time) {
  if (typeof time !== 'string') return false;
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Validate a working hours JSONB object.
 *
 * @param {Object} workingHours - The JSONB working hours object
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateWorkingHours(workingHours) {
  if (!workingHours || typeof workingHours !== 'object') {
    return { valid: false, error: 'Working hours must be an object' };
  }

  for (let day = 0; day <= 6; day++) {
    const key = String(day);
    const entry = workingHours[key];

    if (!entry) {
      return { valid: false, error: `Missing schedule for ${DAY_NAMES[day]} (key "${key}")` };
    }

    if (typeof entry.enabled !== 'boolean') {
      return { valid: false, error: `${DAY_NAMES[day]}: "enabled" must be a boolean` };
    }

    if (!isValidTimeFormat(entry.start)) {
      return { valid: false, error: `${DAY_NAMES[day]}: "start" must be in HH:MM format` };
    }

    if (!isValidTimeFormat(entry.end)) {
      return { valid: false, error: `${DAY_NAMES[day]}: "end" must be in HH:MM format` };
    }

    if (entry.enabled && entry.end <= entry.start) {
      return { valid: false, error: `${DAY_NAMES[day]}: end time must be after start time` };
    }
  }

  return { valid: true };
}

/**
 * Check if the current time falls within the configured working hours
 * for the given timezone.
 *
 * @param {Object|null} workingHours - JSONB working hours or null (always on)
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {boolean} True if within working hours or no hours configured
 */
export function isWithinWorkingHours(workingHours, timezone) {
  // null/undefined means always on
  if (!workingHours) return true;

  try {
    const tz = timezone || 'UTC';
    const now = new Date();

    // Get current day-of-week and time in the given timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });

    const dayStr = dayFormatter.format(now);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayStr];

    if (dayOfWeek === undefined) {
      logger.warn('Could not determine day of week', { dayStr, timezone: tz });
      return true; // Fail open
    }

    const schedule = workingHours[String(dayOfWeek)];
    if (!schedule) {
      logger.warn('No schedule entry for day', { dayOfWeek, timezone: tz });
      return true; // Fail open
    }

    if (!schedule.enabled) {
      return false;
    }

    // Get current time as HH:MM
    const timeStr = hourFormatter.format(now);
    // Intl might return "24:00" for midnight or have varying formats; normalize
    const currentTime = timeStr.replace(/\s/g, '').slice(0, 5);

    return currentTime >= schedule.start && currentTime < schedule.end;
  } catch (err) {
    logger.error('Error checking working hours', { error: err.message, timezone });
    return true; // Fail open on error
  }
}

/**
 * Format working hours for human-readable display.
 *
 * @param {Object|null} workingHours - JSONB working hours or null
 * @returns {string} Human-readable summary
 */
export function formatWorkingHoursForDisplay(workingHours) {
  if (!workingHours) return 'Always on';

  const enabledDays = [];
  for (let day = 0; day <= 6; day++) {
    const entry = workingHours[String(day)];
    if (entry?.enabled) {
      enabledDays.push({ day, start: entry.start, end: entry.end });
    }
  }

  if (enabledDays.length === 0) return 'Always off';
  if (enabledDays.length === 7) {
    // Check if all same hours
    const allSame = enabledDays.every(
      d => d.start === enabledDays[0].start && d.end === enabledDays[0].end
    );
    if (allSame) {
      return `Every day ${formatTime(enabledDays[0].start)} - ${formatTime(enabledDays[0].end)}`;
    }
  }

  // Check for Mon-Fri pattern with same hours
  const weekdayDays = enabledDays.filter(d => d.day >= 1 && d.day <= 5);
  const weekendDays = enabledDays.filter(d => d.day === 0 || d.day === 6);

  if (weekdayDays.length === 5 && weekendDays.length === 0) {
    const allSame = weekdayDays.every(
      d => d.start === weekdayDays[0].start && d.end === weekdayDays[0].end
    );
    if (allSame) {
      return `Mon-Fri ${formatTime(weekdayDays[0].start)} - ${formatTime(weekdayDays[0].end)}`;
    }
  }

  return 'Custom schedule';
}

/**
 * Format HH:MM time to 12-hour display (e.g., "8:00 AM")
 * @param {string} time - HH:MM time string
 * @returns {string}
 */
function formatTime(time) {
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${ampm}`;
}
