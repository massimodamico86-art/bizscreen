/**
 * usePlaylistEditor - Custom hook for managing playlist editor state
 *
 * Extracted from PlaylistEditorPage to handle:
 * - Playlist data loading and state
 * - Media library browsing with folder navigation
 * - Drag-drop reordering
 * - AI slide generation
 * - Approval workflow
 * - Preview link management
 * - Save as template
 *
 * @module pages/hooks/usePlaylistEditor
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { createScopedLogger } from '../../services/loggingService.js';
import {
  generateSlides,
  getBusinessContextFromProfile,
} from '../../services/assistantService';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft,
} from '../../services/approvalService';
import {
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  revokePreviewLink,
  formatPreviewLink,
} from '../../services/previewService';
import { savePlaylistAsTemplate, savePlaylistWithApproval } from '../../services/playlistService';

// Module-level logger
const logger = createScopedLogger('usePlaylistEditor');

/**
 * Custom hook for managing playlist editor state and operations
 *
 * @param {string} playlistId - Playlist UUID
 * @param {Object} options - Hook options
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} Playlist state and control functions
 */
export function usePlaylistEditor(playlistId, { showToast }) {
  // Playlist state
  const [playlist, setPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Media library state
  const [mediaAssets, setMediaAssets] = useState([]);
  const [userDesigns, setUserDesigns] = useState([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState('');

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [folderPath, setFolderPath] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const mediaScrollRef = useRef(null);
  const ITEMS_PER_ROW = 2;
  const ITEM_HEIGHT = 100;

  // Preview playback state
  const [previewItem, setPreviewItem] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const playTimerRef = useRef(null);
  const timelineRef = useRef(null);

  // AI Assistant state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSlideCount, setAiSlideCount] = useState(4);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiApplying, setAiApplying] = useState(false);

  // Approval & Preview state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLinks, setPreviewLinks] = useState([]);
  const [loadingPreviewLinks, setLoadingPreviewLinks] = useState(false);
  const [creatingPreviewLink, setCreatingPreviewLink] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState('7_days');
  const [allowComments, setAllowComments] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Drag and drop state
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);

  // Save as Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Drag refs for throttling
  const lastDragOverIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isDraggingFromLibraryRef = useRef(false);

  // ============================================================
  // Data Loading Functions
  // ============================================================

  const fetchPlaylist = useCallback(async () => {
    try {
      setLoading(true);

      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);

      // Fetch playlist items
      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;

      // Separate items by type and fetch related data
      const mediaItemIds = itemsData?.filter(i => i.item_type === 'media').map(i => i.item_id) || [];
      const layoutItemIds = itemsData?.filter(i => i.item_type === 'layout').map(i => i.item_id) || [];

      // Fetch media assets
      let mediaMap = {};
      if (mediaItemIds.length > 0) {
        const { data: mediaData } = await supabase
          .from('media_assets')
          .select('id, name, type, url, thumbnail_url, duration, config_json')
          .in('id', mediaItemIds);
        mediaMap = (mediaData || []).reduce((acc, m) => ({ ...acc, [m.id]: m }), {});
      }

      // Fetch layouts (designs)
      let layoutMap = {};
      if (layoutItemIds.length > 0) {
        const { data: layoutData } = await supabase
          .from('layouts')
          .select('id, name, background_image, width, height')
          .in('id', layoutItemIds);
        layoutMap = (layoutData || []).reduce((acc, l) => ({
          ...acc,
          [l.id]: {
            id: l.id,
            name: l.name,
            type: 'design',
            url: l.background_image,
            thumbnail_url: l.background_image,
            duration: null,
          }
        }), {});
      }

      // Combine items with their media/layout data
      const enrichedItems = (itemsData || []).map(item => ({
        ...item,
        media: item.item_type === 'layout' ? layoutMap[item.item_id] : mediaMap[item.item_id]
      }));

      setItems(enrichedItems);
    } catch (error) {
      logger.error('Error fetching playlist', { error, playlistId });
      showToast?.('Error loading playlist: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [playlistId, showToast]);

  const fetchFolders = useCallback(async () => {
    try {
      setLoadingFolders(true);
      const { data, error } = await supabase.rpc('get_folder_summary', {
        p_folder_id: currentFolderId,
      });

      if (error) {
        // Fallback to direct query
        let query = supabase
          .from('media_folders')
          .select('*')
          .order('name', { ascending: true });

        if (currentFolderId === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', currentFolderId);
        }

        const { data: fallbackData } = await query;
        setFolders(
          (fallbackData || []).map((f) => ({
            folder_id: f.id,
            folder_name: f.name,
            media_count: 0,
            child_folder_count: 0,
          }))
        );
      } else {
        setFolders(data || []);
      }
    } catch (err) {
      logger.error('Error fetching media folders', { error: err, currentFolderId });
    } finally {
      setLoadingFolders(false);
    }
  }, [currentFolderId]);

  const fetchFolderPath = useCallback(async () => {
    if (!currentFolderId) {
      setFolderPath([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_folder_path', {
        p_folder_id: currentFolderId,
      });

      if (error) {
        // Fallback: just show current folder
        const { data: folder } = await supabase
          .from('media_folders')
          .select('id, name')
          .eq('id', currentFolderId)
          .single();

        if (folder) {
          setFolderPath([{ id: folder.id, name: folder.name, depth: 0 }]);
        }
      } else {
        setFolderPath(data || []);
      }
    } catch (err) {
      logger.error('Error fetching folder path', { error: err, currentFolderId });
    }
  }, [currentFolderId]);

  const fetchMediaAssets = useCallback(async () => {
    try {
      // Special handling for "My Designs" filter
      if (mediaFilter === 'my_designs') {
        let query = supabase
          .from('layouts')
          .select('*')
          .eq('data->>type', 'svg_design')
          .order('updated_at', { ascending: false })
          .limit(100);

        if (mediaSearch) {
          query = query.ilike('name', `%${mediaSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform layouts to media-like format
        const designsAsMedia = (data || []).map(design => ({
          id: design.id,
          name: design.name,
          type: 'design',
          url: design.background_image,
          thumbnail_url: design.background_image,
          duration: null,
          created_at: design.created_at,
          _isDesign: true,
          _layoutData: design,
        }));

        setMediaAssets(designsAsMedia);
        setUserDesigns(data || []);
      } else {
        // Normal media assets fetch
        let query = supabase
          .from('media_assets')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        // Filter by folder
        if (currentFolderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', currentFolderId);
        }

        if (mediaFilter) {
          query = query.eq('type', mediaFilter);
        }

        if (mediaSearch) {
          query = query.ilike('name', `%${mediaSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMediaAssets(data || []);
      }

      // Reset scroll position when filter changes
      if (mediaScrollRef.current) {
        mediaScrollRef.current.scrollTop = 0;
      }
      setVisibleRange({ start: 0, end: 20 });
    } catch (error) {
      logger.error('Error fetching media assets', { error, mediaFilter, mediaSearch, currentFolderId });
    }
  }, [mediaFilter, mediaSearch, currentFolderId]);

  // ============================================================
  // Effects for data loading
  // ============================================================

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
      fetchMediaAssets();
      fetchFolders();
    }
  }, [playlistId, fetchPlaylist, fetchMediaAssets, fetchFolders]);

  // Fetch media when filter or folder changes
  useEffect(() => {
    fetchMediaAssets();
  }, [mediaFilter, mediaSearch, currentFolderId, fetchMediaAssets]);

  // Fetch folders when navigating
  useEffect(() => {
    fetchFolders();
    fetchFolderPath();
  }, [currentFolderId, fetchFolders, fetchFolderPath]);

  // Fetch current review when playlist loads
  useEffect(() => {
    if (playlist) {
      getOpenReviewForResource('playlist', playlistId)
        .then(setCurrentReview)
        .catch(err => logger.error('Error fetching approval review', { error: err, playlistId }));
    }
  }, [playlist?.id, playlistId]);

  // Cleanup playback timer on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, []);

  // ============================================================
  // Navigation Functions
  // ============================================================

  const navigateToFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
  }, []);

  // ============================================================
  // Virtual Scrolling
  // ============================================================

  const handleMediaScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    const containerHeight = e.target.clientHeight;
    const startRow = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleRows = Math.ceil(containerHeight / ITEM_HEIGHT) + 2;
    const startIndex = Math.max(0, startRow * ITEMS_PER_ROW);
    const endIndex = Math.min(
      mediaAssets.length,
      (startRow + visibleRows) * ITEMS_PER_ROW
    );
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [mediaAssets.length, ITEMS_PER_ROW, ITEM_HEIGHT]);

  const visibleMediaItems = useMemo(() => {
    return mediaAssets.slice(visibleRange.start, visibleRange.end);
  }, [mediaAssets, visibleRange]);

  // ============================================================
  // Item Management Functions
  // ============================================================

  const handleAddItem = useCallback(async (media) => {
    try {
      setSaving(true);

      const maxPosition = items.length > 0
        ? Math.max(...items.map(i => i.position))
        : -1;

      const isDesign = media._isDesign;
      const itemType = isDesign ? 'layout' : 'media';

      const { data, error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: playlistId,
          item_type: itemType,
          item_id: media.id,
          position: maxPosition + 1,
          duration: media.duration || 10
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add media data to the new item
      if (isDesign) {
        const layoutData = media._layoutData;
        data.media = {
          id: layoutData.id,
          name: layoutData.name,
          type: 'design',
          url: layoutData.background_image,
          thumbnail_url: layoutData.background_image,
          duration: null,
        };
      } else {
        const { data: mediaData } = await supabase
          .from('media_assets')
          .select('id, name, type, url, thumbnail_url, duration, config_json')
          .eq('id', media.id)
          .single();
        data.media = mediaData;
      }

      setItems(prev => [...prev, data]);
      showToast?.(`Added "${media.name}" to playlist`);
    } catch (error) {
      logger.error('Error adding item to playlist', { error, playlistId, itemType: media._isDesign ? 'layout' : 'media' });
      showToast?.('Error adding item: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [items, playlistId, showToast]);

  const handleRemoveItem = useCallback(async (itemId) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      const newItems = items
        .filter(i => i.id !== itemId)
        .map((item, index) => ({ ...item, position: index }));

      setItems(newItems);

      await Promise.all(
        newItems.map(item =>
          supabase
            .from('playlist_items')
            .update({ position: item.position })
            .eq('id', item.id)
        )
      );

      showToast?.('Item removed');
    } catch (error) {
      logger.error('Error removing item from playlist', { error, itemId });
      showToast?.('Error removing item: ' + error.message, 'error');
    }
  }, [items, showToast]);

  const handleUpdateDuration = useCallback(async (itemId, duration) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .update({ duration: duration || null })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, duration } : item
        )
      );
    } catch (error) {
      logger.error('Error updating item duration', { error, itemId, duration });
    }
  }, []);

  // ============================================================
  // Drag and Drop Handlers
  // ============================================================

  const handleTimelineDragStart = useCallback((index) => {
    isDraggingRef.current = true;
    dragOverIndexRef.current = null;
    lastDragOverIndexRef.current = null;
    setDragSourceIndex(index);
    setDragOverIndex(null);
  }, []);

  const handleTimelineDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragOverIndexRef.current = null;
    lastDragOverIndexRef.current = null;
    setDragSourceIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleTimelineDragOver = useCallback((index) => {
    if (!isDraggingRef.current && dragSourceIndex === null) return;
    if (index === dragSourceIndex) {
      if (dragOverIndexRef.current !== null) {
        dragOverIndexRef.current = null;
        lastDragOverIndexRef.current = null;
        setDragOverIndex(null);
      }
      return;
    }
    if (lastDragOverIndexRef.current === index) return;
    lastDragOverIndexRef.current = index;
    dragOverIndexRef.current = index;
    setDragOverIndex(index);
  }, [dragSourceIndex]);

  const handleTimelineDrop = useCallback(async (targetIndex) => {
    const sourceIndex = dragSourceIndex;
    setDragSourceIndex(null);
    setDragOverIndex(null);
    setIsDraggingFromLibrary(false);

    if (sourceIndex === null || sourceIndex === targetIndex) return;
    const adjustedTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    if (sourceIndex === adjustedTarget) return;

    // Reorder items locally first
    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(adjustedTarget, 0, movedItem);

    const updatedItems = newItems.map((item, idx) => ({ ...item, position: idx }));
    setItems(updatedItems);

    // Save to database
    try {
      setSaving(true);
      await Promise.all(
        updatedItems.map(item =>
          supabase
            .from('playlist_items')
            .update({ position: item.position })
            .eq('id', item.id)
        )
      );
    } catch (error) {
      logger.error('Error reordering playlist items', { error, sourceIndex, targetIndex });
      showToast?.('Error saving order', 'error');
      fetchPlaylist();
    } finally {
      setSaving(false);
    }
  }, [dragSourceIndex, items, showToast, fetchPlaylist]);

  const handleTimelineDropFromLibrary = useCallback(async (e, targetIndex = items.length) => {
    e.preventDefault();
    isDraggingFromLibraryRef.current = false;
    isDraggingRef.current = false;
    lastDragOverIndexRef.current = null;
    dragOverIndexRef.current = null;
    setIsDraggingFromLibrary(false);
    setDragOverIndex(null);
    setDragSourceIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (data.type === 'add' && data.media) {
        setSaving(true);

        const isDesign = data.media._isDesign;
        const itemType = isDesign ? 'layout' : 'media';

        // Shift positions for items after the target
        const updatedPositions = items
          .filter((_, idx) => idx >= targetIndex)
          .map((item, idx) => ({ id: item.id, position: targetIndex + idx + 1 }));

        // Insert new item
        const { data: newItem, error } = await supabase
          .from('playlist_items')
          .insert({
            playlist_id: playlistId,
            item_type: itemType,
            item_id: data.media.id,
            position: targetIndex,
            duration: data.media.duration || 10
          })
          .select('*')
          .single();

        if (error) throw error;

        // Add media data to newItem
        if (isDesign) {
          const layoutData = data.media._layoutData;
          newItem.media = {
            id: layoutData.id,
            name: layoutData.name,
            type: 'design',
            url: layoutData.background_image,
            thumbnail_url: layoutData.background_image,
            duration: null,
          };
        } else {
          const { data: mediaData } = await supabase
            .from('media_assets')
            .select('id, name, type, url, thumbnail_url, duration, config_json')
            .eq('id', data.media.id)
            .single();
          newItem.media = mediaData;
        }

        // Update positions of shifted items
        await Promise.all(
          updatedPositions.map(({ id, position }) =>
            supabase
              .from('playlist_items')
              .update({ position })
              .eq('id', id)
          )
        );

        // Update local state
        const newItems = [...items];
        newItems.splice(targetIndex, 0, newItem);
        setItems(newItems.map((item, idx) => ({ ...item, position: idx })));

        showToast?.(`Added "${data.media.name}" to playlist`);
      } else if (data.type === 'reorder') {
        handleTimelineDrop(targetIndex);
      }
    } catch (error) {
      logger.error('Error handling drag-drop', { error, playlistId });
      showToast?.('Error adding item', 'error');
    } finally {
      setSaving(false);
    }
  }, [items, playlistId, showToast, handleTimelineDrop]);

  const handleTimelineDragOverContainer = useCallback((e) => {
    e.preventDefault();
    if (isDraggingRef.current) {
      e.dataTransfer.dropEffect = 'move';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';

    if (!isDraggingFromLibraryRef.current) {
      isDraggingFromLibraryRef.current = true;
      setIsDraggingFromLibrary(true);
    }
  }, []);

  const handleTimelineDragLeave = useCallback((e) => {
    const relatedTarget = e.relatedTarget;
    const container = e.currentTarget;
    if (relatedTarget && container.contains(relatedTarget)) {
      return;
    }
    isDraggingFromLibraryRef.current = false;
    setIsDraggingFromLibrary(false);
  }, []);

  // ============================================================
  // AI Assistant Handlers
  // ============================================================

  const handleOpenAiModal = useCallback(() => {
    setShowAiModal(true);
    setAiSuggestion(null);
    setAiSlideCount(4);
  }, []);

  const handleGenerateAiSlides = useCallback(async () => {
    try {
      setAiGenerating(true);
      const businessContext = await getBusinessContextFromProfile();
      const suggestion = await generateSlides(
        {
          playlistName: playlist.name,
          playlistDescription: playlist.description || '',
          slideCount: aiSlideCount,
          theme: 'general',
        },
        businessContext
      );
      setAiSuggestion(suggestion);
      showToast?.('Slides generated! Review and apply them.', 'success');
    } catch (error) {
      logger.error('Error generating AI slides', { error, playlistId, slideCount: aiSlideCount });
      showToast?.(error.message || 'Error generating slides', 'error');
    } finally {
      setAiGenerating(false);
    }
  }, [playlist, aiSlideCount, playlistId, showToast]);

  const handleApplyAiSlides = useCallback(async () => {
    if (!aiSuggestion) return;

    try {
      setAiApplying(true);
      const slides = aiSuggestion.payload?.slides || [];
      const maxPosition = items.length > 0
        ? Math.max(...items.map(i => i.position))
        : -1;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const { data: media, error: mediaError } = await supabase
          .from('media_assets')
          .insert({
            name: slide.headline || `AI Slide ${i + 1}`,
            type: 'text',
            meta: {
              headline: slide.headline,
              body: slide.body,
              style: slide.style || {},
              imagePrompt: slide.imagePrompt,
              generatedBy: 'assistant',
            },
          })
          .select()
          .single();

        if (mediaError) throw mediaError;

        const { error: linkError } = await supabase
          .from('playlist_items')
          .insert({
            playlist_id: playlistId,
            item_type: 'media',
            item_id: media.id,
            position: maxPosition + 1 + i,
            duration: slide.duration || playlist.default_duration || 10,
          });

        if (linkError) throw linkError;
      }

      await fetchPlaylist();
      setShowAiModal(false);
      setAiSuggestion(null);
      showToast?.(`Added ${slides.length} AI-generated slides!`, 'success');
    } catch (error) {
      logger.error('Error applying AI slides to playlist', { error, playlistId });
      showToast?.(error.message || 'Error applying slides', 'error');
    } finally {
      setAiApplying(false);
    }
  }, [aiSuggestion, items, playlistId, playlist, showToast, fetchPlaylist]);

  // ============================================================
  // Approval Handlers
  // ============================================================

  const handleRequestApproval = useCallback(async () => {
    try {
      setSubmittingApproval(true);
      await requestApproval({
        resourceType: 'playlist',
        resourceId: playlistId,
        title: `Review request for playlist: ${playlist.name}`,
        message: approvalMessage || undefined,
      });
      showToast?.('Approval requested successfully');
      setShowApprovalModal(false);
      setApprovalMessage('');
      await fetchPlaylist();
      const review = await getOpenReviewForResource('playlist', playlistId);
      setCurrentReview(review);
    } catch (error) {
      logger.error('Error requesting playlist approval', { error, playlistId });
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  }, [playlistId, playlist, approvalMessage, showToast, fetchPlaylist]);

  const handleRevertToDraft = useCallback(async () => {
    if (!window.confirm('Revert this playlist to draft status?')) return;
    try {
      await revertToDraft('playlist', playlistId);
      showToast?.('Reverted to draft');
      await fetchPlaylist();
      setCurrentReview(null);
    } catch (error) {
      logger.error('Error reverting playlist to draft', { error, playlistId });
      showToast?.(error.message || 'Error reverting to draft', 'error');
    }
  }, [playlistId, showToast, fetchPlaylist]);

  // ============================================================
  // Preview Link Handlers
  // ============================================================

  const fetchPreviewLinksLocal = useCallback(async () => {
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('playlist', playlistId);
      setPreviewLinks(links);
    } catch (error) {
      logger.error('Error fetching preview links', { error, playlistId });
    } finally {
      setLoadingPreviewLinks(false);
    }
  }, [playlistId]);

  const handleOpenPreviewModal = useCallback(() => {
    setShowPreviewModal(true);
    fetchPreviewLinksLocal();
  }, [fetchPreviewLinksLocal]);

  const handleCreatePreviewLink = useCallback(async () => {
    try {
      setCreatingPreviewLink(true);
      await createPreviewLinkWithPreset({
        resourceType: 'playlist',
        resourceId: playlistId,
        expiryPreset: selectedExpiry,
        allowComments,
      });
      showToast?.('Preview link created');
      await fetchPreviewLinksLocal();
    } catch (error) {
      logger.error('Error creating preview link', { error, playlistId, expiry: selectedExpiry });
      showToast?.(error.message || 'Error creating preview link', 'error');
    } finally {
      setCreatingPreviewLink(false);
    }
  }, [playlistId, selectedExpiry, allowComments, showToast, fetchPreviewLinksLocal]);

  const handleRevokePreviewLink = useCallback(async (linkId) => {
    if (!window.confirm('Revoke this preview link?')) return;
    try {
      await revokePreviewLink(linkId);
      showToast?.('Preview link revoked');
      await fetchPreviewLinksLocal();
    } catch (error) {
      logger.error('Error revoking preview link', { error, linkId });
      showToast?.(error.message || 'Error revoking link', 'error');
    }
  }, [showToast, fetchPreviewLinksLocal]);

  const handleCopyLink = useCallback(async (link) => {
    try {
      const url = formatPreviewLink(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast?.('Link copied to clipboard');
    } catch (error) {
      showToast?.('Failed to copy link', 'error');
    }
  }, [showToast]);

  // ============================================================
  // Save as Template Handler
  // ============================================================

  const handleOpenTemplateModal = useCallback(() => {
    setTemplateName(playlist?.name ? `${playlist.name} Template` : '');
    setTemplateDescription(playlist?.description || '');
    setShowTemplateModal(true);
  }, [playlist]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      showToast?.('Please enter a template name', 'error');
      return;
    }

    try {
      setSavingTemplate(true);
      const result = await savePlaylistAsTemplate(playlistId, {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
      });
      showToast?.(`Template "${result.template_name}" created with ${result.item_count} items`);
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      logger.error('Error saving playlist as template', { error, playlistId, templateName });
      showToast?.(error.message || 'Error saving template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  }, [playlistId, templateName, templateDescription, showToast]);

  // ============================================================
  // Save Playlist with Auto-Submit for Approval
  // ============================================================

  /**
   * Save playlist and auto-submit for approval if user role requires it.
   * This handles:
   * - Saving playlist metadata (name, description, shuffle, loop, default_duration)
   * - Auto-submitting for approval when user is editor/viewer
   * - Re-submitting for approval when editing approved content
   * - Avoiding duplicate review requests
   */
  const handleSavePlaylist = useCallback(async () => {
    if (!playlist) return;

    try {
      setSaving(true);

      // Build the updates object from current playlist state
      const updates = {
        name: playlist.name,
        description: playlist.description,
        shuffle: playlist.shuffle,
        loop: playlist.loop,
        default_duration: playlist.default_duration,
      };

      // Use savePlaylistWithApproval for auto-submit behavior
      const result = await savePlaylistWithApproval(
        playlistId,
        updates,
        playlist.name
      );

      // Refresh playlist state
      await fetchPlaylist();

      // Update current review state and show appropriate toast
      if (result.wasResubmission) {
        const review = await getOpenReviewForResource('playlist', playlistId);
        setCurrentReview(review);
        showToast?.('Saved and resubmitted for approval');
      } else if (result.submittedForApproval) {
        const review = await getOpenReviewForResource('playlist', playlistId);
        setCurrentReview(review);
        showToast?.('Saved and submitted for approval');
      } else if (result.existingReview) {
        setCurrentReview(result.existingReview);
        showToast?.('Saved (already pending approval)');
      } else {
        showToast?.('Playlist saved');
      }
    } catch (error) {
      logger.error('Error saving playlist', { error, playlistId });
      showToast?.(error.message || 'Error saving playlist', 'error');
    } finally {
      setSaving(false);
    }
  }, [playlist, playlistId, fetchPlaylist, showToast]);

  // ============================================================
  // Playback Controls
  // ============================================================

  const getEffectiveDuration = useCallback((item) => {
    return item.duration || item.media?.duration || playlist?.default_duration || 10;
  }, [playlist]);

  const getTotalDuration = useCallback(() => {
    return items.reduce((total, item) => total + getEffectiveDuration(item), 0);
  }, [items, getEffectiveDuration]);

  const scheduleNextItem = useCallback((index) => {
    const item = items[index];
    if (!item) {
      setIsPlaying(false);
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }
    const duration = getEffectiveDuration(item) * 1000;
    playTimerRef.current = setTimeout(() => {
      const nextIndex = (index + 1) % items.length;
      setCurrentPlayIndex(nextIndex);
      setPreviewItem(items[nextIndex]);
      if (nextIndex === 0) {
        setIsPlaying(false);
      } else {
        scheduleNextItem(nextIndex);
      }
    }, duration);
  }, [items, getEffectiveDuration]);

  const startPlayback = useCallback(() => {
    if (items.length === 0) return;
    setIsPlaying(true);
    setCurrentPlayIndex(0);
    setPreviewItem(items[0]);
    scheduleNextItem(0);
  }, [items, scheduleNextItem]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  const skipToNext = useCallback(() => {
    if (items.length === 0) return;
    const nextIndex = (currentPlayIndex + 1) % items.length;
    setCurrentPlayIndex(nextIndex);
    setPreviewItem(items[nextIndex]);
    if (isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      scheduleNextItem(nextIndex);
    }
  }, [items, currentPlayIndex, isPlaying, scheduleNextItem]);

  const skipToPrev = useCallback(() => {
    if (items.length === 0) return;
    const prevIndex = currentPlayIndex === 0 ? items.length - 1 : currentPlayIndex - 1;
    setCurrentPlayIndex(prevIndex);
    setPreviewItem(items[prevIndex]);
    if (isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      scheduleNextItem(prevIndex);
    }
  }, [items, currentPlayIndex, isPlaying, scheduleNextItem]);

  // ============================================================
  // Return hook API
  // ============================================================

  return {
    // Playlist state
    playlist,
    setPlaylist,
    items,
    setItems,
    loading,
    saving,

    // Media library state
    mediaAssets,
    userDesigns,
    mediaSearch,
    setMediaSearch,
    mediaFilter,
    setMediaFilter,
    currentFolderId,
    setCurrentFolderId,
    folders,
    folderPath,
    loadingFolders,
    visibleRange,
    visibleMediaItems,
    mediaScrollRef,
    ITEMS_PER_ROW,
    ITEM_HEIGHT,

    // Preview/playback state
    previewItem,
    setPreviewItem,
    isPlaying,
    currentPlayIndex,
    setCurrentPlayIndex,
    timelineRef,

    // AI state
    showAiModal,
    setShowAiModal,
    aiGenerating,
    aiSlideCount,
    setAiSlideCount,
    aiSuggestion,
    setAiSuggestion,
    aiApplying,

    // Approval state
    showApprovalModal,
    setShowApprovalModal,
    approvalMessage,
    setApprovalMessage,
    submittingApproval,
    currentReview,

    // Preview links state
    showPreviewModal,
    setShowPreviewModal,
    previewLinks,
    loadingPreviewLinks,
    creatingPreviewLink,
    selectedExpiry,
    setSelectedExpiry,
    allowComments,
    setAllowComments,
    copiedLinkId,

    // Drag state
    dragSourceIndex,
    dragOverIndex,
    isDraggingFromLibrary,
    lastDragOverIndexRef,

    // Template state
    showTemplateModal,
    setShowTemplateModal,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    savingTemplate,

    // Actions - data loading
    fetchPlaylist,
    fetchMediaAssets,
    navigateToFolder,

    // Actions - media scroll
    handleMediaScroll,

    // Actions - item management
    handleAddItem,
    handleRemoveItem,
    handleUpdateDuration,

    // Actions - drag and drop
    handleTimelineDragStart,
    handleTimelineDragEnd,
    handleTimelineDragOver,
    handleTimelineDrop,
    handleTimelineDropFromLibrary,
    handleTimelineDragOverContainer,
    handleTimelineDragLeave,

    // Actions - AI
    handleOpenAiModal,
    handleGenerateAiSlides,
    handleApplyAiSlides,

    // Actions - approval
    handleRequestApproval,
    handleRevertToDraft,

    // Actions - preview links
    handleOpenPreviewModal,
    handleCreatePreviewLink,
    handleRevokePreviewLink,
    handleCopyLink,

    // Actions - template
    handleOpenTemplateModal,
    handleSaveAsTemplate,

    // Actions - save with approval
    handleSavePlaylist,

    // Actions - playback
    getEffectiveDuration,
    getTotalDuration,
    startPlayback,
    stopPlayback,
    skipToNext,
    skipToPrev,
  };
}
