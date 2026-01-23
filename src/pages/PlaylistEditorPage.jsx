import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  Clock,
  X,
  Search,
  Save,
  Wand2,
  Sparkles,
  Loader2,
  Check,
  Send,
  Link2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileEdit,
  Calendar,
  MessageSquare,
  Play,
  Pause,
  Minus,
  LayoutGrid,
  GripVertical,
  Settings,
  SkipBack,
  SkipForward,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  BookmarkPlus,
  Palette,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  generateSlides,
  materializePlaylist,
  getBusinessContextFromProfile,
} from '../services/assistantService';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft,
  APPROVAL_STATUS,
  getApprovalStatusConfig,
} from '../services/approvalService';
import {
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  revokePreviewLink,
  formatPreviewLink,
  EXPIRY_PRESETS,
  getExpiryLabel,
} from '../services/previewService';
import { savePlaylistAsTemplate } from '../services/playlistService';
import WeatherWall from '../components/WeatherWall';

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
  app: Grid3X3,
  design: Palette
};

const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
  app: 'App',
  design: 'Design'
};

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'document', label: 'Docs' },
  { key: 'web_page', label: 'Web' },
  { key: 'app', label: 'Apps' },
  { key: 'my_designs', label: 'My Designs' },
];

// Timeline item component - duration-based width with drag support
const PlaylistStripItem = ({ item, index, onRemove, onUpdateDuration, getEffectiveDuration, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, isDragging, minDuration = 5, maxDuration = 30 }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[item.media?.type] || Image;
  const duration = getEffectiveDuration(item);

  // Calculate width based on duration (min 120px, max 200px)
  const durationRange = Math.max(1, maxDuration - minDuration);
  const normalizedDuration = Math.min(1, Math.max(0, (duration - minDuration) / durationRange));
  const width = Math.round(120 + normalizedDuration * 80);

  const adjustDuration = (delta) => {
    const newDuration = Math.max(1, Math.min(3600, duration + delta));
    onUpdateDuration(item.id, newDuration);
  };

  const handleDragStart = (e) => {
    // Set drag image with slight offset for better UX
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target, rect.width / 2, rect.height / 2);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reorder', index, itemId: item.id }));
    // Delay to allow the drag image to be captured before opacity change
    requestAnimationFrame(() => {
      onDragStart?.(index);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(index);
  };

  return (
    <div className="flex items-center">
      {/* Drop indicator line - shows before this item */}
      <div
        className={`h-[92px] rounded-full ${
          isDragOver ? 'w-1 bg-orange-500 mx-1' : 'w-0'
        }`}
        style={{
          transition: 'width 100ms ease-out, margin 100ms ease-out',
          willChange: isDragOver ? 'width, margin' : 'auto'
        }}
      />
      <div
        className={`flex-shrink-0 group ${
          isDragging ? 'opacity-30' : 'opacity-100'
        }`}
        style={{
          width: `${width}px`,
          transition: 'opacity 100ms ease-out',
          willChange: isDragging ? 'opacity' : 'auto'
        }}
        title={item.media?.name || 'Unknown'}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Thumbnail */}
        <div className="relative h-[70px] bg-gray-100 rounded-t overflow-hidden border border-gray-200">
          {item.media?.thumbnail_url || item.media?.url ? (
            <img
              src={item.media.thumbnail_url || item.media.url}
              alt={item.media.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <TypeIcon size={24} className="text-gray-400" />
            </div>
          )}
          {/* Drag handle - top left */}
          <div className="absolute top-1 left-1 p-0.5 bg-black/40 rounded cursor-grab active:cursor-grabbing">
            <GripVertical size={10} className="text-white" />
          </div>
          {/* Remove button - top right */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="absolute top-1 right-1 w-4 h-4 bg-black/40 hover:bg-red-500 rounded-full flex items-center justify-center text-white hover:text-white transition-colors"
          >
            <X size={10} />
          </button>
        </div>
        {/* Duration - compact */}
        <div className="flex items-center justify-between px-1 py-1 bg-gray-100 border border-t-0 border-gray-200 rounded-b text-[10px]">
          <button
            onClick={(e) => { e.stopPropagation(); adjustDuration(-1); }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-gray-700 font-medium">{duration}s</span>
          <button
            onClick={(e) => { e.stopPropagation(); adjustDuration(1); }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Empty slot for drag target - subtle, matches new compact height
const EmptySlot = ({ onClick }) => (
  <div
    onClick={onClick}
    className="flex-shrink-0 w-[70px] h-[92px] border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors"
  >
    <Plus size={18} className="text-gray-400" />
  </div>
);

// Library media item - allows adding same media multiple times, supports drag to timeline
const LibraryMediaItem = ({ media, countInPlaylist = 0, onAdd }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[media.type] || Image;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'add', media }));
    // Add a drag image effect
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  return (
    <div
      className="relative rounded overflow-hidden group cursor-grab hover:ring-2 hover:ring-orange-500 active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="aspect-video bg-gray-800 relative pointer-events-none">
        {media.thumbnail_url || media.url ? (
          <img src={media.thumbnail_url || media.url} alt={media.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={24} className="text-gray-500" />
          </div>
        )}
        {/* Name overlay - single location */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
          <p className="text-xs text-white truncate font-medium">{media.name}</p>
        </div>
        {/* Count badge - shows how many times this item is in the playlist */}
        {countInPlaylist > 0 && (
          <div className="absolute top-1 right-1 min-w-5 h-5 px-1.5 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">{countInPlaylist}</span>
          </div>
        )}
        {/* Drag hint */}
        <div className="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={12} className="text-white" />
        </div>
      </div>
      {/* Add button on click - positioned below for click access */}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(media); }}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
      >
        <div className="bg-orange-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium shadow-lg">
          <Plus size={14} />
          {countInPlaylist > 0 ? 'Add Again' : 'Add'}
        </div>
      </button>
    </div>
  );
};

const PlaylistEditorPage = ({ playlistId, showToast, onNavigate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const logger = useLogger('PlaylistEditorPage');
  const [playlist, setPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const ITEM_HEIGHT = 100; // approximate height of each media item row
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

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
      fetchMediaAssets();
      fetchFolders();
    }
  }, [playlistId]);

  // Fetch media when filter or folder changes
  useEffect(() => {
    fetchMediaAssets();
  }, [mediaFilter, mediaSearch, currentFolderId]);

  // Fetch folders when navigating
  useEffect(() => {
    fetchFolders();
    fetchFolderPath();
  }, [currentFolderId]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);

      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);

      // Fetch playlist items (without join first)
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
  };

  // Fetch folders for current parent
  const fetchFolders = async () => {
    try {
      setLoadingFolders(true);
      // Try RPC first
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
  };

  // Fetch folder path (breadcrumbs)
  const fetchFolderPath = async () => {
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
  };

  const fetchMediaAssets = async () => {
    try {
      // Special handling for "My Designs" filter - fetch from layouts table
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

        // Transform layouts to media-like format for display
        const designsAsMedia = (data || []).map(design => ({
          id: design.id,
          name: design.name,
          type: 'design',
          url: design.background_image,
          thumbnail_url: design.background_image,
          duration: null,
          created_at: design.created_at,
          // Store original design data for adding to playlist
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
  };

  // Navigate to a folder
  const navigateToFolder = (folderId) => {
    setCurrentFolderId(folderId);
  };

  // Virtual scrolling handler
  const handleMediaScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    const containerHeight = e.target.clientHeight;
    const startRow = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleRows = Math.ceil(containerHeight / ITEM_HEIGHT) + 2; // buffer
    const startIndex = Math.max(0, startRow * ITEMS_PER_ROW);
    const endIndex = Math.min(
      mediaAssets.length,
      (startRow + visibleRows) * ITEMS_PER_ROW
    );
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [mediaAssets.length]);

  // Get visible media items for virtual scrolling
  const visibleMediaItems = useMemo(() => {
    return mediaAssets.slice(visibleRange.start, visibleRange.end);
  }, [mediaAssets, visibleRange]);

  const handleAddItem = async (media) => {
    try {
      setSaving(true);

      const maxPosition = items.length > 0
        ? Math.max(...items.map(i => i.position))
        : -1;

      // Check if this is a design (from layouts table)
      const isDesign = media._isDesign;
      const itemType = isDesign ? 'layout' : 'media';

      const { data, error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: playlistId,
          item_type: itemType,
          item_id: media.id,
          position: maxPosition + 1,
          duration: media.duration || 10 // Default 10s for designs
        })
        .select('*')
        .single();

      if (error) throw error;

      // For designs, manually construct the media object for display
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
        // Fetch the media asset for non-designs
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
  };

  const handleRemoveItem = async (itemId) => {
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
  };

  const handleUpdateDuration = async (itemId, duration) => {
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
      logger.error('Error updating item duration', { error, itemId, newDuration });
    }
  };

  // Drag and drop handlers with throttling for smooth UX
  const lastDragOverIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null); // Track current dragOverIndex without state updates
  const isDraggingRef = useRef(false); // Track dragging state without re-renders
  const isDraggingFromLibraryRef = useRef(false); // Track library drag state without re-renders

  const handleTimelineDragStart = (index) => {
    isDraggingRef.current = true;
    dragOverIndexRef.current = null;
    lastDragOverIndexRef.current = null;
    setDragSourceIndex(index);
    setDragOverIndex(null);
  };

  const handleTimelineDragEnd = () => {
    isDraggingRef.current = false;
    dragOverIndexRef.current = null;
    lastDragOverIndexRef.current = null;
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const handleTimelineDragOver = (index) => {
    // Only update if we're actually dragging something within timeline
    if (!isDraggingRef.current && dragSourceIndex === null) return;
    // Don't show indicator on the source item itself
    if (index === dragSourceIndex) {
      if (dragOverIndexRef.current !== null) {
        dragOverIndexRef.current = null;
        lastDragOverIndexRef.current = null;
        setDragOverIndex(null);
      }
      return;
    }
    // Skip if we're already showing indicator at this index
    if (lastDragOverIndexRef.current === index) return;
    lastDragOverIndexRef.current = index;
    dragOverIndexRef.current = index;
    // Update state synchronously - the throttling happens via the ref check above
    setDragOverIndex(index);
  };

  const handleTimelineDrop = async (targetIndex) => {
    // Reset drag state
    const sourceIndex = dragSourceIndex;
    setDragSourceIndex(null);
    setDragOverIndex(null);
    setIsDraggingFromLibrary(false);

    if (sourceIndex === null || sourceIndex === targetIndex) return;
    // Adjust target if dropping after source (since source will be removed first)
    const adjustedTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    if (sourceIndex === adjustedTarget) return;

    // Reorder items locally first for immediate feedback
    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(adjustedTarget, 0, movedItem);

    // Update positions
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
      logger.error('Error reordering playlist items', { error, sourceIndex, destIndex });
      showToast?.('Error saving order', 'error');
      // Revert on error
      fetchPlaylist();
    } finally {
      setSaving(false);
    }
  };

  // Handle drop from library to timeline
  const handleTimelineDropFromLibrary = async (e, targetIndex = items.length) => {
    e.preventDefault();
    // Reset all drag state
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
        // Adding from library
        setSaving(true);

        // Check if this is a design (from layouts table)
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
            duration: data.media.duration || 10 // Default 10s for designs
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
          // Fetch the media asset
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
        // Reordering within timeline
        handleTimelineDrop(targetIndex);
      }
    } catch (error) {
      logger.error('Error handling drag-drop', { error, playlistId });
      showToast?.('Error adding item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTimelineDragOverContainer = (e) => {
    e.preventDefault();
    // If we're reordering within timeline, allow it but don't mark as library drag
    if (isDraggingRef.current) {
      e.dataTransfer.dropEffect = 'move';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';

    // Only update state if not already dragging from library (prevent redundant renders)
    if (!isDraggingFromLibraryRef.current) {
      isDraggingFromLibraryRef.current = true;
      setIsDraggingFromLibrary(true);
    }
  };

  const handleTimelineDragLeave = (e) => {
    // Only reset if we're leaving the container entirely (not moving between children)
    const relatedTarget = e.relatedTarget;
    const container = e.currentTarget;
    if (relatedTarget && container.contains(relatedTarget)) {
      return; // Still within container, don't reset
    }
    isDraggingFromLibraryRef.current = false;
    setIsDraggingFromLibrary(false);
    // Don't reset dragOverIndex here - let the item's dragLeave handle it
  };

  // AI Assistant handlers
  const handleOpenAiModal = () => {
    setShowAiModal(true);
    setAiSuggestion(null);
    setAiSlideCount(4);
  };

  const handleGenerateAiSlides = async () => {
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
  };

  const handleApplyAiSlides = async () => {
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
  };

  // Approval handlers
  const fetchCurrentReview = async () => {
    try {
      const review = await getOpenReviewForResource('playlist', playlistId);
      setCurrentReview(review);
    } catch (error) {
      logger.error('Error fetching approval review', { error, playlistId });
    }
  };

  useEffect(() => {
    if (playlist) {
      fetchCurrentReview();
    }
  }, [playlist?.id]);

  const handleRequestApproval = async () => {
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
      await fetchCurrentReview();
    } catch (error) {
      logger.error('Error requesting playlist approval', { error, playlistId });
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleRevertToDraft = async () => {
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
  };

  // Preview link handlers
  const fetchPreviewLinks = async () => {
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('playlist', playlistId);
      setPreviewLinks(links);
    } catch (error) {
      logger.error('Error fetching preview links', { error, playlistId });
    } finally {
      setLoadingPreviewLinks(false);
    }
  };

  const handleOpenPreviewModal = () => {
    setShowPreviewModal(true);
    fetchPreviewLinks();
  };

  const handleCreatePreviewLink = async () => {
    try {
      setCreatingPreviewLink(true);
      await createPreviewLinkWithPreset({
        resourceType: 'playlist',
        resourceId: playlistId,
        expiryPreset: selectedExpiry,
        allowComments,
      });
      showToast?.('Preview link created');
      await fetchPreviewLinks();
    } catch (error) {
      logger.error('Error creating preview link', { error, playlistId, expiry: selectedExpiry });
      showToast?.(error.message || 'Error creating preview link', 'error');
    } finally {
      setCreatingPreviewLink(false);
    }
  };

  const handleRevokePreviewLink = async (linkId) => {
    if (!window.confirm('Revoke this preview link?')) return;
    try {
      await revokePreviewLink(linkId);
      showToast?.('Preview link revoked');
      await fetchPreviewLinks();
    } catch (error) {
      logger.error('Error revoking preview link', { error, linkId });
      showToast?.(error.message || 'Error revoking link', 'error');
    }
  };

  const handleCopyLink = async (link) => {
    try {
      const url = formatPreviewLink(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast?.('Link copied to clipboard');
    } catch (error) {
      showToast?.('Failed to copy link', 'error');
    }
  };

  // Save as Template handler
  const handleOpenTemplateModal = () => {
    setTemplateName(playlist?.name ? `${playlist.name} Template` : '');
    setTemplateDescription(playlist?.description || '');
    setShowTemplateModal(true);
  };

  const handleSaveAsTemplate = async () => {
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
  };

  const approvalConfig = playlist?.approval_status
    ? getApprovalStatusConfig(playlist.approval_status)
    : null;

  const getEffectiveDuration = (item) => {
    return item.duration || item.media?.duration || playlist?.default_duration || 10;
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => total + getEffectiveDuration(item), 0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Playback controls
  const startPlayback = () => {
    if (items.length === 0) return;
    setIsPlaying(true);
    setCurrentPlayIndex(0);
    setPreviewItem(items[0]);
    scheduleNextItem(0);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  };

  const scheduleNextItem = (index) => {
    const item = items[index];
    if (!item) {
      stopPlayback();
      return;
    }
    const duration = getEffectiveDuration(item) * 1000;
    playTimerRef.current = setTimeout(() => {
      const nextIndex = (index + 1) % items.length;
      setCurrentPlayIndex(nextIndex);
      setPreviewItem(items[nextIndex]);
      if (nextIndex === 0) {
        // Loop completed
        stopPlayback();
      } else {
        scheduleNextItem(nextIndex);
      }
    }, duration);
  };

  const skipToNext = () => {
    if (items.length === 0) return;
    const nextIndex = (currentPlayIndex + 1) % items.length;
    setCurrentPlayIndex(nextIndex);
    setPreviewItem(items[nextIndex]);
    if (isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      scheduleNextItem(nextIndex);
    }
  };

  const skipToPrev = () => {
    if (items.length === 0) return;
    const prevIndex = currentPlayIndex === 0 ? items.length - 1 : currentPlayIndex - 1;
    setCurrentPlayIndex(prevIndex);
    setPreviewItem(items[prevIndex]);
    if (isPlaying) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      scheduleNextItem(prevIndex);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Playlist not found</p>
        <Button variant="outline" className="mt-4" onClick={() => onNavigate?.('playlists')}>
          Back to Playlists
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Editor header with save status */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">{playlist?.name || 'Untitled Playlist'}</h1>
          {saving ? (
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Saving...
            </span>
          ) : (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Check size={12} />
              All changes saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onNavigate?.('playlists')}
          >
            Done
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Library Panel */}
        <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search library..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Folder navigation breadcrumbs */}
          <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateToFolder(null)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ${
                  currentFolderId === null ? 'text-orange-600 font-medium' : 'text-gray-600'
                }`}
              >
                <Home size={12} />
                <span>Root</span>
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center flex-shrink-0">
                  <ChevronRight size={12} className="text-gray-400 mx-0.5" />
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className={`px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors truncate max-w-[80px] ${
                      index === folderPath.length - 1 ? 'text-orange-600 font-medium' : 'text-gray-600'
                    }`}
                    title={folder.name}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Folders list */}
          {folders.length > 0 && (
            <div className="border-b border-gray-200 max-h-[120px] overflow-y-auto">
              <div className="p-1.5 space-y-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder.folder_id}
                    onClick={() => navigateToFolder(folder.folder_id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-orange-50 rounded transition-colors group"
                  >
                    <FolderOpen size={16} className="text-orange-500 flex-shrink-0" />
                    <span className="truncate flex-1 text-gray-700 group-hover:text-orange-600">
                      {folder.folder_name}
                    </span>
                    {folder.media_count > 0 && (
                      <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                        {folder.media_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs - horizontally scrollable */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMediaFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                    mediaFilter === tab.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item count */}
          <div className="px-2 py-1.5 text-xs text-gray-500 border-b border-gray-100 flex items-center justify-between">
            <span>{mediaAssets.length} items</span>
            {currentFolderId && (
              <button
                onClick={() => navigateToFolder(null)}
                className="text-orange-500 hover:text-orange-600 text-xs"
              >
                View all
              </button>
            )}
          </div>

          {/* Media grid with virtual scrolling */}
          <div
            ref={mediaScrollRef}
            className="flex-1 overflow-y-auto p-2"
            onScroll={handleMediaScroll}
          >
            {mediaAssets.length === 0 && folders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                {loadingFolders ? 'Loading...' : 'No media found'}
              </div>
            ) : mediaAssets.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Folder size={32} className="mx-auto mb-2 text-gray-300" />
                <p>This folder is empty</p>
                <p className="text-xs mt-1">Drag media here or browse subfolders</p>
              </div>
            ) : (
              <div
                className="relative"
                style={{
                  height: `${Math.ceil(mediaAssets.length / ITEMS_PER_ROW) * ITEM_HEIGHT}px`,
                }}
              >
                <div
                  className="absolute left-0 right-0 grid grid-cols-2 gap-2"
                  style={{
                    top: `${Math.floor(visibleRange.start / ITEMS_PER_ROW) * ITEM_HEIGHT}px`,
                  }}
                >
                  {visibleMediaItems.map(media => (
                    <LibraryMediaItem
                      key={media.id}
                      media={media}
                      countInPlaylist={items.filter(i => i.item_id === media.id).length}
                      onAdd={handleAddItem}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview area with playlist info */}
        <div className="flex-1 flex flex-col p-3 bg-gray-100 overflow-hidden">
          {/* Main preview content */}
          <div className="flex-1 flex gap-3 min-h-0">
            {/* Large TV Preview */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* TV Frame */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-2xl">
                  <div className="aspect-video bg-gray-900 rounded-xl shadow-2xl overflow-hidden relative ring-4 ring-gray-800">
                    {previewItem ? (
                      // App content - render the actual app component
                      previewItem.media?.type === 'app' ? (
                        (() => {
                          const appType = previewItem.media?.config_json?.appType;
                          const config = previewItem.media?.config_json || {};
                          if (appType === 'weather') {
                            return <WeatherWall config={config} />;
                          }
                          // Unknown app type - show placeholder
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
                              <Grid3X3 size={48} className="mb-3 opacity-60" />
                              <p className="text-lg font-medium">{previewItem.media?.name || 'App'}</p>
                              <p className="text-sm opacity-60 capitalize">{appType || 'Unknown'} App</p>
                            </div>
                          );
                        })()
                      ) : previewItem.media?.thumbnail_url || previewItem.media?.url ? (
                        <img
                          src={previewItem.media.thumbnail_url || previewItem.media.url}
                          alt={previewItem.media.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={64} className="text-gray-600" />
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center mb-3">
                          <Play size={32} className="text-gray-600 ml-1" />
                        </div>
                        <p className="text-base">Select an item to preview</p>
                        <p className="text-xs text-gray-600 mt-1">or click Play to start</p>
                      </div>
                    )}
                    {/* Playing indicator */}
                    {isPlaying && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        PLAYING
                      </div>
                    )}
                    {/* Item counter overlay */}
                    {previewItem && items.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        {(items.findIndex(i => i.id === previewItem.id) + 1) || 1} / {items.length}
                      </div>
                    )}
                  </div>
                  {/* TV Stand decoration */}
                  <div className="flex justify-center">
                    <div className="w-24 h-2 bg-gray-800 rounded-b-lg" />
                  </div>
                </div>
              </div>

              {/* Playback controls - centered below TV */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={skipToPrev}
                  disabled={items.length === 0}
                  className="p-2.5 text-gray-600 hover:bg-white hover:shadow rounded-full transition-all disabled:opacity-40"
                >
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  disabled={items.length === 0}
                  className="p-4 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-40 disabled:hover:bg-orange-500"
                >
                  {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
                </button>
                <button
                  onClick={skipToNext}
                  disabled={items.length === 0}
                  className="p-2.5 text-gray-600 hover:bg-white hover:shadow rounded-full transition-all disabled:opacity-40"
                >
                  <SkipForward size={22} />
                </button>
              </div>

              {/* Current item info */}
              {previewItem && (
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-800">{previewItem.media?.name}</p>
                  <p className="text-xs text-gray-500">
                    Duration: {getEffectiveDuration(previewItem)}s
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* Timeline header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
          <span className="text-xs text-gray-600 font-medium">
            {items.length} items &bull; {formatDuration(getTotalDuration())}
          </span>
          <button
            onClick={() => setShowApprovalModal(true)}
            className="text-gray-500 hover:text-orange-600 text-xs flex items-center gap-1 transition-colors"
          >
            <Send size={12} />
            Request Approval
          </button>
        </div>

        {/* Timeline items */}
        <div
          ref={timelineRef}
          className={`flex items-center px-3 py-2 overflow-x-auto transition-colors ${
            isDraggingFromLibrary ? 'bg-orange-50 ring-2 ring-orange-300 ring-inset' : 'bg-gray-50'
          }`}
          onDragOver={handleTimelineDragOverContainer}
          onDragLeave={handleTimelineDragLeave}
          onDrop={(e) => handleTimelineDropFromLibrary(e, items.length)}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              onClick={() => {
                setPreviewItem(item);
                setCurrentPlayIndex(index);
              }}
              className={`cursor-pointer relative ${
                previewItem?.id === item.id && dragSourceIndex === null ? 'ring-2 ring-orange-500 ring-offset-1 rounded' : ''
              } ${isPlaying && currentPlayIndex === index ? 'ring-2 ring-green-500 ring-offset-1 rounded' : ''}`}
            >
              <PlaylistStripItem
                item={item}
                index={index}
                onRemove={handleRemoveItem}
                onUpdateDuration={handleUpdateDuration}
                getEffectiveDuration={getEffectiveDuration}
                onDragStart={handleTimelineDragStart}
                onDragEnd={handleTimelineDragEnd}
                onDragOver={handleTimelineDragOver}
                onDrop={handleTimelineDrop}
                isDragOver={dragOverIndex === index}
                isDragging={dragSourceIndex === index}
              />
              {/* Playing indicator on timeline */}
              {isPlaying && currentPlayIndex === index && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium z-10">
                  ▶ NOW
                </div>
              )}
            </div>
          ))}
          {/* Drop zone at the end */}
          <div className="flex items-center">
            {/* Drop indicator line for end position */}
            <div
              className={`h-[92px] rounded-full ${
                dragOverIndex === items.length ? 'w-1 bg-orange-500 mx-1' : 'w-0'
              }`}
              style={{
                transition: 'width 100ms ease-out, margin 100ms ease-out',
                willChange: dragOverIndex === items.length ? 'width, margin' : 'auto'
              }}
            />
            <div
              className={`flex-shrink-0 w-[70px] h-[92px] border border-dashed rounded-lg flex items-center justify-center cursor-pointer ${
                isDraggingFromLibrary || dragSourceIndex !== null
                  ? 'border-orange-500 bg-orange-100 border-2'
                  : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
              }`}
              style={{ transition: 'border-color 150ms, background-color 150ms' }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Only update if it's different from current
                if (dragSourceIndex !== null && lastDragOverIndexRef.current !== items.length) {
                  lastDragOverIndexRef.current = items.length;
                  setDragOverIndex(items.length);
                }
              }}
              onDragLeave={() => {
                if (lastDragOverIndexRef.current === items.length) {
                  lastDragOverIndexRef.current = null;
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => { e.stopPropagation(); handleTimelineDropFromLibrary(e, items.length); }}
            >
              <Plus size={18} className={isDraggingFromLibrary || dragSourceIndex !== null ? 'text-orange-500' : 'text-gray-400'} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggest Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Wand2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">AI Slide Suggestions</h2>
                  <p className="text-sm text-gray-500">Generate content slides for your playlist</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!aiSuggestion ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of slides to generate
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={aiSlideCount}
                        onChange={(e) => setAiSlideCount(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-gray-900 w-8 text-center">{aiSlideCount}</span>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles size={20} className="text-purple-500 mt-0.5" />
                      <p className="text-sm text-purple-700">
                        AI will generate slide content based on your business profile and playlist name.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <Check size={20} />
                    <span className="font-medium">Generated {aiSuggestion.payload?.slides?.length || 0} slides</span>
                  </div>
                  {aiSuggestion.payload?.slides?.map((slide, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{slide.headline}</h4>
                          <p className="text-sm text-gray-600 mt-1">{slide.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              {!aiSuggestion ? (
                <>
                  <Button variant="outline" onClick={() => setShowAiModal(false)}>Cancel</Button>
                  <Button onClick={handleGenerateAiSlides} disabled={aiGenerating}>
                    {aiGenerating ? <><Loader2 size={18} className="animate-spin mr-2" />Generating...</> : <><Sparkles size={18} className="mr-2" />Generate Slides</>}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setAiSuggestion(null)} disabled={aiApplying}>Generate Different</Button>
                  <Button onClick={handleApplyAiSlides} disabled={aiApplying}>
                    {aiApplying ? <><Loader2 size={18} className="animate-spin mr-2" />Adding...</> : <><Check size={18} className="mr-2" />Add {aiSuggestion.payload?.slides?.length || 0} Slides</>}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Request Approval</h2>
              <button onClick={() => setShowApprovalModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
                <textarea
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="Add any notes for the reviewer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
              <Button onClick={handleRequestApproval} disabled={submittingApproval}>
                {submittingApproval ? <><Loader2 size={18} className="animate-spin mr-2" />Submitting...</> : <><Send size={18} className="mr-2" />Request Approval</>}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Links Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Preview Links</h2>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Create New Link</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires in</label>
                    <select
                      value={selectedExpiry}
                      onChange={(e) => setSelectedExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(EXPIRY_PRESETS).map(([key]) => (
                        <option key={key} value={key}>{getExpiryLabel(key)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Allow comments</span>
                    </label>
                  </div>
                </div>
                <Button onClick={handleCreatePreviewLink} disabled={creatingPreviewLink} className="w-full">
                  {creatingPreviewLink ? <><Loader2 size={18} className="animate-spin mr-2" />Creating...</> : <><Plus size={18} className="mr-2" />Create Preview Link</>}
                </Button>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Active Links</h3>
                {loadingPreviewLinks ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading links...</p>
                  </div>
                ) : previewLinks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No preview links yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previewLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <code className="text-sm bg-gray-100 px-2 py-0.5 rounded truncate block max-w-[200px]">{link.token}</code>
                          <p className="text-xs text-gray-500 mt-1">
                            Expires: {new Date(link.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleCopyLink(link)} className="p-2 hover:bg-gray-100 rounded-lg">
                            {copiedLinkId === link.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                          </button>
                          <a href={formatPreviewLink(link.token)} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-lg">
                            <ExternalLink size={16} className="text-gray-500" />
                          </a>
                          <button onClick={() => handleRevokePreviewLink(link.id)} className="p-2 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookmarkPlus size={20} className="text-orange-500" />
                Save as Template
              </h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Create a reusable template from this playlist. The template can be applied to quickly create new playlists with the same structure.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Restaurant Menu Template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p><strong>Items included:</strong> {items.length} items</p>
                <p><strong>Total duration:</strong> {formatDuration(getTotalDuration())}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)} disabled={savingTemplate}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {savingTemplate ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={16} className="mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlaylistEditorPage;
