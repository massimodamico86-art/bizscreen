/**
 * Alert Component
 *
 * Contextual feedback messages for user actions.
 *
 * @example
 * <Alert variant="success" title="Success!">Your changes have been saved.</Alert>
 * <Alert variant="error" dismissible onDismiss={handleDismiss}>An error occurred.</Alert>
 */

import { forwardRef } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Alert = forwardRef(function Alert(
  {
    children,
    variant = 'info', // 'info' | 'success' | 'warning' | 'error'
    title,
    icon: customIcon,
    dismissible = false,
    onDismiss,
    actions,
    className = '',
    ...props
  },
  ref
) {
  const variantStyles = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-500',
      title: 'text-blue-800',
      dismiss: 'text-blue-500 hover:bg-blue-100',
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: 'text-green-500',
      title: 'text-green-800',
      dismiss: 'text-green-500 hover:bg-green-100',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: 'text-amber-500',
      title: 'text-amber-800',
      dismiss: 'text-amber-500 hover:bg-amber-100',
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-500',
      title: 'text-red-800',
      dismiss: 'text-red-500 hover:bg-red-100',
    },
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const styles = variantStyles[variant];
  const Icon = customIcon || icons[variant];

  return (
    <div
      ref={ref}
      role="alert"
      className={`
        relative flex gap-3 p-4
        border rounded-lg
        ${styles.container}
        ${className}
      `.trim()}
      {...props}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-medium ${styles.title}`}>
            {title}
          </h4>
        )}
        {children && (
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        )}
        {actions && (
          <div className="mt-3 flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={onDismiss}
          className={`
            flex-shrink-0 p-1 rounded
            transition-colors duration-100
            ${styles.dismiss}
          `.trim()}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

/**
 * Banner - full-width alert for page-level messages
 */
export const Banner = forwardRef(function Banner(
  {
    children,
    variant = 'info',
    dismissible = false,
    onDismiss,
    action,
    className = '',
    ...props
  },
  ref
) {
  const variantStyles = {
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-red-600 text-white',
    neutral: 'bg-gray-900 text-white',
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={`
        relative py-2.5 px-4
        ${variantStyles[variant]}
        ${className}
      `.trim()}
      {...props}
    >
      <div className="flex items-center justify-center gap-4 text-sm">
        <span className="text-center">{children}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="
              font-medium underline underline-offset-2
              hover:no-underline
              transition-all duration-100
            "
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            p-1.5 rounded-lg
            hover:bg-white/10
            transition-colors duration-100
          "
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

export default Alert;
