/**
 * SessionManagement - View and manage active sessions
 */

import { useState, useEffect } from 'react';
import {
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  formatSession,
} from '../../services/sessionService';

export default function SessionManagement({ showToast }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const { sessions: data, error: fetchError } = await getActiveSessions();
      if (fetchError) {
        setError(fetchError);
      } else {
        setSessions(data.map(formatSession));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to end this session? The device will be signed out.')) {
      return;
    }

    setRevoking(sessionId);
    try {
      const result = await revokeSession(sessionId);
      if (result.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        showToast?.('Session ended successfully');
      } else {
        showToast?.(result.error || 'Failed to end session', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to end session', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    const otherSessions = sessions.filter(s => !s.isCurrentSession);
    if (otherSessions.length === 0) {
      showToast?.('No other sessions to end');
      return;
    }

    if (!confirm(`Are you sure you want to end ${otherSessions.length} other session${otherSessions.length > 1 ? 's' : ''}?`)) {
      return;
    }

    setRevoking('all');
    try {
      const result = await revokeAllOtherSessions();
      if (result.success) {
        setSessions(sessions.filter(s => s.isCurrentSession));
        showToast?.(`Ended ${result.count} session${result.count > 1 ? 's' : ''}`);
      } else {
        showToast?.(result.error || 'Failed to end sessions', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to end sessions', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-full">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Active Sessions</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your active sessions across different devices. End sessions you don't recognize.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No active sessions found
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 border rounded-lg ${
                  session.isCurrentSession ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${session.isCurrentSession ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {getDeviceIcon(session.device_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{session.deviceLabel}</span>
                      {session.isCurrentSession && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.lastActivityFormatted}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {session.location}
                        </span>
                      )}
                    </div>
                    {session.ip_address && (
                      <div className="text-xs text-gray-400 mt-1">
                        IP: {session.ip_address}
                      </div>
                    )}
                  </div>
                  {!session.isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revoking === session.id || revoking === 'all'}
                    >
                      {revoking === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          End
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sessions.filter(s => !s.isCurrentSession).length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleRevokeAllOthers}
                disabled={revoking === 'all'}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {revoking === 'all' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ending sessions...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    End All Other Sessions
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
