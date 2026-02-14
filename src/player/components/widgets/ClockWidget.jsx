// src/player/components/widgets/ClockWidget.jsx
// Clock widget component with timezone awareness, format options, and analog style
import { useState, useEffect } from 'react';

// Size mappings for clock display
const sizeMap = {
  small: 'clamp(0.8rem, 3vw, 1.5rem)',
  medium: 'clamp(1rem, 5vw, 3rem)',
  large: 'clamp(1.5rem, 8vw, 5rem)',
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
 * Extract numeric hour/minute/second from a Date using Intl for a specific timezone.
 * Used for analog clock hand positioning.
 */
function getTimeComponents(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'second') second = parseInt(part.value, 10);
  }
  // Intl hour12:false returns 24 for midnight in some locales -- normalize
  if (hour === 24) hour = 0;
  return { hour, minute, second };
}

/**
 * AnalogClock - SVG-based analog clock face
 */
function AnalogClock({ hours, minutes, seconds, showSeconds, accentColor }) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = (minutes + (seconds || 0) / 60) * 6;
  const secondAngle = (seconds || 0) * 6;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      {/* Clock face */}
      <circle cx="50" cy="50" r="48" fill="none" stroke={accentColor} strokeWidth="1" />
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = i * 30;
        const rad = ((angle - 90) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + 40 * Math.cos(rad)}
            y1={50 + 40 * Math.sin(rad)}
            x2={50 + 45 * Math.cos(rad)}
            y2={50 + 45 * Math.sin(rad)}
            stroke={accentColor}
            strokeWidth={i % 3 === 0 ? 2 : 1}
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="50"
        y1="50"
        x2={50 + 25 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
        y2={50 + 25 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
        stroke={accentColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="50"
        y1="50"
        x2={50 + 35 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
        y2={50 + 35 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Second hand (optional) */}
      {showSeconds && (
        <line
          x1="50"
          y1="50"
          x2={50 + 38 * Math.cos(((secondAngle - 90) * Math.PI) / 180)}
          y2={50 + 38 * Math.sin(((secondAngle - 90) * Math.PI) / 180)}
          stroke="#ef4444"
          strokeWidth="1"
          strokeLinecap="round"
        />
      )}
      {/* Center dot */}
      <circle cx="50" cy="50" r="2" fill={accentColor} />
    </svg>
  );
}

/**
 * ClockWidget - Displays current time with timezone awareness, format options,
 * and digital/analog styles.
 *
 * @param {Object} props - Widget props
 * @param {string} props.textColor - Text color (default: '#ffffff')
 * @param {string} props.format - '12h' or '24h' (default: '12h')
 * @param {boolean} props.showSeconds - Show seconds (default: false)
 * @param {string} props.timezone - Widget-level timezone override, 'screen' = use screen timezone
 * @param {string} props.style - 'digital' or 'analog' (default: 'digital')
 * @param {string} props.accentColor - Accent color for analog clock (default: '#3b82f6')
 * @param {string} props.size - Size preset: 'small' | 'medium' | 'large' | 'custom'
 * @param {number} props.customFontSize - Custom font size in pixels
 * @param {string} timezone - Screen's assigned timezone (passed by parent renderer)
 */
export function ClockWidget({ props = {}, timezone }) {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const textColor = props.textColor || '#ffffff';
  const format = props.format || '12h';
  const showSeconds = props.showSeconds || false;
  const style = props.style || 'digital';
  const accentColor = props.accentColor || '#3b82f6';
  const size = props.size || 'medium';
  const customFontSize = props.customFontSize;

  const resolvedTz = resolveTimezone(props.timezone, timezone);

  if (style === 'analog') {
    const { hour, minute, second } = getTimeComponents(time, resolvedTz);
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnalogClock
          hours={hour}
          minutes={minute}
          seconds={second}
          showSeconds={showSeconds}
          accentColor={accentColor}
        />
      </div>
    );
  }

  // Digital style
  const hour12 = format === '12h';
  const options = {
    timeZone: resolvedTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  };
  if (showSeconds) {
    options.second = '2-digit';
  }
  const timeString = time.toLocaleTimeString('en-US', options);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
        fontFamily: 'system-ui, sans-serif',
        fontSize: getFontSize(size, customFontSize),
        fontWeight: '300',
      }}
    >
      {timeString}
    </div>
  );
}

export default ClockWidget;
