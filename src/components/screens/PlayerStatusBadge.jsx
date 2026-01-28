/**
 * PlayerStatusBadge.jsx
 * Yodeck-style player status badge component for the Screens page.
 * Shows registration and connection status in a pill badge format.
 */


/**
 * Status configuration for different player states
 * Colors matched to Yodeck:
 * - online: --color-background-positive (green #1bb783)
 * - offline: --color-background-negative (red #d35954)
 * - not_registered: --color-border-hover (neutral gray)
 */
const STATUS_CONFIG = {
  online: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500', // Yodeck green ~#1bb783
    label: 'Online',
  },
  offline: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500', // Yodeck red ~#d35954
    label: 'Offline',
  },
  unregistered: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
    label: 'Not registered yet',
  },
  connecting: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Connecting...',
  },
  deactivated: {
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    dot: 'bg-gray-300', // --color-content-disabled
    label: 'Deactivated',
  },
};

/**
 * PlayerStatusBadge - Yodeck-style status badge
 *
 * @param {Object} props
 * @param {'online' | 'offline' | 'unregistered' | 'connecting'} props.status - Player status
 * @param {boolean} [props.showIcon=false] - Whether to show status icon
 * @param {string} [props.className] - Additional CSS classes
 */
export function PlayerStatusBadge({ status = 'unregistered', showIcon = false, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unregistered;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[30px] text-xs font-medium
        ${config.bg} ${config.text} ${className}
      `.trim()}
    >
      {showIcon ? (
        status === 'online' ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )
      ) : (
        <span className={`w-3 h-3 rounded-full ${config.dot}`} />
      )}
      {config.label}
    </span>
  );
}

/**
 * Get display status from screen data
 *
 * @param {Object} screen - Screen object with last_seen and device_info
 * @returns {'online' | 'offline' | 'unregistered'}
 */
export function getPlayerStatus(screen) {
  if (!screen) return 'unregistered';

  // Check if device has ever connected
  if (!screen.last_seen && !screen.device_info) {
    return 'unregistered';
  }

  // Check if online (seen in last 5 minutes)
  if (screen.last_seen) {
    const lastSeen = new Date(screen.last_seen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (lastSeen > fiveMinutesAgo) {
      return 'online';
    }
  }

  return 'offline';
}

export default PlayerStatusBadge;
