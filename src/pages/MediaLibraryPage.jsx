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
  Link,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import {
  createMediaAsset,
  createWebPageAsset,
  MEDIA_TYPES,
  deleteMediaAssetSafely,
  getMediaUsage,
} from '../services/mediaService';
import {
  getEffectiveLimits,
  hasReachedLimit,
  formatLimitDisplay,
} from '../services/limitsService';

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

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => (
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
    You've reached the maximum of {limits?.maxMediaAssets} media assets for your {limits?.planName} plan.
    Upgrade to add more media.
  </Banner>
);

// Media list row
const MediaListRow = ({ asset, actionMenuId, onActionMenuToggle, onEdit, onDuplicate, onDelete, formatDate }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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

// Media grid card
const MediaGridCard = ({ asset, formatDate }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

  return (
    <Card variant="outlined" className="group cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {asset.thumbnail_url || asset.url ? (
          <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={32} className="text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <div className="absolute bottom-2 left-2">
          <Badge variant="neutral" className="bg-black/70 text-white border-0">
            {MEDIA_TYPE_LABELS[asset.type]}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-gray-900 truncate">{asset.name}</h3>
        <p className="text-xs text-gray-500 mt-1">{formatDate(asset.updated_at)}</p>
      </CardContent>
    </Card>
  );
};

// Upload Modal
const UploadModal = ({
  open,
  onClose,
  uploadTab,
  setUploadTab,
  uploadedFiles,
  setUploadedFiles,
  openCloudinaryWidget,
  saveUploadedFiles,
  savingUploads,
  webPageUrl,
  setWebPageUrl,
  webPageName,
  setWebPageName,
  saveWebPage,
  savingWebPage,
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
            <div
              onClick={openCloudinaryWidget}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <Upload size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Click to upload files</p>
              <p className="text-gray-400 text-sm mt-1">Images, Videos, Audio, PDFs (max 100MB)</p>
            </div>

            {uploadedFiles.length > 0 && (
              <Stack gap="xs">
                <p className="text-sm font-medium text-gray-700">
                  Uploaded ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                      {file.thumbnail ? (
                        <img src={file.thumbnail} alt={file.originalFilename} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                          <CheckCircle size={20} className="text-green-600" />
                        </div>
                      )}
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
              <FormField label="Web Page URL" required>
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

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const MediaLibraryPage = ({ showToast, filter = null }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mediaAssets, setMediaAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

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

  const getMediaTypeFromCloudinary = (resourceType, format) => {
    if (resourceType === 'image') return MEDIA_TYPES.IMAGE;
    if (resourceType === 'video') {
      if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(format)) return MEDIA_TYPES.AUDIO;
      return MEDIA_TYPES.VIDEO;
    }
    if (resourceType === 'raw') {
      if (['pdf'].includes(format)) return MEDIA_TYPES.DOCUMENT;
    }
    return MEDIA_TYPES.IMAGE;
  };

  const handleUploadSuccess = useCallback((uploadedFile) => {
    setUploadedFiles((prev) => [...prev, uploadedFile]);
  }, []);

  const handleUploadError = useCallback((error) => {
    showToast?.(`Upload failed: ${error.message}`, 'error');
  }, [showToast]);

  const openCloudinaryWidget = useCloudinaryUpload({
    onSuccess: handleUploadSuccess,
    onError: handleUploadError,
    folder: 'bizscreen/media',
    multiple: true,
    resourceType: 'auto',
  });

  const saveUploadedFiles = async () => {
    if (uploadedFiles.length === 0) return;

    try {
      setSavingUploads(true);
      const savedAssets = [];

      for (const file of uploadedFiles) {
        const mediaType = getMediaTypeFromCloudinary(file.resourceType, file.format);
        const asset = await createMediaAsset({
          name: file.originalFilename || `Media ${Date.now()}`,
          type: mediaType,
          url: file.optimizedUrl || file.url,
          thumbnailUrl: file.thumbnail,
          mimeType: `${file.resourceType}/${file.format}`,
          fileSize: file.size,
          duration: file.duration,
          width: file.width,
          height: file.height,
        });
        savedAssets.push(asset);
      }

      setMediaAssets((prev) => [...savedAssets, ...prev]);
      setUploadedFiles([]);
      setShowUploadModal(false);
      showToast?.(`${savedAssets.length} media file(s) added successfully`);
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
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setWebPageUrl('');
      setWebPageName('');
      setShowUploadModal(false);
      showToast?.('Web page added successfully');
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

  useEffect(() => {
    fetchMediaAssets();
    fetchLimits();
  }, [filter]);

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
      let query = supabase
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter) {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMediaAssets(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      showToast?.('Error loading media: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = mediaAssets.filter((asset) =>
    asset.name.toLowerCase().includes(search.toLowerCase())
  );

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
      <PageHeader
        title={getPageTitle()}
        description={`${filteredAssets.length} ${filteredAssets.length !== 1 ? t('media.items', 'items') : t('media.item', 'item')}`}
        actions={
          <Inline gap="sm">
            <Button variant="ghost" onClick={handleAddMedia}>
              <FolderPlus size={18} />
              {t('media.addFolder', 'Add folder')}
            </Button>
            <Button onClick={handleAddMedia}>
              <Plus size={18} />
              {t('media.addMedia', 'Add Media')}
            </Button>
          </Inline>
        }
      />

      <PageContent>
        <Stack gap="lg">
          {/* Limit Warning Banner */}
          {limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {/* Empty State Banner */}
          {mediaAssets.length === 0 && !loading && (
            <Banner
              variant="info"
              icon={<Image size={20} />}
              title="You haven't added your own Media."
              action={
                <Inline gap="sm">
                  <Button variant="ghost">Not now</Button>
                  <Button variant="secondary">Media tour</Button>
                </Inline>
              }
            >
              BizScreen Media range from images to PDFs, YouTube links or web pages. Add some to get started, and then use them to create playlists and layouts.
            </Banner>
          )}

          {/* Search and View Toggle */}
          <Inline gap="md" wrap className="items-center">
            <div className="flex-1 relative max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              />
            </div>
            <Inline gap="xs" align="center">
              <Button variant="ghost" size="sm">
                <Filter size={16} />
              </Button>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <List size={18} />
                </button>
              </div>
            </Inline>
          </Inline>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAssets.length === 0 && search ? (
            <EmptyState
              icon={<Search size={48} className="text-gray-300" />}
              title="No media found"
              description={`No media matching "${search}"`}
            />
          ) : viewMode === 'list' ? (
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
                    {filteredAssets.map((asset) => (
                      <MediaListRow
                        key={asset.id}
                        asset={asset}
                        actionMenuId={actionMenuId}
                        onActionMenuToggle={setActionMenuId}
                        onDelete={handleDelete}
                        formatDate={formatDate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Grid cols={5} gap="md" className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredAssets.map((asset) => (
                <MediaGridCard key={asset.id} asset={asset} formatDate={formatDate} />
              ))}
            </Grid>
          )}

          {/* Footer Actions */}
          {filteredAssets.length > 0 && (
            <Inline gap="sm">
              <Button onClick={handleAddMedia}>
                <Plus size={18} />
                Add Media
              </Button>
              <Button variant="ghost">Actions</Button>
            </Inline>
          )}
        </Stack>
      </PageContent>

      {/* Modals */}
      <UploadModal
        open={showUploadModal}
        onClose={closeUploadModal}
        uploadTab={uploadTab}
        setUploadTab={setUploadTab}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        openCloudinaryWidget={openCloudinaryWidget}
        saveUploadedFiles={saveUploadedFiles}
        savingUploads={savingUploads}
        webPageUrl={webPageUrl}
        setWebPageUrl={setWebPageUrl}
        webPageName={webPageName}
        setWebPageName={setWebPageName}
        saveWebPage={saveWebPage}
        savingWebPage={savingWebPage}
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
    </PageLayout>
  );
};

export default MediaLibraryPage;
