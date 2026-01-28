/**
 * HealthBanner Component
 * Shows critical alert banner at dashboard top when screens are offline.
 */
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

export function HealthBanner({ alertSummary, onNavigate }) {
  const [dismissed, setDismissed] = useState(false);

  // Only show for critical issues
  if (!alertSummary || alertSummary.critical === 0 || dismissed) {
    return null;
  }

  const criticalCount = alertSummary.critical;
  const topIssue = alertSummary.topIssues?.find(i => i.severity === 'critical');

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-red-900">
          {criticalCount} screen{criticalCount > 1 ? 's' : ''} offline
        </p>
        {topIssue && (
          <p className="text-sm text-red-700 truncate">
            {topIssue.deviceName}: {topIssue.message}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onNavigate?.('screens')}
          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
        >
          View Screens
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default HealthBanner;
