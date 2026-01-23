/**
 * useMediaLibrary Hook
 *
 * Comprehensive hook for Media Library page that composes existing hooks
 * (useMediaFolders, useS3Upload) and adds media data, bulk selection,
 * modal state, and CRUD operations.
 *
 * @module pages/hooks/useMediaLibrary
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { createScopedLogger } from '../../services/loggingService.js';
import { useMediaFolders } from '../../hooks/useMediaFolders.js';
import { useS3Upload } from '../../hooks/useS3Upload.jsx';
import {
  createMediaAsset,
  createWebPageAsset,
  MEDIA_TYPES,
  deleteMediaAssetSafely,
  getMediaUsage,
  moveMediaToFolder,
  reorderMedia,
  moveMediaToFolderOrdered,
  fetchMediaAssets as fetchMediaAssetsService,
  getBulkDownloadUrls,
  batchDeleteMediaAssets,
} from '../../services/mediaService';
import {
  getEffectiveLimits,
  hasReachedLimit,
} from '../../services/limitsService';
import { fetchPlaylists, addPlaylistItem, createPlaylist, bulkAddToPlaylist } from '../../services/playlistService';
import { fetchScreens, assignPlaylistToScreen } from '../../services/screenService';

const logger = createScopedLogger('useMediaLibrary');

/**
 * Get media type from upload result
 */
const getMediaTypeFromUpload = (mediaType, format) => {
  if (mediaType === 'image') return MEDIA_TYPES.IMAGE;
  if (mediaType === 'video') return MEDIA_TYPES.VIDEO;
  if (mediaType === 'audio') return MEDIA_TYPES.AUDIO;
  if (mediaType === 'document') return MEDIA_TYPES.DOCUMENT;
  // Fallback based on format
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(format)) return MEDIA_TYPES.AUDIO;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(format)) return MEDIA_TYPES.DOCUMENT;
  return MEDIA_TYPES.IMAGE;
};

/**
 * useMediaLibrary hook
 *
 * @param {Object} options - Hook options
 * @param {Function} options.showToast - Toast notification function
 * @param {string|null} options.filter - Optional type filter from props
 * @returns {Object} Media library state and actions
 */
