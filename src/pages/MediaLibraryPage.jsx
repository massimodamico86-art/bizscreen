/**
 * @file MediaLibraryPage.jsx
 * @description Media Library page for managing images, videos, audio, documents, and web pages.
 *
 * Features:
 * - Grid and list view modes for media assets
 * - Cloudinary-powered file uploads (images, videos, audio, PDFs)
 * - Web page URL addition for embedding external content
 * - Search filtering across all media
 * - Delete with usage check (warns if media is in use)
 * - Plan-based media limits with upgrade prompts
 *
 * State Management:
 * - `mediaAssets` - Array of media asset objects from Supabase
 * - `loading` - Boolean for data fetch loading state
 * - `error` - Error message string (null when no error)
 * - `search` - Current search filter text
 * - `viewMode` - 'grid' or 'list' display mode
 * - `limits` - Plan-based limits object
 *
 * Data Flow:
 * - Fetches from `media_assets` table in Supabase
 * - Uploads go to Cloudinary, then metadata saved to Supabase
 * - Uses mediaService for CRUD operations and usage checks
 *
 * @see {@link ../services/mediaService.js} - Media CRUD operations
 * @see {@link ../hooks/useCloudinaryUpload.js} - Upload widget hook
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Upload,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  FolderPlus,
  Folder,
  FolderOpen,
  Link,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Zap,
  X,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  ListPlus,
  Monitor,
  Move,
  GripVertical,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useS3Upload } from '../hooks/useS3Upload';
import { useMediaFolders } from '../hooks/useMediaFolders';
import {
  createMediaAsset,
  createWebPageAsset,
  MEDIA_TYPES,
  deleteMediaAssetSafely,
  getMediaUsage,
  moveMediaToFolder,
  reorderMedia,
  moveMediaToFolderOrdered,
} from '../services/mediaService';
import {
  getEffectiveLimits,
  hasReachedLimit,
  formatLimitDisplay,
} from '../services/limitsService';
import { fetchPlaylists, addPlaylistItem, createPlaylist } from '../services/playlistService';
import { fetchScreens, assignPlaylistToScreen } from '../services/screenService';
import { MediaDetailModal } from '../components/media';
import YodeckAddMediaModal from '../components/media/YodeckAddMediaModal';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button, IconButton } from '../design-system';
import { Card, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { FormField, Input } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../design-system';
import { Banner, Alert } from '../design-system';
import { EmptyState } from '../design-system';
import YodeckEmptyState from '../components/YodeckEmptyState';

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
  app: Grid3X3,
};

const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
  app: 'App',
};

// Filter options for sidebar
const TYPE_FILTER_OPTIONS = [
  { id: null, label: 'All Types', icon: Grid3X3 },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'web_page', label: 'Web Pages', icon: Globe },
];

const ORIENTATION_FILTER_OPTIONS = [
  { id: null, label: 'All Orientations' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'square', label: 'Square' },
];

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => {
  // Guard against null limits
  if (!limits) return null;

  return (
    <Banner
      variant="warning"
      icon={<AlertTriangle size={20} />}
      title="Media limit reached"
      action={
        <Button variant="secondary" size="sm" onClick={onUpgrade}>
          <Zap size={16} />
          Upgrade
        </Button>
      }
    >
      You've reached the maximum of {limits.maxMediaAssets ?? 'your'} media assets for your {limits.planName ?? 'current'} plan.
      Upgrade to add more media.
    </Banner>
  );
};

// Media list row
const MediaListRow = ({ asset, actionMenuId, onActionMenuToggle, onEdit, onDuplicate, onDelete, onMove, formatDate, onClick, onDoubleClick, isSelected }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-orange-50 hover:bg-orange-100' : ''
      }`}
      onClick={() => onClick?.(asset)}
      onDoubleClick={() => onDoubleClick?.(asset)}
    >
      <td className="p-4">
        <input type="checkbox" className="rounded border-gray-300" />
      </td>
      <td className="p-4">
        <Inline gap="sm" align="center">
          {asset.thumbnail_url ? (
            <img src={asset.thumbnail_url} alt={asset.name} className="w-12 h-12 object-cover rounded" />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
              <TypeIcon size={20} className="text-gray-400" />
            </div>
          )}
          <span className="font-medium text-gray-900">{asset.name}</span>
        </Inline>
      </td>
      <td className="p-4">
        <Inline gap="xs" align="center">
          <TypeIcon size={16} className="text-gray-400" />
          <span className="text-gray-600">{MEDIA_TYPE_LABELS[asset.type]}</span>
        </Inline>
      </td>
      <td className="p-4 text-gray-600 text-sm">{formatDate(asset.updated_at)}</td>
      <td className="p-4">
        {asset.tags && asset.tags.length > 0 ? (
          <Inline gap="xs" wrap>
            {asset.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="neutral" size="sm">{tag}</Badge>
            ))}
          </Inline>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>
      <td className="p-4">
        <div className="relative">
          <button
            onClick={() => onActionMenuToggle(asset.id)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-gray-400" />
          </button>
          {actionMenuId === asset.id && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => { onActionMenuToggle(null); onEdit?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={() => { onActionMenuToggle(null); onDuplicate?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy size={14} />
                Duplicate
              </button>
              <button
                onClick={() => { onActionMenuToggle(null); onMove?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Folder size={14} />
                Move to Folder
              </button>
              <button
                onClick={() => onDelete(asset)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

// Media grid card with drag support
const MediaGridCard = ({
  asset,
  formatDate,
  onClick,
  onDoubleClick,
  isSelected,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
  index,
}) => {
  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;
  const isGlobal = !asset.owner_id;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'media',
      id: asset.id,
      index,
      name: asset.name
    }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(asset, index);
  };

  const handleDragEnd = (e) => {
    onDragEnd?.();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (data.type === 'media' && data.id !== asset.id) {
      onDrop?.(data.id, data.index, index);
    }
  };

  return (
    <Card
      variant="outlined"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group cursor-pointer hover:shadow-md transition-all overflow-hidden ${
        isSelected ? 'ring-2 ring-[#f26f21] ring-offset-2' : ''
      } ${isDragging ? 'opacity-50 scale-95' : ''} ${
        isDragOver ? 'ring-2 ring-[#f26f21] ring-dashed' : ''
      }`}
      onClick={() => onClick?.(asset)}
      onDoubleClick={() => onDoubleClick?.(asset)}
    >
      {/* Square thumbnail */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {asset.thumbnail_url || asset.url ? (
          <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={32} className="text-gray-400" />
          </div>
        )}

        {/* Drag handle - visible on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="p-1.5 bg-black/60 rounded cursor-grab active:cursor-grabbing">
            <GripVertical size={14} className="text-white" />
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
          <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Global badge */}
        {isGlobal && (
          <div className="absolute top-2 left-2">
            <Badge variant="info" size="sm" className="bg-blue-600 text-white border-0 uppercase text-[10px] font-semibold">
              Global
            </Badge>
          </div>
        )}

        {/* Video indicator - move to bottom right when drag handle is shown */}
        {asset.type === 'video' && (
          <div className="absolute bottom-2 right-2">
            <div className="p-1 bg-black/60 rounded">
              <Video size={14} className="text-white" />
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="neutral" className="bg-black/70 text-white border-0">
            {MEDIA_TYPE_LABELS[asset.type]}
          </Badge>
        </div>
      </div>
      <CardContent className="p-2.5">
        <h3 className="text-sm font-medium text-gray-900 truncate">{asset.name}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(asset.updated_at)}</p>
      </CardContent>
    </Card>
  );
};

