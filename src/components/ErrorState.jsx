import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

/**
 * ErrorState - Consistent error UI with icon, message, and actionable CTAs.
 *
 * Use for API failures, empty error states, or any recoverable error display.
 * Compact mode available for inline use within cards/sections.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  icon: Icon = AlertTriangle,
  onRetry,
  onGoHome,
  retryLabel = 'Try Again',
  className = '',
  compact = false,
}) {
  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 px-4 ${className}`}>
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-600 text-center mb-3">{message}</p>
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
            >
              {retryLabel}
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors"
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">{message}</p>
      <div className="flex gap-3 items-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            {retryLabel}
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Go Home
          </button>
        )}
      </div>
      <a
        href="mailto:support@bizscreen.app"
        className="text-sm text-gray-500 underline mt-4 hover:text-gray-700 transition-colors"
      >
        Contact Support
      </a>
    </div>
  );
}

ErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  icon: PropTypes.elementType,
  onRetry: PropTypes.func,
  onGoHome: PropTypes.func,
  retryLabel: PropTypes.string,
  className: PropTypes.string,
  compact: PropTypes.bool,
};

export default ErrorState;
