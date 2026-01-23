/**
 * Usage Dashboard Page
 * Phase 16: Displays usage analytics, quota status, and billing information
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Info,
} from 'lucide-react';
import {
  getUsageSummary,
  getUsageStatus,
  getUsageColor,
  getUsageTextColor,
  formatQuotaDisplay,
  getDaysUntilReset,
} from '../services/usageService';

/**
 * Usage Bar component for displaying individual feature usage
 */
function UsageBar({ quota, onUpgrade }) {
  const {
    featureName,
    currentUsage,
    quota: limit,
    isUnlimited,
    usagePercentage,
    status,
    remaining,
  } = quota;

  const barColor = isUnlimited
    ? 'bg-blue-500'
    : status === 'exceeded'
      ? 'bg-red-500'
      : status === 'critical'
        ? 'bg-red-400'
        : status === 'warning'
          ? 'bg-yellow-500'
          : 'bg-green-500';

  const textColor = isUnlimited
    ? 'text-blue-600'
    : status === 'exceeded'
      ? 'text-red-600'
      : status === 'critical'
        ? 'text-red-500'
        : status === 'warning'
          ? 'text-yellow-600'
          : 'text-green-600';

  const StatusIcon =
    status === 'exceeded' ? XCircle : status === 'critical' || status === 'warning' ? AlertTriangle : CheckCircle;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${textColor}`} />
          <span className="font-medium text-gray-900">{featureName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${textColor}`}>
            {formatQuotaDisplay(currentUsage, limit, isUnlimited)}
          </span>
          {!isUnlimited && (
            <div className="relative group">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                {status === 'exceeded'
                  ? 'Quota exceeded. Upgrade to continue using this feature.'
                  : status === 'critical'
                    ? `Only ${remaining} uses remaining this month.`
                    : status === 'warning'
                      ? `${remaining} uses remaining. Consider upgrading.`
                      : `${remaining} uses remaining this month.`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: isUnlimited ? '30%' : `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          {isUnlimited ? 'Unlimited usage' : `${usagePercentage}% used`}
        </span>
        {status === 'exceeded' && (
          <button
            onClick={onUpgrade}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Upgrade <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Summary Card component
 */
function SummaryCard({ title, value, subtitle, icon: Icon, color }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.gray}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Main Usage Dashboard Page
 */
export default function UsageDashboardPage({ showToast, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [usageData, setUsageData] = useState(null);

  const fetchUsageData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getUsageSummary();
      setUsageData(response.data);
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setError(err.message || 'Failed to load usage data');
      showToast?.('Failed to load usage data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, []);

  const handleUpgrade = () => {
    onNavigate?.('account-plan');
  };

  const handleRefresh = () => {
    fetchUsageData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => fetchUsageData()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { plan, billingPeriod, quotas, summary } = usageData || {};
  const daysRemaining = getDaysUntilReset();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage Dashboard</h1>
          <p className="text-gray-600">
            Monitor your feature usage and quota status for the current billing period.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Billing Period Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <div>
            <span className="font-medium text-blue-900">Current Billing Period: </span>
            <span className="text-blue-700 capitalize">{plan} Plan</span>
          </div>
        </div>
        <div className="text-blue-700 font-medium">{daysRemaining} days until reset</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Features Tracked"
          value={summary?.totalFeatures || 0}
          icon={BarChart3}
          color="blue"
        />
        <SummaryCard
          title="Within Quota"
          value={(summary?.totalFeatures || 0) - (summary?.exceededCount || 0) - (summary?.warningCount || 0) - (summary?.criticalCount || 0)}
          subtitle="Healthy usage"
          icon={CheckCircle}
          color="green"
        />
        <SummaryCard
          title="Approaching Limit"
          value={(summary?.warningCount || 0) + (summary?.criticalCount || 0)}
          subtitle="70%+ used"
          icon={AlertTriangle}
          color="yellow"
        />
        <SummaryCard
          title="Quota Exceeded"
          value={summary?.exceededCount || 0}
          subtitle="Action required"
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Usage Bars */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotas?.map((quota) => (
            <UsageBar key={quota.featureKey} quota={quota} onUpgrade={handleUpgrade} />
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {(summary?.exceededCount > 0 || summary?.warningCount > 0) && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Need more capacity?</h3>
              <p className="text-blue-100">
                Upgrade your plan to get higher quotas or unlimited usage on all features.
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              <TrendingUp className="h-5 w-5" />
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Unlimited Features Note */}
      {summary?.unlimitedCount > 0 && (
        <div className="text-center text-gray-500 text-sm">
          <CheckCircle className="inline h-4 w-4 mr-1 text-blue-500" />
          {summary.unlimitedCount} feature{summary.unlimitedCount > 1 ? 's have' : ' has'} unlimited
          usage on your current plan.
        </div>
      )}
    </div>
  );
}
