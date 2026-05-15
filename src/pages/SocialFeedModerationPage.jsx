import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Inbox, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  EmptyState,
} from '../design-system';
import {
  fetchPendingModerationItems,
  approveModerationItem,
  rejectModerationItem,
} from '../services/socialFeedModerationService';
import { useTranslation } from '../i18n';

const PROVIDER_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google Reviews',
};

export default function SocialFeedModerationPage({ showToast, onNavigate }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState({}); // { [feedId]: 'approving' | 'rejecting' }

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingModerationItems();
      setItems(data);
    } catch (err) {
      console.error('[SocialFeedModerationPage] load failed:', err);
      showToast?.(t('socialModeration.loadFailed', 'Failed to load moderation queue'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleAction(feedId, kind) {
    // Capture snapshot atomically via functional updater to avoid stale closure
    // when multiple rapid actions are in flight (WR-01).
    let snapshot;
    setPendingAction((p) => ({ ...p, [feedId]: kind === 'approve' ? 'approving' : 'rejecting' }));
    setItems((curr) => {
      snapshot = curr;
      return curr.filter((x) => x.id !== feedId);
    });
    try {
      if (kind === 'approve') {
        await approveModerationItem(feedId);
        showToast?.(t('socialModeration.approved', 'Item approved'));
      } else {
        await rejectModerationItem(feedId);
        showToast?.(t('socialModeration.rejected', 'Item rejected'));
      }
    } catch (err) {
      console.error('[SocialFeedModerationPage]', kind, 'failed:', err);
      showToast?.(
        kind === 'approve'
          ? t('socialModeration.approveFailed', 'Failed to approve item')
          : t('socialModeration.rejectFailed', 'Failed to reject item'),
        'error'
      );
      setItems(snapshot); // rollback to snapshot captured at action time
    } finally {
      setPendingAction((p) => { const c = { ...p }; delete c[feedId]; return c; });
    }
  }

  function renderItem(item) {
    const busy = pendingAction[item.id];
    return (
      <Card key={item.id} padding="default" data-testid={`queue-item-${item.id}`} role="listitem">
        <div className="flex gap-4">
          {item.thumbnail_url || item.media_url ? (
            <img
              src={item.thumbnail_url || item.media_url}
              alt=""
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0 bg-gray-100"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0" aria-hidden="true" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{PROVIDER_LABELS[item.provider] || item.provider}</Badge>
              {item.author_name && <span className="text-sm text-gray-600">{item.author_name}</span>}
            </div>
            {item.content_text && (
              <p className="text-sm text-gray-700 line-clamp-3 mb-2">{item.content_text}</p>
            )}
            {item.permalink && (
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink size={12} aria-hidden="true" />
                {t('socialModeration.viewOriginal', 'View original')}
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction(item.id, 'approve')}
              disabled={!!busy}
              icon={<CheckCircle size={14} />}
              data-testid={`approve-${item.id}`}
              aria-label={t('socialModeration.approveItem', 'Approve item')}
            >
              {busy === 'approving' ? t('socialModeration.approving', 'Approving…') : t('socialModeration.approve', 'Approve')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleAction(item.id, 'reject')}
              disabled={!!busy}
              icon={<XCircle size={14} />}
              data-testid={`reject-${item.id}`}
              aria-label={t('socialModeration.rejectItem', 'Reject item')}
            >
              {busy === 'rejecting' ? t('socialModeration.rejecting', 'Rejecting…') : t('socialModeration.reject', 'Reject')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('socialModeration.title', 'Social Feed Moderation')}
        description={t('socialModeration.description', 'Approve or reject pending social feed posts before they appear on your screens')}
        icon={<Inbox className="w-5 h-5 text-blue-600" />}
        iconBackground="bg-blue-100"
        actions={
          <Button
            variant="secondary"
            onClick={loadItems}
            icon={<RefreshCw size={16} />}
            data-testid="refresh-queue"
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      <PageContent>
        {loading ? (
          <div className="flex items-center justify-center h-64" data-testid="queue-loading">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        ) : items.length === 0 ? (
          <div data-testid="queue-empty-state">
            <EmptyState
              icon={CheckCircle}
              title={t('socialModeration.emptyTitle', 'No pending items')}
              description={t('socialModeration.emptyDescription', 'All social feed posts have been reviewed. New items will appear here as they are fetched.')}
            />
          </div>
        ) : (
          <div className="space-y-3" data-testid="queue-list" role="list">
            {items.map((item) => renderItem(item))}
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
