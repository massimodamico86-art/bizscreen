/**
 * EnterpriseSecurityPage Component
 *
 * Enterprise-grade security settings including:
 * - SSO configuration (OIDC/SAML)
 * - SCIM provisioning endpoints
 * - Data export and compliance
 * - Security policies
 *
 * @module pages/EnterpriseSecurityPage
 */
import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Users,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  FileText,
  Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert,
} from '../design-system';
import { getSSOProvider, saveSSOProvider, toggleSSOEnabled, toggleSSOEnforcement, SSO_TYPES, SSO_DEFAULT_ROLES, validateOIDCIssuer } from '../services/ssoService';
import { downloadExport, getDataSummary, exportAsCSV, hasEnterpriseFeatures } from '../services/complianceService';
import { supabase } from '../supabase';

export default function EnterpriseSecurityPage({ showToast }) {
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('sso');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasEnterprise, setHasEnterprise] = useState(false);

  // SSO State
  const [ssoProvider, setSsoProvider] = useState(null);
  const [ssoForm, setSsoForm] = useState({
    type: 'oidc',
    name: '',
    issuer: '',
    clientId: '',
    clientSecret: '',
    authorizationEndpoint: '',
    tokenEndpoint: '',
    userinfoEndpoint: '',
    metadataUrl: '',
    defaultRole: 'viewer',
    autoCreateUsers: true,
    enforceSso: false
  });
  const [showSecret, setShowSecret] = useState(false);
  const [validatingIssuer, setValidatingIssuer] = useState(false);

  // Data summary
  const [dataSummary, setDataSummary] = useState(null);
  const [exporting, setExporting] = useState(false);

  // SCIM
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check enterprise features
      const hasEnt = await hasEnterpriseFeatures();
      setHasEnterprise(hasEnt || userProfile?.role === 'super_admin');

      // Load SSO provider
      const provider = await getSSOProvider();
      if (provider) {
        setSsoProvider(provider);
        setSsoForm({
          type: provider.type || 'oidc',
          name: provider.name || '',
          issuer: provider.issuer || '',
          clientId: provider.client_id || '',
          clientSecret: provider.client_secret || '',
          authorizationEndpoint: provider.authorization_endpoint || '',
          tokenEndpoint: provider.token_endpoint || '',
          userinfoEndpoint: provider.userinfo_endpoint || '',
          metadataUrl: provider.metadata_url || '',
          defaultRole: provider.default_role || 'viewer',
          autoCreateUsers: provider.auto_create_users ?? true,
          enforceSso: provider.enforce_sso ?? false
        });
      }

      // Load data summary
      const summary = await getDataSummary();
      setDataSummary(summary);

    } catch (err) {
      console.error('Error loading enterprise data:', err);
      showToast?.('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSSO = async () => {
    try {
      setSaving(true);

      const saved = await saveSSOProvider({
        type: ssoForm.type,
        name: ssoForm.name,
        issuer: ssoForm.issuer,
        clientId: ssoForm.clientId,
        clientSecret: ssoForm.clientSecret,
        authorizationEndpoint: ssoForm.authorizationEndpoint,
        tokenEndpoint: ssoForm.tokenEndpoint,
        userinfoEndpoint: ssoForm.userinfoEndpoint,
        metadataUrl: ssoForm.metadataUrl,
        defaultRole: ssoForm.defaultRole,
        autoCreateUsers: ssoForm.autoCreateUsers,
        enforceSso: ssoForm.enforceSso
      });

      setSsoProvider(saved);
      showToast?.('SSO configuration saved', 'success');
    } catch (err) {
      console.error('Error saving SSO:', err);
      showToast?.('Error saving SSO configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSSOEnabled = async () => {
    if (!ssoProvider) return;

    try {
      const updated = await toggleSSOEnabled(ssoProvider.id, !ssoProvider.is_enabled);
      setSsoProvider(updated);
      showToast?.(updated.is_enabled ? 'SSO enabled' : 'SSO disabled', 'success');
    } catch (err) {
      showToast?.('Error toggling SSO', 'error');
    }
  };

  const handleValidateIssuer = async () => {
    if (!ssoForm.issuer) return;

    setValidatingIssuer(true);
    try {
      const result = await validateOIDCIssuer(ssoForm.issuer);
      if (result.valid) {
        setSsoForm(prev => ({
          ...prev,
          authorizationEndpoint: result.config.authorizationEndpoint,
          tokenEndpoint: result.config.tokenEndpoint,
          userinfoEndpoint: result.config.userinfoEndpoint
        }));
        showToast?.('OIDC configuration discovered', 'success');
      } else {
        showToast?.(result.error || 'Invalid issuer URL', 'error');
      }
    } catch {
      showToast?.('Failed to validate issuer', 'error');
    } finally {
      setValidatingIssuer(false);
    }
  };

  const handleExportData = async (format = 'json') => {
    try {
      setExporting(true);
      if (format === 'json') {
        await downloadExport();
        showToast?.('Data exported successfully', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async (dataType) => {
    try {
      setExporting(true);
      const result = await exportAsCSV(dataType);
      showToast?.(`Exported ${result.rows} ${dataType}`, 'success');
    } catch (err) {
      showToast?.(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const scimBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/scim` : '/api/scim';

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
            <span className="sr-only">{t('common.loading', 'Loading...')}</span>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  if (!hasEnterprise && userProfile?.role !== 'super_admin') {
    return (
      <PageLayout>
        <PageContent>
          <div className="max-w-2xl mx-auto text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('enterpriseSecurity.upsell.title', 'Enterprise Features')}</h1>
            <p className="text-gray-600 mb-6">
              {t('enterpriseSecurity.upsell.description', 'SSO, SCIM, and advanced compliance features are available on Pro and Enterprise plans.')}
            </p>
            <Button>
              {t('enterpriseSecurity.upsell.upgrade', 'Upgrade Plan')}
            </Button>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('enterpriseSecurity.title', 'Enterprise Security')}
        description={t('enterpriseSecurity.description', 'Configure SSO, user provisioning, and data compliance')}
      />
      <PageContent>
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6" role="tablist" aria-label={t('enterpriseSecurity.tabs.label', 'Security settings tabs')}>
              {[
                { id: 'sso', label: t('enterpriseSecurity.tabs.sso', 'Single Sign-On'), icon: Key },
                { id: 'scim', label: t('enterpriseSecurity.tabs.scim', 'User Provisioning'), icon: Users },
                { id: 'compliance', label: t('enterpriseSecurity.tabs.compliance', 'Data & Compliance'), icon: Database },
                { id: 'security', label: t('enterpriseSecurity.tabs.security', 'Security Policy'), icon: Shield }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

      {/* SSO Tab */}
      {activeTab === 'sso' && (
        <div className="space-y-6">
          {/* SSO Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">SSO Configuration</h3>
                <p className="text-sm text-gray-500">
                  Allow users to sign in with your identity provider
                </p>
              </div>
              {ssoProvider && (
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ssoProvider.is_enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {ssoProvider.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={handleToggleSSOEnabled}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      ssoProvider.is_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {ssoProvider.is_enabled ? 'Disable SSO' : 'Enable SSO'}
                  </button>
                </div>
              )}
            </div>

            {/* Provider Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Type
              </label>
              <div className="flex gap-4">
                {[
                  { value: 'oidc', label: 'OpenID Connect', desc: 'Okta, Auth0, Azure AD' },
                  { value: 'saml', label: 'SAML 2.0', desc: 'Enterprise IdPs' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setSsoForm(prev => ({ ...prev, type: type.value }))}
                    className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                      ssoForm.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* OIDC Configuration */}
            {ssoForm.type === 'oidc' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={ssoForm.name}
                    onChange={e => setSsoForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Okta, Azure AD"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuer URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={ssoForm.issuer}
                      onChange={e => setSsoForm(prev => ({ ...prev, issuer: e.target.value }))}
                      placeholder="https://your-org.okta.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleValidateIssuer}
                      disabled={validatingIssuer || !ssoForm.issuer}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      {validatingIssuer ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        'Auto-discover'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We'll automatically fetch endpoints from .well-known/openid-configuration
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={ssoForm.clientId}
                      onChange={e => setSsoForm(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="Your OAuth client ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={ssoForm.clientSecret}
                        onChange={e => setSsoForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="Your OAuth client secret"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Callback URL (Redirect URI)
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/sso/callback` : '/api/sso/callback'}
                    </code>
                    <button
                      onClick={() => copyToClipboard(
                        `${window.location.origin}/api/sso/callback`,
                        'callback'
                      )}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      {copiedEndpoint === 'callback' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Add this URL to your IdP's allowed redirect URIs
                  </p>
                </div>
              </div>
            )}

            {/* SAML Configuration */}
            {ssoForm.type === 'saml' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={ssoForm.name}
                    onChange={e => setSsoForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Company SAML"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metadata URL
                  </label>
                  <input
                    type="url"
                    value={ssoForm.metadataUrl}
                    onChange={e => setSsoForm(prev => ({ ...prev, metadataUrl: e.target.value }))}
                    placeholder="https://idp.example.com/metadata.xml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info size={18} className="text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">SAML Configuration</p>
                      <p className="mt-1">
                        Full SAML support requires additional server-side configuration.
                        Contact support for enterprise SAML setup.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Common Settings */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Role for New Users
                </label>
                <select
                  value={ssoForm.defaultRole}
                  onChange={e => setSsoForm(prev => ({ ...prev, defaultRole: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {SSO_DEFAULT_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Auto-create Users</div>
                  <div className="text-sm text-gray-500">
                    Automatically create accounts for new SSO users
                  </div>
                </div>
                <button
                  onClick={() => setSsoForm(prev => ({ ...prev, autoCreateUsers: !prev.autoCreateUsers }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    ssoForm.autoCreateUsers ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    ssoForm.autoCreateUsers ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Enforce SSO Only</div>
                  <div className="text-sm text-gray-500">
                    Disable password login (SSO required for all users)
                  </div>
                </div>
                <button
                  onClick={() => setSsoForm(prev => ({ ...prev, enforceSso: !prev.enforceSso }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    ssoForm.enforceSso ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    ssoForm.enforceSso ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveSSO}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCIM Tab */}
      {activeTab === 'scim' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">SCIM User Provisioning</h3>
            <p className="text-sm text-gray-500 mb-6">
              Automatically sync users from your identity provider using SCIM 2.0
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SCIM Base URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono">
                    {scimBaseUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(scimBaseUrl, 'scim-base')}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    {copiedEndpoint === 'scim-base' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { method: 'GET', endpoint: '/users', desc: 'List all users' },
                  { method: 'GET', endpoint: '/users/:id', desc: 'Get single user' },
                  { method: 'POST', endpoint: '/users', desc: 'Create user' },
                  { method: 'PUT', endpoint: '/users/:id', desc: 'Replace user' },
                  { method: 'PATCH', endpoint: '/users/:id', desc: 'Update user' },
                  { method: 'DELETE', endpoint: '/users/:id', desc: 'Deactivate user' }
                ].map((ep, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                      ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      ep.method === 'PUT' || ep.method === 'PATCH' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono text-gray-700">{scimBaseUrl}{ep.endpoint}</code>
                    <span className="text-sm text-gray-500 ml-auto">{ep.desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info size={18} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Authentication Required</p>
                    <p className="mt-1">
                      SCIM endpoints require an API token with <code className="bg-blue-100 px-1 rounded">scim:read</code> or <code className="bg-blue-100 px-1 rounded">scim:write</code> scopes.
                      Generate tokens in Developer Settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Data Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
            {dataSummary && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { label: 'Screens', value: dataSummary.screens },
                  { label: 'Playlists', value: dataSummary.playlists },
                  { label: 'Layouts', value: dataSummary.layouts },
                  { label: 'Media', value: dataSummary.media },
                  { label: 'Campaigns', value: dataSummary.campaigns },
                  { label: 'Team', value: dataSummary.teamMembers }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Data */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Data</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download all your data for compliance or migration purposes
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExportData('json')}
                disabled={exporting}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Download size={20} className="text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Full Data Export</div>
                    <div className="text-sm text-gray-500">Download all data as JSON</div>
                  </div>
                </div>
                <span className="text-sm text-gray-400">JSON</span>
              </button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'screens', label: 'Screens' },
                  { type: 'playlists', label: 'Playlists' },
                  { type: 'media', label: 'Media' },
                  { type: 'activity', label: 'Activity Log' }
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleExportCSV(item.type)}
                    disabled={exporting}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">CSV</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Retention</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span>Activity logs</span>
                <span className="font-medium text-gray-900">90 days</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span>Analytics data</span>
                <span className="font-medium text-gray-900">1 year</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span>Media files</span>
                <span className="font-medium text-gray-900">Until deleted</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account data</span>
                <span className="font-medium text-gray-900">Until account deletion</span>
              </div>
            </div>
          </div>

          {/* Danger Zone - Super Admin Only */}
          {userProfile?.role === 'super_admin' && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">
                These actions are permanent and cannot be undone.
              </p>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={() => showToast?.('Use Tenant Admin page for data deletion', 'info')}
              >
                Delete All Tenant Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security Policy Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-gray-900">Minimum Length</div>
                  <div className="text-sm text-gray-500">Require passwords of at least 8 characters</div>
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg">
                  <option>8 characters</option>
                  <option>12 characters</option>
                  <option>16 characters</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-gray-900">Complexity Requirements</div>
                  <div className="text-sm text-gray-500">Require mixed case, numbers, symbols</div>
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Standard</option>
                  <option>Strong</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-gray-900">Session Timeout</div>
                  <div className="text-sm text-gray-500">Automatically log out inactive users</div>
                </div>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-600">
                  24 hours
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-gray-900">JWT Token Expiry</div>
                  <div className="text-sm text-gray-500">Token refresh interval</div>
                </div>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-600">
                  1 hour
                </span>
              </div>
            </div>
          </div>

          <Alert variant="info" icon={<Info size={18} aria-hidden="true" />}>
            <p className="text-sm text-gray-600">
              {t('enterpriseSecurity.security.infraNote', 'Some security settings are configured at the infrastructure level. Contact support for custom security requirements.')}
            </p>
          </Alert>
        </div>
      )}
        </div>
      </PageContent>
    </PageLayout>
  );
}
