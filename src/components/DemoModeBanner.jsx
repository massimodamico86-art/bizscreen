/**
 * DemoModeBanner Component
 *
 * Displays a banner when logged into a demo tenant.
 * Shows warning about automatic resets.
 *
 * @module components/DemoModeBanner
 */
import { useState, useEffect } from 'react';
import { checkIsDemoTenant } from '../services/demoService';
import { useLogger } from '../hooks/useLogger.js';

/**
 * DemoModeBanner - Shows demo mode indicator
 */
export default function DemoModeBanner() {
  const logger = useLogger('DemoModeBanner');
  const [demoInfo, setDemoInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemoStatus();
  }, []);

  const loadDemoStatus = async () => {
    try {
      const info = await checkIsDemoTenant();
      setDemoInfo(info);
    } catch (err) {
      logger.error('Error checking demo status', { error: err });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !demoInfo?.isDemoTenant || dismissed) {
    return null;
  }

  const formatResetTime = () => {
    if (!demoInfo.lastResetAt || !demoInfo.resetIntervalMinutes) {
      return 'scheduled';
    }

    const lastReset = new Date(demoInfo.lastResetAt);
    const nextReset = new Date(lastReset.getTime() + demoInfo.resetIntervalMinutes * 60 * 1000);
    const now = new Date();
    const minutesUntilReset = Math.max(0, Math.round((nextReset - now) / 60000));

    if (minutesUntilReset < 60) {
      return `in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.round(minutesUntilReset / 60);
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Demo Mode</span>
            <span className="opacity-80">–</span>
            <span className="opacity-90">
              Changes may be reset automatically
            </span>
            <span className="flex items-center gap-1 opacity-75 text-xs">
              <Clock size={12} />
              Next reset {formatResetTime()}
            </span>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to check if we're in demo mode
 */
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIsDemoTenant()
      .then(info => {
        setIsDemo(info.isDemoTenant);
      })
      .catch(() => {
        setIsDemo(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { isDemo, loading };
}

/**
 * Protected asset wrapper - prevents deletion of core demo content
 */
export function DemoProtectedBadge({ isProtected }) {
  if (!isProtected) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
      <RefreshCw size={10} />
      Demo content
    </span>
  );
}
