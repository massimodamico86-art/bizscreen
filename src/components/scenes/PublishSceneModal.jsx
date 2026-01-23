/**
 * PublishSceneModal
 *
 * Modal for publishing a Scene to one or more TV devices or screen groups.
 * Shows tabs for individual screens and screen groups selection.
 */

import { useState, useEffect } from 'react';
import {
  Tv,
  Monitor,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
  Users,
  Play,
} from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
} from '../../design-system';
import { Button } from '../../design-system';
import { fetchDevicesForTenant, setSceneOnDevices } from '../../services/sceneService';
import {
  fetchScreenGroupsWithScenes,
  publishSceneToMultipleGroups,
} from '../../services/screenGroupService';
import { useLogger } from '../../hooks/useLogger.js';

// Format last seen time
function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Never';
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Check if device is online (last seen within 5 minutes)
function isDeviceOnline(device) {
  if (device.is_online) return true;
  if (!device.last_seen) return false;
  const lastSeen = new Date(device.last_seen);
  const now = new Date();
  return (now - lastSeen) < 5 * 60 * 1000;
}

export default function PublishSceneModal({
  isOpen,
  onClose,
  scene,
  tenantId,
  onSuccess,
}) {
  const logger = useLogger('PublishSceneModal');
  const [activeTab, setActiveTab] = useState('screens'); // 'screens' or 'groups'
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [error, setError] = useState(null);

  // Fetch devices and groups when modal opens
  useEffect(() => {
    if (isOpen && tenantId) {
      loadData();
    }
  }, [isOpen, tenantId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDevices(new Set());
      setSelectedGroups(new Set());
      setError(null);
      setActiveTab('screens');
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [devicesData, groupsData] = await Promise.all([
        fetchDevicesForTenant(tenantId),
        fetchScreenGroupsWithScenes(),
      ]);
      setDevices(devicesData);
      setGroups(groupsData);

      // Pre-select devices that already have this scene
      const preSelectedDevices = new Set(
        devicesData
          .filter((d) => d.active_scene_id === scene?.id)
          .map((d) => d.id)
      );
      setSelectedDevices(preSelectedDevices);

      // Pre-select groups that already have this scene
      const preSelectedGroups = new Set(
        groupsData
          .filter((g) => g.active_scene_id === scene?.id)
          .map((g) => g.id)
      );
      setSelectedGroups(preSelectedGroups);
    } catch (err) {
      logger.error('Error loading data', { error: err, tenantId, sceneId: scene?.id });
      setError('Failed to load screens. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleDevice(deviceId) {
    setSelectedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  }

  function toggleGroup(groupId) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function selectAllDevices() {
    setSelectedDevices(new Set(devices.map((d) => d.id)));
  }

  function selectNoneDevices() {
    setSelectedDevices(new Set());
  }

  function selectAllGroups() {
    setSelectedGroups(new Set(groups.map((g) => g.id)));
  }

  function selectNoneGroups() {
    setSelectedGroups(new Set());
  }

  async function handlePublish() {
    const hasDevices = selectedDevices.size > 0;
    const hasGroups = selectedGroups.size > 0;

    if (!hasDevices && !hasGroups) return;

    setPublishing(true);
    setError(null);

    try {
      let totalDevices = 0;
      let totalGroups = 0;

      // Publish to selected groups first
      if (hasGroups) {
        const groupResult = await publishSceneToMultipleGroups(
          Array.from(selectedGroups),
          scene.id
        );
        totalGroups = groupResult.groupsUpdated || 0;
        totalDevices += groupResult.totalDevicesUpdated || 0;
      }

      // Publish to individual devices
      if (hasDevices) {
        await setSceneOnDevices({
          sceneId: scene.id,
          deviceIds: Array.from(selectedDevices),
        });
        totalDevices += selectedDevices.size;
      }

      onSuccess?.(totalDevices, totalGroups);
      onClose();
    } catch (err) {
      logger.error('Error publishing scene', { error: err, sceneId: scene?.id, deviceCount: selectedDevices.size, groupCount: selectedGroups.size });
      setError('Failed to publish scene. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  const totalSelected = selectedDevices.size + selectedGroups.size;
  const totalGroupDevices = groups
    .filter((g) => selectedGroups.has(g.id))
    .reduce((sum, g) => sum + (g.device_count || 0), 0);

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Publish to Screens</ModalTitle>
        <ModalDescription>
          Select screens or groups to display "{scene?.name}"
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadData}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('screens')}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'screens'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Individual Screens ({devices.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'groups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Screen Groups ({groups.length})
                </span>
              </button>
            </div>

            {/* Individual Screens Tab */}
            {activeTab === 'screens' && (
              <>
                {devices.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No screens found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Add a screen first to publish your scene.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Quick actions */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {selectedDevices.size} of {devices.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllDevices}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={selectNoneDevices}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select None
                        </button>
                      </div>
                    </div>

                    {/* Device list */}
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {devices.map((device) => {
                        const online = isDeviceOnline(device);
                        const isSelected = selectedDevices.has(device.id);
                        const hasThisScene = device.active_scene_id === scene?.id;

                        return (
                          <button
                            key={device.id}
                            onClick={() => toggleDevice(device.id)}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            {/* Checkbox */}
                            <div
                              className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                                ${isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                                }
                              `}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Device icon */}
                            <div
                              className={`
                                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                ${online ? 'bg-green-100' : 'bg-gray-100'}
                              `}
                            >
                              <Tv
                                className={`w-5 h-5 ${online ? 'text-green-600' : 'text-gray-400'}`}
                              />
                            </div>

                            {/* Device info */}
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {device.device_name || 'Unnamed Screen'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {online ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Wifi className="w-3 h-3" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <WifiOff className="w-3 h-3" />
                                    Offline
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatLastSeen(device.last_seen)}
                                </span>
                              </div>
                            </div>

                            {/* Current scene indicator */}
                            {hasThisScene && (
                              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                Current
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Screen Groups Tab */}
            {activeTab === 'groups' && (
              <>
                {groups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No screen groups found</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Create screen groups to publish to multiple screens at once.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Quick actions */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {selectedGroups.size} of {groups.length} groups selected
                        {selectedGroups.size > 0 && (
                          <span className="text-gray-400 ml-1">
                            ({totalGroupDevices} screens)
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllGroups}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={selectNoneGroups}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select None
                        </button>
                      </div>
                    </div>

                    {/* Group list */}
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {groups.map((group) => {
                        const isSelected = selectedGroups.has(group.id);
                        const hasThisScene = group.active_scene_id === scene?.id;
                        const deviceCount = group.device_count || 0;
                        const onlineCount = group.online_count || 0;

                        return (
                          <button
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            {/* Checkbox */}
                            <div
                              className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                                ${isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                                }
                              `}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Group icon */}
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>

                            {/* Group info */}
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {group.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  {deviceCount} screen{deviceCount !== 1 ? 's' : ''}
                                </span>
                                {onlineCount > 0 && (
                                  <span className="text-green-600">
                                    ({onlineCount} online)
                                  </span>
                                )}
                                {group.location_name && (
                                  <span className="text-gray-400">
                                    {group.location_name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Current scene indicator */}
                            {hasThisScene && (
                              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Summary */}
            {(selectedDevices.size > 0 || selectedGroups.size > 0) && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700">Publishing to:</p>
                <ul className="mt-1 space-y-1 text-gray-600">
                  {selectedGroups.size > 0 && (
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} ({totalGroupDevices} screens)
                    </li>
                  )}
                  {selectedDevices.size > 0 && (
                    <li className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      {selectedDevices.size} individual screen{selectedDevices.size !== 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={publishing}>
          Cancel
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publishing || totalSelected === 0 || loading}
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Publishing...
            </>
          ) : totalSelected === 0 ? (
            'Select screens or groups'
          ) : (
            <>
              Publish
              {selectedGroups.size > 0 && ` to ${selectedGroups.size} Group${selectedGroups.size !== 1 ? 's' : ''}`}
              {selectedDevices.size > 0 && selectedGroups.size > 0 && ' +'}
              {selectedDevices.size > 0 && ` ${selectedDevices.size} Screen${selectedDevices.size !== 1 ? 's' : ''}`}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
