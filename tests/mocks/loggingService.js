/**
 * Centralized loggingService Mock for Tests
 *
 * This mock breaks the circular dependency between loggingService.js and supabase.js.
 * It is auto-mocked globally in tests/setup.js.
 *
 * All logging functions are vi.fn() for call tracking and assertions.
 */
import { vi } from 'vitest';

// Mock logger object with all log methods
export const mockLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
};

// Named exports matching loggingService.js
export const createScopedLogger = vi.fn(() => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
}));

export const log = mockLogger;

export const setLogContext = vi.fn();
export const refreshCorrelationId = vi.fn();
export const getCorrelationId = vi.fn(() => 'test-correlation-id');
export const getSessionId = vi.fn(() => 'test-session-id');
export const initLogging = vi.fn();
export const logTiming = vi.fn((name, fn) => fn());

// Default export matching loggingService.js default export
export default {
  ...mockLogger,
  setLogContext,
  createScopedLogger,
  logTiming,
  initLogging,
  refreshCorrelationId,
  getCorrelationId,
  getSessionId,
};
