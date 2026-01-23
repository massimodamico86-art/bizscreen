/**
 * @file MediaLibraryComponents.jsx
 * @description Sub-components for MediaLibraryPage extracted for modularity.
 *
 * Components:
 * - LimitWarningBanner: Display warning when media limit is reached
 * - MediaListRow: List view row for media asset
 * - MediaGridCard: Grid view card for media asset with drag/drop
 * - FolderGridCard: Grid view card for folder with drop target
 * - FolderBreadcrumbs: Navigation breadcrumbs
 * - DeleteConfirmModal: Delete confirmation with usage check
 * - LimitReachedModal: Modal when limit is reached
 * - FolderCreateModal: Create new folder modal
 * - MoveToFolderModal: Move media to folder modal
 * - AddToPlaylistModal: Add media to playlist modal
 * - SetToScreenModal: Push media to screen modal
 */

import { useRef } from 'react';
import {
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
  CheckCircle,
  Loader2,
  AlertTriangle,
  Zap,
  MoreVertical,
  Eye,
  ChevronRight,
  Home,
  ListPlus,
  Monitor,
  GripVertical,
  Grid3X3,
  Plus,
} from 'lucide-react';
import {
  Stack,
  Inline,
} from '../../design-system';
import { Button } from '../../design-system';
import { Card, CardContent } from '../../design-system';
import { Badge } from '../../design-system';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../../design-system';
import { Banner, Alert } from '../../design-system';
import { FormField, Input } from '../../design-system';

export const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
  app: Grid3X3,
};

export const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
  app: 'App',
};

// Limit warning banner
export const LimitWarningBanner = ({ limits, onUpgrade }) => {
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
      You&apos;ve reached the maximum of {limits.maxMediaAssets ?? 'your'} media assets for your {limits.planName ?? 'current'} plan.
      Upgrade to add more media.
    </Banner>
  );
};

// Media list row
export const MediaListRow = ({ asset, actionMenuId, onActionMenuToggle, onEdit, onDuplicate, onDelete, onMove, formatDate, onClick, onDoubleClick, isSelected }) => {
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
            onClick={(e) => { e.stopPropagation(); onActionMenuToggle(asset.id); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-gray-400" />
          </button>
          {actionMenuId === asset.id && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); onActionMenuToggle(null); onEdit?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onActionMenuToggle(null); onDuplicate?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy size={14} />
                Duplicate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onActionMenuToggle(null); onMove?.(asset); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Folder size={14} />
                Move to Folder
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
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

// Media grid card with drag support and bulk selection
export const MediaGridCard = ({
  asset,
  formatDate,
  onClick,
  onDoubleClick,
  isSelected,
  isBulkSelected,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
  index,
  onShowPreview,
  onHidePreview,
}) => {
  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;
  const isGlobal = !asset.owner_id;
  const cardRef = useRef(null);

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

  const handleDragEnd = () => {
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
      ref={cardRef}
      variant="outlined"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => onShowPreview?.(asset, cardRef.current)}
      onMouseLeave={() => onHidePreview?.()}
      className={`group cursor-pointer hover:shadow-md transition-all overflow-hidden ${
        isSelected ? 'ring-2 ring-[#f26f21] ring-offset-2' : ''
      } ${isBulkSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${isDragging ? 'opacity-50 scale-95' : ''} ${
        isDragOver ? 'ring-2 ring-[#f26f21] ring-dashed' : ''
      }`}
      onClick={() => onClick?.(asset)}
      onDoubleClick={() => onDoubleClick?.(asset)}
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {asset.thumbnail_url || asset.url ? (
          <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={32} className="text-gray-400" />
          </div>
        )}

        <div className={`absolute top-2 left-2 z-20 ${isBulkSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <label
            className="flex items-center justify-center w-6 h-6 bg-white rounded shadow cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isBulkSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.(asset.id);
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="p-1.5 bg-black/60 rounded cursor-grab active:cursor-grabbing">
            <GripVertical size={14} className="text-white" />
          </div>
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
          <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {isGlobal && (
          <div className="absolute top-10 left-2">
            <Badge variant="info" size="sm" className="bg-blue-600 text-white border-0 uppercase text-[10px] font-semibold">
              Global
            </Badge>
          </div>
        )}

        {asset.type === 'video' && (
          <div className="absolute bottom-2 right-2">
            <div className="p-1 bg-black/60 rounded">
              <Video size={14} className="text-white" />
            </div>
          </div>
        )}

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
export const FolderGridCard = ({ folder, onClick, onDragOver, onDragLeave, onDrop, isDragOver }) => {
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
    } catch {
      // Silent fail on invalid drop data
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
export const FolderBreadcrumbs = ({ folderPath, onNavigate }) => {
  if (!folderPath || folderPath.length === 0) return null;

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

// Delete Confirmation Modal
export const DeleteConfirmModal = ({ deleteConfirm, onClose, onConfirm, deleting }) => {
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
                  <strong>&quot;{deleteConfirm.name}&quot;</strong> is currently being used:
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
              Deleting this media will remove it from all playlists and layouts where it&apos;s used.
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
                  Are you sure you want to delete <strong>&quot;{deleteConfirm.name}&quot;</strong>? This action cannot be undone.
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
export const LimitReachedModal = ({ open, onClose, limits, mediaCount, formatLimitDisplay }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalContent className="text-center">
        <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Media Limit Reached</h3>
        <p className="text-gray-600 mb-6">
          You&apos;ve used {formatLimitDisplay?.(limits?.maxMediaAssets, mediaCount) || `${mediaCount}/${limits?.maxMediaAssets}`} media assets on your {limits?.planName} plan.
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
export const FolderCreateModal = ({ open, onClose, folderName, setFolderName, onCreate, creating }) => {
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
export const MoveToFolderModal = ({ open, onClose, mediaName, folders, onMove, moving }) => {
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
          {folders.map((folder) => {
            const folderId = folder.folder_id || folder.id;
            const folderNameVal = folder.folder_name || folder.name;
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
                  <p className="font-medium text-gray-900">{folderNameVal}</p>
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
export const AddToPlaylistModal = ({ open, onClose, mediaName, playlists, onAdd, adding, onCreateNew }) => {
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
export const SetToScreenModal = ({ open, onClose, mediaName, screens, onSet, setting }) => {
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
                    <span className="text-green-600">Online</span>
                  ) : (
                    <span className="text-gray-400">Offline</span>
                  )}
                  {screen.location && ` - ${screen.location}`}
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
