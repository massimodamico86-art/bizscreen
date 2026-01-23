import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('ErrorTrackingService');

/**
 * Error Tracking Service
 *
 * Centralized error tracking for production monitoring.
 * Logs errors to console and can be extended to integrate with
 * external services like Sentry, LogRocket, or Bugsnag.
 *
 * To add Sentry integration:
 * 1. npm install @sentry/browser
 * 2. Uncomment and configure the Sentry code below
 * 3. Set VITE_SENTRY_DSN in your environment
 */

// Configuration from environment
const ERROR_TRACKING_ENABLED = import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Error queue for batching (in case tracking service loads async)
let errorQueue = [];
let trackingProvider = null;
let initAttempted = false;

/**
 * Initialize error tracking (call on app startup)
 * This is a no-op by default. Extend to add external service integration.
 */
export async function initErrorTracking() {
  if (initAttempted) return;
  initAttempted = true;

  if (!ERROR_TRACKING_ENABLED) {
    if (import.meta.env.DEV) {
      logger.info('Disabled');
    }
    return;
  }

  // Log that tracking is enabled but using console-only mode
  logger.info('Enabled (console mode). To add Sentry, install @sentry/browser and configure.');

  // Process any queued errors
  errorQueue.forEach(({ error, context, additionalInfo }) => {
    logToConsole(error, context, additionalInfo);
  });
  errorQueue = [];
}

/**
 * Log error to console in a structured way
 */
function logToConsole(error, context, additionalInfo) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error('Error', { context, error: errorObj, ...additionalInfo });
}

/**
 * Capture an error and send to tracking service
 * @param {Error|string} error - The error to capture
 * @param {string} context - Context where error occurred
 * @param {Object} additionalInfo - Additional debugging data
 */
export function captureError(error, context = 'unknown', additionalInfo = {}) {
  // Always log to console in development
  if (import.meta.env.DEV) {
    logToConsole(error, context, additionalInfo);
    return;
  }

  // In production, queue if tracking not initialized
  if (!initAttempted) {
    errorQueue.push({ error, context, additionalInfo });
    return;
  }

  // Log to console (extend here for external service)
  logToConsole(error, context, additionalInfo);

  // EXTENSION POINT: Add external service integration here
  // Example for Sentry (requires @sentry/browser installed):
  // if (trackingProvider?.captureException) {
  //   trackingProvider.withScope((scope) => {
  //     scope.setTag('context', context);
  //     scope.setExtras(additionalInfo);
  //     if (error instanceof Error) {
  //       trackingProvider.captureException(error);
  //     } else {
  //       trackingProvider.captureMessage(String(error), 'error');
  //     }
  //   });
  // }
}

/**
 * Capture a warning (non-critical issue)
 * @param {string} message - Warning message
 * @param {Object} data - Additional data
 */
export function captureWarning(message, data = {}) {
  if (import.meta.env.DEV) {
    logger.warn(message, { data });
    return;
  }

  logger.warn('${message}', { data: data });
}

/**
 * Set user context for error tracking
 * @param {Object} user - User info { id, email, role }
 */
export function setUserContext(user) {
  // Store user context for error reports
  if (user) {
    logger.debug('User context set', { userId: user.id, role: user.role });
  }
}

/**
 * Set tenant context for multi-tenant tracking
 * @param {string} tenantId - Tenant identifier
 */
export function setTenantContext(tenantId) {
  logger.info('Tenant context set:', { data: tenantId });
}

/**
 * Add breadcrumb for debugging trail
 * @param {Object} breadcrumb - { category, message, data, level }
 */
export function addBreadcrumb(breadcrumb) {
  if (import.meta.env.DEV) {
    logger.info('Breadcrumb', { message: breadcrumb.message, data: breadcrumb.data || {} });
  }
}

/**
 * Check if error tracking is enabled
 */
export function isErrorTrackingEnabled() {
  return ERROR_TRACKING_ENABLED;
}

export default {
  initErrorTracking,
  captureError,
  captureWarning,
  setUserContext,
  setTenantContext,
  addBreadcrumb,
  isErrorTrackingEnabled,
};
