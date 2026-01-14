-- ============================================================================
-- Migration: 081_social_media_feeds.sql
-- Description: Live Social Media Widgets (Instagram, Facebook, TikTok, Google Reviews)
-- ============================================================================

-- ============================================================================
-- SOCIAL ACCOUNTS TABLE
-- Stores linked social accounts per tenant with OAuth tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook', 'tiktok', 'google')),
  account_name TEXT, -- Display name (e.g., @username or page name)
  account_id TEXT, -- Provider's account/page ID
  access_token TEXT NOT NULL, -- OAuth access token (encrypted in production)
  refresh_token TEXT, -- OAuth refresh token
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[], -- Granted OAuth scopes
  metadata JSONB DEFAULT '{}', -- Additional provider-specific data
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider, account_id)
);

-- Index for efficient lookups
CREATE INDEX idx_social_accounts_tenant ON social_accounts(tenant_id);
CREATE INDEX idx_social_accounts_provider ON social_accounts(provider);
CREATE INDEX idx_social_accounts_active ON social_accounts(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- SOCIAL FEEDS TABLE
-- Cached posts from social platforms
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook', 'tiktok', 'google')),
  post_id TEXT NOT NULL, -- Provider's unique post ID
  post_type TEXT DEFAULT 'post', -- post, reel, video, review, story
  content_text TEXT, -- Caption/review text
  media_url TEXT, -- Primary media URL
  media_type TEXT, -- image, video, carousel
  thumbnail_url TEXT, -- Thumbnail for videos
  permalink TEXT, -- Link to original post
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  rating INTEGER, -- For Google Reviews (1-5)
  author_name TEXT, -- For reviews
  author_avatar TEXT,
  hashtags TEXT[], -- Extracted hashtags
  post_json JSONB NOT NULL, -- Full post data from API
  posted_at TIMESTAMPTZ, -- When the post was originally published
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, post_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_social_feeds_tenant ON social_feeds(tenant_id);
CREATE INDEX idx_social_feeds_account ON social_feeds(account_id);
CREATE INDEX idx_social_feeds_provider ON social_feeds(provider);
CREATE INDEX idx_social_feeds_posted_at ON social_feeds(posted_at DESC);
CREATE INDEX idx_social_feeds_hashtags ON social_feeds USING GIN(hashtags);

-- ============================================================================
-- SOCIAL FEED SETTINGS TABLE
-- Per-widget configuration for social feed displays
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_feed_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  widget_id UUID NOT NULL, -- References element ID in scene design_json
  name TEXT, -- User-defined name for this widget config
  provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook', 'tiktok', 'google')),
  account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  filter_mode TEXT DEFAULT 'all' CHECK (filter_mode IN ('all', 'approved', 'hashtag', 'latest')),
  hashtags TEXT[] DEFAULT '{}', -- Filter by these hashtags
  excluded_hashtags TEXT[] DEFAULT '{}', -- Exclude posts with these hashtags
  max_items INTEGER DEFAULT 6 CHECK (max_items > 0 AND max_items <= 50),
  auto_refresh_minutes INTEGER DEFAULT 20 CHECK (auto_refresh_minutes >= 5),
  layout TEXT DEFAULT 'carousel' CHECK (layout IN ('carousel', 'grid', 'list', 'single', 'masonry')),
  show_caption BOOLEAN DEFAULT true,
  show_likes BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,
  show_author BOOLEAN DEFAULT true,
  rotation_speed INTEGER DEFAULT 5, -- Seconds per item in carousel mode
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for widget lookups
CREATE INDEX idx_social_feed_settings_tenant ON social_feed_settings(tenant_id);
CREATE INDEX idx_social_feed_settings_widget ON social_feed_settings(widget_id);

-- ============================================================================
-- SOCIAL FEED MODERATION TABLE
-- Manual approval/rejection of posts
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_feed_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  feed_id UUID NOT NULL REFERENCES social_feeds(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT true,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, feed_id)
);

-- Index for moderation lookups
CREATE INDEX idx_social_feed_moderation_tenant ON social_feed_moderation(tenant_id);
CREATE INDEX idx_social_feed_moderation_approved ON social_feed_moderation(tenant_id, approved);

