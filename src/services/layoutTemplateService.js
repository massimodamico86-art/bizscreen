/**
 * Layout Template Service
 *
 * Service for managing layout templates and cloning them to user layouts.
 *
 * @module services/layoutTemplateService
 */
import { supabase } from '../supabase';

/**
 * @typedef {Object} LayoutTemplate
 * @property {string} id - Template UUID
 * @property {string|null} tenant_id - Owner tenant ID (null = global)
 * @property {string} name - Template name
 * @property {string} description - Template description
 * @property {string} category - Category (Holidays, Restaurant, etc.)
 * @property {string} orientation - 16_9, 9_16, or square
 * @property {string} thumbnail_url - Preview image URL
 * @property {string} background_color - Background color
 * @property {string|null} background_image_url - Background image URL
 * @property {Object} data - Layout elements data
 * @property {number} use_count - Times cloned
 * @property {boolean} is_featured - Featured template
 * @property {boolean} is_active - Active/visible
 */

/**
 * Fetch layout templates with optional filters
 *
 * @param {Object} options - Filter options
 * @param {string} options.category - Filter by category
 * @param {string} options.orientation - Filter by orientation
 * @param {string} options.search - Search by name
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Items per page
 * @param {boolean} options.featuredOnly - Only show featured templates
 * @returns {Promise<{templates: LayoutTemplate[], total: number, hasMore: boolean}>}
 */
export async function fetchLayoutTemplates(options = {}) {
  const {
    category,
    orientation,
    search,
    page = 1,
    pageSize = 24,
    featuredOnly = false,
  } = options;

  let query = supabase
    .from('layout_templates')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('use_count', { ascending: false })
    .order('created_at', { ascending: false });

  // Apply filters
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  if (orientation && orientation !== 'All') {
    query = query.eq('orientation', orientation);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (featuredOnly) {
    query = query.eq('is_featured', true);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    templates: data || [],
    total: count || 0,
    hasMore: (data?.length || 0) === pageSize && from + pageSize < (count || 0),
  };
}

/**
 * Fetch a single template by ID
 *
 * @param {string} templateId - Template ID
 * @returns {Promise<LayoutTemplate>}
 */
export async function fetchTemplateById(templateId) {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Clone a template to create a new layout
 *
 * @param {Object} options - Clone options
 * @param {string} options.templateId - Template ID to clone
 * @param {string} options.ownerId - Owner user ID for the new layout
 * @param {string} options.name - Optional custom name for the layout
 * @returns {Promise<{id: string, name: string}>} New layout info
 */
export async function cloneTemplateToLayout({ templateId, ownerId, name }) {
  // Use the database function for atomic operation
  const { data, error } = await supabase.rpc('clone_template_to_layout', {
    p_template_id: templateId,
    p_owner_id: ownerId,
    p_name: name || null,
  });

  if (error) {
    throw error;
  }

  // Fetch the created layout to return its details
  const { data: layout, error: fetchError } = await supabase
    .from('layouts')
    .select('id, name')
    .eq('id', data)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  return layout;
}

/**
 * Clone a template to layout (alternative JS implementation if RPC not available)
 * Falls back to this if the database function doesn't exist.
 *
 * @param {Object} options - Clone options
 * @param {string} options.templateId - Template ID to clone
 * @param {string} options.ownerId - Owner user ID for the new layout
 * @param {string} options.name - Optional custom name for the layout
 * @returns {Promise<{id: string, name: string}>} New layout info
 */
export async function cloneTemplateToLayoutFallback({ templateId, ownerId, name }) {
  // Fetch the template
  const template = await fetchTemplateById(templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  // Determine layout name
  const layoutName = name || template.name.replace(/\s*\(Copy\)\s*$/, '');

  // Map orientation to aspect ratio
  const aspectRatioMap = {
    '16_9': '16:9',
    '9_16': '9:16',
    'square': '1:1',
  };

  // Create the layout
  const { data: newLayout, error: insertError } = await supabase
    .from('layouts')
    .insert({
      owner_id: ownerId,
      name: layoutName,
      description: template.description,
      width: template.width,
      height: template.height,
      background_color: template.background_color,
      background_image: template.background_image_url,
      aspect_ratio: aspectRatioMap[template.orientation] || '16:9',
      data: template.data,
      template_id: templateId,
    })
    .select('id, name')
    .single();

  if (insertError) {
    throw insertError;
  }

  // Increment use count on template
  await supabase
    .from('layout_templates')
    .update({ use_count: (template.use_count || 0) + 1 })
    .eq('id', templateId);

  return newLayout;
}

/**
 * Get available template categories
 *
 * @returns {Promise<string[]>} List of unique categories
 */
export async function fetchTemplateCategories() {
  const { data, error } = await supabase
    .from('layout_templates')
    .select('category')
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  // Get unique categories
  const categories = [...new Set(data.map(t => t.category))].sort();
  return categories;
}

/**
 * Create a template from an existing layout (stub for future implementation)
 *
 * @param {string} layoutId - Layout ID to convert to template
 * @param {Object} options - Template options
 * @returns {Promise<LayoutTemplate>}
 */
export async function createTemplateFromLayout(layoutId, options = {}) {
  // TODO: Implement this when needed
  // Steps:
  // 1. Fetch the layout
  // 2. Create a new template with the layout's data
  // 3. Generate a thumbnail (could use a service like Puppeteer)
  // 4. Return the new template

  throw new Error('createTemplateFromLayout is not yet implemented');
}

export default {
  fetchLayoutTemplates,
  fetchTemplateById,
  cloneTemplateToLayout,
  cloneTemplateToLayoutFallback,
  fetchTemplateCategories,
  createTemplateFromLayout,
};
