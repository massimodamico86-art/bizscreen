/**
 * useFeatureFlags - Custom hook for FeatureFlagsPage state management
 *
 * Extracts data fetching, modal state, and CRUD operations from FeatureFlagsPage.
 * Provides a clean interface for managing feature flags, experiments, feedback, and announcements.
 *
 * @module pages/hooks/useFeatureFlags
 */

import { useState, useEffect, useCallback } from 'react';
import { createScopedLogger } from '../../services/loggingService.js';
import {
  getAllFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from '../../services/featureFlagService.js';
import {
  getAllExperiments,
  createExperiment,
  updateExperimentStatus,
  deleteExperiment,
} from '../../services/experimentService.js';
import {
  getAllFeedback,
  updateFeedbackStatus,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/feedbackService.js';

const logger = createScopedLogger('useFeatureFlags');

/**
 * Custom hook for FeatureFlagsPage state management
 *
 * @returns {Object} State and actions for feature flags management
 */
export function useFeatureFlags() {
  // Tab state
  const [activeTab, setActiveTab] = useState('flags');

  // Data state
  const [flags, setFlags] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Loading/error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  /**
   * Load data for the specified tab
   */
  const loadTabData = useCallback(async (tab) => {
    setLoading(true);
    setError('');

    try {
      switch (tab) {
        case 'flags': {
          const flagsData = await getAllFeatureFlags();
          setFlags(flagsData);
          break;
        }
        case 'experiments': {
          const experimentsData = await getAllExperiments();
          setExperiments(experimentsData);
          break;
        }
        case 'feedback': {
          const feedbackData = await getAllFeedback({ limit: 100 });
          setFeedback(feedbackData);
          break;
        }
        case 'announcements': {
          const announcementsData = await getAllAnnouncements();
          setAnnouncements(announcementsData);
          break;
        }
        default:
          // Debug tab - no data to load
          break;
      }
    } catch (err) {
      logger.error('Failed to load tab data', { tab, error: err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on tab change
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  /**
   * Refresh current tab data
   */
  const handleRefresh = useCallback(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // ============================================
  // Feature Flag CRUD Operations
  // ============================================

  /**
   * Create a new feature flag
   */
  const handleCreateFlag = useCallback(async (formData) => {
    try {
      await createFeatureFlag(formData);
      logger.info('Feature flag created', { flagKey: formData.key });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to create flag', { flagKey: formData.key, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Update an existing feature flag
   */
  const handleUpdateFlag = useCallback(async (flagId, formData) => {
    try {
      await updateFeatureFlag(flagId, formData);
      logger.info('Feature flag updated', { flagId });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to update flag', { flagId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Delete a feature flag
   */
  const handleDeleteFlag = useCallback(async (flagId) => {
    try {
      await deleteFeatureFlag(flagId);
      logger.info('Feature flag deleted', { flagId });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to delete flag', { flagId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Toggle a feature flag's enabled state
   */
  const handleToggleFlag = useCallback(async (flag) => {
    try {
      await updateFeatureFlag(flag.id, { defaultEnabled: !flag.default_enabled });
      logger.info('Feature flag toggled', { flagId: flag.id, enabled: !flag.default_enabled });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to toggle flag', { flagId: flag.id, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  // ============================================
  // Experiment CRUD Operations
  // ============================================

  /**
   * Create a new experiment
   */
  const handleCreateExperiment = useCallback(async (formData, variants) => {
    try {
      await createExperiment(formData, variants);
      logger.info('Experiment created', { experimentKey: formData.key });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to create experiment', { experimentKey: formData.key, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Update experiment status
   */
  const handleUpdateExperimentStatus = useCallback(async (experimentId, status) => {
    try {
      await updateExperimentStatus(experimentId, status);
      logger.info('Experiment status updated', { experimentId, status });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to update experiment status', { experimentId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Delete an experiment
   */
  const handleDeleteExperiment = useCallback(async (experimentId) => {
    try {
      await deleteExperiment(experimentId);
      logger.info('Experiment deleted', { experimentId });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to delete experiment', { experimentId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  // ============================================
  // Feedback Operations
  // ============================================

  /**
   * Update feedback status
   */
  const handleUpdateFeedbackStatus = useCallback(async (feedbackId, status) => {
    try {
      await updateFeedbackStatus(feedbackId, status);
      logger.info('Feedback status updated', { feedbackId, status });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to update feedback status', { feedbackId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  // ============================================
  // Announcement CRUD Operations
  // ============================================

  /**
   * Create a new announcement
   */
  const handleCreateAnnouncement = useCallback(async (formData) => {
    try {
      await createAnnouncement(formData);
      logger.info('Announcement created', { title: formData.title });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to create announcement', { title: formData.title, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Update an announcement
   */
  const handleUpdateAnnouncement = useCallback(async (announcementId, formData) => {
    try {
      await updateAnnouncement(announcementId, formData);
      logger.info('Announcement updated', { announcementId });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to update announcement', { announcementId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Delete an announcement
   */
  const handleDeleteAnnouncement = useCallback(async (announcementId) => {
    try {
      await deleteAnnouncement(announcementId);
      logger.info('Announcement deleted', { announcementId });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to delete announcement', { announcementId, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  /**
   * Toggle announcement active state
   */
  const handleToggleAnnouncement = useCallback(async (announcement) => {
    try {
      await updateAnnouncement(announcement.id, { active: !announcement.active });
      logger.info('Announcement toggled', { announcementId: announcement.id, active: !announcement.active });
      handleRefresh();
      return { success: true };
    } catch (err) {
      logger.error('Failed to toggle announcement', { announcementId: announcement.id, error: err });
      return { success: false, error: err.message };
    }
  }, [handleRefresh]);

  // ============================================
  // Clear error helper
  // ============================================

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Data state
    flags,
    experiments,
    feedback,
    announcements,
    loading,
    error,
    clearError,

    // Modal state
    showFlagModal,
    setShowFlagModal,
    showExperimentModal,
    setShowExperimentModal,
    showAnnouncementModal,
    setShowAnnouncementModal,
    editingItem,
    setEditingItem,

    // Actions
    handleRefresh,

    // Flag CRUD
    handleCreateFlag,
    handleUpdateFlag,
    handleDeleteFlag,
    handleToggleFlag,

    // Experiment CRUD
    handleCreateExperiment,
    handleUpdateExperimentStatus,
    handleDeleteExperiment,

    // Feedback
    handleUpdateFeedbackStatus,

    // Announcement CRUD
    handleCreateAnnouncement,
    handleUpdateAnnouncement,
    handleDeleteAnnouncement,
    handleToggleAnnouncement,
  };
}