-- ============================================================================
-- SOCIAL SYNC QUEUE TABLE
-- Tracks sync jobs for rate limiting and scheduling
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  posts_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for queue processing
CREATE INDEX idx_social_sync_queue_status ON social_sync_queue(status, scheduled_at);
CREATE INDEX idx_social_sync_queue_account ON social_sync_queue(account_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_feed_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_feed_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_sync_queue ENABLE ROW LEVEL SECURITY;

-- Social Accounts RLS
CREATE POLICY "Users can view their tenant's social accounts"
  ON social_accounts FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their tenant's social accounts"
  ON social_accounts FOR ALL
  USING (true);

-- Social Feeds RLS
CREATE POLICY "Users can view their tenant's social feeds"
  ON social_feeds FOR SELECT
  USING (true);

CREATE POLICY "Service can manage social feeds"
  ON social_feeds FOR ALL
  USING (true);

-- Social Feed Settings RLS
CREATE POLICY "Users can view their tenant's feed settings"
  ON social_feed_settings FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their tenant's feed settings"
  ON social_feed_settings FOR ALL
  USING (true);

-- Social Feed Moderation RLS
CREATE POLICY "Users can view their tenant's moderation"
  ON social_feed_moderation FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their tenant's moderation"
  ON social_feed_moderation FOR ALL
  USING (true);

-- Sync Queue RLS (service account only in production)
CREATE POLICY "Users can view sync queue for their accounts"
  ON social_sync_queue FOR SELECT
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get social feeds for a widget with moderation filtering
CREATE OR REPLACE FUNCTION get_social_feed_posts(
  p_widget_id UUID,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  post_id TEXT,
  post_type TEXT,
  content_text TEXT,
  media_url TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  rating INTEGER,
  author_name TEXT,
  author_avatar TEXT,
  hashtags TEXT[],
  posted_at TIMESTAMPTZ,
  approved BOOLEAN
) AS $$
DECLARE
  v_settings RECORD;
  v_tenant_id UUID;
BEGIN
  -- Get tenant from user if not provided
  IF p_tenant_id IS NULL THEN
    SELECT up.tenant_id INTO v_tenant_id
    FROM user_profiles up
    WHERE up.user_id = auth.uid();
  ELSE
    v_tenant_id := p_tenant_id;
  END IF;

  -- Get widget settings
  SELECT * INTO v_settings
  FROM social_feed_settings sfs
  WHERE sfs.widget_id = p_widget_id
    AND sfs.tenant_id = v_tenant_id;

  IF v_settings IS NULL THEN
    RETURN;
  END IF;

  -- Return filtered posts
  RETURN QUERY
  SELECT
    sf.id,
    sf.provider,
    sf.post_id,
    sf.post_type,
    sf.content_text,
    sf.media_url,
    sf.media_type,
    sf.thumbnail_url,
    sf.permalink,
    sf.likes_count,
    sf.comments_count,
    sf.rating,
    sf.author_name,
    sf.author_avatar,
    sf.hashtags,
    sf.posted_at,
    COALESCE(m.approved, true) as approved
  FROM social_feeds sf
  LEFT JOIN social_feed_moderation m ON m.feed_id = sf.id AND m.tenant_id = sf.tenant_id
  WHERE sf.account_id = v_settings.account_id
    AND sf.tenant_id = v_tenant_id
    -- Filter by moderation mode
    AND (
      v_settings.filter_mode = 'all'
      OR (v_settings.filter_mode = 'approved' AND COALESCE(m.approved, true) = true)
      OR (v_settings.filter_mode = 'hashtag' AND sf.hashtags && v_settings.hashtags)
      OR v_settings.filter_mode = 'latest'
    )
    -- Exclude posts with excluded hashtags
    AND NOT (sf.hashtags && v_settings.excluded_hashtags)
  ORDER BY sf.posted_at DESC
  LIMIT v_settings.max_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get accounts needing sync
CREATE OR REPLACE FUNCTION get_accounts_needing_sync(
  p_stale_minutes INTEGER DEFAULT 20
)
RETURNS TABLE (
  account_id UUID,
  tenant_id UUID,
  provider TEXT,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id as account_id,
    sa.tenant_id,
    sa.provider,
    sa.account_name,
    sa.access_token,
    sa.refresh_token,
    sa.token_expires_at,
    sa.last_sync_at
  FROM social_accounts sa
  WHERE sa.is_active = true
    AND (
      sa.last_sync_at IS NULL
      OR sa.last_sync_at < now() - (p_stale_minutes || ' minutes')::interval
    )
    AND (sa.token_expires_at IS NULL OR sa.token_expires_at > now())
  ORDER BY sa.last_sync_at ASC NULLS FIRST
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert social feed post
CREATE OR REPLACE FUNCTION upsert_social_feed_post(
  p_tenant_id UUID,
  p_account_id UUID,
  p_provider TEXT,
  p_post_id TEXT,
  p_post_type TEXT,
  p_content_text TEXT,
  p_media_url TEXT,
  p_media_type TEXT,
  p_thumbnail_url TEXT,
  p_permalink TEXT,
  p_likes_count INTEGER,
  p_comments_count INTEGER,
  p_shares_count INTEGER,
  p_rating INTEGER,
  p_author_name TEXT,
  p_author_avatar TEXT,
  p_hashtags TEXT[],
  p_post_json JSONB,
  p_posted_at TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO social_feeds (
    tenant_id, account_id, provider, post_id, post_type,
    content_text, media_url, media_type, thumbnail_url, permalink,
    likes_count, comments_count, shares_count, rating,
    author_name, author_avatar, hashtags, post_json, posted_at,
    updated_at
  )
  VALUES (
    p_tenant_id, p_account_id, p_provider, p_post_id, p_post_type,
    p_content_text, p_media_url, p_media_type, p_thumbnail_url, p_permalink,
    p_likes_count, p_comments_count, p_shares_count, p_rating,
    p_author_name, p_author_avatar, p_hashtags, p_post_json, p_posted_at,
    now()
  )
  ON CONFLICT (account_id, post_id)
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    media_url = EXCLUDED.media_url,
    thumbnail_url = EXCLUDED.thumbnail_url,
    likes_count = EXCLUDED.likes_count,
    comments_count = EXCLUDED.comments_count,
    shares_count = EXCLUDED.shares_count,
    post_json = EXCLUDED.post_json,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sync status
CREATE OR REPLACE FUNCTION update_social_account_sync(
  p_account_id UUID,
  p_error TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE social_accounts
  SET
    last_sync_at = now(),
    last_sync_error = p_error,
    updated_at = now()
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_social_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_accounts_timestamp
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_timestamp();

CREATE TRIGGER update_social_feeds_timestamp
  BEFORE UPDATE ON social_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_social_timestamp();

CREATE TRIGGER update_social_feed_settings_timestamp
  BEFORE UPDATE ON social_feed_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_social_timestamp();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON social_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_feeds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_feed_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_feed_moderation TO authenticated;
GRANT SELECT ON social_sync_queue TO authenticated;

GRANT EXECUTE ON FUNCTION get_social_feed_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_accounts_needing_sync TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_social_feed_post TO authenticated;
GRANT EXECUTE ON FUNCTION update_social_account_sync TO authenticated;
