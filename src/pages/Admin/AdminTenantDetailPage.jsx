/**
 * Admin Tenant Detail Page
 * Phase 17: Detailed tenant view with tabs for Overview, Users, Screens, Billing
 */

import { useState, useCallback } from 'react';
import {
  Users,
  Monitor,
  CreditCard,
  LayoutDashboard,
} from 'lucide-react';
import { useTenantDetail } from '../../hooks/useAdmin';
import { PLAN_OPTIONS, TENANT_STATUS_OPTIONS, QUOTA_FEATURE_NAMES } from '../../services/adminService';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'screens', label: 'Screens', icon: Monitor },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function AdminTenantDetailPage({ tenantId, onNavigate, showToast }) {
  const {
    tenant,
    loading,
    error,
    actionLoading,
    isSuperAdmin,
    refresh,
    changePlan,
    suspend,
    overrideFeature,
    overrideQuota,
    resetPassword,
    disableUser,
    rebootScreen,
  } = useTenantDetail(tenantId);

  const [activeTab, setActiveTab] = useState('overview');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedQuotaFeature, setSelectedQuotaFeature] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'suspend'|'unsuspend', title, message }

  const handleBack = useCallback(() => {
    onNavigate?.('admin-tenants');
  }, [onNavigate]);

  const handleAction = useCallback(async (action, ...args) => {
    try {
      const result = await action(...args);
      showToast?.({ type: 'success', message: result.message || 'Action completed' });
      return result;
    } catch (err) {
      showToast?.({ type: 'error', message: err.message });
      throw err;
    }
  }, [showToast]);

  const getStatusBadge = (status) => {
    const statusConfig = TENANT_STATUS_OPTIONS.find(s => s.value === status) || TENANT_STATUS_OPTIONS[0];
    const colors = {
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[statusConfig.color]}`}>
        {status === 'active' && <CheckCircle className="w-4 h-4 mr-1.5" />}
        {status === 'suspended' && <XCircle className="w-4 h-4 mr-1.5" />}
        {status === 'pending' && <AlertCircle className="w-4 h-4 mr-1.5" />}
        {statusConfig.label}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const planConfig = PLAN_OPTIONS.find(p => p.value === plan);
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800',
      reseller: 'bg-orange-100 text-orange-800',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[plan] || colors.free}`}>
        {planConfig?.label || plan}
      </span>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">Super admin access required</p>
        </div>
      </div>
    );
  }

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-gray-500">Loading tenant details...</span>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Error Loading Tenant</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">{tenant.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {getStatusBadge(tenant.status)}
            {getPlanBadge(tenant.plan)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tenant.status === 'active' ? (
            <button
              onClick={() => setConfirmAction({
                type: 'suspend',
                title: 'Suspend Tenant',
                message: `Are you sure you want to suspend "${tenant.name}"? This will immediately block all users from accessing the platform.`,
                confirmLabel: 'Suspend Tenant',
                variant: 'danger',
              })}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              Suspend
            </button>
          ) : tenant.status === 'suspended' ? (
            <button
              onClick={() => setConfirmAction({
                type: 'unsuspend',
                title: 'Reactivate Tenant',
                message: `Are you sure you want to reactivate "${tenant.name}"? Users will regain access immediately.`,
                confirmLabel: 'Reactivate',
                variant: 'success',
              })}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Unsuspend
            </button>
          ) : null}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab
            tenant={tenant}
            onOverrideFeature={(key, enabled) => handleAction(overrideFeature, key, enabled, 'Admin override')}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={tenant.users || []}
            onResetPassword={(userId) => handleAction(resetPassword, userId, true)}
            onDisableUser={(userId, action) => handleAction(disableUser, userId, action, 'Admin action')}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === 'screens' && (
          <ScreensTab
            screens={tenant.screens || []}
            onReboot={(screenId) => handleAction(rebootScreen, screenId, 'Admin action')}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === 'billing' && (
          <BillingTab
            tenant={tenant}
            showPlanModal={showPlanModal}
            setShowPlanModal={setShowPlanModal}
            showQuotaModal={showQuotaModal}
            setShowQuotaModal={setShowQuotaModal}
            selectedQuotaFeature={selectedQuotaFeature}
            setSelectedQuotaFeature={setSelectedQuotaFeature}
            onChangePlan={(plan) => handleAction(changePlan, plan, 'Admin plan change')}
            onOverrideQuota={(feature, options) => handleAction(overrideQuota, feature, options)}
            actionLoading={actionLoading}
          />
        )}
      </div>

      {/* Plan Change Modal */}
      {showPlanModal && (
        <PlanChangeModal
          currentPlan={tenant.plan}
          onClose={() => setShowPlanModal(false)}
          onConfirm={(plan) => {
            handleAction(changePlan, plan, 'Admin plan change');
            setShowPlanModal(false);
          }}
          loading={actionLoading}
        />
      )}

      {/* Quota Override Modal */}
      {showQuotaModal && selectedQuotaFeature && (
        <QuotaOverrideModal
          feature={selectedQuotaFeature}
          currentOverride={tenant.quotaOverrides?.find(q => q.feature_key === selectedQuotaFeature)}
          onClose={() => {
            setShowQuotaModal(false);
            setSelectedQuotaFeature(null);
          }}
          onConfirm={(options) => {
            handleAction(overrideQuota, selectedQuotaFeature, options);
            setShowQuotaModal(false);
            setSelectedQuotaFeature(null);
          }}
          loading={actionLoading}
        />
      )}

      {/* Confirmation Modal for Destructive Actions */}
      {confirmAction && (
        <ConfirmActionModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          loading={actionLoading}
          onClose={() => setConfirmAction(null)}
          onConfirm={async () => {
            await handleAction(suspend, confirmAction.type, 'Admin action');
            setConfirmAction(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function OverviewTab({ tenant, onOverrideFeature, actionLoading }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tenant Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          Tenant Information
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Name</dt>
            <dd className="text-sm font-medium text-gray-900">{tenant.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Slug</dt>
            <dd className="text-sm font-medium text-gray-900">{tenant.slug}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Created</dt>
            <dd className="text-sm font-medium text-gray-900">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Users</dt>
            <dd className="text-sm font-medium text-gray-900">{tenant.users?.length || 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Screens</dt>
            <dd className="text-sm font-medium text-gray-900">{tenant.screens?.length || 0}</dd>
          </div>
        </dl>
      </div>

      {/* Usage Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          Usage Summary (This Month)
        </h3>
        {tenant.usageSummary && Object.keys(tenant.usageSummary).length > 0 ? (
          <dl className="space-y-3">
            {Object.entries(tenant.usageSummary).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="text-sm text-gray-500">{QUOTA_FEATURE_NAMES[key] || key}</dt>
                <dd className="text-sm font-medium text-gray-900">{value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No usage data available</p>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-gray-400" />
          Feature Flags
        </h3>
        {tenant.featureFlags && Object.keys(tenant.featureFlags).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tenant.featureFlags).map(([key, enabled]) => {
              const hasOverride = tenant.featureFlagOverrides?.some(o => o.feature_key === key);
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    hasOverride ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{key}</span>
                    {hasOverride && (
                      <span className="text-xs text-yellow-600 font-medium">Override</span>
                    )}
                  </div>
                  <button
                    onClick={() => onOverrideFeature(key, !enabled)}
                    disabled={actionLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No feature flags configured</p>
        )}
      </div>
    </div>
  );
}

function UsersTab({ users, onResetPassword, onDisableUser, actionLoading }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No users in this tenant</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Login
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || 'No name'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.status === 'disabled' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Disabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onResetPassword(user.id)}
                    disabled={actionLoading}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                    title="Reset Password"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  {user.status === 'disabled' ? (
                    <button
                      onClick={() => onDisableUser(user.id, 'enable')}
                      disabled={actionLoading}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                      title="Enable User"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onDisableUser(user.id, 'disable')}
                      disabled={actionLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Disable User"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScreensTab({ screens, onReboot, actionLoading }) {
  if (screens.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No screens in this tenant</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Screen
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Device ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Seen
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {screens.map((screen) => (
            <tr key={screen.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {screen.name || 'Unnamed Screen'}
                    </div>
                    {screen.location && (
                      <div className="text-sm text-gray-500">{screen.location}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(screen.status)}`}>
                  {screen.status || 'unknown'}
                </span>
                {screen.pending_command && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    {screen.pending_command}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                {screen.device_id || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {screen.last_seen_at
                  ? new Date(screen.last_seen_at).toLocaleString()
                  : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => onReboot(screen.id)}
                  disabled={actionLoading || screen.pending_command === 'reboot'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                  title="Force Reboot"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reboot
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillingTab({
  tenant,
  showPlanModal,
  setShowPlanModal,
  showQuotaModal,
  setShowQuotaModal,
  selectedQuotaFeature,
  setSelectedQuotaFeature,
  onChangePlan,
  onOverrideQuota,
  actionLoading,
}) {
  const currentPlanConfig = PLAN_OPTIONS.find(p => p.value === tenant.plan);

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Current Plan
          </h3>
          <button
            onClick={() => setShowPlanModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
          >
            <Settings className="w-4 h-4" />
            Change Plan
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-100 rounded-xl">
            <CreditCard className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{currentPlanConfig?.label || tenant.plan}</p>
            {tenant.subscription?.current_period_end && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
                Renews {new Date(tenant.subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quota Overrides */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Quota Overrides
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Override default plan quotas for this tenant
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(QUOTA_FEATURE_NAMES).map(([key, name]) => {
            const override = tenant.quotaOverrides?.find(q => q.feature_key === key);
            return (
              <div
                key={key}
                className={`p-4 rounded-lg border ${
                  override ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <button
                    onClick={() => {
                      setSelectedQuotaFeature(key);
                      setShowQuotaModal(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {override ? 'Edit' : 'Override'}
                  </button>
                </div>
                {override ? (
                  <div className="text-sm">
                    {override.is_unlimited ? (
                      <span className="text-green-600 font-medium">Unlimited</span>
                    ) : (
                      <span className="text-gray-900 font-medium">
                        {override.monthly_limit?.toLocaleString()} / month
                      </span>
                    )}
                    {override.expires_at && (
                      <span className="text-gray-500 ml-2">
                        (expires {new Date(override.expires_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Using plan default</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription History */}
      {tenant.subscription && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            Subscription Details
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Status</dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">{tenant.subscription.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Plan</dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">{tenant.subscription.plan_slug}</dd>
            </div>
            {tenant.subscription.current_period_start && (
              <div>
                <dt className="text-sm text-gray-500">Period Start</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(tenant.subscription.current_period_start).toLocaleDateString()}
                </dd>
              </div>
            )}
            {tenant.subscription.current_period_end && (
              <div>
                <dt className="text-sm text-gray-500">Period End</dt>
                <dd className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(tenant.subscription.current_period_end).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function ConfirmActionModal({ title, message, confirmLabel, variant = 'danger', loading, onClose, onConfirm }) {
  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600 bg-red-100',
    },
    success: {
      button: 'bg-green-600 hover:bg-green-700 text-white',
      icon: 'text-green-600 bg-green-100',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600 bg-yellow-100',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-2 rounded-full ${styles.icon}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${styles.button}`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanChangeModal({ currentPlan, onClose, onConfirm, loading }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Plan</h3>
          <div className="space-y-2 mb-6">
            {PLAN_OPTIONS.map((plan) => (
              <label
                key={plan.value}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlan === plan.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.value}
                  checked={selectedPlan === plan.value}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-gray-900">{plan.label}</span>
                {plan.value === currentPlan && (
                  <span className="ml-auto text-xs text-gray-500">Current</span>
                )}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedPlan)}
              disabled={loading || selectedPlan === currentPlan}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotaOverrideModal({ feature, currentOverride, onClose, onConfirm, loading }) {
  const [isUnlimited, setIsUnlimited] = useState(currentOverride?.is_unlimited || false);
  const [monthlyLimit, setMonthlyLimit] = useState(currentOverride?.monthly_limit || '');
  const [expiresAt, setExpiresAt] = useState(
    currentOverride?.expires_at ? currentOverride.expires_at.split('T')[0] : ''
  );
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onConfirm({
      monthlyLimit: isUnlimited ? null : parseInt(monthlyLimit, 10),
      isUnlimited,
      expiresAt: expiresAt || null,
      reason: reason || 'Admin override',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Override Quota: {QUOTA_FEATURE_NAMES[feature] || feature}
          </h3>
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={(e) => setIsUnlimited(e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Unlimited</span>
            </label>
            {!isUnlimited && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Limit
                </label>
                <input
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="Enter limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for override"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!isUnlimited && !monthlyLimit)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
