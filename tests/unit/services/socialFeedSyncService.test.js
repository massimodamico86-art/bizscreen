/**
 * Social Feed Sync Service Unit Tests
 *
 * Tests for social feed synchronization, caching, and widget settings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'updated-id' }, error: null }),
          })),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'upserted-id' }, error: null }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn().mockResolvedValue('test-tenant-123'),
}));

// Import after mocking
import {
  getSocialFeedPosts,
  getCachedPosts,
  saveFeedWidgetSettings,
  getFeedWidgetSettings,
  moderatePost,
  getConnectedAccounts,
} from '../../../src/services/socialFeedSyncService';

import { supabase } from '../../../src/supabase';

// ============================================================================
// GET SOCIAL FEED POSTS TESTS
// ============================================================================

describe('socialFeedSyncService getSocialFeedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls RPC with widget ID', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getSocialFeedPosts('widget-123');

    expect(supabase.rpc).toHaveBeenCalledWith('get_social_feed_posts', {
      p_widget_id: 'widget-123',
      p_tenant_id: null,
    });
  });

  it('passes tenant ID when provided', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getSocialFeedPosts('widget-123', 'tenant-456');

    expect(supabase.rpc).toHaveBeenCalledWith('get_social_feed_posts', {
      p_widget_id: 'widget-123',
      p_tenant_id: 'tenant-456',
    });
  });

  it('returns posts from RPC response', async () => {
    const mockPosts = [
      { id: '1', content_text: 'Post 1' },
      { id: '2', content_text: 'Post 2' },
    ];
    supabase.rpc.mockResolvedValueOnce({ data: mockPosts, error: null });

    const result = await getSocialFeedPosts('widget-123');

    expect(result).toEqual(mockPosts);
  });

  it('returns empty array when data is null', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await getSocialFeedPosts('widget-123');

    expect(result).toEqual([]);
  });

  it('throws error on RPC failure', async () => {
    const mockError = new Error('RPC failed');
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError });

    await expect(getSocialFeedPosts('widget-123')).rejects.toThrow('RPC failed');
  });
});

// ============================================================================
// GET CACHED POSTS TESTS
// ============================================================================

describe('socialFeedSyncService getCachedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches from social_feeds table', async () => {
    const mockPosts = [{ id: '1', content_text: 'Post 1' }];
    const mockLimit = vi.fn().mockResolvedValue({ data: mockPosts, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await getCachedPosts('account-123');

    expect(supabase.from).toHaveBeenCalledWith('social_feeds');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('account_id', 'account-123');
    expect(result).toEqual(mockPosts);
  });

  it('respects custom limit', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ select: mockSelect });

    await getCachedPosts('account-123', 10);

    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('orders by posted_at descending', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ select: mockSelect });

    await getCachedPosts('account-123');

    expect(mockOrder).toHaveBeenCalledWith('posted_at', { ascending: false });
  });
});

// ============================================================================
// SAVE FEED WIDGET SETTINGS TESTS
// ============================================================================

describe('socialFeedSyncService saveFeedWidgetSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts settings to social_feed_settings table', async () => {
    const mockSettings = {
      widget_id: 'widget-123',
      provider: 'instagram',
      account_id: 'account-456',
      layout: 'carousel',
      max_items: 6,
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockSettings, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    const result = await saveFeedWidgetSettings(mockSettings);

    expect(supabase.from).toHaveBeenCalledWith('social_feed_settings');
    expect(mockUpsert).toHaveBeenCalled();
    expect(result).toEqual(mockSettings);
  });

  it('throws error on save failure', async () => {
    const mockSettings = { widget_id: 'widget-123' };
    const mockError = new Error('Save failed');
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    await expect(saveFeedWidgetSettings(mockSettings)).rejects.toThrow('Save failed');
  });
});

// ============================================================================
// GET FEED WIDGET SETTINGS TESTS
// ============================================================================

describe('socialFeedSyncService getFeedWidgetSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings by widget ID', async () => {
    const mockSettings = {
      widget_id: 'widget-123',
      provider: 'instagram',
      layout: 'grid',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: mockSettings, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await getFeedWidgetSettings('widget-123');

    expect(supabase.from).toHaveBeenCalledWith('social_feed_settings');
    expect(mockEq).toHaveBeenCalledWith('widget_id', 'widget-123');
    expect(result).toEqual(mockSettings);
  });

  it('returns null when settings not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await getFeedWidgetSettings('widget-123');

    expect(result).toBeNull();
  });
});

// ============================================================================
// MODERATE POST TESTS
// ============================================================================

describe('socialFeedSyncService moderatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts moderation record', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { feed_id: 'feed-123', approved: true },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    const result = await moderatePost('feed-123', true, 'Approved by admin');

    expect(supabase.from).toHaveBeenCalledWith('social_feed_moderation');
    expect(result.approved).toBe(true);
  });

  it('handles rejection with notes', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { feed_id: 'feed-123', approved: false, notes: 'Contains spam' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    const result = await moderatePost('feed-123', false, 'Contains spam');

    expect(result.approved).toBe(false);
    expect(result.notes).toBe('Contains spam');
  });
});

// ============================================================================
// GET CONNECTED ACCOUNTS TESTS
// ============================================================================

describe('socialFeedSyncService getConnectedAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches active accounts from social_accounts table', async () => {
    const mockAccounts = [
      { id: '1', provider: 'instagram', account_name: '@business' },
      { id: '2', provider: 'facebook', account_name: 'My Page' },
    ];

    // Mock the query chain
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
    };
    const mockSelect = vi.fn().mockReturnValue(mockQuery);
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await getConnectedAccounts();

    expect(supabase.from).toHaveBeenCalledWith('social_accounts');
    expect(result).toEqual(mockAccounts);
  });

  it('returns empty array when no accounts', async () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mockSelect = vi.fn().mockReturnValue(mockQuery);
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await getConnectedAccounts();

    expect(result).toEqual([]);
  });

  it('throws error on fetch failure', async () => {
    const mockError = new Error('Fetch failed');
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    };
    const mockSelect = vi.fn().mockReturnValue(mockQuery);
    supabase.from.mockReturnValue({ select: mockSelect });

    await expect(getConnectedAccounts()).rejects.toThrow('Fetch failed');
  });
});
