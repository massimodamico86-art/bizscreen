/**
 * Error Tracking with Sentry Integration
 *
 * Pluggable error tracking that supports multiple providers:
 * - console (default, logs to console)
 * - sentry (Sentry.io integration)
 *
 * Configure via VITE_ERROR_TRACKING_PROVIDER env var.
 * Set VITE_SENTRY_DSN for Sentry integration.
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { config, isProduction, isLocal } from '../config/env';
import { logError } from './logger';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('errorTracking');

// Error tracking providers
const providers = {
  /**
   * Console provider - logs errors to console
   */
  console: {
    init() {
      // No initialization needed
    },
    captureException(error, context = {}) {
      logger.error('Exception', { error, context });
    },
    captureMessage(message, level = 'error', context = {}) {
      const logMethod = level === 'warning' ? logger.warn : logger.error;
      logMethod(message, context);
    },
    setUser(user) {
      logger.debug('User set', { userId: user?.id || 'anonymous' });
    },
    setContext(name, context) {
      logger.debug('Context set', { name, context });
    },
    addBreadcrumb(breadcrumb) {
      if (!isProduction()) {
        logger.debug('Breadcrumb', breadcrumb);
      }
    },
    startTransaction(name, op) {
      return { finish: () => {} };
    }
  },

  /**
   * Sentry provider - full Sentry integration
   */
  sentry: {
    init() {
      const dsn = import.meta.env.VITE_SENTRY_DSN;

      if (!dsn) {
        console.warn('[ErrorTracking] Sentry DSN not configured. Set VITE_SENTRY_DSN.');
        return false;
      }

      try {
        Sentry.init({
          dsn,
          environment: config().env || 'development',
          release: import.meta.env.VITE_APP_VERSION || '1.0.0',

          // Performance Monitoring
          tracesSampleRate: isProduction() ? 0.1 : 1.0,

          // Session Replay for debugging (only in production)
          replaysSessionSampleRate: isProduction() ? 0.1 : 0,
          replaysOnErrorSampleRate: isProduction() ? 1.0 : 0,

          // Filter out non-actionable errors
          ignoreErrors: [
            // Network errors
            'Network Error',
            'Failed to fetch',
            'NetworkError',
            'Load failed',
            // Browser extensions
            /^chrome-extension:\/\//,
            /^moz-extension:\/\//,
            // User aborts
            'AbortError',
            'The operation was aborted',
            // Resize observer
            'ResizeObserver loop',
          ],

          // Don't send in development unless explicitly enabled
          enabled: isProduction() || import.meta.env.VITE_SENTRY_DEBUG === 'true',

          // Attach stack trace to all messages
          attachStacktrace: true,

          // Custom tags
          initialScope: {
            tags: {
              app: 'bizscreen',
              platform: 'web',
            },
          },

          // Before sending, sanitize sensitive data
          beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
              delete event.request.headers['Authorization'];
              delete event.request.headers['Cookie'];
            }

            // Scrub potential PII from error messages
            if (event.message) {
              event.message = event.message.replace(
                /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                '[EMAIL_REDACTED]'
              );
            }

            return event;
          },

          // Integrations
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ],
        });

        logger.info('Sentry initialized');
        return true;
      } catch (error) {
        // Keep console.warn here as fallback when logging itself might fail
        console.warn('[ErrorTracking] Sentry initialization failed:', error);
        return false;
      }
    },

    captureException(error, context = {}) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    },

    captureMessage(message, level = 'error', context = {}) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureMessage(message, level);
      });
    },

    setUser(user) {
      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.full_name,
        });
      } else {
        Sentry.setUser(null);
      }
    },

    setContext(name, context) {
      Sentry.setContext(name, context);
    },

    addBreadcrumb(breadcrumb) {
      Sentry.addBreadcrumb({
        category: breadcrumb.category,
        message: breadcrumb.message,
        data: breadcrumb.data,
        level: breadcrumb.level || 'info',
        timestamp: breadcrumb.timestamp || Date.now() / 1000,
      });
    },

    startTransaction(name, op) {
      return Sentry.startInactiveSpan({ name, op });
    }
  }
};

// Active provider instance
let activeProvider = null;
let initialized = false;

/**
 * Initialize error tracking
 */
export function initErrorTracking() {
  if (initialized) return activeProvider;

  const providerName = import.meta.env.VITE_ERROR_TRACKING_PROVIDER || 'console';

  // Default to sentry if DSN is provided
  const effectiveProvider = import.meta.env.VITE_SENTRY_DSN && providerName !== 'console'
    ? 'sentry'
    : providerName;

  activeProvider = providers[effectiveProvider] || providers.console;

  try {
    const success = activeProvider.init();
    if (success === false && effectiveProvider === 'sentry') {
      // Fall back to console if Sentry fails
      activeProvider = providers.console;
    }
  } catch (error) {
    // Keep console.warn here as fallback when logging itself might fail
    console.warn('[ErrorTracking] Failed to initialize:', error);
    activeProvider = providers.console;
  }

  // Set up global error handlers
  setupGlobalErrorHandlers();

  initialized = true;
  return activeProvider;
}

/**
 * Set up global error handlers
 */
function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason || new Error('Unhandled promise rejection'), {
      type: 'unhandledrejection'
    });
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Ignore cross-origin script errors
    if (event.message === 'Script error.') {
      return;
    }

    captureException(event.error || new Error(event.message), {
      type: 'globalError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}

/**
 * Get active provider (initialize if needed)
 */
function getProvider() {
  if (!initialized) {
    initErrorTracking();
  }
  return activeProvider;
}

/**
 * Capture an exception/error
 */
export function captureException(error, context = {}) {
  // Also log to our logger
  logError(error, context);

  // Send to error tracking provider
  getProvider().captureException(error, context);
}

/**
 * Capture a message
 */
export function captureMessage(message, level = 'error', context = {}) {
  getProvider().captureMessage(message, level, context);
}

/**
 * Set user context for error reports
 */
export function setUser(user) {
  if (user) {
    getProvider().setUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name || user.user_metadata?.full_name,
      role: user.role || user.user_metadata?.role
    });
  } else {
    getProvider().setUser(null);
  }
}

/**
 * Set additional context for error reports
 */
export function setContext(name, context) {
  getProvider().setContext(name, context);
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(category, message, data = {}, level = 'info') {
  getProvider().addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name, op = 'custom') {
  return getProvider().startTransaction(name, op);
}

/**
 * Wrap a function with error tracking
 */
export function withErrorTracking(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, context);
      throw error;
    }
  };
}

/**
 * React Error Boundary helper
 * Use with React's componentDidCatch or ErrorBoundary
 */
export function handleReactError(error, errorInfo) {
  captureException(error, {
    componentStack: errorInfo?.componentStack,
    type: 'react_error_boundary'
  });
}

/**
 * Create an error boundary wrapper component
 */
export function createErrorBoundary(FallbackComponent) {
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      handleReactError(error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return FallbackComponent
          ? <FallbackComponent error={this.state.error} />
          : <div>Something went wrong.</div>;
      }
      return this.props.children;
    }
  };
}

/**
 * Sentry Error Boundary component wrapper
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Sentry profiler for React components
 */
export const withProfiler = Sentry.withProfiler;

export default {
  init: initErrorTracking,
  captureException,
  captureMessage,
  setUser,
  setContext,
  addBreadcrumb,
  startTransaction,
  withErrorTracking,
  handleReactError,
  SentryErrorBoundary,
  withProfiler
};
