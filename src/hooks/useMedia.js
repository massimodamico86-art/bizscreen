/**
 * useMedia Hook
 *
 * Hook for managing media assets with filtering, pagination, and CRUD operations.
 * Supports Yodeck-style media library with search, type, and orientation filters.
 *
 * @module hooks/useMedia
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Media asset types
 */
export const MEDIA_TYPES = {
  ALL: null,
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  WEB_PAGE: 'web_page',
  APP: 'app',
};

/**
 * Orientation types
 */
export const ORIENTATIONS = {
  ALL: null,
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  SQUARE: 'square',
};

const DEFAULT_PAGE_SIZE = 24;

/**
 * useMedia hook
 *
 * @param {Object} initialFilters - Initial filter state
 * @param {string|null} initialFilters.type - Media type filter
 * @param {string|null} initialFilters.orientation - Orientation filter
 * @param {string} initialFilters.search - Search query
 * @param {boolean} initialFilters.includeGlobal - Include global assets
 * @returns {Object} Media state and actions
 */
export function useMedia(initialFilters = {}) {
  const { userProfile } = useAuth();
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(0);

  // Filter state
  const [filters, setFilters] = useState({
    type: initialFilters.type || null,
    orientation: initialFilters.orientation || null,
    search: initialFilters.search || '',
    includeGlobal: initialFilters.includeGlobal !== false,
    sortBy: initialFilters.sortBy || 'created_at',
    sortOrder: initialFilters.sortOrder || 'desc',
    folderId: initialFilters.folderId !== undefined ? initialFilters.folderId : null,
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  /**
   * Fetch media assets with current filters
   */
  const fetchAssets = useCallback(async (page = 0, append = false) => {
    if (!append) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const from = page * DEFAULT_PAGE_SIZE;
      const to = from + DEFAULT_PAGE_SIZE - 1;

      let query = supabase
        .from('media_assets')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
        .range(from, to);

      // Type filter
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      // Orientation filter
      if (filters.orientation) {
        query = query.eq('orientation', filters.orientation);
      }

      // Folder filter
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          // Root level - no folder
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folderId);
        }
      }

      // Search filter (fuzzy match on name and tags)
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,tags.cs.{${debouncedSearch}}`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      if (append) {
        setAssets((prev) => [...prev, ...(data || [])]);
      } else {
        setAssets(data || []);
      }

      setTotal(count || 0);
      setHasMore((data?.length || 0) === DEFAULT_PAGE_SIZE);
      pageRef.current = page;
    } catch (err) {
      console.error('Error fetching media assets:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters.type, filters.orientation, filters.sortBy, filters.sortOrder, filters.folderId, debouncedSearch]);

  // Fetch on mount and filter changes
  useEffect(() => {
    pageRef.current = 0;
    fetchAssets(0, false);
  }, [fetchAssets]);

  /**
   * Load more assets (pagination)
   */
  const fetchMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchAssets(pageRef.current + 1, true);
    }
  }, [isLoading, hasMore, fetchAssets]);

  /**
   * Refresh assets list
   */
  const refresh = useCallback(() => {
    pageRef.current = 0;
    fetchAssets(0, false);
  }, [fetchAssets]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Create a new media asset
   */
  const createAsset = useCallback(async (assetData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      // Calculate orientation from dimensions
      let orientation = null;
      if (assetData.width && assetData.height) {
        if (assetData.width > assetData.height) {
          orientation = 'landscape';
        } else if (assetData.height > assetData.width) {
          orientation = 'portrait';
        } else {
          orientation = 'square';
        }
      }

      const { data, error: createError } = await supabase
        .from('media_assets')
        .insert({
          owner_id: user.id,
          name: assetData.name,
          type: assetData.type,
          url: assetData.url,
          thumbnail_url: assetData.thumbnailUrl,
          public_id: assetData.publicId,
          mime_type: assetData.mimeType,
          file_size: assetData.fileSize,
          duration: assetData.duration,
          width: assetData.width,
          height: assetData.height,
          orientation,
          description: assetData.description,
          tags: assetData.tags || [],
          config_json: assetData.configJson,
          folder_id: assetData.folderId,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add to local state
      setAssets((prev) => [data, ...prev]);
      setTotal((prev) => prev + 1);

      return data;
    } catch (err) {
      console.error('Error creating media asset:', err);
      throw err;
    }
  }, []);

  /**
   * Update a media asset
   */
  const updateAsset = useCallback(async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('media_assets')
        .update({
          name: updates.name,
          description: updates.description,
          tags: updates.tags,
          thumbnail_url: updates.thumbnailUrl,
          url: updates.url,
          public_id: updates.publicId,
          width: updates.width,
          height: updates.height,
          file_size: updates.fileSize,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setAssets((prev) => prev.map((a) => (a.id === id ? data : a)));

      return data;
    } catch (err) {
      console.error('Error updating media asset:', err);
      throw err;
    }
  }, []);

  /**
   * Soft delete a media asset
   */
  const deleteAsset = useCallback(async (id) => {
    try {
      const { data, error: deleteError } = await supabase.rpc('soft_delete_media', {
        p_media_id: id,
      });

      if (deleteError) throw deleteError;

      // Remove from local state
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);

      return true;
    } catch (err) {
      console.error('Error deleting media asset:', err);
      throw err;
    }
  }, []);

  /**
   * Hard delete a media asset (permanent)
   */
  const permanentlyDeleteAsset = useCallback(async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);

      return true;
    } catch (err) {
      console.error('Error permanently deleting media asset:', err);
      throw err;
    }
  }, []);

  /**
   * Clone a global asset to user's library
   */
  const cloneAsset = useCallback(async (mediaId, newName = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { data: newId, error: cloneError } = await supabase.rpc('clone_media_to_tenant', {
        p_media_id: mediaId,
        p_new_owner_id: user.id,
        p_new_name: newName,
      });

      if (cloneError) throw cloneError;

      // Fetch the cloned asset
      const { data: clonedAsset, error: fetchError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', newId)
        .single();

      if (fetchError) throw fetchError;

      // Add to local state
      setAssets((prev) => [clonedAsset, ...prev]);
      setTotal((prev) => prev + 1);

      return clonedAsset;
    } catch (err) {
      console.error('Error cloning media asset:', err);
      throw err;
    }
  }, []);

  /**
   * Get selected assets
   */
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(assets.map((a) => a.id)));
  }, [assets]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedAssets = useMemo(() => {
    return assets.filter((a) => selectedIds.has(a.id));
  }, [assets, selectedIds]);

  /**
   * Bulk delete selected assets
   */
  const bulkDelete = useCallback(async () => {
    try {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return { deleted: 0 };

      // Soft delete each asset
      await Promise.all(ids.map((id) =>
        supabase.rpc('soft_delete_media', { p_media_id: id })
      ));

      // Remove from local state
      setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setTotal((prev) => prev - ids.length);
      clearSelection();

      return { deleted: ids.length };
    } catch (err) {
      console.error('Error bulk deleting media assets:', err);
      throw err;
    }
  }, [selectedIds, clearSelection]);

  return {
    // State
    assets,
    isLoading,
    error,
    hasMore,
    total,
    filters,

    // Actions
    setFilters: updateFilters,
    fetchMore,
    refresh,
    createAsset,
    updateAsset,
    deleteAsset,
    permanentlyDeleteAsset,
    cloneAsset,

    // Selection
    selectedIds,
    selectedAssets,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
  };
}

export default useMedia;
