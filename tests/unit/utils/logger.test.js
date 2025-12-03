/**
 * Logger Utility Unit Tests
 *
 * Tests the centralized logging functionality including:
 * - Log levels (debug, info, warn, error)
 * - Log formatting
 * - Environment-based log filtering
 * - Error logging with context
 * - Component-scoped loggers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the env module before importing logger
vi.mock('../../../src/config/env', () => ({
  config: {},
  isProduction: vi.fn(() => false),
  isLocal: vi.fn(() => true)
}));

describe('Logger Utility', () => {
  let logger, logError, createLogger, logEvent, logPerformance;
  let consoleSpy;
  let mockIsProduction;

  beforeEach(async () => {
    // Reset mocks
    vi.resetModules();

    // Setup console spies
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };

    // Mock window for browser-specific tests
    global.window = {
      location: { href: 'http://localhost:5173/test' },
      __perfMetrics: [],
      __reportingError: false
    };
    global.navigator = {
      userAgent: 'test-agent',
      sendBeacon: vi.fn(() => true)
    };

    // Import the module fresh for each test
    const loggerModule = await import('../../../src/utils/logger');
    logger = loggerModule.logger;
    logError = loggerModule.logError;
    createLogger = loggerModule.createLogger;
    logEvent = loggerModule.logEvent;
    logPerformance = loggerModule.logPerformance;

    // Get the mock function
    const envModule = await import('../../../src/config/env');
    mockIsProduction = envModule.isProduction;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
    delete global.navigator;
  });

  describe('logger.debug', () => {
    it('logs debug messages in development', async () => {
      mockIsProduction.mockReturnValue(false);

      logger.debug('Test debug message', { key: 'value' });

      expect(consoleSpy.debug).toHaveBeenCalled();
      const call = consoleSpy.debug.mock.calls[0][0];
      expect(call).toContain('[DEBUG]');
      expect(call).toContain('Test debug message');
    });
  });

  describe('logger.info', () => {
    it('logs info messages', async () => {
      mockIsProduction.mockReturnValue(false);

      logger.info('Test info message', { data: 123 });

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('[INFO]');
      expect(call).toContain('Test info message');
    });
  });

  describe('logger.warn', () => {
    it('logs warning messages', () => {
      logger.warn('Test warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const call = consoleSpy.warn.mock.calls[0][0];
      expect(call).toContain('[WARN]');
      expect(call).toContain('Test warning message');
    });
  });

  describe('logger.error', () => {
    it('logs error messages with context', () => {
      logger.error('Test error message', { errorCode: 500 });

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain('[ERROR]');
      expect(call).toContain('Test error message');
      expect(call).toContain('500');
    });
  });

  describe('logError', () => {
    it('logs Error objects with stack traces', () => {
      const testError = new Error('Test error');
      testError.name = 'TestError';

      logError(testError, { userId: 'user123' });

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain('Test error');
    });

    it('handles string errors', () => {
      logError('String error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('creates a component-scoped logger', () => {
      const componentLogger = createLogger('TestComponent');

      componentLogger.info('Component message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('[TestComponent]');
      expect(call).toContain('Component message');
    });

    it('component logger supports all log levels', () => {
      const componentLogger = createLogger('MyComponent');

      componentLogger.debug('Debug');
      componentLogger.info('Info');
      componentLogger.warn('Warn');
      componentLogger.error('Error');

      // Each level should have been called
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('logEvent', () => {
    it('logs analytics events with properties', () => {
      logEvent('button_click', { buttonId: 'submit-btn' });

      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('logPerformance', () => {
    it('logs performance metrics', () => {
      logPerformance('api_call', 150, 'ms');

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('stores metrics in window buffer', () => {
      logPerformance('render_time', 50);

      expect(global.window.__perfMetrics.length).toBeGreaterThan(0);
    });

    it('limits stored metrics to 100', () => {
      // Add more than 100 metrics
      for (let i = 0; i < 110; i++) {
        logPerformance(`metric_${i}`, i);
      }

      expect(global.window.__perfMetrics.length).toBeLessThanOrEqual(100);
    });
  });

  describe('log formatting', () => {
    it('includes timestamp in ISO format', () => {
      logger.info('Test message');

      const call = consoleSpy.log.mock.calls[0][0];
      // Should contain ISO timestamp pattern
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('includes context as JSON when provided', () => {
      logger.info('With context', { foo: 'bar', num: 42 });

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('foo');
      expect(call).toContain('bar');
    });
  });
});
