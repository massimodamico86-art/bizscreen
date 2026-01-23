/**
 * Assign Screens Modal (US-143)
 *
 * Modal for assigning a schedule to screens and screen groups.
 * - Two sections: "Screens" and "Screen Groups"
 * - Checkbox list with current assignment status
 * - Search/filter for screens by name
 * - Apply saves changes, Cancel discards
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { Monitor, Folder, Search, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../supabase';
import {
  getAssignedDevicesAndGroups,
  bulkAssignScheduleToDevices,
  bulkUnassignScheduleFromDevices,
  bulkAssignScheduleToGroups,
  bulkUnassignScheduleFromGroups
} from '../../services/scheduleService';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button
} from '../../design-system';

export function AssignScreensModal({
  isOpen,
  onClose,
  scheduleId,
  scheduleName = 'Schedule',
  onAssigned = null
}) {
  const [allDevices, setAllDevices] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  const [initialDeviceIds, setInitialDeviceIds] = useState(new Set());
  const [initialGroupIds, setInitialGroupIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('screens'); // 'screens' or 'groups'

  // Load all devices and groups with current assignments
  const loadData = useCallback(async () => {
    if (!scheduleId) return;

    setIsLoading(true);
    try {
      // Fetch all devices and groups in parallel
      const [devicesResult, groupsResult, assignedResult] = await Promise.all([
        supabase
          .from('tv_devices')
          .select('id, device_name, is_online, assigned_schedule_id, location:locations(id, name)')
          .order('device_name'),
        supabase
          .from('screen_groups')
          .select('id, name, assigned_schedule_id, location:locations(id, name)')
          .order('name'),
        getAssignedDevicesAndGroups(scheduleId)
      ]);

      if (devicesResult.error) throw devicesResult.error;
      if (groupsResult.error) throw groupsResult.error;

      setAllDevices(devicesResult.data || []);
      setAllGroups(groupsResult.data || []);

      // Set initial selections based on current assignments
      const deviceIds = new Set((assignedResult.devices || []).map(d => d.id));
      const groupIds = new Set((assignedResult.groups || []).map(g => g.id));

      setSelectedDeviceIds(deviceIds);
      setSelectedGroupIds(groupIds);
      setInitialDeviceIds(new Set(deviceIds));
      setInitialGroupIds(new Set(groupIds));
    } catch (err) {
      logger.error('Failed to load assignment data', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
      setSearchTerm('');
    }
  }, [isOpen, loadData]);

  // Filter devices by search term
  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return allDevices;
    const term = searchTerm.toLowerCase();
    return allDevices.filter(d =>
      d.device_name?.toLowerCase().includes(term) ||
      d.location?.name?.toLowerCase().includes(term)
    );
  }, [allDevices, searchTerm]);

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return allGroups;
    const term = searchTerm.toLowerCase();
    return allGroups.filter(g =>
      g.name?.toLowerCase().includes(term) ||
      g.location?.name?.toLowerCase().includes(term)
    );
  }, [allGroups, searchTerm]);

  // Toggle device selection
  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  // Toggle group selection
  const toggleGroup = (groupId) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (selectedDeviceIds.size !== initialDeviceIds.size) return true;
    if (selectedGroupIds.size !== initialGroupIds.size) return true;
    for (const id of selectedDeviceIds) {
      if (!initialDeviceIds.has(id)) return true;
    }
    for (const id of selectedGroupIds) {
      if (!initialGroupIds.has(id)) return true;
    }
    return false;
  }, [selectedDeviceIds, selectedGroupIds, initialDeviceIds, initialGroupIds]);

  // Save changes
  const handleApply = async () => {
    setIsSaving(true);
    try {
      // Calculate diffs
      const devicesToAssign = [...selectedDeviceIds].filter(id => !initialDeviceIds.has(id));
      const devicesToUnassign = [...initialDeviceIds].filter(id => !selectedDeviceIds.has(id));
      const groupsToAssign = [...selectedGroupIds].filter(id => !initialGroupIds.has(id));
      const groupsToUnassign = [...initialGroupIds].filter(id => !selectedGroupIds.has(id));

      // Apply changes in parallel
      await Promise.all([
        devicesToAssign.length > 0 && bulkAssignScheduleToDevices(scheduleId, devicesToAssign),
        devicesToUnassign.length > 0 && bulkUnassignScheduleFromDevices(devicesToUnassign),
        groupsToAssign.length > 0 && bulkAssignScheduleToGroups(scheduleId, groupsToAssign),
        groupsToUnassign.length > 0 && bulkUnassignScheduleFromGroups(groupsToUnassign)
      ]);

      // Notify parent
      onAssigned?.({
        devicesAssigned: devicesToAssign.length,
        devicesUnassigned: devicesToUnassign.length,
        groupsAssigned: groupsToAssign.length,
        groupsUnassigned: groupsToUnassign.length,
        totalDevices: selectedDeviceIds.size,
        totalGroups: selectedGroupIds.size
      });

      onClose();
    } catch (err) {
      logger.error('Failed to save assignments', { error: err });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = selectedDeviceIds.size + selectedGroupIds.size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <Monitor size={20} className="text-white" />
          </div>
          <div>
            <ModalTitle>Assign Screens</ModalTitle>
            <p className="text-sm text-gray-500">
              Select screens and groups for "{scheduleName}"
            </p>
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search screens or groups..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('screens')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'screens'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span>Screens</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                {selectedDeviceIds.size}
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder size={14} />
              <span>Screen Groups</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                {selectedGroupIds.size}
              </span>
            </div>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* Screens List */}
        {!isLoading && activeTab === 'screens' && (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No screens match your search' : 'No screens found'}
              </div>
            ) : (
              filteredDevices.map(device => (
                <label
                  key={device.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDeviceIds.has(device.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDeviceIds.has(device.id)}
                    onChange={() => toggleDevice(device.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {device.device_name}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.is_online ? 'bg-green-400' : 'bg-gray-300'
                        }`}
                        title={device.is_online ? 'Online' : 'Offline'}
                      />
                    </div>
                    {device.location?.name && (
                      <div className="text-xs text-gray-500 truncate">
                        {device.location.name}
                      </div>
                    )}
                  </div>
                  {device.assigned_schedule_id && device.assigned_schedule_id !== scheduleId && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Has schedule
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}

        {/* Groups List */}
        {!isLoading && activeTab === 'groups' && (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'No groups match your search' : 'No screen groups found'}
              </div>
            ) : (
              filteredGroups.map(group => (
                <label
                  key={group.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedGroupIds.has(group.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {group.name}
                    </div>
                    {group.location?.name && (
                      <div className="text-xs text-gray-500 truncate">
                        {group.location.name}
                      </div>
                    )}
                  </div>
                  {group.assigned_schedule_id && group.assigned_schedule_id !== scheduleId && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Has schedule
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}

        {/* Selection Summary */}
        {selectedCount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-500" />
            <span className="text-sm text-blue-700">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              ({selectedDeviceIds.size} screens, {selectedGroupIds.size} groups)
            </span>
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          disabled={!hasChanges || isSaving}
          icon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        >
          {isSaving ? 'Saving...' : 'Apply Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default AssignScreensModal;
