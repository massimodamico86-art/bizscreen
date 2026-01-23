/**
 * useLayoutTemplates Hook
 *
 * Custom hook for fetching and filtering layout templates.
 *
 * @module hooks/useLayoutTemplates
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('useLayoutTemplates');
import {
  fetchLayoutTemplates,
  fetchTemplateCategories,
  cloneTemplateToLayout,
  cloneTemplateToLayoutFallback,
} from '../services/layoutTemplateService';
import { useAuth } from '../contexts/AuthContext';

/**
 * @typedef {Object} TemplateFilters
 * @property {string} category - Category filter
 * @property {string} orientation - Orientation filter (16_9, 9_16, square)
 * @property {string} search - Search query
 */

/**
 * Default filters
 */
const DEFAULT_FILTERS = {
  category: 'All',
  orientation: 'All',
  search: '',
};

/**
 * Custom hook for managing layout templates
 *
 * @param {TemplateFilters} initialFilters - Initial filter values
 * @returns {Object} Hook state and methods
 */
export function useLayoutTemplates(initialFilters = {}) {
  const { userProfile } = useAuth();

  // State
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Cloning state
  const [isCloning, setIsCloning] = useState(false);
  const [cloningTemplateId, setCloningTemplateId] = useState(null);

  /**
   * Fetch templates with current filters
   */
  const fetchTemplates = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const result = await fetchLayoutTemplates({
        category: filters.category,
        orientation: filters.orientation,
        search: filters.search,
        page: pageNum,
        pageSize: 24,
      });

      if (append) {
        setTemplates((prev) => [...prev, ...result.templates]);
      } else {
        setTemplates(result.templates);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (err) {
      logger.error('Failed to fetch templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  /**
   * Fetch available categories
   */
  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchTemplateCategories();
      setCategories(['All', ...cats]);
    } catch (err) {
      logger.error('Failed to fetch categories:', err);
    }
  }, []);

  /**
   * Update filters and reset page
   */
  const setFilters = useCallback((newFilters) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
    setPage(1);
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  /**
   * Load more templates (pagination)
   */
  const fetchMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchTemplates(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, fetchTemplates]);

  /**
   * Clone a template to create a new layout
   *
   * @param {string} templateId - Template ID to clone
   * @param {string} customName - Optional custom name
   * @returns {Promise<{id: string, name: string}>} New layout info
   */
  const cloneTemplate = useCallback(async (templateId, customName) => {
    if (!userProfile?.id) {
      throw new Error('User not authenticated');
    }

    setIsCloning(true);
    setCloningTemplateId(templateId);

    try {
      // Try the RPC function first, fall back to JS implementation
      let result;
      try {
        result = await cloneTemplateToLayout({
          templateId,
          ownerId: userProfile.id,
          name: customName,
        });
      } catch (rpcError) {
        // If RPC fails (function doesn't exist), use fallback
        if (rpcError.message?.includes('function') || rpcError.code === '42883') {
          result = await cloneTemplateToLayoutFallback({
            templateId,
            ownerId: userProfile.id,
            name: customName,
          });
        } else {
          throw rpcError;
        }
      }

      return result;
    } finally {
      setIsCloning(false);
      setCloningTemplateId(null);
    }
  }, [userProfile?.id]);

  /**
   * Refresh templates
   */
  const refresh = useCallback(() => {
    fetchTemplates(1, false);
  }, [fetchTemplates]);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Fetch templates when filters change
  useEffect(() => {
    fetchTemplates(1, false);
  }, [filters, fetchTemplates]);

  // Memoized filtered stats
  const stats = useMemo(() => ({
    total,
    showing: templates.length,
    hasMore,
    hasFilters: filters.category !== 'All' || filters.orientation !== 'All' || filters.search !== '',
  }), [total, templates.length, hasMore, filters]);

  return {
    // Data
    templates,
    categories,
    total,
    hasMore,
    stats,

    // Loading states
    isLoading,
    isLoadingMore,
    error,

    // Cloning states
    isCloning,
    cloningTemplateId,

    // Filters
    filters,
    setFilters,
    clearFilters,

    // Actions
    fetchMore,
    refresh,
    cloneTemplate,
  };
}

export default useLayoutTemplates;
