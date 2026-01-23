/**
 * useLayout Hook
 *
 * Custom hook for managing layout data in the Yodeck-style layout editor.
 * Provides fetching, saving with debounce, and error handling.
 *
 * @module hooks/useLayout
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('useLayout');
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Default layout structure
 */
const createDefaultLayout = (ownerId) => ({
  id: null,
  owner_id: ownerId,
  name: 'Untitled Layout',
  background_color: '#1a1a2e',
  background_image: null,
  aspect_ratio: '16:9',
  data: { elements: [] },
  created_at: null,
  updated_at: null,
});

/**
 * Parse layout from database format to editor format
 */
function parseLayoutFromDB(dbLayout) {
  if (!dbLayout) return null;

  return {
    id: dbLayout.id,
    owner_id: dbLayout.owner_id,
    name: dbLayout.name || 'Untitled Layout',
    description: dbLayout.description,
    background: {
      type: dbLayout.background_image ? 'image' : 'solid',
      color: dbLayout.background_color || '#1a1a2e',
      imageUrl: dbLayout.background_image || null,
    },
    aspectRatio: dbLayout.aspect_ratio || '16:9',
    elements: dbLayout.data?.elements || [],
    width: dbLayout.width,
    height: dbLayout.height,
    created_at: dbLayout.created_at,
    updated_at: dbLayout.updated_at,
  };
}

/**
 * Convert editor format back to database format
 */
function serializeLayoutForDB(editorLayout) {
  return {
    name: editorLayout.name,
    description: editorLayout.description || null,
    background_color: editorLayout.background?.color || '#1a1a2e',
    background_image: editorLayout.background?.imageUrl || null,
    aspect_ratio: editorLayout.aspectRatio || '16:9',
    data: { elements: editorLayout.elements || [] },
  };
}

/**
 * Custom hook for layout CRUD operations with debounced saves
 *
 * @param {string|null} layoutId - Layout ID to fetch, or null/undefined for new layout
 * @param {Object} options - Hook options
 * @param {number} options.debounceMs - Debounce delay for saves (default: 800ms)
 * @param {Function} options.onSaveSuccess - Callback on successful save
 * @param {Function} options.onSaveError - Callback on save error
 * @returns {Object} Hook state and methods
 */
export function useLayout(layoutId, options = {}) {
  const {
    debounceMs = 800,
    onSaveSuccess,
    onSaveError,
  } = options;

  const { userProfile } = useAuth();
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Refs for debouncing
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef(null);

  /**
   * Fetch layout from database
   */
  const fetchLayout = useCallback(async () => {
    if (!layoutId || layoutId === 'new') {
      // Create new layout
      const newLayout = createDefaultLayout(userProfile?.id);
      setLayout(parseLayoutFromDB(newLayout));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('layouts')
        .select('*')
        .eq('id', layoutId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Layout not found');
      }

      setLayout(parseLayoutFromDB(data));
    } catch (err) {
      logger.error('Failed to fetch layout:', err);
      setError(err.message || 'Failed to load layout');
    } finally {
      setIsLoading(false);
    }
  }, [layoutId, userProfile?.id]);

  /**
   * Save layout to database (internal)
   */
  const saveLayoutToDb = useCallback(async (layoutData) => {
    if (!layoutData) return;

    setIsSaving(true);

    try {
      const dbData = serializeLayoutForDB(layoutData);

      if (layoutData.id) {
        // Update existing layout
        const { data, error: updateError } = await supabase
          .from('layouts')
          .update(dbData)
          .eq('id', layoutData.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const updatedLayout = parseLayoutFromDB(data);
        setLayout(updatedLayout);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        onSaveSuccess?.('Layout saved');
        return updatedLayout;
      } else {
        // Create new layout
        const { data, error: insertError } = await supabase
          .from('layouts')
          .insert({
            ...dbData,
            owner_id: userProfile?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newLayout = parseLayoutFromDB(data);
        setLayout(newLayout);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        onSaveSuccess?.('Layout created');
        return newLayout;
      }
    } catch (err) {
      logger.error('Failed to save layout:', err);
      const errorMsg = err.message || 'Failed to save layout';
      setError(errorMsg);
      onSaveError?.(errorMsg);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [userProfile?.id, onSaveSuccess, onSaveError]);

  /**
   * Save layout with debouncing
   */
  const saveLayout = useCallback((updatedLayout) => {
    if (!updatedLayout) {
      updatedLayout = layout;
    }

    setHasUnsavedChanges(true);
    pendingUpdatesRef.current = updatedLayout;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounced save
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current) {
        saveLayoutToDb(pendingUpdatesRef.current);
        pendingUpdatesRef.current = null;
      }
    }, debounceMs);
  }, [layout, debounceMs, saveLayoutToDb]);

  /**
   * Force immediate save (bypasses debounce)
   */
  const saveLayoutNow = useCallback(async (updatedLayout) => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingUpdatesRef.current = null;

    return saveLayoutToDb(updatedLayout || layout);
  }, [layout, saveLayoutToDb]);

  /**
   * Update layout locally (triggers debounced save)
   */
  const updateLayout = useCallback((updates) => {
    setLayout((prev) => {
      const updated = { ...prev, ...updates };
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  /**
   * Update a single element
   */
  const updateElement = useCallback((elementId, updates) => {
    setLayout((prev) => {
      const newElements = prev.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );
      const updated = { ...prev, elements: newElements };
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  /**
   * Add a new element
   */
  const addElement = useCallback((element) => {
    setLayout((prev) => {
      const updated = {
        ...prev,
        elements: [...prev.elements, element],
      };
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  /**
   * Delete an element
   */
  const deleteElement = useCallback((elementId) => {
    setLayout((prev) => {
      const updated = {
        ...prev,
        elements: prev.elements.filter((el) => el.id !== elementId),
      };
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  /**
   * Duplicate an element
   */
  const duplicateElement = useCallback((elementId) => {
    setLayout((prev) => {
      const element = prev.elements.find((el) => el.id === elementId);
      if (!element) return prev;

      const newElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: `${element.type}-${Date.now()}`,
        position: {
          ...element.position,
          x: Math.min(element.position.x + 0.05, 1 - element.position.width),
          y: Math.min(element.position.y + 0.05, 1 - element.position.height),
        },
      };

      const updated = {
        ...prev,
        elements: [...prev.elements, newElement],
      };
      saveLayout(updated);
      return updated;
    });

    return layout?.elements?.find((el) => el.id === elementId);
  }, [layout, saveLayout]);

  /**
   * Delete layout from database
   */
  const deleteLayout = useCallback(async () => {
    if (!layout?.id) return false;

    try {
      const { error: deleteError } = await supabase
        .from('layouts')
        .delete()
        .eq('id', layout.id);

      if (deleteError) throw deleteError;

      setLayout(null);
      return true;
    } catch (err) {
      logger.error('Failed to delete layout:', err);
      setError(err.message || 'Failed to delete layout');
      return false;
    }
  }, [layout?.id]);

  // Fetch layout on mount or when layoutId changes
  useEffect(() => {
    if (userProfile?.id) {
      fetchLayout();
    }
  }, [fetchLayout, userProfile?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    layout,
    setLayout,
    isLoading,
    error,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    saveLayout,
    saveLayoutNow,
    updateLayout,
    updateElement,
    addElement,
    deleteElement,
    duplicateElement,
    deleteLayout,
    refetch: fetchLayout,
  };
}

export default useLayout;
