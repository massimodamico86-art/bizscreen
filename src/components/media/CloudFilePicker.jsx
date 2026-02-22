/**
 * CloudFilePicker Modal
 *
 * Shared modal for browsing and importing files from any cloud provider.
 * Supports Google Drive, Dropbox, OneDrive, SharePoint, and Google Photos.
 *
 * Uses dynamic imports so provider services are only loaded when needed.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  File,
  Image,
  Video,
  Music,
  FileText,
  Search,
  X,
  Loader2,
  Check,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../design-system';
import { createMediaAsset } from '../../services/mediaService';

// ─── Provider Configuration ──────────────────────────────────────
// Lazy dynamic imports keep each provider's service out of the main bundle

const PROVIDER_CONFIG = {
  gdrive: {
    name: 'Google Drive',
    listFiles: (args) => import('../../services/cloud/googleDriveService.js').then(m => m.listGoogleDriveFiles(args)),
    getDownloadUrl: (id) => import('../../services/cloud/googleDriveService.js').then(m => m.getGoogleDriveDownloadUrl(id)),
    isConnected: () => import('../../services/cloud/googleDriveService.js').then(m => m.isGoogleDriveConnected()),
    disconnect: () => import('../../services/cloud/googleDriveService.js').then(m => m.disconnectGoogleDrive()),
  },
  dropbox: {
    name: 'Dropbox',
    listFiles: (args) => import('../../services/cloud/dropboxService.js').then(m => m.listDropboxFiles(args)),
    getDownloadUrl: (path) => import('../../services/cloud/dropboxService.js').then(m => m.getDropboxDownloadUrl(path)),
    isConnected: () => import('../../services/cloud/dropboxService.js').then(m => m.isDropboxConnected()),
    disconnect: () => import('../../services/cloud/dropboxService.js').then(m => m.disconnectDropbox()),
  },
  onedrive: {
    name: 'OneDrive',
    listFiles: (args) => import('../../services/cloud/oneDriveService.js').then(m => m.listOneDriveFiles(args)),
    getDownloadUrl: (id) => import('../../services/cloud/oneDriveService.js').then(m => m.getOneDriveDownloadUrl(id)),
    isConnected: () => import('../../services/cloud/oneDriveService.js').then(m => m.isOneDriveConnected()),
    disconnect: () => import('../../services/cloud/oneDriveService.js').then(m => m.disconnectOneDrive()),
  },
  sharepoint: {
    name: 'SharePoint',
    listFiles: (args) => import('../../services/cloud/sharePointService.js').then(m => m.listSharePointFiles(args)),
    listSites: (args) => import('../../services/cloud/sharePointService.js').then(m => m.listSharePointSites(args)),
    getDownloadUrl: (siteId, itemId) => import('../../services/cloud/sharePointService.js').then(m => m.getSharePointDownloadUrl(siteId, itemId)),
    isConnected: () => import('../../services/cloud/sharePointService.js').then(m => m.isSharePointConnected()),
    disconnect: () => import('../../services/cloud/sharePointService.js').then(m => m.disconnectSharePoint()),
  },
  gphotos: {
    name: 'Google Photos',
    listAlbums: (args) => import('../../services/cloud/googlePhotosService.js').then(m => m.listGooglePhotosAlbums(args)),
    listMedia: (args) => import('../../services/cloud/googlePhotosService.js').then(m => m.listGooglePhotosMedia(args)),
    getDownloadUrl: (baseUrl) => import('../../services/cloud/googlePhotosService.js').then(m => m.getGooglePhotosDownloadUrl(baseUrl)),
    isConnected: () => import('../../services/cloud/googlePhotosService.js').then(m => m.isGooglePhotosConnected()),
    disconnect: () => import('../../services/cloud/googlePhotosService.js').then(m => m.disconnectGooglePhotos()),
  },
};

// ─── Utility: Human-readable file size ──────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ─── Utility: Determine media type from mimeType ────────────────

function getMediaType(mimeType) {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// ─── Utility: File type icon ────────────────────────────────────

function FileTypeIcon({ mimeType, isFolder, className = 'w-8 h-8' }) {
  if (isFolder) return <Folder className={`${className} text-blue-500`} />;
  if (!mimeType) return <File className={`${className} text-gray-400`} />;
  if (mimeType.startsWith('image/')) return <Image className={`${className} text-green-500`} />;
  if (mimeType.startsWith('video/')) return <Video className={`${className} text-purple-500`} />;
  if (mimeType.startsWith('audio/')) return <Music className={`${className} text-pink-500`} />;
  return <FileText className={`${className} text-orange-500`} />;
}

// ─── Main Component ─────────────────────────────────────────────

export default function CloudFilePicker({ open, onClose, provider, onImport, showToast }) {
  // File browser state
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  // SharePoint-specific state
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);

  // Google Photos-specific state
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  const config = provider ? PROVIDER_CONFIG[provider] : null;

  // Reset state when provider changes or modal opens/closes
  useEffect(() => {
    if (open && provider && config) {
      setFiles([]);
      setSelectedFiles(new Set());
      setBreadcrumbs([{ id: 'root', name: config.name }]);
      setSearchQuery('');
      setNextPageToken(null);
      setHasMore(false);
      setError(null);
      setSites([]);
      setSelectedSite(null);
      setAlbums([]);
      setSelectedAlbum(null);

      // Initial load
      if (provider === 'sharepoint') {
        loadSites();
      } else if (provider === 'gphotos') {
        loadAlbums();
      } else {
        loadFiles();
      }
    }
  }, [open, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SharePoint: Load sites ───────────────────────────────────

  const loadSites = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.listSites({});
      setSites(result.sites);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = (site) => {
    setSelectedSite(site);
    setBreadcrumbs([{ id: 'root', name: config.name }, { id: site.id, name: site.displayName || site.name }]);
    loadFiles({ siteId: site.id });
  };

  // ── Google Photos: Load albums ───────────────────────────────

  const loadAlbums = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.listAlbums({});
      setAlbums(result.albums);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlbum = (album) => {
    setSelectedAlbum(album);
    setBreadcrumbs([{ id: 'root', name: config.name }, { id: album.id, name: album.title }]);
    loadPhotosMedia({ albumId: album.id });
  };

  const loadPhotosMedia = async ({ albumId = null, pageToken = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.listMedia({ albumId, pageToken });
      const mappedFiles = (result.mediaItems || []).map(item => ({
        id: item.id,
        name: item.filename,
        mimeType: item.mimeType,
        isFolder: false,
        thumbnailUrl: item.baseUrl ? `${item.baseUrl}=w200-h200` : null,
        size: null,
        baseUrl: item.baseUrl,
      }));

      if (pageToken) {
        setFiles(prev => [...prev, ...mappedFiles]);
      } else {
        setFiles(mappedFiles);
      }
      setNextPageToken(result.nextPageToken);
      setHasMore(!!result.nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Generic file loading ─────────────────────────────────────

  const loadFiles = useCallback(async ({ folderId = 'root', pageToken = null, query = '', siteId = null } = {}) => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      let result;

      if (provider === 'dropbox') {
        // Dropbox uses path instead of folderId
        const path = folderId === 'root' ? '' : folderId;
        result = await config.listFiles({ path, cursor: pageToken, query });
        const mappedFiles = (result.files || []).filter(Boolean);
        if (pageToken) {
          setFiles(prev => [...prev, ...mappedFiles]);
        } else {
          setFiles(mappedFiles);
        }
        setNextPageToken(result.cursor);
        setHasMore(result.hasMore || false);
      } else if (provider === 'sharepoint') {
        result = await config.listFiles({ siteId: siteId || selectedSite?.id, folderId, pageToken, query });
        if (pageToken) {
          setFiles(prev => [...prev, ...(result.files || [])]);
        } else {
          setFiles(result.files || []);
        }
        setNextPageToken(result.nextPageToken);
        setHasMore(!!result.nextPageToken);
      } else {
        // Google Drive, OneDrive
        result = await config.listFiles({ folderId, pageToken, query });
        if (pageToken) {
          setFiles(prev => [...prev, ...(result.files || [])]);
        } else {
          setFiles(result.files || []);
        }
        setNextPageToken(result.nextPageToken);
        setHasMore(!!result.nextPageToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config, provider, selectedSite]);  

  // ── Folder navigation ─────────────────────────────────────────

  const handleFolderClick = (folder) => {
    const folderId = provider === 'dropbox' ? (folder.path || folder.id) : folder.id;
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folder.name }]);
    setSelectedFiles(new Set());
    setSearchQuery('');

    if (provider === 'sharepoint') {
      loadFiles({ folderId, siteId: selectedSite?.id });
    } else {
      loadFiles({ folderId });
    }
  };

  const handleBreadcrumbClick = (crumb, index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setSelectedFiles(new Set());
    setSearchQuery('');

    if (index === 0) {
      // Root level
      if (provider === 'sharepoint') {
        setSelectedSite(null);
        loadSites();
        return;
      }
      if (provider === 'gphotos') {
        setSelectedAlbum(null);
        loadAlbums();
        return;
      }
      loadFiles({ folderId: 'root' });
    } else {
      if (provider === 'sharepoint') {
        loadFiles({ folderId: crumb.id, siteId: selectedSite?.id });
      } else if (provider === 'gphotos') {
        loadPhotosMedia({ albumId: selectedAlbum?.id });
      } else {
        loadFiles({ folderId: crumb.id });
      }
    }
  };

  // ── Search ─────────────────────────────────────────────────────

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // Reset to current folder
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      if (provider === 'sharepoint') {
        loadFiles({ folderId: currentFolder.id === 'root' ? 'root' : currentFolder.id, siteId: selectedSite?.id });
      } else {
        loadFiles({ folderId: currentFolder.id === config?.name ? 'root' : currentFolder.id });
      }
      return;
    }

    if (provider === 'sharepoint') {
      loadFiles({ query: searchQuery, siteId: selectedSite?.id });
    } else if (provider === 'gphotos') {
      // Google Photos doesn't support text search in the API, show message
      showToast?.('Search not available for Google Photos. Browse albums instead.', 'info');
    } else {
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      loadFiles({ folderId: currentFolder.id === config?.name ? 'root' : currentFolder.id, query: searchQuery });
    }
  };

  // ── Selection ──────────────────────────────────────────────────

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  // ── Load more ──────────────────────────────────────────────────

  const handleLoadMore = () => {
    if (provider === 'gphotos') {
      loadPhotosMedia({ albumId: selectedAlbum?.id, pageToken: nextPageToken });
    } else if (provider === 'sharepoint') {
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      loadFiles({ folderId: currentFolder.id, pageToken: nextPageToken, siteId: selectedSite?.id });
    } else {
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      loadFiles({ folderId: currentFolder.id === config?.name ? 'root' : currentFolder.id, pageToken: nextPageToken });
    }
  };

  // ── Import selected files ──────────────────────────────────────

  const handleImport = async () => {
    if (selectedFiles.size === 0) return;

    setImporting(true);
    const importedAssets = [];
    const filesToImport = files.filter(f => selectedFiles.has(f.id));

    try {
      for (const file of filesToImport) {
        let downloadUrl;

        if (provider === 'gphotos') {
          // Google Photos: use baseUrl + '=d' for download
          downloadUrl = await config.getDownloadUrl(file.baseUrl);
        } else if (provider === 'dropbox') {
          // Dropbox: get temporary download link
          downloadUrl = await config.getDownloadUrl(file.path || file.id);
        } else if (provider === 'sharepoint') {
          // SharePoint: needs siteId + itemId
          downloadUrl = await config.getDownloadUrl(selectedSite?.id, file.id);
        } else if (provider === 'onedrive') {
          // OneDrive: use item's existing downloadUrl or fetch it
          downloadUrl = file.downloadUrl || await config.getDownloadUrl(file.id);
        } else {
          // Google Drive: returns { url, getHeaders } — use the URL directly
          const downloadInfo = await config.getDownloadUrl(file.id);
          downloadUrl = typeof downloadInfo === 'string' ? downloadInfo : downloadInfo.url;
        }

        const mediaType = getMediaType(file.mimeType);

        // TODO: In production, the server should download and re-host the file
        // so the URL persists beyond the cloud session. For now, store the direct
        // URL which works while the session is active.
        const asset = await createMediaAsset({
          name: file.name,
          type: mediaType,
          url: downloadUrl,
          thumbnailUrl: file.thumbnailUrl || null,
          mimeType: file.mimeType || null,
          fileSize: file.size || null,
        });

        importedAssets.push(asset);
      }

      showToast?.(`Imported ${importedAssets.length} file${importedAssets.length !== 1 ? 's' : ''} successfully!`, 'success');
      onImport?.(importedAssets);
      onClose?.();
    } catch (err) {
      showToast?.(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── Escape key ─────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // ── Guard ──────────────────────────────────────────────────────

  if (!open || !provider || !config) return null;

  // ── Render: SharePoint site picker ─────────────────────────────

  const renderSitePicker = () => (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-3">Select a SharePoint site to browse:</p>
      {sites.length === 0 && !loading && (
        <p className="text-sm text-gray-500 text-center py-8">No SharePoint sites found.</p>
      )}
      <div className="grid grid-cols-1 gap-2">
        {sites.map(site => (
          <button
            key={site.id}
            onClick={() => handleSelectSite(site)}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#f26f21] hover:bg-orange-50 transition-colors text-left"
          >
            <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{site.displayName || site.name}</p>
              {site.webUrl && <p className="text-xs text-gray-500 truncate">{site.webUrl}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render: Google Photos album picker ─────────────────────────

  const renderAlbumPicker = () => (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-3">Select an album to browse, or view all photos:</p>
      <button
        onClick={() => {
          setSelectedAlbum({ id: null, title: 'All Photos' });
          setBreadcrumbs([{ id: 'root', name: config.name }, { id: 'all', name: 'All Photos' }]);
          loadPhotosMedia({});
        }}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#f26f21] hover:bg-orange-50 transition-colors text-left"
      >
        <Image className="w-8 h-8 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">All Photos</p>
          <p className="text-xs text-gray-500">Browse all your Google Photos</p>
        </div>
      </button>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {albums.map(album => (
          <button
            key={album.id}
            onClick={() => handleSelectAlbum(album)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-[#f26f21] hover:bg-orange-50 transition-colors"
          >
            {album.coverPhotoBaseUrl ? (
              <img
                src={`${album.coverPhotoBaseUrl}=w120-h120-c`}
                alt={album.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <Image className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <p className="text-xs font-medium text-gray-700 text-center truncate w-full">{album.title}</p>
            <p className="text-xs text-gray-400">{album.mediaItemsCount} items</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render: File grid ──────────────────────────────────────────

  const renderFileGrid = () => {
    if (files.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No files found</p>
          {searchQuery && (
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map(file => {
            const isSelected = selectedFiles.has(file.id);

            if (file.isFolder) {
              return (
                <button
                  key={file.id}
                  onClick={() => handleFolderClick(file)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <Folder className="w-10 h-10 text-blue-500" />
                  <p className="text-xs font-medium text-gray-700 text-center truncate w-full">{file.name}</p>
                </button>
              );
            }

            return (
              <button
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-[#f26f21] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Selection checkbox */}
                <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-[#f26f21] text-white' : 'bg-gray-200'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>

                {/* Thumbnail or icon */}
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="w-16 h-16 rounded object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <FileTypeIcon mimeType={file.mimeType} isFolder={false} className="w-10 h-10" />
                )}

                <p className="text-xs font-medium text-gray-700 text-center truncate w-full">{file.name}</p>
                {file.size && (
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              disabled={loading}
              className="text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
      </>
    );
  };

  // ── Determine what content to show ─────────────────────────────

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              if (provider === 'sharepoint' && !selectedSite) loadSites();
              else if (provider === 'gphotos' && !selectedAlbum) loadAlbums();
              else loadFiles();
            }}
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    if (loading && files.length === 0 && sites.length === 0 && albums.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#f26f21]" />
          <span className="ml-3 text-sm text-gray-500">Loading files...</span>
        </div>
      );
    }

    // SharePoint: show site picker if no site selected
    if (provider === 'sharepoint' && !selectedSite) {
      return renderSitePicker();
    }

    // Google Photos: show album picker if no album selected
    if (provider === 'gphotos' && !selectedAlbum) {
      return renderAlbumPicker();
    }

    return renderFileGrid();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button when deep in folder structure */}
            {breadcrumbs.length > 1 && (
              <button
                onClick={() => handleBreadcrumbClick(breadcrumbs[breadcrumbs.length - 2], breadcrumbs.length - 2)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm overflow-hidden">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id + i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(crumb, i)}
                    className={`truncate max-w-[120px] ${
                      i === breadcrumbs.length - 1
                        ? 'font-medium text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search bar */}
        {provider !== 'gphotos' && (provider !== 'sharepoint' || selectedSite) && (
          <form onSubmit={handleSearch} className="px-5 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${config.name} files...`}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] outline-none"
              />
            </div>
          </form>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-500">
            {selectedFiles.size > 0
              ? `${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''} selected`
              : 'Select files to import'}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedFiles.size === 0 || importing}
              className="bg-[#f26f21] hover:bg-[#e05e10] text-white"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </span>
              ) : (
                `Import ${selectedFiles.size > 0 ? selectedFiles.size : ''} file${selectedFiles.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
