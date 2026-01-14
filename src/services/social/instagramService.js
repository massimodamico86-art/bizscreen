/**
 * Instagram Service
 *
 * Handles OAuth authentication and fetching posts from Instagram Basic Display API.
 * Uses Instagram Graph API for business accounts.
 */

import { supabase } from '../../supabase';

// Instagram API configuration
const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || '';
const INSTAGRAM_APP_SECRET = import.meta.env.VITE_INSTAGRAM_APP_SECRET || '';
const INSTAGRAM_REDIRECT_URI = import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/instagram`;

// API endpoints
const INSTAGRAM_AUTH_URL = 'https://api.instagram.com/oauth/authorize';
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';

// Scopes for Instagram Basic Display API
const BASIC_SCOPES = ['user_profile', 'user_media'];

/**
 * Generate Instagram OAuth authorization URL
 */
export function getInstagramAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    scope: BASIC_SCOPES.join(','),
    response_type: 'code',
    state,
  });

  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeInstagramCode(code) {
  const formData = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    client_secret: INSTAGRAM_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    code,
  });

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to exchange Instagram code');
  }

  const data = await response.json();

  // Exchange short-lived token for long-lived token
  const longLivedToken = await getLongLivedToken(data.access_token);

  return {
    accessToken: longLivedToken.access_token,
    expiresIn: longLivedToken.expires_in,
    userId: data.user_id,
  };
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: INSTAGRAM_APP_SECRET,
    access_token: shortLivedToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_URL}/access_token?${params.toString()}`);

  if (!response.ok) {
    // If exchange fails, return the short-lived token
    return {
      access_token: shortLivedToken,
      expires_in: 3600, // 1 hour
    };
  }

  return response.json();
}

/**
 * Refresh long-lived token
 */
export async function refreshInstagramToken(accessToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: accessToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_URL}/refresh_access_token?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to refresh Instagram token');
  }

  return response.json();
}

/**
 * Get Instagram user profile
 */
export async function getInstagramProfile(accessToken) {
  const params = new URLSearchParams({
    fields: 'id,username,account_type,media_count',
    access_token: accessToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_URL}/me?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Instagram profile');
  }

  return response.json();
}

/**
 * Fetch Instagram media (posts)
 */
export async function fetchInstagramMedia(accessToken, limit = 25) {
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count',
    limit: String(limit),
    access_token: accessToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_URL}/me/media?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Instagram media');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Convert Instagram post to unified format
 */
export function normalizeInstagramPost(post) {
  // Extract hashtags from caption
  const hashtags = post.caption
    ? (post.caption.match(/#[\w]+/g) || []).map(tag => tag.toLowerCase())
    : [];

  return {
    provider: 'instagram',
    postId: post.id,
    postType: post.media_type?.toLowerCase() || 'image',
    contentText: post.caption || '',
    mediaUrl: post.media_url || '',
    mediaType: getMediaType(post.media_type),
    thumbnailUrl: post.thumbnail_url || post.media_url || '',
    permalink: post.permalink || '',
    likesCount: post.like_count || 0,
    commentsCount: post.comments_count || 0,
    sharesCount: 0,
    rating: null,
    authorName: post.username || '',
    authorAvatar: null,
    hashtags,
    postJson: post,
    postedAt: post.timestamp ? new Date(post.timestamp).toISOString() : new Date().toISOString(),
  };
}

/**
 * Map Instagram media type to unified type
 */
function getMediaType(instagramType) {
  const typeMap = {
    IMAGE: 'image',
    VIDEO: 'video',
    CAROUSEL_ALBUM: 'carousel',
  };
  return typeMap[instagramType] || 'image';
}

/**
 * Connect Instagram account (called after OAuth callback)
 */
export async function connectInstagramAccount(code, tenantId) {
  try {
    // Exchange code for tokens
    const tokenData = await exchangeInstagramCode(code);

    // Get user profile
    const profile = await getInstagramProfile(tokenData.accessToken);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);

    // Save to database
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        tenant_id: tenantId,
        provider: 'instagram',
        account_id: profile.id,
        account_name: `@${profile.username}`,
        access_token: tokenData.accessToken,
        token_expires_at: expiresAt.toISOString(),
        metadata: {
          account_type: profile.account_type,
          media_count: profile.media_count,
        },
        is_active: true,
      }, {
        onConflict: 'tenant_id,provider,account_id',
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to connect Instagram account:', error);
    throw error;
  }
}

/**
 * Disconnect Instagram account
 */
export async function disconnectInstagramAccount(accountId) {
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

/**
 * Sync Instagram posts for an account
 */
export async function syncInstagramPosts(account) {
  try {
    // Check if token needs refresh (within 7 days of expiry)
    if (account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at);
      const refreshThreshold = new Date();
      refreshThreshold.setDate(refreshThreshold.getDate() + 7);

      if (expiresAt < refreshThreshold) {
        const refreshed = await refreshInstagramToken(account.access_token);
        // Update token in database
        await supabase
          .from('social_accounts')
          .update({
            access_token: refreshed.access_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq('id', account.id);

        account.access_token = refreshed.access_token;
      }
    }

    // Fetch latest posts
    const posts = await fetchInstagramMedia(account.access_token);

    // Normalize and upsert posts
    const results = [];
    for (const post of posts) {
      const normalized = normalizeInstagramPost(post);

      const { data, error } = await supabase.rpc('upsert_social_feed_post', {
        p_tenant_id: account.tenant_id,
        p_account_id: account.id,
        p_provider: normalized.provider,
        p_post_id: normalized.postId,
        p_post_type: normalized.postType,
        p_content_text: normalized.contentText,
        p_media_url: normalized.mediaUrl,
        p_media_type: normalized.mediaType,
        p_thumbnail_url: normalized.thumbnailUrl,
        p_permalink: normalized.permalink,
        p_likes_count: normalized.likesCount,
        p_comments_count: normalized.commentsCount,
        p_shares_count: normalized.sharesCount,
        p_rating: normalized.rating,
        p_author_name: normalized.authorName,
        p_author_avatar: normalized.authorAvatar,
        p_hashtags: normalized.hashtags,
        p_post_json: normalized.postJson,
        p_posted_at: normalized.postedAt,
      });

      if (!error) {
        results.push(data);
      }
    }

    // Update sync status
    await supabase.rpc('update_social_account_sync', {
      p_account_id: account.id,
      p_error: null,
    });

    return results;
  } catch (error) {
    // Update sync status with error
    await supabase.rpc('update_social_account_sync', {
      p_account_id: account.id,
      p_error: error.message,
    });

    throw error;
  }
}

export default {
  getInstagramAuthUrl,
  exchangeInstagramCode,
  refreshInstagramToken,
  getInstagramProfile,
  fetchInstagramMedia,
  normalizeInstagramPost,
  connectInstagramAccount,
  disconnectInstagramAccount,
  syncInstagramPosts,
};
