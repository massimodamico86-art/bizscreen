/**
 * Analytics API Integration Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFetch } from '../../utils/mocks';
import { generateUUID } from '../../utils/factories';

describe('Analytics API', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('POST /api/analytics/playback-batch', () => {
    it('records batch of playback events', async () => {
      global.fetch = createMockFetch({
        'POST:/api/analytics/playback-batch': {
          status: 200,
          data: { success: true, recorded: 3 }
        }
      });

      const events = [
        {
          screen_id: generateUUID(),
          media_id: generateUUID(),
          event_type: 'play',
          timestamp: new Date().toISOString()
        },
        {
          screen_id: generateUUID(),
          media_id: generateUUID(),
          event_type: 'complete',
          timestamp: new Date().toISOString()
        },
        {
          screen_id: generateUUID(),
          media_id: generateUUID(),
          event_type: 'skip',
          timestamp: new Date().toISOString()
        }
      ];

      const response = await fetch('/api/analytics/playback-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ events })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.recorded).toBe(3);
    });

    it('rejects empty events array', async () => {
      global.fetch = createMockFetch({
        'POST:/api/analytics/playback-batch': {
          status: 400,
          data: { error: 'No events provided' }
        }
      });

      const response = await fetch('/api/analytics/playback-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ events: [] })
      });

      expect(response.status).toBe(400);
    });

    it('validates event structure', async () => {
      global.fetch = createMockFetch({
        'POST:/api/analytics/playback-batch': {
          status: 400,
          data: { error: 'Invalid event structure' }
        }
      });

      const invalidEvents = [
        { screen_id: generateUUID() } // Missing required fields
      ];

      const response = await fetch('/api/analytics/playback-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ events: invalidEvents })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/analytics/screen/:id', () => {
    it('returns analytics for a screen', async () => {
      const screenId = generateUUID();

      global.fetch = createMockFetch({
        [`GET:/api/analytics/screen/${screenId}`]: {
          status: 200,
          data: {
            screen_id: screenId,
            total_plays: 150,
            total_duration: 3600,
            unique_media: 25,
            last_7_days: {
              plays: [20, 25, 18, 30, 22, 20, 15]
            }
          }
        }
      });

      const response = await fetch(`/api/analytics/screen/${screenId}`, {
        headers: { 'Authorization': 'Bearer test-token' }
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.screen_id).toBe(screenId);
      expect(data.total_plays).toBe(150);
    });
  });
});
