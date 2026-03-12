import { useState, useEffect, useRef } from 'react';
import { WifiOff, Loader2, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Small pill indicator showing network connection state.
 *
 * - offline:       Red pill with "Offline" and WifiOff icon
 * - reconnecting:  Amber pill with "Reconnecting..." and spinning Loader2 icon
 * - online:        Green pill with "Online" that auto-fades after 3 seconds
 *                  (only shown after recovering from offline/reconnecting, not on initial load)
 */
export default function ConnectionIndicator() {
  const { status, isOnline, isOffline, isReconnecting } = useNetworkStatus();
  const [showOnline, setShowOnline] = useState(false);
  const hasBeenOfflineRef = useRef(false);
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    // Track if we've ever been offline/reconnecting
    if (isOffline || isReconnecting) {
      hasBeenOfflineRef.current = true;
    }

    // When recovering to online after being offline, show briefly then fade
    if (isOnline && hasBeenOfflineRef.current) {
      setShowOnline(true);
      fadeTimerRef.current = setTimeout(() => {
        setShowOnline(false);
        hasBeenOfflineRef.current = false;
      }, 3000);
    }

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [status, isOnline, isOffline, isReconnecting]);

  // Nothing to show when online (initial state or after fade)
  if (isOnline && !showOnline) {
    return null;
  }

  if (isOffline) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-1 text-xs font-medium">
        <WifiOff className="w-3 h-3" />
        Offline
      </span>
    );
  }

  if (isReconnecting) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        Reconnecting...
      </span>
    );
  }

  // Online recovery state (green pill, fading)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-medium transition-opacity duration-500">
      <Wifi className="w-3 h-3" />
      Online
    </span>
  );
}
