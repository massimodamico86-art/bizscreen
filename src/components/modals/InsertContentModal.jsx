/**
 * InsertContentModal.jsx
 * Yodeck-style unified content picker modal with tabs for Media/Apps/Layouts/Playlists.
 * Features folder navigation, search, and preview pane.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Folder,
  ChevronRight,
  Home,
  Image,
  Video,
  FileText,
  Music,
  Globe,
  Grid3X3,
  Layout,
  ListVideo,
  Play,
  Clock,
  Loader2,
  Check,
} from 'lucide-react';
import { Modal, ModalContent, Button } from '../../design-system';
import { fetchMediaAssets, fetchApps } from '../../services/mediaService';
import { fetchPlaylists } from '../../services/playlistService';
import { fetchLayouts } from '../../services/layoutService';
import { useMediaFolders } from '../../hooks/useMediaFolders';

/**
 * Tab configuration
 */
const TABS = [
  { id: 'media', label: 'All Media', icon: Image },
  { id: 'apps', label: 'Apps', icon: Grid3X3 },
  { id: 'layouts', label: 'Layouts', icon: Layout },
  { id: 'playlists', label: 'Playlists', icon: ListVideo },
];

/**
 * Get icon for media type
 */
function getMediaTypeIcon(type) {
  switch (type) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'document':
      return FileText;
    case 'web_page':
      return Globe;
    default:
      return Image;
  }
}

/**
 * Content item card component
 */
function ContentItem({ item, type, isSelected, onSelect }) {
  const isVideo = type === 'media' && item.media_type === 'video';
  const IconComponent = type === 'media' ? getMediaTypeIcon(item.media_type) :
                        type === 'apps' ? Grid3X3 :
                        type === 'layouts' ? Layout : ListVideo;

  return (
    <button
      onClick={() => onSelect(item)}
      className={`
        relative flex flex-col rounded-lg border overflow-hidden transition-all text-left
        ${isSelected
          ? 'border-[#f26f21] ring-2 ring-[#f26f21] ring-opacity-50'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative">
        {item.thumbnail_url || item.url ? (
          <img
            src={item.thumbnail_url || item.url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center ${item.thumbnail_url || item.url ? 'hidden' : ''}`}
        >
          <IconComponent className="w-8 h-8 text-gray-300" />
        </div>

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Play className="w-3 h-3 text-white" fill="white" />
            {item.duration && (
              <span className="text-xs text-white">{formatDuration(item.duration)}</span>
            )}
          </div>
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 bg-[#f26f21] rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="p-2">
        <span className="text-xs text-gray-700 truncate block font-medium">{item.name}</span>
        {type === 'playlists' && item.items_count !== undefined && (
          <span className="text-xs text-gray-400">{item.items_count} items</span>
        )}
        {type === 'layouts' && item.zones_count !== undefined && (
          <span className="text-xs text-gray-400">{item.zones_count} zones</span>
        )}
      </div>
    </button>
  );
}

/**
 * Folder item component
 */
function FolderItem({ folder, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(folder)}
      className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-[#f26f21] hover:bg-orange-50 transition-colors"
    >
      <Folder className="w-10 h-10 text-amber-500 mb-2" />
      <span className="text-sm text-gray-700 text-center truncate w-full">
        {folder.folder_name || folder.name}
      </span>
      {folder.media_count !== undefined && (
        <span className="text-xs text-gray-400">{folder.media_count} items</span>
      )}
    </button>
  );
}

/**
 * Preview pane component
 */
function PreviewPane({ item, type }) {
  if (!item) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-gray-400">
        <Image className="w-12 h-12 mb-2" />
        <p className="text-sm">Select content to preview</p>
      </div>
    );
  }

  const IconComponent = type === 'media' ? getMediaTypeIcon(item.media_type) :
                        type === 'apps' ? Grid3X3 :
                        type === 'layouts' ? Layout : ListVideo;

  return (
    <div className="flex-1 p-4 flex flex-col">
      {/* Preview image */}
      <div className="aspect-video bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4 flex items-center justify-center">
        {item.thumbnail_url || item.url ? (
          <img
            src={item.thumbnail_url || item.url}
            alt={item.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <IconComponent className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Item details */}
      <h4 className="font-medium text-gray-900 mb-1 truncate">{item.name}</h4>
      <p className="text-sm text-gray-500 capitalize">{item.media_type || type}</p>

      {/* Additional info */}
      {item.duration && (
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(item.duration)}</span>
        </div>
      )}

      {item.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-3">{item.description}</p>
      )}
    </div>
  );
}

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * InsertContentModal - Unified content picker
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {() => void} props.onClose - Close callback
 * @param {(item: Object, type: string) => void} props.onSelect - Selection callback
 * @param {string} [props.initialTab='media'] - Initial active tab
 * @param {string} [props.title='Insert Content'] - Modal title
 * @param {string[]} [props.allowedTabs] - Restrict to specific tabs (e.g., ['playlists', 'layouts'])
 */
