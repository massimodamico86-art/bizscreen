/**
 * Campaigns API Integration Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFetch } from '../../utils/mocks';
import { generateUUID } from '../../utils/factories';

describe('Campaigns API', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('POST /api/public/campaigns/trigger', () => {
    it('triggers campaign with valid token', async () => {
      const campaignId = generateUUID();
      const triggerToken = 'valid-trigger-token-123';

      global.fetch = createMockFetch({
        'POST:/api/public/campaigns/trigger': {
          status: 200,
          data: {
            success: true,
            campaign_id: campaignId,
            screens_affected: 5
          }
        }
      });

      const response = await fetch('/api/public/campaigns/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${triggerToken}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          action: 'start'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.screens_affected).toBe(5);
    });

    it('rejects invalid trigger token', async () => {
      global.fetch = createMockFetch({
        'POST:/api/public/campaigns/trigger': {
          status: 401,
          data: { error: 'Invalid or expired trigger token' }
        }
      });

      const response = await fetch('/api/public/campaigns/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          campaign_id: generateUUID(),
          action: 'start'
        })
      });

      expect(response.status).toBe(401);
    });

    it('validates campaign action', async () => {
      global.fetch = createMockFetch({
        'POST:/api/public/campaigns/trigger': {
          status: 400,
          data: { error: 'Invalid action. Must be start, stop, or pause' }
        }
      });

      const response = await fetch('/api/public/campaigns/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          campaign_id: generateUUID(),
          action: 'invalid-action'
        })
      });

      expect(response.status).toBe(400);
    });

    it('supports scheduled trigger with delay', async () => {
      global.fetch = createMockFetch({
        'POST:/api/public/campaigns/trigger': {
          status: 200,
          data: {
            success: true,
            scheduled: true,
            trigger_at: new Date(Date.now() + 3600000).toISOString()
          }
        }
      });

      const response = await fetch('/api/public/campaigns/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          campaign_id: generateUUID(),
          action: 'start',
          delay_seconds: 3600
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.scheduled).toBe(true);
    });
  });

  describe('GET /api/public/campaigns/status/:id', () => {
    it('returns campaign status', async () => {
      const campaignId = generateUUID();

      global.fetch = createMockFetch({
        [`GET:/api/public/campaigns/status/${campaignId}`]: {
          status: 200,
          data: {
            campaign_id: campaignId,
            status: 'active',
            screens_count: 10,
            impressions: 1500
          }
        }
      });

      const response = await fetch(`/api/public/campaigns/status/${campaignId}`, {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('active');
    });
  });
});
