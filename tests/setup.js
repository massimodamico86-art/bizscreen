/**
 * Vitest Test Setup
 *
 * This file runs before each test file and sets up the testing environment.
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

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

// Provide a spec-compliant in-memory localStorage on window.
// Node 25+ exposes a partially-implemented `localStorage` global that lacks
// `.clear()` and `.key()`, which causes jsdom's `window.localStorage` to
// inherit the broken shim. Tests that call `window.localStorage.clear()`
// (e.g. tests/unit/pages/TemplateGalleryPage.test.jsx) fail with
// "clear is not a function". Override with a fresh Storage-like object so
// the full API is always available regardless of host Node version.
(() => {
  const store = new Map();
  const mockStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: mockStorage,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: (() => {
      const s = new Map();
      return {
        getItem: (k) => (s.has(String(k)) ? s.get(String(k)) : null),
        setItem: (k, v) => { s.set(String(k), String(v)); },
        removeItem: (k) => { s.delete(String(k)); },
        clear: () => { s.clear(); },
        key: (i) => Array.from(s.keys())[i] ?? null,
        get length() { return s.size; },
      };
    })(),
  });
})();

// Mock ResizeObserver
// NOTE: vitest 4 spies invoke `Reflect.construct(implementation, ...)` when the
// mock is called with `new`. Arrow functions cannot be constructed via
// Reflect.construct, so the implementation MUST be a regular function (or class).
// Tanstack virtual-core calls `new targetWindow.ResizeObserver(cb)` internally;
// arrow-form mocks raise "() => ({...}) is not a constructor".
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock IntersectionObserver — same constructor-compatibility note as ResizeObserver above.
global.IntersectionObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Suppress console errors during tests (optional)
// Uncomment to hide expected errors
// vi.spyOn(console, 'error').mockImplementation(() => {});
