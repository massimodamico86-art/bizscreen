import { useState, useEffect } from 'react';


import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { formatDate } from '../utils/formatters';
import { getEffectiveLimits, hasReachedLimit, formatLimitDisplay } from '../services/limitsService';
import { getPlaylistTemplates, applyTemplate } from '../services/templateService';
import { getPlaylistUsage, deletePlaylistSafely } from '../services/playlistService';

// Design system imports


import { useLogger } from '../hooks/useLogger.js';
import { useResponsiveColumns } from '../components/tables';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => {
  // Guard against null limits
  if (!limits) return null;

  const maxPlaylists = limits.maxPlaylists ?? 0;
  const planName = limits.planName || 'current';

  return (
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
      You've reached the maximum of {maxPlaylists} playlist{maxPlaylists !== 1 ? 's' : ''} for your {planName} plan.
    </Banner>
  );
};

// Playlist table row
const PlaylistRow = ({ playlist, onNavigate, isSelected, onSelect, showSecondary = true }) => {
  // Guard against null playlist
  if (!playlist) return null;

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
      onClick={() => onNavigate?.(`playlist-editor-${playlist.id}`)}
    >
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect?.(playlist.id, e.target.checked)}
          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
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
      {showSecondary && (
        <td className="p-4 text-gray-600 text-sm">
          <Inline gap="xs" align="center">
            <Clock size={14} />
            {playlist.default_duration}s default
          </Inline>
        </td>
      )}
      {showSecondary && (
        <td className="p-4 text-gray-600 text-sm">
          {formatDate(playlist.updated_at)}
        </td>
      )}
    </tr>
  );
};

// Create Playlist Modal
const CreatePlaylistModal = ({ open, onClose, onSubmit, creating }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_duration: 10,
  });
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError('Please enter a playlist name');
      return;
    }
    setNameError('');
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({ name: '', description: '', default_duration: 10 });
    setNameError('');
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
            <FormField label="Name" required error={nameError}>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  if (nameError) setNameError('');
                }}
                placeholder="Enter playlist name"
                autoFocus
                error={!!nameError}
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

// Choice Modal - Blank or Template (legacy)
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

