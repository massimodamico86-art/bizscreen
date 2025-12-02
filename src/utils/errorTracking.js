/**
 * Error Tracking Abstraction
 *
 * Pluggable error tracking that supports multiple providers:
 * - console (default, logs to console)
 * - sentry (Sentry.io integration)
 *
 * Configure via VITE_ERROR_TRACKING_PROVIDER env var.
 */

import React from 'react';
import { config, isProduction, isLocal } from '../config/env';
import { logError } from './logger';

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
      console.error('[ErrorTracking] Exception:', error);
      if (Object.keys(context).length > 0) {
        console.error('[ErrorTracking] Context:', context);
      }
    },
    captureMessage(message, level = 'error', context = {}) {
      const logMethod = level === 'warning' ? console.warn : console.error;
      logMethod(`[ErrorTracking] ${level.toUpperCase()}: ${message}`);
      if (Object.keys(context).length > 0) {
        logMethod('[ErrorTracking] Context:', context);
      }
    },
    setUser(user) {
      console.log('[ErrorTracking] User set:', user?.id || 'anonymous');
    },
    setContext(name, context) {
      console.log(`[ErrorTracking] Context ${name}:`, context);
    },
    addBreadcrumb(breadcrumb) {
      if (!isProduction()) {
        console.log('[ErrorTracking] Breadcrumb:', breadcrumb);
      }
    }
  },

  /**
   * Sentry provider stub - ready for Sentry integration
   * To enable: npm install @sentry/react @sentry/tracing
   */
  sentry: {
    init() {
      // Sentry initialization would go here
      // Example:
      // import * as Sentry from '@sentry/react';
      // Sentry.init({
      //   dsn: import.meta.env.VITE_SENTRY_DSN,
      //   environment: config().env,
      //   tracesSampleRate: 0.1,
      // });
      console.warn('[ErrorTracking] Sentry provider not fully configured. Using console fallback.');
    },
    captureException(error, context = {}) {
      // Sentry.captureException(error, { extra: context });
      providers.console.captureException(error, context);
    },
    captureMessage(message, level = 'error', context = {}) {
      // Sentry.captureMessage(message, { level, extra: context });
      providers.console.captureMessage(message, level, context);
    },
    setUser(user) {
      // Sentry.setUser(user);
      providers.console.setUser(user);
    },
    setContext(name, context) {
      // Sentry.setContext(name, context);
      providers.console.setContext(name, context);
    },
    addBreadcrumb(breadcrumb) {
      // Sentry.addBreadcrumb(breadcrumb);
      providers.console.addBreadcrumb(breadcrumb);
    }
  }
};

// Active provider instance
let activeProvider = null;

/**
 * Initialize error tracking
 */
export function initErrorTracking() {
  const providerName = import.meta.env.VITE_ERROR_TRACKING_PROVIDER || 'console';
  activeProvider = providers[providerName] || providers.console;

  try {
    activeProvider.init();
  } catch (error) {
    console.error('[ErrorTracking] Failed to initialize:', error);
    activeProvider = providers.console;
  }

  // Set up global error handlers
  setupGlobalErrorHandlers();

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
  if (!activeProvider) {
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
      role: user.role
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
export function addBreadcrumb(category, message, data = {}) {
  getProvider().addBreadcrumb({
    category,
    message,
    data,
    timestamp: Date.now() / 1000
  });
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

export default {
  init: initErrorTracking,
  captureException,
  captureMessage,
  setUser,
  setContext,
  addBreadcrumb,
  withErrorTracking,
  handleReactError
};
