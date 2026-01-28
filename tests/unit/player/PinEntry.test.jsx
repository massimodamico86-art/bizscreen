/**
 * PinEntry Component Tests
 *
 * Tests the full-screen PIN entry component for kiosk exit.
 * Phase 9: Device Experience - Plan 08
 *
 * @module tests/unit/player/PinEntry.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

describe('PinEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render PIN entry screen with title', () => {
      render(<PinEntry />);
      expect(screen.getByText('Enter PIN')).toBeInTheDocument();
    });

    it('should render PIN entry description', () => {
      render(<PinEntry />);
      expect(screen.getByText(/4-digit PIN/)).toBeInTheDocument();
    });

    it('should render numeric keypad (0-9)', () => {
      render(<PinEntry />);
      // Check all digits 0-9 are present as buttons
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
      }
    });

    it('should render 4 PIN dots', () => {
      const { container } = render(<PinEntry />);
      // PIN dots are divs with border-radius: 50%
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(4);
    });

    it('should render cancel button', () => {
      render(<PinEntry />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render inactivity timeout notice', () => {
      render(<PinEntry />);
      expect(screen.getByText(/auto-dismiss/i)).toBeInTheDocument();
    });
  });

  describe('digit input', () => {
    it('should accept digit button presses', () => {
      render(<PinEntry />);

      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));

      // Visual feedback would be filled dots - verify no error state
      expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
    });

    it('should limit input to 4 digits', async () => {
      const onValidate = vi.fn().mockResolvedValue(false);
      render(<PinEntry onValidate={onValidate} />);

      // Press 5 digits
      for (const digit of ['1', '2', '3', '4', '5']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises for async validation
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should only validate once (after 4th digit)
      expect(onValidate).toHaveBeenCalledTimes(1);
      expect(onValidate).toHaveBeenCalledWith('1234');
    });

    it('should support backspace to delete last digit', async () => {
      const onValidate = vi.fn().mockResolvedValue(true);
      render(<PinEntry onValidate={onValidate} />);

      // Enter 3 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));

      // Click backspace button - it's the last button in the keypad grid
      // Buttons order: 1,2,3,4,5,6,7,8,9,clear,0,backspace,cancel
      const buttons = screen.getAllByRole('button');
      // Backspace is index 11 (0-indexed), before Cancel
      const backspaceBtn = buttons[11];
      fireEvent.click(backspaceBtn);

      // Enter 2 more digits (should result in 1245)
      fireEvent.click(screen.getByRole('button', { name: '4' }));
      fireEvent.click(screen.getByRole('button', { name: '5' }));

      // Flush promises for async validation
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidate).toHaveBeenCalledWith('1245');
    });

    it('should support clear button to reset all digits', async () => {
      const onValidate = vi.fn().mockResolvedValue(true);
      render(<PinEntry onValidate={onValidate} />);

      // Enter 3 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));

      // Click clear button - it's at index 9 (after 1-9 buttons)
      // Buttons order: 1,2,3,4,5,6,7,8,9,clear,0,backspace,cancel
      const buttons = screen.getAllByRole('button');
      const clearBtn = buttons[9];
      fireEvent.click(clearBtn);

      // Enter 4 new digits (should start fresh)
      for (const digit of ['5', '6', '7', '8']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises for async validation
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidate).toHaveBeenCalledWith('5678');
    });
  });

  describe('validation', () => {
    it('should call onValidate when 4 digits entered', async () => {
      const onValidate = vi.fn().mockResolvedValue(true);
      render(<PinEntry onValidate={onValidate} />);

      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidate).toHaveBeenCalledWith('1234');
    });

    it('should call onSuccess when validation succeeds', async () => {
      const onValidate = vi.fn().mockResolvedValue(true);
      const onSuccess = vi.fn();
      render(<PinEntry onValidate={onValidate} onSuccess={onSuccess} />);

      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should show error on invalid PIN', async () => {
      const onValidate = vi.fn().mockResolvedValue(false);
      render(<PinEntry onValidate={onValidate} />);

      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    });

    it('should clear PIN after incorrect entry', async () => {
      const onValidate = vi.fn().mockResolvedValue(false);
      render(<PinEntry onValidate={onValidate} />);

      // First attempt
      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();

      // Second attempt should start fresh
      onValidate.mockResolvedValue(true);
      for (const digit of ['5', '6', '7', '8']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidate).toHaveBeenCalledWith('5678');
    });

    it('should show error on validation exception', async () => {
      const onValidate = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<PinEntry onValidate={onValidate} />);

      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
    });

    it('should clear error on new digit input', async () => {
      const onValidate = vi.fn().mockResolvedValue(false);
      render(<PinEntry onValidate={onValidate} />);

      // Enter wrong PIN
      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();

      // Start typing new PIN - error should clear
      fireEvent.click(screen.getByRole('button', { name: '5' }));

      expect(screen.queryByText(/incorrect pin/i)).not.toBeInTheDocument();
    });

    it('should show validating state during validation', async () => {
      // Create a promise that we can control
      let resolveValidation;
      const onValidate = vi.fn().mockImplementation(() =>
        new Promise((resolve) => {
          resolveValidation = resolve;
        })
      );
      render(<PinEntry onValidate={onValidate} />);

      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Should show validating state immediately
      expect(screen.getByText(/validating/i)).toBeInTheDocument();

      // Resolve the validation
      await act(async () => {
        resolveValidation(true);
        await vi.runAllTimersAsync();
      });

      // Validating text should be gone
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument();
    });
  });

  describe('dismissal', () => {
    it('should call onDismiss when cancel clicked', () => {
      const onDismiss = vi.fn();
      render(<PinEntry onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should auto-dismiss after 30 seconds of inactivity', () => {
      const onDismiss = vi.fn();
      render(<PinEntry onDismiss={onDismiss} />);

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should reset timeout on keypad interaction', () => {
      const onDismiss = vi.fn();
      render(<PinEntry onDismiss={onDismiss} />);

      // Wait 20 seconds
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      // Press a digit (resets timeout)
      fireEvent.click(screen.getByRole('button', { name: '1' }));

      // Wait another 20 seconds (total 40s, but should be only 20s since reset)
      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(onDismiss).not.toHaveBeenCalled();

      // Wait 10 more seconds (total 30s since last interaction)
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should reset timeout on backspace interaction', () => {
      const onDismiss = vi.fn();
      render(<PinEntry onDismiss={onDismiss} />);

      // Wait 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Enter a digit then backspace
      fireEvent.click(screen.getByRole('button', { name: '1' }));

      // Backspace is at index 11
      const buttons = screen.getAllByRole('button');
      const backspaceBtn = buttons[11];
      fireEvent.click(backspaceBtn);

      // Wait 25 more seconds - should not dismiss yet
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      expect(onDismiss).not.toHaveBeenCalled();

      // Wait 5 more seconds - total 30s since backspace
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should reset timeout on clear interaction', () => {
      const onDismiss = vi.fn();
      render(<PinEntry onDismiss={onDismiss} />);

      // Wait 29 seconds
      act(() => {
        vi.advanceTimersByTime(29000);
      });

      // Clear button is at index 9
      const buttons = screen.getAllByRole('button');
      const clearBtn = buttons[9];
      fireEvent.click(clearBtn);

      // Wait 29 more seconds - should not dismiss yet
      act(() => {
        vi.advanceTimersByTime(29000);
      });

      expect(onDismiss).not.toHaveBeenCalled();

      // Wait 1 more second - total 30s since clear
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('disabled state during validation', () => {
    it('should disable keypad during validation', async () => {
      let resolveValidation;
      const onValidate = vi.fn().mockImplementation(() =>
        new Promise((resolve) => {
          resolveValidation = resolve;
        })
      );
      render(<PinEntry onValidate={onValidate} />);

      // Enter 4 digits to trigger validation
      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // During validation, buttons should be disabled
      const button1 = screen.getByRole('button', { name: '1' });
      expect(button1).toBeDisabled();

      // Resolve validation
      await act(async () => {
        resolveValidation(false);
        await vi.runAllTimersAsync();
      });

      // After validation, buttons should be enabled again
      expect(screen.getByRole('button', { name: '1' })).not.toBeDisabled();
    });
  });

  describe('PIN dot visual feedback', () => {
    it('should show empty dots initially', () => {
      const { container } = render(<PinEntry />);
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');

      // All dots should have unfilled background (#475569)
      dots.forEach(dot => {
        expect(dot.style.background).toBe('rgb(71, 85, 105)'); // #475569
      });
    });

    it('should fill dots as digits are entered', () => {
      const { container } = render(<PinEntry />);

      // Enter 2 digits
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));

      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');

      // First 2 dots should be filled (#3b82f6), last 2 unfilled
      expect(dots[0].style.background).toBe('rgb(59, 130, 246)'); // #3b82f6
      expect(dots[1].style.background).toBe('rgb(59, 130, 246)');
      expect(dots[2].style.background).toBe('rgb(71, 85, 105)');
      expect(dots[3].style.background).toBe('rgb(71, 85, 105)');
    });
  });

  describe('props handling', () => {
    it('should work without any props', () => {
      expect(() => render(<PinEntry />)).not.toThrow();
    });

    it('should handle missing onValidate gracefully', async () => {
      render(<PinEntry />);

      // Entering 4 digits without onValidate should not throw
      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // After validation completes (with undefined result), it should show error
      // because undefined is falsy and triggers "Incorrect PIN"
      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    });

    it('should handle missing onDismiss gracefully', () => {
      render(<PinEntry />);

      // Clicking cancel without onDismiss should not throw
      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      }).not.toThrow();
    });

    it('should handle missing onSuccess gracefully', async () => {
      const onValidate = vi.fn().mockResolvedValue(true);
      render(<PinEntry onValidate={onValidate} />);

      // Entering correct PIN without onSuccess should not throw
      for (const digit of ['1', '2', '3', '4']) {
        fireEvent.click(screen.getByRole('button', { name: digit }));
      }

      // Flush promises
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onValidate).toHaveBeenCalled();
    });
  });
});
