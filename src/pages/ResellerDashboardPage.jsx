/**
 * ResellerDashboardPage Component
 *
 * Main dashboard for reseller partners showing:
 * - Portfolio overview (tenants, screens, licenses)
 * - Revenue and commission stats
 * - Tenant management
 * - License generation
 *
 * @module pages/ResellerDashboardPage
 */
import { useState, useEffect } from 'react';
import {
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';


import {
  getMyResellerAccount,
  getPortfolioStats,
  listResellerTenants,
  getBrandVariants,
  impersonateTenant
} from '../services/resellerService';
import {
  generateLicenses,
  listResellerLicenses,
  getLicenseStats,
  formatLicenseCode,
  LICENSE_TYPES,
  PLAN_LEVELS,
  exportLicensesCSV
} from '../services/licenseService';

export default function ResellerDashboardPage({ showToast, onNavigate }) {
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [resellerAccount, setResellerAccount] = useState(null);
  const [stats, setStats] = useState(null);
  const [licenseStats, setLicenseStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [brandVariants, setBrandVariants] = useState([]);

  // Modals
  const [showGenerateLicenseModal, setShowGenerateLicenseModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);

  // License generation form
  const [licenseForm, setLicenseForm] = useState({
    licenseType: 'standard',
    planLevel: 'starter',
    maxScreens: 5,
    durationDays: 365,
    quantity: 1,
    notes: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generatedLicenses, setGeneratedLicenses] = useState([]);

  // Copied state
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const account = await getMyResellerAccount();
      setResellerAccount(account);

      if (account?.status === 'active') {
        const [portfolioStats, licStats, tenantList, licenseList, variants] = await Promise.all([
          getPortfolioStats(account.id),
          getLicenseStats(account.id),
          listResellerTenants(account.id, { limit: 10 }),
          listResellerLicenses(account.id, { limit: 10 }),
          getBrandVariants(account.id)
        ]);

        setStats(portfolioStats);
        setLicenseStats(licStats);
        setTenants(tenantList);
        setLicenses(licenseList);
        setBrandVariants(variants);
      }
    } catch (err) {
      console.error('Error loading reseller data:', err);
      showToast?.('Error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLicenses = async () => {
    try {
      setGenerating(true);
      const newLicenses = await generateLicenses({
        resellerId: resellerAccount.id,
        ...licenseForm
      });

      setGeneratedLicenses(newLicenses);
      showToast?.(`Generated ${newLicenses.length} license(s)`, 'success');

      // Refresh license list
      const [licStats, licenseList] = await Promise.all([
        getLicenseStats(resellerAccount.id),
        listResellerLicenses(resellerAccount.id, { limit: 10 })
      ]);
      setLicenseStats(licStats);
      setLicenses(licenseList);
    } catch (err) {
      showToast?.(err.message || 'Error generating licenses', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleImpersonate = async (tenantId, tenantName) => {
    try {
      await impersonateTenant(tenantId);
      showToast?.(`Now managing: ${tenantName}`, 'success');
      window.location.reload();
    } catch (err) {
      showToast?.(err.message || 'Error switching to tenant', 'error');
    }
  };

  const handleExportLicenses = async () => {
    try {
      await exportLicensesCSV(resellerAccount.id);
      showToast?.('Licenses exported', 'success');
    } catch (err) {
      showToast?.('Export failed', 'error');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64" role="status" aria-label={t('common.loading', 'Loading')}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
        </div>
      </PageLayout>
    );
  }

  // Not a reseller yet
  if (!resellerAccount) {
    return (
      <PageLayout>
        <PageContent className="max-w-2xl mx-auto">
          <EmptyState
            icon={Building2}
            title={t('reseller.becomePartner', 'Become a Reseller Partner')}
            description={t('reseller.becomePartnerDesc', 'Join our reseller program to distribute BizScreen to your clients and earn commissions.')}
            action={{
              label: t('reseller.applyNow', 'Apply Now'),
              onClick: () => onNavigate?.('reseller-apply')
            }}
          />
        </PageContent>
      </PageLayout>
    );
  }

  // Pending approval
  if (resellerAccount.status === 'pending') {
    return (
      <PageLayout>
        <PageContent className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('reseller.applicationReview', 'Application Under Review')}</h2>
            <p className="text-gray-600 mb-4">
              {t('reseller.applicationReviewDesc', 'Your reseller application for {{company}} is being reviewed. We\'ll notify you once it\'s approved.', { company: resellerAccount.company_name })}
            </p>
            <p className="text-sm text-gray-500">
              {t('reseller.submitted', 'Submitted')}: {new Date(resellerAccount.created_at).toLocaleDateString()}
            </p>
          </Card>
        </PageContent>
      </PageLayout>
    );
  }

  // Suspended
  if (resellerAccount.status === 'suspended') {
    return (
      <PageLayout>
        <PageContent className="max-w-2xl mx-auto">
          <Card className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('reseller.accountSuspended', 'Account Suspended')}</h2>
            <p className="text-gray-600">
              {t('reseller.accountSuspendedDesc', 'Your reseller account has been suspended. Please contact support for assistance.')}
            </p>
          </Card>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('reseller.dashboard', 'Reseller Dashboard')}
        description={resellerAccount.company_name}
        actions={
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowGenerateLicenseModal(true)} icon={<Key size={18} aria-hidden="true" />}>
              {t('reseller.generateLicenses', 'Generate Licenses')}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate?.('reseller-billing')} icon={<CreditCard size={18} aria-hidden="true" />}>
              {t('reseller.billing', 'Billing')}
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.activeTenants', 'Active Tenants')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.total_tenants || 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg" aria-hidden="true">
                <Monitor size={20} className="text-green-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.totalScreens', 'Total Screens')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.total_screens || 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg" aria-hidden="true">
                <Key size={20} className="text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.availableLicenses', 'Available Licenses')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {licenseStats?.available || 0}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg" aria-hidden="true">
                <DollarSign size={20} className="text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.pendingCommission', 'Pending Commission')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${parseFloat(stats?.pending_commission || 0).toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Revenue Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white" role="region" aria-label={t('reseller.monthlyRevenue', 'This Month Revenue')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('reseller.thisMonth', 'This Month')}</h3>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm opacity-80">{t('reseller.revenueGenerated', 'Revenue Generated')}</div>
              <div className="text-3xl font-bold">
                ${parseFloat(stats?.revenue_this_month || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-80">{t('reseller.yourCommission', 'Your Commission ({{percent}}%)', { percent: resellerAccount.commission_percent })}</div>
              <div className="text-3xl font-bold">
                ${parseFloat(stats?.commission_this_month || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('reseller.recentTenants', 'Recent Tenants')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddTenantModal(true)} icon={<UserPlus size={16} aria-hidden="true" />}>
                {t('reseller.addTenant', 'Add Tenant')}
              </Button>
            </CardHeader>
            <div className="divide-y divide-gray-100" role="list" aria-label={t('reseller.tenantsList', 'Tenants list')}>
              {tenants.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                  <p>{t('reseller.noTenants', 'No tenants yet')}</p>
                  <button
                    onClick={() => setShowAddTenantModal(true)}
                    className="mt-3 text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    {t('reseller.addFirstTenant', 'Add your first tenant')}
                  </button>
                </div>
              ) : (
                tenants.map(tenant => (
                  <div key={tenant.tenant_id} className="p-4 hover:bg-gray-50" role="listitem">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {tenant.business_name || tenant.full_name || t('common.unnamed', 'Unnamed')}
                        </div>
                        <div className="text-sm text-gray-500">{tenant.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            tenant.subscription_tier === 'pro' ? 'purple' :
                              tenant.subscription_tier === 'enterprise' ? 'warning' : 'default'
                          }>
                            {tenant.subscription_tier}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {t('reseller.screensCount', '{{count}} screens', { count: tenant.screens_count })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleImpersonate(tenant.tenant_id, tenant.business_name || tenant.email)}
                        icon={<Eye size={14} aria-hidden="true" />}
                      >
                        {t('common.manage', 'Manage')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {tenants.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                  {t('reseller.viewAllTenants', 'View All Tenants')}
                </button>
              </div>
            )}
          </Card>

          {/* Recent Licenses */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('reseller.recentLicenses', 'Recent Licenses')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleExportLicenses} icon={<Download size={16} aria-hidden="true" />}>
                {t('common.export', 'Export')}
              </Button>
            </CardHeader>
            <div className="divide-y divide-gray-100" role="list" aria-label={t('reseller.licensesList', 'Licenses list')}>
              {licenses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                  <p>{t('reseller.noLicenses', 'No licenses generated yet')}</p>
                  <button
                    onClick={() => setShowGenerateLicenseModal(true)}
                    className="mt-3 text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    {t('reseller.generateFirstLicense', 'Generate your first license')}
                  </button>
                </div>
              ) : (
                licenses.map(license => (
                  <div key={license.id} className="p-4 hover:bg-gray-50" role="listitem">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm font-medium text-gray-900">
                          {formatLicenseCode(license.code)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            license.status === 'available' ? 'success' :
                              license.status === 'activated' ? 'info' : 'default'
                          }>
                            {license.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {license.plan_level} • {t('reseller.maxScreens', '{{count}} screens', { count: license.max_screens })}
                          </span>
                        </div>
                        {license.tenant && (
                          <div className="text-xs text-gray-500 mt-1">
                            {t('reseller.usedBy', 'Used by')}: {license.tenant.email}
                          </div>
                        )}
                      </div>
                      {license.status === 'available' && (
                        <button
                          onClick={() => handleCopyCode(license.code)}
                          className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                          aria-label={t('common.copyCode', 'Copy license code')}
                        >
                          {copiedCode === license.code ? (
                            <Check size={16} className="text-green-500" aria-hidden="true" />
                          ) : (
                            <Copy size={16} aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {licenses.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                  {t('reseller.viewAllLicenses', 'View All Licenses')}
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Brand Variants */}
        {brandVariants.length > 0 && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('reseller.brandVariants', 'Brand Variants')}</CardTitle>
              <Button variant="ghost" size="sm" icon={<Plus size={16} aria-hidden="true" />}>
                {t('reseller.newVariant', 'New Variant')}
              </Button>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4" role="list" aria-label={t('reseller.brandVariantsList', 'Brand variants list')}>
              {brandVariants.map(variant => (
                <div
                  key={variant.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  role="listitem"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {variant.logo_url ? (
                      <img
                        src={variant.logo_url}
                        alt={variant.name}
                        className="w-10 h-10 rounded object-contain"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: variant.primary_color }}
                        aria-hidden="true"
                      >
                        {variant.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{variant.name}</div>
                      <div className="text-xs text-gray-500">{variant.slug}</div>
                    </div>
                  </div>
                  {variant.custom_domain && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ExternalLink size={14} aria-hidden="true" />
                      {variant.custom_domain}
                    </div>
                  )}
                  <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                    {t('common.configure', 'Configure')}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Generate License Modal */}
        <Modal
          open={showGenerateLicenseModal}
          onClose={() => {
            setShowGenerateLicenseModal(false);
            setGeneratedLicenses([]);
          }}
          size="sm"
        >
          <ModalHeader>
            <ModalTitle>{t('reseller.generateLicenses', 'Generate Licenses')}</ModalTitle>
          </ModalHeader>
          <ModalContent>
            {generatedLicenses.length > 0 ? (
              <div>
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check size={18} aria-hidden="true" />
                    <span className="font-medium">
                      {t('reseller.generatedCount', 'Generated {{count}} license(s)', { count: generatedLicenses.length })}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto" role="list" aria-label={t('reseller.generatedLicenses', 'Generated licenses')}>
                  {generatedLicenses.map(license => (
                    <div
                      key={license.license_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      role="listitem"
                    >
                      <code className="font-mono text-sm">
                        {formatLicenseCode(license.license_code)}
                      </code>
                      <button
                        onClick={() => handleCopyCode(license.license_code)}
                        className="p-2 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={t('common.copyCode', 'Copy license code')}
                      >
                        {copiedCode === license.license_code ? (
                          <Check size={16} className="text-green-500" aria-hidden="true" />
                        ) : (
                          <Copy size={16} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('reseller.licenseType', 'License Type')}
                    </label>
                    <select
                      value={licenseForm.licenseType}
                      onChange={e => setLicenseForm(prev => ({ ...prev, licenseType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {LICENSE_TYPES.map(lt => (
                        <option key={lt.value} value={lt.value}>{lt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('reseller.planLevel', 'Plan Level')}
                    </label>
                    <select
                      value={licenseForm.planLevel}
                      onChange={e => setLicenseForm(prev => ({ ...prev, planLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PLAN_LEVELS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('reseller.maxScreensLabel', 'Max Screens')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={licenseForm.maxScreens}
                      onChange={e => setLicenseForm(prev => ({ ...prev, maxScreens: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('reseller.duration', 'Duration (days)')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={licenseForm.durationDays}
                      onChange={e => setLicenseForm(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('reseller.quantity', 'Quantity')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={licenseForm.quantity}
                    onChange={e => setLicenseForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('reseller.notesOptional', 'Notes (optional)')}
                  </label>
                  <input
                    type="text"
                    value={licenseForm.notes}
                    onChange={e => setLicenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('reseller.notesPlaceholder', 'e.g., For client XYZ')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </ModalContent>
          <ModalFooter>
            {generatedLicenses.length > 0 ? (
              <Button
                onClick={() => {
                  setShowGenerateLicenseModal(false);
                  setGeneratedLicenses([]);
                }}
                className="w-full"
              >
                {t('common.done', 'Done')}
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setShowGenerateLicenseModal(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleGenerateLicenses} loading={generating}>
                  {t('reseller.generateCount', 'Generate {{count}} License(s)', { count: licenseForm.quantity })}
                </Button>
              </>
            )}
          </ModalFooter>
        </Modal>

        {/* Add Tenant Modal (simplified) */}
        <Modal
          open={showAddTenantModal}
          onClose={() => setShowAddTenantModal(false)}
          size="sm"
        >
          <ModalHeader>
            <ModalTitle>{t('reseller.addTenant', 'Add Tenant')}</ModalTitle>
          </ModalHeader>
          <ModalContent>
            <p className="text-gray-600">
              {t('reseller.addTenantDesc', "Generate a license and share it with your client. When they redeem it, they'll be automatically added to your portfolio.")}
            </p>
          </ModalContent>
          <ModalFooter>
            <Button
              onClick={() => {
                setShowAddTenantModal(false);
                setShowGenerateLicenseModal(true);
              }}
              icon={<Key size={18} aria-hidden="true" />}
              className="w-full"
            >
              {t('reseller.generateLicenseForClient', 'Generate License for New Client')}
            </Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageLayout>
  );
}
