/**
 * PinEntry - Full-screen numeric keypad for kiosk exit
 *
 * Features:
 * - 4-digit PIN input with dot indicators
 * - ATM-style numeric keypad (1-9, clear, 0, backspace)
 * - Wrong PIN feedback with immediate retry
 * - 30-second inactivity auto-dismissal
 * - Touch-friendly buttons for TV/kiosk use
 *
 * @module player/components/PinEntry
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const PIN_LENGTH = 4;
const INACTIVITY_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Full-screen PIN entry component
 *
 * @param {Object} props
 * @param {Function} props.onValidate - Async function to validate PIN, returns boolean
 * @param {Function} props.onDismiss - Called when user cancels or times out
 * @param {Function} props.onSuccess - Called when PIN is validated successfully
 */
export function PinEntry({ onValidate, onDismiss, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const timeoutRef = useRef(null);

  // Reset inactivity timeout on any interaction
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onDismiss?.();
    }, INACTIVITY_TIMEOUT_MS);
  }, [onDismiss]);

  // Initialize and cleanup timeout
  useEffect(() => {
    resetTimeout();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  // Handle digit press
  const handleDigit = useCallback((digit) => {
    resetTimeout();
    setError('');

    if (pin.length < PIN_LENGTH) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-validate when 4 digits entered
      if (newPin.length === PIN_LENGTH) {
        validatePin(newPin);
      }
    }
  }, [pin, resetTimeout]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    resetTimeout();
    setError('');
    setPin(prev => prev.slice(0, -1));
  }, [resetTimeout]);

  // Handle clear
  const handleClear = useCallback(() => {
    resetTimeout();
    setError('');
    setPin('');
  }, [resetTimeout]);

  // Validate PIN
  const validatePin = async (pinToValidate) => {
    setIsValidating(true);
    try {
      const isValid = await onValidate?.(pinToValidate);
      if (isValid) {
        onSuccess?.();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      setError('Validation failed');
      setPin('');
    } finally {
      setIsValidating(false);
    }
  };

  // Keypad button component
  const KeypadButton = ({ value, onClick, wide, children }) => (
    <button
      onClick={() => {
        // For digit buttons (value defined), pass the value
        // For action buttons (clear/backspace), just call onClick
        if (value !== undefined) {
          onClick(value);
        } else {
          onClick();
        }
      }}
      disabled={isValidating}
      style={{
        width: wide ? '100%' : '5rem',
        height: '5rem',
        fontSize: '2rem',
        fontWeight: '600',
        fontFamily: 'system-ui, sans-serif',
        background: isValidating ? '#475569' : '#334155',
        color: '#f1f5f9',
        border: 'none',
        borderRadius: '1rem',
        cursor: isValidating ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s ease',
        touchAction: 'manipulation',
      }}
      onMouseDown={(e) => e.currentTarget.style.background = '#475569'}
      onMouseUp={(e) => e.currentTarget.style.background = '#334155'}
      onTouchStart={(e) => e.currentTarget.style.background = '#475569'}
      onTouchEnd={(e) => e.currentTarget.style.background = '#334155'}
    >
      {children ?? value}
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      zIndex: 9999,
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#f1f5f9',
          marginBottom: '0.5rem',
        }}>
          Enter PIN
        </h2>
        <p style={{
          fontSize: '0.875rem',
          color: '#94a3b8',
        }}>
          Enter your 4-digit PIN to exit kiosk mode
        </p>
      </div>

      {/* PIN dots */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '1.5rem',
              height: '1.5rem',
              borderRadius: '50%',
              background: i < pin.length ? '#3b82f6' : '#475569',
              transition: 'background 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Error message */}
      <div style={{
        height: '1.5rem',
        marginBottom: '1rem',
      }}>
        {error && (
          <p style={{
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}>
            {error}
          </p>
        )}
        {isValidating && (
          <p style={{
            color: '#94a3b8',
            fontSize: '0.875rem',
          }}>
            Validating...
          </p>
        )}
      </div>

      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 5rem)',
        gap: '1rem',
      }}>
        {/* Row 1: 1-2-3 */}
        <KeypadButton value="1" onClick={handleDigit}>1</KeypadButton>
        <KeypadButton value="2" onClick={handleDigit}>2</KeypadButton>
        <KeypadButton value="3" onClick={handleDigit}>3</KeypadButton>

        {/* Row 2: 4-5-6 */}
        <KeypadButton value="4" onClick={handleDigit}>4</KeypadButton>
        <KeypadButton value="5" onClick={handleDigit}>5</KeypadButton>
        <KeypadButton value="6" onClick={handleDigit}>6</KeypadButton>

        {/* Row 3: 7-8-9 */}
        <KeypadButton value="7" onClick={handleDigit}>7</KeypadButton>
        <KeypadButton value="8" onClick={handleDigit}>8</KeypadButton>
        <KeypadButton value="9" onClick={handleDigit}>9</KeypadButton>

        {/* Row 4: Clear-0-Backspace */}
        <KeypadButton onClick={handleClear}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </KeypadButton>
        <KeypadButton value="0" onClick={handleDigit}>0</KeypadButton>
        <KeypadButton onClick={handleBackspace}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </KeypadButton>
      </div>

      {/* Cancel button */}
      <button
        onClick={onDismiss}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: '500',
          fontFamily: 'system-ui, sans-serif',
          background: 'transparent',
          color: '#94a3b8',
          border: '1px solid #475569',
          borderRadius: '0.5rem',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>

      {/* Timeout indicator */}
      <p style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.75rem',
        color: '#64748b',
      }}>
        Auto-dismiss in 30 seconds of inactivity
      </p>
    </div>
  );
}

export default PinEntry;
