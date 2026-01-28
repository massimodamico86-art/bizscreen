import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  FileText,
  Clock,
  CheckCircle,
  Megaphone
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';


import {
  fetchCampaigns,
  deleteCampaign,
  activateCampaign,
  pauseCampaign,
  CAMPAIGN_STATUS
} from '../services/campaignService';
import { canEditContent, canEditScreens } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import { createFromTemplate } from '../services/campaignTemplateService';

const STATUS_CONFIG = {
  [CAMPAIGN_STATUS.DRAFT]: {
    label: 'Draft',
    color: 'gray',
    icon: FileText
  },
  [CAMPAIGN_STATUS.SCHEDULED]: {
    label: 'Scheduled',
    color: 'blue',
    icon: Clock
  },
  [CAMPAIGN_STATUS.ACTIVE]: {
    label: 'Active',
    color: 'green',
    icon: Play
  },
  [CAMPAIGN_STATUS.COMPLETED]: {
    label: 'Completed',
    color: 'gray',
    icon: CheckCircle
  },
  [CAMPAIGN_STATUS.PAUSED]: {
    label: 'Paused',
    color: 'yellow',
    icon: Pause
  }
};

const CampaignsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const logger = useLogger('CampaignsPage');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);

  // Permissions
  const canEdit = canEditContent(user) && canEditScreens(user);

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await fetchCampaigns({
        status: statusFilter || null,
        search
      });
      setCampaigns(data);
    } catch (error) {
      logger.error('Error loading campaigns:', error);
      showToast?.('Error loading campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCampaigns();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;

    try {
      await deleteCampaign(id);
      setCampaigns(campaigns.filter(c => c.id !== id));
      showToast?.('Campaign deleted');
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      showToast?.('Error deleting campaign: ' + error.message, 'error');
    }
    setOpenMenuId(null);
  };

  const handleActivate = async (id) => {
    try {
      await activateCampaign(id);
      showToast?.('Campaign activated');
      loadCampaigns();
    } catch (error) {
      logger.error('Error activating campaign:', error);
      showToast?.('Error activating campaign: ' + error.message, 'error');
    }
    setOpenMenuId(null);
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      showToast?.('Campaign paused');
      loadCampaigns();
    } catch (error) {
      logger.error('Error pausing campaign:', error);
      showToast?.('Error pausing campaign: ' + error.message, 'error');
    }
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setShowNewDropdown(false);
    };
    if (openMenuId || showNewDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId, showNewDropdown]);

  // Handle create from template
  const handleCreateFromTemplate = async (templateId) => {
    try {
      const name = `New Campaign from Template`;
      const campaign = await createFromTemplate(templateId, name);
      showToast?.('Campaign created from template');
      setShowTemplatePicker(false);
      navigate(`/app/campaigns/${campaign.id}`);
    } catch (error) {
      logger.error('Error creating campaign from template:', error);
      showToast?.('Error creating campaign: ' + error.message, 'error');
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('campaigns.title', 'Campaigns')}
        description={t('campaigns.description', 'Schedule content overrides with start/end dates and priority')}
        icon={<Megaphone className="w-5 h-5 text-orange-600" />}
        iconBackground="bg-orange-100"
        actions={canEdit && (
          <div className="relative">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewDropdown(!showNewDropdown);
              }}
              icon={<Plus size={18} />}
            >
              {t('campaigns.newCampaign', 'New Campaign')}
              <ChevronDown size={16} className="ml-1" />
            </Button>
            {showNewDropdown && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[200px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowNewDropdown(false);
                    navigate('/app/campaigns/new');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={14} />
                  {t('campaigns.blankCampaign', 'Blank Campaign')}
                </button>
                <button
                  onClick={() => {
                    setShowNewDropdown(false);
                    setShowTemplatePicker(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy size={14} />
                  {t('campaigns.fromTemplate', 'From Template')}
                </button>
              </div>
            )}
          </div>
        )}
      />

      <PageContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('campaigns.searchPlaceholder', 'Search campaigns...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              aria-label={t('campaigns.searchCampaigns', 'Search campaigns')}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            aria-label={t('campaigns.filterByStatus', 'Filter by status')}
          >
            <option value="">{t('campaigns.allStatuses', 'All Statuses')}</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { status: CAMPAIGN_STATUS.ACTIVE, labelKey: 'campaigns.active', label: 'Active', color: 'green' },
            { status: CAMPAIGN_STATUS.SCHEDULED, labelKey: 'campaigns.scheduled', label: 'Scheduled', color: 'blue' },
            { status: CAMPAIGN_STATUS.DRAFT, labelKey: 'campaigns.drafts', label: 'Drafts', color: 'gray' },
            { status: CAMPAIGN_STATUS.PAUSED, labelKey: 'campaigns.paused', label: 'Paused', color: 'yellow' }
          ].map(({ status, labelKey, label, color }) => {
            const count = campaigns.filter(c => c.status === status).length;
            return (
              <Card key={status} padding="default">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`} aria-hidden="true">
                    {(() => {
                      const Icon = STATUS_CONFIG[status].icon;
                      return <Icon size={20} className={`text-${color}-600`} />;
                    })()}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">{t(labelKey, label)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={t('campaigns.noCampaigns', 'No Campaigns')}
            description={t('campaigns.noCampaignsDescription', 'Campaigns let you schedule content overrides for promotions, events, or seasonal content. They take priority over normal schedules during their active window.')}
            action={canEdit ? {
              label: t('campaigns.createFirstCampaign', 'Create First Campaign'),
              onClick: () => navigate('/app/campaigns/new'),
              icon: <Plus size={18} />
            } : undefined}
          />
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('campaigns.campaignsTable', 'Campaigns table')}>
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th scope="col" className="p-4 font-medium">{t('campaigns.campaign', 'CAMPAIGN')}</th>
                    <th scope="col" className="p-4 font-medium">{t('campaigns.status', 'STATUS')}</th>
                    <th scope="col" className="p-4 font-medium">{t('campaigns.schedule', 'SCHEDULE')}</th>
                    <th scope="col" className="p-4 font-medium">{t('campaigns.priority', 'PRIORITY')}</th>
                    <th scope="col" className="p-4 font-medium">{t('campaigns.targets', 'TARGETS')}</th>
                    <th scope="col" className="p-4 font-medium">{t('campaigns.content', 'CONTENT')}</th>
                    <th scope="col" className="p-4 font-medium w-20">{t('campaigns.actions', 'ACTIONS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map(campaign => {
                    const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={campaign.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center" aria-hidden="true">
                              <Megaphone size={20} className="text-purple-600" />
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{campaign.name}</span>
                              {campaign.description && (
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {campaign.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusConfig.color}>
                            <StatusIcon size={12} aria-hidden="true" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar size={14} aria-hidden="true" />
                            <span>{formatDateTime(campaign.start_at)}</span>
                          </div>
                          {campaign.end_at && (
                            <div className="text-gray-400 text-xs mt-1">
                              {t('campaigns.to', 'to')} {formatDateTime(campaign.end_at)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${
                            campaign.priority >= 150 ? 'text-red-600' :
                            campaign.priority >= 100 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {campaign.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Target size={14} className="text-gray-400" aria-hidden="true" />
                            <span className="text-gray-600">{campaign.target_count || 0}</span>
                            {campaign.target_types && campaign.target_types.length > 0 && (
                              <span className="text-xs text-gray-400">
                                ({campaign.target_types.join(', ')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-600">{t('campaigns.itemsCount', '{{count}} items', { count: campaign.content_count || 0 })}</span>
                        </td>
                        <td className="p-4 relative">
                          {canEdit && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === campaign.id ? null : campaign.id);
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                aria-haspopup="true"
                                aria-expanded={openMenuId === campaign.id}
                                aria-label={t('campaigns.openMenu', 'Open actions menu')}
                              >
                                <MoreVertical size={18} className="text-gray-400" aria-hidden="true" />
                              </button>

                              {openMenuId === campaign.id && (
                                <div
                                  className="absolute right-4 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]"
                                  role="menu"
                                  aria-label={t('campaigns.actionsMenu', 'Campaign actions')}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/app/campaigns/${campaign.id}`);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                                    role="menuitem"
                                  >
                                    <Edit size={14} aria-hidden="true" />
                                    {t('common.edit', 'Edit')}
                                  </button>
                                  {campaign.status === CAMPAIGN_STATUS.ACTIVE ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePause(campaign.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-500"
                                      role="menuitem"
                                    >
                                      <Pause size={14} aria-hidden="true" />
                                      {t('campaigns.pause', 'Pause')}
                                    </button>
                                  ) : campaign.status !== CAMPAIGN_STATUS.COMPLETED && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleActivate(campaign.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
                                      role="menuitem"
                                    >
                                      <Play size={14} aria-hidden="true" />
                                      {t('campaigns.activate', 'Activate')}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(campaign.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageContent>

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </PageLayout>
  );
};

export default CampaignsPage;