// Folder grid card with drop target support
const FolderGridCard = ({ folder, onClick, onDragOver, onDragLeave, onDrop, isDragOver }) => {
  // Handle both RPC response (folder_id, folder_name) and direct query (id, name)
  const folderId = folder.folder_id || folder.id;
  const folderName = folder.folder_name || folder.name;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(folderId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    onDragLeave?.();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'media') {
        onDrop?.(data.id, folderId, data.name);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <Card
      variant="outlined"
      className={`group cursor-pointer hover:shadow-md transition-all overflow-hidden ${
        isDragOver ? 'ring-2 ring-[#f26f21] bg-amber-50 scale-105' : ''
      }`}
      onClick={() => onClick?.(folderId)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Square folder icon area */}
      <div className={`aspect-square bg-gradient-to-br from-amber-50 to-amber-100 relative overflow-hidden flex items-center justify-center ${
        isDragOver ? 'from-amber-100 to-amber-200' : ''
      }`}>
        {isDragOver ? (
          <>
            <FolderOpen size={64} className="text-[#f26f21]" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="text-xs font-medium text-[#f26f21] bg-white/80 px-2 py-1 rounded">
                Drop here
              </span>
            </div>
          </>
        ) : (
          <>
            <Folder size={64} className="text-amber-500 group-hover:hidden transition-opacity" />
            <FolderOpen size={64} className="text-amber-600 hidden group-hover:block transition-opacity" />
          </>
        )}
      </div>
      <CardContent className="p-2.5">
        <h3 className="text-sm font-medium text-gray-900 truncate">{folderName}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {folder.media_count || 0} item{(folder.media_count || 0) !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
};

// Breadcrumbs navigation
const FolderBreadcrumbs = ({ folderPath, onNavigate }) => {
  if (!folderPath || folderPath.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Home size={16} />
        <span>Media</span>
      </button>
      {folderPath.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={16} className="text-gray-400" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
              index === folderPath.length - 1
                ? 'text-gray-900 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  );
};

// Upload Modal (legacy - YodeckAddMediaModal is preferred)
const UploadModal = ({
  open,
  onClose,
  uploadTab,
  setUploadTab,
  uploadedFiles,
  setUploadedFiles,
  openFilePicker,
  saveUploadedFiles,
  savingUploads,
  webPageUrl,
  setWebPageUrl,
  webPageName,
  setWebPageName,
  saveWebPage,
  savingWebPage,
  isUploadConfigured = true,
}) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Add Media</ModalTitle>
      </ModalHeader>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setUploadTab('upload')}
          className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            uploadTab === 'upload'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload size={18} />
          Upload Files
        </button>
        <button
          onClick={() => setUploadTab('webpage')}
          className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
            uploadTab === 'webpage'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link size={18} />
          Web Page URL
        </button>
      </div>

      <ModalContent>
        {uploadTab === 'upload' ? (
          <Stack gap="md">
            {!isUploadConfigured ? (
              <div className="border-2 border-dashed border-yellow-300 rounded-xl p-8 text-center bg-yellow-50">
                <AlertTriangle size={40} className="mx-auto text-yellow-500 mb-4" />
                <p className="text-gray-800 font-medium mb-2">File Upload Not Configured</p>
                <p className="text-gray-600 text-sm mb-4">
                  To upload images and videos, AWS S3 credentials need to be configured.
                </p>
                <div className="bg-white rounded-lg p-4 text-left text-sm text-gray-600 border border-yellow-200">
                  <p className="font-medium text-gray-700 mb-2">Setup instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Set up an AWS S3 bucket</li>
                    <li>Add your AWS credentials to .env.local</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  You can still add web pages using the "Web Page URL" tab above.
                </p>
              </div>
            ) : (
              <div
                onClick={openFilePicker}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">Click to upload files</p>
                <p className="text-gray-400 text-sm mt-1">Images, Videos, Audio, PDFs (max 100MB)</p>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <Stack gap="xs">
                <p className="text-sm font-medium text-gray-700">
                  Uploaded ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                      {file.thumbnail ? (
                        <img
                          src={file.thumbnail}
                          alt={file.originalFilename || 'Uploaded file'}
                          className="w-10 h-10 object-cover rounded"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-green-100 rounded flex items-center justify-center ${file.thumbnail ? 'hidden' : ''}`}>
                        <CheckCircle size={20} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.originalFilename}</p>
                        <p className="text-xs text-gray-500">
                          {file.resourceType} • {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <Trash2 size={16} className="text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </Stack>
            )}
          </Stack>
        ) : (
          <form onSubmit={saveWebPage} id="web-page-form">
            <Stack gap="md">
              <FormField
                label="Web Page URL"
                required
                hint="Enter a full URL including https://"
              >
                <Input
                  type="url"
                  value={webPageUrl}
                  onChange={(e) => setWebPageUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </FormField>

              <FormField label="Display Name (optional)">
                <Input
                  value={webPageName}
                  onChange={(e) => setWebPageName(e.target.value)}
                  placeholder="My Web Page"
                />
              </FormField>
            </Stack>
          </form>
        )}
      </ModalContent>

      <ModalFooter>
        {uploadTab === 'upload' ? (
          <>
            <p className="text-sm text-gray-500 flex-1">
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) ready to save` : 'No files uploaded yet'}
            </p>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={saveUploadedFiles} disabled={uploadedFiles.length === 0 || savingUploads} loading={savingUploads}>
              Save {uploadedFiles.length || ''} File{uploadedFiles.length !== 1 ? 's' : ''}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              form="web-page-form"
              disabled={!webPageUrl || savingWebPage}
              loading={savingWebPage}
            >
              <Plus size={18} />
              Add Web Page
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ deleteConfirm, onClose, onConfirm, deleting }) => {
  if (!deleteConfirm) return null;

  return (
    <Modal open={!!deleteConfirm} onClose={onClose} size="sm">
      <ModalContent>
        {deleteConfirm.loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Checking where this media is used...</p>
          </div>
        ) : deleteConfirm.usage?.is_in_use ? (
          <Stack gap="md">
            <Inline gap="sm" align="start">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Media In Use</h3>
                <p className="text-gray-600 text-sm mt-1">
                  <strong>"{deleteConfirm.name}"</strong> is currently being used:
                </p>
              </div>
            </Inline>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {deleteConfirm.usage?.playlist_items?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Playlists</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.playlist_items.count} playlist{deleteConfirm.usage.playlist_items.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
              {deleteConfirm.usage?.layout_zones?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Layout Zones</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.layout_zones.count} zone{deleteConfirm.usage.layout_zones.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
            </div>

            <Alert variant="warning">
              Deleting this media will remove it from all playlists and layouts where it's used.
            </Alert>

            <Inline gap="sm">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => onConfirm(true)} className="flex-1" disabled={deleting} loading={deleting}>
                <Trash2 size={16} />
                Delete Anyway
              </Button>
            </Inline>
          </Stack>
        ) : (
          <Stack gap="md">
            <Inline gap="sm" align="start">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Media?</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? This action cannot be undone.
                </p>
              </div>
            </Inline>

            <Inline gap="sm">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => onConfirm(false)} className="flex-1" disabled={deleting} loading={deleting}>
                <Trash2 size={16} />
                Delete
              </Button>
            </Inline>
          </Stack>
        )}
      </ModalContent>
    </Modal>
  );
};

// Limit Reached Modal
const LimitReachedModal = ({ open, onClose, limits, mediaCount }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalContent className="text-center">
        <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Media Limit Reached</h3>
        <p className="text-gray-600 mb-6">
          You've used {formatLimitDisplay(limits?.maxMediaAssets, mediaCount)} media assets on your {limits?.planName} plan.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-medium text-gray-900 mb-2">Upgrade to get:</h4>
          <Stack gap="xs">
            <Inline gap="sm" align="center">
              <Image className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">More storage for your media</span>
            </Inline>
            <Inline gap="sm" align="center">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Higher limits for all resources</span>
            </Inline>
            <Inline gap="sm" align="center">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">Priority support and more features</span>
            </Inline>
          </Stack>
        </div>

        <Inline gap="sm" className="w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              onClose();
              window.location.hash = '#account-plan';
            }}
            className="flex-1"
          >
            <Zap size={16} />
            View Plans
          </Button>
        </Inline>
      </ModalContent>
    </Modal>
  );
};

// Folder Create Modal
const FolderCreateModal = ({ open, onClose, folderName, setFolderName, onCreate, creating }) => {
  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim());
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Create New Folder</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <form onSubmit={handleSubmit} id="folder-form">
          <FormField label="Folder Name" required>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="My Folder"
              autoFocus
            />
          </FormField>
        </form>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="folder-form"
          disabled={!folderName.trim() || creating}
          loading={creating}
        >
          <FolderPlus size={18} />
          Create Folder
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Move to Folder Modal
const MoveToFolderModal = ({ open, onClose, mediaName, folders, onMove, moving }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Move to Folder</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm text-gray-600 mb-4">
          Select a destination folder for <span className="font-medium">{mediaName}</span>
        </p>
        <Stack gap="sm">
          {/* Root folder option */}
          <button
            onClick={() => onMove(null)}
            disabled={moving}
            className="flex items-center gap-3 p-3 w-full text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
              <Home size={18} className="text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Root (No Folder)</p>
              <p className="text-xs text-gray-500">Move to main media library</p>
            </div>
          </button>
          {/* Folder options */}
          {folders.map((folder) => {
            const folderId = folder.folder_id || folder.id;
            const folderName = folder.folder_name || folder.name;
            return (
              <button
                key={folderId}
                onClick={() => onMove(folderId)}
                disabled={moving}
                className="flex items-center gap-3 p-3 w-full text-left rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center">
                  <Folder size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{folderName}</p>
                  <p className="text-xs text-gray-500">{folder.media_count || 0} items</p>
                </div>
              </button>
            );
          })}
          {folders.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No folders yet. Create a folder first to organize your media.
            </p>
          )}
        </Stack>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={moving}>
          Cancel
        </Button>
        {moving && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Moving...
          </span>
        )}
      </ModalFooter>
    </Modal>
  );
};

