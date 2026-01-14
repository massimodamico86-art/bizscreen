/**
 * Template Service
 *
 * Frontend service for fetching and applying content templates and vertical packs.
 */

import { supabase } from '../supabase';

/**
 * Category icon mapping (for Lucide icons)
 */
export const CATEGORY_ICONS = {
  utensils: 'Utensils',
  scissors: 'Scissors',
  dumbbell: 'Dumbbell',
  'shopping-bag': 'ShoppingBag',
  building: 'Building2',
};

/**
 * Template type badges
 */
export const TEMPLATE_TYPE_BADGES = {
  playlist: { label: 'Playlist', color: 'blue' },
  layout: { label: 'Layout', color: 'purple' },
  pack: { label: 'Starter Pack', color: 'green' },
};

/**
 * Fetch all template categories
 */
export async function fetchTemplateCategories() {
  const { data, error } = await supabase
    .from('template_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch templates with optional filters
 * @param {object} options
 * @param {string} options.categorySlug - Filter by category slug
 * @param {string} options.type - Filter by type ('playlist', 'layout', 'pack')
 */
export async function fetchTemplates({ categorySlug, type } = {}) {
  let query = supabase
    .from('content_templates')
    .select(`
      *,
      category:template_categories(id, slug, name, icon)
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Filter by category if provided
  if (categorySlug) {
    // First get category ID
    const { data: category } = await supabase
      .from('template_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (category) {
      query = query.eq('category_id', category.id);
    }
  }

  // Filter by type if provided
  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single template by slug
 */
export async function fetchTemplate(slug) {
  const { data, error } = await supabase
    .from('content_templates')
    .select(`
      *,
      category:template_categories(id, slug, name, icon),
      blueprints:content_template_blueprints(id, blueprint_type, blueprint)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Apply a template (playlist or layout)
 * @param {string} slug - Template slug
 * @returns {Promise<{playlists: Array, layouts: Array, schedules: Array}>}
 */
export async function applyTemplate(slug) {
  const { data, error } = await supabase
    .rpc('apply_template', { p_template_slug: slug });

  if (error) throw error;
  return data;
}

/**
 * Apply a pack template (creates multiple playlists, layouts, schedules)
 * @param {string} slug - Pack slug
 * @returns {Promise<{playlists: Array, layouts: Array, schedules: Array}>}
 */
export async function applyPack(slug) {
  const { data, error } = await supabase
    .rpc('apply_pack_template', { p_pack_slug: slug });

  if (error) throw error;
  return data;
}

/**
 * Format a template for display as a card
 * @param {object} template - Template object from database
 * @returns {object} Formatted template for UI
 */
export function formatTemplateForCard(template) {
  const badge = TEMPLATE_TYPE_BADGES[template.type] || { label: template.type, color: 'gray' };
  const meta = template.meta || {};

  return {
    id: template.id,
    slug: template.slug,
    type: template.type,
    name: template.name,
    title: template.name,
    description: template.description,
    thumbnail: template.thumbnail_url,
    thumbnail_url: template.thumbnail_url,
    preview_image_url: template.thumbnail_url,
    category: template.category?.name || 'General',
    categorySlug: template.category?.slug || 'generic',
    categoryIcon: template.category?.icon,
    orientation: meta.orientation || 'landscape',
    is_featured: meta.is_featured || false,
    badge,
    meta,
    isPack: template.type === 'pack',
    isPlaylist: template.type === 'playlist',
    isLayout: template.type === 'layout',
  };
}

/**
 * Get templates grouped by category
 */
export async function getTemplatesGroupedByCategory() {
  const [categories, templates] = await Promise.all([
    fetchTemplateCategories(),
    fetchTemplates(),
  ]);

  const grouped = categories.map((category) => ({
    ...category,
    templates: templates
      .filter((t) => t.category?.slug === category.slug)
      .map(formatTemplateForCard),
  }));

  return grouped;
}

/**
 * Get packs only (for onboarding)
 */
export async function getPackTemplates() {
  const templates = await fetchTemplates({ type: 'pack' });
  return templates.map(formatTemplateForCard);
}

/**
 * Get playlist templates only
 */
export async function getPlaylistTemplates(categorySlug = null) {
  const templates = await fetchTemplates({ type: 'playlist', categorySlug });
  return templates.map(formatTemplateForCard);
}

/**
 * Get layout templates only
 */
export async function getLayoutTemplates(categorySlug = null) {
  const templates = await fetchTemplates({ type: 'layout', categorySlug });
  return templates.map(formatTemplateForCard);
}

/**
 * Get the default pack slug for a business type
 */
export function getDefaultPackSlug(businessType) {
  const mapping = {
    restaurant: 'restaurant_starter_pack',
    salon: 'salon_starter_pack',
    gym: 'gym_starter_pack',
    retail: 'retail_starter_pack',
    generic: 'generic_starter_pack',
    other: 'generic_starter_pack',
  };
  return mapping[businessType] || mapping.generic;
}

export default {
  fetchTemplateCategories,
  fetchTemplates,
  fetchTemplate,
  applyTemplate,
  applyPack,
  formatTemplateForCard,
  getTemplatesGroupedByCategory,
  getPackTemplates,
  getPlaylistTemplates,
  getLayoutTemplates,
  getDefaultPackSlug,
  CATEGORY_ICONS,
  TEMPLATE_TYPE_BADGES,
};
