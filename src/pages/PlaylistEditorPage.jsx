import { useCallback } from 'react';
import {
  Plus,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  X,
  Search,
  Wand2,
  Sparkles,
  Loader2,
  Check,
  Send,
  Link2,
  Copy,
  ExternalLink,
  Play,
  Pause,
  Minus,
  GripVertical,
  SkipBack,
  SkipForward,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  BookmarkPlus,
  Trash2,
  Palette,
} from 'lucide-react';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';
import {
  getApprovalStatusConfig,
} from '../services/approvalService';
import {
  formatPreviewLink,
  EXPIRY_PRESETS,
  getExpiryLabel,
} from '../services/previewService';
import { usePlaylistEditor } from './hooks';
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
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target, rect.width / 2, rect.height / 2);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reorder', index, itemId: item.id }));
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

// Library media item - allows adding same media multiple times, supports drag to timeline
const LibraryMediaItem = ({ media, countInPlaylist = 0, onAdd }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[media.type] || Image;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'add', media }));
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

  // Use the custom hook for all playlist editor state and logic
  const {
    // Playlist state
    playlist,
    items,
    loading,
    saving,

    // Media library state
    mediaAssets,
    mediaSearch,
    setMediaSearch,
    mediaFilter,
    setMediaFilter,
    currentFolderId,
    folders,
    folderPath,
    loadingFolders,
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

    // Actions
    navigateToFolder,
    handleMediaScroll,
    handleAddItem,
    handleRemoveItem,
    handleUpdateDuration,
    handleTimelineDragStart,
    handleTimelineDragEnd,
    handleTimelineDragOver,
    handleTimelineDrop,
    handleTimelineDropFromLibrary,
    handleTimelineDragOverContainer,
    handleTimelineDragLeave,
    handleOpenAiModal,
    handleGenerateAiSlides,
    handleApplyAiSlides,
    handleRequestApproval,
    handleOpenPreviewModal,
    handleCreatePreviewLink,
    handleRevokePreviewLink,
    handleCopyLink,
    handleOpenTemplateModal,
    handleSaveAsTemplate,
    getEffectiveDuration,
    getTotalDuration,
    startPlayback,
    stopPlayback,
    skipToNext,
    skipToPrev,
  } = usePlaylistEditor(playlistId, { showToast });

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    top: `${Math.floor(visibleMediaItems.length > 0 ? 0 : 0) * ITEM_HEIGHT}px`,
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
                  NOW
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
                if (dragSourceIndex !== null && lastDragOverIndexRef.current !== items.length) {
                  lastDragOverIndexRef.current = items.length;
                }
              }}
              onDragLeave={() => {
                if (lastDragOverIndexRef.current === items.length) {
                  lastDragOverIndexRef.current = null;
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
