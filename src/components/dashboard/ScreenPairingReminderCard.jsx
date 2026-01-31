/**
 * ScreenPairingReminderCard Component
 *
 * Dashboard reminder card for users who skipped screen pairing during onboarding.
 * Shows a prominent CTA to pair their first screen.
 *
 * Visibility conditions:
 * - User completed or skipped onboarding (is_complete = true OR skipped_at IS NOT NULL)
 * - User never paired a screen (screen_pairing_completed_at IS NULL)
 * - User has no paired devices (tv_devices WHERE is_paired = true count = 0)
 * - Card not dismissed via localStorage
 *
 * @module components/dashboard/ScreenPairingReminderCard
 */
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Monitor, ArrowRight, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { Button, Card } from '../../design-system';
import { createScopedLogger } from '../../services/loggingService';

const logger = createScopedLogger('ScreenPairingReminderCard');

/**
 * localStorage key for tracking card dismissal
 * Stores timestamp for potential 7-day reset
 */
const DISMISS_KEY = 'bizscreen_pairing_reminder_dismissed';

/**
 * Days until dismissed state resets
 */
const DISMISS_RESET_DAYS = 7;

/**
 * Check if card was dismissed within the reset period
 * @returns {boolean}
 */
function isDismissed() {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;

    const dismissedTime = parseInt(dismissedAt, 10);
    const now = Date.now();
    const daysSinceDismiss = (now - dismissedTime) / (1000 * 60 * 60 * 24);

    // Reset after 7 days
    return daysSinceDismiss < DISMISS_RESET_DAYS;
  } catch {
    return false;
  }
}

/**
 * Mark card as dismissed
 */
function dismissCard() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // localStorage not available
  }
}

/**
 * ScreenPairingReminderCard - Prompt to pair first screen
 *
 * Self-determines visibility based on:
 * - Onboarding state (complete/skipped but no screen pairing)
 * - Paired devices count
 * - Dismiss state in localStorage
 *
 * @param {Object} props
 * @param {Function} [props.onNavigate] - Navigation handler (receives 'screens')
 */
export function ScreenPairingReminderCard({ onNavigate }) {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkVisibility();
  }, []);

  /**
   * Check all visibility conditions
   */
  async function checkVisibility() {
    try {
      // Check localStorage dismissal first (quick check)
      if (isDismissed()) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch onboarding state and paired device count in parallel
      const [onboardingResult, pairedDevicesResult] = await Promise.all([
        supabase
          .from('onboarding_progress')
          .select('is_complete, skipped_at, screen_pairing_completed_at')
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase
          .from('tv_devices')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('is_paired', true)
      ]);

      if (onboardingResult.error) {
        logger.error('Error fetching onboarding progress:', { error: onboardingResult.error });
        setLoading(false);
        return;
      }

      if (pairedDevicesResult.error) {
        logger.error('Error fetching paired devices:', { error: pairedDevicesResult.error });
        setLoading(false);
        return;
      }

      const progress = onboardingResult.data;
      const hasPairedDevices = (pairedDevicesResult.count || 0) > 0;

      // Visibility conditions:
      // 1. User has onboarding record
      // 2. Onboarding is complete or was skipped
      // 3. Screen pairing was never completed
      // 4. User has no paired devices
      const onboardingDone = progress?.is_complete || progress?.skipped_at;
      const neverPaired = !progress?.screen_pairing_completed_at;
      const noPairedDevices = !hasPairedDevices;

      const showCard = Boolean(progress && onboardingDone && neverPaired && noPairedDevices);

      setShouldShow(showCard);
      setLoading(false);
    } catch (err) {
      logger.error('Error checking visibility:', { error: err });
      setLoading(false);
    }
  }

  /**
   * Handle dismiss click
   */
  function handleDismiss() {
    dismissCard();
    setDismissed(true);
  }

  /**
   * Handle CTA click
   */
  function handleSetupScreen() {
    onNavigate?.('screens');
  }

  // Don't render while loading or if should not show
  if (loading || !shouldShow || dismissed) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-l-teal-500 border-teal-200">
      <div className="p-4 flex items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-teal-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">Connect Your First Screen</p>
          <p className="text-sm text-gray-600 mt-0.5">
            Pair a TV or display to start showing your content
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Dismiss reminder"
          >
            <X size={18} />
          </button>
          <Button
            size="sm"
            onClick={handleSetupScreen}
          >
            Set Up Screen
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

ScreenPairingReminderCard.propTypes = {
  onNavigate: PropTypes.func,
};

export default ScreenPairingReminderCard;
