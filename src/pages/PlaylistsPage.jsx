import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ListVideo,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle,
  LayoutTemplate,
  Sparkles,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { formatDate } from '../utils/formatters';
import { getEffectiveLimits, hasReachedLimit, formatLimitDisplay } from '../services/limitsService';
import { getPlaylistTemplates, applyTemplate } from '../services/templateService';
import { getPlaylistUsage, deletePlaylistSafely } from '../services/playlistService';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { FormField, Input, Textarea } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../design-system';
import { Banner, Alert } from '../design-system';
import { EmptyState } from '../design-system';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => (
  <Banner
    variant="warning"
    icon={<AlertTriangle size={20} />}
    title="Playlist limit reached"
    action={
      <Button variant="secondary" size="sm" onClick={onUpgrade}>
        <Zap size={16} />
        Upgrade
      </Button>
    }
  >
    You've reached the maximum of {limits?.maxPlaylists} playlist{limits?.maxPlaylists !== 1 ? 's' : ''} for your {limits?.planName} plan.
  </Banner>
);

// Playlist table row
const PlaylistRow = ({ playlist, onNavigate, actionMenuId, onActionMenuToggle, onDuplicate, onDelete }) => (
  <tr
    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    onClick={() => onNavigate?.(`playlist-editor-${playlist.id}`)}
  >
    <td className="p-4" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" className="rounded border-gray-300" />
    </td>
    <td className="p-4">
      <Inline gap="sm" align="center">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <ListVideo size={20} className="text-orange-600" />
        </div>
        <div>
          <span className="font-medium text-gray-900">{playlist.name}</span>
          {playlist.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{playlist.description}</p>
          )}
        </div>
      </Inline>
    </td>
    <td className="p-4 text-gray-600 text-sm">
      {playlist.items?.[0]?.count || 0} items
    </td>
    <td className="p-4 text-gray-600 text-sm">
      <Inline gap="xs" align="center">
        <Clock size={14} />
        {playlist.default_duration}s default
      </Inline>
    </td>
    <td className="p-4 text-gray-600 text-sm">
      {formatDate(playlist.updated_at)}
    </td>
    <td className="p-4" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <button
          onClick={() => onActionMenuToggle(playlist.id)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MoreVertical size={18} className="text-gray-400" />
        </button>
        {actionMenuId === playlist.id && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
            <button
              onClick={() => {
                onActionMenuToggle(null);
                onNavigate?.(`playlist-editor-${playlist.id}`);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit size={14} />
              Edit
            </button>
            <button
              onClick={() => {
                onActionMenuToggle(null);
                onDuplicate(playlist);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              onClick={() => onDelete(playlist)}
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

// Create Playlist Modal
const CreatePlaylistModal = ({ open, onClose, onSubmit, creating }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_duration: 10,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({ name: '', description: '', default_duration: 10 });
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader>
        <ModalTitle>Create Playlist</ModalTitle>
      </ModalHeader>

      <form onSubmit={handleSubmit} id="create-playlist-form">
        <ModalContent>
          <Stack gap="md">
            <FormField label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter playlist name"
                autoFocus
              />
            </FormField>

            <FormField label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </FormField>

            <FormField
              label="Default Duration (seconds)"
              hint="Default display time for each item in the playlist"
            >
              <Input
                type="number"
                value={form.default_duration}
                onChange={(e) => setForm((prev) => ({ ...prev, default_duration: parseInt(e.target.value) || 10 }))}
                min={1}
                max={3600}
              />
            </FormField>
          </Stack>
        </ModalContent>

        <ModalFooter>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" disabled={creating} loading={creating}>
            Create Playlist
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// Limit Reached Modal
const LimitReachedModal = ({ open, onClose, limits, playlistCount }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalContent className="text-center">
        <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Playlist Limit Reached</h3>
        <p className="text-gray-600 mb-6">
          You've used {formatLimitDisplay(limits?.maxPlaylists, playlistCount)} playlists on your {limits?.planName} plan.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-medium text-gray-900 mb-2">Upgrade to get:</h4>
          <Stack gap="xs">
            <Inline gap="sm" align="center">
              <ListVideo className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">More playlists for your content</span>
            </Inline>
            <Inline gap="sm" align="center">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Higher limits for all resources</span>
            </Inline>
            <Inline gap="sm" align="center">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Priority support</span>
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

// Choice Modal - Blank or Template
const ChoiceModal = ({ open, onClose, onBlank, onTemplate }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>New Playlist</ModalTitle>
      </ModalHeader>

      <ModalContent>
        <p className="text-gray-600 mb-6">How would you like to create your playlist?</p>

        <Stack gap="sm">
          <button
            onClick={onBlank}
            className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FileText size={24} className="text-gray-400 group-hover:text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Blank Playlist</h3>
              <p className="text-sm text-gray-500">Start fresh and add your own content</p>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600" />
          </button>

          <button
            onClick={onTemplate}
            className="w-full p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <LayoutTemplate size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                Start from Template
                <Badge variant="info" size="sm">Recommended</Badge>
              </h3>
              <p className="text-sm text-gray-500">Use a pre-made playlist template</p>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-600" />
          </button>
        </Stack>
      </ModalContent>
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
            <p className="text-gray-600">Checking where this playlist is used...</p>
          </div>
        ) : deleteConfirm.usage?.is_in_use ? (
          <Stack gap="md">
            <Inline gap="sm" align="start">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Playlist In Use</h3>
                <p className="text-gray-600 text-sm mt-1">
                  <strong>"{deleteConfirm.name}"</strong> is currently being used:
                </p>
              </div>
            </Inline>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {deleteConfirm.usage?.screens?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Screens</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.screens.count} screen{deleteConfirm.usage.screens.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
              {deleteConfirm.usage?.layout_zones?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Layouts</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.layout_zones.count} layout zone{deleteConfirm.usage.layout_zones.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
              {deleteConfirm.usage?.schedules?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Schedules</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.schedules.count} schedule{deleteConfirm.usage.schedules.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
              {deleteConfirm.usage?.campaigns?.count > 0 && (
                <Inline justify="between" className="text-sm">
                  <span className="text-gray-600">Campaigns</span>
                  <span className="font-medium text-gray-900">
                    {deleteConfirm.usage.campaigns.count} campaign{deleteConfirm.usage.campaigns.count !== 1 ? 's' : ''}
                  </span>
                </Inline>
              )}
            </div>

            <Alert variant="warning">
              Deleting this playlist will remove it from all screens, layouts, schedules, and campaigns where it's used.
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
                <h3 className="text-lg font-semibold text-gray-900">Delete Playlist?</h3>
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

// Template Picker Modal
const TemplatePickerModal = ({ open, onClose, templates, loading, applyingTemplate, onApply, onBlank }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <Inline gap="sm" align="center">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <LayoutTemplate size={20} className="text-purple-600" />
          </div>
          <div>
            <ModalTitle>Choose a Template</ModalTitle>
            <p className="text-sm text-gray-500">Select a playlist template to get started</p>
          </div>
        </Inline>
      </ModalHeader>

      <ModalContent className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No playlist templates available</p>
            <Button variant="secondary" onClick={onBlank} className="mt-4">
              Create Blank Playlist
            </Button>
          </div>
        ) : (
          <Grid cols={2} gap="md">
            {templates.map((template) => (
              <Card key={template.id} variant="outlined" className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {template.thumbnail ? (
                    <img src={template.thumbnail} alt={template.title} className="w-full h-full object-cover" />
                  ) : (
                    <ListVideo size={40} className="text-gray-300" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-900">{template.title}</h3>
                    <p className="text-xs text-gray-500">{template.category}</p>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.description}</p>
                  <Button
                    size="sm"
                    onClick={() => onApply(template)}
                    disabled={applyingTemplate === template.slug}
                    loading={applyingTemplate === template.slug}
                    className="w-full"
                  >
                    <Sparkles size={14} />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Grid>
        )}
      </ModalContent>

      <ModalFooter>
        <button onClick={onBlank} className="text-sm text-gray-600 hover:text-gray-900">
          or create a blank playlist
        </button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const PlaylistsPage = ({ showToast, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Plan limits state
  const [limits, setLimits] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Template picker state
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingForce, setDeletingForce] = useState(false);

  useEffect(() => {
    fetchPlaylists();
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('playlists')
        .select(`*, items:playlist_items(count)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      showToast?.('Error loading playlists: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(search.toLowerCase())
  );

  const limitReached = limits ? hasReachedLimit(limits.maxPlaylists, playlists.length) : false;

  const handleAddPlaylist = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowChoiceModal(true);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await getPlaylistTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      showToast?.('Error loading templates', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleShowTemplatePicker = () => {
    setShowChoiceModal(false);
    setShowTemplatePicker(true);
    loadTemplates();
  };

  const handleCreateBlank = () => {
    setShowChoiceModal(false);
    setShowTemplatePicker(false);
    setShowCreateModal(true);
  };

  const handleApplyTemplate = async (template) => {
    try {
      setApplyingTemplate(template.slug);
      const result = await applyTemplate(template.slug);

      if (result.playlists && result.playlists.length > 0) {
        showToast?.('Playlist created from template!', 'success');
        setShowTemplatePicker(false);
        fetchPlaylists();
        if (onNavigate && result.playlists[0]?.id) {
          onNavigate(`playlist-editor-${result.playlists[0].id}`);
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      showToast?.(error.message || 'Error applying template', 'error');
    } finally {
      setApplyingTemplate(null);
    }
  };

  const handleCreate = async (form) => {
    if (!form.name.trim()) {
      showToast?.('Please enter a playlist name', 'error');
      return;
    }

    try {
      setCreating(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          owner_id: authUser.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          default_duration: form.default_duration || 10,
        })
        .select()
        .single();

      if (error) throw error;

      setPlaylists((prev) => [data, ...prev]);
      setShowCreateModal(false);
      showToast?.('Playlist created successfully');

      if (onNavigate) {
        onNavigate(`playlist-editor-${data.id}`);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      showToast?.('Error creating playlist: ' + error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (playlist) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: newData, error: createError } = await supabase
        .from('playlists')
        .insert({
          owner_id: authUser.id,
          name: `${playlist.name} (Copy)`,
          description: playlist.description,
          default_duration: playlist.default_duration,
          transition_effect: playlist.transition_effect,
          shuffle: playlist.shuffle,
        })
        .select()
        .single();

      if (createError) throw createError;

      const { data: items } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('position');

      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          playlist_id: newData.id,
          item_type: item.item_type,
          item_id: item.item_id,
          position: item.position,
          duration: item.duration,
        }));

        await supabase.from('playlist_items').insert(itemsToInsert);
      }

      setPlaylists((prev) => [newData, ...prev]);
      showToast?.('Playlist duplicated successfully');
    } catch (error) {
      console.error('Error duplicating playlist:', error);
      showToast?.('Error duplicating playlist: ' + error.message, 'error');
    }
  };

  const handleDelete = async (playlist) => {
    setDeleteConfirm({ id: playlist.id, name: playlist.name, usage: null, loading: true });
    setActionMenuId(null);

    try {
      const usage = await getPlaylistUsage(playlist.id);
      setDeleteConfirm({ id: playlist.id, name: playlist.name, usage, loading: false });
    } catch (error) {
      console.error('Error checking usage:', error);
      setDeleteConfirm({ id: playlist.id, name: playlist.name, usage: null, loading: false });
    }
  };

  const confirmDelete = async (force = false) => {
    if (!deleteConfirm) return;

    setDeletingForce(true);
    try {
      const result = await deletePlaylistSafely(deleteConfirm.id, { force });

      if (result.success) {
        setPlaylists((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        showToast?.('Playlist deleted successfully');
        setDeleteConfirm(null);
      } else if (result.code === 'IN_USE' && !force) {
        setDeleteConfirm((prev) => ({ ...prev, usage: result.usage }));
      } else {
        showToast?.(result.error || 'Error deleting playlist', 'error');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      showToast?.('Error deleting playlist: ' + error.message, 'error');
    } finally {
      setDeletingForce(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('playlists.title', 'Playlists')}
        description={`${playlists.length} ${playlists.length !== 1 ? t('playlists.playlists', 'playlists') : t('playlists.playlist', 'playlist')}`}
        actions={
          <Button onClick={handleAddPlaylist}>
            <Plus size={18} />
            {t('playlists.addPlaylist', 'Add Playlist')}
          </Button>
        }
      />

      <PageContent>
        <Stack gap="lg">
          {/* Limit Warning Banner */}
          {limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search playlists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : playlists.length === 0 ? (
            <EmptyState
              icon={<ListVideo size={48} className="text-orange-300" />}
              title="No Playlists Yet"
              description="Playlists let you sequence your media, apps, and layouts to play on your screens. Create your first playlist to get started."
              action={
                <Button onClick={handleAddPlaylist}>
                  <Plus size={18} />
                  Add Playlist
                </Button>
              }
            />
          ) : (
            <Card variant="outlined">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="p-4 w-8">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </th>
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Items</th>
                      <th className="p-4 font-medium">Duration</th>
                      <th className="p-4 font-medium">Modified</th>
                      <th className="p-4 font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlaylists.map((playlist) => (
                      <PlaylistRow
                        key={playlist.id}
                        playlist={playlist}
                        onNavigate={onNavigate}
                        actionMenuId={actionMenuId}
                        onActionMenuToggle={setActionMenuId}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Footer Actions */}
          {playlists.length > 0 && (
            <Inline gap="sm">
              <Button onClick={handleAddPlaylist}>
                <Plus size={18} />
                Add Playlist
              </Button>
              <Button variant="ghost">Actions</Button>
            </Inline>
          )}
        </Stack>
      </PageContent>

      {/* Modals */}
      <CreatePlaylistModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        creating={creating}
      />

      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limits={limits}
        playlistCount={playlists.length}
      />

      <ChoiceModal
        open={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onBlank={handleCreateBlank}
        onTemplate={handleShowTemplatePicker}
      />

      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        deleting={deletingForce}
      />

      <TemplatePickerModal
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        templates={templates}
        loading={templatesLoading}
        applyingTemplate={applyingTemplate}
        onApply={handleApplyTemplate}
        onBlank={handleCreateBlank}
      />
    </PageLayout>
  );
};

export default PlaylistsPage;
