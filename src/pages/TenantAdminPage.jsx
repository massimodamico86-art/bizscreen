/**
 * TenantAdminPage - Super Admin Tenant Lifecycle Management
 *
 * Provides super_admin users with:
 * - Tenant status overview (trial, active, suspended, etc.)
 * - Lifecycle management (suspend, reactivate, reset trial)
 * - Usage reporting and tenant health dashboard
 *
 * @module pages/TenantAdminPage
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  getAllTenantsStatus,
  suspendTenant,
  reactivateTenant,
  resetTrial,
  expireTrial,
  getStatusText
} from '../services/billingService';


import {
  CheckCircle,
  Clock,
  Ban,
  Building2,
  CreditCard,
  Calendar
} from 'lucide-react';

/**
 * Status badge colors
 */
const STATUS_BADGES = {
  trialing: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-gray-100 text-gray-700',
  expired: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700'
};

/**
 * TenantAdminPage Component
 */
export default function TenantAdminPage({ showToast }) {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trialing: 0,
    pastDue: 0,
    suspended: 0,
    expired: 0
  });

  // Load tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAllTenantsStatus();
      setTenants(data);

      // Calculate stats
      const newStats = {
        total: data.length,
        active: data.filter(t => t.status === 'active').length,
        trialing: data.filter(t => t.status === 'trialing').length,
        pastDue: data.filter(t => t.status === 'past_due').length,
        suspended: data.filter(t => t.suspendedAt).length,
        expired: data.filter(t => t.status === 'expired' || t.isTrialExpired).length
      };
      setStats(newStats);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tenants
  const filteredTenants = useCallback(() => {
    let result = [...tenants];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.email?.toLowerCase().includes(query) ||
        t.displayName?.toLowerCase().includes(query) ||
        t.businessName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          result = result.filter(t => t.status === 'active');
          break;
        case 'trialing':
          result = result.filter(t => t.status === 'trialing' && !t.isTrialExpired);
          break;
        case 'past_due':
          result = result.filter(t => t.status === 'past_due' || t.overdueDays > 0);
          break;
        case 'suspended':
          result = result.filter(t => t.suspendedAt);
          break;
        case 'expired':
          result = result.filter(t => t.status === 'expired' || t.isTrialExpired);
          break;
        default:
          break;
      }
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'trialDaysLeft') {
        aVal = a.trialDaysLeft ?? -999;
        bVal = b.trialDaysLeft ?? -999;
      }

      if (typeof aVal === 'string') {
        return sortDesc
          ? bVal?.localeCompare(aVal)
          : aVal?.localeCompare(bVal);
      }

      return sortDesc ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [tenants, searchQuery, statusFilter, sortBy, sortDesc]);

  // Action handlers
  const handleSuspend = async (tenant, reason = 'manual') => {
    setActionLoading(tenant.ownerId);
    try {
      const result = await suspendTenant(tenant.ownerId, reason);
      if (result.success) {
        showToast?.(t('tenantAdmin.suspended', '{{email}} has been suspended', { email: tenant.email }));
        await loadTenants();
      } else {
        throw new Error(result.error || t('tenantAdmin.suspendFailed', 'Failed to suspend tenant'));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleReactivate = async (tenant) => {
    setActionLoading(tenant.ownerId);
    try {
      const result = await reactivateTenant(tenant.ownerId);
      if (result.success) {
        showToast?.(t('tenantAdmin.reactivated', '{{email}} has been reactivated', { email: tenant.email }));
        await loadTenants();
      } else {
        throw new Error(result.error || t('tenantAdmin.reactivateFailed', 'Failed to reactivate tenant'));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleResetTrial = async (tenant, days = 14) => {
    setActionLoading(tenant.ownerId);
    try {
      const result = await resetTrial(tenant.ownerId, days);
      if (result.success) {
        showToast?.(t('tenantAdmin.trialReset', 'Trial reset for {{email}} ({{days}} days)', { email: tenant.email, days }));
        await loadTenants();
      } else {
        throw new Error(result.error || t('tenantAdmin.trialResetFailed', 'Failed to reset trial'));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleExpireTrial = async (tenant) => {
    setActionLoading(tenant.ownerId);
    try {
      const result = await expireTrial(tenant.ownerId);
      if (result.success) {
        showToast?.(t('tenantAdmin.trialExpired', 'Trial expired for {{email}}', { email: tenant.email }));
        await loadTenants();
      } else {
        throw new Error(result.error || t('tenantAdmin.trialExpireFailed', 'Failed to expire trial'));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Defense-in-depth: Check role even though App.jsx should handle routing
  const isSuperAdmin = userProfile?.role === 'super_admin';

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  // Access denied for non-super-admin users
  if (!isSuperAdmin) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.accessDenied', 'Access Denied')}</h2>
              <p className="text-gray-600">{t('tenantAdmin.superAdminRequired', 'Super admin access required to view this page.')}</p>
            </div>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <ErrorBoundary>
      <PageLayout>
        <PageHeader
          title={t('tenantAdmin.title', 'Tenant Management')}
          description={t('tenantAdmin.description', 'Manage tenant lifecycle, billing status, and account health')}
          actions={
            <Button
              onClick={loadTenants}
              variant="secondary"
              disabled={loading}
              icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            >
              {t('common.refresh', 'Refresh')}
            </Button>
          }
        />

        <PageContent className="space-y-6">
          {/* Error */}
          {error && (
            <Alert variant="error" icon={<AlertTriangle size={16} />}>
              {error}
            </Alert>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <TenantStatCard
              label={t('tenantAdmin.totalTenants', 'Total Tenants')}
              value={stats.total}
              icon={Building2}
              color="gray"
            />
            <TenantStatCard
              label={t('tenantAdmin.active', 'Active')}
              value={stats.active}
              icon={CheckCircle}
              color="green"
              onClick={() => setStatusFilter('active')}
            />
            <TenantStatCard
              label={t('tenantAdmin.trialing', 'Trialing')}
              value={stats.trialing}
              icon={Clock}
              color="blue"
              onClick={() => setStatusFilter('trialing')}
            />
            <TenantStatCard
              label={t('tenantAdmin.pastDue', 'Past Due')}
              value={stats.pastDue}
              icon={CreditCard}
              color="yellow"
              onClick={() => setStatusFilter('past_due')}
            />
            <TenantStatCard
              label={t('tenantAdmin.expired', 'Expired')}
              value={stats.expired}
              icon={Calendar}
              color="red"
              onClick={() => setStatusFilter('expired')}
            />
            <TenantStatCard
              label={t('tenantAdmin.suspendedLabel', 'Suspended')}
              value={stats.suspended}
              icon={Ban}
              color="red"
              onClick={() => setStatusFilter('suspended')}
            />
          </div>

          {/* Filters */}
          <Card padding="default">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={t('tenantAdmin.searchPlaceholder', 'Search by email, name, or business...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label={t('tenantAdmin.searchTenants', 'Search tenants')}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" aria-hidden="true" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  aria-label={t('tenantAdmin.filterByStatus', 'Filter by status')}
                >
                  <option value="all">{t('tenantAdmin.allStatus', 'All Status')}</option>
                  <option value="active">{t('tenantAdmin.active', 'Active')}</option>
                  <option value="trialing">{t('tenantAdmin.trialing', 'Trialing')}</option>
                  <option value="past_due">{t('tenantAdmin.pastDue', 'Past Due')}</option>
                  <option value="expired">{t('tenantAdmin.expired', 'Expired')}</option>
                  <option value="suspended">{t('tenantAdmin.suspendedLabel', 'Suspended')}</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortDesc ? 'desc' : 'asc'}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortDesc(order === 'desc');
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                aria-label={t('tenantAdmin.sortBy', 'Sort by')}
              >
                <option value="created_at-desc">{t('tenantAdmin.newestFirst', 'Newest First')}</option>
                <option value="created_at-asc">{t('tenantAdmin.oldestFirst', 'Oldest First')}</option>
                <option value="email-asc">{t('tenantAdmin.emailAZ', 'Email A-Z')}</option>
                <option value="trialDaysLeft-asc">{t('tenantAdmin.trialEndingSoon', 'Trial Ending Soon')}</option>
              </select>
            </div>
          </Card>

          {/* Tenants Table */}
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('tenantAdmin.tenantsTable', 'Tenants table')}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('tenantAdmin.tenant', 'Tenant')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('tenantAdmin.plan', 'Plan')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.status', 'Status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('tenantAdmin.trial', 'Trial')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('tenantAdmin.billing', 'Billing')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTenants().map(tenant => (
                    <TenantRow
                      key={tenant.ownerId}
                      tenant={tenant}
                      showActionsMenu={showActionsMenu}
                      setShowActionsMenu={setShowActionsMenu}
                      actionLoading={actionLoading}
                      onSuspend={() => setShowConfirmModal({ type: 'suspend', tenant })}
                      onReactivate={() => handleReactivate(tenant)}
                      onResetTrial={() => setShowConfirmModal({ type: 'resetTrial', tenant })}
                      onExpireTrial={() => handleExpireTrial(tenant)}
                      onViewDetails={() => setSelectedTenant(tenant)}
                      t={t}
                    />
                  ))}
                  {filteredTenants().length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {t('tenantAdmin.noTenantsFound', 'No tenants found matching your filters')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Confirm Modal */}
          {showConfirmModal && (
            <ConfirmModal
              type={showConfirmModal.type}
              tenant={showConfirmModal.tenant}
              onConfirm={() => {
                if (showConfirmModal.type === 'suspend') {
                  handleSuspend(showConfirmModal.tenant);
                } else if (showConfirmModal.type === 'resetTrial') {
                  handleResetTrial(showConfirmModal.tenant);
                }
              }}
              onCancel={() => setShowConfirmModal(null)}
              loading={actionLoading === showConfirmModal.tenant.ownerId}
              t={t}
            />
          )}

          {/* Tenant Details Drawer */}
          {selectedTenant && (
            <TenantDetailsDrawer
              tenant={selectedTenant}
              onClose={() => setSelectedTenant(null)}
              t={t}
            />
          )}
        </PageContent>
      </PageLayout>
    </ErrorBoundary>
  );
}

/**
 * Tenant Stat Card Component (local to avoid conflict with design-system StatCard)
 */
function TenantStatCard({ label, value, icon: Icon, color, onClick }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-4 ${onClick ? 'cursor-pointer hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`} aria-hidden="true">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tenant Row Component
 */
function TenantRow({
  tenant,
  showActionsMenu,
  setShowActionsMenu,
  actionLoading,
  onSuspend,
  onReactivate,
  onResetTrial,
  onExpireTrial,
  onViewDetails,
  t
}) {
  const isLoading = actionLoading === tenant.ownerId;
  const isSuspended = !!tenant.suspendedAt;

  return (
    <tr className={`hover:bg-gray-50 ${isSuspended ? 'bg-red-50/50' : ''}`}>
      {/* Tenant */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {tenant.displayName || tenant.email}
          </p>
          <p className="text-xs text-gray-500">{tenant.email}</p>
          {tenant.businessName && (
            <p className="text-xs text-gray-400">{tenant.businessName}</p>
          )}
        </div>
      </td>

      {/* Plan */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900">
          {tenant.planName || t('tenantAdmin.noPlan', 'No Plan')}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGES[tenant.status] || 'bg-gray-100 text-gray-600'}`}>
            {getStatusText(tenant.status)}
          </span>
          {isSuspended && (
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
              {t('tenantAdmin.suspendedLabel', 'Suspended')}
            </span>
          )}
          {tenant.frozenReadonly && (
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {t('tenantAdmin.readOnly', 'Read-Only')}
            </span>
          )}
        </div>
      </td>

      {/* Trial */}
      <td className="px-6 py-4 whitespace-nowrap">
        {tenant.trialDaysLeft !== null ? (
          <div>
            {tenant.isTrialExpired ? (
              <span className="text-xs text-red-600 font-medium">{t('tenantAdmin.expired', 'Expired')}</span>
            ) : tenant.trialDaysLeft <= 0 ? (
              <span className="text-xs text-red-600 font-medium">{t('tenantAdmin.endsToday', 'Ends Today')}</span>
            ) : (
              <span className={`text-xs font-medium ${tenant.trialDaysLeft <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                {t('tenantAdmin.daysLeft', '{{days}} days left', { days: tenant.trialDaysLeft })}
              </span>
            )}
            {tenant.trialEndsAt && (
              <p className="text-xs text-gray-400">
                {new Date(tenant.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">{t('common.na', 'N/A')}</span>
        )}
      </td>

      {/* Billing */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          {tenant.overdueDays > 0 ? (
            <span className="text-xs text-red-600 font-medium">
              {t('tenantAdmin.daysOverdue', '{{days}} days overdue', { days: tenant.overdueDays })}
            </span>
          ) : tenant.billingWarning ? (
            <span className="text-xs text-yellow-600">{tenant.billingWarning}</span>
          ) : (
            <span className="text-xs text-green-600">{t('common.ok', 'OK')}</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActionsMenu(showActionsMenu === tenant.ownerId ? null : tenant.ownerId);
            }}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('tenantAdmin.tenantActions', 'Tenant actions')}
            aria-haspopup="true"
            aria-expanded={showActionsMenu === tenant.ownerId}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MoreVertical size={16} />
            )}
          </button>

          {showActionsMenu === tenant.ownerId && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10" role="menu">
              <button
                onClick={onViewDetails}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                role="menuitem"
              >
                <Eye size={14} aria-hidden="true" />
                {t('common.viewDetails', 'View Details')}
              </button>

              {!isSuspended && (
                <button
                  onClick={onSuspend}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  role="menuitem"
                >
                  <Pause size={14} aria-hidden="true" />
                  {t('tenantAdmin.suspendAccount', 'Suspend Account')}
                </button>
              )}

              {isSuspended && (
                <button
                  onClick={onReactivate}
                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                  role="menuitem"
                >
                  <Play size={14} aria-hidden="true" />
                  {t('tenantAdmin.reactivateAccount', 'Reactivate Account')}
                </button>
              )}

              <button
                onClick={onResetTrial}
                className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                role="menuitem"
              >
                <RotateCcw size={14} aria-hidden="true" />
                {t('tenantAdmin.resetTrial', 'Reset Trial')}
              </button>

              {tenant.status === 'trialing' && !tenant.isTrialExpired && (
                <button
                  onClick={onExpireTrial}
                  className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                  role="menuitem"
                >
                  <Clock size={14} aria-hidden="true" />
                  {t('tenantAdmin.expireTrialNow', 'Expire Trial Now')}
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Confirm Modal Component
 */
function ConfirmModal({ type, tenant, onConfirm, onCancel, loading, t }) {
  const [reason, setReason] = useState('');
  const [trialDays, setTrialDays] = useState(14);

  const config = {
    suspend: {
      title: t('tenantAdmin.suspendAccountTitle', 'Suspend Account'),
      message: t('tenantAdmin.suspendConfirm', 'Are you sure you want to suspend {{email}}? They will lose access to the platform.', { email: tenant.email }),
      confirmLabel: t('tenantAdmin.suspend', 'Suspend'),
      confirmClass: 'bg-red-600 hover:bg-red-700',
      showReason: true
    },
    resetTrial: {
      title: t('tenantAdmin.resetTrialTitle', 'Reset Trial'),
      message: t('tenantAdmin.resetTrialConfirm', 'Reset the trial period for {{email}}?', { email: tenant.email }),
      confirmLabel: t('tenantAdmin.resetTrial', 'Reset Trial'),
      confirmClass: 'bg-blue-600 hover:bg-blue-700',
      showTrialDays: true
    }
  }[type];

  return (
    <Modal open={true} onClose={onCancel} size="sm">
      <ModalHeader>
        <ModalTitle>{config.title}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p className="text-gray-600 mb-4">{config.message}</p>

        {config.showReason && (
          <div className="mb-4">
            <label htmlFor="suspend-reason" className="block text-sm font-medium text-gray-700 mb-1">
              {t('tenantAdmin.reasonOptional', 'Reason (optional)')}
            </label>
            <input
              id="suspend-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('tenantAdmin.reasonPlaceholder', 'e.g., Payment fraud, ToS violation')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {config.showTrialDays && (
          <div className="mb-4">
            <label htmlFor="trial-days" className="block text-sm font-medium text-gray-700 mb-1">
              {t('tenantAdmin.trialDays', 'Trial Days')}
            </label>
            <select
              id="trial-days"
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>{t('tenantAdmin.days', '{{count}} days', { count: 7 })}</option>
              <option value={14}>{t('tenantAdmin.days', '{{count}} days', { count: 14 })}</option>
              <option value={30}>{t('tenantAdmin.days', '{{count}} days', { count: 30 })}</option>
              <option value={60}>{t('tenantAdmin.days', '{{count}} days', { count: 60 })}</option>
            </select>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          loading={loading}
          variant={type === 'suspend' ? 'danger' : 'primary'}
        >
          {config.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Tenant Details Drawer
 */
function TenantDetailsDrawer({ tenant, onClose, t }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 id="drawer-title" className="text-xl font-bold text-gray-900">
              {t('tenantAdmin.tenantDetails', 'Tenant Details')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={t('common.close', 'Close')}
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Identity */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('tenantAdmin.identity', 'Identity')}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">{t('common.email', 'Email')}:</span>{' '}
                <span className="font-medium">{tenant.email}</span>
              </p>
              {tenant.displayName && (
                <p className="text-sm">
                  <span className="text-gray-500">{t('common.name', 'Name')}:</span>{' '}
                  <span className="font-medium">{tenant.displayName}</span>
                </p>
              )}
              {tenant.businessName && (
                <p className="text-sm">
                  <span className="text-gray-500">{t('tenantAdmin.business', 'Business')}:</span>{' '}
                  <span className="font-medium">{tenant.businessName}</span>
                </p>
              )}
              <p className="text-sm">
                <span className="text-gray-500">{t('common.id', 'ID')}:</span>{' '}
                <span className="font-mono text-xs">{tenant.ownerId}</span>
              </p>
            </div>
          </div>

          {/* Subscription */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('tenantAdmin.subscription', 'Subscription')}</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">{t('tenantAdmin.plan', 'Plan')}:</span>{' '}
                <span className="font-medium">{tenant.planName || t('common.none', 'None')}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">{t('common.status', 'Status')}:</span>{' '}
                <span className={`font-medium px-2 py-0.5 rounded-full ${STATUS_BADGES[tenant.status] || ''}`}>
                  {getStatusText(tenant.status)}
                </span>
              </p>
            </div>
          </div>

          {/* Trial */}
          {tenant.trialEndsAt && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('tenantAdmin.trial', 'Trial')}</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500">{t('tenantAdmin.ends', 'Ends')}:</span>{' '}
                  <span className="font-medium">
                    {new Date(tenant.trialEndsAt).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">{t('tenantAdmin.daysLeftLabel', 'Days Left')}:</span>{' '}
                  <span className="font-medium">{tenant.trialDaysLeft ?? t('common.na', 'N/A')}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">{t('tenantAdmin.expired', 'Expired')}:</span>{' '}
                  <span className="font-medium">{tenant.isTrialExpired ? t('common.yes', 'Yes') : t('common.no', 'No')}</span>
                </p>
              </div>
            </div>
          )}

          {/* Billing Issues */}
          {(tenant.suspendedAt || tenant.overdueSince || tenant.frozenReadonly) && (
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-2">{t('tenantAdmin.issues', 'Issues')}</h3>
              <div className="bg-red-50 rounded-lg p-4 space-y-2">
                {tenant.suspendedAt && (
                  <>
                    <p className="text-sm">
                      <span className="text-gray-500">{t('tenantAdmin.suspendedLabel', 'Suspended')}:</span>{' '}
                      <span className="font-medium text-red-600">
                        {new Date(tenant.suspendedAt).toLocaleDateString()}
                      </span>
                    </p>
                    {tenant.suspensionReason && (
                      <p className="text-sm">
                        <span className="text-gray-500">{t('tenantAdmin.reason', 'Reason')}:</span>{' '}
                        <span className="font-medium">{tenant.suspensionReason}</span>
                      </p>
                    )}
                  </>
                )}
                {tenant.overdueSince && (
                  <p className="text-sm">
                    <span className="text-gray-500">{t('tenantAdmin.overdueSince', 'Overdue Since')}:</span>{' '}
                    <span className="font-medium text-red-600">
                      {new Date(tenant.overdueSince).toLocaleDateString()}
                    </span>
                  </p>
                )}
                {tenant.frozenReadonly && (
                  <p className="text-sm text-red-600 font-medium">
                    {t('tenantAdmin.accountReadOnly', 'Account in read-only mode')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Billing Warning */}
          {tenant.billingWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">{tenant.billingWarning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
