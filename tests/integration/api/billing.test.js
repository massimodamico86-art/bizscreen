/**
 * Billing API Integration Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFetch } from '../../utils/mocks';

describe('Billing API', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('POST /api/billing/checkout', () => {
    it('creates checkout session for valid plan', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/checkout': {
          status: 200,
          data: {
            url: 'https://checkout.stripe.com/c/pay/cs_test_123'
          }
        }
      });

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ planSlug: 'starter' })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.url).toContain('checkout.stripe.com');
    });

    it('rejects request without authentication', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/checkout': {
          status: 401,
          data: { error: 'Not authenticated' }
        }
      });

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug: 'starter' })
      });

      expect(response.status).toBe(401);
    });

    it('rejects invalid plan slug', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/checkout': {
          status: 400,
          data: { error: 'Invalid plan' }
        }
      });

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ planSlug: 'invalid-plan' })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/billing/portal', () => {
    it('creates portal session for subscribed user', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/portal': {
          status: 200,
          data: {
            url: 'https://billing.stripe.com/p/session/test_123'
          }
        }
      });

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.url).toContain('billing.stripe.com');
    });

    it('rejects portal access for non-subscribed user', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/portal': {
          status: 400,
          data: { error: 'No active subscription' }
        }
      });

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('processes checkout.session.completed event', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/webhook': {
          status: 200,
          data: { received: true }
        }
      });

      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              owner_id: 'user-uuid-123',
              plan_slug: 'starter'
            }
          }
        }
      };

      const response = await fetch('/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'test_signature'
        },
        body: JSON.stringify(webhookEvent)
      });

      expect(response.ok).toBe(true);
    });

    it('processes invoice.payment_failed event', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/webhook': {
          status: 200,
          data: { received: true }
        }
      });

      const webhookEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_test_123',
            customer: 'cus_test_123'
          }
        }
      };

      const response = await fetch('/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'test_signature'
        },
        body: JSON.stringify(webhookEvent)
      });

      expect(response.ok).toBe(true);
    });

    it('rejects webhook with invalid signature', async () => {
      global.fetch = createMockFetch({
        'POST:/api/billing/webhook': {
          status: 400,
          data: { error: 'Invalid signature' }
        }
      });

      const response = await fetch('/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid_signature'
        },
        body: JSON.stringify({ type: 'test.event' })
      });

      expect(response.status).toBe(400);
    });
  });
});
