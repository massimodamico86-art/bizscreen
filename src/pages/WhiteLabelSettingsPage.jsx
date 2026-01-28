import { useState, useEffect } from 'react';


import { useTranslation } from '../i18n';
import {
  listDomains,
  addDomain,
  removeDomain,
  verifyDomain,
  setPrimaryDomain,
  getWhiteLabelSettings,
  updateWhiteLabelSettings,
  getDomainStatus,
  formatDomainUrl
} from '../services/domainService';

const WhiteLabelSettingsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('domains');
  const [loading, setLoading] = useState(true);

  // Domains state
  const [domains, setDomains] = useState([]);
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [addedDomain, setAddedDomain] = useState(null);
  const [verifyingDomain, setVerifyingDomain] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    whiteLabelEnabled: false,
    hidePoweredBy: false,
    loginPageLogoUrl: '',
    loginPageBackgroundUrl: '',
    loginPageTitle: '',
    loginPageSubtitle: '',
    emailLogoUrl: '',
    emailFromName: '',
    supportEmail: '',
    supportUrl: '',
    customCss: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [domainsData, settingsData] = await Promise.all([
        listDomains(),
        getWhiteLabelSettings()
      ]);
      setDomains(domainsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading white-label settings:', error);
      showToast?.('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Domain handlers
  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    try {
      setAddingDomain(true);
      const result = await addDomain({ domain: newDomainName.trim() });
      setAddedDomain(result);
      setDomains(prev => [result.domain, ...prev]);
      showToast?.('Domain added');
    } catch (error) {
      console.error('Error adding domain:', error);
      showToast?.(error.message || 'Error adding domain', 'error');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      setVerifyingDomain(domainId);
      const result = await verifyDomain(domainId);

      if (result.verified) {
        setDomains(prev => prev.map(d =>
          d.id === domainId ? { ...d, is_verified: true, verified_at: new Date().toISOString() } : d
        ));
        showToast?.('Domain verified successfully!');
      } else {
        showToast?.(result.message || 'DNS record not found. Please check your DNS settings.', 'error');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      showToast?.(error.message || 'Error verifying domain', 'error');
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleSetPrimary = async (domainId) => {
    try {
      await setPrimaryDomain(domainId);
      setDomains(prev => prev.map(d => ({
        ...d,
        is_primary: d.id === domainId
      })));
      showToast?.('Primary domain updated');
    } catch (error) {
      console.error('Error setting primary domain:', error);
      showToast?.(error.message || 'Error setting primary domain', 'error');
    }
  };

  const handleRemoveDomain = async (domainId) => {
    if (!window.confirm('Are you sure you want to remove this domain?')) return;

    try {
      await removeDomain(domainId);
      setDomains(prev => prev.filter(d => d.id !== domainId));
      showToast?.('Domain removed');
    } catch (error) {
      console.error('Error removing domain:', error);
      showToast?.(error.message || 'Error removing domain', 'error');
    }
  };

  const closeAddDomainModal = () => {
    setShowAddDomainModal(false);
    setNewDomainName('');
    setAddedDomain(null);
  };

  // Settings handlers
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await updateWhiteLabelSettings(settings);
      setSettingsChanged(false);
      showToast?.('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast?.(error.message || 'Error saving settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast?.('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">White-Label Settings</h1>
        <p className="text-gray-500 mt-1">
          Customize your platform with your own branding and custom domains
        </p>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-purple-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-900">White-Label Features</h3>
            <p className="text-sm text-purple-700 mt-1">
              Add custom domains, customize login pages, and hide BizScreen branding.
              Your clients will see your brand, not ours.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('domains')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'domains'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Globe size={16} />
          Custom Domains
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'branding'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Palette size={16} />
          Branding
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* Domains Tab */}
          {activeTab === 'domains' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Custom Domains</h2>
                <Button onClick={() => setShowAddDomainModal(true)}>
                  <Plus size={16} />
                  Add Domain
                </Button>
              </div>

              {domains.length === 0 ? (
                <Card className="p-8 text-center">
                  <Globe size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">No Custom Domains</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Add a custom domain to enable white-label access for your clients.
                  </p>
                  <Button onClick={() => setShowAddDomainModal(true)}>
                    <Plus size={16} />
                    Add Your First Domain
                  </Button>
                </Card>
              ) : (
                <Card>
                  <div className="divide-y divide-gray-100">
                    {domains.map(domain => {
                      const status = getDomainStatus(domain);
                      return (
                        <div key={domain.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                domain.is_verified ? 'bg-green-100' : 'bg-yellow-100'
                              }`}>
                                {domain.is_verified ? (
                                  <CheckCircle size={18} className="text-green-600" />
                                ) : (
                                  <AlertCircle size={18} className="text-yellow-600" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{domain.domain_name}</span>
                                  <Badge variant={domain.is_verified ? 'success' : 'warning'}>
                                    {status.status}
                                  </Badge>
                                  {domain.is_primary && (
                                    <Badge variant="info" className="flex items-center gap-1">
                                      <Star size={12} />
                                      Primary
                                    </Badge>
                                  )}
                                </div>

                                {!domain.is_verified && domain.verification_token && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                                    <p className="font-medium text-gray-700 mb-1">DNS Verification Required</p>
                                    <p className="text-gray-600 text-xs mb-2">
                                      Add a TXT record to your DNS settings:
                                    </p>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Host:</span>
                                        <code className="bg-white px-2 py-0.5 rounded text-xs">
                                          _bizscreen-verification
                                        </code>
                                        <button
                                          onClick={() => copyToClipboard('_bizscreen-verification')}
                                          className="p-1 hover:bg-gray-200 rounded"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Value:</span>
                                        <code className="bg-white px-2 py-0.5 rounded text-xs break-all">
                                          {domain.verification_token}
                                        </code>
                                        <button
                                          onClick={() => copyToClipboard(domain.verification_token)}
                                          className="p-1 hover:bg-gray-200 rounded"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {domain.is_verified && (
                                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                    <a
                                      href={formatDomainUrl(domain)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-purple-600 hover:underline"
                                    >
                                      {formatDomainUrl(domain)}
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!domain.is_verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyDomain(domain.id)}
                                  disabled={verifyingDomain === domain.id}
                                >
                                  {verifyingDomain === domain.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <RefreshCw size={14} />
                                  )}
                                  Verify
                                </Button>
                              )}
                              {domain.is_verified && !domain.is_primary && (
                                <button
                                  onClick={() => handleSetPrimary(domain.id)}
                                  className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-gray-100 rounded"
                                  title="Set as primary"
                                >
                                  <Star size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveDomain(domain.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                                title="Remove domain"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* CNAME Instructions */}
              <Card className="p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Shield size={16} />
                  Domain Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  After verifying your domain, add a CNAME record pointing to BizScreen:
                </p>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <code className="text-sm">CNAME → app.bizscreen.io</code>
                </div>
              </Card>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              {/* Enable White-Label */}
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Shield size={18} />
                      Enable White-Label Mode
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      When enabled, your custom branding will be applied to the platform
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.whiteLabelEnabled}
                      onChange={(e) => handleSettingChange('whiteLabelEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.hidePoweredBy}
                      onChange={(e) => handleSettingChange('hidePoweredBy', e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Hide "Powered by BizScreen" branding</span>
                  </label>
                </div>
              </Card>

              {/* Login Page Customization */}
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Image size={18} />
                  Login Page Customization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Login Logo URL
                    </label>
                    <input
                      type="url"
                      value={settings.loginPageLogoUrl}
                      onChange={(e) => handleSettingChange('loginPageLogoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Image URL
                    </label>
                    <input
                      type="url"
                      value={settings.loginPageBackgroundUrl}
                      onChange={(e) => handleSettingChange('loginPageBackgroundUrl', e.target.value)}
                      placeholder="https://example.com/background.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Login Title
                    </label>
                    <input
                      type="text"
                      value={settings.loginPageTitle}
                      onChange={(e) => handleSettingChange('loginPageTitle', e.target.value)}
                      placeholder="Welcome to Your Platform"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Login Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.loginPageSubtitle}
                      onChange={(e) => handleSettingChange('loginPageSubtitle', e.target.value)}
                      placeholder="Sign in to manage your digital signage"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Email Branding */}
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Mail size={18} />
                  Email Branding
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Logo URL
                    </label>
                    <input
                      type="url"
                      value={settings.emailLogoUrl}
                      onChange={(e) => handleSettingChange('emailLogoUrl', e.target.value)}
                      placeholder="https://example.com/email-logo.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={settings.emailFromName}
                      onChange={(e) => handleSettingChange('emailFromName', e.target.value)}
                      placeholder="Your Company"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Support Info */}
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Link2 size={18} />
                  Support Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                      placeholder="support@yourcompany.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support URL / Help Center
                    </label>
                    <input
                      type="url"
                      value={settings.supportUrl}
                      onChange={(e) => handleSettingChange('supportUrl', e.target.value)}
                      placeholder="https://help.yourcompany.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Advanced: Custom CSS */}
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FileText size={18} />
                  Custom CSS (Advanced)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add custom CSS to further customize the appearance. Use with caution.
                </p>
                <textarea
                  value={settings.customCss}
                  onChange={(e) => handleSettingChange('customCss', e.target.value)}
                  placeholder=".header { background: #yourcolor; }"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                />
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={!settingsChanged || savingSettings}
                >
                  {savingSettings ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <>Save Settings</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Domain Modal */}
      {showAddDomainModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {addedDomain ? 'Domain Added' : 'Add Custom Domain'}
              </h2>
              <button onClick={closeAddDomainModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4">
              {!addedDomain ? (
                <form onSubmit={handleAddDomain} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain Name *
                    </label>
                    <input
                      type="text"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      placeholder="app.yourcompany.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your subdomain (e.g., app.yourcompany.com) or full domain
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={closeAddDomainModal} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addingDomain || !newDomainName.trim()}
                      className="flex-1"
                    >
                      {addingDomain ? (
                        <><Loader2 size={16} className="animate-spin" /> Adding...</>
                      ) : (
                        <><Globe size={16} /> Add Domain</>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Domain added!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Now verify ownership by adding a DNS TXT record.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="font-medium text-gray-700">Add this TXT record to your DNS:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Host/Name:</span>
                          <code className="block text-sm">{addedDomain.verification?.host?.split('.')[0] || '_bizscreen-verification'}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(addedDomain.verification?.host?.split('.')[0] || '_bizscreen-verification')}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-500">Value:</span>
                          <code className="block text-sm break-all">{addedDomain.verification?.value || addedDomain.domain?.verification_token}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(addedDomain.verification?.value || addedDomain.domain?.verification_token)}
                          className="p-1 hover:bg-gray-100 rounded ml-2"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      DNS changes can take up to 48 hours to propagate. You can verify anytime.
                    </p>
                  </div>

                  <Button onClick={closeAddDomainModal} className="w-full">
                    Done
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WhiteLabelSettingsPage;
