import { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Power,
  Globe,
  Shield,
  Info
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Alert,
  EmptyState,
} from '../design-system';
import {
  fetchTokens,
  createToken,
  revokeToken,
  deleteToken,
  getTokenStatus,
  formatLastUsed,
  AVAILABLE_SCOPES
} from '../services/apiTokenService';
import {
  fetchWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  toggleWebhookEndpoint,
  deleteWebhookEndpoint,
  fetchWebhookDeliveries,
  validateWebhookUrl,
  getDeliveryStatus,
  formatEventType,
  AVAILABLE_WEBHOOK_EVENTS
} from '../services/webhookService';

const DeveloperSettingsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('tokens');
  const [loading, setLoading] = useState(true);

  // API Tokens state
  const [tokens, setTokens] = useState([]);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState([]);
  const [creatingToken, setCreatingToken] = useState(false);
  const [createdToken, setCreatedToken] = useState(null); // { token, rawToken }
  const [showRawToken, setShowRawToken] = useState(false);

  // Webhooks state
  const [webhookEndpoints, setWebhookEndpoints] = useState([]);
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState([]);
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState(null); // { endpoint, secret }
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(null); // endpoint id
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tokensData, webhooksData] = await Promise.all([
        fetchTokens(),
        fetchWebhookEndpoints()
      ]);
      setTokens(tokensData);
      setWebhookEndpoints(webhooksData);
    } catch (error) {
      console.error('Error loading developer settings:', error);
      showToast?.('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Token handlers
  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!newTokenName.trim() || newTokenScopes.length === 0) return;

    try {
      setCreatingToken(true);
      const result = await createToken({
        name: newTokenName.trim(),
        scopes: newTokenScopes
      });
      setCreatedToken(result);
      setTokens(prev => [result.token, ...prev]);
      showToast?.('API token created');
    } catch (error) {
      console.error('Error creating token:', error);
      showToast?.(error.message || 'Error creating token', 'error');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to revoke this token? This action cannot be undone.')) return;

    try {
      await revokeToken(tokenId);
      setTokens(prev => prev.map(t =>
        t.id === tokenId ? { ...t, revoked_at: new Date().toISOString() } : t
      ));
      showToast?.('Token revoked');
    } catch (error) {
      console.error('Error revoking token:', error);
      showToast?.(error.message || 'Error revoking token', 'error');
    }
  };

  const handleDeleteToken = async (tokenId) => {
    if (!window.confirm('Delete this token permanently?')) return;

    try {
      await deleteToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      showToast?.('Token deleted');
    } catch (error) {
      console.error('Error deleting token:', error);
      showToast?.(error.message || 'Error deleting token', 'error');
    }
  };

  const closeCreateTokenModal = () => {
    setShowCreateTokenModal(false);
    setNewTokenName('');
    setNewTokenScopes([]);
    setCreatedToken(null);
    setShowRawToken(false);
  };

  // Webhook handlers
  const handleCreateWebhook = async (e) => {
    e.preventDefault();

    const validation = validateWebhookUrl(newWebhookUrl);
    if (!validation.valid) {
      showToast?.(validation.error, 'error');
      return;
    }

    if (newWebhookEvents.length === 0) {
      showToast?.('Select at least one event', 'error');
      return;
    }

    try {
      setCreatingWebhook(true);
      const result = await createWebhookEndpoint({
        url: newWebhookUrl.trim(),
        events: newWebhookEvents,
        description: newWebhookDescription.trim()
      });
      setCreatedWebhook(result);
      setWebhookEndpoints(prev => [result.endpoint, ...prev]);
      showToast?.('Webhook endpoint created');
    } catch (error) {
      console.error('Error creating webhook:', error);
      showToast?.(error.message || 'Error creating webhook', 'error');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleToggleWebhook = async (endpointId, isActive) => {
    try {
      await toggleWebhookEndpoint(endpointId, isActive);
      setWebhookEndpoints(prev => prev.map(ep =>
        ep.id === endpointId ? { ...ep, is_active: isActive } : ep
      ));
      showToast?.(isActive ? 'Webhook enabled' : 'Webhook disabled');
    } catch (error) {
      console.error('Error toggling webhook:', error);
      showToast?.(error.message || 'Error updating webhook', 'error');
    }
  };

  const handleDeleteWebhook = async (endpointId) => {
    if (!window.confirm('Delete this webhook endpoint?')) return;

    try {
      await deleteWebhookEndpoint(endpointId);
      setWebhookEndpoints(prev => prev.filter(ep => ep.id !== endpointId));
      showToast?.('Webhook deleted');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      showToast?.(error.message || 'Error deleting webhook', 'error');
    }
  };

  const handleViewDeliveries = async (endpointId) => {
    setShowDeliveriesModal(endpointId);
    setLoadingDeliveries(true);
    try {
      const data = await fetchWebhookDeliveries(endpointId);
      setDeliveries(data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      showToast?.('Error loading deliveries', 'error');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const closeCreateWebhookModal = () => {
    setShowCreateWebhookModal(false);
    setNewWebhookUrl('');
    setNewWebhookEvents([]);
    setNewWebhookDescription('');
    setCreatedWebhook(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast?.('Copied to clipboard');
  };

  const toggleScope = (scope) => {
    setNewTokenScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const toggleEvent = (event) => {
    setNewWebhookEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('developerSettings.title', 'Developer Settings')}
        description={t('developerSettings.description', 'Manage API tokens and webhook integrations for external systems')}
      />
      <PageContent>
        <div className="space-y-6">
          {/* Info Banner */}
          <Alert variant="info" icon={<Info size={20} aria-hidden="true" />}>
            <div>
              <h3 className="font-medium text-blue-900">{t('developerSettings.apiInfo.title', 'Public API & Webhooks')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('developerSettings.apiInfo.description', 'Use API tokens to programmatically update content, trigger campaigns, and manage playlists. Configure webhooks to receive real-time notifications when events occur.')}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <a
                  href="https://github.com/your-org/bizscreen/blob/main/docs/API_REFERENCE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {t('developerSettings.docs.apiReference', 'API Reference')}
                </a>
                <a
                  href="https://github.com/your-org/bizscreen/blob/main/docs/WEBHOOKS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {t('developerSettings.docs.webhooksGuide', 'Webhooks Guide')}
                </a>
                <a
                  href="https://github.com/your-org/bizscreen/tree/main/examples"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {t('developerSettings.docs.examples', 'Code Examples')}
                </a>
              </div>
            </div>
          </Alert>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit" role="tablist" aria-label={t('developerSettings.tabs.label', 'Developer settings tabs')}>
            <button
              onClick={() => setActiveTab('tokens')}
              role="tab"
              aria-selected={activeTab === 'tokens'}
              aria-controls="tokens-panel"
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === 'tokens'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key size={16} aria-hidden="true" />
              {t('developerSettings.tabs.tokens', 'API Tokens')}
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              role="tab"
              aria-selected={activeTab === 'webhooks'}
              aria-controls="webhooks-panel"
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === 'webhooks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Webhook size={16} aria-hidden="true" />
              {t('developerSettings.tabs.webhooks', 'Webhooks')}
            </button>
          </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      ) : (
        <>
          {/* API Tokens Tab */}
          {activeTab === 'tokens' && (
            <div id="tokens-panel" role="tabpanel" aria-labelledby="tokens-tab" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{t('developerSettings.tokens.title', 'API Tokens')}</h2>
                <Button onClick={() => setShowCreateTokenModal(true)}>
                  <Plus size={16} aria-hidden="true" />
                  {t('developerSettings.tokens.create', 'Create Token')}
                </Button>
              </div>

              {tokens.length === 0 ? (
                <EmptyState
                  icon={<Key size={48} />}
                  title={t('developerSettings.tokens.empty.title', 'No API Tokens')}
                  description={t('developerSettings.tokens.empty.description', 'Create an API token to enable programmatic access to your BizScreen account.')}
                  action={
                    <Button onClick={() => setShowCreateTokenModal(true)}>
                      <Plus size={16} aria-hidden="true" />
                      {t('developerSettings.tokens.createFirst', 'Create Your First Token')}
                    </Button>
                  }
                />
              ) : (
                <Card>
                  <div className="divide-y divide-gray-100">
                    {tokens.map(token => {
                      const status = getTokenStatus(token);
                      return (
                        <div key={token.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Key size={18} className="text-gray-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{token.name}</span>
                                <Badge variant={status.variant === 'success' ? 'success' : status.variant === 'error' ? 'error' : 'warning'}>
                                  {status.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                  {token.token_prefix}...
                                </code>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatLastUsed(token.last_used_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Shield size={12} />
                                  {token.scopes?.length || 0} scope{token.scopes?.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!token.revoked_at && (
                              <button
                                onClick={() => handleRevokeToken(token.id)}
                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteToken(token.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div id="webhooks-panel" role="tabpanel" aria-labelledby="webhooks-tab" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{t('developerSettings.webhooks.title', 'Webhook Endpoints')}</h2>
                <Button onClick={() => setShowCreateWebhookModal(true)}>
                  <Plus size={16} aria-hidden="true" />
                  {t('developerSettings.webhooks.add', 'Add Endpoint')}
                </Button>
              </div>

              {webhookEndpoints.length === 0 ? (
                <EmptyState
                  icon={<Webhook size={48} />}
                  title={t('developerSettings.webhooks.empty.title', 'No Webhook Endpoints')}
                  description={t('developerSettings.webhooks.empty.description', 'Add a webhook endpoint to receive real-time notifications when events occur.')}
                  action={
                    <Button onClick={() => setShowCreateWebhookModal(true)}>
                      <Plus size={16} aria-hidden="true" />
                      {t('developerSettings.webhooks.addFirst', 'Add Your First Endpoint')}
                    </Button>
                  }
                />
              ) : (
                <Card>
                  <div className="divide-y divide-gray-100">
                    {webhookEndpoints.map(endpoint => (
                      <div key={endpoint.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              endpoint.is_active ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <Globe size={18} className={endpoint.is_active ? 'text-green-600' : 'text-gray-400'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-900 break-all">
                                  {endpoint.url}
                                </code>
                                <Badge variant={endpoint.is_active ? 'success' : 'default'}>
                                  {endpoint.is_active ? 'Active' : 'Disabled'}
                                </Badge>
                              </div>
                              {endpoint.description && (
                                <p className="text-sm text-gray-500 mt-1">{endpoint.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {endpoint.events?.map(event => (
                                  <span
                                    key={event}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                  >
                                    {event}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDeliveries(endpoint.id)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                            >
                              <ExternalLink size={14} />
                              Deliveries
                            </button>
                            <button
                              onClick={() => handleToggleWebhook(endpoint.id, !endpoint.is_active)}
                              className={`p-1.5 rounded hover:bg-gray-100 ${
                                endpoint.is_active ? 'text-green-600' : 'text-gray-400'
                              }`}
                              title={endpoint.is_active ? 'Disable' : 'Enable'}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteWebhook(endpoint.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Token Modal */}
      <Modal open={showCreateTokenModal} onClose={closeCreateTokenModal}>
        <ModalHeader>
          <ModalTitle>
            {createdToken
              ? t('developerSettings.tokens.modal.created', 'Token Created')
              : t('developerSettings.tokens.modal.create', 'Create API Token')}
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          {!createdToken ? (
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('developerSettings.tokens.modal.name', 'Token Name')} *
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder={t('developerSettings.tokens.modal.namePlaceholder', 'e.g., POS Integration, CRM Sync')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('developerSettings.tokens.modal.permissions', 'Permissions')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <label
                      key={scope.value}
                      className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        newTokenScopes.includes(scope.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newTokenScopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{scope.label}</span>
                        <p className="text-xs text-gray-500">{scope.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeCreateTokenModal} className="flex-1">
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={creatingToken || !newTokenName.trim() || newTokenScopes.length === 0}
                  className="flex-1"
                >
                  {creatingToken ? (
                    <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('common.creating', 'Creating...')}</>
                  ) : (
                    <><Key size={16} aria-hidden="true" /> {t('developerSettings.tokens.create', 'Create Token')}</>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert variant="success" icon={<CheckCircle size={20} aria-hidden="true" />}>
                <div>
                  <p className="font-medium text-green-900">{t('developerSettings.tokens.modal.success', 'Token created successfully!')}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {t('developerSettings.tokens.modal.copyWarning', "Copy your token now. It won't be shown again.")}
                  </p>
                </div>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('developerSettings.tokens.modal.yourToken', 'Your API Token')}
                </label>
                <div className="relative">
                  <input
                    type={showRawToken ? 'text' : 'password'}
                    value={createdToken.rawToken}
                    readOnly
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowRawToken(!showRawToken)}
                      className="p-1 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={showRawToken ? t('common.hideToken', 'Hide token') : t('common.showToken', 'Show token')}
                    >
                      {showRawToken ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdToken.rawToken)}
                      className="p-1 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={t('common.copy', 'Copy to clipboard')}
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <Alert variant="warning">
                <strong>{t('common.important', 'Important')}:</strong> {t('developerSettings.tokens.modal.storeSecurely', 'Store this token securely. It provides programmatic access to your BizScreen account with the selected permissions.')}
              </Alert>

              <Button onClick={closeCreateTokenModal} className="w-full">
                {t('common.done', 'Done')}
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Create Webhook Modal */}
      <Modal open={showCreateWebhookModal} onClose={closeCreateWebhookModal}>
        <ModalHeader>
          <ModalTitle>
            {createdWebhook
              ? t('developerSettings.webhooks.modal.created', 'Webhook Created')
              : t('developerSettings.webhooks.modal.add', 'Add Webhook Endpoint')}
          </ModalTitle>
        </ModalHeader>
        <ModalContent className="max-h-[70vh] overflow-y-auto">
          {!createdWebhook ? (
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('developerSettings.webhooks.modal.url', 'Endpoint URL')} *
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks/bizscreen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('developerSettings.webhooks.modal.httpsRequired', 'Must be an HTTPS URL')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('developerSettings.webhooks.modal.description', 'Description')}
                </label>
                <input
                  type="text"
                  value={newWebhookDescription}
                  onChange={(e) => setNewWebhookDescription(e.target.value)}
                  placeholder={t('developerSettings.webhooks.modal.descriptionPlaceholder', 'e.g., Send to Slack, Sync with CRM')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('developerSettings.webhooks.modal.events', 'Events to Subscribe')} *
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_WEBHOOK_EVENTS.map(event => (
                    <label
                      key={event.value}
                      className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        newWebhookEvents.includes(event.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newWebhookEvents.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{event.label}</span>
                        <p className="text-xs text-gray-500">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeCreateWebhookModal} className="flex-1">
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={creatingWebhook || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
                  className="flex-1"
                >
                  {creatingWebhook ? (
                    <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('common.creating', 'Creating...')}</>
                  ) : (
                    <><Webhook size={16} aria-hidden="true" /> {t('developerSettings.webhooks.modal.createEndpoint', 'Create Endpoint')}</>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert variant="success" icon={<CheckCircle size={20} aria-hidden="true" />}>
                <div>
                  <p className="font-medium text-green-900">{t('developerSettings.webhooks.modal.success', 'Webhook created successfully!')}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {t('developerSettings.webhooks.modal.copyWarning', "Copy your signing secret now. It won't be shown again.")}
                  </p>
                </div>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('developerSettings.webhooks.modal.signingSecret', 'Signing Secret')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={createdWebhook.secret}
                    readOnly
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdWebhook.secret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={t('common.copy', 'Copy to clipboard')}
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('developerSettings.webhooks.modal.signatureHint', 'Use this to verify webhook signatures (BizScreen-Signature header)')}
                </p>
              </div>

              <Button onClick={closeCreateWebhookModal} className="w-full">
                {t('common.done', 'Done')}
              </Button>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Deliveries Modal */}
      <Modal open={!!showDeliveriesModal} onClose={() => setShowDeliveriesModal(null)}>
        <ModalHeader>
          <ModalTitle>{t('developerSettings.webhooks.deliveries.title', 'Recent Deliveries')}</ModalTitle>
        </ModalHeader>
        <ModalContent className="max-h-[60vh] overflow-y-auto">
          {loadingDeliveries ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" aria-hidden="true" />
              <span className="sr-only">{t('common.loading', 'Loading...')}</span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('developerSettings.webhooks.deliveries.empty', 'No deliveries yet')}
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.map(delivery => {
                const status = getDeliveryStatus(delivery);
                return (
                  <div key={delivery.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={status.label === 'Success' ? 'success' : status.label === 'Failed' ? 'error' : 'warning'}>
                          {status.label}
                        </Badge>
                        <span className="font-medium text-sm text-gray-900">
                          {formatEventType(delivery.event_type)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(delivery.created_at).toLocaleString()}
                      </span>
                    </div>
                    {delivery.last_error && (
                      <p className="text-xs text-red-600 mt-1">{delivery.last_error}</p>
                    )}
                    {delivery.response_status && (
                      <p className="text-xs text-gray-500 mt-1">
                        HTTP {delivery.response_status} • {delivery.attempt_count} {t('developerSettings.webhooks.deliveries.attempt', 'attempt')}{delivery.attempt_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowDeliveriesModal(null)} className="w-full">
            {t('common.close', 'Close')}
          </Button>
        </ModalFooter>
      </Modal>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default DeveloperSettingsPage;
