/**
 * Google Reviews Service
 *
 * Handles fetching reviews from Google Places API.
 * Uses Google My Business API for more features with authenticated accounts.
 */

import { supabase } from '../../supabase';

// Google API configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/google`;

// API endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_MY_BUSINESS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1';

// Scopes for Google My Business API
const GMB_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    scope: GMB_SCOPES.join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeGoogleCode(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange Google code');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(refreshToken) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh Google token');
  }

  return response.json();
}

/**
 * Search for a place by name and address (public API - no auth required)
 */
export async function searchGooglePlace(query, location = '') {
  const params = new URLSearchParams({
    input: location ? `${query} ${location}` : query,
    inputtype: 'textquery',
    fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,photos',
    key: GOOGLE_API_KEY,
  });

  const response = await fetch(`${GOOGLE_PLACES_URL}/findplacefromtext/json?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to search Google Places');
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  return data.candidates || [];
}

/**
 * Get place details including reviews (public API)
 */
export async function getGooglePlaceDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,photos,opening_hours,url',
    key: GOOGLE_API_KEY,
  });

  const response = await fetch(`${GOOGLE_PLACES_URL}/details/json?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch Google Place details');
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  return data.result;
}

/**
 * Get photo URL from Google Places photo reference
 */
export function getGooglePhotoUrl(photoReference, maxWidth = 400) {
  const params = new URLSearchParams({
    maxwidth: String(maxWidth),
    photo_reference: photoReference,
    key: GOOGLE_API_KEY,
  });

  return `${GOOGLE_PLACES_URL}/photo?${params.toString()}`;
}

/**
 * Convert Google review to unified format
 */
export function normalizeGoogleReview(review, placeName = '', placeUrl = '') {
  return {
    provider: 'google',
    postId: `review_${review.time}`, // Reviews don't have unique IDs
    postType: 'review',
    contentText: review.text || '',
    mediaUrl: review.profile_photo_url || '',
    mediaType: 'image',
    thumbnailUrl: review.profile_photo_url || '',
    permalink: placeUrl,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    rating: review.rating,
    authorName: review.author_name || 'Anonymous',
    authorAvatar: review.profile_photo_url || null,
    hashtags: [],
    postJson: {
      ...review,
      place_name: placeName,
      relative_time_description: review.relative_time_description,
    },
    postedAt: review.time
      ? new Date(review.time * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Connect Google Reviews for a place (by searching or by place ID)
 */
export async function connectGoogleReviews(tenantId, placeIdOrQuery, location = '') {
  try {
    let placeId = placeIdOrQuery;
    let placeDetails;

    // If not a place ID, search for the place
    if (!placeIdOrQuery.startsWith('ChIJ')) {
      const places = await searchGooglePlace(placeIdOrQuery, location);

      if (places.length === 0) {
        throw new Error('No places found matching your search');
      }

      placeId = places[0].place_id;
    }

    // Get place details
    placeDetails = await getGooglePlaceDetails(placeId);

    // Save to database
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        tenant_id: tenantId,
        provider: 'google',
        account_id: placeId,
        account_name: placeDetails.name,
        access_token: GOOGLE_API_KEY, // Use API key for public access
        metadata: {
          formatted_address: placeDetails.formatted_address,
          phone: placeDetails.formatted_phone_number,
          website: placeDetails.website,
          rating: placeDetails.rating,
          total_reviews: placeDetails.user_ratings_total,
          place_url: placeDetails.url,
          photo: placeDetails.photos?.[0]?.photo_reference
            ? getGooglePhotoUrl(placeDetails.photos[0].photo_reference)
            : null,
        },
        is_active: true,
      }, {
        onConflict: 'tenant_id,provider,account_id',
      })
      .select()
      .single();

    if (error) throw error;

    // Sync initial reviews
    await syncGoogleReviews({
      ...data,
      metadata: {
        ...data.metadata,
        place_url: placeDetails.url,
      },
    });

    return data;
  } catch (error) {
    console.error('Failed to connect Google Reviews:', error);
    throw error;
  }
}

/**
 * Disconnect Google Reviews account
 */
export async function disconnectGoogleAccount(accountId) {
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', accountId);

  if (error) throw error;
}

/**
 * Sync Google Reviews for an account
 */
export async function syncGoogleReviews(account) {
  try {
    // Get place details with reviews
    const placeDetails = await getGooglePlaceDetails(account.account_id);

    const reviews = placeDetails.reviews || [];
    const placeName = placeDetails.name;
    const placeUrl = placeDetails.url || account.metadata?.place_url || '';

    // Update place metadata
    await supabase
      .from('social_accounts')
      .update({
        metadata: {
          ...account.metadata,
          rating: placeDetails.rating,
          total_reviews: placeDetails.user_ratings_total,
          place_url: placeUrl,
        },
      })
      .eq('id', account.id);

    // Normalize and upsert reviews
    const results = [];
    for (const review of reviews) {
      const normalized = normalizeGoogleReview(review, placeName, placeUrl);

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

/**
 * Get average rating and review count for display
 */
export function getReviewSummary(reviews) {
  if (!reviews || reviews.length === 0) {
    return { averageRating: 0, totalReviews: 0 };
  }

  const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
  };
}

/**
 * Generate star rating display
 */
export function generateStarRating(rating, maxStars = 5) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return {
    full: fullStars,
    half: hasHalfStar ? 1 : 0,
    empty: emptyStars,
    rating,
  };
}

export default {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  refreshGoogleToken,
  searchGooglePlace,
  getGooglePlaceDetails,
  getGooglePhotoUrl,
  normalizeGoogleReview,
  connectGoogleReviews,
  disconnectGoogleAccount,
  syncGoogleReviews,
  getReviewSummary,
  generateStarRating,
};
