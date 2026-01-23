// src/player/components/widgets/ClockWidget.jsx
// Clock widget component extracted from Player.jsx SceneWidgetRenderer
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
 * Format time for display (12-hour format with AM/PM)
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * ClockWidget - Displays current time with configurable styling
 *
 * @param {Object} props - Widget props
 * @param {string} props.textColor - Text color (default: '#ffffff')
 * @param {string} props.size - Size preset: 'small' | 'medium' | 'large' | 'custom' (default: 'medium')
 * @param {number} props.customFontSize - Custom font size in pixels (used when size='custom')
 */
export function ClockWidget({ props = {} }) {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const textColor = props.textColor || '#ffffff';
  const size = props.size || 'medium';
  const customFontSize = props.customFontSize;

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
      fontWeight: '300',
    }}>
      {formatTime(time)}
    </div>
  );
}

export default ClockWidget;
