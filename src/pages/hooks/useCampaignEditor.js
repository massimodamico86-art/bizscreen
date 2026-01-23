import { useState, useEffect, useCallback } from 'react';
import { createScopedLogger } from '../../services/loggingService.js';
import {
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  activateCampaign,
  pauseCampaign,
  addTarget,
  removeTarget,
  addContent,
  removeContent,
  CAMPAIGN_STATUS
} from '../../services/campaignService.js';
import { fetchScreenGroups } from '../../services/screenGroupService.js';
import { fetchLocations } from '../../services/locationService.js';
import { fetchPlaylists } from '../../services/playlistService.js';
import { fetchLayouts } from '../../services/layoutService.js';
import { supabase } from '../../supabase.js';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft
} from '../../services/approvalService.js';
import {
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  revokePreviewLink,
  formatPreviewLink
} from '../../services/previewService.js';

const logger = createScopedLogger('useCampaignEditor');

/**
 * Format date string to datetime-local input value
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted string for datetime-local input
 */
function formatDateTimeLocal(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 16);
}

/**
 * Custom hook for CampaignEditorPage state and logic
 * @param {string} campaignId - Campaign ID from route params ('new' for new campaigns)
 * @param {Object} options - Hook options
 * @param {Function} options.showToast - Toast notification function
 * @returns {Object} Campaign editor state and actions
 */