// Set to Screen Modal - Simplified
const SetToScreenModal = ({ open, onClose, playlist, screens, screensLoading, onSetToScreen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreens, setSelectedScreens] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedScreens([]);
    }
  }, [open]);

  const filteredScreens = screens?.filter(screen =>
    screen.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSubmit = async () => {
    if (selectedScreens.length === 0) return;
    setAssigning(true);
    try {
      await onSetToScreen?.(playlist, selectedScreens, 'content');
      onClose();
    } finally {
      setAssigning(false);
    }
  };

  const toggleScreen = (screenId) => {
    setSelectedScreens(prev =>
      prev.includes(screenId)
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const toggleAll = () => {
    if (selectedScreens.length === filteredScreens.length) {
      setSelectedScreens([]);
    } else {
      setSelectedScreens(filteredScreens.map(s => s.id));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Set to Screen</h2>
            {playlist && (
              <p className="text-sm text-gray-500 mt-0.5">Assign "{playlist.name}" to screens</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Search */}
          {screens?.length > 5 && (
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search screens..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          )}

          {/* Screen list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {screensLoading ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading screens...</p>
              </div>
            ) : screens?.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Monitor size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No screens found</p>
                <p className="text-xs text-gray-400 mt-1">Add screens first to assign playlists</p>
              </div>
            ) : filteredScreens.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No screens match your search
              </div>
            ) : (
              <>
                {/* Select all header */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScreens.length === filteredScreens.length && filteredScreens.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {selectedScreens.length === filteredScreens.length ? 'Deselect all' : 'Select all'}
                    </span>
                  </label>
                  <span className="text-xs text-gray-400">
                    {filteredScreens.length} screen{filteredScreens.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Screen list */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredScreens.map(screen => (
                    <label
                      key={screen.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                        selectedScreens.includes(screen.id) ? 'bg-orange-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScreens.includes(screen.id)}
                        onChange={() => toggleScreen(screen.id)}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      />
                      <Monitor size={18} className={selectedScreens.includes(screen.id) ? 'text-orange-500' : 'text-gray-400'} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">{screen.name}</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-500">
            {selectedScreens.length > 0 && `${selectedScreens.length} selected`}
          </span>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={selectedScreens.length === 0 || assigning}
              loading={assigning}
            >
              <Monitor size={14} />
              Set to Screen{selectedScreens.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const PlaylistsPage = ({ showToast, onNavigate }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const logger = useLogger('PlaylistsPage');
  const { showSecondary } = useResponsiveColumns();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Set to Screen modal state
  const [showSetToScreenModal, setShowSetToScreenModal] = useState(false);
  const [setToScreenPlaylist, setSetToScreenPlaylist] = useState(null);
  const [screens, setScreens] = useState([]);
  const [screensLoading, setScreensLoading] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchPlaylists();
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      logger.error('Failed to fetch limits', { userId: user?.id, error });
    }
  };

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('playlists')
        .select(`*, items:playlist_items(count)`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPlaylists(data || []);
    } catch (err) {
      logger.error('Failed to fetch playlists', { userId: user?.id, error: err });
      setError(err.message || 'Failed to load playlists');
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
      setShowCreateModal(true);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await getPlaylistTemplates();
      setTemplates(data);
    } catch (error) {
      logger.error('Failed to load templates', { error });
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
      logger.error('Failed to apply template', { templateId: selectedTemplate.id, playlistId: newPlaylist.id, error });
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
      logger.error('Failed to create playlist', { playlistName: newPlaylistName, error });
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
      logger.error('Failed to duplicate playlist', { playlistId, error });
      showToast?.('Error duplicating playlist: ' + error.message, 'error');
    }
  };

  const handleDelete = async (playlist) => {
    setDeleteConfirm({ id: playlist.id, name: playlist.name, usage: null, loading: true });

    try {
      const usage = await getPlaylistUsage(playlist.id);
      setDeleteConfirm({ id: playlist.id, name: playlist.name, usage, loading: false });
    } catch (error) {
      logger.error('Failed to check usage', { playlistId, error });
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
      logger.error('Failed to delete playlist', { playlistId, error });
      showToast?.('Error deleting playlist: ' + error.message, 'error');
    } finally {
      setDeletingForce(false);
    }
  };

  // Fetch screens for Set to Screen modal
  const fetchScreens = async () => {
    try {
      setScreensLoading(true);
      const { data, error } = await supabase
        .from('tv_devices')
        .select('id, device_name, last_seen_at')
        .order('device_name');

      if (error) throw error;

      // Calculate online status based on last_seen_at (within 5 minutes)
      const now = new Date();
      setScreens((data || []).map(s => {
        const lastSeenAt = s.last_seen_at ? new Date(s.last_seen_at) : null;
        const isOnline = lastSeenAt && (now - lastSeenAt) < 5 * 60 * 1000;
        return {
          id: s.id,
          name: s.device_name,
          status: isOnline ? 'online' : 'offline'
        };
      }));
    } catch (error) {
      logger.error('Failed to fetch screens', { error });
    } finally {
      setScreensLoading(false);
    }
  };

  // Handle Set to Screen menu action
  const handleSetToScreenClick = (playlist) => {
    setSetToScreenPlaylist(playlist);
    setShowSetToScreenModal(true);
    fetchScreens();
  };

  // Handle assigning playlist to screens
  const handleSetToScreen = async (playlist, screenIds) => {
    try {
      // Update each selected screen with this playlist
      const updates = screenIds.map(screenId =>
        supabase
          .from('tv_devices')
          .update({ assigned_playlist_id: playlist.id })
          .eq('id', screenId)
      );

      await Promise.all(updates);
      showToast?.(`Playlist assigned to ${screenIds.length} screen${screenIds.length > 1 ? 's' : ''}`, 'success');
    } catch (error) {
      logger.error('Failed to set playlist to screen', { playlistId, screenId, error });
      showToast?.('Error assigning playlist to screen', 'error');
    }
  };

  // Handle Item Details menu action
  const handleItemDetails = (playlist) => {
    // Navigate to playlist editor for now
    onNavigate?.(`playlist-editor-${playlist.id}`);
  };

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredPlaylists.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, checked) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const isAllSelected = filteredPlaylists.length > 0 && filteredPlaylists.every(p => selectedIds.has(p.id));
  const isSomeSelected = selectedIds.size > 0;

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.size} playlist${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        deletePlaylistSafely(id, { force: true })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        setPlaylists(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
        showToast?.(`Deleted ${successCount} playlist${successCount > 1 ? 's' : ''} successfully`);
      }

      const failCount = results.filter(r => !r.success).length;
      if (failCount > 0) {
        showToast?.(`Failed to delete ${failCount} playlist${failCount > 1 ? 's' : ''}`, 'error');
      }
    } catch (error) {
      logger.error('Failed to bulk delete', { count: selectedIds.length, error });
      showToast?.('Error deleting playlists', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Bulk duplicate handler
  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return;

    try {
      const selectedPlaylists = playlists.filter(p => selectedIds.has(p.id));
      for (const playlist of selectedPlaylists) {
        await handleDuplicate(playlist);
      }
      setSelectedIds(new Set());
      showToast?.(`Duplicated ${selectedIds.size} playlist${selectedIds.size > 1 ? 's' : ''} successfully`);
    } catch (error) {
      logger.error('Failed to bulk duplicate', { count: selectedIds.length, error });
      showToast?.('Error duplicating playlists', 'error');
    }
  };

  // Bulk set to screen handler
  const handleBulkSetToScreen = () => {
    if (selectedIds.size === 0) return;
    // For bulk set to screen, we'll use the first selected playlist
    // and open the modal - user can then select screens
    const firstSelectedId = Array.from(selectedIds)[0];
    const playlist = playlists.find(p => p.id === firstSelectedId);
    if (playlist) {
      handleSetToScreenClick(playlist);
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
          ) : error ? (
            <Card variant="outlined" className="p-8">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load playlists</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={fetchPlaylists} variant="outline">
                  <RefreshCw size={16} />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : playlists.length === 0 ? (
            /* Yodeck-style empty state */
            <div className="flex flex-col items-center justify-center py-16">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">You don't have any Playlists.</h2>

              {/* Film strip illustration */}
              <div className="relative mb-8">
                <div className="w-64 h-40 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  {/* Film strip frame */}
                  <div className="absolute top-0 left-0 right-0 h-6 bg-gray-200 flex items-center gap-1 px-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-4 h-3 bg-gray-300 rounded-sm" />
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-200 flex items-center gap-1 px-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-4 h-3 bg-gray-300 rounded-sm" />
                    ))}
                  </div>
                  {/* Film frames */}
                  <div className="flex gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-10 h-14 rounded border ${i === 0 ? 'bg-red-100 border-red-300' : 'bg-white border-gray-300'}`}>
                        {i === 0 && <div className="w-full h-full flex items-center justify-center"><ListVideo size={16} className="text-red-400" /></div>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Pointing hand */}
                <div className="absolute -bottom-4 left-12 text-orange-400">
                  <MousePointer size={24} className="transform -rotate-12" />
                </div>
              </div>

              <p className="text-gray-600 text-center max-w-md mb-6">
                <strong>Playlists</strong> are sequences of media, apps or layouts, looping constantly on your screen, like a slideshow. Add one and start creating!
              </p>

              <Button onClick={handleAddPlaylist} className="bg-orange-500 hover:bg-orange-600">
                Add Playlist
              </Button>

              <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <HelpCircle size={14} />
                Do you want to view the Playlists tour?
              </button>
            </div>
          ) : (
            <>
              {/* Bulk Action Bar */}
              {isSomeSelected && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-orange-800 font-medium">
                    {selectedIds.size} playlist{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <Inline gap="sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleBulkDuplicate}
                    >
                      <Copy size={14} />
                      Duplicate
                    </Button>
                    {selectedIds.size === 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleBulkSetToScreen}
                      >
                        <Monitor size={14} />
                        Set to Screen
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      loading={bulkDeleting}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </Inline>
                </div>
              )}

              <Card variant="outlined">
                <ResponsiveTable>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                        <th className="p-4 w-8">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                          />
                        </th>
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Items</th>
                        {showSecondary && <th className="p-4 font-medium">Duration</th>}
                        {showSecondary && <th className="p-4 font-medium">Modified</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlaylists.map((playlist) => (
                        <PlaylistRow
                          key={playlist.id}
                          playlist={playlist}
                          onNavigate={onNavigate}
                          isSelected={selectedIds.has(playlist.id)}
                          onSelect={handleSelectOne}
                          showSecondary={showSecondary}
                        />
                      ))}
                    </tbody>
                  </table>
                </ResponsiveTable>
              </Card>
            </>
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

      <SetToScreenModal
        open={showSetToScreenModal}
        onClose={() => {
          setShowSetToScreenModal(false);
          setSetToScreenPlaylist(null);
        }}
        playlist={setToScreenPlaylist}
        screens={screens}
        screensLoading={screensLoading}
        onSetToScreen={handleSetToScreen}
      />
    </PageLayout>
  );
};

export default PlaylistsPage;
