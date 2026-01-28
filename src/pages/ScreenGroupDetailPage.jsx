/**
 * ScreenGroupDetailPage
 *
 * Detail view for a screen group showing:
 * - Group information and stats
 * - Devices tab with screen management
 * - Settings tab for language configuration
 */

import { useState, useEffect } from 'react';
import {
  Monitor,
  Settings,
} from 'lucide-react';
import { useTranslation } from '../i18n';


import {
  getScreenGroup,
  getScreensInGroup,
  getUnassignedScreens,
  assignScreensToGroup,
  removeScreensFromGroup,
} from '../services/screenGroupService';

/**
 * ScreenGroupDetailPage
 *
 * @param {Object} props
 * @param {string} props.groupId - The screen group ID
 * @param {Function} props.onNavigate - Navigation callback
 * @param {Function} props.showToast - Toast notification function
 */
export default function ScreenGroupDetailPage({ groupId, onNavigate, showToast }) {
  const { t } = useTranslation();

  // Core state
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('devices');

  // Devices tab state
  const [assignedScreens, setAssignedScreens] = useState([]);
  const [availableScreens, setAvailableScreens] = useState([]);
  const [loadingScreens, setLoadingScreens] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [saving, setSaving] = useState(false);

  // Tab configuration
  const tabs = [
    { id: 'devices', label: t('screenGroups.devices', 'Devices'), icon: Monitor },
    { id: 'settings', label: t('common.settings', 'Settings'), icon: Settings },
  ];

  // Load group data
  useEffect(() => {
    if (groupId) {
      loadGroup();
    }
  }, [groupId]);

  // Load screens when devices tab is active
  useEffect(() => {
    if (group && activeTab === 'devices') {
      loadScreens();
    }
  }, [group?.id, activeTab]);

  async function loadGroup() {
    setLoading(true);
    setError(null);
    try {
      const groupData = await getScreenGroup(groupId);
      setGroup(groupData);
    } catch (err) {
      console.error('Error loading group:', err);
      setError('Failed to load screen group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadScreens() {
    if (!group) return;
    setLoadingScreens(true);
    try {
      const [assigned, available] = await Promise.all([
        getScreensInGroup(group.id),
        getUnassignedScreens(group.id, group.location_id),
      ]);
      setAssignedScreens(assigned);
      setAvailableScreens(available);
      setSelectedToAdd([]);
      setSelectedToRemove([]);
    } catch (err) {
      console.error('Error loading screens:', err);
      showToast?.('Error loading screens', 'error');
    } finally {
      setLoadingScreens(false);
    }
  }

  function handleBack() {
    onNavigate?.('screen-groups');
  }

  async function handleAddScreens() {
    if (selectedToAdd.length === 0) return;

    setSaving(true);
    try {
      await assignScreensToGroup(group.id, selectedToAdd);
      showToast?.(
        t('screenGroups.addedScreens', 'Added {{count}} screen(s) to group', {
          count: selectedToAdd.length,
        }),
        'success'
      );
      loadScreens();
    } catch (err) {
      console.error('Error adding screens:', err);
      showToast?.(err.message || 'Error adding screens', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveScreens() {
    if (selectedToRemove.length === 0) return;

    setSaving(true);
    try {
      await removeScreensFromGroup(selectedToRemove);
      showToast?.(
        t('screenGroups.removedScreens', 'Removed {{count}} screen(s) from group', {
          count: selectedToRemove.length,
        }),
        'success'
      );
      loadScreens();
    } catch (err) {
      console.error('Error removing screens:', err);
      showToast?.(err.message || 'Error removing screens', 'error');
    } finally {
      setSaving(false);
    }
  }

  function toggleAddSelection(id) {
    setSelectedToAdd((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleRemoveSelection(id) {
    setSelectedToRemove((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <PageLayout>
        <div className="text-center py-32">
          <p className="text-red-600 mb-4">{error || 'Screen group not found'}</p>
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('screenGroups.backToGroups', 'Back to Screen Groups')}
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('screenGroups.backToGroups', 'Back to Screen Groups')}
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Group icon */}
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600" />
            </div>

            {/* Name and info */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">{group.name}</h1>
              <div className="flex items-center gap-3">
                {group.location?.name && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {group.location.name}
                  </Badge>
                )}
                <Badge variant={assignedScreens.length > 0 ? 'success' : 'default'}>
                  {assignedScreens.length} {t('screenGroups.screens', 'screen(s)')}
                </Badge>
                {group.active_scene_id && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    {t('screenGroups.hasActiveScene', 'Active Scene')}
                  </Badge>
                )}
              </div>
              {group.description && (
                <p className="text-sm text-gray-500 mt-2">{group.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Tab Content */}
      <PageContent>
        {activeTab === 'devices' && (
          <DevicesTabContent
            assignedScreens={assignedScreens}
            availableScreens={availableScreens}
            loadingScreens={loadingScreens}
            selectedToAdd={selectedToAdd}
            selectedToRemove={selectedToRemove}
            toggleAddSelection={toggleAddSelection}
            toggleRemoveSelection={toggleRemoveSelection}
            handleAddScreens={handleAddScreens}
            handleRemoveScreens={handleRemoveScreens}
            saving={saving}
            t={t}
          />
        )}

        {activeTab === 'settings' && (
          <ScreenGroupSettingsTab
            group={group}
            onUpdate={loadGroup}
            showToast={showToast}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}

/**
 * Devices Tab Content - Screen assignment UI
 */
function DevicesTabContent({
  assignedScreens,
  availableScreens,
  loadingScreens,
  selectedToAdd,
  selectedToRemove,
  toggleAddSelection,
  toggleRemoveSelection,
  handleAddScreens,
  handleRemoveScreens,
  saving,
  t,
}) {
  if (loadingScreens) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Assigned Screens */}
      <Card className="flex-1 flex flex-col">
        <div className="bg-green-50 p-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium">
              {t('screenGroups.inGroup', 'In Group ({{count}})', {
                count: assignedScreens.length,
              })}
            </span>
          </div>
          {selectedToRemove.length > 0 && (
            <Button size="sm" variant="secondary" onClick={handleRemoveScreens} loading={saving}>
              {t('screenGroups.removeCount', 'Remove {{count}}', {
                count: selectedToRemove.length,
              })}
            </Button>
          )}
        </div>
        <CardContent className="flex-1 overflow-y-auto p-2">
          {assignedScreens.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title={t('screenGroups.noScreensInGroup', 'No screens in this group')}
              description={t(
                'screenGroups.addScreensHint',
                'Add screens from the available list on the right'
              )}
            />
          ) : (
            <div className="space-y-1">
              {assignedScreens.map((screen) => (
                <ScreenItem
                  key={screen.id}
                  screen={screen}
                  selected={selectedToRemove.includes(screen.id)}
                  onToggle={() => toggleRemoveSelection(screen.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Screens */}
      <Card className="flex-1 flex flex-col">
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-600" />
            <span className="font-medium">
              {t('screenGroups.available', 'Available ({{count}})', {
                count: availableScreens.length,
              })}
            </span>
          </div>
          {selectedToAdd.length > 0 && (
            <Button size="sm" onClick={handleAddScreens} loading={saving}>
              {t('screenGroups.addCount', 'Add {{count}}', {
                count: selectedToAdd.length,
              })}
            </Button>
          )}
        </div>
        <CardContent className="flex-1 overflow-y-auto p-2">
          {availableScreens.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title={t('screenGroups.noAvailableScreens', 'No available screens')}
              description={t(
                'screenGroups.allScreensAssigned',
                'All screens are already assigned to groups'
              )}
            />
          ) : (
            <div className="space-y-1">
              {availableScreens.map((screen) => (
                <ScreenItem
                  key={screen.id}
                  screen={screen}
                  selected={selectedToAdd.includes(screen.id)}
                  onToggle={() => toggleAddSelection(screen.id)}
                  showGroupBadge={!!screen.screen_group_id}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Screen Item - Individual screen row in the lists
 */
function ScreenItem({ screen, selected, onToggle, showGroupBadge = false, t }) {
  return (
    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <Monitor
        className={`w-4 h-4 ${screen.is_online ? 'text-green-500' : 'text-gray-400'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{screen.name}</p>
        {screen.location?.name && (
          <p className="text-xs text-gray-500">{screen.location.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showGroupBadge && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
            {t('screenGroups.inAnotherGroup', 'In another group')}
          </span>
        )}
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            screen.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {screen.is_online ? t('common.online', 'Online') : t('common.offline', 'Offline')}
        </span>
      </div>
    </label>
  );
}
