/**
 * useBodyScrollLock
 * Prevents body scroll when modal/overlay is open.
 * Handles iOS Safari quirks with touch-action and position fixed.
 */
import { useEffect } from 'react';

export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;

    // Store original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const scrollY = window.scrollY;

    // Lock body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restore
      document.body.style.overflow = originalStyle;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export default useBodyScrollLock;
