/**
 * Frontend Logger (DEPRECATED)
 *
 * TODO(04-06): Remove this file - replaced by loggingService.js
 * This old logger is being phased out. New code should use:
 * - loggingService.js: createScopedLogger() for non-React code
 * - hooks/useLogger.js: useLogger() hook for React components
 *
 * Provides structured logging for the frontend with:
 * - Log levels (debug, info, warn, error)
 * - Event logging for analytics
 * - Performance logging
 * - Error reporting to backend
 */

import { config, isProduction, isLocal } from '../config/env';

// Log levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Minimum log level based on environment
function getMinLogLevel() {
  if (isProduction()) return 'warn';
  return 'debug';
}

/**
 * Check if should log at given level
 */
function shouldLog(level) {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

/**
 * Format log message with timestamp and context
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0
    ? ` | ${JSON.stringify(context)}`
    : '';

  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Main logger object
 */
export const logger = {
  /**
   * Debug level - development only
   */
  debug(message, context = {}) {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, context));
    }
  },

  /**
   * Info level - general information
   */
  info(message, context = {}) {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, context));
    }
  },

  /**
   * Warning level - potential issues
   */
  warn(message, context = {}) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, context));
    }
  },

  /**
   * Error level - errors that need attention
   */
  error(message, context = {}) {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, context));
    }

    // Report severe errors to backend in production
    if (isProduction() && context.severe) {
      reportErrorToBackend(message, context);
    }
  }
};

/**
 * Log an analytics event
 */
export function logEvent(eventName, properties = {}) {
  const event = {
    name: eventName,
    properties,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  logger.debug('Event logged', event);

  // In production, could send to analytics service
  // For now, just log locally
}

/**
 * Log a performance metric
 */
export function logPerformance(metricName, value, unit = 'ms') {
  const metric = {
    name: metricName,
    value,
    unit,
    timestamp: new Date().toISOString()
  };

  logger.debug('Performance metric', metric);

  // Record in performance buffer for potential reporting
  if (typeof window !== 'undefined') {
    window.__perfMetrics = window.__perfMetrics || [];
    window.__perfMetrics.push(metric);

    // Keep only last 100 metrics
    if (window.__perfMetrics.length > 100) {
      window.__perfMetrics = window.__perfMetrics.slice(-100);
    }
  }
}

/**
 * Log an error with additional context
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message || String(error),
    name: error.name || 'Error',
    stack: error.stack,
    ...context
  };

  logger.error(errorInfo.message, errorInfo);

  // Always report errors to backend in production
  if (isProduction()) {
    reportErrorToBackend(errorInfo.message, errorInfo);
  }
}

/**
 * Report error to backend logging endpoint
 */
async function reportErrorToBackend(message, context = {}) {
  try {
    // Don't report if we're already in an error state
    if (window.__reportingError) return;
    window.__reportingError = true;

    const payload = {
      message,
      context: {
        ...context,
        // Remove stack trace for smaller payload
        stack: context.stack?.substring(0, 1000)
      },
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for reliability, fall back to fetch
    const endpoint = '/api/logs/browser';
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      });
    }
  } catch {
    // Silently fail - don't cause more errors
  } finally {
    window.__reportingError = false;
  }
}

/**
 * Create a component-scoped logger
 */
export function createLogger(componentName) {
  return {
    debug: (message, context = {}) => logger.debug(`[${componentName}] ${message}`, context),
    info: (message, context = {}) => logger.info(`[${componentName}] ${message}`, context),
    warn: (message, context = {}) => logger.warn(`[${componentName}] ${message}`, context),
    error: (message, context = {}) => logger.error(`[${componentName}] ${message}`, context)
  };
}

/**
 * Time a function execution and log performance
 */
export async function timeExecution(name, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logPerformance(name, Math.round(duration));
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logPerformance(`${name}_failed`, Math.round(duration));
    throw error;
  }
}

export default logger;