// Add to Playlist Modal
const AddToPlaylistModal = ({ open, onClose, mediaName, playlists, onAdd, adding, onCreateNew }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Add to Playlist</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm text-gray-600 mb-4">
          Add <span className="font-medium">{mediaName}</span> to a playlist
        </p>
        <Stack gap="sm">
          {/* Create new playlist option */}
          <button
            onClick={onCreateNew}
            disabled={adding}
            className="flex items-center gap-3 p-3 w-full text-left rounded-lg border border-dashed border-gray-300 hover:border-[#f26f21] hover:bg-orange-50 transition-colors"
          >
            <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
              <Plus size={18} className="text-[#f26f21]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create New Playlist</p>
              <p className="text-xs text-gray-500">Add media to a new playlist</p>
            </div>
          </button>
          {/* Existing playlists */}
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => onAdd(playlist.id, playlist.name)}
              disabled={adding}
              className="flex items-center gap-3 p-3 w-full text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <ListPlus size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{playlist.name}</p>
                <p className="text-xs text-gray-500">{playlist.items?.count || 0} items</p>
              </div>
            </button>
          ))}
          {playlists.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No playlists yet. Create one to get started.
            </p>
          )}
        </Stack>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={adding}>
          Cancel
        </Button>
        {adding && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        )}
      </ModalFooter>
    </Modal>
  );
};

