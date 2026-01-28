/**
 * Social Accounts Page
 *
 * Allows users to connect, manage, and disconnect social media accounts
 * for displaying feeds in their digital signage content.
 */

import { useState, useEffect, useCallback } from 'react';
import { getEffectiveOwnerId } from '../services/tenantService';
import {
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  getInstagramAuthUrl,
  getFacebookAuthUrl,
  getTiktokAuthUrl,
  disconnectInstagramAccount,
  disconnectFacebookAccount,
  disconnectTiktokAccount,
  disconnectGoogleAccount,
} from '../services/social';
import { connectGoogleReviews, searchGooglePlace } from '../services/social/googleReviewsService';
import { forceSyncAccount, getSyncStatus } from '../services/socialFeedSyncService';

// Provider icons as SVG components
const ProviderIcon = ({ provider, className = 'w-6 h-6' }) => {
  const icons = {
    instagram: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    facebook: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    tiktok: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    google: (
      <svg className={className} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  };

  return icons[provider] || null;
};

export default function SocialAccountsPage({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [disconnecting, setDisconnecting] = useState(null);

  // Google Reviews connection state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleSearch, setGoogleSearch] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [googleSearching, setGoogleSearching] = useState(false);
  const [googleResults, setGoogleResults] = useState([]);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  // Load accounts
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const status = await getSyncStatus();
      setAccounts(status);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      showToast?.('Failed to load social accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const provider = params.get('provider') || state?.split('_')[0];

      if (code && provider) {
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          const tenantId = await getEffectiveOwnerId();
          // The callback handlers are in individual services
          // This would normally be handled by a separate callback page/route
          showToast?.(`${PROVIDER_LABELS[provider]} connected successfully!`, 'success');
          loadAccounts();
        } catch (error) {
          console.error('OAuth callback error:', error);
          showToast?.(`Failed to connect ${PROVIDER_LABELS[provider]}`, 'error');
        }
      }
    };

    handleCallback();
  }, [loadAccounts, showToast]);

  // Connect provider
  const handleConnect = (provider) => {
    const state = `${provider}_${Date.now()}`;

    let authUrl;
    switch (provider) {
      case 'instagram':
        authUrl = getInstagramAuthUrl(state);
        break;
      case 'facebook':
        authUrl = getFacebookAuthUrl(state);
        break;
      case 'tiktok':
        authUrl = getTiktokAuthUrl(state);
        break;
      case 'google':
        setShowGoogleModal(true);
        return;
      default:
        return;
    }

    // Open OAuth popup
    window.location.href = authUrl;
  };

  // Search Google Places
  const handleGoogleSearch = async () => {
    if (!googleSearch.trim()) return;

    setGoogleSearching(true);
    try {
      const results = await searchGooglePlace(googleSearch, googleLocation);
      setGoogleResults(results);
    } catch (error) {
      console.error('Google search error:', error);
      showToast?.('Failed to search for business', 'error');
    } finally {
      setGoogleSearching(false);
    }
  };

  // Connect Google Reviews
  const handleConnectGoogle = async (placeId) => {
    setConnectingGoogle(true);
    try {
      const tenantId = await getEffectiveOwnerId();
      await connectGoogleReviews(tenantId, placeId);
      showToast?.('Google Reviews connected successfully!', 'success');
      setShowGoogleModal(false);
      setGoogleSearch('');
      setGoogleResults([]);
      loadAccounts();
    } catch (error) {
      console.error('Google connect error:', error);
      showToast?.(error.message || 'Failed to connect Google Reviews', 'error');
    } finally {
      setConnectingGoogle(false);
    }
  };

  // Force sync account
  const handleSync = async (accountId) => {
    setSyncing((prev) => ({ ...prev, [accountId]: true }));
    try {
      await forceSyncAccount(accountId);
      showToast?.('Sync completed successfully', 'success');
      loadAccounts();
    } catch (error) {
      console.error('Sync error:', error);
      showToast?.(error.message || 'Sync failed', 'error');
    } finally {
      setSyncing((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  // Disconnect account
  const handleDisconnect = async (account) => {
    if (!confirm(`Disconnect ${account.account_name}? This will remove all cached posts.`)) {
      return;
    }

    setDisconnecting(account.id);
    try {
      switch (account.provider) {
        case 'instagram':
          await disconnectInstagramAccount(account.id);
          break;
        case 'facebook':
          await disconnectFacebookAccount(account.id);
          break;
        case 'tiktok':
          await disconnectTiktokAccount(account.id);
          break;
        case 'google':
          await disconnectGoogleAccount(account.id);
          break;
      }
      showToast?.('Account disconnected', 'success');
      loadAccounts();
    } catch (error) {
      console.error('Disconnect error:', error);
      showToast?.('Failed to disconnect account', 'error');
    } finally {
      setDisconnecting(null);
    }
  };

  // Get relative time
  const getRelativeTime = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Available providers
  const providers = ['instagram', 'facebook', 'tiktok', 'google'];

  return (
    <PageLayout
      title="Social Accounts"
      description="Connect your social media accounts to display live feeds"
      actions={
        <button
          onClick={loadAccounts}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      {/* Connected Accounts */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <p className="text-sm text-gray-500">
            Manage your connected social media accounts
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No accounts connected yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Connect a social media account below to get started
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Provider Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      PROVIDER_COLORS[account.provider]?.bg || 'bg-gray-100'
                    } ${PROVIDER_COLORS[account.provider]?.text || 'text-gray-600'}`}
                  >
                    <ProviderIcon provider={account.provider} className="w-6 h-6" />
                  </div>

                  {/* Account Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {account.account_name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          PROVIDER_COLORS[account.provider]?.light || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {PROVIDER_LABELS[account.provider]}
                      </span>
                    </div>

                    {/* Sync Status */}
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {account.last_sync_error ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Sync error
                        </span>
                      ) : account.isStale ? (
                        <span className="text-yellow-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Needs sync
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Synced
                        </span>
                      )}
                      <span className="text-gray-400">
                        Last sync: {getRelativeTime(account.last_sync_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing[account.id]}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Sync now"
                  >
                    <RefreshCw
                      className={`w-5 h-5 ${syncing[account.id] ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={disconnecting === account.id}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                    title="Disconnect"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Account */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Connect New Account</h2>
          <p className="text-sm text-gray-500">
            Link a social media account to display its content
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map((provider) => {
            const connected = accounts.some((a) => a.provider === provider && a.is_active);

            return (
              <button
                key={provider}
                onClick={() => handleConnect(provider)}
                disabled={connected}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  connected
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      PROVIDER_COLORS[provider]?.bg || 'bg-gray-100'
                    } ${PROVIDER_COLORS[provider]?.text || 'text-gray-600'}`}
                  >
                    <ProviderIcon provider={provider} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {PROVIDER_LABELS[provider]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {connected ? 'Connected' : 'Click to connect'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Google Reviews Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowGoogleModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Connect Google Reviews
                </h3>
                <p className="text-sm text-gray-500">
                  Search for your business to display reviews
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={googleSearch}
                    onChange={(e) => setGoogleSearch(e.target.value)}
                    placeholder="e.g., Starbucks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    value={googleLocation}
                    onChange={(e) => setGoogleLocation(e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleGoogleSearch}
                  disabled={!googleSearch.trim() || googleSearching}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {googleSearching ? 'Searching...' : 'Search'}
                </button>

                {/* Search Results */}
                {googleResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Select your business:
                    </p>
                    {googleResults.map((place) => (
                      <button
                        key={place.place_id}
                        onClick={() => handleConnectGoogle(place.place_id)}
                        disabled={connectingGoogle}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">{place.name}</p>
                        <p className="text-sm text-gray-500">
                          {place.formatted_address}
                        </p>
                        {place.rating && (
                          <p className="text-sm text-yellow-600 mt-1">
                            {'★'.repeat(Math.round(place.rating))} {place.rating} (
                            {place.user_ratings_total} reviews)
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowGoogleModal(false);
                    setGoogleSearch('');
                    setGoogleResults([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
