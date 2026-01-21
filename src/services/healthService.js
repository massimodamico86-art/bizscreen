/**
 * Health Check Service
 *
 * Provides client-side health monitoring and status reporting.
 * Works in conjunction with server-side health endpoints.
 */

import { supabase } from '../supabase';
import { getMetricsSummary, isPerformanceAcceptable } from './webVitalsService';

// Health check configuration
const CONFIG = {
  checkInterval: 60000, // 1 minute
  timeout: 5000, // 5 seconds
  degradedThreshold: 2000, // Consider degraded if response > 2s
};

// Health status
let currentHealth = {
  status: 'unknown',
  lastCheck: null,
  components: {},
};

/**
 * Check Supabase database connectivity
 */
async function checkDatabase() {
  const start = performance.now();
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1).single();
    const latency = Math.round(performance.now() - start);

    if (error && !error.message.includes('0 rows')) {
      return {
        status: 'unhealthy',
        latency,
        error: error.message,
      };
    }

    return {
      status: latency > CONFIG.degradedThreshold ? 'degraded' : 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Math.round(performance.now() - start),
      error: error.message,
    };
  }
}

/**
 * Check Supabase auth service
 */
async function checkAuth() {
  const start = performance.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        status: 'unhealthy',
        latency,
        error: error.message,
      };
    }

    return {
      status: latency > CONFIG.degradedThreshold ? 'degraded' : 'healthy',
      latency,
      authenticated: !!data.session,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Math.round(performance.now() - start),
      error: error.message,
    };
  }
}

/**
 * Check Supabase storage service
 */
async function checkStorage() {
  const start = performance.now();
  try {
    const { error } = await supabase.storage.listBuckets();
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        status: 'unhealthy',
        latency,
        error: error.message,
      };
    }

    return {
      status: latency > CONFIG.degradedThreshold ? 'degraded' : 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Math.round(performance.now() - start),
      error: error.message,
    };
  }
}

/**
 * Check client-side performance
 */
function checkPerformance() {
  const metrics = getMetricsSummary();
  const acceptable = isPerformanceAcceptable();

  return {
    status: acceptable ? 'healthy' : 'degraded',
    metrics: Object.entries(metrics).reduce((acc, [name, data]) => {
      acc[name] = {
        value: Math.round(data.value),
        rating: data.rating,
      };
      return acc;
    }, {}),
  };
}

/**
 * Check browser capabilities and resources
 */
function checkClient() {
  const memoryInfo = performance.memory;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  return {
    status: 'healthy',
    memory: memoryInfo ? {
      usedJSHeapSize: Math.round(memoryInfo.usedJSHeapSize / 1048576), // MB
      totalJSHeapSize: Math.round(memoryInfo.totalJSHeapSize / 1048576),
      jsHeapSizeLimit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576),
    } : null,
    connection: connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    } : null,
    online: navigator.onLine,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
  };
}

/**
 * Run a complete health check
 */
export async function runHealthCheck() {
  const startTime = Date.now();

  // Run checks in parallel
  const [database, auth, storage] = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkStorage(),
  ]);

  // Sync checks
  const performance = checkPerformance();
  const client = checkClient();

  // Determine overall status
  const components = { database, auth, storage, performance, client };
  const statuses = Object.values(components).map(c => c.status);

  let overallStatus = 'healthy';
  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  currentHealth = {
    status: overallStatus,
    lastCheck: new Date().toISOString(),
    duration: Date.now() - startTime,
    components,
  };

  return currentHealth;
}

/**
 * Get cached health status
 */
export function getHealthStatus() {
  return currentHealth;
}

/**
 * Quick liveness check - just verify app is responsive
 */
export function livenessCheck() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness check - verify app can serve requests
 */
export async function readinessCheck() {
  try {
    const database = await checkDatabase();
    const auth = await checkAuth();

    const ready = database.status !== 'unhealthy' && auth.status !== 'unhealthy';

    return {
      ready,
      timestamp: new Date().toISOString(),
      components: {
        database: database.status,
        auth: auth.status,
      },
    };
  } catch (error) {
    return {
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Start periodic health checks
 */
let healthCheckInterval = null;

export function startHealthMonitoring() {
  if (healthCheckInterval) return;

  // Initial check
  runHealthCheck();

  // Periodic checks
  healthCheckInterval = setInterval(runHealthCheck, CONFIG.checkInterval);

  // Check on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      runHealthCheck();
    }
  });

  // Check on online status change
  window.addEventListener('online', runHealthCheck);
  window.addEventListener('offline', () => {
    currentHealth = {
      ...currentHealth,
      status: 'unhealthy',
      components: {
        ...currentHealth.components,
        client: { ...currentHealth.components.client, online: false },
      },
    };
  });
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Get detailed system information
 */
export function getSystemInfo() {
  return {
    app: {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: import.meta.env.VITE_BUILD_TIME,
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
      platform: navigator.platform,
    },
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    features: {
      serviceWorker: 'serviceWorker' in navigator,
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      })(),
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,
    },
  };
}

export default {
  runHealthCheck,
  getHealthStatus,
  livenessCheck,
  readinessCheck,
  startHealthMonitoring,
  stopHealthMonitoring,
  getSystemInfo,
};