export function useCampaignEditor(campaignId, { showToast }) {
  const isNew = campaignId === 'new';

  // Campaign state
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    status: CAMPAIGN_STATUS.DRAFT,
    start_at: '',
    end_at: '',
    priority: 100,
    targets: [],
    contents: []
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Picker data
  const [screens, setScreens] = useState([]);
  const [screenGroups, setScreenGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);

  // Picker modals
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showContentPicker, setShowContentPicker] = useState(false);

  // Approval state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLinks, setPreviewLinks] = useState([]);
  const [loadingPreviewLinks, setLoadingPreviewLinks] = useState(false);
  const [creatingPreviewLink, setCreatingPreviewLink] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState('7_days');
  const [allowComments, setAllowComments] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Load campaign data
  const loadCampaign = useCallback(async () => {
    if (isNew) return;
    try {
      setLoading(true);
      const data = await getCampaign(campaignId);
      setCampaign({
        ...data,
        start_at: data.start_at ? formatDateTimeLocal(data.start_at) : '',
        end_at: data.end_at ? formatDateTimeLocal(data.end_at) : ''
      });
    } catch (error) {
      logger.error('Failed to load campaign', { campaignId, error });
      showToast?.('Error loading campaign', 'error');
      throw error; // Let page handle navigation
    } finally {
      setLoading(false);
    }
  }, [campaignId, isNew, showToast]);

  // Load picker data
  const loadPickerData = useCallback(async () => {
    try {
      const [screensRes, groupsRes, locsRes, playlistsRes, layoutsRes] = await Promise.all([
        supabase.from('tv_devices').select('id, name, location_id').order('name'),
        fetchScreenGroups(),
        fetchLocations(),
        fetchPlaylists(),
        fetchLayouts()
      ]);

      setScreens(screensRes.data || []);
      setScreenGroups(groupsRes || []);
      setLocations(locsRes || []);
      setPlaylists(playlistsRes || []);
      setLayouts(layoutsRes.data || []);
    } catch (error) {
      logger.error('Failed to load picker data', { error });
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadPickerData();
    if (!isNew) {
      loadCampaign();
    }
  }, [campaignId, isNew, loadCampaign, loadPickerData]);

  // Fetch current review request
  const fetchCurrentReview = useCallback(async () => {
    if (isNew) return;
    try {
      const review = await getOpenReviewForResource('campaign', campaignId);
      setCurrentReview(review);
    } catch (error) {
      logger.error('Failed to fetch review', { campaignId, error });
    }
  }, [campaignId, isNew]);

  // Fetch review on campaign load
  useEffect(() => {
    if (campaign?.id || (!isNew && campaignId)) {
      fetchCurrentReview();
    }
  }, [campaign?.id, campaignId, isNew, fetchCurrentReview]);

  // Field change handler
  const handleChange = useCallback((field, value) => {
    setCampaign(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Save campaign
  const handleSave = useCallback(async (navigate) => {
    if (!campaign.name?.trim()) {
      showToast?.('Campaign name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        name: campaign.name.trim(),
        description: campaign.description?.trim() || '',
        status: campaign.status,
        startAt: campaign.start_at ? new Date(campaign.start_at).toISOString() : null,
        endAt: campaign.end_at ? new Date(campaign.end_at).toISOString() : null,
        priority: campaign.priority
      };

      if (isNew) {
        const created = await createCampaign(saveData);
        showToast?.('Campaign created');
        navigate(`/app/campaigns/${created.id}`);
      } else {
        await updateCampaign(campaignId, saveData);
        showToast?.('Campaign saved');
        setHasChanges(false);
      }
    } catch (error) {
      logger.error('Failed to save campaign', { campaignId, isNew, campaignName: campaign.name, error });
      showToast?.('Error saving campaign: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [campaign, campaignId, isNew, showToast]);

  // Delete campaign
  const handleDelete = useCallback(async (navigate) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;

    try {
      await deleteCampaign(campaignId);
      showToast?.('Campaign deleted');
      navigate('/app/campaigns');
    } catch (error) {
      logger.error('Failed to delete campaign', { campaignId, error });
      showToast?.('Error deleting campaign: ' + error.message, 'error');
    }
  }, [campaignId, showToast]);

  // Activate campaign
  const handleActivate = useCallback(async () => {
    // Validate
    if (!campaign.targets || campaign.targets.length === 0) {
      showToast?.('Add at least one target before activating', 'error');
      return;
    }
    if (!campaign.contents || campaign.contents.length === 0) {
      showToast?.('Add at least one content item before activating', 'error');
      return;
    }

    try {
      await activateCampaign(campaignId);
      showToast?.('Campaign activated');
      loadCampaign();
    } catch (error) {
      logger.error('Failed to activate campaign', { campaignId, error });
      showToast?.('Error activating campaign: ' + error.message, 'error');
    }
  }, [campaign.targets, campaign.contents, campaignId, showToast, loadCampaign]);

  // Pause campaign
  const handlePause = useCallback(async () => {
    try {
      await pauseCampaign(campaignId);
      showToast?.('Campaign paused');
      loadCampaign();
    } catch (error) {
      logger.error('Failed to pause campaign', { campaignId, error });
      showToast?.('Error pausing campaign: ' + error.message, 'error');
    }
  }, [campaignId, showToast, loadCampaign]);

  // Target management
  const handleAddTarget = useCallback(async (targetType, targetId = null) => {
    if (isNew) {
      showToast?.('Save campaign first before adding targets', 'error');
      return;
    }

    try {
      await addTarget(campaignId, targetType, targetId);
      showToast?.('Target added');
      loadCampaign();
    } catch (error) {
      logger.error('Failed to add target', { campaignId, targetType, targetId, error });
      showToast?.('Error adding target: ' + error.message, 'error');
    }
  }, [campaignId, isNew, showToast, loadCampaign]);

  const handleRemoveTarget = useCallback(async (targetId) => {
    try {
      await removeTarget(targetId);
      setCampaign(prev => ({
        ...prev,
        targets: prev.targets.filter(t => t.id !== targetId)
      }));
      showToast?.('Target removed');
    } catch (error) {
      logger.error('Failed to remove target', { targetId, error });
      showToast?.('Error removing target: ' + error.message, 'error');
    }
  }, [showToast]);

  // Content management
  const handleAddContent = useCallback(async (contentType, contentId) => {
    if (isNew) {
      showToast?.('Save campaign first before adding content', 'error');
      return;
    }

    try {
      await addContent(campaignId, contentType, contentId);
      showToast?.('Content added');
      loadCampaign();
    } catch (error) {
      logger.error('Failed to add content', { campaignId, contentType, contentId, error });
      showToast?.('Error adding content: ' + error.message, 'error');
    }
  }, [campaignId, isNew, showToast, loadCampaign]);

  const handleRemoveContent = useCallback(async (contentId) => {
    try {
      await removeContent(contentId);
      setCampaign(prev => ({
        ...prev,
        contents: prev.contents.filter(c => c.id !== contentId)
      }));
      showToast?.('Content removed');
    } catch (error) {
      logger.error('Failed to remove content', { contentId, error });
      showToast?.('Error removing content: ' + error.message, 'error');
    }
  }, [showToast]);

  // Approval handlers
  const handleSubmitForApproval = useCallback(async () => {
    try {
      setSubmittingApproval(true);
      await requestApproval({
        resourceType: 'campaign',
        resourceId: campaignId,
        title: `Review request for campaign: ${campaign.name}`,
        message: approvalMessage || undefined
      });
      showToast?.('Approval requested successfully');
      setShowApprovalModal(false);
      setApprovalMessage('');
      await loadCampaign();
      await fetchCurrentReview();
    } catch (error) {
      logger.error('Failed to request approval', { campaignId, campaignName: campaign.name, error });
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  }, [campaignId, campaign.name, approvalMessage, showToast, loadCampaign, fetchCurrentReview]);

  const handleRevertToDraft = useCallback(async () => {
    if (!window.confirm('Revert this campaign to draft status? This will cancel any pending reviews.')) return;
    try {
      await revertToDraft('campaign', campaignId);
      showToast?.('Reverted to draft');
      await loadCampaign();
      setCurrentReview(null);
    } catch (error) {
      logger.error('Failed to revert to draft', { campaignId, error });
      showToast?.(error.message || 'Error reverting to draft', 'error');
    }
  }, [campaignId, showToast, loadCampaign]);

  // Preview link handlers
  const loadPreviewLinks = useCallback(async () => {
    if (isNew) return;
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('campaign', campaignId);
      setPreviewLinks(links);
    } catch (error) {
      logger.error('Failed to fetch preview links', { campaignId, error });
    } finally {
      setLoadingPreviewLinks(false);
    }
  }, [campaignId, isNew]);

  const handleCreatePreviewLink = useCallback(async () => {
    try {
      setCreatingPreviewLink(true);
      await createPreviewLinkWithPreset({
        resourceType: 'campaign',
        resourceId: campaignId,
        expiryPreset: selectedExpiry,
        allowComments
      });
      showToast?.('Preview link created');
      await loadPreviewLinks();
    } catch (error) {
      logger.error('Failed to create preview link', { campaignId, expiryPreset: selectedExpiry, error });
      showToast?.(error.message || 'Error creating preview link', 'error');
    } finally {
      setCreatingPreviewLink(false);
    }
  }, [campaignId, selectedExpiry, allowComments, showToast, loadPreviewLinks]);

  const handleRevokePreviewLink = useCallback(async (linkId) => {
    if (!window.confirm('Revoke this preview link? It will no longer work.')) return;
    try {
      await revokePreviewLink(linkId);
      showToast?.('Preview link revoked');
      await loadPreviewLinks();
    } catch (error) {
      logger.error('Failed to revoke preview link', { linkId, error });
      showToast?.(error.message || 'Error revoking link', 'error');
    }
  }, [showToast, loadPreviewLinks]);

  const handleCopyLink = useCallback(async (link) => {
    try {
      const url = formatPreviewLink(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast?.('Link copied to clipboard');
    } catch (error) {
      showToast?.('Failed to copy link', 'error');
    }
  }, [showToast]);

  return {
    // Campaign state
    campaign,
    setCampaign,
    loading,
    saving,
    hasChanges,
    isNew,

    // Picker data
    screens,
    screenGroups,
    locations,
    playlists,
    layouts,
    showTargetPicker,
    setShowTargetPicker,
    showContentPicker,
    setShowContentPicker,

    // Approval state
    showApprovalModal,
    setShowApprovalModal,
    approvalMessage,
    setApprovalMessage,
    submittingApproval,
    currentReview,

    // Preview state
    showPreviewModal,
    setShowPreviewModal,
    previewLinks,
    loadingPreviewLinks,
    creatingPreviewLink,
    selectedExpiry,
    setSelectedExpiry,
    allowComments,
    setAllowComments,
    copiedLinkId,

    // Actions
    handleChange,
    handleSave,
    handleDelete,
    handleActivate,
    handlePause,
    handleAddTarget,
    handleRemoveTarget,
    handleAddContent,
    handleRemoveContent,
    handleSubmitForApproval,
    handleRevertToDraft,
    loadPreviewLinks,
    handleCreatePreviewLink,
    handleRevokePreviewLink,
    handleCopyLink
  };
}

export default useCampaignEditor;
