/**
 * Structured Logging Service
 *
 * Provides centralized, structured logging with:
 * - Log levels with environment-based filtering
 * - Structured JSON format for log aggregation
 * - Request correlation IDs
 * - Automatic context enrichment
 * - Batched remote logging
 * - Log sampling for high-volume events
 */

import { isProduction } from '../config/env';
import { supabase } from '../supabase';

// Log levels
const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

// Configuration
const CONFIG = {
  minLevel: isProduction() ? 'info' : 'debug',
  batchSize: 20,
  flushInterval: 10000, // 10 seconds
  maxBufferSize: 100,
  samplingRate: isProduction() ? 0.1 : 1.0, // 10% sampling in production
  remoteLogging: isProduction(),
};

// Log buffer for batching
let logBuffer = [];
let flushTimer = null;

// Session context
let sessionContext = {
  sessionId: generateSessionId(),
  userId: null,
  tenantId: null,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Request correlation ID (changes per "request"/navigation)
let correlationId = generateCorrelationId();

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Refresh correlation ID (call on route changes)
 */
export function refreshCorrelationId() {
  correlationId = generateCorrelationId();
}

/**
 * Set user context for logging
 */
export function setLogContext(context) {
  sessionContext = { ...sessionContext, ...context };
}

/**
 * Check if should log at given level
 */
function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.minLevel];
}

/**
 * Check if should sample this log (for high-volume logs)
 */
function shouldSample(level) {
  // Always log warnings and above
  if (LOG_LEVELS[level] >= LOG_LEVELS.warn) return true;
  // Sample lower-level logs
  return Math.random() < CONFIG.samplingRate;
}

/**
 * Create a structured log entry
 */
function createLogEntry(level, message, data = {}) {
  const { error, ...rest } = data;

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId,
    sessionId: sessionContext.sessionId,
    userId: sessionContext.userId,
    tenantId: sessionContext.tenantId,
    url: typeof window !== 'undefined' ? window.location.pathname : null,
    data: rest,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    } : undefined,
    metadata: {
      userAgent: sessionContext.userAgent,
      timezone: sessionContext.timezone,
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
    },
  };
}

/**
 * Format log for console output
 */
function formatForConsole(entry) {
  const levelColors = {
    trace: 'color: gray',
    debug: 'color: blue',
    info: 'color: green',
    warn: 'color: orange',
    error: 'color: red',
    fatal: 'color: red; font-weight: bold',
  };

  const icon = {
    trace: '🔍',
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💀',
  };

  return {
    style: levelColors[entry.level],
    prefix: `${icon[entry.level]} [${entry.level.toUpperCase()}]`,
    message: entry.message,
    data: { ...entry.data, correlationId: entry.correlationId },
  };
}

/**
 * Add log to buffer and potentially flush
 */
function bufferLog(entry) {
  logBuffer.push(entry);

  // Flush if buffer is full
  if (logBuffer.length >= CONFIG.batchSize) {
    flushLogs();
  }

  // Set up flush timer if not already set
  if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, CONFIG.flushInterval);
  }

  // Prevent buffer overflow
  if (logBuffer.length > CONFIG.maxBufferSize) {
    logBuffer = logBuffer.slice(-CONFIG.batchSize);
  }
}

/**
 * Flush logs to remote service
 */
async function flushLogs() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (logBuffer.length === 0) return;

  const logs = [...logBuffer];
  logBuffer = [];

  if (!CONFIG.remoteLogging) return;

  try {
    // Send to Supabase edge function or external service
    const endpoint = import.meta.env.VITE_LOG_ENDPOINT;
    if (endpoint) {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
        keepalive: true,
      });
    }

    // Optionally store critical logs in database
    const criticalLogs = logs.filter(l => LOG_LEVELS[l.level] >= LOG_LEVELS.error);
    if (criticalLogs.length > 0) {
      await storeCriticalLogs(criticalLogs);
    }
  } catch (error) {
    // Silently fail - don't cause cascading errors
    if (!isProduction()) {
      console.warn('[Logging] Failed to flush logs:', error);
    }
  }
}

/**
 * Store critical logs in database
 */
async function storeCriticalLogs(logs) {
  try {
    const { error } = await supabase.from('application_logs').insert(
      logs.map(log => ({
        level: log.level,
        message: log.message,
        correlation_id: log.correlationId,
        user_id: log.userId,
        tenant_id: log.tenantId,
        url: log.url,
        error_name: log.error?.name,
        error_message: log.error?.message,
        error_stack: log.error?.stack,
        metadata: log.metadata,
        created_at: log.timestamp,
      }))
    );

    if (error) throw error;
  } catch (error) {
    // Table might not exist yet - that's okay
    if (!isProduction()) {
      console.warn('[Logging] Failed to store critical logs:', error);
    }
  }
}

/**
 * Main logging functions
 */
export const log = {
  trace(message, data = {}) {
    if (!shouldLog('trace') || !shouldSample('trace')) return;
    const entry = createLogEntry('trace', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.debug(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
  },

  debug(message, data = {}) {
    if (!shouldLog('debug') || !shouldSample('debug')) return;
    const entry = createLogEntry('debug', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.debug(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
  },

  info(message, data = {}) {
    if (!shouldLog('info') || !shouldSample('info')) return;
    const entry = createLogEntry('info', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.log(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
  },

  warn(message, data = {}) {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.warn(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
  },

  error(message, data = {}) {
    if (!shouldLog('error')) return;
    const entry = createLogEntry('error', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.error(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
  },

  fatal(message, data = {}) {
    const entry = createLogEntry('fatal', message, data);
    const { style, prefix, message: msg, data: d } = formatForConsole(entry);
    console.error(`%c${prefix}`, style, msg, d);
    bufferLog(entry);
    // Immediately flush fatal errors
    flushLogs();
  },
};

/**
 * Create a scoped logger for a specific component/service
 */
export function createScopedLogger(scope) {
  return {
    trace: (message, data = {}) => log.trace(`[${scope}] ${message}`, data),
    debug: (message, data = {}) => log.debug(`[${scope}] ${message}`, data),
    info: (message, data = {}) => log.info(`[${scope}] ${message}`, data),
    warn: (message, data = {}) => log.warn(`[${scope}] ${message}`, data),
    error: (message, data = {}) => log.error(`[${scope}] ${message}`, data),
    fatal: (message, data = {}) => log.fatal(`[${scope}] ${message}`, data),
  };
}

/**
 * Time an async operation and log performance
 */
export async function logTiming(name, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    log.debug(`${name} completed`, { duration: Math.round(duration), unit: 'ms' });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    log.error(`${name} failed`, { duration: Math.round(duration), error });
    throw error;
  }
}

/**
 * Initialize logging service
 */
export function initLogging() {
  // Refresh correlation ID on route changes
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', refreshCorrelationId);

    // Flush logs before page unload
    window.addEventListener('pagehide', flushLogs);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushLogs();
      }
    });
  }

  log.info('Logging service initialized', {
    minLevel: CONFIG.minLevel,
    remoteLogging: CONFIG.remoteLogging,
    samplingRate: CONFIG.samplingRate,
  });
}

/**
 * Get current correlation ID (for passing to API calls)
 */
export function getCorrelationId() {
  return correlationId;
}

/**
 * Get session ID
 */
export function getSessionId() {
  return sessionContext.sessionId;
}

export default {
  ...log,
  setLogContext,
  createScopedLogger,
  logTiming,
  initLogging,
  refreshCorrelationId,
  getCorrelationId,
  getSessionId,
};
