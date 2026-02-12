import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, Heart, MessageCircle, AlertCircle } from 'lucide-react';
import {
  PageLayout,
  PageContent,
  PageHeader,
  Card,
  EmptyState,
} from '../design-system';
import {
  getModerationQueue,
  moderatePost,
  getConnectedAccounts,
} from '../services/socialFeedSyncService';
import { PROVIDER_LABELS, PROVIDER_COLORS } from '../services/social';

/**
 * Content Moderation Page
 *
 * Review and approve/reject social media posts before they appear on screens.
 * Uses getModerationQueue() and moderatePost() from socialFeedSyncService.
 */
const ModerationPage = ({ showToast, onNavigate }) => {
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actioning, setActioning] = useState(null); // post id being actioned

  // Load accounts on mount
  useEffect(() => {
    getConnectedAccounts()
      .then(setAccounts)
      .catch(() => {
        /* ignore - accounts dropdown will just be empty */
      });
  }, []);

  // Load posts when accountId changes
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getModerationQueue(accountId || null);
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading moderation queue:', error);
      showToast?.('Failed to load moderation queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [accountId, showToast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Handle approve/reject
  const handleModerate = async (postId, approved) => {
    try {
      setActioning(postId);
      await moderatePost(postId, approved);
      showToast?.(approved ? 'Post approved' : 'Post rejected');
      await loadPosts();
    } catch (error) {
      console.error('Error moderating post:', error);
      showToast?.('Failed to update moderation status', 'error');
    } finally {
      setActioning(null);
    }
  };

  // Determine moderation status of a post
  const getStatus = (post) => {
    if (!post.moderation || post.moderation.length === 0) return 'pending';
    return post.moderation[0].approved === true
      ? 'approved'
      : post.moderation[0].approved === false
        ? 'rejected'
        : 'pending';
  };

  // Client-side status filtering
  const filteredPosts = posts.filter((post) => {
    if (statusFilter === 'all') return true;
    return getStatus(post) === statusFilter;
  });

  // Count by status
  const counts = {
    all: posts.length,
    pending: posts.filter((p) => getStatus(p) === 'pending').length,
    approved: posts.filter((p) => getStatus(p) === 'approved').length,
    rejected: posts.filter((p) => getStatus(p) === 'rejected').length,
  };

  // Status filter tabs
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  // Status badge rendering
  const renderStatusBadge = (post) => {
    const status = getStatus(post);
    const config = {
      pending: { text: 'Pending', bg: 'bg-gray-100', color: 'text-gray-700' },
      approved: { text: 'Approved', bg: 'bg-green-100', color: 'text-green-700' },
      rejected: { text: 'Rejected', bg: 'bg-red-100', color: 'text-red-700' },
    };
    const c = config[status];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
        {c.text}
      </span>
    );
  };

  return (
    <PageLayout>
      <PageHeader
        title="Content Moderation"
        description="Review and approve social media posts before they appear on screens."
        icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
        iconBackground="bg-orange-100"
      />

      <PageContent>
        {/* Info note */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Posts without moderation records are shown by default. Set a widget&apos;s filter mode to &quot;Approved Only&quot; to require explicit approval.
        </div>

        {/* Account filter */}
        <div className="mb-4">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            aria-label="Filter by social account"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name} ({PROVIDER_LABELS[acc.provider] || acc.provider})
              </option>
            ))}
          </select>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-500">({counts[tab.key]})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" aria-label="Loading" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No posts to moderate"
            description="No social feed posts to moderate. Connect a social account and sync posts to get started."
            action={
              <button
                onClick={() => onNavigate?.('social-accounts')}
                className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Connect Social Account
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => {
              const status = getStatus(post);
              const providerColor = PROVIDER_COLORS[post.provider];
              const isActioning = actioning === post.id;

              return (
                <Card key={post.id} padding="none" className="overflow-hidden">
                  {/* Thumbnail */}
                  {(post.media_url || post.thumbnail_url) && (
                    <div className="relative h-[200px] bg-gray-100">
                      <img
                        src={post.media_url || post.thumbnail_url}
                        alt={post.content_text ? post.content_text.slice(0, 60) : 'Social post'}
                        className="w-full h-full object-cover"
                      />
                      {/* Provider badge */}
                      {providerColor && (
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${providerColor.light}`}
                        >
                          {PROVIDER_LABELS[post.provider] || post.provider}
                        </span>
                      )}
                    </div>
                  )}

                  {/* If no image, show provider badge in the card body area */}
                  {!post.media_url && !post.thumbnail_url && providerColor && (
                    <div className="px-4 pt-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${providerColor.light}`}
                      >
                        {PROVIDER_LABELS[post.provider] || post.provider}
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Author & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {post.author_name || 'Unknown'}
                      </span>
                      {renderStatusBadge(post)}
                    </div>

                    {/* Caption */}
                    {post.content_text && (
                      <p className="text-sm text-gray-600 line-clamp-3">{post.content_text}</p>
                    )}

                    {/* Posted date */}
                    <p className="text-xs text-gray-400">
                      {post.posted_at
                        ? new Date(post.posted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Unknown date'}
                    </p>

                    {/* Engagement stats */}
                    {(post.likes_count > 0 || post.comments_count > 0) && (
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {post.likes_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart size={12} aria-hidden="true" />
                            {post.likes_count}
                          </span>
                        )}
                        {post.comments_count > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} aria-hidden="true" />
                            {post.comments_count}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      {status !== 'approved' && (
                        <button
                          onClick={() => handleModerate(post.id, true)}
                          disabled={isActioning}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <CheckCircle size={16} aria-hidden="true" />
                          Approve
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          onClick={() => handleModerate(post.id, false)}
                          disabled={isActioning}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <XCircle size={16} aria-hidden="true" />
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
};

export default ModerationPage;
