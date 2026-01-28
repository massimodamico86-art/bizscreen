/**
 * LoginHistory - View login history and security events
 */

import { useState, useEffect } from 'react';
import { getLoginHistory } from '../../services/sessionService';

export default function LoginHistory({ showToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const LIMIT = 10;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (offset = 0) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const { history: data, error: fetchError } = await getLoginHistory({
        limit: LIMIT,
        offset,
      });

      if (fetchError) {
        setError(fetchError);
      } else {
        if (offset === 0) {
          setHistory(data);
        } else {
          setHistory([...history, ...data]);
        }
        setHasMore(data.length === LIMIT);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative;
    if (diffMins < 1) relative = 'Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = null;

    const full = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return { relative, full };
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
        <div className="p-3 bg-purple-100 rounded-full">
          <History className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Login History</h3>
          <p className="text-sm text-gray-600 mt-1">
            Review your recent login activity. Report any suspicious access immediately.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No login history found
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {history.map((entry) => {
              const { relative, full } = formatDate(entry.created_at);
              return (
                <div
                  key={entry.id}
                  className={`p-3 border rounded-lg ${
                    entry.success ? 'border-gray-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${entry.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {entry.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${entry.success ? 'text-gray-900' : 'text-red-700'}`}>
                          {entry.success ? 'Successful login' : 'Failed login attempt'}
                        </span>
                        {entry.mfa_used && (
                          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            <Shield className="w-3 h-3" />
                            2FA
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1" title={full}>
                          {relative || full}
                        </span>
                        {entry.browser && entry.os && (
                          <span className="flex items-center gap-1">
                            {getDeviceIcon(entry.device_type)}
                            {entry.browser} / {entry.os}
                          </span>
                        )}
                        {entry.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {entry.location}
                          </span>
                        )}
                      </div>
                      {!entry.success && entry.failure_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Reason: {entry.failure_reason}
                        </div>
                      )}
                      {entry.ip_address && (
                        <div className="text-xs text-gray-400 mt-1">
                          IP: {entry.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadHistory(history.length)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