export function useMediaLibrary({ showToast, filter = null } = {}) {
  // ============================================================
  // Compose existing hooks
  // ============================================================

  // Current folder tracking (needed before useMediaFolders)
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // Compose useMediaFolders for folder navigation
  const folderHook = useMediaFolders({ parentId: currentFolderId });
  const {
    folders,
    isLoading: foldersLoading,
    folderPath,
    createFolder,
    renameFolder,
    deleteFolder,
    refresh: refreshFolders,
    moveMediaToFolder: moveFolderMedia,
    moveMediaToFolderOrdered: moveFolderMediaOrdered,
  } = folderHook;

  // Upload success handler (defined before useS3Upload)
  const handleUploadSuccessRef = useRef(null);

  // Compose useS3Upload for file uploads
  const uploadHook = useS3Upload({
    onSuccess: (result) => handleUploadSuccessRef.current?.(result),
    onError: (error) => {
      logger.error('Upload failed', { error });
      showToast?.(`Upload failed: ${error.message}`, 'error');
    },
    folder: 'bizscreen/media',
    multiple: true,
  });
  const {
    openFilePicker,
    renderFileInput,
    uploading: isUploading,
    progress: uploadProgress,
    uploadedFiles: s3UploadedFiles,
    handleDrop: handleS3Drop,
  } = uploadHook;

  // ============================================================
  // Media Data State
  // ============================================================

  const [mediaAssets, setMediaAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ============================================================
  // Filter/Search State
  // ============================================================

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [orientationFilter, setOrientationFilter] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // ============================================================
  // Bulk Selection State
  // ============================================================

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isBulkAddingToPlaylist, setIsBulkAddingToPlaylist] = useState(false);

  // ============================================================
  // Modal State
  // ============================================================

  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showPushToScreenModal, setShowPushToScreenModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showBulkPlaylistModal, setShowBulkPlaylistModal] = useState(false);

  // Modal data state
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mediaToMove, setMediaToMove] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [screens, setScreens] = useState([]);

  // Upload modal state
  const [uploadTab, setUploadTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [savingUploads, setSavingUploads] = useState(false);
  const [webPageUrl, setWebPageUrl] = useState('');
  const [webPageName, setWebPageName] = useState('');
  const [savingWebPage, setSavingWebPage] = useState(false);

  // Folder modal state
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [movingMedia, setMovingMedia] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingForce, setDeletingForce] = useState(false);

  // Playlist/Screen modal state
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  const [settingToScreen, setSettingToScreen] = useState(false);

  // Drag and drop state
  const [draggingMedia, setDraggingMedia] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // ============================================================
  // Derived State
  // ============================================================

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;
  const limitReached = limits ? hasReachedLimit(limits.maxMediaAssets, mediaAssets.length) : false;
  const hasActiveFilters = typeFilter || orientationFilter;

  // Apply client-side filters
  const filteredAssets = mediaAssets.filter((asset) => {
    if (typeFilter && asset.type !== typeFilter) return false;
    if (orientationFilter && asset.orientation !== orientationFilter) return false;
    return true;
  });

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchAssets = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchMediaAssetsService({
        type: filter || null,
        search: search || '',
        page,
        pageSize: itemsPerPage,
        folderId: currentFolderId,
      });

      setMediaAssets(result.data || []);
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      logger.error('Error fetching media assets', { error: err, page, folderId: currentFolderId });
      setError(err.message || 'Failed to load media');
      showToast?.('Error loading media: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, search, itemsPerPage, currentFolderId, showToast, currentPage]);

  const fetchLimits = useCallback(async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      logger.error('Error fetching media limits', { error });
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAssets();
    refreshFolders();
  }, [fetchAssets, refreshFolders]);

  // ============================================================
  // Upload Handlers
  // ============================================================

  const handleUploadSuccess = useCallback(async (uploadedFile) => {
    logger.info('Upload success, saving to library', {
      filename: uploadedFile.originalFilename || uploadedFile.name,
      mediaType: uploadedFile.mediaType || uploadedFile.resourceType,
      size: uploadedFile.size,
    });
    showToast?.('File uploaded, saving to library...');

    try {
      const mediaType = getMediaTypeFromUpload(
        uploadedFile.mediaType || uploadedFile.resourceType,
        uploadedFile.format
      );
      const asset = await createMediaAsset({
        name: uploadedFile.originalFilename || uploadedFile.name || `Media ${Date.now()}`,
        type: mediaType,
        url: uploadedFile.url,
        thumbnailUrl: uploadedFile.thumbnail,
        mimeType: uploadedFile.type || `${uploadedFile.resourceType}/${uploadedFile.format}`,
        fileSize: uploadedFile.size,
        duration: uploadedFile.duration,
        width: uploadedFile.width,
        height: uploadedFile.height,
        folderId: currentFolderId,
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setShowAddMediaModal(false);
      showToast?.('Media added successfully!', 'success');
      if (currentFolderId) refreshFolders();
    } catch (error) {
      logger.error('Error saving media to database', { error, folderId: currentFolderId });
      showToast?.(`Error saving media: ${error.message}`, 'error');
      setUploadedFiles((prev) => [...prev, uploadedFile]);
    }
  }, [showToast, currentFolderId, refreshFolders]);

  // Keep the ref updated
  handleUploadSuccessRef.current = handleUploadSuccess;

  const saveUploadedFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    try {
      setSavingUploads(true);
      const savedAssets = [];

      for (const file of uploadedFiles) {
        const mediaType = getMediaTypeFromUpload(file.mediaType || file.resourceType, file.format);
        const asset = await createMediaAsset({
          name: file.originalFilename || file.name || `Media ${Date.now()}`,
          type: mediaType,
          url: file.url,
          thumbnailUrl: file.thumbnail,
          mimeType: file.type || `${file.resourceType}/${file.format}`,
          fileSize: file.size,
          duration: file.duration,
          width: file.width,
          height: file.height,
          folderId: currentFolderId,
        });
        savedAssets.push(asset);
      }

      setMediaAssets((prev) => [...savedAssets, ...prev]);
      setUploadedFiles([]);
      setShowAddMediaModal(false);
      showToast?.(`${savedAssets.length} media file(s) added successfully`);
      if (currentFolderId) refreshFolders();
    } catch (error) {
      logger.error('Error saving batch uploads', { error, fileCount: uploadedFiles.length });
      showToast?.(`Error saving media: ${error.message}`, 'error');
    } finally {
      setSavingUploads(false);
    }
  }, [uploadedFiles, currentFolderId, showToast, refreshFolders]);

  const saveWebPage = useCallback(async (e) => {
    e?.preventDefault?.();
    if (!webPageUrl) return;

    try {
      setSavingWebPage(true);
      const asset = await createWebPageAsset({
        name: webPageName || webPageUrl,
        url: webPageUrl,
        folderId: currentFolderId,
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setWebPageUrl('');
      setWebPageName('');
      setShowAddMediaModal(false);
      showToast?.('Web page added successfully');
      if (currentFolderId) refreshFolders();
    } catch (error) {
      logger.error('Error adding web page', { error, url: webPageUrl });
      showToast?.(`Error adding web page: ${error.message}`, 'error');
    } finally {
      setSavingWebPage(false);
    }
  }, [webPageUrl, webPageName, currentFolderId, showToast, refreshFolders]);

  // ============================================================
  // CRUD Handlers
  // ============================================================

  const handleCreateAsset = useCallback(async (assetData) => {
    try {
      const asset = await createMediaAsset({
        ...assetData,
        folderId: currentFolderId,
      });
      setMediaAssets((prev) => [asset, ...prev]);
      showToast?.('Media created successfully', 'success');
      return asset;
    } catch (error) {
      logger.error('Error creating asset', { error, assetData });
      showToast?.(`Error creating media: ${error.message}`, 'error');
      throw error;
    }
  }, [currentFolderId, showToast]);

  const handleUpdateAsset = useCallback(async (assetId, updates) => {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .update(updates)
        .eq('id', assetId)
        .select()
        .single();

      if (error) throw error;

      setMediaAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, ...data } : a))
      );
      setSelectedAsset((prev) => (prev?.id === assetId ? { ...prev, ...data } : prev));
      return data;
    } catch (err) {
      logger.error('Error updating media asset', { error: err, assetId, updates });
      throw err;
    }
  }, []);

  const handleDelete = useCallback(async (asset) => {
    setDeleteConfirm({ id: asset.id, name: asset.name, usage: null, loading: true });

    try {
      const usage = await getMediaUsage(asset.id);
      setDeleteConfirm({ id: asset.id, name: asset.name, usage, loading: false });
    } catch (error) {
      logger.error('Error checking media usage before delete', { error, assetId: asset.id });
      setDeleteConfirm({ id: asset.id, name: asset.name, usage: null, loading: false });
    }
  }, []);

  const handleDeleteConfirm = useCallback(async (force = false) => {
    if (!deleteConfirm) return;

    setDeletingForce(true);
    try {
      const result = await deleteMediaAssetSafely(deleteConfirm.id, { force });

      if (result.success) {
        setMediaAssets((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
        showToast?.('Media deleted successfully');
        setDeleteConfirm(null);
      } else if (result.code === 'IN_USE' && !force) {
        setDeleteConfirm((prev) => ({ ...prev, usage: result.usage }));
      } else {
        showToast?.(result.error || 'Error deleting media', 'error');
      }
    } catch (error) {
      logger.error('Error deleting media asset', { error, assetId: deleteConfirm.id, force });
      showToast?.('Error deleting media: ' + error.message, 'error');
    } finally {
      setDeletingForce(false);
    }
  }, [deleteConfirm, showToast]);

  const handleDeleteFromDetail = useCallback(async (assetId) => {
    const result = await deleteMediaAssetSafely(assetId, { force: true });
    if (result.success) {
      setMediaAssets((prev) => prev.filter((a) => a.id !== assetId));
    } else {
      throw new Error(result.error || 'Failed to delete');
    }
  }, []);

  const handleDuplicateAsset = useCallback(async (asset) => {
    try {
      const duplicated = await createMediaAsset({
        name: `${asset.name} (copy)`,
        type: asset.type,
        url: asset.url,
        thumbnailUrl: asset.thumbnail_url,
        mimeType: asset.mime_type,
        fileSize: asset.file_size,
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        folderId: currentFolderId,
      });
      setMediaAssets((prev) => [duplicated, ...prev]);
      showToast?.('Media duplicated successfully', 'success');
      return duplicated;
    } catch (error) {
      logger.error('Error duplicating asset', { error, assetId: asset.id });
      showToast?.(`Error duplicating media: ${error.message}`, 'error');
      throw error;
    }
  }, [currentFolderId, showToast]);

  // ============================================================
  // Move/Folder Handlers
  // ============================================================

  const handleMove = useCallback((asset) => {
    setMediaToMove(asset);
    setShowMoveModal(true);
  }, []);

  const handleMoveConfirm = useCallback(async (targetFolderId) => {
    if (!mediaToMove) return;

    try {
      setMovingMedia(true);
      await moveMediaToFolder([mediaToMove.id], targetFolderId);
      showToast?.(`"${mediaToMove.name}" moved successfully`, 'success');
      setShowMoveModal(false);
      setMediaToMove(null);
      fetchAssets();
      refreshFolders();
    } catch (error) {
      logger.error('Error moving media to folder', { error, mediaId: mediaToMove.id, targetFolderId });
      showToast?.(`Error moving media: ${error.message}`, 'error');
    } finally {
      setMovingMedia(false);
    }
  }, [mediaToMove, fetchAssets, refreshFolders, showToast]);

  const handleCreateFolder = useCallback(async (folderName) => {
    try {
      setCreatingFolder(true);
      await createFolder({ name: folderName, parentId: currentFolderId });
      showToast?.(`Folder "${folderName}" created successfully`, 'success');
      setShowFolderModal(false);
      setNewFolderName('');
    } catch (err) {
      logger.error('Error creating folder', { error: err, folderName, parentId: currentFolderId });
      showToast?.('Failed to create folder: ' + err.message, 'error');
    } finally {
      setCreatingFolder(false);
    }
  }, [createFolder, currentFolderId, showToast]);

  const handleNavigateFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  }, []);

  const handleNavigateUp = useCallback(() => {
    if (folderPath.length > 1) {
      const parentFolder = folderPath[folderPath.length - 2];
      setCurrentFolderId(parentFolder.id);
    } else {
      setCurrentFolderId(null);
    }
    setCurrentPage(1);
  }, [folderPath]);

  // ============================================================
  // Playlist Handlers
  // ============================================================

  const handleAddToPlaylist = useCallback(async (media) => {
    try {
      const playlistList = await fetchPlaylists({ limit: 50 });
      setPlaylists(playlistList || []);
      setSelectedAsset(media);
      setShowAddToPlaylistModal(true);
    } catch (error) {
      logger.error('Error fetching playlists for media addition', { error });
      showToast?.('Error loading playlists', 'error');
    }
  }, [showToast]);

  const handleConfirmAddToPlaylist = useCallback(async (playlistId, playlistName) => {
    if (!selectedAsset) return;
    setAddingToPlaylist(true);
    try {
      await addPlaylistItem(playlistId, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      showToast?.(`Added "${selectedAsset.name}" to "${playlistName}"`, 'success');
      setShowAddToPlaylistModal(false);
    } catch (error) {
      logger.error('Error adding media to playlist', { error, playlistId, assetId: selectedAsset?.id });
      showToast?.(`Error adding to playlist: ${error.message}`, 'error');
    } finally {
      setAddingToPlaylist(false);
    }
  }, [selectedAsset, showToast]);

  const handleCreateNewPlaylist = useCallback(async () => {
    if (!selectedAsset) return;
    setAddingToPlaylist(true);
    try {
      const playlist = await createPlaylist({
        name: `${selectedAsset.name} Playlist`,
        description: `Playlist created from ${selectedAsset.name}`,
      });
      await addPlaylistItem(playlist.id, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      showToast?.(`Created playlist "${playlist.name}" with ${selectedAsset.name}`, 'success');
      setShowAddToPlaylistModal(false);
    } catch (error) {
      logger.error('Error creating new playlist from media', { error, assetId: selectedAsset?.id });
      showToast?.(`Error creating playlist: ${error.message}`, 'error');
    } finally {
      setAddingToPlaylist(false);
    }
  }, [selectedAsset, showToast]);

  // ============================================================
  // Screen Handlers
  // ============================================================

  const handlePushToScreen = useCallback(async (media) => {
    try {
      const screenList = await fetchScreens({ limit: 50 });
      setScreens(screenList || []);
      setSelectedAsset(media);
      setShowPushToScreenModal(true);
    } catch (error) {
      logger.error('Error fetching screens for media assignment', { error });
      showToast?.('Error loading screens', 'error');
    }
  }, [showToast]);

  const handleConfirmPushToScreen = useCallback(async (screenId, screenName) => {
    if (!selectedAsset) return;
    setSettingToScreen(true);
    try {
      const playlist = await createPlaylist({
        name: `Quick: ${selectedAsset.name}`,
        description: `Quick display playlist for ${selectedAsset.name}`,
      });
      await addPlaylistItem(playlist.id, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      await assignPlaylistToScreen(screenId, playlist.id);
      showToast?.(`"${selectedAsset.name}" is now playing on "${screenName}"`, 'success');
      setShowPushToScreenModal(false);
    } catch (error) {
      logger.error('Error assigning media to screen', { error, screenId, assetId: selectedAsset?.id });
      showToast?.(`Error: ${error.message}`, 'error');
    } finally {
      setSettingToScreen(false);
    }
  }, [selectedAsset, showToast]);

  // ============================================================
  // Bulk Selection Handlers
  // ============================================================

  const toggleSelection = useCallback((assetId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(filteredAssets.map((a) => a.id));
    setSelectedIds(allIds);
  }, [filteredAssets]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ============================================================
  // Bulk Action Handlers
  // ============================================================

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} item(s)? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      await batchDeleteMediaAssets(idsArray);
      showToast?.(`${idsArray.length} items deleted successfully`);
      setSelectedIds(new Set());
      fetchAssets();
    } catch (error) {
      logger.error('Bulk delete operation failed', { error, itemCount: selectedIds.size });
      showToast?.('Failed to delete some items: ' + error.message, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, fetchAssets, showToast]);

  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDownloading(true);
    try {
      const idsArray = Array.from(selectedIds);
      const urls = await getBulkDownloadUrls(idsArray);

      urls.forEach((item, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = item.url;
          link.download = item.name || `media-${item.id}`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 200);
      });

      showToast?.(`Downloading ${urls.length} files...`);
    } catch (error) {
      logger.error('Bulk download operation failed', { error, itemCount: selectedIds.size });
      showToast?.('Failed to download files: ' + error.message, 'error');
    } finally {
      setIsBulkDownloading(false);
    }
  }, [selectedIds, showToast]);

  const handleBulkAddToPlaylist = useCallback(async (playlistId) => {
    if (selectedIds.size === 0 || !playlistId) return;

    setIsBulkAddingToPlaylist(true);
    try {
      const idsArray = Array.from(selectedIds);
      const result = await bulkAddToPlaylist(playlistId, idsArray);
      showToast?.(`Added ${result.added} items to playlist`);
      setShowBulkPlaylistModal(false);
      setSelectedIds(new Set());
    } catch (error) {
      logger.error('Bulk add to playlist failed', { error, playlistId, itemCount: selectedIds.size });
      showToast?.('Failed to add items to playlist: ' + error.message, 'error');
    } finally {
      setIsBulkAddingToPlaylist(false);
    }
  }, [selectedIds, showToast]);

  const openBulkPlaylistModal = useCallback(async () => {
    setShowBulkPlaylistModal(true);
    try {
      const playlistList = await fetchPlaylists();
      setPlaylists(playlistList || []);
    } catch (error) {
      logger.error('Failed to fetch playlists for bulk operation', { error });
    }
  }, []);

  const handleBulkMove = useCallback(() => {
    if (selectedIds.size === 0) return;
    const firstSelectedId = Array.from(selectedIds)[0];
    const asset = mediaAssets.find((a) => a.id === firstSelectedId);
    if (asset) {
      setMediaToMove(asset);
      setShowMoveModal(true);
    }
  }, [selectedIds, mediaAssets]);

  // ============================================================
  // Drag and Drop Handlers
  // ============================================================

  const handleDragStart = useCallback((asset, index) => {
    setDraggingMedia(asset);
    setDraggingIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingMedia(null);
    setDraggingIndex(null);
    setDragOverIndex(null);
    setDragOverFolderId(null);
  }, []);

  const handleDragOverMedia = useCallback((index) => {
    setDragOverIndex(index);
    setDragOverFolderId(null);
  }, []);

  const handleDragOverFolder = useCallback((folderId) => {
    setDragOverFolderId(folderId);
    setDragOverIndex(null);
  }, []);

  const handleDragLeaveFolder = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleReorderMedia = useCallback(async (draggedId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    // Optimistic update
    setMediaAssets((prev) => {
      const newAssets = [...prev];
      const [draggedItem] = newAssets.splice(fromIndex, 1);
      newAssets.splice(toIndex, 0, draggedItem);
      return newAssets;
    });

    handleDragEnd();

    try {
      await reorderMedia(draggedId, toIndex, currentFolderId);
      showToast?.('Media reordered', 'success');
    } catch (error) {
      logger.error('Error saving media reorder', { error, mediaId: draggedId, toIndex, folderId: currentFolderId });
      showToast?.('Failed to save order: ' + error.message, 'error');
      fetchAssets();
    }
  }, [currentFolderId, showToast, handleDragEnd, fetchAssets]);

  const handleDropOnFolder = useCallback(async (mediaId, folderId, mediaName) => {
    handleDragEnd();

    try {
      await moveMediaToFolderOrdered(mediaId, folderId);
      showToast?.(`"${mediaName}" moved to folder`, 'success');
      fetchAssets();
      refreshFolders();
    } catch (error) {
      logger.error('Error moving media to folder via drag-drop', { error, mediaId, folderId });
      showToast?.('Failed to move: ' + error.message, 'error');
    }
  }, [showToast, handleDragEnd, fetchAssets, refreshFolders]);

  // ============================================================
  // Utility Functions
  // ============================================================

  const clearAllFilters = useCallback(() => {
    setTypeFilter(null);
    setOrientationFilter(null);
    setSearch('');
  }, []);

  const handleSelectAsset = useCallback((asset) => {
    setSelectedAsset(asset);
  }, []);

  const handleOpenDetail = useCallback((asset) => {
    setSelectedAsset(asset);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailModal(false);
  }, []);

  const closeUploadModal = useCallback(() => {
    setShowAddMediaModal(false);
    setUploadedFiles([]);
    setWebPageUrl('');
    setWebPageName('');
    setUploadTab('upload');
  }, []);

  const closeFolderModal = useCallback(() => {
    setShowFolderModal(false);
    setNewFolderName('');
  }, []);

  const closeMoveModal = useCallback(() => {
    setShowMoveModal(false);
    setMediaToMove(null);
  }, []);

  const closePlaylistModal = useCallback(() => {
    setShowAddToPlaylistModal(false);
  }, []);

  const closeScreenModal = useCallback(() => {
    setShowPushToScreenModal(false);
  }, []);

  const handleAddMedia = useCallback(() => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowAddMediaModal(true);
    }
  }, [limitReached]);

  // ============================================================
  // Effects
  // ============================================================

  // Fetch on mount and when folder changes
  useEffect(() => {
    fetchAssets();
    fetchLimits();
  }, [filter, currentFolderId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchAssets(1);
  }, [search, filter, itemsPerPage, currentFolderId]);

  // Refetch when page changes
  useEffect(() => {
    fetchAssets(currentPage);
  }, [currentPage]);

  // ============================================================
  // Return
  // ============================================================

  return {
    // From useMediaFolders (via composition)
    folders,
    foldersLoading,
    folderPath,
    createFolder,
    renameFolder,
    deleteFolder,
    refreshFolders,

    // From useS3Upload (via composition)
    isUploading,
    uploadProgress,
    openFilePicker,
    renderFileInput,
    handleS3Drop,

    // Folder navigation
    currentFolderId,
    setCurrentFolderId,
    handleNavigateFolder,
    handleNavigateUp,
    handleCreateFolder,

    // Media data
    mediaAssets,
    filteredAssets,
    loading,
    error,
    limits,
    limitReached,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // Filter/search
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    orientationFilter,
    setOrientationFilter,
    viewMode,
    setViewMode,
    hasActiveFilters,
    clearAllFilters,

    // Bulk selection
    selectedIds,
    selectedCount,
    hasSelection,
    toggleSelection,
    selectAll,
    deselectAll,
    clearSelection,
    bulkActionLoading,
    isBulkDeleting,
    isBulkDownloading,
    isBulkAddingToPlaylist,

    // Modal state
    showAddMediaModal,
    setShowAddMediaModal,
    showDetailModal,
    setShowDetailModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showMoveModal,
    setShowMoveModal,
    showAddToPlaylistModal,
    setShowAddToPlaylistModal,
    showPushToScreenModal,
    setShowPushToScreenModal,
    showFolderModal,
    setShowFolderModal,
    showLimitModal,
    setShowLimitModal,
    showBulkPlaylistModal,
    setShowBulkPlaylistModal,

    // Modal data
    editingAsset,
    setEditingAsset,
    selectedAsset,
    setSelectedAsset,
    deleteTarget,
    setDeleteTarget,
    deleteConfirm,
    setDeleteConfirm,
    mediaToMove,
    setMediaToMove,
    playlists,
    screens,

    // Upload modal state
    uploadTab,
    setUploadTab,
    uploadedFiles,
    setUploadedFiles,
    savingUploads,
    webPageUrl,
    setWebPageUrl,
    webPageName,
    setWebPageName,
    savingWebPage,

    // Folder modal state
    newFolderName,
    setNewFolderName,
    creatingFolder,
    movingMedia,
    deletingForce,
    addingToPlaylist,
    settingToScreen,

    // Drag state
    draggingMedia,
    draggingIndex,
    dragOverIndex,
    dragOverFolderId,

    // Actions
    fetchAssets,
    fetchLimits,
    handleRefresh,
    handleCreateAsset,
    handleUpdateAsset,
    handleDelete,
    handleDeleteConfirm,
    handleDeleteFromDetail,
    handleDuplicateAsset,
    handleMove,
    handleMoveConfirm,
    handleAddToPlaylist,
    handleConfirmAddToPlaylist,
    handleCreateNewPlaylist,
    handlePushToScreen,
    handleConfirmPushToScreen,

    // Bulk actions
    handleBulkDelete,
    handleBulkDownload,
    handleBulkAddToPlaylist,
    handleBulkMove,
    openBulkPlaylistModal,

    // Drag handlers
    handleDragStart,
    handleDragEnd,
    handleDragOverMedia,
    handleDragOverFolder,
    handleDragLeaveFolder,
    handleReorderMedia,
    handleDropOnFolder,

    // Upload handlers
    handleUploadSuccess,
    saveUploadedFiles,
    saveWebPage,

    // UI handlers
    handleSelectAsset,
    handleOpenDetail,
    handleCloseDetail,
    handleAddMedia,
    closeUploadModal,
    closeFolderModal,
    closeMoveModal,
    closePlaylistModal,
    closeScreenModal,
  };
}

export default useMediaLibrary;
