/**
 * Social Feed Moderation Service Unit Tests
 *
 * Tests for fetchPendingModerationItems, approveModerationItem, and rejectModerationItem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
// Chainable mock that supports: from, select, eq, is, order, upsert, single, auth.getUser
const createChainableMock = (finalValue = { data: null, error: null }) => {
  const chain = {};
  const methods = ['select', 'eq', 'is', 'order', 'upsert'];
  methods.forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue(finalValue);
  return chain;
};

vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainableMock({ data: null, error: null })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  },
}));

vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn(),
}));

// Import after mocking
import {
  fetchPendingModerationItems,
  approveModerationItem,
  rejectModerationItem,
} from '../../../src/services/socialFeedModerationService';
import { supabase } from '../../../src/supabase';
import { getEffectiveOwnerId } from '../../../src/services/tenantService';

describe('socialFeedModerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: owner resolves to 'tenant-1'
    getEffectiveOwnerId.mockResolvedValue('tenant-1');
    // Default: auth.getUser resolves to user-1
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  describe('fetchPendingModerationItems', () => {
    it('returns only social_feeds rows with NO matching social_feed_moderation row for the current owner', async () => {
      const mockItem = {
        id: 'feed-1',
        provider: 'instagram',
        content_text: 'hi',
        media_url: null,
        media_type: null,
        thumbnail_url: null,
        permalink: null,
        author_name: null,
        author_avatar: null,
        posted_at: '2026-04-10T00:00:00Z',
        created_at: '2026-04-10T00:00:00Z',
        moderation: null,
      };

      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: [mockItem], error: null }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await fetchPendingModerationItems();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('feed-1');
      expect(result[0].provider).toBe('instagram');
      // moderation key must be stripped before returning
      expect(result[0].moderation).toBeUndefined();
    });

    it('returns empty array when no pending items exist', async () => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await fetchPendingModerationItems();

      expect(result).toEqual([]);
    });

    it('returns empty array and logs when getEffectiveOwnerId returns null', async () => {
      getEffectiveOwnerId.mockResolvedValue(null);

      const result = await fetchPendingModerationItems();

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('throws when supabase returns an error', async () => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
      };
      supabase.from.mockReturnValue(chain);

      await expect(fetchPendingModerationItems()).rejects.toThrow(/boom/);
    });
  });

  describe('approveModerationItem', () => {
    it('upserts a row with approved=true, correct tenant_id, feed_id, moderated_by', async () => {
      const mockUpsertChain = {
        upsert: vi.fn(() => mockUpsertChain),
        select: vi.fn(() => mockUpsertChain),
        single: vi.fn().mockResolvedValue({
          data: { id: 'mod-1', feed_id: 'feed-1', approved: true },
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockUpsertChain);

      const result = await approveModerationItem('feed-1');

      expect(mockUpsertChain.upsert).toHaveBeenCalledWith(
        {
          tenant_id: 'tenant-1',
          feed_id: 'feed-1',
          approved: true,
          moderated_by: 'user-1',
        },
        { onConflict: 'tenant_id,feed_id' }
      );
      expect(result).toEqual({ id: 'mod-1', feed_id: 'feed-1', approved: true });
    });

    it('throws when upsert returns an error', async () => {
      const mockUpsertChain = {
        upsert: vi.fn(() => mockUpsertChain),
        select: vi.fn(() => mockUpsertChain),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'upsert failed' },
        }),
      };
      supabase.from.mockReturnValue(mockUpsertChain);

      await expect(approveModerationItem('feed-1')).rejects.toThrow();
    });
  });

  describe('rejectModerationItem', () => {
    it('upserts a row with approved=false', async () => {
      const mockUpsertChain = {
        upsert: vi.fn(() => mockUpsertChain),
        select: vi.fn(() => mockUpsertChain),
        single: vi.fn().mockResolvedValue({
          data: { id: 'mod-2', feed_id: 'feed-1', approved: false },
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockUpsertChain);

      const result = await rejectModerationItem('feed-1');

      expect(mockUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ approved: false }),
        { onConflict: 'tenant_id,feed_id' }
      );
      expect(result).toEqual({ id: 'mod-2', feed_id: 'feed-1', approved: false });
    });

    it('throws when upsert returns an error', async () => {
      const mockUpsertChain = {
        upsert: vi.fn(() => mockUpsertChain),
        select: vi.fn(() => mockUpsertChain),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'reject failed' },
        }),
      };
      supabase.from.mockReturnValue(mockUpsertChain);

      await expect(rejectModerationItem('feed-1')).rejects.toThrow();
    });
  });
});
