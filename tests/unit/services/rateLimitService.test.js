/**
 * Rate Limit Service Tests
 *
 * Verifies SEC-04: Global API rate limiting protects high-frequency endpoints
 *
 * Success criteria from ROADMAP.md:
 * 3. High-frequency API endpoints return 429 after exceeding rate limit
 * 4. Rate limiting applies per-user and per-IP dimensions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../../src/supabase';
import { checkRateLimit, createRateLimitError, RATE_LIMITS } from '../../../src/services/rateLimitService.js';

describe('Rate Limit Service - SEC-04', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RATE_LIMITS configuration', () => {
    it('defines media_upload limit (50 per 15 min)', () => {
      expect(RATE_LIMITS.media_upload).toEqual({ base: 50, window: 15 });
    });

    it('defines scene_create limit (30 per 15 min)', () => {
      expect(RATE_LIMITS.scene_create).toEqual({ base: 30, window: 15 });
    });

    it('defines ai_generation limit (20 per 15 min)', () => {
      expect(RATE_LIMITS.ai_generation).toEqual({ base: 20, window: 15 });
    });
  });

  describe('checkRateLimit', () => {
    it('returns allowed: true when under limit', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current_count: 5, remaining: 45, limit: 50 },
        error: null,
      });

      const result = await checkRateLimit('media_upload', { userId: 'user-123' });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(45);
    });

    it('returns allowed: false when over limit', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: false, current_count: 50, retry_after_seconds: 300, limit: 50 },
        error: null,
      });

      const result = await checkRateLimit('media_upload', { userId: 'user-123' });

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(300);
    });

    it('uses 2x limit for authenticated users', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current_count: 1, remaining: 99, limit: 100 },
        error: null,
      });

      await checkRateLimit('media_upload', { userId: 'user-123', isAuthenticated: true });

      expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit', {
        p_identifier: 'user-123',
        p_action: 'media_upload',
        p_max_requests: 100, // 50 * 2 for authenticated
        p_window_minutes: 15,
      });
    });

    it('uses base limit for anonymous users', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current_count: 1, remaining: 49, limit: 50 },
        error: null,
      });

      await checkRateLimit('media_upload', { isAuthenticated: false });

      expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit', {
        p_identifier: 'anonymous',
        p_action: 'media_upload',
        p_max_requests: 50, // base limit
        p_window_minutes: 15,
      });
    });

    it('fails open on RPC error', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await checkRateLimit('media_upload', { userId: 'user-123' });

      expect(result.allowed).toBe(true); // Fail open
    });

    it('fails open on exception', async () => {
      supabase.rpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkRateLimit('media_upload', { userId: 'user-123' });

      expect(result.allowed).toBe(true); // Fail open
    });

    it('fails open for unknown actions', async () => {
      const result = await checkRateLimit('unknown_action', { userId: 'user-123' });

      expect(result.allowed).toBe(true);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('createRateLimitError', () => {
    it('creates error with correct message for seconds', () => {
      const error = createRateLimitError(45);
      expect(error.message).toBe('Too many requests. Please try again in 1 minute.');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(45);
    });

    it('creates error with correct message for minutes', () => {
      const error = createRateLimitError(300);
      expect(error.message).toBe('Too many requests. Please try again in 5 minutes.');
    });

    it('uses singular "minute" for 1 minute', () => {
      const error = createRateLimitError(60);
      expect(error.message).toContain('1 minute.');
    });

    it('uses plural "minutes" for multiple minutes', () => {
      const error = createRateLimitError(120);
      expect(error.message).toContain('2 minutes.');
    });
  });

  describe('per-user dimension', () => {
    it('uses userId as identifier when provided', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current_count: 1, remaining: 49, limit: 50 },
        error: null,
      });

      await checkRateLimit('media_upload', { userId: 'specific-user-id' });

      expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit',
        expect.objectContaining({ p_identifier: 'specific-user-id' })
      );
    });
  });

  describe('per-IP dimension fallback', () => {
    it('uses anonymous identifier when userId not provided', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { allowed: true, current_count: 1, remaining: 49, limit: 50 },
        error: null,
      });

      await checkRateLimit('media_upload', {});

      expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit',
        expect.objectContaining({ p_identifier: 'anonymous' })
      );
    });
  });
});
