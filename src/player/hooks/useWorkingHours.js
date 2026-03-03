/**
 * useWorkingHours - Hook to check if current time is within configured working hours
 *
 * Checks every 60 seconds and updates state. Returns true if no working hours
 * are configured (screen is always on).
 *
 * @module player/hooks/useWorkingHours
 */

import { useState, useEffect, useRef } from 'react';
import { isWithinWorkingHours } from '../../services/workingHoursService';
import { createScopedLogger } from '../../services/loggingService';

const logger = createScopedLogger('Player:WorkingHours');

const CHECK_INTERVAL_MS = 60000; // 60 seconds

/**
 * Hook that checks working hours on a 60-second interval.
 *
 * @param {Object|null} workingHours - JSONB working hours config, or null (always on)
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {boolean} True if within working hours or no hours configured
 */
export function useWorkingHours(workingHours, timezone) {
  const [isWithinHours, setIsWithinHours] = useState(true);
  const prevValueRef = useRef(true);

  useEffect(() => {
    // If no working hours configured, screen is always on
    if (!workingHours) {
      if (!prevValueRef.current) {
        logger.info('Working hours cleared, screen always on');
      }
      setIsWithinHours(true);
      prevValueRef.current = true;
      return;
    }

    const check = () => {
      const result = isWithinWorkingHours(workingHours, timezone);

      // Log state transitions
      if (prevValueRef.current !== result) {
        if (result) {
          logger.info('Entering working hours, resuming content display', { timezone });
        } else {
          logger.info('Leaving working hours, blanking screen', { timezone });
        }
      }

      prevValueRef.current = result;
      setIsWithinHours(result);
    };

    // Check immediately on mount / when config changes
    check();

    // Re-check every 60 seconds
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [workingHours, timezone]);

  return isWithinHours;
}
