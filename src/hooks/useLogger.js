import { useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

/**
 * React Hook for Component-Scoped Logging
 *
 * Provides a stable reference to a scoped logger for a component.
 * The logger automatically prefixes all messages with the component name
 * and maintains the same logger instance across re-renders.
 *
 * @param {string} componentName - Name of the component (used as log prefix)
 * @returns {Object} Scoped logger with trace, debug, info, warn, error, fatal methods
 *
 * @example
 * function MyComponent() {
 *   const logger = useLogger('MyComponent');
 *
 *   useEffect(() => {
 *     logger.info('Component mounted');
 *     return () => logger.debug('Component unmounting');
 *   }, [logger]);
 *
 *   const handleClick = () => {
 *     logger.debug('Button clicked', { timestamp: Date.now() });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 */
export function useLogger(componentName) {
  // Memoize the logger to provide stable reference across re-renders
  // Only re-create if component name changes
  return useMemo(() => createScopedLogger(componentName), [componentName]);
}
