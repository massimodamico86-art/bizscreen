import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Trash2,
  Plus,
  X,
  Target,
  Monitor,
  Users,
  MapPin,
  Globe,
  Layout,
  ListMusic,
  Image,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Megaphone,
  Info,
  Send,
  Link2,
  Copy,
  ExternalLink,
  XCircle,
  FileEdit,
  MessageSquare,
  Check,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge } from '../design-system';
import { useTranslation } from '../i18n';
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
  CAMPAIGN_STATUS,
  TARGET_TYPES,
  CONTENT_TYPES
} from '../services/campaignService';
import { fetchScreenGroups } from '../services/screenGroupService';
import { fetchLocations } from '../services/locationService';
import { fetchPlaylists } from '../services/playlistService';
import { fetchLayouts } from '../services/layoutService';
import { supabase } from '../supabase';
import { canEditContent, canEditScreens } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft,
  getApprovalStatusConfig,
} from '../services/approvalService';
import {
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  revokePreviewLink,
  formatPreviewLink,
  EXPIRY_PRESETS,
  getExpiryLabel,
} from '../services/previewService';

const CampaignEditorPage = ({ showToast }) => {
  const { t } = useTranslation();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Approval & Preview state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLinks, setPreviewLinks] = useState([]);
  const [loadingPreviewLinks, setLoadingPreviewLinks] = useState(false);
  const [creatingPreviewLink, setCreatingPreviewLink] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState('7_days');
  const [allowComments, setAllowComments] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Permissions
  const canEdit = canEditContent(user) && canEditScreens(user);

  // Load campaign data
  useEffect(() => {
    loadPickerData();
    if (!isNew) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const data = await getCampaign(campaignId);
      setCampaign({
        ...data,
        start_at: data.start_at ? formatDateTimeLocal(data.start_at) : '',
        end_at: data.end_at ? formatDateTimeLocal(data.end_at) : ''
      });
    } catch (error) {
      console.error('Error loading campaign:', error);
      showToast?.('Error loading campaign', 'error');
      navigate('/app/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadPickerData = async () => {
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
      console.error('Error loading picker data:', error);
    }
  };

  const formatDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const handleChange = (field, value) => {
    setCampaign(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
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
      console.error('Error saving campaign:', error);
      showToast?.('Error saving campaign: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;

    try {
      await deleteCampaign(campaignId);
      showToast?.('Campaign deleted');
      navigate('/app/campaigns');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showToast?.('Error deleting campaign: ' + error.message, 'error');
    }
  };

  const handleActivate = async () => {
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
      console.error('Error activating campaign:', error);
      showToast?.('Error activating campaign: ' + error.message, 'error');
    }
  };

  const handlePause = async () => {
    try {
      await pauseCampaign(campaignId);
      showToast?.('Campaign paused');
      loadCampaign();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      showToast?.('Error pausing campaign: ' + error.message, 'error');
    }
  };

  // Target management
  const handleAddTarget = async (targetType, targetId = null) => {
    if (isNew) {
      showToast?.('Save campaign first before adding targets', 'error');
      return;
    }

    try {
      await addTarget(campaignId, targetType, targetId);
      showToast?.('Target added');
      loadCampaign();
    } catch (error) {
      console.error('Error adding target:', error);
      showToast?.('Error adding target: ' + error.message, 'error');
    }
  };

  const handleRemoveTarget = async (targetId) => {
    try {
      await removeTarget(targetId);
      setCampaign(prev => ({
        ...prev,
        targets: prev.targets.filter(t => t.id !== targetId)
      }));
      showToast?.('Target removed');
    } catch (error) {
      console.error('Error removing target:', error);
      showToast?.('Error removing target: ' + error.message, 'error');
    }
  };

  // Content management
  const handleAddContent = async (contentType, contentId) => {
    if (isNew) {
      showToast?.('Save campaign first before adding content', 'error');
      return;
    }

    try {
      await addContent(campaignId, contentType, contentId);
      showToast?.('Content added');
      loadCampaign();
    } catch (error) {
      console.error('Error adding content:', error);
      showToast?.('Error adding content: ' + error.message, 'error');
    }
  };

  const handleRemoveContent = async (contentId) => {
    try {
      await removeContent(contentId);
      setCampaign(prev => ({
        ...prev,
        contents: prev.contents.filter(c => c.id !== contentId)
      }));
      showToast?.('Content removed');
    } catch (error) {
      console.error('Error removing content:', error);
      showToast?.('Error removing content: ' + error.message, 'error');
    }
  };

  // Get status badge config
  const getStatusBadge = () => {
    const configs = {
      [CAMPAIGN_STATUS.DRAFT]: { color: 'gray', label: 'Draft' },
      [CAMPAIGN_STATUS.SCHEDULED]: { color: 'blue', label: 'Scheduled' },
      [CAMPAIGN_STATUS.ACTIVE]: { color: 'green', label: 'Active' },
      [CAMPAIGN_STATUS.COMPLETED]: { color: 'gray', label: 'Completed' },
      [CAMPAIGN_STATUS.PAUSED]: { color: 'yellow', label: 'Paused' }
    };
    return configs[campaign.status] || configs.draft;
  };

  // Calculate summary stats
  const getTargetSummary = () => {
    const targets = campaign.targets || [];
    const screenCount = targets.filter(t => t.target_type === 'screen').length;
    const groupCount = targets.filter(t => t.target_type === 'screen_group').length;
    const locationCount = targets.filter(t => t.target_type === 'location').length;
    const hasAll = targets.some(t => t.target_type === 'all');

    if (hasAll) return 'All screens';
    const parts = [];
    if (screenCount > 0) parts.push(`${screenCount} screen${screenCount > 1 ? 's' : ''}`);
    if (groupCount > 0) parts.push(`${groupCount} group${groupCount > 1 ? 's' : ''}`);
    if (locationCount > 0) parts.push(`${locationCount} location${locationCount > 1 ? 's' : ''}`);
    return parts.join(', ') || 'No targets';
  };

  // Fetch current review request for this campaign
  const fetchCurrentReview = async () => {
    if (isNew) return;
    try {
      const review = await getOpenReviewForResource('campaign', campaignId);
      setCurrentReview(review);
    } catch (error) {
      console.error('Error fetching review:', error);
    }
  };

  // Fetch on campaign load
  useEffect(() => {
    if (campaign?.id || (!isNew && campaignId)) {
      fetchCurrentReview();
    }
  }, [campaign?.id, campaignId, isNew]);

  // Request approval handler
  const handleRequestApproval = async () => {
    try {
      setSubmittingApproval(true);
      await requestApproval({
        resourceType: 'campaign',
        resourceId: campaignId,
        title: `Review request for campaign: ${campaign.name}`,
        message: approvalMessage || undefined,
      });
      showToast?.('Approval requested successfully');
      setShowApprovalModal(false);
      setApprovalMessage('');
      await loadCampaign();
      await fetchCurrentReview();
    } catch (error) {
      console.error('Error requesting approval:', error);
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Revert to draft handler
  const handleRevertToDraft = async () => {
    if (!window.confirm('Revert this campaign to draft status? This will cancel any pending reviews.')) return;
    try {
      await revertToDraft('campaign', campaignId);
      showToast?.('Reverted to draft');
      await loadCampaign();
      setCurrentReview(null);
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showToast?.(error.message || 'Error reverting to draft', 'error');
    }
  };

  // Fetch preview links
  const fetchPreviewLinks = async () => {
    if (isNew) return;
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('campaign', campaignId);
      setPreviewLinks(links);
    } catch (error) {
      console.error('Error fetching preview links:', error);
    } finally {
      setLoadingPreviewLinks(false);
    }
  };

  // Open preview modal
  const handleOpenPreviewModal = () => {
    setShowPreviewModal(true);
    fetchPreviewLinks();
  };

  // Create preview link
  const handleCreatePreviewLink = async () => {
    try {
      setCreatingPreviewLink(true);
      await createPreviewLinkWithPreset({
        resourceType: 'campaign',
        resourceId: campaignId,
        expiryPreset: selectedExpiry,
        allowComments,
      });
      showToast?.('Preview link created');
      await fetchPreviewLinks();
    } catch (error) {
      console.error('Error creating preview link:', error);
      showToast?.(error.message || 'Error creating preview link', 'error');
    } finally {
      setCreatingPreviewLink(false);
    }
  };

  // Revoke preview link
  const handleRevokePreviewLink = async (linkId) => {
    if (!window.confirm('Revoke this preview link? It will no longer work.')) return;
    try {
      await revokePreviewLink(linkId);
      showToast?.('Preview link revoked');
      await fetchPreviewLinks();
    } catch (error) {
      console.error('Error revoking preview link:', error);
      showToast?.(error.message || 'Error revoking link', 'error');
    }
  };

  // Copy preview link
  const handleCopyLink = async (link) => {
    try {
      const url = formatPreviewLink(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast?.('Link copied to clipboard');
    } catch (error) {
      showToast?.('Failed to copy link', 'error');
    }
  };

  // Get approval status config
  const approvalConfig = campaign?.approval_status
    ? getApprovalStatusConfig(campaign.approval_status)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/campaigns')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {isNew ? 'New Campaign' : campaign.name}
              </h1>
              {!isNew && (
                <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
              )}
              {/* Approval Status Badge */}
              {!isNew && approvalConfig && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${approvalConfig.bgColor} ${approvalConfig.textColor}`}
                >
                  {approvalConfig.icon === 'FileEdit' && <FileEdit size={12} />}
                  {approvalConfig.icon === 'Clock' && <Clock size={12} />}
                  {approvalConfig.icon === 'CheckCircle' && <CheckCircle size={12} />}
                  {approvalConfig.icon === 'XCircle' && <XCircle size={12} />}
                  {approvalConfig.label}
                </span>
              )}
            </div>
            {!isNew && campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleOpenPreviewModal}>
              <Link2 size={18} />
              Preview Link
            </Button>
          )}
          {/* Show Request Approval only for draft or rejected */}
          {!isNew && (!campaign.approval_status || campaign.approval_status === 'draft' || campaign.approval_status === 'rejected') && (
            <Button variant="outline" onClick={() => setShowApprovalModal(true)}>
              <Send size={18} />
              Request Approval
            </Button>
          )}
          {/* Show Revert to Draft for in_review or approved */}
          {!isNew && (campaign.approval_status === 'in_review' || campaign.approval_status === 'approved') && (
            <Button variant="outline" onClick={handleRevertToDraft}>
              <FileEdit size={18} />
              Edit Draft
            </Button>
          )}
          {!isNew && canEdit && (
            <>
              {campaign.status === CAMPAIGN_STATUS.ACTIVE ? (
                <Button variant="outline" onClick={handlePause}>
                  <Pause size={18} />
                  Pause
                </Button>
              ) : campaign.status !== CAMPAIGN_STATUS.COMPLETED && (
                <Button variant="outline" onClick={handleActivate}>
                  <Play size={18} />
                  Activate
                </Button>
              )}
              <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                <Trash2 size={18} />
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Campaign Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaign.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Black Friday 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={campaign.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="What is this campaign for?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={!canEdit}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={campaign.start_at}
                    onChange={(e) => handleChange('start_at', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to activate manually</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={campaign.end_at}
                    onChange={(e) => handleChange('end_at', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for open-ended</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority: {campaign.priority}
                </label>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={campaign.priority}
                  onChange={(e) => handleChange('priority', parseInt(e.target.value))}
                  className="w-full"
                  disabled={!canEdit}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (50)</span>
                  <span>Normal (100)</span>
                  <span>High (200)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Higher priority campaigns override lower priority content
                </p>
              </div>
            </div>
          </Card>

          {/* Targets */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Targets</h2>
              {canEdit && !isNew && (
                <Button size="sm" onClick={() => setShowTargetPicker(true)}>
                  <Plus size={16} />
                  Add Target
                </Button>
              )}
            </div>

            {isNew ? (
              <div className="text-center py-8 text-gray-500">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                <p>Save campaign first to add targets</p>
              </div>
            ) : campaign.targets?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target size={32} className="mx-auto mb-2 opacity-50" />
                <p>No targets defined</p>
                <p className="text-sm">Add screens, groups, or locations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaign.targets.map(target => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {target.target_type === 'screen' && <Monitor size={18} className="text-blue-600" />}
                      {target.target_type === 'screen_group' && <Users size={18} className="text-purple-600" />}
                      {target.target_type === 'location' && <MapPin size={18} className="text-green-600" />}
                      {target.target_type === 'all' && <Globe size={18} className="text-orange-600" />}
                      <div>
                        <p className="font-medium text-gray-900">{target.target_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{target.target_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveTarget(target.id)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Content */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Content</h2>
              {canEdit && !isNew && (
                <Button size="sm" onClick={() => setShowContentPicker(true)}>
                  <Plus size={16} />
                  Add Content
                </Button>
              )}
            </div>

            {isNew ? (
              <div className="text-center py-8 text-gray-500">
                <ListMusic size={32} className="mx-auto mb-2 opacity-50" />
                <p>Save campaign first to add content</p>
              </div>
            ) : campaign.contents?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ListMusic size={32} className="mx-auto mb-2 opacity-50" />
                <p>No content defined</p>
                <p className="text-sm">Add playlists or layouts to play</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaign.contents.map(content => (
                  <div
                    key={content.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {content.content_type === 'playlist' && <ListMusic size={18} className="text-blue-600" />}
                      {content.content_type === 'layout' && <Layout size={18} className="text-purple-600" />}
                      {content.content_type === 'media' && <Image size={18} className="text-green-600" />}
                      <div>
                        <p className="font-medium text-gray-900">{content.content_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{content.content_type}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveContent(content.id)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Schedule</p>
                  <p className="text-sm text-gray-600">
                    {campaign.start_at ? new Date(campaign.start_at).toLocaleString() : 'Not scheduled'}
                    {campaign.end_at && (
                      <>
                        <br />
                        <span className="text-gray-400">to </span>
                        {new Date(campaign.end_at).toLocaleString()}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Targets</p>
                  <p className="text-sm text-gray-600">{getTargetSummary()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ListMusic size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Content</p>
                  <p className="text-sm text-gray-600">
                    {campaign.contents?.length || 0} item{campaign.contents?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Validation Card */}
          {!isNew && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Validation</h3>
              <div className="space-y-3">
                {/* Check targets */}
                <div className={`flex items-center gap-2 ${campaign.targets?.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {campaign.targets?.length > 0 ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="text-sm">
                    {campaign.targets?.length > 0 ? 'Has targets' : 'No targets defined'}
                  </span>
                </div>

                {/* Check content */}
                <div className={`flex items-center gap-2 ${campaign.contents?.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {campaign.contents?.length > 0 ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="text-sm">
                    {campaign.contents?.length > 0 ? 'Has content' : 'No content defined'}
                  </span>
                </div>

                {/* Check dates */}
                {campaign.end_at && new Date(campaign.end_at) < new Date() && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle size={18} />
                    <span className="text-sm">End date is in the past</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Help Card */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">How Campaigns Work</p>
                <p className="text-sm text-blue-700 mt-1">
                  Campaigns override normal schedules when active. Higher priority campaigns
                  take precedence. Content plays on all targeted screens during the campaign window.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Target Picker Modal */}
      {showTargetPicker && (
        <TargetPickerModal
          screens={screens}
          screenGroups={screenGroups}
          locations={locations}
          existingTargets={campaign.targets || []}
          onSelect={(type, id) => {
            handleAddTarget(type, id);
            setShowTargetPicker(false);
          }}
          onClose={() => setShowTargetPicker(false)}
        />
      )}

      {/* Content Picker Modal */}
      {showContentPicker && (
        <ContentPickerModal
          playlists={playlists}
          layouts={layouts}
          existingContents={campaign.contents || []}
          onSelect={(type, id) => {
            handleAddContent(type, id);
            setShowContentPicker(false);
          }}
          onClose={() => setShowContentPicker(false)}
        />
      )}

      {/* Request Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Send size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Request Approval</h2>
                  <p className="text-sm text-gray-500">Submit for review</p>
                </div>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="Add any notes for the reviewer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    This will change the campaign status to "In Review" and notify reviewers.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestApproval} disabled={submittingApproval}>
                {submittingApproval ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Request Approval
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Links Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Link2 size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Preview Links</h2>
                  <p className="text-sm text-gray-500">Share this campaign for review</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Create new link */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Create New Link</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires in
                    </label>
                    <select
                      value={selectedExpiry}
                      onChange={(e) => setSelectedExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.entries(EXPIRY_PRESETS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {getExpiryLabel(key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Allow comments</span>
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleCreatePreviewLink}
                  disabled={creatingPreviewLink}
                  className="w-full"
                >
                  {creatingPreviewLink ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Create Preview Link
                    </>
                  )}
                </Button>
              </div>

              {/* Existing links */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Active Links</h3>
                {loadingPreviewLinks ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading links...</p>
                  </div>
                ) : previewLinks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No preview links yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previewLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-0.5 rounded truncate max-w-[200px]">
                              {link.token}
                            </code>
                            {link.allow_comments && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <MessageSquare size={10} />
                                Comments
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            Expires: {new Date(link.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy link"
                          >
                            {copiedLinkId === link.id ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} className="text-gray-500" />
                            )}
                          </button>
                          <a
                            href={formatPreviewLink(link.token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Open preview"
                          >
                            <ExternalLink size={16} className="text-gray-500" />
                          </a>
                          <button
                            onClick={() => handleRevokePreviewLink(link.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Target Picker Modal
function TargetPickerModal({ screens, screenGroups, locations, existingTargets, onSelect, onClose }) {
  const [tab, setTab] = useState('screens');

  const isTargetSelected = (type, id) => {
    return existingTargets.some(t =>
      t.target_type === type && (type === 'all' || t.target_id === id)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add Target</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'screens', label: 'Screens', icon: Monitor },
            { key: 'groups', label: 'Groups', icon: Users },
            { key: 'locations', label: 'Locations', icon: MapPin },
            { key: 'all', label: 'All Screens', icon: Globe }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'screens' && (
            <div className="space-y-2">
              {screens.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No screens available</p>
              ) : (
                screens.map(screen => (
                  <button
                    key={screen.id}
                    onClick={() => !isTargetSelected('screen', screen.id) && onSelect('screen', screen.id)}
                    disabled={isTargetSelected('screen', screen.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('screen', screen.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Monitor size={18} className="text-blue-600" />
                    <span className="font-medium">{screen.name}</span>
                    {isTargetSelected('screen', screen.id) && (
                      <span className="ml-auto text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'groups' && (
            <div className="space-y-2">
              {screenGroups.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No screen groups available</p>
              ) : (
                screenGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => !isTargetSelected('screen_group', group.id) && onSelect('screen_group', group.id)}
                    disabled={isTargetSelected('screen_group', group.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('screen_group', group.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Users size={18} className="text-purple-600" />
                    <div className="flex-1">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({group.screen_count || 0} screens)
                      </span>
                    </div>
                    {isTargetSelected('screen_group', group.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'locations' && (
            <div className="space-y-2">
              {locations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No locations available</p>
              ) : (
                locations.map(location => (
                  <button
                    key={location.id}
                    onClick={() => !isTargetSelected('location', location.id) && onSelect('location', location.id)}
                    disabled={isTargetSelected('location', location.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isTargetSelected('location', location.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <MapPin size={18} className="text-green-600" />
                    <span className="font-medium">{location.name}</span>
                    {isTargetSelected('location', location.id) && (
                      <span className="ml-auto text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'all' && (
            <div className="text-center py-8">
              <Globe size={48} className="mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600 mb-4">
                Target all screens in your account
              </p>
              <Button
                onClick={() => !isTargetSelected('all', null) && onSelect('all', null)}
                disabled={isTargetSelected('all', null)}
              >
                {isTargetSelected('all', null) ? 'Already Added' : 'Add All Screens'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Content Picker Modal
function ContentPickerModal({ playlists, layouts, existingContents, onSelect, onClose }) {
  const [tab, setTab] = useState('playlists');

  const isContentSelected = (type, id) => {
    return existingContents.some(c =>
      c.content_type === type && c.content_id === id
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add Content</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'playlists', label: 'Playlists', icon: ListMusic },
            { key: 'layouts', label: 'Layouts', icon: Layout }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                tab === key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'playlists' && (
            <div className="space-y-2">
              {playlists.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No playlists available</p>
              ) : (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => !isContentSelected('playlist', playlist.id) && onSelect('playlist', playlist.id)}
                    disabled={isContentSelected('playlist', playlist.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isContentSelected('playlist', playlist.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <ListMusic size={18} className="text-blue-600" />
                    <div className="flex-1">
                      <span className="font-medium">{playlist.name}</span>
                      {playlist.description && (
                        <p className="text-sm text-gray-500 truncate">{playlist.description}</p>
                      )}
                    </div>
                    {isContentSelected('playlist', playlist.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'layouts' && (
            <div className="space-y-2">
              {layouts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No layouts available</p>
              ) : (
                layouts.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => !isContentSelected('layout', layout.id) && onSelect('layout', layout.id)}
                    disabled={isContentSelected('layout', layout.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isContentSelected('layout', layout.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Layout size={18} className="text-purple-600" />
                    <div className="flex-1">
                      <span className="font-medium">{layout.name}</span>
                      {layout.template && (
                        <p className="text-sm text-gray-500">{layout.template}</p>
                      )}
                    </div>
                    {isContentSelected('layout', layout.id) && (
                      <span className="text-xs text-gray-400">Already added</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default CampaignEditorPage;
