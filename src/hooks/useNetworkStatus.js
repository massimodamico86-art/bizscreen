import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook tracking browser online/offline/reconnecting state.
 *
 * States:
 *  - 'online'       -- normal connectivity
 *  - 'offline'      -- navigator.onLine is false
 *  - 'reconnecting' -- transitioning from offline to online (2s confirmation window)
 *
 * @returns {{ status: string, isOnline: boolean, isOffline: boolean, isReconnecting: boolean }}
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState(() =>
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const reconnectTimerRef = useRef(null);

  const handleOffline = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setStatus('offline');
  }, []);

  const handleOnline = useCallback(() => {
    // Transition through 'reconnecting' for 2 seconds to confirm stability
    setStatus('reconnecting');
    reconnectTimerRef.current = setTimeout(() => {
      setStatus('online');
      reconnectTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isReconnecting: status === 'reconnecting',
  };
}

export default useNetworkStatus;
