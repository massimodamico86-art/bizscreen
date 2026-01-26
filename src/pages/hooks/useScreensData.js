/**
 * useScreensData.js
 * Custom hook for screen data, realtime subscriptions, and device commands.
 *
 * Extracts from ScreensPage.jsx:
 * - Screen data state (screens, picker data arrays, limits)
 * - Filter/search state
 * - Modal state
 * - Realtime subscription for screen status updates
 * - Device commands (reboot, reload, clear cache, reset, kiosk mode)
 * - Screen CRUD operations
 *
 * @param {Object} options
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} Screen data, state, and action handlers
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useLogger } from '../../hooks/useLogger.js';
import {
  fetchScreens as fetchScreensService,
  createScreen,
  updateScreen,
  deleteScreen,
  assignPlaylistToScreen,
  assignLayoutToScreen,
  assignScheduleToScreen,
  isScreenOnline,
  rebootDevice,
  reloadDeviceContent,
  clearDeviceCache,
  resetDevice,
  setDeviceKioskMode,
} from '../../services/screenService';
import { fetchPlaylists } from '../../services/playlistService';
import { fetchLayouts } from '../../services/layoutService';
import { fetchSchedules, bulkAssignScheduleToDevices } from '../../services/scheduleService';
import { getEffectiveLimits } from '../../services/limitsService';
import { fetchLocations, assignScreenToLocation } from '../../services/locationService';
import { getScreenAnalytics } from '../../services/analyticsService';
import { fetchScreenGroups } from '../../services/screenGroupService';

export function useScreensData({ showToast }) {
  const logger = useLogger('useScreensData');

  // --------------------------------------------------------------------------
  // Data state
  // --------------------------------------------------------------------------
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [screenGroups, setScreenGroups] = useState([]);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --------------------------------------------------------------------------
  // Filter/search state
  // --------------------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // --------------------------------------------------------------------------
  // Modal state
  // --------------------------------------------------------------------------
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add screen modal state
  const [creatingScreen, setCreatingScreen] = useState(false);
  const [createdScreen, setCreatedScreen] = useState(null);

  // Analytics modal state
  const [analyticsScreen, setAnalyticsScreen] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState('7d');

  // Device command state
  const [commandingDevice, setCommandingDevice] = useState(null);
  const [showKioskModal, setShowKioskModal] = useState(null);

  // Screen detail drawer state
  const [detailScreen, setDetailScreen] = useState(null);

  // Content picker modal state
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [contentPickerScreen, setContentPickerScreen] = useState(null);

  // Bulk selection state (US-148)
  const [selectedScreenIds, setSelectedScreenIds] = useState(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Assignment loading states
  const [assigningPlaylist, setAssigningPlaylist] = useState(null);
  const [assigningLayout, setAssigningLayout] = useState(null);
  const [assigningSchedule, setAssigningSchedule] = useState(null);

  // --------------------------------------------------------------------------
  // Data loading functions
  // --------------------------------------------------------------------------
  const loadScreens = useCallback(async () => {
    try {
      const data = await fetchScreensService();
      setScreens(data || []);
    } catch (err) {
      logger.error('Error fetching screens', { error: err });
      throw err;
    }
  }, [logger]);

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await fetchPlaylists();
      setPlaylists(data || []);
    } catch (err) {
      logger.error('Error fetching playlists', { error: err });
    }
  }, [logger]);

  const loadLayouts = useCallback(async () => {
    try {
      const result = await fetchLayouts();
      setLayouts(result.data || []);
    } catch (err) {
      logger.error('Error fetching layouts', { error: err });
    }
  }, [logger]);

  const loadSchedules = useCallback(async () => {
    try {
      const data = await fetchSchedules();
      setSchedules(data || []);
    } catch (err) {
      logger.error('Error fetching schedules', { error: err });
    }
  }, [logger]);

  const loadLocations = useCallback(async () => {
    try {
      const result = await fetchLocations();
      setLocations(result.data || []);
    } catch (err) {
      logger.error('Error fetching locations', { error: err });
    }
  }, [logger]);

  const loadScreenGroups = useCallback(async () => {
    try {
      const result = await fetchScreenGroups();
      setScreenGroups(result || []);
    } catch (err) {
      logger.error('Error fetching screen groups', { error: err });
    }
  }, [logger]);

  const loadLimits = useCallback(async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (err) {
      logger.error('Error fetching limits', { error: err });
    }
  }, [logger]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadScreens(),
        loadPlaylists(),
        loadLayouts(),
        loadSchedules(),
        loadLimits(),
        loadLocations(),
        loadScreenGroups(),
      ]);
    } catch (err) {
      logger.error('Error loading screens data', { error: err });
      setError(err.message || 'Failed to load screens data');
    } finally {
      setLoading(false);
    }
  }, [loadScreens, loadPlaylists, loadLayouts, loadSchedules, loadLimits, loadLocations, loadScreenGroups, logger]);

  const handleRefresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------------------------------
  // Realtime subscription
  // --------------------------------------------------------------------------
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('screens-page')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tv_devices',
      }, () => {
        loadScreens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, loadScreens]);

  // --------------------------------------------------------------------------
  // Computed values
  // --------------------------------------------------------------------------
  const filteredScreens = useMemo(() => {
    return screens.filter((screen) => {
      if (locationFilter !== 'all') {
        if (locationFilter === 'unassigned') {
          if (screen.location_id) return false;
        } else if (screen.location_id !== locationFilter) {
          return false;
        }
      }

      if (groupFilter !== 'all') {
        if (groupFilter === 'unassigned') {
          if (screen.screen_group_id) return false;
        } else if (screen.screen_group_id !== groupFilter) {
          return false;
        }
      }

      const searchLower = search.toLowerCase();
      return (
        screen.device_name?.toLowerCase().includes(searchLower) ||
        screen.assigned_playlist?.name?.toLowerCase().includes(searchLower) ||
        screen.assigned_layout?.name?.toLowerCase().includes(searchLower) ||
        screen.assigned_schedule?.name?.toLowerCase().includes(searchLower)
      );
    });
  }, [screens, locationFilter, groupFilter, search]);

  const onlineCount = useMemo(() => screens.filter(isScreenOnline).length, [screens]);
  const offlineCount = useMemo(() => screens.length - onlineCount, [screens, onlineCount]);

  const demoScreen = useMemo(() => {
    if (screens.length === 1 && screens[0].device_name === 'Demo Screen') {
      return screens[0];
    }
    return null;
  }, [screens]);

  // --------------------------------------------------------------------------
  // Screen CRUD handlers
  // --------------------------------------------------------------------------
  const handleCreateScreen = useCallback(async (name) => {
    try {
      setCreatingScreen(true);
      const screen = await createScreen({ name });
      setCreatedScreen(screen);
      setScreens((prev) => [screen, ...prev]);
      showToast?.('Screen created successfully');
    } catch (err) {
      logger.error('Error creating screen', { error: err, screenName: name });
      showToast?.('Error creating screen: ' + err.message, 'error');
    } finally {
      setCreatingScreen(false);
    }
  }, [logger, showToast]);

  const handleUpdateScreen = useCallback(async (data) => {
    try {
      setSavingEdit(true);
      await updateScreen(data.id, {
        device_name: data.name,
        location_id: data.locationId,
        screen_group_id: data.groupId,
        assigned_playlist_id: data.playlistId,
        assigned_layout_id: data.layoutId,
        display_language: data.displayLanguage,
      });

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === data.id) {
            const playlist = playlists.find((p) => p.id === data.playlistId);
            const layout = layouts.find((l) => l.id === data.layoutId);
            return {
              ...s,
              device_name: data.name,
              location_id: data.locationId,
              screen_group_id: data.groupId,
              assigned_playlist_id: data.playlistId,
              assigned_playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
              assigned_layout_id: data.layoutId,
              assigned_layout: layout ? { id: layout.id, name: layout.name } : null,
              display_language: data.displayLanguage,
            };
          }
          return s;
        })
      );

      showToast?.('Screen updated successfully');
      setEditingScreen(null);
    } catch (err) {
      logger.error('Error updating screen', { error: err, screenId: data.id, updates: data });
      showToast?.('Error updating screen: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }, [playlists, layouts, logger, showToast]);

  const handleDeleteScreen = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this screen?')) return;

    try {
      await deleteScreen(id);
      setScreens((prev) => prev.filter((s) => s.id !== id));
      showToast?.('Screen deleted successfully');
    } catch (err) {
      logger.error('Error deleting screen', { error: err, screenId: id });
      showToast?.('Error deleting screen: ' + err.message, 'error');
    }
  }, [logger, showToast]);

  // --------------------------------------------------------------------------
  // Assignment handlers
  // --------------------------------------------------------------------------
  const handleAssignPlaylist = useCallback(async (screenId, playlistId) => {
    try {
      setAssigningPlaylist(screenId);
      await assignPlaylistToScreen(screenId, playlistId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const playlist = playlists.find((p) => p.id === playlistId);
            return {
              ...s,
              assigned_playlist_id: playlistId || null,
              assigned_playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Playlist assigned successfully');
    } catch (err) {
      logger.error('Error assigning playlist to screen', { error: err, screenId, playlistId });
      showToast?.('Error assigning playlist: ' + err.message, 'error');
    } finally {
      setAssigningPlaylist(null);
    }
  }, [playlists, logger, showToast]);

  const handleAssignLayout = useCallback(async (screenId, layoutId) => {
    try {
      setAssigningLayout(screenId);
      await assignLayoutToScreen(screenId, layoutId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const layout = layouts.find((l) => l.id === layoutId);
            return {
              ...s,
              assigned_layout_id: layoutId || null,
              assigned_layout: layout ? { id: layout.id, name: layout.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Layout assigned successfully');
    } catch (err) {
      logger.error('Error assigning layout to screen', { error: err, screenId, layoutId });
      showToast?.('Error assigning layout: ' + err.message, 'error');
    } finally {
      setAssigningLayout(null);
    }
  }, [layouts, logger, showToast]);

  const handleAssignSchedule = useCallback(async (screenId, scheduleId) => {
    try {
      setAssigningSchedule(screenId);
      await assignScheduleToScreen(screenId, scheduleId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const schedule = schedules.find((sch) => sch.id === scheduleId);
            return {
              ...s,
              assigned_schedule_id: scheduleId || null,
              assigned_schedule: schedule ? { id: schedule.id, name: schedule.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Schedule assigned successfully');
    } catch (err) {
      logger.error('Error assigning schedule to screen', { error: err, screenId, scheduleId });
      showToast?.('Error assigning schedule: ' + err.message, 'error');
    } finally {
      setAssigningSchedule(null);
    }
  }, [schedules, logger, showToast]);

  const handleAssignLocation = useCallback(async (screenId, locationId) => {
    try {
      await assignScreenToLocation(screenId, locationId || null);
      setScreens((prev) =>
        prev.map((s) => (s.id === screenId ? { ...s, location_id: locationId || null } : s))
      );
      showToast?.('Location updated');
    } catch (err) {
      logger.error('Error assigning location to screen', { error: err, screenId, locationId });
      showToast?.('Error updating location', 'error');
    }
  }, [logger, showToast]);

  // --------------------------------------------------------------------------
  // Bulk selection handlers (US-148)
  // --------------------------------------------------------------------------
  const toggleScreenSelection = useCallback((screenId) => {
    setSelectedScreenIds((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) {
        next.delete(screenId);
      } else {
        next.add(screenId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedScreenIds.size === filteredScreens.length) {
      setSelectedScreenIds(new Set());
    } else {
      setSelectedScreenIds(new Set(filteredScreens.map((s) => s.id)));
    }
  }, [selectedScreenIds.size, filteredScreens]);

  const handleBulkAssignSchedule = useCallback(async (scheduleId) => {
    if (!scheduleId || selectedScreenIds.size === 0) return;

    setBulkAssigning(true);
    try {
      const deviceIds = Array.from(selectedScreenIds);
      const result = await bulkAssignScheduleToDevices(scheduleId, deviceIds);

      const schedule = schedules.find((s) => s.id === scheduleId);
      setScreens((prev) =>
        prev.map((screen) => {
          if (selectedScreenIds.has(screen.id)) {
            return {
              ...screen,
              assigned_schedule_id: scheduleId,
              assigned_schedule: schedule ? { id: schedule.id, name: schedule.name } : null,
            };
          }
          return screen;
        })
      );

      showToast?.(`Assigned schedule to ${result.updated} screens`);
      setSelectedScreenIds(new Set());
    } catch (err) {
      logger.error('Error bulk assigning schedule', { error: err, scheduleId, screenCount: selectedScreenIds.size });
      showToast?.('Error assigning schedule: ' + err.message, 'error');
    } finally {
      setBulkAssigning(false);
    }
  }, [schedules, selectedScreenIds, logger, showToast]);

  const clearSelection = useCallback(() => {
    setSelectedScreenIds(new Set());
  }, []);

  // --------------------------------------------------------------------------
  // Device command handlers
  // --------------------------------------------------------------------------
  const handleDeviceCommand = useCallback(async (screenId, commandType, screenName) => {
    if (
      commandType === 'reset' &&
      !window.confirm(
        `Are you sure you want to reset "${screenName}"? This will clear all local data on the device.`
      )
    ) {
      return;
    }

    try {
      setCommandingDevice({ id: screenId, command: commandType });

      switch (commandType) {
        case 'reboot':
          await rebootDevice(screenId);
          showToast?.(`Reboot command sent to ${screenName}`);
          break;
        case 'reload':
          await reloadDeviceContent(screenId);
          showToast?.(`Reload command sent to ${screenName}`);
          break;
        case 'clear_cache':
          await clearDeviceCache(screenId);
          showToast?.(`Clear cache command sent to ${screenName}`);
          break;
        case 'reset':
          await resetDevice(screenId);
          showToast?.(`Reset command sent to ${screenName}`);
          break;
        default:
          throw new Error('Unknown command type');
      }
    } catch (err) {
      logger.error('Error sending device command', { error: err, screenId, commandType, screenName });
      showToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setCommandingDevice(null);
    }
  }, [logger, showToast]);

  const handleReboot = useCallback((screenId, screenName) => {
    handleDeviceCommand(screenId, 'reboot', screenName);
  }, [handleDeviceCommand]);

  const handleReload = useCallback((screenId, screenName) => {
    handleDeviceCommand(screenId, 'reload', screenName);
  }, [handleDeviceCommand]);

  const handleClearCache = useCallback((screenId, screenName) => {
    handleDeviceCommand(screenId, 'clear_cache', screenName);
  }, [handleDeviceCommand]);

  const handleReset = useCallback((screenId, screenName) => {
    handleDeviceCommand(screenId, 'reset', screenName);
  }, [handleDeviceCommand]);

  const handleSetKioskMode = useCallback(async (screenId, enabled, password) => {
    try {
      await setDeviceKioskMode(screenId, enabled, password);
      showToast?.(enabled ? 'Kiosk mode enabled' : 'Kiosk mode disabled');
      setShowKioskModal(null);
    } catch (err) {
      logger.error('Error setting kiosk mode', { error: err, screenId, enabled });
      showToast?.(`Error: ${err.message}`, 'error');
    }
  }, [logger, showToast]);

  // --------------------------------------------------------------------------
  // Analytics handlers
  // --------------------------------------------------------------------------
  const handleLoadAnalytics = useCallback(async (screen, range = '7d') => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsScreen(screen);
      setAnalyticsRange(range);
      const data = await getScreenAnalytics(screen.id, range);
      setAnalyticsData(data);
    } catch (err) {
      logger.error('Error loading screen analytics', { error: err, screenId: screen.id, range });
      showToast?.('Error loading analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [logger, showToast]);

  const closeAnalyticsModal = useCallback(() => {
    setAnalyticsScreen(null);
    setAnalyticsData(null);
  }, []);

  // --------------------------------------------------------------------------
  // Modal handlers
  // --------------------------------------------------------------------------
  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setCreatedScreen(null);
  }, []);

  const handleCopyOTP = useCallback((code) => {
    navigator.clipboard.writeText(code);
    showToast?.('OTP code copied to clipboard');
  }, [showToast]);

  const handleOpenContentPicker = useCallback((screen) => {
    setContentPickerScreen(screen);
    setShowContentPicker(true);
  }, []);

  const closeContentPicker = useCallback(() => {
    setShowContentPicker(false);
    setContentPickerScreen(null);
  }, []);

  // --------------------------------------------------------------------------
  // Return value
  // --------------------------------------------------------------------------
  return {
    // Data
    screens,
    playlists,
    layouts,
    schedules,
    locations,
    screenGroups,
    limits,
    loading,
    error,

    // Filter/search
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    groupFilter,
    setGroupFilter,
    filteredScreens,

    // Computed values
    onlineCount,
    offlineCount,
    demoScreen,

    // Modal state
    showAddModal,
    setShowAddModal,
    showLimitModal,
    setShowLimitModal,
    editingScreen,
    setEditingScreen,
    savingEdit,
    creatingScreen,
    createdScreen,
    analyticsScreen,
    analyticsData,
    analyticsLoading,
    analyticsRange,
    showKioskModal,
    setShowKioskModal,
    detailScreen,
    setDetailScreen,
    showContentPicker,
    contentPickerScreen,
    commandingDevice,

    // Bulk selection (US-148)
    selectedScreenIds,
    bulkAssigning,
    toggleScreenSelection,
    toggleSelectAll,
    handleBulkAssignSchedule,
    clearSelection,

    // Assignment loading states
    assigningPlaylist,
    assigningLayout,
    assigningSchedule,

    // Actions
    loadData,
    handleRefresh,
    handleCreateScreen,
    handleUpdateScreen,
    handleDeleteScreen,
    handleAssignPlaylist,
    handleAssignLayout,
    handleAssignSchedule,
    handleAssignLocation,
    handleDeviceCommand,
    handleReboot,
    handleReload,
    handleClearCache,
    handleReset,
    handleSetKioskMode,
    handleLoadAnalytics,
    closeAnalyticsModal,
    handleCopyOTP,
    closeAddModal,
    handleOpenContentPicker,
    closeContentPicker,
  };
}
