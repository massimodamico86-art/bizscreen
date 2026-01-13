/**
 * useMediaFolders Hook
 *
 * Hook for managing media folders with CRUD operations and navigation.
 * Supports hierarchical folder structure for organizing media assets.
 *
 * @module hooks/useMediaFolders
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/**
 * useMediaFolders hook
 *
 * @param {Object} options - Hook options
 * @param {string|null} options.parentId - Parent folder ID (null for root)
 * @returns {Object} Folder state and actions
 */
export function useMediaFolders({ parentId = null } = {}) {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  /**
   * Fetch folders for current parent
   */
  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use RPC to get folder summary with counts
      const { data, error: fetchError } = await supabase.rpc('get_folder_summary', {
        p_folder_id: parentId,
      });

      if (fetchError) throw fetchError;

      setFolders(data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err.message);

      // Fallback to direct query if RPC fails
      try {
        let query = supabase
          .from('media_folders')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (parentId === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', parentId);
        }

        const { data: fallbackData, error: fallbackError } = await query;
        if (!fallbackError) {
          setFolders(
            (fallbackData || []).map((f) => ({
              folder_id: f.id,
              folder_name: f.name,
              media_count: 0,
              child_folder_count: 0,
            }))
          );
          setError(null);
        }
      } catch (fallbackErr) {
        console.error('Fallback query also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  /**
   * Fetch folder path (breadcrumbs)
   */
  const fetchFolderPath = useCallback(async () => {
    if (!parentId) {
      setFolderPath([]);
      return;
    }

    try {
      const { data, error: pathError } = await supabase.rpc('get_folder_path', {
        p_folder_id: parentId,
      });

      if (pathError) throw pathError;

      setFolderPath(data || []);
    } catch (err) {
      console.error('Error fetching folder path:', err);
      // Fallback: just show current folder
      try {
        const { data: folder } = await supabase
          .from('media_folders')
          .select('id, name')
          .eq('id', parentId)
          .single();

        if (folder) {
          setFolderPath([{ id: folder.id, name: folder.name, depth: 0 }]);
        }
      } catch (fallbackErr) {
        console.error('Fallback path query failed:', fallbackErr);
      }
    }
  }, [parentId]);

  // Fetch on mount and when parentId changes
  useEffect(() => {
    fetchFolders();
    fetchFolderPath();
  }, [fetchFolders, fetchFolderPath]);

  /**
   * Refresh folders list
   */
  const refresh = useCallback(() => {
    fetchFolders();
    fetchFolderPath();
  }, [fetchFolders, fetchFolderPath]);

  /**
   * Create a new folder
   */
  const createFolder = useCallback(
    async ({ name, parentId: customParentId = parentId }) => {
      try {
        const { data, error: createError } = await supabase.rpc('create_media_folder', {
          p_name: name,
          p_parent_id: customParentId,
        });

        if (createError) throw createError;

        // Refresh folders list
        await fetchFolders();

        return data;
      } catch (err) {
        console.error('Error creating folder:', err);
        throw err;
      }
    },
    [parentId, fetchFolders]
  );

  /**
   * Rename a folder
   */
  const renameFolder = useCallback(
    async (folderId, name) => {
      try {
        const { data, error: renameError } = await supabase.rpc('rename_media_folder', {
          p_folder_id: folderId,
          p_name: name,
        });

        if (renameError) throw renameError;

        // Update local state
        setFolders((prev) =>
          prev.map((f) =>
            f.folder_id === folderId ? { ...f, folder_name: name } : f
          )
        );

        return data;
      } catch (err) {
        console.error('Error renaming folder:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Delete a folder
   */
  const deleteFolder = useCallback(
    async (folderId, moveToRoot = true) => {
      try {
        const { data, error: deleteError } = await supabase.rpc('delete_media_folder', {
          p_folder_id: folderId,
          p_move_to_root: moveToRoot,
        });

        if (deleteError) throw deleteError;

        // Remove from local state
        setFolders((prev) => prev.filter((f) => f.folder_id !== folderId));

        return true;
      } catch (err) {
        console.error('Error deleting folder:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Move folder to a new parent
   */
  const moveFolder = useCallback(
    async (folderId, newParentId) => {
      try {
        const { data, error: moveError } = await supabase.rpc('move_media_folder', {
          p_folder_id: folderId,
          p_parent_id: newParentId,
        });

        if (moveError) throw moveError;

        // Refresh folders
        await fetchFolders();

        return data;
      } catch (err) {
        console.error('Error moving folder:', err);
        throw err;
      }
    },
    [fetchFolders]
  );

  /**
   * Move media to a folder
   */
  const moveMediaToFolder = useCallback(async (mediaId, folderId) => {
    try {
      const { data, error: moveError } = await supabase.rpc('move_media_to_folder', {
        p_media_id: mediaId,
        p_folder_id: folderId,
      });

      if (moveError) throw moveError;

      return data;
    } catch (err) {
      console.error('Error moving media to folder:', err);
      throw err;
    }
  }, []);

  /**
   * Move media to a folder with proper ordering (places at end)
   */
  const moveMediaToFolderOrdered = useCallback(async (mediaId, folderId) => {
    try {
      const { data, error: moveError } = await supabase.rpc('move_media_to_folder_ordered', {
        p_media_id: mediaId,
        p_folder_id: folderId,
      });

      if (moveError) throw moveError;

      return data;
    } catch (err) {
      console.error('Error moving media to folder:', err);
      throw err;
    }
  }, []);

  /**
   * Reorder a folder to a new position
   */
  const reorderFolder = useCallback(async (folderId, newSortOrder) => {
    try {
      const { data, error: reorderError } = await supabase.rpc('reorder_folder', {
        p_folder_id: folderId,
        p_new_sort_order: newSortOrder,
      });

      if (reorderError) throw reorderError;

      // Refresh folders to get updated sort_order
      await fetchFolders();

      return data;
    } catch (err) {
      console.error('Error reordering folder:', err);
      throw err;
    }
  }, [fetchFolders]);

  /**
   * Get a single folder by ID
   */
  const getFolder = useCallback(async (folderId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('media_folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      console.error('Error fetching folder:', err);
      throw err;
    }
  }, []);

  return {
    // State
    folders,
    isLoading,
    error,
    folderPath,

    // Actions
    refresh,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    moveMediaToFolder,
    moveMediaToFolderOrdered,
    reorderFolder,
    getFolder,
  };
}

export default useMediaFolders;
