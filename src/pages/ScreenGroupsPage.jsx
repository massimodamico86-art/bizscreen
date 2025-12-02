import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  X,
  Monitor,
  Users,
  MapPin,
  Check,
  ChevronRight,
  Layers
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  EmptyState
} from '../design-system';
import {
  fetchScreenGroups,
  getScreenGroup,
  createScreenGroup,
  updateScreenGroup,
  deleteScreenGroup,
  getScreensInGroup,
  getUnassignedScreens,
  assignScreensToGroup,
  removeScreensFromGroup
} from '../services/screenGroupService';
import { fetchLocations } from '../services/locationService';
import { canEditScreens } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';

const ScreenGroupsPage = ({ showToast }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  // Menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Permissions
  const canEdit = canEditScreens(user);

  useEffect(() => {
    loadData();
  }, [locationFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, locationsData] = await Promise.all([
        fetchScreenGroups({ locationId: locationFilter || null, search }),
        fetchLocations()
      ]);
      setGroups(groupsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading screen groups:', error);
      showToast?.('Error loading screen groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this screen group? Screens will be unassigned but not deleted.')) return;

    try {
      await deleteScreenGroup(id);
      setGroups(groups.filter(g => g.id !== id));
      showToast?.('Screen group deleted');
    } catch (error) {
      console.error('Error deleting group:', error);
      showToast?.('Error deleting group: ' + error.message, 'error');
    }
    setOpenMenuId(null);
  };

  const openEditModal = async (group) => {
    setSelectedGroup(group);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const openAssignModal = async (group) => {
    setSelectedGroup(group);
    setShowAssignModal(true);
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader
        title={t('screenGroups.title', 'Screen Groups')}
        description={t('screenGroups.description', 'Organize screens into groups for bulk management and campaigns')}
        actions={canEdit && (
          <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={18} aria-hidden="true" />}>
            {t('screenGroups.newGroup', 'New Group')}
          </Button>
        )}
      />

      <PageContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('screenGroups.searchPlaceholder', 'Search groups...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('screenGroups.searchGroups', 'Search groups')}
            />
          </div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label={t('screenGroups.filterByLocation', 'Filter by location')}
          >
            <option value="">{t('screenGroups.allLocations', 'All Locations')}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64" role="status" aria-label={t('common.loading', 'Loading')}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={t('screenGroups.noGroups', 'No Screen Groups')}
            description={t('screenGroups.noGroupsDesc', 'Create groups to organize your screens by purpose, location, or any criteria. Groups make it easy to assign content to multiple screens at once.')}
            action={canEdit && {
              label: t('screenGroups.createFirstGroup', 'Create First Group'),
              onClick: () => setShowCreateModal(true),
              icon: <Plus size={18} aria-hidden="true" />
            }}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('screenGroups.tableLabel', 'Screen groups table')}>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th scope="col" className="p-4 font-medium">{t('screenGroups.name', 'NAME')}</th>
                    <th scope="col" className="p-4 font-medium">{t('screenGroups.location', 'LOCATION')}</th>
                    <th scope="col" className="p-4 font-medium">{t('screenGroups.screens', 'SCREENS')}</th>
                    <th scope="col" className="p-4 font-medium">{t('screenGroups.descriptionCol', 'DESCRIPTION')}</th>
                    <th scope="col" className="p-4 font-medium w-20">{t('common.actions', 'ACTIONS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(group => (
                    <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
                            <Users size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{group.name}</span>
                            {group.tags?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {group.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {group.location_name ? (
                          <span className="inline-flex items-center gap-1.5 text-gray-600">
                            <MapPin size={14} aria-hidden="true" />
                            {group.location_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('screenGroups.allLocations', 'All locations')}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openAssignModal(group)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={t('screenGroups.manageScreensFor', 'Manage screens for {{name}}', { name: group.name })}
                        >
                          <Monitor size={14} aria-hidden="true" />
                          <span className="font-medium">{group.screen_count || 0}</span>
                          <span className="text-gray-500">{t('screenGroups.screensLabel', 'screens')}</span>
                          {group.online_count > 0 && (
                            <span className="text-green-600 text-xs">({t('screenGroups.onlineCount', '{{count}} online', { count: group.online_count })})</span>
                          )}
                          <ChevronRight size={14} className="text-gray-400" aria-hidden="true" />
                        </button>
                      </td>
                      <td className="p-4 text-gray-600 text-sm max-w-xs truncate">
                        {group.description || '-'}
                      </td>
                      <td className="p-4 relative">
                        {canEdit && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === group.id ? null : group.id);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === group.id}
                              aria-label={t('common.moreActions', 'More actions')}
                            >
                              <MoreVertical size={18} className="text-gray-400" aria-hidden="true" />
                            </button>

                            {openMenuId === group.id && (
                              <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]" role="menu">
                                <button
                                  onClick={() => openEditModal(group)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  role="menuitem"
                                >
                                  <Edit size={14} aria-hidden="true" />
                                  {t('common.edit', 'Edit')}
                                </button>
                                <button
                                  onClick={() => openAssignModal(group)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  role="menuitem"
                                >
                                  <Monitor size={14} aria-hidden="true" />
                                  {t('screenGroups.manageScreens', 'Manage Screens')}
                                </button>
                                <button
                                  onClick={() => handleDelete(group.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  role="menuitem"
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                  {t('common.delete', 'Delete')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <GroupFormModal
            locations={locations}
            onClose={() => setShowCreateModal(false)}
            onSave={async (data) => {
              setSaving(true);
              try {
                const newGroup = await createScreenGroup(data);
                setGroups([newGroup, ...groups]);
                showToast?.(t('screenGroups.created', 'Screen group created'));
                setShowCreateModal(false);
                loadData(); // Refresh to get counts
              } catch (error) {
                console.error('Error creating group:', error);
                showToast?.(t('screenGroups.createError', 'Error creating group: {{error}}', { error: error.message }), 'error');
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
            t={t}
          />
        )}

        {/* Edit Modal */}
        {showEditModal && selectedGroup && (
          <GroupFormModal
            group={selectedGroup}
            locations={locations}
            onClose={() => {
              setShowEditModal(false);
              setSelectedGroup(null);
            }}
            onSave={async (data) => {
              setSaving(true);
              try {
                await updateScreenGroup(selectedGroup.id, data);
                showToast?.(t('screenGroups.updated', 'Screen group updated'));
                setShowEditModal(false);
                setSelectedGroup(null);
                loadData();
              } catch (error) {
                console.error('Error updating group:', error);
                showToast?.(t('screenGroups.updateError', 'Error updating group: {{error}}', { error: error.message }), 'error');
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
            t={t}
          />
        )}

        {/* Assign Screens Modal */}
        {showAssignModal && selectedGroup && (
          <AssignScreensModal
            group={selectedGroup}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedGroup(null);
            }}
            onUpdate={() => {
              loadData();
            }}
            showToast={showToast}
            t={t}
          />
        )}
      </PageContent>
    </PageLayout>
  );
};

// Group Form Modal
function GroupFormModal({ group, locations, onClose, onSave, saving, t }) {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [locationId, setLocationId] = useState(group?.location_id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      locationId: locationId || null
    });
  };

  return (
    <Modal open={true} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>
          {group ? t('screenGroups.editGroup', 'Edit Screen Group') : t('screenGroups.createGroup', 'Create Screen Group')}
        </ModalTitle>
      </ModalHeader>
      <ModalContent>
        <form id="group-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenGroups.groupName', 'Group Name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('screenGroups.namePlaceholder', 'e.g., All Lobby Screens')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenGroups.locationOptional', 'Location (Optional)')}
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('screenGroups.crossLocation', 'Cross-location (any)')}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('screenGroups.locationHint', 'Link to a specific location, or leave empty for a group spanning all locations')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenGroups.descriptionOptional', 'Description (Optional)')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('screenGroups.descriptionPlaceholder', 'What is this group for?')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>
      </ModalContent>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button type="submit" form="group-form" loading={saving} disabled={!name.trim()}>
          {group ? t('screenGroups.updateGroup', 'Update Group') : t('screenGroups.createGroupBtn', 'Create Group')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Assign Screens Modal
function AssignScreensModal({ group, onClose, onUpdate, showToast, t }) {
  const [assignedScreens, setAssignedScreens] = useState([]);
  const [availableScreens, setAvailableScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);

  useEffect(() => {
    loadScreens();
  }, [group.id]);

  const loadScreens = async () => {
    try {
      setLoading(true);
      const [assigned, available] = await Promise.all([
        getScreensInGroup(group.id),
        getUnassignedScreens(group.id, group.location_id)
      ]);
      setAssignedScreens(assigned);
      setAvailableScreens(available);
    } catch (error) {
      console.error('Error loading screens:', error);
      showToast?.(t('screenGroups.loadError', 'Error loading screens'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddScreens = async () => {
    if (selectedToAdd.length === 0) return;

    setSaving(true);
    try {
      await assignScreensToGroup(group.id, selectedToAdd);
      showToast?.(t('screenGroups.addedScreens', 'Added {{count}} screen(s) to group', { count: selectedToAdd.length }));
      setSelectedToAdd([]);
      loadScreens();
      onUpdate();
    } catch (error) {
      console.error('Error adding screens:', error);
      showToast?.(t('screenGroups.addError', 'Error adding screens: {{error}}', { error: error.message }), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveScreens = async () => {
    if (selectedToRemove.length === 0) return;

    setSaving(true);
    try {
      await removeScreensFromGroup(selectedToRemove);
      showToast?.(t('screenGroups.removedScreens', 'Removed {{count}} screen(s) from group', { count: selectedToRemove.length }));
      setSelectedToRemove([]);
      loadScreens();
      onUpdate();
    } catch (error) {
      console.error('Error removing screens:', error);
      showToast?.(t('screenGroups.removeError', 'Error removing screens: {{error}}', { error: error.message }), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAddSelection = (id) => {
    setSelectedToAdd(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleRemoveSelection = (id) => {
    setSelectedToRemove(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{t('screenGroups.manageScreensIn', 'Manage Screens in "{{name}}"', { name: group.name })}</ModalTitle>
        <p className="text-sm text-gray-500 mt-1">{t('screenGroups.addRemoveScreens', 'Add or remove screens from this group')}</p>
      </ModalHeader>
      <ModalContent>
        {loading ? (
          <div className="flex items-center justify-center h-64" role="status" aria-label={t('common.loading', 'Loading')}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
          </div>
        ) : (
          <div className="flex gap-4 min-h-[300px]">
            {/* Assigned Screens */}
            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-green-50 p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-green-600" aria-hidden="true" />
                  <span className="font-medium">{t('screenGroups.inGroup', 'In Group ({{count}})', { count: assignedScreens.length })}</span>
                </div>
                {selectedToRemove.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleRemoveScreens}
                    loading={saving}
                  >
                    {t('screenGroups.removeCount', 'Remove {{count}}', { count: selectedToRemove.length })}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2" role="list" aria-label={t('screenGroups.assignedScreens', 'Assigned screens')}>
                {assignedScreens.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('screenGroups.noScreensInGroup', 'No screens in this group')}</p>
                ) : (
                  assignedScreens.map(screen => (
                    <label
                      key={screen.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      role="listitem"
                    >
                      <input
                        type="checkbox"
                        checked={selectedToRemove.includes(screen.id)}
                        onChange={() => toggleRemoveSelection(screen.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={t('screenGroups.selectToRemove', 'Select {{name}} to remove', { name: screen.name })}
                      />
                      <Monitor size={16} className={screen.is_online ? 'text-green-500' : 'text-gray-400'} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{screen.name}</p>
                        {screen.location?.name && (
                          <p className="text-xs text-gray-500">{screen.location.name}</p>
                        )}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        screen.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {screen.is_online ? t('common.online', 'Online') : t('common.offline', 'Offline')}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Available Screens */}
            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={18} className="text-gray-600" aria-hidden="true" />
                  <span className="font-medium">{t('screenGroups.available', 'Available ({{count}})', { count: availableScreens.length })}</span>
                </div>
                {selectedToAdd.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAddScreens}
                    loading={saving}
                  >
                    {t('screenGroups.addCount', 'Add {{count}}', { count: selectedToAdd.length })}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2" role="list" aria-label={t('screenGroups.availableScreens', 'Available screens')}>
                {availableScreens.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('screenGroups.noAvailableScreens', 'No available screens')}</p>
                ) : (
                  availableScreens.map(screen => (
                    <label
                      key={screen.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      role="listitem"
                    >
                      <input
                        type="checkbox"
                        checked={selectedToAdd.includes(screen.id)}
                        onChange={() => toggleAddSelection(screen.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={t('screenGroups.selectToAdd', 'Select {{name}} to add', { name: screen.name })}
                      />
                      <Monitor size={16} className={screen.is_online ? 'text-green-500' : 'text-gray-400'} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{screen.name}</p>
                        {screen.location?.name && (
                          <p className="text-xs text-gray-500">{screen.location.name}</p>
                        )}
                      </div>
                      {screen.screen_group_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {t('screenGroups.inAnotherGroup', 'In another group')}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.done', 'Done')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ScreenGroupsPage;
