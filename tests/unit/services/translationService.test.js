/**
 * Translation Service Unit Tests
 * Tests for translation dashboard queries and bulk operations
 *
 * Phase 21-04: Test coverage for multi-language features
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

// Mock loggingService
vi.mock('../../../src/services/loggingService', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('translationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('fetchTranslationDashboard', () => {
    it('calls RPC with correct parameters when filters provided', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'scene-1', name: 'Test Scene' }],
        error: null,
      });

      const { fetchTranslationDashboard } = await import('../../../src/services/translationService');

      await fetchTranslationDashboard({ status: 'draft', languageCode: 'es' });

      expect(supabase.rpc).toHaveBeenCalledWith('get_translation_dashboard', {
        p_status_filter: 'draft',
        p_language_filter: 'es',
      });
    });

    it('passes null for empty filters', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const { fetchTranslationDashboard } = await import('../../../src/services/translationService');

      await fetchTranslationDashboard({});

      expect(supabase.rpc).toHaveBeenCalledWith('get_translation_dashboard', {
        p_status_filter: null,
        p_language_filter: null,
      });
    });

    it('returns empty array when no data', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const { fetchTranslationDashboard } = await import('../../../src/services/translationService');

      const result = await fetchTranslationDashboard();

      expect(result).toEqual([]);
    });

    it('returns data from RPC', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = [
        { id: 'scene-1', name: 'Scene 1', translation_status: 'draft' },
        { id: 'scene-2', name: 'Scene 2', translation_status: 'approved' },
      ];
      supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

      const { fetchTranslationDashboard } = await import('../../../src/services/translationService');

      const result = await fetchTranslationDashboard();

      expect(result).toEqual(mockData);
    });

    it('throws when RPC errors', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { fetchTranslationDashboard } = await import('../../../src/services/translationService');

      await expect(fetchTranslationDashboard()).rejects.toEqual({ message: 'Database error' });
    });
  });

  describe('bulkUpdateStatus', () => {
    it('throws for invalid status', async () => {
      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(['scene-1'], 'invalid'))
        .rejects.toThrow('Invalid status: invalid. Must be one of: draft, review, approved');
    });

    it('throws for empty sceneIds array', async () => {
      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus([], 'draft'))
        .rejects.toThrow('sceneIds must be a non-empty array');
    });

    it('throws for null sceneIds', async () => {
      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(null, 'draft'))
        .rejects.toThrow('sceneIds must be a non-empty array');
    });

    it('calls RPC with correct parameters', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: 3, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await bulkUpdateStatus(['scene-1', 'scene-2', 'scene-3'], 'approved');

      expect(supabase.rpc).toHaveBeenCalledWith('bulk_update_translation_status', {
        p_scene_ids: ['scene-1', 'scene-2', 'scene-3'],
        p_new_status: 'approved',
      });
    });

    it('returns count from RPC', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: 5, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      const result = await bulkUpdateStatus(['s1', 's2', 's3', 's4', 's5'], 'review');

      expect(result).toBe(5);
    });

    it('returns 0 when RPC returns null data', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      const result = await bulkUpdateStatus(['scene-1'], 'draft');

      expect(result).toBe(0);
    });

    it('throws when RPC errors', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(['scene-1'], 'draft'))
        .rejects.toEqual({ message: 'RPC failed' });
    });

    it('accepts valid status: draft', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: 1, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(['scene-1'], 'draft')).resolves.toBe(1);
    });

    it('accepts valid status: review', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: 1, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(['scene-1'], 'review')).resolves.toBe(1);
    });

    it('accepts valid status: approved', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: 1, error: null });

      const { bulkUpdateStatus } = await import('../../../src/services/translationService');

      await expect(bulkUpdateStatus(['scene-1'], 'approved')).resolves.toBe(1);
    });
  });

  describe('updateSceneStatus', () => {
    it('throws for invalid status', async () => {
      const { updateSceneStatus } = await import('../../../src/services/translationService');

      await expect(updateSceneStatus('scene-1', 'invalid'))
        .rejects.toThrow('Invalid status: invalid. Must be one of: draft, review, approved');
    });

    it('calls supabase.from with correct table and params', async () => {
      const { supabase } = await import('../../../src/supabase');

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'scene-1', translation_status: 'approved' },
          error: null,
        }),
      };
      supabase.from.mockReturnValueOnce(mockChain);

      const { updateSceneStatus } = await import('../../../src/services/translationService');

      await updateSceneStatus('scene-1', 'approved');

      expect(supabase.from).toHaveBeenCalledWith('scenes');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          translation_status: 'approved',
        })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'scene-1');
    });

    it('returns updated scene data', async () => {
      const { supabase } = await import('../../../src/supabase');

      const mockScene = { id: 'scene-1', name: 'Test', translation_status: 'review' };
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockScene, error: null }),
      });

      const { updateSceneStatus } = await import('../../../src/services/translationService');

      const result = await updateSceneStatus('scene-1', 'review');

      expect(result).toEqual(mockScene);
    });

    it('throws when update errors', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      const { updateSceneStatus } = await import('../../../src/services/translationService');

      await expect(updateSceneStatus('scene-1', 'draft'))
        .rejects.toEqual({ message: 'Update failed' });
    });
  });

  describe('getAiTranslationSuggestion', () => {
    it('calls fetch with correct URL and body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: { texts: [] } }),
      });

      const { getAiTranslationSuggestion } = await import('../../../src/services/translationService');

      await getAiTranslationSuggestion('scene-123', 'es');

      expect(mockFetch).toHaveBeenCalledWith('/api/translations/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceSceneId: 'scene-123', targetLanguage: 'es' }),
      });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Translation service unavailable' }),
      });

      const { getAiTranslationSuggestion } = await import('../../../src/services/translationService');

      await expect(getAiTranslationSuggestion('scene-123', 'fr'))
        .rejects.toThrow('Translation service unavailable');
    });

    it('throws generic error when response has no error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { getAiTranslationSuggestion } = await import('../../../src/services/translationService');

      await expect(getAiTranslationSuggestion('scene-123', 'de'))
        .rejects.toThrow('Failed to get translation suggestion');
    });

    it('returns parsed JSON on success', async () => {
      const mockResult = {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        translations: {
          texts: ['Hola', 'Mundo'],
        },
        originalTexts: ['Hello', 'World'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const { getAiTranslationSuggestion } = await import('../../../src/services/translationService');

      const result = await getAiTranslationSuggestion('scene-123', 'es');

      expect(result).toEqual(mockResult);
    });
  });

  describe('Constants export', () => {
    it('TRANSLATION_STATUSES has correct values', async () => {
      const { TRANSLATION_STATUSES } = await import('../../../src/services/translationService');

      expect(TRANSLATION_STATUSES).toEqual({
        DRAFT: 'draft',
        REVIEW: 'review',
        APPROVED: 'approved',
      });
    });

    it('STATUS_LABELS has correct mappings', async () => {
      const { STATUS_LABELS } = await import('../../../src/services/translationService');

      expect(STATUS_LABELS).toEqual({
        draft: 'Draft',
        review: 'In Review',
        approved: 'Approved',
      });
    });

    it('STATUS_COLORS has correct mappings', async () => {
      const { STATUS_COLORS } = await import('../../../src/services/translationService');

      expect(STATUS_COLORS.draft).toContain('yellow');
      expect(STATUS_COLORS.review).toContain('blue');
      expect(STATUS_COLORS.approved).toContain('green');
    });

    it('STATUS_COLORS contains Tailwind classes', async () => {
      const { STATUS_COLORS } = await import('../../../src/services/translationService');

      // Verify they're Tailwind-style class strings
      Object.values(STATUS_COLORS).forEach((classes) => {
        expect(classes).toContain('bg-');
        expect(classes).toContain('text-');
        expect(classes).toContain('border-');
      });
    });
  });

  describe('default export', () => {
    it('exports all functions and constants', async () => {
      const service = await import('../../../src/services/translationService');

      // Functions
      expect(typeof service.fetchTranslationDashboard).toBe('function');
      expect(typeof service.bulkUpdateStatus).toBe('function');
      expect(typeof service.updateSceneStatus).toBe('function');
      expect(typeof service.getAiTranslationSuggestion).toBe('function');

      // Constants
      expect(service.TRANSLATION_STATUSES).toBeDefined();
      expect(service.STATUS_LABELS).toBeDefined();
      expect(service.STATUS_COLORS).toBeDefined();
    });
  });
});
