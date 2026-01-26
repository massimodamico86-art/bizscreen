import { useState } from 'react';
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
  Info,
  Send,
  Link2,
  XCircle,
  FileEdit,
  Copy,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, Input } from '../design-system';
import { CAMPAIGN_STATUS } from '../services/campaignService';
import { canEditContent, canEditScreens } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import { getApprovalStatusConfig } from '../services/approvalService';
import { useCampaignEditor } from './hooks';
import {
  TargetPickerModal,
  ContentPickerModal,
  ApprovalRequestModal,
  PreviewLinksModal,
} from './components/CampaignEditorComponents';
import { CampaignAnalyticsCard } from '../components/analytics/CampaignAnalyticsCard';
import { SeasonalDatePicker } from '../components/campaigns/SeasonalDatePicker';
import { RotationControls } from '../components/campaigns/RotationControls';
import { FrequencyLimitControls } from '../components/campaigns/FrequencyLimitControls';
import { saveAsTemplate, setSeasonalRecurrence } from '../services/campaignTemplateService';

const CampaignEditorPage = ({ showToast }) => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use the campaign editor hook for all state and logic
  const {
    campaign,
    loading,
    saving,
    isNew,
    screens,
    screenGroups,
    locations,
    playlists,
    layouts,
    showTargetPicker,
    setShowTargetPicker,
    showContentPicker,
    setShowContentPicker,
    showApprovalModal,
    setShowApprovalModal,
    approvalMessage,
    setApprovalMessage,
    submittingApproval,
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
    handleCopyLink,
    analytics,
    analyticsLoading,
    analyticsDateRange,
    handleAnalyticsDateRangeChange,
    rotationMode,
    savingRotation,
    expandedContentId,
    handleRotationChange,
    handleRotationModeChange,
    handleFrequencyChange,
    handleToggleContentSettings,
  } = useCampaignEditor(campaignId, { showToast });

  // Permissions
  const canEdit = canEditContent(user) && canEditScreens(user);

  // Template modal state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Handle save as template
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      showToast?.('Template name is required', 'error');
      return;
    }
    try {
      setSavingTemplate(true);
      await saveAsTemplate(campaignId, templateName.trim(), templateDescription.trim());
      showToast?.('Template saved successfully');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      showToast?.('Error saving template: ' + error.message, 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Handle seasonal recurrence change
  const handleSeasonalChange = async (recurrenceRule) => {
    try {
      await setSeasonalRecurrence(campaignId, recurrenceRule);
      handleChange('recurrence_rule', recurrenceRule);
      showToast?.(recurrenceRule ? 'Seasonal recurrence saved' : 'Seasonal recurrence cleared');
    } catch (error) {
      showToast?.('Error saving recurrence: ' + error.message, 'error');
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

  // Open preview modal
  const handleOpenPreviewModal = () => {
    setShowPreviewModal(true);
    loadPreviewLinks();
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
          {!isNew && canEdit && (
            <Button variant="outline" onClick={() => setShowSaveTemplateModal(true)}>
              <Copy size={18} />
              Save as Template
            </Button>
          )}
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
              <Button variant="outline" onClick={() => handleDelete(navigate)} className="text-red-600 hover:bg-red-50">
                <Trash2 size={18} />
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={() => handleSave(navigate)} disabled={saving}>
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

              {/* Seasonal Recurrence */}
              {!isNew && (
                <div className="pt-4 border-t border-gray-200">
                  <SeasonalDatePicker
                    value={campaign.recurrence_rule}
                    onChange={handleSeasonalChange}
                    disabled={!canEdit}
                  />
                </div>
              )}
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
              <div className="space-y-4">
                {/* Content list with expandable settings */}
                <div className="space-y-2">
                  {campaign.contents.map(content => (
                    <div key={content.id} className="bg-gray-50 rounded-lg overflow-hidden">
                      {/* Content row */}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {content.content_type === 'playlist' && <ListMusic size={18} className="text-blue-600" />}
                          {content.content_type === 'layout' && <Layout size={18} className="text-purple-600" />}
                          {content.content_type === 'media' && <Image size={18} className="text-green-600" />}
                          <div>
                            <p className="font-medium text-gray-900">{content.content_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{content.content_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleToggleContentSettings(content.id)}
                              className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                              title="Content settings"
                            >
                              <Settings size={16} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveContent(content.id)}
                              className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
                              title="Remove content"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable frequency settings */}
                      {expandedContentId === content.id && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-200 bg-white">
                          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                            <Settings size={14} />
                            Frequency Limits
                          </div>
                          <FrequencyLimitControls
                            content={content}
                            onChange={(updated) => handleFrequencyChange(content.id, {
                              max_plays_per_hour: updated.max_plays_per_hour,
                              max_plays_per_day: updated.max_plays_per_day
                            })}
                            disabled={!canEdit}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rotation controls - show when 2+ contents */}
                {campaign.contents.length >= 2 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Content Rotation</h3>
                    <RotationControls
                      contents={campaign.contents}
                      mode={rotationMode}
                      onChange={handleRotationChange}
                      onModeChange={handleRotationModeChange}
                    />
                    {savingRotation && (
                      <p className="text-xs text-gray-500 mt-2">Saving rotation settings...</p>
                    )}
                  </div>
                )}
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

          {/* Campaign Analytics Card */}
          {!isNew && (
            <CampaignAnalyticsCard
              analytics={analytics}
              dateRange={analyticsDateRange}
              onDateRangeChange={handleAnalyticsDateRangeChange}
              loading={analyticsLoading}
            />
          )}

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
      <ApprovalRequestModal
        showApprovalModal={showApprovalModal}
        setShowApprovalModal={setShowApprovalModal}
        approvalMessage={approvalMessage}
        setApprovalMessage={setApprovalMessage}
        submittingApproval={submittingApproval}
        handleSubmitForApproval={handleSubmitForApproval}
      />

      {/* Preview Links Modal */}
      <PreviewLinksModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewLinks={previewLinks}
        loadingPreviewLinks={loadingPreviewLinks}
        creatingPreviewLink={creatingPreviewLink}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
        allowComments={allowComments}
        setAllowComments={setAllowComments}
        copiedLinkId={copiedLinkId}
        handleCreatePreviewLink={handleCreatePreviewLink}
        handleRevokePreviewLink={handleRevokePreviewLink}
        handleCopyLink={handleCopyLink}
      />

      {/* Save as Template Modal */}
      <Modal open={showSaveTemplateModal} onClose={() => setShowSaveTemplateModal(false)} size="md">
        <ModalHeader>
          <ModalTitle>Save as Template</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Holiday Promotion"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="What is this template for?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-700 mb-1">Template will include:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Target types ({campaign.targets?.length || 0} target slot{campaign.targets?.length !== 1 ? 's' : ''})</li>
                <li>Content types ({campaign.contents?.length || 0} content slot{campaign.contents?.length !== 1 ? 's' : ''})</li>
                <li>Priority setting ({campaign.priority})</li>
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                Note: Specific targets and content are not saved - only the structure.
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSaveTemplateModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CampaignEditorPage;
