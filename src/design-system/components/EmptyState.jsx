/**
 * EmptyState Component
 *
 * For displaying when there's no content to show.
 *
 * @example
 * <EmptyState
 *   icon={<Inbox />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Send a message</Button>}
 * />
 */

import { forwardRef } from 'react';

export const EmptyState = forwardRef(function EmptyState(
  {
    icon,
    title,
    description,
    action,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    ...props
  },
  ref
) {
  const sizeStyles = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      ref={ref}
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `.trim()}
      {...props}
    >
      {icon && (
        <div className={`${styles.icon} text-gray-300 mb-4`}>
          {icon}
        </div>
      )}
      {title && (
        <h3 className={`font-semibold text-gray-900 ${styles.title}`}>
          {title}
        </h3>
      )}
      {description && (
        <p className={`text-gray-500 mt-1 max-w-sm ${styles.description}`}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
});

/**
 * Placeholder - loading state for empty areas
 */
export const Placeholder = forwardRef(function Placeholder(
  {
    lines = 3,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`space-y-3 animate-pulse ${className}`}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
});

export default EmptyState;
