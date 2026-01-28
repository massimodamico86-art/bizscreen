/**
 * DemoToolsPage - Super Admin Demo Management
 *
 * Provides tools for creating, managing, and running demos:
 * - Create demo tenants by business type
 * - Impersonate demo tenants
 * - Reset demo tenant data
 * - Generate shareable demo links
 *
 * @module pages/DemoToolsPage
 */
import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  Users,
  Building2,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag
} from 'lucide-react';


import {
  listDemoTenants,
  createDemoTenant,
  resetDemoTenant,
  updateDemoSettings,
  generateDemoLink,
  DEMO_BUSINESS_TYPES,
  DEMO_PLAN_LEVELS
} from '../services/demoService';
import { startImpersonation } from '../services/tenantService';

/**
 * Icon mapping for business types
 */
const BUSINESS_ICONS = {
  restaurant: Utensils,
  salon: Scissors,
  gym: Dumbbell,
  retail: ShoppingBag,
  other: Building2
};

/**
 * DemoToolsPage Component
 */
export default function DemoToolsPage({ showToast }) {
  const { t } = useTranslation();
  const logger = useLogger('DemoToolsPage');
  const [demoTenants, setDemoTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(null);

  // Load demo tenants
  useEffect(() => {
    loadDemoTenants();
  }, []);

  const loadDemoTenants = async () => {
    setLoading(true);
    try {
      const tenants = await listDemoTenants();
      setDemoTenants(tenants);
    } catch (err) {
      logger.error('Error loading demo tenants:', err);
      showToast?.('Failed to load demo tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (businessType, planLevel) => {
    setActionLoading('create');
    try {
      const result = await createDemoTenant(businessType, planLevel);
      if (result.success) {
        showToast?.(`Demo tenant created: ${result.email}`);
        setShowCreateModal(false);
        await loadDemoTenants();
      } else {
        throw new Error(result.error || 'Failed to create tenant');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetTenant = async (tenant) => {
    if (!confirm(`Reset demo data for ${tenant.email}? This will delete all non-protected content.`)) {
      return;
    }

    setActionLoading(tenant.id);
    try {
      const result = await resetDemoTenant(tenant.id);
      if (result.success) {
        showToast?.(`Demo tenant reset: ${tenant.email}`);
        await loadDemoTenants();
      } else {
        throw new Error(result.error || 'Failed to reset tenant');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (tenant) => {
    try {
      await startImpersonation(tenant.id);
      showToast?.(`Now acting as ${tenant.email}`);
      window.location.reload();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    showToast?.('Link copied to clipboard');
  };

  // Stats
  const totalTenants = demoTenants.length;
  const staleTenants = demoTenants.filter(t => t.is_stale).length;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('demoTools.title', 'Demo Tools')}
        description={t('demoTools.description', 'Create and manage demo tenants for sales demonstrations')}
        icon={<Users className="w-5 h-5 text-blue-600" />}
        iconBackground="bg-blue-100"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadDemoTenants} icon={<RefreshCw size={16} />}>
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={16} />}>
              {t('demoTools.createDemoTenant', 'Create Demo Tenant')}
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTenants}</p>
                <p className="text-xs text-gray-500">{t('demoTools.demoTenants', 'Demo Tenants')}</p>
              </div>
            </div>
          </Card>

          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg" aria-hidden="true">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{staleTenants}</p>
                <p className="text-xs text-gray-500">{t('demoTools.needReset', 'Need Reset')}</p>
              </div>
            </div>
          </Card>

          <Card padding="default" className="col-span-2">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="font-medium text-gray-900">{t('demoTools.autoReset', 'Auto-Reset')}</p>
                <p className="text-sm text-gray-500">
                  {t('demoTools.autoResetDescription', 'Demo tenants reset automatically based on their interval')}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/demo/reset-stale-tenants', {
                      headers: {
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                      }
                    });
                    const data = await res.json();
                    showToast?.(t('demoTools.resetStaleSuccess', 'Reset {{count}} stale tenants', { count: data.reset || 0 }));
                    await loadDemoTenants();
                  } catch (err) {
                    showToast?.(t('demoTools.resetStaleFailed', 'Failed to reset stale tenants'), 'error');
                  }
                }}
                icon={<RotateCcw size={14} />}
              >
                {t('demoTools.resetStaleNow', 'Reset Stale Now')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Stale warning */}
        {staleTenants > 0 && (
          <Alert variant="warning" className="mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">
                  {t('demoTools.staleWarningTitle', '{{count}} demo tenant(s) need reset', { count: staleTenants })}
                </p>
                <p className="text-sm text-yellow-700">
                  {t('demoTools.staleWarningDescription', "These tenants haven't been reset within their configured interval")}
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Demo Tenants List */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">{t('demoTools.demoTenants', 'Demo Tenants')}</h2>
          </div>

          {demoTenants.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={t('demoTools.noTenants', 'No demo tenants yet')}
                description={t('demoTools.noTenantsDescription', 'Create your first demo tenant to start running demos')}
                action={{
                  label: t('demoTools.createDemoTenant', 'Create Demo Tenant'),
                  onClick: () => setShowCreateModal(true),
                  icon: <Plus size={16} />
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100" role="list" aria-label={t('demoTools.tenantsList', 'Demo tenants list')}>
              {demoTenants.map(tenant => {
                const Icon = BUSINESS_ICONS[tenant.demo_business_type] || Building2;
                const isLoading = actionLoading === tenant.id;

                return (
                  <div
                    key={tenant.id}
                    role="listitem"
                    className={`p-4 hover:bg-gray-50 ${tenant.is_stale ? 'bg-yellow-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="p-3 bg-gray-100 rounded-lg" aria-hidden="true">
                        <Icon size={24} className="text-gray-600" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {tenant.business_name || tenant.email}
                          </p>
                          {tenant.is_stale && (
                            <Badge variant="warning">{t('demoTools.stale', 'Stale')}</Badge>
                          )}
                          <Badge variant="secondary">{tenant.plan_name || t('common.free', 'Free')}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{tenant.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>{t('demoTools.type', 'Type')}: {tenant.demo_business_type || 'other'}</span>
                          <span>{t('demoTools.resetInterval', 'Reset interval')}: {tenant.demo_reset_interval_minutes}{t('demoTools.min', 'min')}</span>
                          {tenant.demo_last_reset_at && (
                            <span>
                              {t('demoTools.lastReset', 'Last reset')}: {new Date(tenant.demo_last_reset_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleImpersonate(tenant)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={t('demoTools.impersonate', 'Impersonate (start demo)')}
                        >
                          <Play size={18} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleResetTenant(tenant)}
                          disabled={isLoading}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          aria-label={t('demoTools.resetDemoData', 'Reset demo data')}
                        >
                          {isLoading ? (
                            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <RotateCcw size={18} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowLinksModal(tenant)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={t('demoTools.generateDemoLinks', 'Generate demo links')}
                        >
                          <Link2 size={18} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setShowSettingsModal(tenant)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={t('common.settings', 'Settings')}
                        >
                          <Settings size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <CreateDemoModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateTenant}
            loading={actionLoading === 'create'}
            t={t}
          />
        )}

        {/* Links Modal */}
        {showLinksModal && (
          <DemoLinksModal
            tenant={showLinksModal}
            onClose={() => setShowLinksModal(null)}
            onCopy={handleCopyLink}
            t={t}
          />
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <DemoSettingsModal
            tenant={showSettingsModal}
            onClose={() => setShowSettingsModal(null)}
            onSave={async (settings) => {
              const result = await updateDemoSettings(showSettingsModal.id, settings);
              if (result.success) {
                showToast?.(t('demoTools.settingsUpdated', 'Settings updated'));
                await loadDemoTenants();
              }
              setShowSettingsModal(null);
            }}
            t={t}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}

/**
 * Create Demo Tenant Modal
 */
function CreateDemoModal({ onClose, onCreate, loading, t }) {
  const [businessType, setBusinessType] = useState('other');
  const [planLevel, setPlanLevel] = useState('starter');

  return (
    <Modal isOpen onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{t('demoTools.createDemoTenant', 'Create Demo Tenant')}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        {/* Business Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('demoTools.businessType', 'Business Type')}
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('demoTools.selectBusinessType', 'Select business type')}>
            {DEMO_BUSINESS_TYPES.map(type => {
              const Icon = BUSINESS_ICONS[type.value] || Building2;
              return (
                <button
                  key={type.value}
                  onClick={() => setBusinessType(type.value)}
                  role="radio"
                  aria-checked={businessType === type.value}
                  className={`p-3 border rounded-lg flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    businessType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('demoTools.planLevel', 'Plan Level')}
          </label>
          <div className="space-y-2" role="radiogroup" aria-label={t('demoTools.selectPlanLevel', 'Select plan level')}>
            {DEMO_PLAN_LEVELS.map(plan => (
              <button
                key={plan.value}
                onClick={() => setPlanLevel(plan.value)}
                role="radio"
                aria-checked={planLevel === plan.value}
                className={`w-full p-3 border rounded-lg flex items-center justify-between transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  planLevel === plan.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <span className="font-medium">{plan.label}</span>
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </div>
                {planLevel === plan.value && (
                  <Check size={18} className="text-blue-600" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={() => onCreate(businessType, planLevel)}
          disabled={loading}
          icon={loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        >
          {t('common.create', 'Create')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Demo Links Modal
 */
function DemoLinksModal({ tenant, onClose, onCopy, t }) {
  const links = [
    {
      label: t('demoTools.analyticsDashboard', 'Analytics Dashboard'),
      description: t('demoTools.analyticsDescription', 'Read-only analytics preview'),
      url: generateDemoLink('analytics', tenant.id)
    },
    {
      label: t('demoTools.screenPreview', 'Screen Preview'),
      description: t('demoTools.screenPreviewDescription', 'Live screen content preview'),
      url: generateDemoLink('screen', tenant.id)
    }
  ];

  return (
    <Modal isOpen onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{t('demoTools.demoLinks', 'Demo Links')}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm text-gray-500 mb-4">
          {t('demoTools.shareLinksDescription', 'Share these read-only links with prospects')}
        </p>

        <div className="space-y-3" role="list" aria-label={t('demoTools.demoLinksList', 'Demo links')}>
          {links.map(link => (
            <div
              key={link.label}
              role="listitem"
              className="p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{link.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onCopy(link.url)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={t('demoTools.copyLink', 'Copy link')}
                  >
                    <Copy size={14} aria-hidden="true" />
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={t('demoTools.openInNewTab', 'Open in new tab')}
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-500">{link.description}</p>
              <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded mt-2 block truncate">
                {link.url}
              </code>
            </div>
          ))}
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Demo Settings Modal
 */
function DemoSettingsModal({ tenant, onClose, onSave, t }) {
  const [resetInterval, setResetInterval] = useState(
    tenant.demo_reset_interval_minutes || 60
  );

  return (
    <Modal isOpen onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{t('demoTools.demoSettings', 'Demo Settings')}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div>
          <label htmlFor="reset-interval" className="block text-sm font-medium text-gray-700 mb-2">
            {t('demoTools.autoResetIntervalLabel', 'Auto-Reset Interval (minutes)')}
          </label>
          <select
            id="reset-interval"
            value={resetInterval}
            onChange={(e) => setResetInterval(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={30}>{t('demoTools.30minutes', '30 minutes')}</option>
            <option value={60}>{t('demoTools.1hour', '1 hour')}</option>
            <option value={120}>{t('demoTools.2hours', '2 hours')}</option>
            <option value={240}>{t('demoTools.4hours', '4 hours')}</option>
            <option value={480}>{t('demoTools.8hours', '8 hours')}</option>
            <option value={1440}>{t('demoTools.24hours', '24 hours')}</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {t('demoTools.autoResetDescription', 'Demo data will be reset automatically after this interval')}
          </p>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button onClick={() => onSave({ demo_reset_interval_minutes: resetInterval })}>
          {t('common.save', 'Save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Need to import supabase for the reset call
import { supabase } from '../supabase';
