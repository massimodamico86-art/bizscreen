/**
 * Emergency Context Provider
 *
 * Provides global emergency state to the application.
 * Manages real-time subscription to emergency state changes
 * and exposes methods to stop emergency content.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { createScopedLogger } from '../services/loggingService';
import {
  getTenantEmergencyState,
  stopEmergency as stopEmergencyService,
  subscribeToEmergencyState,
  isEmergencyExpired,
} from '../services/emergencyService';
import { supabase } from '../supabase';

const log = createScopedLogger('EmergencyContext');

// Default context value
const defaultValue = {
  isActive: false,
  contentId: null,
  contentType: null,
  contentName: null,
  startedAt: null,
  durationMinutes: null,
  stopEmergency: async () => {},
  stopping: false,
};

const EmergencyContext = createContext(defaultValue);

/**
 * Hook to access emergency state and actions
 * @returns {{isActive: boolean, contentId: string|null, contentType: string|null, contentName: string|null, startedAt: Date|null, durationMinutes: number|null, stopEmergency: function, stopping: boolean}}
 */
export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
}

/**
 * Safe hook to optionally access emergency state
 * Returns null if used outside EmergencyProvider instead of throwing
 * @returns {{isActive: boolean, contentId: string|null, contentType: string|null, contentName: string|null, startedAt: Date|null, durationMinutes: number|null, stopEmergency: function, stopping: boolean}|null}
 */
export function useEmergencyOptional() {
  const context = useContext(EmergencyContext);
  return context || null;
}

/**
 * Fetch content name based on content type and ID
 * @param {string} contentType - 'playlist', 'scene', or 'media'
 * @param {string} contentId - UUID of the content
 * @returns {Promise<string|null>}
 */
async function fetchContentName(contentType, contentId) {
  if (!contentType || !contentId) return null;

  try {
    let tableName;
    let nameColumn = 'name';

    switch (contentType) {
      case 'playlist':
        tableName = 'playlists';
        break;
      case 'scene':
        tableName = 'scenes';
        break;
      case 'media':
        tableName = 'media';
        break;
      default:
        return null;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(nameColumn)
      .eq('id', contentId)
      .single();

    if (error) {
      log.warn('Failed to fetch content name', { contentType, contentId, error: error.message });
      return null;
    }

    return data?.[nameColumn] || null;
  } catch (err) {
    log.error('Error fetching content name', { error: err.message });
    return null;
  }
}

/**
 * EmergencyProvider component
 * Wraps children with emergency context
 */
export function EmergencyProvider({ children }) {
  const { user, userProfile } = useAuth();
  const [state, setState] = useState({
    isActive: false,
    contentId: null,
    contentType: null,
    startedAt: null,
    durationMinutes: null,
  });
  const [contentName, setContentName] = useState(null);
  const [stopping, setStopping] = useState(false);

  // Fetch initial emergency state
  useEffect(() => {
    if (!user) return;

    const fetchState = async () => {
      try {
        const emergencyState = await getTenantEmergencyState();
        setState(emergencyState);

        // Fetch content name if emergency is active
        if (emergencyState.isActive && emergencyState.contentId) {
          const name = await fetchContentName(emergencyState.contentType, emergencyState.contentId);
          setContentName(name);
        } else {
          setContentName(null);
        }
      } catch (err) {
        log.error('Failed to fetch initial emergency state', { error: err.message });
      }
    };

    fetchState();
  }, [user]);

  // Subscribe to real-time emergency state changes
  useEffect(() => {
    // Use userProfile.id as tenant ID (the user is the tenant owner)
    const tenantId = userProfile?.id;
    if (!tenantId) return;

    const handleStateChange = async (newState) => {
      setState(newState);

      // Fetch content name if emergency is active
      if (newState.isActive && newState.contentId) {
        const name = await fetchContentName(newState.contentType, newState.contentId);
        setContentName(name);
      } else {
        setContentName(null);
      }
    };

    const unsubscribe = subscribeToEmergencyState(tenantId, handleStateChange);

    return () => {
      unsubscribe();
    };
  }, [userProfile?.id]);

  // Check for expiry periodically (every minute)
  useEffect(() => {
    if (!state.isActive || state.durationMinutes === null) return;

    const checkExpiry = () => {
      if (isEmergencyExpired(state.startedAt, state.durationMinutes)) {
        log.info('Emergency expired, clearing state');
        setState(prev => ({ ...prev, isActive: false }));
        setContentName(null);
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [state.isActive, state.startedAt, state.durationMinutes]);

  // Stop emergency handler with loading state
  const handleStopEmergency = useCallback(async () => {
    if (stopping) return;

    setStopping(true);
    try {
      await stopEmergencyService();
      // State will be updated via real-time subscription
      log.info('Emergency stopped by user');
    } catch (err) {
      log.error('Failed to stop emergency', { error: err.message });
      throw err;
    } finally {
      setStopping(false);
    }
  }, [stopping]);

  const value = {
    isActive: state.isActive,
    contentId: state.contentId,
    contentType: state.contentType,
    contentName,
    startedAt: state.startedAt,
    durationMinutes: state.durationMinutes,
    stopEmergency: handleStopEmergency,
    stopping,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

export default EmergencyContext;
