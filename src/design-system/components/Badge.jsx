/**
 * Badge Component
 *
 * Small status indicators and labels.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" dot>Pending</Badge>
 */

import { forwardRef } from 'react';

export const Badge = forwardRef(function Badge(
  {
    children,
    variant = 'default', // 'default' | 'success' | 'warning' | 'error' | 'info'
    size = 'md', // 'sm' | 'md' | 'lg'
    dot = false,
    icon,
    className = '',
    ...props
  },
  ref
) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2 h-2',
  };

  return (
    <span
      ref={ref}
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim()}
      {...props}
    >
      {dot && (
        <span
          className={`${dotSizes[size]} rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
});

/**
 * Status Badge - for online/offline indicators
 */
export const StatusBadge = forwardRef(function StatusBadge(
  {
    status = 'offline', // 'online' | 'offline' | 'busy' | 'away'
    label,
    showDot = true,
    className = '',
    ...props
  },
  ref
) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'Online' },
    offline: { color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100', label: 'Offline' },
    busy: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Busy' },
    away: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Away' },
  };

  const config = statusConfig[status] || statusConfig.offline;
  const displayLabel = label || config.label;

  return (
    <span
      ref={ref}
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5 text-xs font-medium rounded-full
        ${config.bg} ${config.text}
        ${className}
      `.trim()}
      {...props}
    >
      {showDot && (
        <span
          className={`w-2 h-2 rounded-full ${config.color}`}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
});

export default Badge;
