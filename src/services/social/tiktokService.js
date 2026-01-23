/**
 * TikTok Service
 *
 * Handles OAuth authentication and fetching videos from TikTok.
 * Uses TikTok API for Business or Display API.
 */

import { supabase } from '../../supabase';

import { createScopedLogger } from '../loggingService.js';

const logger = createScopedLogger('TiktokService');

// TikTok API configuration
const TIKTOK_CLIENT_KEY = import.meta.env.VITE_TIKTOK_CLIENT_KEY || '';
const TIKTOK_CLIENT_SECRET = import.meta.env.VITE_TIKTOK_CLIENT_SECRET || '';
const TIKTOK_REDIRECT_URI = import.meta.env.VITE_TIKTOK_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/tiktok`;

// API endpoints
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

// Scopes for TikTok API
const TIKTOK_SCOPES = [
  'user.info.basic',
  'video.list',
];

/**
 * Generate TikTok OAuth authorization URL
 */
export function getTiktokAuthUrl(state = '') {
  const csrfState = state || Math.random().toString(36).substring(7);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    redirect_uri: TIKTOK_REDIRECT_URI,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    state: csrfState,
  });

  return `${TIKTOK_AUTH_URL}/?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeTiktokCode(code) {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: TIKTOK_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange TikTok code');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    openId: data.open_id,
    scope: data.scope,
  };
}

/**
 * Refresh TikTok access token
 */
export async function refreshTiktokToken(refreshToken) {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh TikTok token');
  }

  return response.json();
}

/**
 * Get TikTok user profile
 */
export async function getTiktokProfile(accessToken) {
  const params = new URLSearchParams({
    fields: 'open_id,union_id,avatar_url,display_name,username',
  });

  const response = await fetch(`${TIKTOK_API_URL}/user/info/?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch TikTok profile');
  }

  const data = await response.json();
  return data.data?.user || {};
}

/**
 * Fetch TikTok videos
 */
export async function fetchTiktokVideos(accessToken, cursor = '', maxCount = 20) {
  const params = new URLSearchParams({
    fields: 'id,title,cover_image_url,video_description,duration,create_time,share_url,embed_link,like_count,comment_count,share_count,view_count',
    max_count: String(maxCount),
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  const response = await fetch(`${TIKTOK_API_URL}/video/list/?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch TikTok videos');
  }

  const data = await response.json();
  return {
    videos: data.data?.videos || [],
    cursor: data.data?.cursor,
    hasMore: data.data?.has_more,
  };
}

/**
 * Convert TikTok video to unified format
 */
export function normalizeTiktokVideo(video, username = '') {
  // Extract hashtags from description
  const hashtags = video.video_description
    ? (video.video_description.match(/#[\w]+/g) || []).map(tag => tag.toLowerCase())
    : [];

  return {
    provider: 'tiktok',
    postId: video.id,
    postType: 'video',
    contentText: video.video_description || video.title || '',
    mediaUrl: video.embed_link || video.share_url || '',
    mediaType: 'video',
    thumbnailUrl: video.cover_image_url || '',
    permalink: video.share_url || '',
    likesCount: video.like_count || 0,
    commentsCount: video.comment_count || 0,
    sharesCount: video.share_count || 0,
    rating: null,
    authorName: username,
    authorAvatar: null,
    hashtags,
    postJson: {
      ...video,
      view_count: video.view_count,
      duration: video.duration,
    },
    postedAt: video.create_time
      ? new Date(video.create_time * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Connect TikTok account (called after OAuth callback)
 */
export async function connectTiktokAccount(code, tenantId) {
  try {
    // Exchange code for tokens
    const tokenData = await exchangeTiktokCode(code);

    // Get user profile
    const profile = await getTiktokProfile(tokenData.accessToken);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);

    // Save to database
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        tenant_id: tenantId,
        provider: 'tiktok',
        account_id: tokenData.openId,
        account_name: profile.display_name || `@${profile.username}`,
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        token_expires_at: expiresAt.toISOString(),
        metadata: {
          username: profile.username,
          avatar_url: profile.avatar_url,
          union_id: profile.union_id,
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
    logger.error('Failed to connect TikTok account:', { error: error });
    throw error;
  }
}

/**
 * Disconnect TikTok account
 */
export async function disconnectTiktokAccount(accountId) {
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

/**
 * Sync TikTok videos for an account
 */
export async function syncTiktokVideos(account) {
  try {
    // Check if token needs refresh
    if (account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at);
      const refreshThreshold = new Date();
      refreshThreshold.setMinutes(refreshThreshold.getMinutes() + 30);

      if (expiresAt < refreshThreshold && account.refresh_token) {
        const refreshed = await refreshTiktokToken(account.refresh_token);
        // Update tokens in database
        await supabase
          .from('social_accounts')
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq('id', account.id);

        account.access_token = refreshed.access_token;
      }
    }

    // Fetch latest videos
    const { videos } = await fetchTiktokVideos(account.access_token);

    // Get username from metadata
    const username = account.metadata?.username || account.account_name;

    // Normalize and upsert videos
    const results = [];
    for (const video of videos) {
      const normalized = normalizeTiktokVideo(video, username);

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
  getTiktokAuthUrl,
  exchangeTiktokCode,
  refreshTiktokToken,
  getTiktokProfile,
  fetchTiktokVideos,
  normalizeTiktokVideo,
  connectTiktokAccount,
  disconnectTiktokAccount,
  syncTiktokVideos,
};
