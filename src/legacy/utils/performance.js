/**
 * Performance monitoring utilities
 * Provides tools for tracking component render times, API call durations, and custom metrics
 */

/**
 * Measure the duration of an async operation
 * @param {string} operationName - Name of the operation being measured
 * @param {Function} operation - Async function to measure
 * @returns {Promise<{result: any, duration: number}>} Operation result and duration in ms
 */
export async function measureAsync(operationName, operation) {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    logPerformance(operationName, duration);

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    logPerformance(`${operationName} (failed)`, duration);
    throw error;
  }
}

/**
 * Measure the duration of a synchronous operation
 * @param {string} operationName - Name of the operation being measured
 * @param {Function} operation - Function to measure
 * @returns {{result: any, duration: number}} Operation result and duration in ms
 */
export function measureSync(operationName, operation) {
  const startTime = performance.now();

  try {
    const result = operation();
    const duration = performance.now() - startTime;

    logPerformance(operationName, duration);

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    logPerformance(`${operationName} (failed)`, duration);
    throw error;
  }
}

/**
 * Mark a performance point
 * @param {string} markName - Name of the performance mark
 */
export function mark(markName) {
  if (performance.mark) {
    performance.mark(markName);
  }
}

/**
 * Measure duration between two marks
 * @param {string} measureName - Name for this measurement
 * @param {string} startMark - Name of the start mark
 * @param {string} endMark - Name of the end mark
 * @returns {number|null} Duration in ms, or null if marks don't exist
 */
export function measure(measureName, startMark, endMark) {
  try {
    if (performance.measure) {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        logPerformance(measureName, duration);
        return duration;
      }
    }
  } catch (error) {
    console.warn('Performance measurement failed:', error);
  }
  return null;
}

/**
 * Log performance metric
 * @param {string} name - Metric name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
function logPerformance(name, duration, metadata = {}) {
  const threshold = 1000; // Log warning if operation takes more than 1 second
  const logLevel = duration > threshold ? 'warn' : 'log';

  console[logLevel](`⏱️  [Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);

  // In production, this could send to analytics service
  if (import.meta.env.PROD && duration > threshold) {
    // TODO: Send to analytics service (e.g., Google Analytics, Mixpanel)
  }
}

/**
 * Get Web Vitals metrics
 * @returns {Object} Current web vitals
 */
export function getWebVitals() {
  if (!performance.getEntriesByType) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    // First Contentful Paint
    fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || null,

    // DOM Content Loaded
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || null,

    // Page Load Time
    loadTime: navigation?.loadEventEnd - navigation?.fetchStart || null,

    // DOM Interactive Time
    domInteractive: navigation?.domInteractive - navigation?.fetchStart || null,
  };
}

/**
 * Log current Web Vitals to console
 */
export function logWebVitals() {
  const vitals = getWebVitals();
  if (vitals) {
    console.log('📊 [Web Vitals]', {
      'First Contentful Paint': vitals.fcp ? `${vitals.fcp.toFixed(2)}ms` : 'N/A',
      'DOM Content Loaded': vitals.domContentLoaded ? `${vitals.domContentLoaded.toFixed(2)}ms` : 'N/A',
      'Page Load Time': vitals.loadTime ? `${vitals.loadTime.toFixed(2)}ms` : 'N/A',
      'DOM Interactive': vitals.domInteractive ? `${vitals.domInteractive.toFixed(2)}ms` : 'N/A',
    });
  }
}

/**
 * React Hook: Measure component render time
 * @param {string} componentName - Name of the component
 * @returns {Function} Callback to call when component finishes rendering
 */
export function useRenderTime(componentName) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    logPerformance(`${componentName} render`, duration);
  };
}

// Log web vitals on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Wait a bit for all metrics to be available
    setTimeout(logWebVitals, 100);
  });
}
