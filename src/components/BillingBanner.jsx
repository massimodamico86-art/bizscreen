/**
 * BillingBanner Component
 *
 * Displays contextual banners for billing status:
 * - Trial expiring soon
 * - Trial expired
 * - Payment overdue
 * - Account suspended
 * - Read-only mode
 *
 * @module components/BillingBanner
 */
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  XCircle,
  Lock
} from 'lucide-react';
import { getTenantLifecycleStatus } from '../services/billingService';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Banner severity colors and icons
 */
const BANNER_STYLES = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: Clock,
    iconColor: 'text-blue-500'
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500'
  },
  danger: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: XCircle,
    iconColor: 'text-red-500'
  },
  locked: {
    bg: 'bg-gray-100 border-gray-300',
    text: 'text-gray-800',
    icon: Lock,
    iconColor: 'text-gray-500'
  }
};

/**
 * BillingBanner - Main component
 */
const BillingBanner = ({ className = '' }) => {
  const logger = useLogger('BillingBanner');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getTenantLifecycleStatus();
      setStatus(data);
    } catch (err) {
      logger.error('Failed to load billing status', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything while loading or if dismissed
  if (loading || dismissed || !status) return null;

  // Determine which banner to show (if any)
  const banner = getBannerInfo(status);
  if (!banner) return null;

  const style = BANNER_STYLES[banner.severity];
  const Icon = style.icon;

  return (
    <div
      className={`
        border rounded-lg px-4 py-3 mb-4
        ${style.bg}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={20} />

        <div className="flex-1 min-w-0">
          <p className={`font-medium ${style.text}`}>
            {banner.title}
          </p>
          <p className={`text-sm ${style.text} opacity-80 mt-0.5`}>
            {banner.message}
          </p>

          {banner.action && (
            <Link
              to={banner.action.href}
              className={`
                inline-flex items-center gap-1 mt-2 text-sm font-medium
                ${style.text} hover:underline
              `}
            >
              {banner.action.label}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {banner.dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className={`${style.text} opacity-60 hover:opacity-100 p-1`}
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Determine banner info based on status
 */
function getBannerInfo(status) {
  // Account suspended - highest priority
  if (status.suspendedAt) {
    return {
      severity: 'locked',
      title: 'Account Suspended',
      message: `Your account has been suspended${status.suspensionReason ? `: ${status.suspensionReason}` : ''}. Please contact support to resolve this issue.`,
      action: {
        label: 'Contact Support',
        href: '/settings/support'
      },
      dismissible: false
    };
  }

  // Frozen read-only mode
  if (status.frozenReadonly) {
    return {
      severity: 'danger',
      title: 'Account in Read-Only Mode',
      message: 'Your account is in read-only mode due to billing issues. Update your payment method to restore full access.',
      action: {
        label: 'Update Payment Method',
        href: '/settings/billing'
      },
      dismissible: false
    };
  }

  // Payment overdue
  if (status.overdueSince && status.overdueDays > 0) {
    const daysOverdue = status.overdueDays;
    return {
      severity: 'danger',
      title: 'Payment Overdue',
      message: daysOverdue === 1
        ? 'Your payment is 1 day overdue. Please update your payment method to avoid service interruption.'
        : `Your payment is ${daysOverdue} days overdue. Please update your payment method to avoid service interruption.`,
      action: {
        label: 'Update Payment',
        href: '/settings/billing'
      },
      dismissible: false
    };
  }

  // Trial expired
  if (status.isTrialExpired) {
    return {
      severity: 'warning',
      title: 'Trial Expired',
      message: 'Your free trial has ended. Subscribe now to continue using BizScreen.',
      action: {
        label: 'Choose a Plan',
        href: '/settings/billing'
      },
      dismissible: false
    };
  }

  // Trial expiring soon (7 days or less)
  if (status.trialDaysLeft !== null && status.trialDaysLeft >= 0 && status.trialDaysLeft <= 7) {
    const days = status.trialDaysLeft;
    return {
      severity: days <= 3 ? 'warning' : 'info',
      title: days === 0
        ? 'Trial Ends Today!'
        : days === 1
          ? 'Trial Ends Tomorrow'
          : `Trial Ends in ${days} Days`,
      message: 'Subscribe now to keep your screens running without interruption.',
      action: {
        label: 'Subscribe Now',
        href: '/settings/billing'
      },
      dismissible: days > 3
    };
  }

  // Show general billing warning if present
  if (status.billingWarning) {
    return {
      severity: 'warning',
      title: 'Billing Notice',
      message: status.billingWarning,
      action: {
        label: 'View Billing',
        href: '/settings/billing'
      },
      dismissible: true
    };
  }

  return null;
}

/**
 * Compact version for sidebar/header
 */
export const BillingBannerCompact = ({ className = '' }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getTenantLifecycleStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  // Only show for critical issues
  if (!status.suspendedAt && !status.frozenReadonly && !status.isTrialExpired && status.trialDaysLeft > 3) {
    return null;
  }

  const banner = getBannerInfo(status);
  if (!banner) return null;

  const style = BANNER_STYLES[banner.severity];
  const Icon = style.icon;

  return (
    <Link
      to="/settings/billing"
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        ${style.bg} border ${style.text}
        hover:opacity-90 transition-opacity
        ${className}
      `}
    >
      <Icon size={16} className={style.iconColor} />
      <span className="text-sm font-medium truncate">
        {banner.title}
      </span>
    </Link>
  );
};

export default BillingBanner;
