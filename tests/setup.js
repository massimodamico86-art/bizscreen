/**
 * Vitest Test Setup
 *
 * This file runs before each test file and sets up the testing environment.
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// CRITICAL: Mock loggingService globally to break circular dependency
// loggingService imports supabase, supabase imports loggingService
// This mock is hoisted and replaces the module before any imports can trigger the cycle
vi.mock('../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
  log: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  setLogContext: vi.fn(),
  refreshCorrelationId: vi.fn(),
  getCorrelationId: vi.fn(() => 'test-correlation-id'),
  getSessionId: vi.fn(() => 'test-session-id'),
  initLogging: vi.fn(),
  logTiming: vi.fn((name, fn) => fn()),
  default: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    setLogContext: vi.fn(),
    createScopedLogger: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    })),
    logTiming: vi.fn((name, fn) => fn()),
    initLogging: vi.fn(),
    refreshCorrelationId: vi.fn(),
    getCorrelationId: vi.fn(() => 'test-correlation-id'),
    getSessionId: vi.fn(() => 'test-session-id'),
  },
}));

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables with valid-looking keys
// The supabase.js validates key length, so we need a sufficiently long mock key
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ0OTg2MCwiZXhwIjoxOTMyMDI1ODYwfQ.test-signature-placeholder-abc123');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Suppress console errors during tests (optional)
// Uncomment to hide expected errors
// vi.spyOn(console, 'error').mockImplementation(() => {});
