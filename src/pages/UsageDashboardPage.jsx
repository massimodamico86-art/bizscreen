/**
 * Usage Dashboard Page
 * Phase 16: Displays usage analytics, quota status, and billing information
 */

import React, { useState, useEffect } from 'react';
import { useLogger } from '../hooks/useLogger.js';
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
  const logger = useLogger('UsageDashboardPage');