export function InsertContentModal({
  open,
  onClose,
  onSelect,
  initialTab = 'media',
  title = 'Insert Content',
  allowedTabs,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Content states
  const [mediaItems, setMediaItems] = useState([]);
  const [apps, setApps] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  // Folder navigation
  const { folders, folderPath, isLoading: foldersLoading } = useMediaFolders({
    parentId: currentFolderId,
  });

  // Get available tabs
  const availableTabs = allowedTabs
    ? TABS.filter((tab) => allowedTabs.includes(tab.id))
    : TABS;

  // Ensure active tab is valid
  useEffect(() => {
    if (allowedTabs && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || 'media');
    }
  }, [allowedTabs, activeTab]);

  // Load content when tab changes
  useEffect(() => {
    if (!open) return;

    const loadContent = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'media':
            // fetchMediaAssets doesn't support folderId directly - fetch all and let folders hook handle navigation
            const mediaData = await fetchMediaAssets({});
            setMediaItems(mediaData || []);
            break;
          case 'apps':
            const appsData = await fetchApps({});
            setApps(appsData || []);
            break;
          case 'layouts':
            const layoutsData = await fetchLayouts();
            setLayouts(layoutsData || []);
            break;
          case 'playlists':
            const playlistsData = await fetchPlaylists();
            setPlaylists(playlistsData || []);
            break;
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [open, activeTab, currentFolderId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedItem(null);
      setSearchQuery('');
      setCurrentFolderId(null);
    }
  }, [open]);

  // Get current items based on active tab
  const getCurrentItems = useCallback(() => {
    let items = [];
    switch (activeTab) {
      case 'media':
        items = mediaItems;
        break;
      case 'apps':
        items = apps;
        break;
      case 'layouts':
        items = layouts;
        break;
      case 'playlists':
        items = playlists;
        break;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [activeTab, mediaItems, apps, layouts, playlists, searchQuery]);

  // Handle folder navigation
  const handleFolderNavigate = (folder) => {
    setCurrentFolderId(folder.folder_id || folder.id);
    setSelectedItem(null);
  };

  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedItem(null);
  };

  // Handle selection
  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem, activeTab);
      onClose();
    }
  };

  if (!open) return null;

  const items = getCurrentItems();
  const showFolders = activeTab === 'media' && !searchQuery;

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="flex flex-col h-[80vh] max-h-[700px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedItem(null);
                  setSearchQuery('');
                  if (tab.id !== 'media') {
                    setCurrentFolderId(null);
                  }
                }}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${activeTab === tab.id
                    ? 'text-[#f26f21] border-[#f26f21]'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel - Content browser */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
            {/* Search & Breadcrumbs */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] outline-none"
                />
              </div>

              {/* Breadcrumbs (only for media) */}
              {activeTab === 'media' && (
                <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => handleBreadcrumbClick(null)}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    <Home className="w-4 h-4" />
                  </button>
                  {folderPath.map((crumb) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                      <button
                        onClick={() => handleBreadcrumbClick(crumb.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-auto p-4">
              {loading || foldersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Folders (media tab only) */}
                  {showFolders &&
                    folders.map((folder) => (
                      <FolderItem
                        key={folder.folder_id || folder.id}
                        folder={folder}
                        onNavigate={handleFolderNavigate}
                      />
                    ))}

                  {/* Content items */}
                  {items.map((item) => (
                    <ContentItem
                      key={item.id}
                      item={item}
                      type={activeTab}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={setSelectedItem}
                    />
                  ))}

                  {/* Empty state */}
                  {items.length === 0 && (!showFolders || folders.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                      <Image className="w-12 h-12 mb-2" />
                      <p className="text-sm">
                        {searchQuery ? 'No results found' : `No ${activeTab} available`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Preview */}
          <div className="w-72 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Preview</h3>
            </div>
            <PreviewPane item={selectedItem} type={activeTab} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedItem}
          >
            Insert Content
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default InsertContentModal;