// Set to Screen Modal
const SetToScreenModal = ({ open, onClose, mediaName, screens, onSet, setting }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Set to Screen</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm text-gray-600 mb-4">
          Display <span className="font-medium">{mediaName}</span> on a screen
        </p>
        <Stack gap="sm">
          {screens.map((screen) => (
            <button
              key={screen.id}
              onClick={() => onSet(screen.id, screen.name)}
              disabled={setting}
              className="flex items-center gap-3 p-3 w-full text-left rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                screen.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Monitor size={18} className={screen.status === 'online' ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{screen.name}</p>
                <p className="text-xs text-gray-500">
                  {screen.status === 'online' ? (
                    <span className="text-green-600">● Online</span>
                  ) : (
                    <span className="text-gray-400">○ Offline</span>
                  )}
                  {screen.location && ` • ${screen.location}`}
                </p>
              </div>
            </button>
          ))}
          {screens.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No screens registered yet. Add a screen to display content.
            </p>
          )}
        </Stack>
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={setting}>
          Cancel
        </Button>
        {setting && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Setting...
          </span>
        )}
      </ModalFooter>
    </Modal>
  );
};

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const MediaLibraryPage = ({ showToast, filter = null }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mediaAssets, setMediaAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState(null);
  const [orientationFilter, setOrientationFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal state
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Upload modal state
  const [uploadTab, setUploadTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [savingUploads, setSavingUploads] = useState(false);
  const [webPageUrl, setWebPageUrl] = useState('');
  const [webPageName, setWebPageName] = useState('');
  const [savingWebPage, setSavingWebPage] = useState(false);

  // Plan limits state
  const [limits, setLimits] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingForce, setDeletingForce] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const ITEMS_PER_PAGE_OPTIONS = [12, 20, 40, 60];

  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Move to folder modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [mediaToMove, setMediaToMove] = useState(null);
  const [movingMedia, setMovingMedia] = useState(false);

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // Drag and drop state
  const [draggingMedia, setDraggingMedia] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // Add to Playlist modal state
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);

  // Set to Screen modal state
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [availableScreens, setAvailableScreens] = useState([]);
  const [settingToScreen, setSettingToScreen] = useState(false);

  // Folder hook
  const {
    folders,
    isLoading: foldersLoading,
    folderPath,
    createFolder,
    renameFolder,
    deleteFolder,
    refresh: refreshFolders,
  } = useMediaFolders({ parentId: currentFolderId });

  // Check if S3 is configured (via API)
  const isUploadConfigured = true; // S3 presigned URLs work via API

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

  const handleUploadSuccess = useCallback(async (uploadedFile) => {
    console.log('[MediaLibrary] Upload success, file:', uploadedFile);
    showToast?.('File uploaded, saving to library...');

    // Auto-save to database immediately
    try {
      const mediaType = getMediaTypeFromUpload(uploadedFile.mediaType || uploadedFile.resourceType, uploadedFile.format);
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
        folderId: currentFolderId, // Save to current folder
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setShowUploadModal(false);
      showToast?.('Media added successfully!', 'success');
      // Refresh folder counts if we're in a folder
      if (currentFolderId) refreshFolders();
    } catch (error) {
      console.error('[MediaLibrary] Error saving media:', error);
      showToast?.(`Error saving media: ${error.message}`, 'error');
      // Still add to pending uploads for manual retry
      setUploadedFiles((prev) => [...prev, uploadedFile]);
    }
  }, [showToast, currentFolderId, refreshFolders]);

  const handleUploadError = useCallback((error) => {
    showToast?.(`Upload failed: ${error.message}`, 'error');
  }, [showToast]);

  // S3 Upload hook
  const {
    openFilePicker,
    renderFileInput,
    uploading: s3Uploading,
    progress: s3Progress,
  } = useS3Upload({
    onSuccess: handleUploadSuccess,
    onError: handleUploadError,
    folder: 'bizscreen/media',
    multiple: true,
  });

  const saveUploadedFiles = async () => {
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
          folderId: currentFolderId, // Save to current folder
        });
        savedAssets.push(asset);
      }

      setMediaAssets((prev) => [...savedAssets, ...prev]);
      setUploadedFiles([]);
      setShowUploadModal(false);
      showToast?.(`${savedAssets.length} media file(s) added successfully`);
      // Refresh folder counts if we're in a folder
      if (currentFolderId) refreshFolders();
    } catch (error) {
      console.error('Error saving uploads:', error);
      showToast?.(`Error saving media: ${error.message}`, 'error');
    } finally {
      setSavingUploads(false);
    }
  };

  const saveWebPage = async (e) => {
    e.preventDefault();
    if (!webPageUrl) return;

    try {
      setSavingWebPage(true);
      const asset = await createWebPageAsset({
        name: webPageName || webPageUrl,
        url: webPageUrl,
        folderId: currentFolderId, // Save to current folder
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setWebPageUrl('');
      setWebPageName('');
      setShowUploadModal(false);
      showToast?.('Web page added successfully');
      // Refresh folder counts
      if (currentFolderId) refreshFolders();
    } catch (error) {
      console.error('Error adding web page:', error);
      showToast?.(`Error adding web page: ${error.message}`, 'error');
    } finally {
      setSavingWebPage(false);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadedFiles([]);
    setWebPageUrl('');
    setWebPageName('');
    setUploadTab('upload');
  };

  // Folder creation handler
  const handleCreateFolder = async (folderName) => {
    try {
      setCreatingFolder(true);
      await createFolder({ name: folderName, parentId: currentFolderId });
      showToast?.(`Folder "${folderName}" created successfully`, 'success');
      setShowFolderModal(false);
      setNewFolderName('');
    } catch (err) {
      console.error('Error creating folder:', err);
      showToast?.('Failed to create folder: ' + err.message, 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Navigate into folder
  const handleEnterFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1); // Reset pagination when entering folder
  };

  // Navigate to root or specific folder from breadcrumb
  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  const closeFolderModal = () => {
    setShowFolderModal(false);
    setNewFolderName('');
  };

  // Move media to folder handler
  const handleMoveMedia = (asset) => {
    setMediaToMove(asset);
    setShowMoveModal(true);
  };

  const handleConfirmMove = async (targetFolderId) => {
    if (!mediaToMove) return;

    try {
      setMovingMedia(true);
      await moveMediaToFolder([mediaToMove.id], targetFolderId);
      showToast?.(`"${mediaToMove.name}" moved successfully`, 'success');
      setShowMoveModal(false);
      setMediaToMove(null);
      // Refresh media list and folder counts
      fetchMediaAssets();
      refreshFolders();
    } catch (error) {
      console.error('Error moving media:', error);
      showToast?.(`Error moving media: ${error.message}`, 'error');
    } finally {
      setMovingMedia(false);
    }
  };

  const closeMoveModal = () => {
    setShowMoveModal(false);
    setMediaToMove(null);
  };

  // Add to Playlist handlers
  const handleAddToPlaylist = async (media) => {
    try {
      const playlists = await fetchPlaylists({ limit: 50 });
      setAvailablePlaylists(playlists || []);
      setShowPlaylistModal(true);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      showToast?.('Error loading playlists', 'error');
    }
  };

  const handleConfirmAddToPlaylist = async (playlistId, playlistName) => {
    if (!selectedAsset) return;
    setAddingToPlaylist(true);
    try {
      await addPlaylistItem(playlistId, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      showToast?.(`Added "${selectedAsset.name}" to "${playlistName}"`, 'success');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error('Error adding to playlist:', error);
      showToast?.(`Error adding to playlist: ${error.message}`, 'error');
    } finally {
      setAddingToPlaylist(false);
    }
  };

  const handleCreateNewPlaylist = async () => {
    if (!selectedAsset) return;
    setAddingToPlaylist(true);
    try {
      // Create a new playlist with the media name
      const playlist = await createPlaylist({
        name: `${selectedAsset.name} Playlist`,
        description: `Playlist created from ${selectedAsset.name}`,
      });
      // Add the media to the new playlist
      await addPlaylistItem(playlist.id, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      showToast?.(`Created playlist "${playlist.name}" with ${selectedAsset.name}`, 'success');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      showToast?.(`Error creating playlist: ${error.message}`, 'error');
    } finally {
      setAddingToPlaylist(false);
    }
  };

  const closePlaylistModal = () => {
    setShowPlaylistModal(false);
  };

  // Set to Screen handlers
  const handleSetToScreen = async (media) => {
    try {
      const screens = await fetchScreens({ limit: 50 });
      setAvailableScreens(screens || []);
      setShowScreenModal(true);
    } catch (error) {
      console.error('Error fetching screens:', error);
      showToast?.('Error loading screens', 'error');
    }
  };

  const handleConfirmSetToScreen = async (screenId, screenName) => {
    if (!selectedAsset) return;
    setSettingToScreen(true);
    try {
      // Create a quick playlist for this single media item
      const playlist = await createPlaylist({
        name: `Quick: ${selectedAsset.name}`,
        description: `Quick display playlist for ${selectedAsset.name}`,
      });
      // Add the media to the playlist
      await addPlaylistItem(playlist.id, {
        itemType: 'media',
        itemId: selectedAsset.id,
        duration: selectedAsset.duration || 10,
      });
      // Assign the playlist to the screen
      await assignPlaylistToScreen(screenId, playlist.id);
      showToast?.(`"${selectedAsset.name}" is now playing on "${screenName}"`, 'success');
      setShowScreenModal(false);
    } catch (error) {
      console.error('Error setting to screen:', error);
      showToast?.(`Error: ${error.message}`, 'error');
    } finally {
      setSettingToScreen(false);
    }
  };

  const closeScreenModal = () => {
    setShowScreenModal(false);
  };

  // Drag and drop handlers
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

  // Handle dropping media onto another media card (reorder)
  const handleDropOnMedia = useCallback(async (draggedId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    // Optimistic update
    setMediaAssets((prev) => {
      const newAssets = [...prev];
      const [draggedItem] = newAssets.splice(fromIndex, 1);
      newAssets.splice(toIndex, 0, draggedItem);
      return newAssets;
    });

    // Clear drag state
    handleDragEnd();

    try {
      // Call API to persist the new order
      await reorderMedia(draggedId, toIndex, currentFolderId);
      showToast?.('Media reordered', 'success');
    } catch (error) {
      console.error('Error reordering media:', error);
      showToast?.('Failed to save order: ' + error.message, 'error');
      // Revert on error
      fetchMediaAssets();
    }
  }, [currentFolderId, showToast, handleDragEnd]);

  // Handle dropping media onto a folder
  const handleDropOnFolder = useCallback(async (mediaId, folderId, mediaName) => {
    // Clear drag state
    handleDragEnd();

    try {
      await moveMediaToFolderOrdered(mediaId, folderId);
      showToast?.(`"${mediaName}" moved to folder`, 'success');
      // Refresh media list and folder counts
      fetchMediaAssets();
      refreshFolders();
    } catch (error) {
      console.error('Error moving media to folder:', error);
      showToast?.('Failed to move: ' + error.message, 'error');
    }
  }, [showToast, handleDragEnd, refreshFolders]);

  useEffect(() => {
    fetchMediaAssets();
    fetchLimits();
  }, [filter, currentFolderId]);

  const fetchLimits = async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const fetchMediaAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('media_assets')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filter) {
        query = query.eq('type', filter);
      }

      // Filter by folder
      if (currentFolderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', currentFolderId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setMediaAssets(data || []);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError(err.message || 'Failed to load media');
      showToast?.('Error loading media: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on search, type, and orientation
  const filteredAssets = mediaAssets.filter((asset) => {
    // Search filter
    if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Type filter
    if (typeFilter && asset.type !== typeFilter) {
      return false;
    }
    // Orientation filter
    if (orientationFilter && asset.orientation !== orientationFilter) {
      return false;
    }
    return true;
  });

  const hasActiveFilters = typeFilter || orientationFilter;

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, orientationFilter]);

  // Selection and detail modal handlers
  const handleSelectAsset = (asset) => {
    // Single click selects the asset for Actions menu
    setSelectedAsset(asset);
  };

  const handleOpenDetail = (asset) => {
    // Double click or explicit action opens the detail modal
    setSelectedAsset(asset);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    // Don't clear selection so Actions menu can still work
  };

  const handleUpdateAsset = async (assetId, updates) => {
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
    } catch (err) {
      console.error('Error updating asset:', err);
      throw err;
    }
  };

  const handleDeleteFromDetail = async (assetId) => {
    const result = await deleteMediaAssetSafely(assetId, { force: true });
    if (result.success) {
      setMediaAssets((prev) => prev.filter((a) => a.id !== assetId));
    } else {
      throw new Error(result.error || 'Failed to delete');
    }
  };

  const clearAllFilters = () => {
    setTypeFilter(null);
    setOrientationFilter(null);
    setSearch('');
  };

  const handleDelete = async (asset) => {
    setDeleteConfirm({ id: asset.id, name: asset.name, usage: null, loading: true });
    setActionMenuId(null);

    try {
      const usage = await getMediaUsage(asset.id);
      setDeleteConfirm({ id: asset.id, name: asset.name, usage, loading: false });
    } catch (error) {
      console.error('Error checking usage:', error);
      setDeleteConfirm({ id: asset.id, name: asset.name, usage: null, loading: false });
    }
  };

  const confirmDelete = async (force = false) => {
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
      console.error('Error deleting media:', error);
      showToast?.('Error deleting media: ' + error.message, 'error');
    } finally {
      setDeletingForce(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPageTitle = () => {
    if (!filter) return t('media.allMedia', 'All Media');
    return MEDIA_TYPE_LABELS[filter] + 's';
  };

  const limitReached = limits ? hasReachedLimit(limits.maxMediaAssets, mediaAssets.length) : false;

  const handleAddMedia = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowUploadModal(true);
    }
  };

  return (
    <PageLayout>
      {/* Yodeck-style page header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
          <Inline gap="sm" className="items-center">
            <Button size="sm" icon={<Plus size={16} />} onClick={handleAddMedia} className="bg-[#f26f21] hover:bg-[#e05e10] text-white">
              Add Media
            </Button>
            <Button variant="ghost" size="sm">
              Tags
            </Button>
            <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setShowFolderModal(true)}>
              Add folder
            </Button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 ${showFilters ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
                title="Filter"
              >
                <Filter size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <Grid3X3 size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <List size={18} className="text-gray-600" />
              </button>
            </div>
          </Inline>
        </div>
      </div>

      <PageContent>
        <Stack gap="lg">
          {/* Error Banner */}
          {error && !loading && (
            <Banner
              variant="error"
              icon={<AlertTriangle size={20} />}
              title="Failed to load media"
              action={
                <Button variant="secondary" size="sm" onClick={fetchMediaAssets}>
                  Retry
                </Button>
              }
            >
              {error}
            </Banner>
          )}

          {/* Limit Warning Banner */}
          {!error && limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {/* Breadcrumbs - show when inside a folder */}
          {currentFolderId && (
            <div className="flex items-center justify-between">
              <FolderBreadcrumbs folderPath={folderPath} onNavigate={handleBreadcrumbClick} />
              <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(null)}>
                <Home size={16} />
                Back to Root
              </Button>
            </div>
          )}

          {/* Empty State - only show when no folders and no media at root level */}
          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && !currentFolderId && (
            <Card className="p-6">
              <YodeckEmptyState
                type="media"
                title="No Media Yet"
                description="BizScreen Media range from images to PDFs, YouTube links or web pages. Add some to get started, and then use them to create playlists and layouts."
                actionLabel="Upload Media"
                onAction={handleAddMedia}
                secondaryActionLabel="Add Web Page"
                onSecondaryAction={() => {
                  setUploadTab('webpage');
                  setShowUploadModal(true);
                }}
                showTourLink={true}
                tourLinkText="Take the media tour →"
                onTourClick={() => window.open('https://docs.bizscreen.io/media', '_blank')}
              />
            </Card>
          )}

          {/* Empty Folder State - no matching media in folder */}
          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && currentFolderId && !filter && (
            <Card className="p-6">
              <YodeckEmptyState
                type="folder"
                title="This Folder is Empty"
                description="Add media or create subfolders to organize your content."
                actionLabel="Upload Media"
                onAction={handleAddMedia}
                secondaryActionLabel="Create Subfolder"
                onSecondaryAction={() => setShowFolderModal(true)}
              />
            </Card>
          )}

          {/* Empty Folder State - filter active but no matching type in folder */}
          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && currentFolderId && filter && (
            <Card className="p-6">
              <EmptyState
                icon={<Folder size={48} className="text-gray-300" />}
                title={`No ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter}s in this folder`}
                description={`This folder doesn't contain any ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter} files.`}
              />
            </Card>
          )}

          {/* Empty State - filter active at root level with no matching media */}
          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && !currentFolderId && filter && (
            <Card className="p-6">
              <EmptyState
                icon={<Image size={48} className="text-gray-300" />}
                title={`No ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter}s yet`}
                description={`Upload ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter} files to see them here.`}
                action={
                  <Button onClick={handleAddMedia}>
                    <Plus size={16} className="mr-2" />
                    Add {MEDIA_TYPE_LABELS[filter] || 'Media'}
                  </Button>
                }
              />
            </Card>
          )}

          {/* Yodeck-style search bar */}
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card variant="outlined" className="p-4">
              <div className="flex flex-wrap gap-6">
                {/* Type Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    File Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_FILTER_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id || 'all'}
                          onClick={() => setTypeFilter(option.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            typeFilter === option.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={14} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orientation Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Orientation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ORIENTATION_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.id || 'all'}
                        onClick={() => setOrientationFilter(option.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          orientationFilter === option.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      <X size={14} />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Content */}
          {error ? null : loading || foldersLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAssets.length === 0 && folders.length === 0 && search ? (
            <EmptyState
              icon={<Search size={48} className="text-gray-300" />}
              title="No media found"
              description={`No media matching "${search}"`}
            />
          ) : viewMode === 'list' ? (
            <Stack gap="md">
              {/* Folder list */}
              {folders.length > 0 && !search && (
                <Card variant="outlined">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Folders ({folders.length})</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {folders.map((folder) => {
                      const folderId = folder.folder_id || folder.id;
                      const folderName = folder.folder_name || folder.name;
                      return (
                        <div
                          key={folderId}
                          onClick={() => handleEnterFolder(folderId)}
                          className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Folder size={20} className="text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{folderName}</span>
                            <p className="text-sm text-gray-500">
                              {folder.media_count || 0} item{(folder.media_count || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Media list */}
              {paginatedAssets.length > 0 && (
                <Card variant="outlined">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                          <th className="p-4 w-8">
                            <input type="checkbox" className="rounded border-gray-300" />
                          </th>
                          <th className="p-4 font-medium">Name</th>
                          <th className="p-4 font-medium">Media Type</th>
                          <th className="p-4 font-medium">Modified</th>
                          <th className="p-4 font-medium">Tags</th>
                          <th className="p-4 font-medium w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAssets.map((asset) => (
                          <MediaListRow
                            key={asset.id}
                            asset={asset}
                            actionMenuId={actionMenuId}
                            onActionMenuToggle={setActionMenuId}
                            onDelete={handleDelete}
                            onMove={handleMoveMedia}
                            formatDate={formatDate}
                            onClick={handleSelectAsset}
                            onDoubleClick={handleOpenDetail}
                            isSelected={selectedAsset?.id === asset.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </Stack>
          ) : (
            <Stack gap="md">
              {/* Folders Grid */}
              {folders.length > 0 && !search && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-3">Folders ({folders.length})</p>
                  <Grid cols={5} gap="md" className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {folders.map((folder) => {
                      const folderId = folder.folder_id || folder.id;
                      return (
                        <FolderGridCard
                          key={folderId}
                          folder={folder}
                          onClick={handleEnterFolder}
                          onDragOver={handleDragOverFolder}
                          onDragLeave={handleDragLeaveFolder}
                          onDrop={handleDropOnFolder}
                          isDragOver={dragOverFolderId === folderId}
                        />
                      );
                    })}
                  </Grid>
                </div>
              )}

              {/* Media Grid */}
              {paginatedAssets.length > 0 && (
                <div>
                  {folders.length > 0 && !search && (
                    <p className="text-sm font-medium text-gray-500 mb-3">Media ({filteredAssets.length})</p>
                  )}
                  <Grid cols={5} gap="md" className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {paginatedAssets.map((asset, index) => (
                      <MediaGridCard
                        key={asset.id}
                        asset={asset}
                        index={index}
                        formatDate={formatDate}
                        onClick={handleSelectAsset}
                        onDoubleClick={handleOpenDetail}
                        isSelected={selectedAsset?.id === asset.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOverMedia}
                        onDrop={handleDropOnMedia}
                        isDragging={draggingMedia?.id === asset.id}
                        isDragOver={dragOverIndex === index && draggingMedia?.id !== asset.id}
                      />
                    ))}
                  </Grid>
                </div>
              )}
            </Stack>
          )}

          {/* Pagination */}
          {!error && filteredAssets.length > 0 && totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {/* Items info */}
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} items
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* First page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft size={18} className="text-gray-600" />
                </button>

                {/* Previous page */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#f26f21] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next page */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Stack>
      </PageContent>

      {/* Hidden file input for S3 uploads */}
      {renderFileInput()}

      {/* Modals */}
      <YodeckAddMediaModal
        open={showUploadModal}
        onClose={closeUploadModal}
        onUpload={saveUploadedFiles}
        onAddWebPage={async (url, name) => {
          setWebPageUrl(url);
          setWebPageName(name || '');
          await saveWebPage({ preventDefault: () => {} });
        }}
        openFilePicker={openFilePicker}
        showToast={showToast}
        uploading={s3Uploading}
        uploadProgress={s3Progress}
      />

      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        deleting={deletingForce}
      />

      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limits={limits}
        mediaCount={mediaAssets.length}
      />

      {/* Folder Create Modal */}
      <FolderCreateModal
        open={showFolderModal}
        onClose={closeFolderModal}
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        onCreate={handleCreateFolder}
        creating={creatingFolder}
      />

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        open={showMoveModal}
        onClose={closeMoveModal}
        mediaName={mediaToMove?.name}
        folders={folders}
        onMove={handleConfirmMove}
        moving={movingMedia}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        open={showPlaylistModal}
        onClose={closePlaylistModal}
        mediaName={selectedAsset?.name}
        playlists={availablePlaylists}
        onAdd={handleConfirmAddToPlaylist}
        adding={addingToPlaylist}
        onCreateNew={handleCreateNewPlaylist}
      />

      {/* Set to Screen Modal */}
      <SetToScreenModal
        open={showScreenModal}
        onClose={closeScreenModal}
        mediaName={selectedAsset?.name}
        screens={availableScreens}
        onSet={handleConfirmSetToScreen}
        setting={settingToScreen}
      />

      {/* Media Detail Modal */}
      <MediaDetailModal
        open={showDetailModal}
        onClose={handleCloseDetail}
        asset={selectedAsset}
        onUpdate={handleUpdateAsset}
        onDelete={handleDeleteFromDetail}
        isGlobal={selectedAsset && !selectedAsset.owner_id}
        showToast={showToast}
      />
    </PageLayout>
  );
};

export default MediaLibraryPage;
