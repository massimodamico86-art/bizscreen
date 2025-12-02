/**
 * Billing Service Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapSubscriptionToUiState,
  getStatusColor,
  getStatusText,
  formatTrialRemaining,
  checkCheckoutResult,
  clearCheckoutResult
} from '../../../src/services/billingService';

describe('billingService', () => {
  describe('mapSubscriptionToUiState', () => {
    it('returns free state for null subscription', () => {
      const state = mapSubscriptionToUiState(null);

      expect(state.state).toBe('free');
      expect(state.canUpgrade).toBe(true);
      expect(state.canManageBilling).toBe(false);
    });

    it('returns free state for free status', () => {
      const state = mapSubscriptionToUiState({ status: 'free' });

      expect(state.state).toBe('free');
      expect(state.message).toContain('Free plan');
      expect(state.canUpgrade).toBe(true);
      expect(state.canManageBilling).toBe(false);
    });

    it('handles trialing status with days remaining', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const state = mapSubscriptionToUiState({
        status: 'trialing',
        planSlug: 'starter',
        planName: 'Starter',
        trialEndsAt: futureDate.toISOString()
      });

      expect(state.state).toBe('trialing');
      expect(state.trialDaysLeft).toBe(7);
      expect(state.message).toContain('trial');
      expect(state.message).toContain('7 days');
      expect(state.canManageBilling).toBe(true);
    });

    it('handles active subscription', () => {
      const state = mapSubscriptionToUiState({
        status: 'active',
        planSlug: 'pro',
        planName: 'Pro',
        currentPeriodEnd: new Date().toISOString()
      });

      expect(state.state).toBe('active');
      expect(state.message).toContain('Pro');
      expect(state.canManageBilling).toBe(true);
      expect(state.showWarning).toBe(false);
    });

    it('shows warning for subscription set to cancel', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const state = mapSubscriptionToUiState({
        status: 'active',
        planSlug: 'starter',
        planName: 'Starter',
        currentPeriodEnd: futureDate.toISOString(),
        cancelAtPeriodEnd: true
      });

      expect(state.state).toBe('active');
      expect(state.showWarning).toBe(true);
      expect(state.warningMessage).toContain('cancel');
    });

    it('handles past_due status', () => {
      const state = mapSubscriptionToUiState({
        status: 'past_due',
        planSlug: 'starter',
        planName: 'Starter'
      });

      expect(state.state).toBe('past_due');
      expect(state.showWarning).toBe(true);
      expect(state.warningMessage).toContain('payment');
      expect(state.canUpgrade).toBe(false);
      expect(state.canManageBilling).toBe(true);
    });

    it('handles canceled status', () => {
      const state = mapSubscriptionToUiState({
        status: 'canceled',
        planSlug: 'starter',
        planName: 'Starter'
      });

      expect(state.state).toBe('canceled');
      expect(state.message).toContain('canceled');
      expect(state.canUpgrade).toBe(true);
      expect(state.canManageBilling).toBe(false);
    });

    it('handles expired status', () => {
      const state = mapSubscriptionToUiState({
        status: 'expired',
        planSlug: 'starter',
        planName: 'Starter'
      });

      expect(state.state).toBe('expired');
      expect(state.message).toContain('expired');
      expect(state.canUpgrade).toBe(true);
      expect(state.canManageBilling).toBe(false);
    });

    it('sets canUpgrade false for pro plan', () => {
      const state = mapSubscriptionToUiState({
        status: 'active',
        planSlug: 'pro',
        planName: 'Pro'
      });

      expect(state.canUpgrade).toBe(false);
    });
  });

  describe('getStatusColor', () => {
    it('returns green for active', () => {
      expect(getStatusColor('active')).toContain('green');
    });

    it('returns blue for trialing', () => {
      expect(getStatusColor('trialing')).toContain('blue');
    });

    it('returns yellow for past_due', () => {
      expect(getStatusColor('past_due')).toContain('yellow');
    });

    it('returns red for canceled', () => {
      expect(getStatusColor('canceled')).toContain('red');
    });

    it('returns red for expired', () => {
      expect(getStatusColor('expired')).toContain('red');
    });

    it('returns gray for unknown status', () => {
      expect(getStatusColor('unknown')).toContain('gray');
    });
  });

  describe('getStatusText', () => {
    it('returns correct text for each status', () => {
      expect(getStatusText('active')).toBe('Active');
      expect(getStatusText('trialing')).toBe('Trial');
      expect(getStatusText('past_due')).toBe('Past Due');
      expect(getStatusText('canceled')).toBe('Canceled');
      expect(getStatusText('expired')).toBe('Expired');
      expect(getStatusText('none')).toBe('Free');
    });

    it('returns the status itself for unknown values', () => {
      expect(getStatusText('custom_status')).toBe('custom_status');
    });
  });

  describe('formatTrialRemaining', () => {
    it('returns empty string for null', () => {
      expect(formatTrialRemaining(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatTrialRemaining(undefined)).toBe('');
    });

    it('returns "Trial expired" for zero days', () => {
      expect(formatTrialRemaining(0)).toBe('Trial expired');
    });

    it('returns "Trial expired" for negative days', () => {
      expect(formatTrialRemaining(-5)).toBe('Trial expired');
    });

    it('returns singular form for 1 day', () => {
      expect(formatTrialRemaining(1)).toBe('1 day left');
    });

    it('returns plural form for multiple days', () => {
      expect(formatTrialRemaining(7)).toBe('7 days left');
      expect(formatTrialRemaining(14)).toBe('14 days left');
    });
  });

  describe('checkCheckoutResult', () => {
    beforeEach(() => {
      // Reset window.location
      delete window.location;
      window.location = {
        search: '',
        hash: ''
      };
    });

    it('returns success with session_id from query params', () => {
      window.location.search = '?session_id=cs_test_123';
      window.location.hash = '';

      const result = checkCheckoutResult();

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('cs_test_123');
    });

    it('returns canceled true when canceled=1', () => {
      window.location.search = '?canceled=1';
      window.location.hash = '';

      const result = checkCheckoutResult();

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns success with session_id from hash params', () => {
      window.location.search = '';
      window.location.hash = '#account-plan?session_id=cs_test_456';

      const result = checkCheckoutResult();

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('cs_test_456');
    });

    it('returns canceled from hash params', () => {
      window.location.search = '';
      window.location.hash = '#account-plan?canceled=1';

      const result = checkCheckoutResult();

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns not successful with no params', () => {
      window.location.search = '';
      window.location.hash = '';

      const result = checkCheckoutResult();

      expect(result.success).toBe(false);
      expect(result.sessionId).toBeUndefined();
      expect(result.canceled).toBeUndefined();
    });
  });
});
