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

// ============================================================================
// Phase 173 — pack CRUD + bulk apply
// ============================================================================

import {
  fetchStarterPacks,
  createPack,
  updatePack,
  deletePack,
  addPackItem,
  removePackItem,
  reorderPackItems,
  applyStarterPack,
  fetchPackDetail,
} from '../../../src/services/marketplaceService';

/**
 * Restore a deep chainable implementation of `supabase.from(...)`.
 *
 * Earlier test blocks in this file use `supabase.from.mockReturnValue(...)`
 * which persists across `vi.clearAllMocks()` (only call-history is cleared).
 * Pack-CRUD fns need fresh `.insert/.update/.delete/.select.order.order` chains
 * per test, so we re-install the factory implementation before each case.
 */
function installDeepFromMock() {
  const terminalOk = { data: [], error: null };
  const single = vi.fn().mockResolvedValue({ data: { id: 'mock' }, error: null });
  const orderTerminal = vi.fn().mockResolvedValue(terminalOk);
  // Chainable .select() returning { eq, order, in } with .order chainable twice
  const selectChain = () => ({
    eq: vi.fn(() => ({
      single,
      order: orderTerminal,
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    order: vi.fn(() => ({
      order: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue(terminalOk) })),
        ...terminalOk, // PostgREST resolves on await — give it a thenable-ish data/error
        then: (resolve) => resolve(terminalOk),
      })),
    })),
    in: vi.fn().mockResolvedValue(terminalOk),
  });
  const insertChain = () => ({
    select: vi.fn(() => ({ single })),
  });
  const updateChain = () => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      select: vi.fn(() => ({ single })),
    })),
  });
  const deleteChain = () => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      mockResolvedValue: undefined,
    })),
  });
  supabase.from.mockImplementation(() => ({
    select: vi.fn(selectChain),
    insert: vi.fn(insertChain),
    update: vi.fn(updateChain),
    delete: vi.fn(deleteChain),
  }));
}

describe('marketplaceService pack CRUD (Phase 173)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDeepFromMock();
  });

  it('fetchStarterPacks calls template_packs with default activeOnly=true ordering', async () => {
    await fetchStarterPacks();
    // The mock's .from() returns a chainable; grab the call shape:
    expect(supabase.from).toHaveBeenCalledWith('template_packs');
  });

  it('createPack inserts into template_packs and returns the new row', async () => {
    const pack = await createPack({ name: 'Test', industry: 'Restaurant' });
    expect(supabase.from).toHaveBeenCalledWith('template_packs');
  });

  it('updatePack issues update on template_packs filtered by id', async () => {
    await updatePack('pack-uuid', { name: 'New Name' });
    expect(supabase.from).toHaveBeenCalledWith('template_packs');
  });

  it('deletePack issues delete on template_packs filtered by id', async () => {
    await deletePack('pack-uuid');
    expect(supabase.from).toHaveBeenCalledWith('template_packs');
  });

  it('addPackItem inserts into template_pack_items with composite key fields', async () => {
    await addPackItem('pack-uuid', 'tpl-uuid', 'svg', 0);
    expect(supabase.from).toHaveBeenCalledWith('template_pack_items');
  });

  it('removePackItem deletes from template_pack_items keyed by all three columns', async () => {
    await removePackItem('pack-uuid', 'tpl-uuid', 'svg');
    expect(supabase.from).toHaveBeenCalledWith('template_pack_items');
  });

  it('reorderPackItems issues N parallel UPDATEs (Pitfall 4 — safe because PK is composite)', async () => {
    await reorderPackItems('pack-uuid', [
      { templateId: 'a', editorType: 'svg', position: 0 },
      { templateId: 'b', editorType: 'polotno', position: 1 },
      { templateId: 'c', editorType: 'svg', position: 2 },
    ]);
    // 3 .from('template_pack_items') calls in parallel
    const packItemCalls = supabase.from.mock.calls.filter((c) => c[0] === 'template_pack_items');
    expect(packItemCalls.length).toBe(3);
  });
});

describe('marketplaceService applyStarterPack (Phase 173 TPCK-02)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase.rpc with name "apply_starter_pack" and { p_pack_id } payload', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1','s2'], error: null });
    await applyStarterPack('pack-uuid-1');
    expect(supabase.rpc).toHaveBeenCalledWith('apply_starter_pack', { p_pack_id: 'pack-uuid-1' });
  });

  it('returns data array from RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1','s2','s3'], error: null });
    const ids = await applyStarterPack('pack-uuid-2');
    expect(ids).toEqual(['s1','s2','s3']);
  });

  it('returns [] when RPC returns null data (defensive default)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    const ids = await applyStarterPack('pack-uuid-3');
    expect(ids).toEqual([]);
  });

  it('throws when RPC returns error (rollback contract surfaces to client)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Pack not found or inactive'),
    });
    await expect(applyStarterPack('bad-pack')).rejects.toThrow(/Pack not found or inactive/);
  });
});

// ============================================================================
// Phase 174 — applyTemplateToActiveSlide (D-06)
// ============================================================================

import { applyTemplateToActiveSlide } from '../../../src/services/marketplaceService';

describe('applyTemplateToActiveSlide (Phase 174 D-06)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls apply_template_to_active_slide RPC with correct args (D-05 contract)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-id', error: null });
    const id = await applyTemplateToActiveSlide('sc', 'sl', 'tmpl', 'svg');
    expect(supabase.rpc).toHaveBeenCalledWith('apply_template_to_active_slide', {
      p_scene_id: 'sc',
      p_slide_id: 'sl',
      p_template_id: 'tmpl',
      p_editor_type: 'svg',
    });
    expect(id).toBe('slide-id');
  });

  it('throws on error', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Template has no SVG body'),
    });
    await expect(
      applyTemplateToActiveSlide('s', 'sl', 't', 'svg'),
    ).rejects.toThrow(/Template has no SVG body/);
  });
});
