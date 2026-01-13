/**
 * Facebook Service
 *
 * Handles OAuth authentication and fetching posts from Facebook Pages.
 * Uses Facebook Graph API.
 */

import { supabase } from '../../supabase';

// Facebook API configuration
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = import.meta.env.VITE_FACEBOOK_APP_SECRET || '';
const FACEBOOK_REDIRECT_URI = import.meta.env.VITE_FACEBOOK_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/facebook`;

// API endpoints
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0';

// Scopes for Facebook Page API
const PAGE_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
];

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    scope: PAGE_SCOPES.join(','),
    response_type: 'code',
    state,
  });

  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(code) {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    code,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange Facebook code');
  }

  const data = await response.json();

  // Get long-lived token
  const longLivedToken = await getLongLivedToken(data.access_token);

  return {
    accessToken: longLivedToken.access_token,
    expiresIn: longLivedToken.expires_in || 5184000, // 60 days default
  };
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    return { access_token: shortLivedToken, expires_in: 3600 };
  }

  return response.json();
}

/**
 * Get list of pages user manages
 */
export async function getFacebookPages(userAccessToken) {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,category,picture',
    access_token: userAccessToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/me/accounts?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Facebook pages');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get page profile info
 */
export async function getFacebookPageProfile(pageId, pageAccessToken) {
  const params = new URLSearchParams({
    fields: 'id,name,category,picture,fan_count,about',
    access_token: pageAccessToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch page profile');
  }

  return response.json();
}

/**
 * Fetch Facebook page posts
 */
export async function fetchFacebookPosts(pageId, pageAccessToken, limit = 25) {
  const params = new URLSearchParams({
    fields: 'id,message,created_time,full_picture,permalink_url,attachments{media_type,url,title,description},shares,reactions.summary(true),comments.summary(true)',
    limit: String(limit),
    access_token: pageAccessToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/${pageId}/posts?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Facebook posts');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Convert Facebook post to unified format
 */
export function normalizeFacebookPost(post, pageName = '') {
  // Extract hashtags from message
  const hashtags = post.message
    ? (post.message.match(/#[\w]+/g) || []).map(tag => tag.toLowerCase())
    : [];

  // Determine media type from attachments
  let mediaType = 'text';
  let mediaUrl = post.full_picture || '';

  if (post.attachments?.data?.[0]) {
    const attachment = post.attachments.data[0];
    if (attachment.media_type === 'video') {
      mediaType = 'video';
      mediaUrl = attachment.url || mediaUrl;
    } else if (attachment.media_type === 'photo' || attachment.media_type === 'album') {
      mediaType = 'image';
    }
  }

  return {
    provider: 'facebook',
    postId: post.id,
    postType: mediaType,
    contentText: post.message || '',
    mediaUrl,
    mediaType,
    thumbnailUrl: post.full_picture || '',
    permalink: post.permalink_url || '',
    likesCount: post.reactions?.summary?.total_count || 0,
    commentsCount: post.comments?.summary?.total_count || 0,
    sharesCount: post.shares?.count || 0,
    rating: null,
    authorName: pageName,
    authorAvatar: null,
    hashtags,
    postJson: post,
    postedAt: post.created_time ? new Date(post.created_time).toISOString() : new Date().toISOString(),
  };
}

/**
 * Connect Facebook page (called after OAuth callback)
 */
export async function connectFacebookPage(code, tenantId, selectedPageId = null) {
  try {
    // Exchange code for user token
    const tokenData = await exchangeFacebookCode(code);

    // Get list of managed pages
    const pages = await getFacebookPages(tokenData.accessToken);

    if (pages.length === 0) {
      throw new Error('No Facebook pages found. Make sure you manage at least one page.');
    }

    // Use selected page or first page
    const page = selectedPageId
      ? pages.find(p => p.id === selectedPageId)
      : pages[0];

    if (!page) {
      throw new Error('Selected page not found');
    }

    // Get page profile for more details
    const pageProfile = await getFacebookPageProfile(page.id, page.access_token);

    // Calculate token expiration (page tokens don't expire if derived from long-lived user token)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    // Save to database
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        tenant_id: tenantId,
        provider: 'facebook',
        account_id: page.id,
        account_name: page.name,
        access_token: page.access_token,
        token_expires_at: expiresAt.toISOString(),
        metadata: {
          category: pageProfile.category,
          fan_count: pageProfile.fan_count,
          picture: pageProfile.picture?.data?.url,
        },
        is_active: true,
      }, {
        onConflict: 'tenant_id,provider,account_id',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      account: data,
      availablePages: pages,
    };
  } catch (error) {
    console.error('Failed to connect Facebook page:', error);
    throw error;
  }
}

/**
 * Disconnect Facebook account
 */
export async function disconnectFacebookAccount(accountId) {
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

/**
 * Sync Facebook posts for an account
 */
export async function syncFacebookPosts(account) {
  try {
    // Fetch latest posts
    const posts = await fetchFacebookPosts(account.account_id, account.access_token);

    // Normalize and upsert posts
    const results = [];
    for (const post of posts) {
      const normalized = normalizeFacebookPost(post, account.account_name);

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
  getFacebookAuthUrl,
  exchangeFacebookCode,
  getFacebookPages,
  getFacebookPageProfile,
  fetchFacebookPosts,
  normalizeFacebookPost,
  connectFacebookPage,
  disconnectFacebookAccount,
  syncFacebookPosts,
};
