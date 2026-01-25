/**
 * Page Hooks Unit Tests
 *
 * Tests for the extracted custom hooks from page components
 * Phase 8: Page Refactoring - Plan 06
 *
 * @module tests/unit/pages/hooks/pageHooks.test
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================================================
// GLOBAL MOCK SETUP (before any module imports)
// ============================================================================

// Global localStorage mock store
let localStorageStore = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageStore[key] || null),
  setItem: vi.fn((key, value) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
  key: vi.fn((index) => Object.keys(localStorageStore)[index] || null),
  get length() { return Object.keys(localStorageStore).length; },
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

// ============================================================================
// SERVICE MOCKS
// ============================================================================

// Feature Flag Service Mocks
vi.mock('../../../../src/services/featureFlagService', () => ({
  getAllFeatureFlags: vi.fn().mockResolvedValue([
    { id: '1', key: 'test_flag', enabled: true, description: 'Test flag' }
  ]),
  createFeatureFlag: vi.fn().mockResolvedValue({ id: '1' }),
  updateFeatureFlag: vi.fn().mockResolvedValue({ id: '1' }),
  deleteFeatureFlag: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/experimentService', () => ({
  getAllExperiments: vi.fn().mockResolvedValue([
    { id: '1', name: 'Test Experiment', status: 'running' }
  ]),
  createExperiment: vi.fn().mockResolvedValue({ id: '1' }),
  updateExperimentStatus: vi.fn().mockResolvedValue({ id: '1' }),
  deleteExperiment: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/feedbackService', () => ({
  getAllFeedback: vi.fn().mockResolvedValue([
    { id: '1', message: 'Test feedback', status: 'new' }
  ]),
  updateFeedbackStatus: vi.fn().mockResolvedValue({ id: '1' }),
  getAllAnnouncements: vi.fn().mockResolvedValue([
    { id: '1', title: 'Test Announcement', active: true }
  ]),
  createAnnouncement: vi.fn().mockResolvedValue({ id: '1' }),
  updateAnnouncement: vi.fn().mockResolvedValue({ id: '1' }),
  deleteAnnouncement: vi.fn().mockResolvedValue(true),
}));

// Campaign Service Mocks
vi.mock('../../../../src/services/campaignService', () => ({
  getCampaign: vi.fn().mockResolvedValue({
    id: '123',
    name: 'Test Campaign',
    description: 'Test description',
    status: 'draft',
    start_at: '2024-01-01T00:00:00Z',
    end_at: '2024-12-31T23:59:59Z',
    priority: 100,
    targets: [],
    contents: []
  }),
  createCampaign: vi.fn().mockResolvedValue({ id: '1' }),
  updateCampaign: vi.fn().mockResolvedValue({ id: '1' }),
  deleteCampaign: vi.fn().mockResolvedValue(true),
  activateCampaign: vi.fn().mockResolvedValue({ id: '1' }),
  pauseCampaign: vi.fn().mockResolvedValue({ id: '1' }),
  addTarget: vi.fn().mockResolvedValue({ id: '1' }),
  removeTarget: vi.fn().mockResolvedValue(true),
  addContent: vi.fn().mockResolvedValue({ id: '1' }),
  removeContent: vi.fn().mockResolvedValue(true),
  CAMPAIGN_STATUS: { DRAFT: 'draft', ACTIVE: 'active', PAUSED: 'paused' },
}));

vi.mock('../../../../src/services/screenGroupService', () => ({
  fetchScreenGroups: vi.fn().mockResolvedValue([
    { id: '1', name: 'Group 1' }
  ]),
}));

vi.mock('../../../../src/services/locationService', () => ({
  fetchLocations: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Location 1' }] }),
  assignScreenToLocation: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/playlistService', () => ({
  fetchPlaylists: vi.fn().mockResolvedValue([
    { id: '1', name: 'Playlist 1' }
  ]),
  savePlaylistAsTemplate: vi.fn().mockResolvedValue({ id: '1' }),
  addPlaylistItem: vi.fn().mockResolvedValue({ id: '1' }),
  createPlaylist: vi.fn().mockResolvedValue({ id: '1' }),
  bulkAddToPlaylist: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/layoutService', () => ({
  fetchLayouts: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Layout 1' }] }),
}));

vi.mock('../../../../src/services/approvalService', () => ({
  requestApproval: vi.fn().mockResolvedValue({ id: '1' }),
  getOpenReviewForResource: vi.fn().mockResolvedValue(null),
  revertToDraft: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/previewService', () => ({
  createPreviewLinkWithPreset: vi.fn().mockResolvedValue({ id: '1', token: 'abc123' }),
  fetchPreviewLinksForResource: vi.fn().mockResolvedValue([]),
  revokePreviewLink: vi.fn().mockResolvedValue(true),
  formatPreviewLink: vi.fn().mockReturnValue('https://preview.example.com/abc123'),
}));

// Screen Service Mocks
vi.mock('../../../../src/services/screenService', () => ({
  fetchScreens: vi.fn().mockResolvedValue([
    { id: '1', name: 'Screen 1', status: 'online', location_id: '1' }
  ]),
  createScreen: vi.fn().mockResolvedValue({ id: '1' }),
  updateScreen: vi.fn().mockResolvedValue({ id: '1' }),
  deleteScreen: vi.fn().mockResolvedValue(true),
  assignPlaylistToScreen: vi.fn().mockResolvedValue(true),
  assignLayoutToScreen: vi.fn().mockResolvedValue(true),
  assignScheduleToScreen: vi.fn().mockResolvedValue(true),
  isScreenOnline: vi.fn().mockReturnValue(true),
  rebootDevice: vi.fn().mockResolvedValue(true),
  reloadDeviceContent: vi.fn().mockResolvedValue(true),
  clearDeviceCache: vi.fn().mockResolvedValue(true),
  resetDevice: vi.fn().mockResolvedValue(true),
  setDeviceKioskMode: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/scheduleService', () => ({
  fetchSchedules: vi.fn().mockResolvedValue([
    { id: '1', name: 'Schedule 1' }
  ]),
  bulkAssignScheduleToDevices: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../src/services/limitsService', () => ({
  getEffectiveLimits: vi.fn().mockResolvedValue({ screens: 100, media: 1000 }),
  hasReachedLimit: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../../src/services/analyticsService', () => ({
  getScreenAnalytics: vi.fn().mockResolvedValue({ views: 100, uptime: 99 }),
}));

// Media Service Mocks
vi.mock('../../../../src/services/mediaService', () => ({
  createMediaAsset: vi.fn().mockResolvedValue({ id: '1' }),
  createWebPageAsset: vi.fn().mockResolvedValue({ id: '1' }),
  MEDIA_TYPES: { IMAGE: 'image', VIDEO: 'video', AUDIO: 'audio', DOCUMENT: 'document' },
  deleteMediaAssetSafely: vi.fn().mockResolvedValue(true),
  getMediaUsage: vi.fn().mockResolvedValue({ playlists: [], layouts: [] }),
  moveMediaToFolder: vi.fn().mockResolvedValue(true),
  reorderMedia: vi.fn().mockResolvedValue(true),
  moveMediaToFolderOrdered: vi.fn().mockResolvedValue(true),
  fetchMediaAssets: vi.fn().mockResolvedValue({
    data: [{ id: '1', name: 'Asset 1', type: 'image' }],
    count: 1
  }),
  getBulkDownloadUrls: vi.fn().mockResolvedValue([]),
  batchDeleteMediaAssets: vi.fn().mockResolvedValue({ success: true }),
}));

// Assistant Service Mocks
vi.mock('../../../../src/services/assistantService', () => ({
  generateSlides: vi.fn().mockResolvedValue([]),
  getBusinessContextFromProfile: vi.fn().mockResolvedValue({}),
}));

// Supabase Mock - defined inline to avoid hoisting issues
vi.mock('../../../../src/supabase', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockChannel = vi.fn();
  const mockOn = vi.fn();
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn();
  const mockRemoveChannel = vi.fn();

  // Chain returns
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });
  mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  });
  mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
  });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });

  // Realtime channel mock
  mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

  return {
    supabase: {
      from: mockFrom,
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    },
  };
});

// Logging Mocks
vi.mock('../../../../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../../../src/hooks/useLogger.js', () => ({
  useLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Media Folders Hook Mock
vi.mock('../../../../src/hooks/useMediaFolders.js', () => ({
  useMediaFolders: vi.fn().mockReturnValue({
    folders: [],
    isLoading: false,
    folderPath: [],
    createFolder: vi.fn().mockResolvedValue({ id: '1' }),
    renameFolder: vi.fn().mockResolvedValue(true),
    deleteFolder: vi.fn().mockResolvedValue(true),
    refresh: vi.fn(),
    moveMediaToFolder: vi.fn().mockResolvedValue(true),
    moveMediaToFolderOrdered: vi.fn().mockResolvedValue(true),
  }),
}));

// S3 Upload Hook Mock
vi.mock('../../../../src/hooks/useS3Upload.jsx', () => ({
  useS3Upload: vi.fn().mockReturnValue({
    openFilePicker: vi.fn(),
    renderFileInput: vi.fn().mockReturnValue(null),
    uploading: false,
    progress: 0,
    uploadedFiles: [],
    handleDrop: vi.fn(),
  }),
}));

// ============================================================================
// Import hooks AFTER mocks
// ============================================================================

import { useFeatureFlags } from '../../../../src/pages/hooks/useFeatureFlags.js';
import { useCampaignEditor } from '../../../../src/pages/hooks/useCampaignEditor.js';
import { usePlaylistEditor } from '../../../../src/pages/hooks/usePlaylistEditor.js';
import { useScreensData } from '../../../../src/pages/hooks/useScreensData.js';
import { useMediaLibrary } from '../../../../src/pages/hooks/useMediaLibrary.js';

// Import mocked services for assertions
import * as featureFlagService from '../../../../src/services/featureFlagService';
import * as experimentService from '../../../../src/services/experimentService';
import * as feedbackService from '../../../../src/services/feedbackService';
import * as campaignService from '../../../../src/services/campaignService';
import * as screenService from '../../../../src/services/screenService';

// ============================================================================
// useFeatureFlags Tests
// ============================================================================

describe('useFeatureFlags', () => {
  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with loading true', () => {
      const { result } = renderHook(() => useFeatureFlags());
      expect(result.current.loading).toBe(true);
    });

    it('initializes with flags tab active', () => {
      const { result } = renderHook(() => useFeatureFlags());
      expect(result.current.activeTab).toBe('flags');
    });

    it('initializes with empty data arrays', () => {
      const { result } = renderHook(() => useFeatureFlags());
      expect(result.current.flags).toEqual([]);
      expect(result.current.experiments).toEqual([]);
      expect(result.current.feedback).toEqual([]);
      expect(result.current.announcements).toEqual([]);
    });

    it('initializes with modals closed', () => {
      const { result } = renderHook(() => useFeatureFlags());
      expect(result.current.showFlagModal).toBe(false);
      expect(result.current.showExperimentModal).toBe(false);
      expect(result.current.showAnnouncementModal).toBe(false);
    });
  });

  describe('data loading', () => {
    it('loads flags on initial render', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(featureFlagService.getAllFeatureFlags).toHaveBeenCalled();
      expect(result.current.flags).toHaveLength(1);
      expect(result.current.flags[0].key).toBe('test_flag');
    });

    it('loads experiments when tab changes', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('experiments');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(experimentService.getAllExperiments).toHaveBeenCalled();
    });

    it('loads feedback when tab changes', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('feedback');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(feedbackService.getAllFeedback).toHaveBeenCalled();
    });

    it('loads announcements when tab changes', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setActiveTab('announcements');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(feedbackService.getAllAnnouncements).toHaveBeenCalled();
    });
  });

  describe('modal state management', () => {
    it('opens and closes flag modal', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setShowFlagModal(true);
      });

      expect(result.current.showFlagModal).toBe(true);

      act(() => {
        result.current.setShowFlagModal(false);
      });

      expect(result.current.showFlagModal).toBe(false);
    });

    it('sets editing item for edit operations', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const testItem = { id: '1', key: 'test' };

      act(() => {
        result.current.setEditingItem(testItem);
      });

      expect(result.current.editingItem).toEqual(testItem);
    });
  });

  describe('CRUD operations', () => {
    it('creates a feature flag', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = { key: 'new_flag', description: 'New flag' };

      await act(async () => {
        const response = await result.current.handleCreateFlag(formData);
        expect(response.success).toBe(true);
      });

      expect(featureFlagService.createFeatureFlag).toHaveBeenCalledWith(formData);
    });

    it('updates a feature flag', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = { description: 'Updated' };

      await act(async () => {
        const response = await result.current.handleUpdateFlag('1', formData);
        expect(response.success).toBe(true);
      });

      expect(featureFlagService.updateFeatureFlag).toHaveBeenCalledWith('1', formData);
    });

    it('deletes a feature flag', async () => {
      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.handleDeleteFlag('1');
        expect(response.success).toBe(true);
      });

      expect(featureFlagService.deleteFeatureFlag).toHaveBeenCalledWith('1');
    });
  });

  describe('error handling', () => {
    it('sets error on failed data load', async () => {
      featureFlagService.getAllFeatureFlags.mockRejectedValueOnce(new Error('Load failed'));

      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Load failed');
    });

    it('clears error when clearError called', async () => {
      featureFlagService.getAllFeatureFlags.mockRejectedValueOnce(new Error('Load failed'));

      const { result } = renderHook(() => useFeatureFlags());

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe('');
    });
  });
});

// ============================================================================
// useCampaignEditor Tests
// ============================================================================

describe('useCampaignEditor', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes as new campaign when id is "new"', () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      expect(result.current.isNew).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('initializes with empty campaign for new', () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      expect(result.current.campaign.name).toBe('');
      expect(result.current.campaign.description).toBe('');
      expect(result.current.campaign.status).toBe('draft');
    });

    it('sets loading true for existing campaign', () => {
      const { result } = renderHook(() =>
        useCampaignEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.isNew).toBe(false);
      // Loading starts true for existing campaigns
      expect(result.current.loading).toBe(true);
    });

    it('initializes modals as closed', () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      expect(result.current.showTargetPicker).toBe(false);
      expect(result.current.showContentPicker).toBe(false);
      expect(result.current.showApprovalModal).toBe(false);
      expect(result.current.showPreviewModal).toBe(false);
    });

    it('initializes with hasChanges false', () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe('data loading', () => {
    it('loads campaign data for existing id', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('123', { showToast: mockShowToast })
      );

      // Wait for loading to complete FIRST with explicit timeout
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      expect(campaignService.getCampaign).toHaveBeenCalledWith('123');
      expect(result.current.campaign.name).toBe('Test Campaign');
    });

    it('loads picker data (playlists, layouts, etc)', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      // Wait for picker data to be loaded with explicit timeout
      // For new campaigns, loading is already false, so we wait for actual data
      await waitFor(() => {
        expect(result.current.playlists).toHaveLength(1);
      }, { timeout: 3000 });

      // Verify all picker data
      expect(result.current.layouts).toHaveLength(1);
    });
  });

  describe('state updates', () => {
    it('tracks changes when handleChange called', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      act(() => {
        result.current.handleChange('name', 'Test Campaign');
      });

      expect(result.current.hasChanges).toBe(true);
      expect(result.current.campaign.name).toBe('Test Campaign');
    });

    it('opens target picker modal', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowTargetPicker(true);
      });

      expect(result.current.showTargetPicker).toBe(true);
    });

    it('opens content picker modal', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowContentPicker(true);
      });

      expect(result.current.showContentPicker).toBe(true);
    });
  });

  describe('preview link management', () => {
    it('sets preview expiry option', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setSelectedExpiry('30_days');
      });

      expect(result.current.selectedExpiry).toBe('30_days');
    });

    it('toggles allow comments', async () => {
      const { result } = renderHook(() =>
        useCampaignEditor('new', { showToast: mockShowToast })
      );

      expect(result.current.allowComments).toBe(true);

      act(() => {
        result.current.setAllowComments(false);
      });

      expect(result.current.allowComments).toBe(false);
    });
  });
});

// ============================================================================
// usePlaylistEditor Tests
// ============================================================================

describe('usePlaylistEditor', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with loading true', () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.loading).toBe(true);
    });

    it('initializes with empty items array', () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.items).toEqual([]);
    });

    it('initializes media search as empty', () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.mediaSearch).toBe('');
    });

    it('initializes AI modal as closed', () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.showAiModal).toBe(false);
    });

    it('initializes drag state as null', () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.dragSourceIndex).toBe(null);
      expect(result.current.dragOverIndex).toBe(null);
    });
  });

  describe('media library state', () => {
    it('updates media search filter', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setMediaSearch('test search');
      });

      expect(result.current.mediaSearch).toBe('test search');
    });

    it('updates media type filter', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setMediaFilter('image');
      });

      expect(result.current.mediaFilter).toBe('image');
    });

    it('provides virtual scrolling constants', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      expect(result.current.ITEMS_PER_ROW).toBe(2);
      expect(result.current.ITEM_HEIGHT).toBe(100);
    });
  });

  describe('AI modal state', () => {
    it('opens AI modal', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowAiModal(true);
      });

      expect(result.current.showAiModal).toBe(true);
    });

    it('updates AI slide count', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setAiSlideCount(8);
      });

      expect(result.current.aiSlideCount).toBe(8);
    });
  });

  describe('approval workflow state', () => {
    it('opens approval modal', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowApprovalModal(true);
      });

      expect(result.current.showApprovalModal).toBe(true);
    });

    it('updates approval message', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setApprovalMessage('Please review this playlist');
      });

      expect(result.current.approvalMessage).toBe('Please review this playlist');
    });
  });

  describe('template modal state', () => {
    it('opens template modal', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowTemplateModal(true);
      });

      expect(result.current.showTemplateModal).toBe(true);
    });

    it('updates template name', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setTemplateName('My Template');
      });

      expect(result.current.templateName).toBe('My Template');
    });

    it('updates template description', async () => {
      const { result } = renderHook(() =>
        usePlaylistEditor('123', { showToast: mockShowToast })
      );

      act(() => {
        result.current.setTemplateDescription('Template for retail displays');
      });

      expect(result.current.templateDescription).toBe('Template for retail displays');
    });
  });
});

// ============================================================================
// useScreensData Tests
// ============================================================================

describe('useScreensData', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with loading true', () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      expect(result.current.loading).toBe(true);
    });

    it('initializes with empty screens array', () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      expect(result.current.screens).toEqual([]);
    });

    it('initializes filters as empty/default', () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      expect(result.current.search).toBe('');
      expect(result.current.locationFilter).toBe('all');
      expect(result.current.groupFilter).toBe('all');
    });

    it('initializes modals as closed', () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      expect(result.current.showAddModal).toBe(false);
      expect(result.current.showLimitModal).toBe(false);
    });

    it('initializes bulk selection as empty', () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      expect(result.current.selectedScreenIds).toBeInstanceOf(Set);
      expect(result.current.selectedScreenIds.size).toBe(0);
    });
  });

  describe('data loading', () => {
    it('loads screens on mount', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(screenService.fetchScreens).toHaveBeenCalled();
    });

    it('loads picker data (playlists, layouts, schedules)', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.playlists).toBeDefined();
      expect(result.current.layouts).toBeDefined();
      expect(result.current.schedules).toBeDefined();
    });
  });

  describe('filter state', () => {
    it('updates search filter', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setSearch('lobby');
      });

      expect(result.current.search).toBe('lobby');
    });

    it('updates location filter', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setLocationFilter('1');
      });

      expect(result.current.locationFilter).toBe('1');
    });

    it('updates group filter', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setGroupFilter('2');
      });

      expect(result.current.groupFilter).toBe('2');
    });
  });

  describe('modal state', () => {
    it('opens add modal', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowAddModal(true);
      });

      expect(result.current.showAddModal).toBe(true);
    });

    it('opens limit modal', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowLimitModal(true);
      });

      expect(result.current.showLimitModal).toBe(true);
    });

    it('sets editing screen', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      const screen = { id: '1', name: 'Test Screen' };

      act(() => {
        result.current.setEditingScreen(screen);
      });

      expect(result.current.editingScreen).toEqual(screen);
    });

    it('sets detail screen for drawer', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      const screen = { id: '1', name: 'Test Screen' };

      act(() => {
        result.current.setDetailScreen(screen);
      });

      expect(result.current.detailScreen).toEqual(screen);
    });
  });

  describe('bulk selection', () => {
    it('toggles screen selection', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleScreenSelection('1');
      });

      expect(result.current.selectedScreenIds.has('1')).toBe(true);

      act(() => {
        result.current.toggleScreenSelection('1');
      });

      expect(result.current.selectedScreenIds.has('1')).toBe(false);
    });

    it('clears selection', async () => {
      const { result } = renderHook(() =>
        useScreensData({ showToast: mockShowToast })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleScreenSelection('1');
        result.current.toggleScreenSelection('2');
      });

      expect(result.current.selectedScreenIds.size).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedScreenIds.size).toBe(0);
    });
  });
});

// ============================================================================
// useMediaLibrary Tests
// ============================================================================

describe('useMediaLibrary', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    localStorageStore = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with loading true', () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.loading).toBe(true);
    });

    it('initializes with empty media assets', () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.mediaAssets).toEqual([]);
    });

    it('initializes with grid view mode', () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.viewMode).toBe('grid');
    });

    it('initializes with empty selection', () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.selectedIds).toBeInstanceOf(Set);
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('initializes with null current folder', () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.currentFolderId).toBe(null);
    });
  });

  describe('filter and search state', () => {
    it('updates search text', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setSearch('logo');
      });

      expect(result.current.search).toBe('logo');
    });

    it('updates type filter', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setTypeFilter('video');
      });

      expect(result.current.typeFilter).toBe('video');
    });

    it('updates orientation filter', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setOrientationFilter('landscape');
      });

      expect(result.current.orientationFilter).toBe('landscape');
    });
  });

  describe('view mode', () => {
    it('changes to list view', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setViewMode('list');
      });

      expect(result.current.viewMode).toBe('list');
    });

    it('changes back to grid view', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setViewMode('list');
      });

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('bulk selection', () => {
    it('toggles asset selection', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.toggleSelection('asset-1');
      });

      expect(result.current.selectedIds.has('asset-1')).toBe(true);

      act(() => {
        result.current.toggleSelection('asset-1');
      });

      expect(result.current.selectedIds.has('asset-1')).toBe(false);
    });

    it('selects multiple assets', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.toggleSelection('asset-1');
        result.current.toggleSelection('asset-2');
        result.current.toggleSelection('asset-3');
      });

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.hasSelection).toBe(true);
    });

    it('clears selection', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.toggleSelection('asset-1');
        result.current.toggleSelection('asset-2');
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('modal state', () => {
    it('opens add media modal', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowAddMediaModal(true);
      });

      expect(result.current.showAddMediaModal).toBe(true);
    });

    it('opens detail modal', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowDetailModal(true);
      });

      expect(result.current.showDetailModal).toBe(true);
    });

    it('opens delete confirm modal', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowDeleteConfirm(true);
      });

      expect(result.current.showDeleteConfirm).toBe(true);
    });

    it('opens move modal', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowMoveModal(true);
      });

      expect(result.current.showMoveModal).toBe(true);
    });

    it('opens folder modal', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setShowFolderModal(true);
      });

      expect(result.current.showFolderModal).toBe(true);
    });

    it('sets selected asset for detail view', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      const asset = { id: '1', name: 'Test Asset' };

      act(() => {
        result.current.setSelectedAsset(asset);
      });

      expect(result.current.selectedAsset).toEqual(asset);
    });

    it('sets editing asset', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      const asset = { id: '1', name: 'Test Asset' };

      act(() => {
        result.current.setEditingAsset(asset);
      });

      expect(result.current.editingAsset).toEqual(asset);
    });
  });

  describe('upload state', () => {
    it('initializes with upload tab on media', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.uploadTab).toBe('upload');
    });

    it('changes upload tab', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setUploadTab('web');
      });

      expect(result.current.uploadTab).toBe('web');
    });

    it('updates web page URL', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setWebPageUrl('https://example.com');
      });

      expect(result.current.webPageUrl).toBe('https://example.com');
    });

    it('updates web page name', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setWebPageName('Example Page');
      });

      expect(result.current.webPageName).toBe('Example Page');
    });
  });

  describe('folder state', () => {
    it('updates new folder name', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setNewFolderName('New Folder');
      });

      expect(result.current.newFolderName).toBe('New Folder');
    });

    it('navigates to folder', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setCurrentFolderId('folder-1');
      });

      expect(result.current.currentFolderId).toBe('folder-1');
    });
  });

  describe('pagination', () => {
    it('initializes with page 1', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      expect(result.current.currentPage).toBe(1);
    });

    it('changes current page', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('changes items per page', async () => {
      const { result } = renderHook(() =>
        useMediaLibrary({ showToast: mockShowToast })
      );

      act(() => {
        result.current.setItemsPerPage(50);
      });

      expect(result.current.itemsPerPage).toBe(50);
    });
  });
});

// ============================================================================
// Barrel Export Tests
// ============================================================================

describe('Page Hooks Barrel Export', () => {
  it('exports all 5 hooks from index', async () => {
    const hooks = await import('../../../../src/pages/hooks/index.js');

    expect(hooks.useFeatureFlags).toBeDefined();
    expect(hooks.useCampaignEditor).toBeDefined();
    expect(hooks.usePlaylistEditor).toBeDefined();
    expect(hooks.useScreensData).toBeDefined();
    expect(hooks.useMediaLibrary).toBeDefined();
  });

  it('exports are functions', async () => {
    const hooks = await import('../../../../src/pages/hooks/index.js');

    expect(typeof hooks.useFeatureFlags).toBe('function');
    expect(typeof hooks.useCampaignEditor).toBe('function');
    expect(typeof hooks.usePlaylistEditor).toBe('function');
    expect(typeof hooks.useScreensData).toBe('function');
    expect(typeof hooks.useMediaLibrary).toBe('function');
  });
});
