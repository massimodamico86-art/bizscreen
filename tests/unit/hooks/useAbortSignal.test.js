/**
 * useAbortSignal Hook & isAbortError Utility Tests
 * Phase 138: AbortController adoption - foundation hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useAbortSignal', () => {
  let useAbortSignal;

  beforeEach(async () => {
    const mod = await import('../../../src/hooks/useAbortSignal');
    useAbortSignal = mod.useAbortSignal;
  });

  it('getSignal() returns an AbortSignal instance', () => {
    const { result } = renderHook(() => useAbortSignal());
    const signal = result.current.getSignal();
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('signal is NOT aborted immediately after mount', () => {
    const { result } = renderHook(() => useAbortSignal());
    const signal = result.current.getSignal();
    expect(signal.aborted).toBe(false);
  });

  it('signal IS aborted after unmount', () => {
    const { result, unmount } = renderHook(() => useAbortSignal());
    const signal = result.current.getSignal();
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it('StrictMode double-invocation: mount->unmount->remount produces a fresh non-aborted signal', () => {
    // Simulate StrictMode: render, unmount, re-render
    const { result, unmount, rerender } = renderHook(() => useAbortSignal());

    const firstSignal = result.current.getSignal();
    expect(firstSignal.aborted).toBe(false);

    // Simulate StrictMode unmount
    unmount();
    expect(firstSignal.aborted).toBe(true);

    // Re-render (simulates StrictMode remount)
    const { result: result2 } = renderHook(() => useAbortSignal());
    const secondSignal = result2.current.getSignal();

    expect(secondSignal.aborted).toBe(false);
    // Should be a different signal instance
    expect(secondSignal).not.toBe(firstSignal);
  });

  it('getSignal() returns the same signal on multiple calls within same mount', () => {
    const { result } = renderHook(() => useAbortSignal());
    const signal1 = result.current.getSignal();
    const signal2 = result.current.getSignal();
    expect(signal1).toBe(signal2);
  });

  it('signal returned by getSignal() called during render is aborted on unmount', () => {
    // Regression: previously the mount effect created a NEW AbortController
    // unconditionally, orphaning any controller that getSignal() had already
    // created during the render phase. The orphaned signal was never aborted.
    const renderPhaseSignals = [];
    const { unmount } = renderHook(() => {
      const hook = useAbortSignal();
      // Call getSignal() synchronously during render, before the mount effect
      // has a chance to run. This is what callers like useEffect setup paths
      // and child memo hooks do in practice.
      renderPhaseSignals.push(hook.getSignal());
      return hook;
    });

    const signalFromRender = renderPhaseSignals[0];
    expect(signalFromRender).toBeInstanceOf(AbortSignal);
    expect(signalFromRender.aborted).toBe(false);

    unmount();

    // The exact signal handed out during render must be aborted.
    expect(signalFromRender.aborted).toBe(true);
  });
});

describe('isAbortError', () => {
  let isAbortError;

  beforeEach(async () => {
    const mod = await import('../../../src/utils/isAbortError');
    isAbortError = mod.isAbortError;
  });

  it('returns true for { name: "AbortError" }', () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    expect(isAbortError(err)).toBe(true);
  });

  it('returns true for { code: "PGRST_ABORTED" }', () => {
    const err = { code: 'PGRST_ABORTED', message: 'query aborted' };
    expect(isAbortError(err)).toBe(true);
  });

  it('returns false for generic Error', () => {
    const err = new Error('Something went wrong');
    expect(isAbortError(err)).toBe(false);
  });

  it('returns true for error with "aborted" in message', () => {
    const err = new Error('The request was aborted by the user');
    expect(isAbortError(err)).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});
