// src/player/components/widgets/SocialFeedWidget.jsx
// Social feed widget wrapper for player screens
// Delegates rendering to SocialFeedRenderer (no rendering logic duplicated)

import SocialFeedRenderer from '../../../components/player/SocialFeedRenderer';

/**
 * SocialFeedWidget - Renders social media feeds in scene widget blocks
 *
 * Thin wrapper around SocialFeedRenderer that destructures widget props
 * and passes them through. SocialFeedRenderer handles all data loading
 * and rendering internally.
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

  return (
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
  );
}

export default SocialFeedWidget;
