/**
 * Session Service - Manage user sessions and login history
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('SessionService');

/**
 * Get all active sessions for the current user
 * Note: Supabase doesn't expose session list directly, so we track sessions in our DB
 * @returns {Promise<{sessions: Array, error: string|null}>}
 */
export async function getActiveSessions() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { sessions: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) {
      logger.error('Failed to fetch sessions', { error });
      return { sessions: [], error: error.message };
    }

    return { sessions: data || [], error: null };
  } catch (error) {
    logger.error('Session fetch exception', { error });
    return { sessions: [], error: error.message };
  }
}

/**
 * Record a new session (call on login)
 * @param {object} sessionData - Session metadata
 * @returns {Promise<{success: boolean, sessionId?: string, error?: string}>}
 */
export async function recordSession(sessionData = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get browser/device info
    const userAgent = navigator.userAgent;
    const deviceInfo = parseUserAgent(userAgent);

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip_address: sessionData.ipAddress || null,
        location: sessionData.location || null,
        user_agent: userAgent,
        is_active: true,
        last_activity: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to record session', { error });
      return { success: false, error: error.message };
    }

    // Store session ID in localStorage for tracking
    localStorage.setItem('bizscreen_session_id', data.id);

    logger.info('Session recorded', { sessionId: data.id, deviceType: deviceInfo.deviceType });
    return { success: true, sessionId: data.id };
  } catch (error) {
    logger.error('Session record exception', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Update session activity (call periodically or on user actions)
 */
export async function updateSessionActivity() {
  try {
    const sessionId = localStorage.getItem('bizscreen_session_id');
    if (!sessionId) return;

    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    // Non-blocking
    logger.debug('Session activity update failed', { error, sessionId });
  }
}

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeSession(sessionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Failed to revoke session', { error, sessionId });
      return { success: false, error: error.message };
    }

    // If revoking current session, sign out
    const currentSessionId = localStorage.getItem('bizscreen_session_id');
    if (currentSessionId === sessionId) {
      await supabase.auth.signOut();
    }

    logger.info('Session revoked', { sessionId });
    return { success: true };
  } catch (error) {
    logger.error('Session revoke exception', { error, sessionId });
    return { success: false, error: error.message };
  }
}

/**
 * Revoke all other sessions (keep current one)
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
export async function revokeAllOtherSessions() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, count: 0, error: 'Not authenticated' };
    }

    const currentSessionId = localStorage.getItem('bizscreen_session_id');

    const { data, error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .neq('id', currentSessionId || '')
      .select();

    if (error) {
      logger.error('Failed to revoke all sessions', { error });
      return { success: false, count: 0, error: error.message };
    }

    logger.info('All other sessions revoked', { count: data?.length || 0 });
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    logger.error('Session revoke all exception', { error });
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * End current session (call on logout)
 */
export async function endCurrentSession() {
  try {
    const sessionId = localStorage.getItem('bizscreen_session_id');
    if (sessionId) {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      localStorage.removeItem('bizscreen_session_id');
      logger.info('Session ended', { sessionId });
    }
  } catch (error) {
    logger.error('Session end exception', { error });
  }
}

/**
 * Get login history for current user
 * @param {object} options - Query options
 * @returns {Promise<{history: Array, error: string|null}>}
 */
export async function getLoginHistory({ limit = 20, offset = 0 } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { history: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch login history', { error });
      return { history: [], error: error.message };
    }

    return { history: data || [], error: null };
  } catch (error) {
    logger.error('Login history fetch exception', { error });
    return { history: [], error: error.message };
  }
}

/**
 * Parse user agent string to extract device info
 */
function parseUserAgent(ua) {
  const result = {
    browser: 'Unknown',
    os: 'Unknown',
    deviceType: 'desktop',
  };

  // Browser detection
  if (ua.includes('Firefox')) {
    result.browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    result.browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    result.browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    result.browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    result.browser = 'Opera';
  }

  // OS detection
  if (ua.includes('Windows')) {
    result.os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    result.os = 'macOS';
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  } else if (ua.includes('Android')) {
    result.os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = 'iOS';
  }

  // Device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    result.deviceType = 'mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    result.deviceType = 'tablet';
  }

  return result;
}

/**
 * Format session for display
 */
export function formatSession(session) {
  const isCurrentSession = localStorage.getItem('bizscreen_session_id') === session.id;

  return {
    ...session,
    isCurrentSession,
    deviceLabel: `${session.browser} on ${session.os}`,
    lastActivityFormatted: formatRelativeTime(session.last_activity),
    createdAtFormatted: formatDate(session.created_at),
  };
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(dateString);
}

/**
 * Format date
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default {
  getActiveSessions,
  recordSession,
  updateSessionActivity,
  revokeSession,
  revokeAllOtherSessions,
  endCurrentSession,
  getLoginHistory,
  formatSession,
};
