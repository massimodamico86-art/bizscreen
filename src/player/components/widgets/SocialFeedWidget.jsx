// src/player/components/widgets/SocialFeedWidget.jsx
// Social feed widget wrapper for player screens
// Delegates rendering to SocialFeedRenderer, uses orchestrator for sync status

import { useCallback } from 'react';
import SocialFeedRenderer from '../../../components/player/SocialFeedRenderer';
import { supabase } from '../../../supabase';
import { useWidgetData } from '../../hooks/useWidgetData.js';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';

/**
 * SocialFeedWidget - Renders social media feeds in scene widget blocks
 *
 * Thin wrapper around SocialFeedRenderer that destructures widget props
 * and passes them through. SocialFeedRenderer handles all data loading
 * and rendering internally. The orchestrator integration here provides
 * lastFetchedAt for the sync status indicator.
 *
 * @param {Object} props - Widget props from scene block config
 */
export function SocialFeedWidget({ props = {} }) {
  const {
    provider = 'instagram',
    accountId,
    layout = 'carousel',
    maxItems = 6,
    showCaption = true,
    showLikes = true,
    showDate = true,
    showAuthor = true,
    rotationSpeed = 5,
    filterMode = 'all',
    hashtags = [],
  } = props;

  // Orchestrator integration for sync status tracking
  const sourceKey = accountId ? `social-feed:${accountId}` : null;
  const fetchFn = useCallback(async () => {
    const { data: posts } = await supabase
      .from('social_feeds')
      .select('*, social_feed_moderation(status)')
      .eq('account_id', accountId)
      .order('posted_at', { ascending: false })
      .limit(maxItems);
    return posts || [];
  }, [accountId, maxItems]);
  const { lastFetchedAt } = useWidgetData(sourceKey, fetchFn, 30 * 60 * 1000, null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SocialFeedRenderer
        provider={provider}
        accountId={accountId}
        layout={layout}
        maxItems={maxItems}
        showCaption={showCaption}
        showLikes={showLikes}
        showDate={showDate}
        showAuthor={showAuthor}
        rotationSpeed={rotationSpeed}
        filterMode={filterMode}
        hashtags={hashtags}
        style={{ width: '100%', height: '100%' }}
      />
      <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default SocialFeedWidget;
