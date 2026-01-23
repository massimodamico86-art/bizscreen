// src/player/components/widgets/DateWidget.jsx
// Date widget component extracted from Player.jsx SceneWidgetRenderer
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
 * Format date for display (e.g., "Thursday, January 23")
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * DateWidget - Displays current date with configurable styling
 *
 * @param {Object} props - Widget props
 * @param {string} props.textColor - Text color (default: '#ffffff')
 * @param {string} props.size - Size preset: 'small' | 'medium' | 'large' | 'custom' (default: 'medium')
 * @param {number} props.customFontSize - Custom font size in pixels (used when size='custom')
 */
export function DateWidget({ props = {} }) {
  const [time, setTime] = useState(new Date());

  // Update time every second (to catch day changes)
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
      fontWeight: '400',
    }}>
      {formatDate(time)}
    </div>
  );
}

export default DateWidget;
