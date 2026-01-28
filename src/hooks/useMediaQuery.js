/**
 * useMediaQuery Hook
 *
 * Custom hook for responsive design that tracks CSS media query matches.
 * Used for conditional rendering based on screen size.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
import { useState, useEffect } from 'react';

/**
 * Hook to track CSS media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} Whether the media query currently matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    // SSR-safe: default to false on server
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Update state if it's different from initial
    if (mediaQuery.matches !== matches) {
      setMatches(mediaQuery.matches);
    }

    // Modern API: addEventListener
    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Convenience hook for common breakpoints matching Tailwind defaults
 * Returns an object with boolean flags for each breakpoint
 */
export function useBreakpoints() {
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2xl = useMediaQuery('(min-width: 1536px)');

  return {
    isMobile: !isSm,      // < 640px
    isSm,                 // >= 640px
    isMd,                 // >= 768px
    isLg,                 // >= 1024px
    isXl,                 // >= 1280px
    is2xl,                // >= 1536px
    isTablet: isSm && !isLg,  // 640px - 1023px
    isDesktop: isLg,          // >= 1024px
  };
}

export default useMediaQuery;
