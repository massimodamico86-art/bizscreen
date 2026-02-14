// src/player/components/widgets/DateWidget.jsx
// Date widget component with timezone awareness and format options
import { useState, useEffect } from 'react';

// Size mappings for date display
const sizeMap = {
  small: 'clamp(0.6rem, 1.5vw, 1rem)',
  medium: 'clamp(0.75rem, 2vw, 1.5rem)',
  large: 'clamp(1rem, 3vw, 2rem)',
};

/**
 * Get font size based on size setting or custom value
 */
function getFontSize(size, customFontSize) {
  if (size === 'custom' && customFontSize) {
    return `${customFontSize}px`;
  }
  return sizeMap[size] || sizeMap.medium;
}

/**
 * Resolve which timezone to use for formatting.
 * Priority: widget-level override > screen-assigned timezone > browser fallback.
 *
 * @param {string} widgetTimezone - Widget's configured timezone (from props.timezone)
 * @param {string} screenTimezone - Screen's assigned timezone (from parent component)
 * @returns {string} IANA timezone string
 */
function resolveTimezone(widgetTimezone, screenTimezone) {
  if (widgetTimezone && widgetTimezone !== 'screen') {
    return widgetTimezone;
  }
  if (screenTimezone) {
    return screenTimezone;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get Intl.DateTimeFormat options for the given format preset.
 *
 * @param {string} format - 'long' | 'short' | 'numeric'
 * @param {string} timeZone - Resolved IANA timezone
 * @returns {Object} Intl.DateTimeFormat options
 */
function getDateFormatOptions(format, timeZone) {
  switch (format) {
    case 'short':
      return { month: 'short', day: 'numeric', year: 'numeric', timeZone };
    case 'numeric':
      return { month: 'numeric', day: 'numeric', year: 'numeric', timeZone };
    case 'long':
    default:
      return { weekday: 'long', month: 'long', day: 'numeric', timeZone };
  }
}

/**
 * DateWidget - Displays current date with timezone awareness and configurable format.
 *
 * @param {Object} props - Widget props
 * @param {string} props.textColor - Text color (default: '#ffffff')
 * @param {string} props.format - 'long' | 'short' | 'numeric' (default: 'long')
 * @param {string} props.timezone - Widget-level timezone override, 'screen' = use screen timezone
 * @param {string} props.size - Size preset: 'small' | 'medium' | 'large' | 'custom'
 * @param {number} props.customFontSize - Custom font size in pixels
 * @param {string} timezone - Screen's assigned timezone (passed by parent renderer)
 */
export function DateWidget({ props = {}, timezone }) {
  const [time, setTime] = useState(new Date());

  // Update every 60 seconds -- date changes are not time-sensitive
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const textColor = props.textColor || '#ffffff';
  const format = props.format || 'long';
  const size = props.size || 'medium';
  const customFontSize = props.customFontSize;

  const resolvedTz = resolveTimezone(props.timezone, timezone);
  const dateOptions = getDateFormatOptions(format, resolvedTz);
  const dateString = time.toLocaleDateString('en-US', dateOptions);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      fontSize: getFontSize(size, customFontSize),
      fontWeight: '400',
    }}>
      {dateString}
    </div>
  );
}

export default DateWidget;
