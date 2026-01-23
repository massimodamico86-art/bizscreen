/**
 * useTapSequence Hook Tests
 *
 * Tests the hidden tap gesture detection hook used for kiosk exit.
 * Phase 9: Device Experience - Plan 08
 *
 * @module tests/unit/player/useTapSequence.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTapSequence } from '../../../src/player/hooks/useTapSequence';

describe('useTapSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return handleTap function', () => {
      const { result } = renderHook(() => useTapSequence());
      expect(result.current.handleTap).toBeDefined();
      expect(typeof result.current.handleTap).toBe('function');
    });

    it('should return reset function', () => {
      const { result } = renderHook(() => useTapSequence());
      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');
    });

    it('should work with default options (no config)', () => {
      const { result } = renderHook(() => useTapSequence());
      // Should not throw when tapping without onTrigger
      expect(() => {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }).not.toThrow();
    });
  });

  describe('tap sequence detection', () => {
    it('should trigger callback after 5 consecutive taps (default)', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ onTrigger })
      );

      // Simulate 5 taps
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('should trigger callback after 5 consecutive taps (explicit)', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, onTrigger })
      );

      // Simulate 5 taps
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback before required taps reached', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, onTrigger })
      );

      // Simulate 4 taps (one short)
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('should support custom tap count', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 3, onTrigger })
      );

      // Simulate 3 taps
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout behavior', () => {
    it('should reset count after timeout between taps', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, timeoutMs: 2000, onTrigger })
      );

      // Tap 3 times
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      // Advance time beyond timeout (hook uses Date.now() to check elapsed time)
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      // Tap 3 more times (should need all 5 again because count reset)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      // Should not trigger (only 3 taps since reset happened on first tap after timeout)
      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('should not reset if taps within timeout', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, timeoutMs: 2000, onTrigger })
      );

      // Tap with delays but within timeout
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
        // Advance 1 second between taps (within 2s timeout)
        if (i < 4) {
          act(() => {
            vi.advanceTimersByTime(1000);
          });
        }
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('should support custom timeout', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 3, timeoutMs: 500, onTrigger })
      );

      // Tap once
      act(() => {
        result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
      });

      // Wait 600ms (longer than 500ms timeout)
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Tap twice more (count was reset on timeout, so only 2 taps now)
      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      // Should not trigger (count reset after timeout, only 2 consecutive taps)
      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('should trigger with exact timeout boundary taps', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 3, timeoutMs: 1000, onTrigger })
      );

      // Tap with exactly timeout delay (should still count)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
        if (i < 2) {
          // Advance exactly to timeout boundary
          act(() => {
            vi.advanceTimersByTime(1000);
          });
        }
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset after trigger', () => {
    it('should reset count after successful trigger', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 3, onTrigger })
      );

      // Trigger once
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }
      expect(onTrigger).toHaveBeenCalledTimes(1);

      // Trigger again (count was auto-reset after trigger)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }
      expect(onTrigger).toHaveBeenCalledTimes(2);
    });

    it('should allow multiple triggers in succession', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 2, onTrigger })
      );

      // Trigger 3 times in a row
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let tap = 0; tap < 2; tap++) {
          act(() => {
            result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
          });
        }
      }

      expect(onTrigger).toHaveBeenCalledTimes(3);
    });
  });

  describe('manual reset', () => {
    it('should reset count when reset() called', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, onTrigger })
      );

      // Tap 4 times
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      // Manual reset
      act(() => {
        result.current.reset();
      });

      // Tap once more (should not trigger - count was reset)
      act(() => {
        result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
      });

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it('should allow new sequence after manual reset', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 3, onTrigger })
      );

      // Tap 2 times
      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      // Manual reset
      act(() => {
        result.current.reset();
      });

      // Full 3-tap sequence
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('touch event handling', () => {
    it('should call preventDefault on touchend events', () => {
      const { result } = renderHook(() => useTapSequence());
      const preventDefault = vi.fn();

      act(() => {
        result.current.handleTap({ type: 'touchend', preventDefault });
      });

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should not call preventDefault on click events', () => {
      const { result } = renderHook(() => useTapSequence());
      const preventDefault = vi.fn();

      act(() => {
        result.current.handleTap({ type: 'click', preventDefault });
      });

      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should count both click and touchend events', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 4, onTrigger })
      );

      // Mix of click and touch events
      act(() => {
        result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
      });
      act(() => {
        result.current.handleTap({ type: 'touchend', preventDefault: vi.fn() });
      });
      act(() => {
        result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
      });
      act(() => {
        result.current.handleTap({ type: 'touchend', preventDefault: vi.fn() });
      });

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle event without preventDefault gracefully', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 2, onTrigger })
      );

      // Pass event without preventDefault function - should still work
      expect(() => {
        act(() => {
          result.current.handleTap({ type: 'click' });
        });
        act(() => {
          result.current.handleTap({ type: 'click' });
        });
      }).not.toThrow();

      expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid taps correctly', () => {
      const onTrigger = vi.fn();
      const { result } = renderHook(() =>
        useTapSequence({ requiredTaps: 5, onTrigger })
      );

      // 10 rapid taps should trigger twice
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleTap({ type: 'click', preventDefault: vi.fn() });
        });
      }

      expect(onTrigger).toHaveBeenCalledTimes(2);
    });
  });
});
