/**
 * LeftSidebar
 *
 * Yodeck-style left toolbar with:
 * - Media (images/videos from library)
 * - Apps (widgets)
 * - Playlists
 * - Text
 * - Elements (shapes)
 * - Settings
 *
 * Matches Yodeck's visual design with light gray background and orange accents.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Image,
  Type,
  LayoutGrid,
  ListVideo,
  Settings,
  Clock,
  Calendar,
  CloudSun,
  QrCode,
  Database,
  Square,
  Circle,
  Video,
  Music,
  FileText,
  Globe,
  Star,
  Triangle,
  Hexagon,
  Pentagon,
  Diamond,
  ArrowRight,
  ArrowLeft,
  Minus,
} from 'lucide-react';
import { useMedia } from '../../hooks/useMedia';
import { useMediaFolders } from '../../hooks/useMediaFolders';
import { DEFAULT_ELEMENT_SIZE } from './types';
import {
  YODECK_COLORS,
  YODECK_SHAPES,
  YODECK_TEXT_STYLES,
} from '../../config/yodeckTheme';

const SIDEBAR_TABS = [
  { id: 'media', icon: Image, label: 'Media' },
  { id: 'apps', icon: LayoutGrid, label: 'Apps' },
  { id: 'playlists', icon: ListVideo, label: 'Playlists' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'elements', icon: Square, label: 'Elements' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const WIDGET_ITEMS = [
  { id: 'clock', icon: Clock, label: 'Clock', widgetType: 'clock', description: 'Display current time' },
  { id: 'date', icon: Calendar, label: 'Date', widgetType: 'date', description: 'Display current date' },
  { id: 'weather', icon: CloudSun, label: 'Weather', widgetType: 'weather', description: 'Weather forecast' },
  { id: 'qr', icon: QrCode, label: 'QR Code', widgetType: 'qr', description: 'Custom QR code' },
  { id: 'data', icon: Database, label: 'Data Widget', widgetType: 'data', description: 'Dynamic data display' },
];

// Shape icons mapping
const SHAPE_ICONS = {
  rectangle: Square,
  'rounded-rectangle': Square,
  circle: Circle,
  oval: Circle,
  triangle: Triangle,
  star: Star,
  pentagon: Pentagon,
  hexagon: Hexagon,
  diamond: Diamond,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  line: Minus,
};

export default function LeftSidebar({
  onAddElement,
  onOpenMediaLibrary,
  mediaItems = [],
  playlists = [],
  smartGuidesEnabled,
  onSmartGuidesChange,
  showGrid,
  onShowGridChange,
  snapToGrid,
  onSnapToGridChange,
}) {
  const [activeTab, setActiveTab] = useState('media');
  const [expandedSection, setExpandedSection] = useState(null);

  const handleAddWidget = (widgetType) => {
    const id = `widget-${Date.now()}`;
    onAddElement({
      id,
      type: 'widget',
      widgetType,
      position: {
        x: 0.5 - DEFAULT_ELEMENT_SIZE.widget.width / 2,
        y: 0.5 - DEFAULT_ELEMENT_SIZE.widget.height / 2,
        ...DEFAULT_ELEMENT_SIZE.widget,
      },
      props: getDefaultWidgetProps(widgetType),
      layer: 1,
    });
  };

  const handleAddText = (preset) => {
    const id = `text-${Date.now()}`;
    onAddElement({
      id,
      type: 'text',
      position: {
        x: 0.5 - DEFAULT_ELEMENT_SIZE.text.width / 2,
        y: 0.5 - DEFAULT_ELEMENT_SIZE.text.height / 2,
        ...DEFAULT_ELEMENT_SIZE.text,
      },
      props: {
        text: preset.label,
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        fontFamily: preset.fontFamily || 'Inter',
        align: 'center',
        color: '#ffffff',
      },
      layer: 1,
    });
  };

  const handleAddTextBox = () => {
    const id = `text-${Date.now()}`;
    onAddElement({
      id,
      type: 'text',
      position: {
        x: 0.5 - DEFAULT_ELEMENT_SIZE.text.width / 2,
        y: 0.5 - DEFAULT_ELEMENT_SIZE.text.height / 2,
        ...DEFAULT_ELEMENT_SIZE.text,
      },
      props: {
        text: 'Your text here',
        fontSize: 24,
        fontWeight: 'normal',
        fontFamily: 'Inter',
        align: 'left',
        color: '#ffffff',
      },
      layer: 1,
    });
  };

  const handleAddImage = (url, metadata = {}) => {
    const id = `image-${Date.now()}`;
    const isVideo = metadata.type === 'video';

    // Calculate aspect-aware dimensions if metadata available
    let width = DEFAULT_ELEMENT_SIZE.image.width;
    let height = DEFAULT_ELEMENT_SIZE.image.height;

    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      // Keep width at default, adjust height for aspect ratio
      height = width / aspectRatio;
      // Clamp height to reasonable bounds (0.1 to 0.8 of canvas)
      if (height > 0.8) {
        height = 0.8;
        width = height * aspectRatio;
      }
      if (height < 0.1) {
        height = 0.1;
        width = height * aspectRatio;
      }
    }

    onAddElement({
      id,
      type: isVideo ? 'video' : 'image',
      position: {
        x: 0.5 - width / 2,
        y: 0.5 - height / 2,
        width,
        height,
      },
      props: {
        url,
        fit: 'cover',
        borderRadius: 0,
        opacity: 1,
        mediaId: metadata.mediaId || null,
        name: metadata.name || null,
        ...(isVideo && { autoplay: true, loop: true, muted: true }),
      },
      layer: 1,
    });
  };

  const handleAddShape = (shapeType) => {
    const id = `shape-${Date.now()}`;
    onAddElement({
      id,
      type: 'shape',
      shapeType,
      position: {
        x: 0.5 - 0.15,
        y: 0.5 - 0.15,
        width: 0.3,
        height: 0.3,
      },
      props: {
        fill: YODECK_COLORS.primary,
        opacity: 0.8,
        borderRadius: shapeType === 'circle' || shapeType === 'oval' ? 999 : 0,
      },
      layer: 1,
    });
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Tab icons - Yodeck style with bottom indicator */}
      <div className="flex border-b border-gray-200 bg-white">
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-1 flex flex-col items-center gap-0.5 transition-all duration-200 relative group ${
                isActive
                  ? 'text-[#f26f21] bg-[#fff5f0]'
                  : 'text-gray-500 hover:text-[#f26f21] hover:bg-gray-50'
              }`}
              title={tab.label}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="text-[10px] font-medium truncate max-w-full">{tab.label}</span>
              {/* Orange bottom border indicator for active tab */}
              <div
                className={`absolute left-1 right-1 bottom-0 h-0.5 rounded-t transition-all duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                }`}
                style={{ backgroundColor: YODECK_COLORS.primary }}
              />
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'media' && (
          <MediaTabContent onAddImage={handleAddImage} onOpenLibrary={onOpenMediaLibrary} />
        )}

        {activeTab === 'apps' && (
          <AppsTabContent widgets={WIDGET_ITEMS} onAddWidget={handleAddWidget} />
        )}

        {activeTab === 'playlists' && (
          <PlaylistsTabContent playlists={playlists} />
        )}

        {activeTab === 'text' && (
          <TextTabContent onAddText={handleAddText} onAddTextBox={handleAddTextBox} />
        )}

        {activeTab === 'elements' && (
          <ElementsTabContent onAddShape={handleAddShape} />
        )}

        {activeTab === 'settings' && (
          <SettingsTabContent
            smartGuidesEnabled={smartGuidesEnabled}
            onSmartGuidesChange={onSmartGuidesChange}
            showGrid={showGrid}
            onShowGridChange={onShowGridChange}
            snapToGrid={snapToGrid}
            onSnapToGridChange={onSnapToGridChange}
          />
        )}
      </div>
    </div>
  );
}

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
};

const MEDIA_TYPE_FILTERS = [
  { id: null, label: 'All', icon: LayoutGrid },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
];

const ORIENTATION_FILTERS = [
  { id: null, label: 'All' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'square', label: 'Square' },
];

function MediaTabContent({ onAddImage, onOpenLibrary }) {
  const [searchInput, setSearchInput] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // Folder hook
  const {
    folders,
    isLoading: foldersLoading,
    folderPath,
    refresh: refreshFolders,
  } = useMediaFolders({ parentId: currentFolderId });

  const {
    assets,
    isLoading,
    error,
    hasMore,
    filters,
    setFilters,
    fetchMore,
    refresh,
  } = useMedia({
    type: null,
    orientation: null,
    search: '',
    folderId: currentFolderId,
    includeGlobal: currentFolderId === null, // Only include global at root
    pageSize: 12,
  });

  // Debounced search
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchInput(value);
    // Debounce the actual filter update
    const timeoutId = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [setFilters]);

  const handleTypeFilter = useCallback((typeId) => {
    setActiveTypeFilter(typeId);
    setFilters((prev) => ({ ...prev, type: typeId }));
  }, [setFilters]);

  // Folder navigation
  const handleEnterFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    setFilters((prev) => ({ ...prev, folderId }));
  }, [setFilters]);

  const handleGoBack = useCallback(() => {
    if (folderPath && folderPath.length > 1) {
      // Go to parent folder
      const parentFolder = folderPath[folderPath.length - 2];
      handleEnterFolder(parentFolder?.id || null);
    } else {
      // Go to root
      handleEnterFolder(null);
    }
  }, [folderPath, handleEnterFolder]);

  const handleGoToRoot = useCallback(() => {
    handleEnterFolder(null);
  }, [handleEnterFolder]);

  // Insert image into canvas
  const handleInsertMedia = useCallback((asset) => {
    if (asset.type === 'image' || asset.type === 'video') {
      onAddImage(asset.url, {
        mediaId: asset.id,
        name: asset.name,
        width: asset.width,
        height: asset.height,
        type: asset.type,
      });
    }
  }, [onAddImage]);

  // Combined refresh
  const handleRefresh = useCallback(() => {
    refresh();
    refreshFolders();
  }, [refresh, refreshFolders]);

  // Get current folder name for display
  const currentFolderName = folderPath && folderPath.length > 0
    ? folderPath[folderPath.length - 1]?.name
    : null;

  return (
    <div className="space-y-4">
      {/* Upload button - Yodeck style */}
      <button
        onClick={onOpenLibrary}
        className="w-full py-3 px-4 bg-[#f26f21] hover:bg-[#e05a10] text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-sm"
      >
        <Upload className="w-4 h-4" />
        Upload Media
      </button>

      {/* Folder navigation breadcrumb */}
      {currentFolderId && (
        <div className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-lg p-2">
          <button
            onClick={handleGoToRoot}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            title="Go to root"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGoBack}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            title="Go back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="flex-1 truncate text-gray-700 font-medium px-1">
            {currentFolderName || 'Folder'}
          </span>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
        />
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              setFilters((prev) => ({ ...prev, search: '' }));
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal filter pills - Yodeck style */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEDIA_TYPE_FILTERS.map((type) => (
          <button
            key={type.id || 'all'}
            onClick={() => handleTypeFilter(type.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTypeFilter === type.id
                ? 'bg-[#f26f21] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {currentFolderId ? 'Folder Contents' : 'All Items'}
        </h4>
        <button
          onClick={handleRefresh}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Loading state */}
      {(isLoading || foldersLoading) && assets.length === 0 && folders.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#f26f21] animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-2">Failed to load media</p>
          <button
            onClick={handleRefresh}
            className="text-xs text-[#f26f21] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Folders grid - only show when not searching */}
      {!isLoading && !foldersLoading && !error && folders.length > 0 && !searchInput && (
        <div className="space-y-2">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Folders ({folders.length})
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {folders.map((folder) => {
              const folderId = folder.folder_id || folder.id;
              const folderName = folder.folder_name || folder.name;
              return (
                <button
                  key={folderId}
                  onClick={() => handleEnterFolder(folderId)}
                  className="group relative aspect-square bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg overflow-hidden border border-gray-200 hover:border-[#f26f21] hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 p-2"
                  title={folderName}
                >
                  <Folder className="w-10 h-10 text-amber-500 group-hover:hidden" />
                  <FolderOpen className="w-10 h-10 text-amber-600 hidden group-hover:block" />
                  <span className="text-[10px] font-medium text-gray-700 truncate max-w-full px-1">
                    {folderName}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {folder.media_count || 0} items
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Media grid */}
      {!isLoading && !error && assets.length > 0 && (
        <div className="space-y-3">
          {folders.length > 0 && !searchInput && (
            <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Media ({assets.length})
            </h5>
          )}
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => {
              const isGlobal = !asset.owner_id;
              const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

              return (
                <button
                  key={asset.id}
                  onClick={() => handleInsertMedia(asset)}
                  className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-[#f26f21] hover:shadow-md transition-all"
                  title={`${asset.name}${isGlobal ? ' (Global)' : ''}\nClick to insert`}
                >
                  {/* Thumbnail */}
                  {asset.type === 'image' || asset.type === 'video' ? (
                    <img
                      src={asset.thumbnail_url || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <TypeIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Global badge */}
                  {isGlobal && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-[9px] font-medium text-white rounded uppercase">
                      Global
                    </span>
                  )}

                  {/* Video indicator */}
                  {asset.type === 'video' && (
                    <span className="absolute top-1 right-1 p-1 bg-black/60 rounded">
                      <Video className="w-3 h-3 text-white" />
                    </span>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={fetchMore}
              disabled={isLoading}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Load More'
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !foldersLoading && !error && assets.length === 0 && folders.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            {currentFolderId ? (
              <Folder className="w-6 h-6 text-gray-400" />
            ) : (
              <Image className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">
            {currentFolderId ? 'This folder is empty' : 'No media items yet'}
          </p>
          <p className="text-xs text-gray-400">
            {currentFolderId ? 'Add media to this folder' : 'Upload media to get started'}
          </p>
        </div>
      )}
    </div>
  );
}

function AppsTabContent({ widgets, onAddWidget }) {
  const [searchInput, setSearchInput] = useState('');

  const filteredWidgets = useMemo(() => {
    if (!searchInput) return widgets;
    return widgets.filter((w) =>
      w.label.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [widgets, searchInput]);

  return (
    <div className="space-y-4">
      {/* Discover Apps button */}
      <button className="w-full py-3 px-4 bg-[#f26f21] hover:bg-[#e05a10] text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-sm">
        <Sparkles className="w-4 h-4" />
        Discover Apps
      </button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search apps..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
        />
      </div>

      {/* Section header */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Items</h4>

      {/* Widget grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredWidgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <button
              key={widget.id}
              onClick={() => onAddWidget(widget.widgetType)}
              className="bg-white border border-gray-200 hover:border-[#f26f21] hover:shadow-md rounded-lg p-4 flex flex-col items-center gap-2 transition-all text-center"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-[#f26f21]" />
              </div>
              <span className="text-xs font-medium text-gray-700">{widget.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlaylistsTabContent({ playlists }) {
  const [searchInput, setSearchInput] = useState('');

  return (
    <div className="space-y-4">
      {/* Search with filter icon */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search playlists..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Section header */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Items</h4>

      {/* Playlist items */}
      {playlists.length > 0 ? (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              className="w-full bg-white border border-gray-200 hover:border-[#f26f21] hover:shadow-sm rounded-lg p-3 flex items-center gap-3 transition-all text-left"
            >
              <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <ListVideo className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 block truncate">{playlist.name}</span>
                <span className="text-xs text-gray-400">{playlist.items?.length || 0} items</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ListVideo className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">No playlists available</p>
          <p className="text-xs text-gray-400">Create a playlist to add it here</p>
        </div>
      )}
    </div>
  );
}

function TextTabContent({ onAddText, onAddTextBox }) {
  return (
    <div className="space-y-5">
      {/* Add Text Box button - Yodeck primary style */}
      <button
        onClick={onAddTextBox}
        className="w-full py-3 px-4 bg-[#f26f21] hover:bg-[#e05a10] text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Add a Text Box
      </button>

      {/* Default Text Styles section */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Default Text Styles</h4>
        <div className="space-y-2">
          {YODECK_TEXT_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onAddText(style)}
              className="w-full bg-white border border-gray-200 hover:border-[#f26f21] hover:shadow-sm rounded-lg p-4 flex items-center gap-4 transition-all text-left"
            >
              {/* Preview "Aa" with actual style */}
              <div
                className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{
                  fontFamily: style.fontFamily,
                  fontWeight: style.fontWeight,
                  fontSize: style.id === 'heading' ? '24px' : style.id === 'subheading' ? '18px' : '14px',
                }}
              >
                {style.preview}
              </div>
              <div className="flex-1">
                <span
                  className="text-gray-700 block"
                  style={{
                    fontWeight: style.fontWeight,
                    fontSize: style.id === 'heading' ? '16px' : style.id === 'subheading' ? '14px' : '13px',
                  }}
                >
                  {style.label}
                </span>
                <span className="text-xs text-gray-400">{style.fontSize}px {style.fontFamily}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ElementsTabContent({ onAddShape }) {
  const [searchInput, setSearchInput] = useState('');

  const filteredShapes = useMemo(() => {
    if (!searchInput) return YODECK_SHAPES;
    return YODECK_SHAPES.filter((s) =>
      s.label.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [searchInput]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search elements..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]"
        />
      </div>

      {/* Recently Used (placeholder) */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recently Used</h4>
        <p className="text-xs text-gray-400 italic">No recent elements</p>
      </div>

      {/* Shapes section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shapes</h4>
          <button className="text-xs text-[#f26f21] hover:underline">See all</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filteredShapes.map((shape) => {
            const Icon = SHAPE_ICONS[shape.id] || Square;
            return (
              <button
                key={shape.id}
                onClick={() => onAddShape(shape.id)}
                className="aspect-square bg-white border border-gray-200 hover:border-[#f26f21] hover:shadow-sm rounded-lg flex items-center justify-center transition-all"
                title={shape.label}
              >
                <Icon className="w-6 h-6 text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Graphics section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Graphics</h4>
          <button className="text-xs text-[#f26f21] hover:underline">See all</button>
        </div>
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Graphics library coming soon</p>
        </div>
      </div>
    </div>
  );
}

function SettingsTabContent({
  smartGuidesEnabled,
  onSmartGuidesChange,
  showGrid,
  onShowGridChange,
  snapToGrid,
  onSnapToGridChange,
}) {
  return (
    <div className="space-y-6">
      {/* Background Audio - Yodeck feature */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Background Audio</h4>
        <select className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f26f21]/20 focus:border-[#f26f21]">
          <option value="">No audio</option>
          <option value="music1">Background Music 1</option>
          <option value="music2">Background Music 2</option>
        </select>
      </div>

      {/* Snap to Grid toggle - Yodeck style with orange */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700">Snap to Grid</span>
          <button
            onClick={() => onSnapToGridChange?.(!snapToGrid)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              snapToGrid ? 'bg-[#f26f21]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                snapToGrid ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Lock Insert for Non-Admins - Premium feature */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 opacity-60">
        <label className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Lock Insert for Non-Admins</span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded flex items-center gap-0.5">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          </div>
          <Lock className="w-4 h-4 text-gray-400" />
        </label>
      </div>

      {/* Smart Guides toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700">Smart Guides</span>
          <button
            onClick={() => onSmartGuidesChange?.(!smartGuidesEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              smartGuidesEnabled ? 'bg-[#f26f21]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                smartGuidesEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Show Grid toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700">Show Grid</span>
          <button
            onClick={() => onShowGridChange?.(!showGrid)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              showGrid ? 'bg-[#f26f21]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                showGrid ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Availability scheduling - Yodeck feature */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Availability</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Always available</span>
          </div>
          <button className="text-xs text-[#f26f21] hover:underline">Schedule availability</button>
        </div>
      </div>
    </div>
  );
}

function getDefaultWidgetProps(widgetType) {
  switch (widgetType) {
    case 'clock':
      return { textColor: '#ffffff', format: '12h', showSeconds: false };
    case 'date':
      return { textColor: '#ffffff', format: 'short' };
    case 'weather':
      return { textColor: '#ffffff', location: 'Miami, FL', units: 'imperial', style: 'minimal' };
    case 'qr':
      return { url: '', label: '', fgColor: '#000000', bgColor: '#ffffff', cornerRadius: 8 };
    case 'data':
      return { textColor: '#ffffff', fontSize: 24, field: 'value' };
    default:
      return {};
  }
}
