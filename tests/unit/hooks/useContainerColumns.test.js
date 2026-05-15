/**
 * useContainerColumns — Phase 179 Plan 02 (TVRZ-01, D-01)
 *
 * Unit assertions on ResizeObserver-driven cols derivation. RED tests first
 * (Wave 0 Nyquist gate per 179-VALIDATION.md). Implementation lands in Task 2.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';

// RO mock — captures the callback so tests can fire it manually with a synthetic contentRect.
let lastROCallback = null;
let disconnectSpy = null;

function installROMock(initialWidth) {
  disconnectSpy = vi.fn();
  void initialWidth;
  globalThis.ResizeObserver = class {
    constructor(cb) {
      lastROCallback = cb;
    }
    observe(_el) {
      // Intentionally do NOT auto-fire — hook must pre-fill synchronously via
      // getBoundingClientRect(). Tests that want RO to fire call lastROCallback manually.
      void _el;
    }
    disconnect() {
      disconnectSpy();
    }
  };
}

function makeRefWithWidth(width) {
  const ref = createRef();
  // Stub the DOM element with a controllable getBoundingClientRect
  ref.current = {
    getBoundingClientRect: () => ({ width, height: 600, top: 0, left: 0, right: width, bottom: 600 }),
  };
  return ref;
}

describe('useContainerColumns (D-01)', () => {
  beforeEach(() => {
    lastROCallback = null;
    disconnectSpy = null;
  });

  afterEach(() => {
    delete globalThis.ResizeObserver;
  });

  it('returns 4 cols at width >= 1024 (lg)', async () => {
    installROMock(1200);
    const ref = makeRefWithWidth(1200);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    expect(result.current).toBe(4);
  });

  it('returns 3 cols at width 800 (md, >=768 <1024)', async () => {
    installROMock(800);
    const ref = makeRefWithWidth(800);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    expect(result.current).toBe(3);
  });

  it('returns 2 cols at width 700 (sm, >=640 <768)', async () => {
    installROMock(700);
    const ref = makeRefWithWidth(700);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    expect(result.current).toBe(2);
  });

  it('returns 1 col at width 400 (mobile, <640)', async () => {
    installROMock(400);
    const ref = makeRefWithWidth(400);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    expect(result.current).toBe(1);
  });

  it('updates cols when ResizeObserver fires with new width', async () => {
    installROMock(1200);
    const ref = makeRefWithWidth(1200);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    expect(result.current).toBe(4);

    // Simulate RO firing with a narrower width
    act(() => {
      lastROCallback([{ contentRect: { width: 400 } }]);
    });
    expect(result.current).toBe(1);
  });

  it('disconnects the ResizeObserver on unmount', async () => {
    installROMock(1200);
    const ref = makeRefWithWidth(1200);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { unmount } = renderHook(() => useContainerColumns(ref));
    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('synchronous pre-fill uses getBoundingClientRect before RO fires', async () => {
    // RO mock never auto-fires (observe() is a no-op in this test); cols MUST still
    // be correct because the hook reads getBoundingClientRect() synchronously.
    installROMock(0);  // RO will never see this; only the synchronous read matters
    const ref = makeRefWithWidth(900);
    const { useContainerColumns } = await import('../../../src/hooks/useContainerColumns');
    const { result } = renderHook(() => useContainerColumns(ref));
    // width 900 → md (>=768 <1024) → cols=3, derived from synchronous pre-fill
    expect(result.current).toBe(3);
  });
});
