/**
 * Assistant Service
 *
 * Frontend service for AI-powered content generation.
 * Communicates with the backend API routes for AI operations.
 */

import { supabase } from '../supabase';

/**
 * Business type options for the assistant
 */
export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: 'Utensils' },
  { value: 'salon', label: 'Salon / Spa', icon: 'Scissors' },
  { value: 'gym', label: 'Gym / Fitness', icon: 'Dumbbell' },
  { value: 'retail', label: 'Retail Store', icon: 'ShoppingBag' },
  { value: 'generic', label: 'Other Business', icon: 'Building2' },
];

/**
 * Get the current session token for API calls
 */
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

/**
 * Generate a content plan based on business context
 * @param {object} businessContext - Business information
 * @returns {Promise<object>} Generated plan suggestion
 */
export async function generatePlan(businessContext) {
  const token = await getAuthToken();

  const response = await fetch('/api/assistant/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessContext,
      source: 'assistant',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate content plan');
  }

  const result = await response.json();
  return result.suggestion;
}

/**
 * Generate slides for a playlist
 * @param {object} playlistContext - Playlist information
 * @param {object} businessContext - Business context
 * @returns {Promise<object>} Generated slides suggestion
 */
export async function generateSlides(playlistContext, businessContext) {
  const token = await getAuthToken();

  const response = await fetch('/api/assistant/playlist-slides', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      playlistContext,
      businessContext,
      source: 'assistant',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate slides');
  }

  const result = await response.json();
  return result.suggestion;
}

/**
 * Accept an AI suggestion (marks it as accepted)
 * @param {string} suggestionId - Suggestion UUID
 * @returns {Promise<object>} Updated suggestion
 */
export async function acceptSuggestion(suggestionId) {
  const { data, error } = await supabase.rpc('accept_ai_suggestion', {
    p_suggestion_id: suggestionId,
  });

  if (error) throw error;
  return data;
}

/**
 * Reject an AI suggestion
 * @param {string} suggestionId - Suggestion UUID
 * @returns {Promise<object>} Updated suggestion
 */
export async function rejectSuggestion(suggestionId) {
  const { data, error } = await supabase.rpc('reject_ai_suggestion', {
    p_suggestion_id: suggestionId,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch recent suggestions for the current user
 * @param {object} options - Filter options
 * @param {string} options.type - Filter by type (plan, playlist, slide)
 * @param {string} options.status - Filter by status (draft, accepted, rejected)
 * @param {number} options.limit - Max results (default 20)
 * @returns {Promise<Array>} List of suggestions
 */
export async function fetchSuggestions({ type, status, limit = 20 } = {}) {
  let query = supabase
    .from('ai_content_suggestions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single suggestion by ID
 * @param {string} suggestionId - Suggestion UUID
 * @returns {Promise<object|null>} Suggestion or null
 */
export async function fetchSuggestion(suggestionId) {
  const { data, error } = await supabase
    .from('ai_content_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Materialize a playlist suggestion into a real playlist
 * Creates the playlist and all its media items from the suggestion payload.
 * @param {object} suggestion - The suggestion object with payload
 * @returns {Promise<object>} Created playlist
 */
export async function materializePlaylist(suggestion) {
  const { payload, business_context } = suggestion;

  if (!payload || !payload.slides) {
    throw new Error('Invalid playlist suggestion: missing slides');
  }

  // Create the playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({
      name: payload.name || 'AI Generated Playlist',
      description: payload.description || 'Created by Content Assistant',
    })
    .select()
    .single();

  if (playlistError) throw playlistError;

  // Create media items for each slide
  const mediaItems = [];
  for (let i = 0; i < payload.slides.length; i++) {
    const slide = payload.slides[i];

    // Create a text overlay media item
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .insert({
        name: slide.headline || `Slide ${i + 1}`,
        type: 'text',
        meta: {
          headline: slide.headline,
          body: slide.body,
          style: slide.style || {},
          imagePrompt: slide.imagePrompt,
          generatedBy: 'assistant',
        },
      })
      .select()
      .single();

    if (mediaError) throw mediaError;
    mediaItems.push(media);

    // Add to playlist
    const { error: linkError } = await supabase
      .from('playlist_media')
      .insert({
        playlist_id: playlist.id,
        media_id: media.id,
        position: i,
        duration: slide.duration || 8,
      });

    if (linkError) throw linkError;
  }

  // Mark suggestion as accepted
  await acceptSuggestion(suggestion.id);

  return {
    playlist,
    mediaItems,
    slideCount: mediaItems.length,
  };
}

/**
 * Materialize a full content plan into playlists
 * Creates all suggested playlists from the plan.
 * @param {object} suggestion - The plan suggestion
 * @returns {Promise<object>} Created playlists summary
 */
export async function materializePlan(suggestion) {
  const { payload, business_context } = suggestion;

  if (!payload || !payload.playlists) {
    throw new Error('Invalid plan suggestion: missing playlists');
  }

  const results = [];

  for (const playlistPlan of payload.playlists) {
    // Generate slides for this playlist
    const slideSuggestion = await generateSlides(
      {
        playlistName: playlistPlan.name,
        playlistDescription: playlistPlan.description,
        slideCount: playlistPlan.slideCount || 4,
        theme: playlistPlan.theme,
      },
      business_context
    );

    // Materialize the playlist
    const result = await materializePlaylist(slideSuggestion);
    results.push(result);
  }

  // Mark plan as accepted
  await acceptSuggestion(suggestion.id);

  return {
    playlists: results,
    totalPlaylists: results.length,
    totalSlides: results.reduce((sum, r) => sum + r.slideCount, 0),
  };
}

/**
 * Delete a suggestion (for cleanup)
 * @param {string} suggestionId - Suggestion UUID
 */
export async function deleteSuggestion(suggestionId) {
  const { error } = await supabase
    .from('ai_content_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) throw error;
}

/**
 * Get user's business context from profile
 * @returns {Promise<object>} Business context from profile
 */
export async function getBusinessContextFromProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('business_name, business_type, brand_colors')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    businessName: profile?.business_name || '',
    businessType: profile?.business_type || 'generic',
    brandColors: profile?.brand_colors || {},
    targetAudience: 'general customers',
    specialNotes: '',
  };
}

export default {
  generatePlan,
  generateSlides,
  acceptSuggestion,
  rejectSuggestion,
  fetchSuggestions,
  fetchSuggestion,
  materializePlaylist,
  materializePlan,
  deleteSuggestion,
  getBusinessContextFromProfile,
  BUSINESS_TYPES,
};
