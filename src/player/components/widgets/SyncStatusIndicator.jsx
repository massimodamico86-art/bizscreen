// src/player/components/widgets/SyncStatusIndicator.jsx
// Displays relative time since last data refresh as a subtle overlay on player widgets

import { useState, useEffect } from 'react';

/**
 * Compute relative time label from a timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time label
 */
function computeLabel(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * Position style mapping for corner placement
 */
const positionStyles = {
  'bottom-right': { bottom: '0.25rem', right: '0.25rem' },
  'bottom-left': { bottom: '0.25rem', left: '0.25rem' },
  'top-right': { top: '0.25rem', right: '0.25rem' },
  'top-left': { top: '0.25rem', left: '0.25rem' },
};

/**
 * SyncStatusIndicator - Subtle overlay showing last refresh time
 *
 * Designed for player screens: small, translucent, non-interactive.
 * Updates its label every 30 seconds to keep the relative time current.
 *
 * @param {Object} props
 * @param {number|null} props.lastRefreshedAt - Unix timestamp (ms) of last successful refresh
 * @param {string} [props.position='bottom-right'] - Corner position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 */
export function SyncStatusIndicator({ lastRefreshedAt, position = 'bottom-right' }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (lastRefreshedAt == null) {
      setLabel('');
      return;
    }

    // Compute immediately
    setLabel(computeLabel(lastRefreshedAt));

    // Update every 30 seconds
    const intervalId = setInterval(() => {
      setLabel(computeLabel(lastRefreshedAt));
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [lastRefreshedAt]);

  // Don't render until first computation
  if (!label) return null;

  const cornerStyle = positionStyles[position] || positionStyles['bottom-right'];

  return (
    <div
      style={{
        position: 'absolute',
        ...cornerStyle,
        fontSize: '0.5rem',
        color: 'rgba(255,255,255,0.4)',
        background: 'rgba(0,0,0,0.3)',
        padding: '0.1rem 0.3rem',
        borderRadius: '0.15rem',
        pointerEvents: 'none',
        zIndex: 10,
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  );
}

export default SyncStatusIndicator;
