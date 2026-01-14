/**
 * Marketplace Service Unit Tests
 *
 * Tests for template marketplace operations including
 * fetching, filtering, access verification, and admin functions.
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
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-template-id' }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'template-id' }, error: null }),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      })),
    },
  },
}));

vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn().mockResolvedValue('test-tenant-123'),
}));

// Import after mocking
import {
  TEMPLATE_TYPES,
  LICENSE_TIERS,
  LICENSE_LABELS,
  fetchMarketplaceTemplates,
  fetchFeaturedTemplates,
  fetchTemplatesByCategory,
  fetchCategories,
  verifyTemplatePermissions,
} from '../../../src/services/marketplaceService';

import { supabase } from '../../../src/supabase';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('marketplaceService constants', () => {
  describe('TEMPLATE_TYPES', () => {
    it('exports SCENE type', () => {
      expect(TEMPLATE_TYPES.SCENE).toBe('scene');
    });

    it('exports SLIDE type', () => {
      expect(TEMPLATE_TYPES.SLIDE).toBe('slide');
    });

    it('exports BLOCK type', () => {
      expect(TEMPLATE_TYPES.BLOCK).toBe('block');
    });
  });

  describe('LICENSE_TIERS', () => {
    it('exports FREE tier', () => {
      expect(LICENSE_TIERS.FREE).toBe('free');
    });

    it('exports PRO tier', () => {
      expect(LICENSE_TIERS.PRO).toBe('pro');
    });

    it('exports ENTERPRISE tier', () => {
      expect(LICENSE_TIERS.ENTERPRISE).toBe('enterprise');
    });
  });

  describe('LICENSE_LABELS', () => {
    it('exports free label', () => {
      expect(LICENSE_LABELS.free).toBe('Free');
    });

    it('exports pro label', () => {
      expect(LICENSE_LABELS.pro).toBe('Pro');
    });

    it('exports enterprise label', () => {
      expect(LICENSE_LABELS.enterprise).toBe('Enterprise');
    });
  });
});

// ============================================================================
// FETCH TEMPLATES TESTS
// ============================================================================

describe('marketplaceService fetchMarketplaceTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls RPC with default parameters', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchMarketplaceTemplates();

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', {
      p_category_id: null,
      p_template_type: null,
      p_license: null,
      p_industry: null,
      p_search: null,
      p_featured_only: false,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it('passes filter parameters to RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchMarketplaceTemplates({
      categoryId: 'cat-123',
      templateType: 'scene',
      license: 'pro',
      industry: 'retail',
      search: 'test',
      featuredOnly: true,
      limit: 20,
      offset: 10,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', {
      p_category_id: 'cat-123',
      p_template_type: 'scene',
      p_license: 'pro',
      p_industry: 'retail',
      p_search: 'test',
      p_featured_only: true,
      p_limit: 20,
      p_offset: 10,
    });
  });

  it('returns templates from RPC response', async () => {
    const mockTemplates = [
      { id: '1', name: 'Template 1' },
      { id: '2', name: 'Template 2' },
    ];
    supabase.rpc.mockResolvedValueOnce({ data: mockTemplates, error: null });

    const result = await fetchMarketplaceTemplates();

    expect(result).toEqual(mockTemplates);
  });

  it('returns empty array when data is null', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchMarketplaceTemplates();

    expect(result).toEqual([]);
  });

  it('throws error on RPC failure', async () => {
    const mockError = new Error('RPC failed');
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError });

    await expect(fetchMarketplaceTemplates()).rejects.toThrow('RPC failed');
  });
});

// ============================================================================
// FETCH FEATURED TEMPLATES TESTS
// ============================================================================

describe('marketplaceService fetchFeaturedTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches with featured flag enabled', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchFeaturedTemplates();

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', expect.objectContaining({
      p_featured_only: true,
      p_limit: 6,
    }));
  });

  it('respects custom limit', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchFeaturedTemplates(10);

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', expect.objectContaining({
      p_limit: 10,
    }));
  });
});

// ============================================================================
// FETCH BY CATEGORY TESTS
// ============================================================================

describe('marketplaceService fetchTemplatesByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches templates for specific category', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchTemplatesByCategory('cat-456');

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', expect.objectContaining({
      p_category_id: 'cat-456',
      p_limit: 20,
    }));
  });

  it('respects custom limit', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchTemplatesByCategory('cat-456', 50);

    expect(supabase.rpc).toHaveBeenCalledWith('get_marketplace_templates', expect.objectContaining({
      p_limit: 50,
    }));
  });
});

// ============================================================================
// FETCH CATEGORIES TESTS
// ============================================================================

describe('marketplaceService fetchCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches from template_categories table', async () => {
    const mockCategories = [
      { id: '1', name: 'Retail', slug: 'retail' },
      { id: '2', name: 'Restaurant', slug: 'restaurant' },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await fetchCategories();

    expect(supabase.from).toHaveBeenCalledWith('template_categories');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('sort_order');
    expect(result).toEqual(mockCategories);
  });

  it('returns empty array on null data', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    supabase.from.mockReturnValue({ select: mockSelect });

    const result = await fetchCategories();

    expect(result).toEqual([]);
  });
});

// ============================================================================
// VERIFY PERMISSIONS TESTS
// ============================================================================

describe('marketplaceService verifyTemplatePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls can_access_template RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: true, error: null });

    await verifyTemplatePermissions('template-123');

    expect(supabase.rpc).toHaveBeenCalledWith('can_access_template', {
      p_template_id: 'template-123',
    });
  });

  it('returns true when user has access', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: true, error: null });

    const result = await verifyTemplatePermissions('template-123');

    expect(result).toBe(true);
  });

  it('returns false when user lacks access', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await verifyTemplatePermissions('template-123');

    expect(result).toBe(false);
  });

  it('throws error on RPC failure', async () => {
    const mockError = new Error('Access check failed');
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError });

    await expect(verifyTemplatePermissions('template-123')).rejects.toThrow('Access check failed');
  });
});
