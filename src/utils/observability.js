/**
 * Observability Initialization
 *
 * Centralized setup for all monitoring and observability features:
 * - Error tracking (Sentry)
 * - Performance monitoring (Web Vitals)
 * - Structured logging
 * - Health checks
 */

import { initErrorTracking, setUser as setErrorUser, setContext } from './errorTracking';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('observability');
import { initWebVitals } from '../services/webVitalsService';
import { initLogging, setLogContext, log } from '../services/loggingService';
import { startHealthMonitoring } from '../services/healthService';
import { isProduction } from '../config/env';

let initialized = false;

/**
 * Initialize all observability features
 */
export function initObservability() {
  if (initialized) return;

  try {
    // 1. Initialize error tracking (Sentry)
    initErrorTracking();
    log.info('Error tracking initialized');

    // 2. Initialize structured logging
    initLogging();
    log.info('Logging service initialized');

    // 3. Initialize Web Vitals monitoring
    initWebVitals();
    log.info('Web Vitals monitoring initialized');

    // 4. Start health monitoring
    startHealthMonitoring();
    log.info('Health monitoring started');

    // Set app context
    setContext('app', {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
    });

    initialized = true;
    log.info('Observability fully initialized', {
      environment: import.meta.env.MODE,
      production: isProduction(),
    });
  } catch (error) {
    logger.error('[Observability] Initialization failed:', error);
  }
}

/**
 * Set user context across all observability tools
 */
export function setObservabilityUser(user) {
  if (!user) {
    setErrorUser(null);
    setLogContext({ userId: null, tenantId: null });
    return;
  }

  // Set user in error tracking
  setErrorUser({
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.user_metadata?.full_name,
    role: user.role || user.user_metadata?.role,
  });

  // Set user in logging
  setLogContext({
    userId: user.id,
    tenantId: user.tenant_id,
  });

  // Set context for errors
  setContext('user', {
    role: user.role || user.user_metadata?.role,
    tenantId: user.tenant_id,
    plan: user.plan,
  });
}

/**
 * Set tenant context
 */
export function setTenantContext(tenant) {
  if (!tenant) return;

  setLogContext({ tenantId: tenant.id });
  setContext('tenant', {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
  });
}

/**
 * Track a page view
 */
export function trackPageView(path, title) {
  log.debug('Page view', { path, title });
}

/**
 * Track a user action
 */
export function trackAction(action, data = {}) {
  log.info(`User action: ${action}`, data);
}

/**
 * Track a feature usage
 */
export function trackFeatureUsage(feature, data = {}) {
  log.info(`Feature used: ${feature}`, data);
}

/**
 * Track an API call
 */
export function trackApiCall(method, endpoint, duration, status) {
  const level = status >= 400 ? 'warn' : 'debug';
  log[level](`API ${method} ${endpoint}`, {
    method,
    endpoint,
    duration,
    status,
  });
}

export default {
  init: initObservability,
  setUser: setObservabilityUser,
  setTenant: setTenantContext,
  trackPageView,
  trackAction,
  trackFeatureUsage,
  trackApiCall,
};
