/**
 * Marketplace Service
 *
 * Frontend service for the Template Marketplace.
 * Handles fetching templates, checking access, and installing templates as scenes.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('MarketplaceService');

// ============================================================================
// CONSTANTS
// ============================================================================

export const TEMPLATE_TYPES = {
  SCENE: 'scene',
  SLIDE: 'slide',
  BLOCK: 'block',
};

export const LICENSE_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const LICENSE_LABELS = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

// ============================================================================
// FETCH TEMPLATES
// ============================================================================

/**
 * Fetch marketplace templates with filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.categoryId] - Filter by category
 * @param {string} [filters.templateType] - Filter by template type
 * @param {string} [filters.license] - Filter by license tier
 * @param {string} [filters.industry] - Filter by industry
 * @param {string} [filters.search] - Search query
 * @param {boolean} [filters.featuredOnly] - Only show featured templates
 * @param {number} [filters.limit] - Max results
 * @param {number} [filters.offset] - Pagination offset
 * @returns {Promise<Array>} Templates with access info
 */
export async function fetchMarketplaceTemplates(filters = {}) {
  const {
    categoryId = null,
    templateType = null,
    license = null,
    industry = null,
    search = null,
    featuredOnly = false,
    limit = 50,
    offset = 0,
  } = filters;

  const { data, error } = await supabase.rpc('get_marketplace_templates', {
    p_category_id: categoryId,
    p_template_type: templateType,
    p_license: license,
    p_industry: industry,
    p_search: search,
    p_featured_only: featuredOnly,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch featured templates for homepage
 * @param {number} [limit] - Max results
 * @returns {Promise<Array>} Featured templates
 */
export async function fetchFeaturedTemplates(limit = 6) {
  return fetchMarketplaceTemplates({
    featuredOnly: true,
    limit,
  });
}

/**
 * Fetch templates by category
 * @param {string} categoryId - Category UUID
 * @param {number} [limit] - Max results
 * @returns {Promise<Array>} Templates in category
 */
export async function fetchTemplatesByCategory(categoryId, limit = 20) {
  return fetchMarketplaceTemplates({
    categoryId,
    limit,
  });
}

// ============================================================================
// STARTER PACKS
// ============================================================================

/**
 * Fetch all active starter packs with their templates
 * @returns {Promise<Array>} Starter packs with embedded template arrays
 */
export async function fetchStarterPacks() {
  const { data, error } = await supabase.rpc('get_starter_packs');
  if (error) throw error;
  return (data || []).map(pack => ({
    ...pack,
    templates: pack.templates || [],
  }));
}

// ============================================================================
// TEMPLATE DETAILS
// ============================================================================

/**
 * Fetch template detail by ID
 * @param {string} templateId - Template UUID
 * @returns {Promise<Object>} Template detail with slides
 */
export async function fetchTemplateDetail(templateId) {
  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('template_library')
    .select(`
      *,
      category:template_categories(id, name, slug)
    `)
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Template not found');

  // Fetch slides
  const { data: slides, error: slidesError } = await supabase
    .from('template_library_slides')
    .select('*')
    .eq('template_id', templateId)
    .order('position');

  if (slidesError) throw slidesError;

  // Check access
  const { data: canAccess } = await supabase.rpc('can_access_template', {
    p_template_id: templateId,
  });

  return {
    ...template,
    slides: slides || [],
    canAccess: canAccess || false,
  };
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Fetch all template categories
 * @returns {Promise<Array>} Categories
 */
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('template_categories')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

// ============================================================================
// ACCESS VERIFICATION
// ============================================================================

/**
 * Check if user can access a template
 * @param {string} templateId - Template UUID
 * @returns {Promise<boolean>} Can access
 */
export async function verifyTemplatePermissions(templateId) {
  const { data, error } = await supabase.rpc('can_access_template', {
    p_template_id: templateId,
  });

  if (error) throw error;
  return data === true;
}

// ============================================================================
// INSTALL TEMPLATE
// ============================================================================

/**
 * Install a template as a new scene
 * @param {string} templateId - Template UUID
 * @param {string} [sceneName] - Optional custom scene name
 * @returns {Promise<string>} New scene ID
 */
export async function installTemplateAsScene(templateId, sceneName = null) {
  const { data, error } = await supabase.rpc('clone_template_to_scene', {
    p_template_id: templateId,
    p_scene_name: sceneName,
  });

  if (error) throw error;

  // Record usage for recents tracking (non-blocking)
  recordMarketplaceUsage(templateId).catch((err) => {
    logger.warn('Failed to record template usage', { templateId, error: err.message });
  });

  return data;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Create a new template (admin only)
 * @param {Object} template - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(template) {
  const { data, error } = await supabase
    .from('template_library')
    .insert({
      name: template.name,
      description: template.description,
      category_id: template.categoryId,
      template_type: template.templateType || 'scene',
      license: template.license || 'free',
      industry: template.industry,
      tags: template.tags || [],
      thumbnail_url: template.thumbnailUrl,
      preview_url: template.previewUrl,
      is_active: template.isActive !== false,
      is_featured: template.isFeatured || false,
      metadata: template.metadata || {},
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a template (admin only)
 * @param {string} templateId - Template UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  const updateData = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.templateType !== undefined) updateData.template_type = updates.templateType;
  if (updates.license !== undefined) updateData.license = updates.license;
  if (updates.industry !== undefined) updateData.industry = updates.industry;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;
  if (updates.previewUrl !== undefined) updateData.preview_url = updates.previewUrl;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.isFeatured !== undefined) updateData.is_featured = updates.isFeatured;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from('template_library')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a template (admin only)
 * @param {string} templateId - Template UUID
 */
export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('template_library')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Fetch all templates for admin (including inactive)
 * @param {Object} [filters] - Filters
 * @returns {Promise<Array>} All templates
 */
export async function fetchAdminTemplates(filters = {}) {
  let query = supabase
    .from('template_library')
    .select(`
      *,
      category:template_categories(id, name, slug),
      slide_count:template_library_slides(count)
    `)
    .order('created_at', { ascending: false });

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.license) {
    query = query.eq('license', filters.license);
  }
  if (filters.templateType) {
    query = query.eq('template_type', filters.templateType);
  }
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Transform slide_count
  return (data || []).map(t => ({
    ...t,
    slideCount: t.slide_count?.[0]?.count || 0,
  }));
}

// ============================================================================
// TEMPLATE SLIDES ADMIN
// ============================================================================

/**
 * Add a slide to a template (admin only)
 * @param {string} templateId - Template UUID
 * @param {Object} slide - Slide data
 * @returns {Promise<Object>} Created slide
 */
export async function addTemplateSlide(templateId, slide) {
  // Get next position
  const { data: existing } = await supabase
    .from('template_library_slides')
    .select('position')
    .eq('template_id', templateId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing?.[0]?.position !== undefined
    ? existing[0].position + 1
    : 0;

  const { data, error } = await supabase
    .from('template_library_slides')
    .insert({
      template_id: templateId,
      position: slide.position ?? nextPosition,
      title: slide.title,
      kind: slide.kind || 'default',
      design_json: slide.designJson || {},
      duration_seconds: slide.durationSeconds || 10,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a template slide (admin only)
 * @param {string} slideId - Slide UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated slide
 */
export async function updateTemplateSlide(slideId, updates) {
  const updateData = {};

  if (updates.position !== undefined) updateData.position = updates.position;
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.kind !== undefined) updateData.kind = updates.kind;
  if (updates.designJson !== undefined) updateData.design_json = updates.designJson;
  if (updates.durationSeconds !== undefined) updateData.duration_seconds = updates.durationSeconds;

  const { data, error } = await supabase
    .from('template_library_slides')
    .update(updateData)
    .eq('id', slideId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a template slide (admin only)
 * @param {string} slideId - Slide UUID
 */
export async function deleteTemplateSlide(slideId) {
  const { error } = await supabase
    .from('template_library_slides')
    .delete()
    .eq('id', slideId);

  if (error) throw error;
}

/**
 * Reorder template slides (admin only)
 * @param {string} templateId - Template UUID
 * @param {Array<{id: string, position: number}>} slideOrder - New order
 */
export async function reorderTemplateSlides(templateId, slideOrder) {
  // Update each slide's position
  const updates = slideOrder.map(({ id, position }) =>
    supabase
      .from('template_library_slides')
      .update({ position })
      .eq('id', id)
      .eq('template_id', templateId)
  );

  await Promise.all(updates);
}

// ============================================================================
// ENTERPRISE ACCESS ADMIN
// ============================================================================

/**
 * Grant enterprise access to a tenant (admin only)
 * @param {string} templateId - Template UUID
 * @param {string} tenantId - Tenant UUID
 */
export async function grantEnterpriseAccess(templateId, tenantId) {
  const { error } = await supabase
    .from('template_enterprise_access')
    .insert({
      template_id: templateId,
      tenant_id: tenantId,
      granted_by: (await supabase.auth.getUser()).data.user?.id,
    });

  if (error) throw error;
}

/**
 * Revoke enterprise access from a tenant (admin only)
 * @param {string} templateId - Template UUID
 * @param {string} tenantId - Tenant UUID
 */
export async function revokeEnterpriseAccess(templateId, tenantId) {
  const { error } = await supabase
    .from('template_enterprise_access')
    .delete()
    .eq('template_id', templateId)
    .eq('tenant_id', tenantId);

  if (error) throw error;
}

/**
 * Fetch enterprise access list for a template (admin only)
 * @param {string} templateId - Template UUID
 * @returns {Promise<Array>} Access grants
 */
export async function fetchEnterpriseAccess(templateId) {
  const { data, error } = await supabase
    .from('template_enterprise_access')
    .select(`
      *,
      tenant:profiles!tenant_id(id, email, business_name)
    `)
    .eq('template_id', templateId);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

/**
 * Upload template thumbnail (admin only)
 * @param {string} templateId - Template UUID
 * @param {File} file - Image file
 * @returns {Promise<string>} Public URL
 */
export async function uploadTemplateThumbnail(templateId, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${templateId}/thumbnail.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('template-assets')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('template-assets')
    .getPublicUrl(fileName);

  // Update template with URL
  await updateTemplate(templateId, { thumbnailUrl: urlData.publicUrl });

  return urlData.publicUrl;
}

/**
 * Upload template preview image (admin only)
 * @param {string} templateId - Template UUID
 * @param {File} file - Image file
 * @returns {Promise<string>} Public URL
 */
export async function uploadTemplatePreview(templateId, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${templateId}/preview.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('template-assets')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('template-assets')
    .getPublicUrl(fileName);

  // Update template with URL
  await updateTemplate(templateId, { previewUrl: urlData.publicUrl });

  return urlData.publicUrl;
}

// ============================================================================
// FAVORITES AND HISTORY
// ============================================================================

/**
 * Toggle favorite status for a marketplace template
 * @param {string} templateId - Template UUID
 * @returns {Promise<boolean>} New favorite status (true = favorited, false = unfavorited)
 */
export async function toggleMarketplaceFavorite(templateId) {
  const { data, error } = await supabase.rpc('toggle_marketplace_favorite', {
    p_template_id: templateId,
  });
  if (error) throw error;
  return data;
}

/**
 * Fetch user's favorite marketplace templates
 * @param {number} [limit=10] - Max results
 * @returns {Promise<Array>} Favorited templates
 */
export async function fetchMarketplaceFavorites(limit = 10) {
  const { data, error } = await supabase.rpc('get_marketplace_favorites', {
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Fetch user's recently used marketplace templates
 * @param {number} [limit=5] - Max results
 * @returns {Promise<Array>} Recent templates (deduplicated)
 */
export async function fetchRecentMarketplaceTemplates(limit = 5) {
  const { data, error } = await supabase.rpc('get_recent_marketplace_templates', {
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Record template usage in history
 * @param {string} templateId - Template UUID
 */
export async function recordMarketplaceUsage(templateId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Silently fail for anonymous

  const { error } = await supabase
    .from('marketplace_template_history')
    .insert({ user_id: user.id, template_id: templateId });

  if (error) {
    logger.warn('Failed to record template usage', { templateId, error: error.message });
    // Don't throw - this is non-critical
  }
}

/**
 * Check if templates are favorited (batch check)
 * @param {string[]} templateIds - Array of template UUIDs
 * @returns {Promise<Set<string>>} Set of favorited template IDs
 */
export async function checkFavoritedTemplates(templateIds) {
  if (!templateIds.length) return new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('marketplace_template_favorites')
    .select('template_id')
    .eq('user_id', user.id)
    .in('template_id', templateIds);

  if (error) throw error;
  return new Set((data || []).map(f => f.template_id));
}

// ============================================================================
// CUSTOMIZATION
// ============================================================================

/**
 * Apply customizations to a scene
 * Updates scene slides with logo, colors, and text replacements.
 *
 * @param {string} sceneId - Scene UUID
 * @param {Object} customization - Customization data
 * @param {File|null} customization.logo - Logo file to upload
 * @param {string} customization.primaryColor - Hex color
 * @param {Object} customization.texts - Key-value text replacements
 * @returns {Promise<void>}
 */
export async function applyCustomizationToScene(sceneId, customization) {
  const { logo, primaryColor, texts } = customization;

  // 1. Upload logo if provided
  let logoUrl = null;
  if (logo) {
    const fileExt = logo.name.split('.').pop();
    const fileName = `scenes/${sceneId}/logo.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('scene-assets')
      .upload(fileName, logo, { upsert: true });

    if (uploadError) {
      logger.error({ error: uploadError, sceneId }, 'Failed to upload logo');
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('scene-assets')
      .getPublicUrl(fileName);

    logoUrl = urlData.publicUrl;
  }

  // 2. Fetch scene slides
  const { data: slides, error: fetchError } = await supabase
    .from('scene_slides')
    .select('id, design_json')
    .eq('scene_id', sceneId);

  if (fetchError) throw fetchError;
  if (!slides || slides.length === 0) return;

  // 3. Apply customizations to each slide's design_json
  for (const slide of slides) {
    let designJson = slide.design_json || {};
    let modified = false;

    // Apply color replacement (if design has color placeholders)
    if (primaryColor && designJson) {
      designJson = applyColorToDesign(designJson, primaryColor);
      modified = true;
    }

    // Apply text replacements
    if (texts && Object.keys(texts).length > 0) {
      designJson = applyTextsToDesign(designJson, texts);
      modified = true;
    }

    // Apply logo URL
    if (logoUrl) {
      designJson = applyLogoToDesign(designJson, logoUrl);
      modified = true;
    }

    // Update slide if modified
    if (modified) {
      const { error: updateError } = await supabase
        .from('scene_slides')
        .update({ design_json: designJson })
        .eq('id', slide.id);

      if (updateError) {
        logger.error({ error: updateError, slideId: slide.id }, 'Failed to update slide');
      }
    }
  }

  logger.info(
    { sceneId, hasLogo: !!logoUrl, hasColor: !!primaryColor, textCount: Object.keys(texts || {}).length },
    'Applied customizations to scene'
  );
}

/**
 * Apply primary color to design JSON
 * Looks for elements with customizable color flags
 * @param {Object} designJson - Slide design JSON
 * @param {string} color - Hex color string
 * @returns {Object} Modified design JSON
 */
function applyColorToDesign(designJson, color) {
  // Deep clone to avoid mutation
  const design = JSON.parse(JSON.stringify(designJson));

  // Recursively find elements with customizable_color flag
  function walkElements(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (el.customizable_color || el.type === 'primary_color') {
        el.fill = color;
        el.backgroundColor = color;
      }
      if (el.children) walkElements(el.children);
      if (el.objects) walkElements(el.objects);
    }
  }

  if (design.objects) walkElements(design.objects);
  if (design.elements) walkElements(design.elements);

  return design;
}

/**
 * Apply text replacements to design JSON
 * Looks for elements with text_key property
 * @param {Object} designJson - Slide design JSON
 * @param {Object} texts - Key-value text replacements
 * @returns {Object} Modified design JSON
 */
function applyTextsToDesign(designJson, texts) {
  const design = JSON.parse(JSON.stringify(designJson));

  function walkElements(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (el.text_key && texts[el.text_key] !== undefined) {
        el.text = texts[el.text_key];
      }
      if (el.children) walkElements(el.children);
      if (el.objects) walkElements(el.objects);
    }
  }

  if (design.objects) walkElements(design.objects);
  if (design.elements) walkElements(design.elements);

  return design;
}

/**
 * Apply logo URL to design JSON
 * Looks for elements with logo placeholder
 * @param {Object} designJson - Slide design JSON
 * @param {string} logoUrl - Public URL of uploaded logo
 * @returns {Object} Modified design JSON
 */
function applyLogoToDesign(designJson, logoUrl) {
  const design = JSON.parse(JSON.stringify(designJson));

  function walkElements(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (el.is_logo || el.type === 'logo_placeholder') {
        el.src = logoUrl;
        el.type = 'image';
      }
      if (el.children) walkElements(el.children);
      if (el.objects) walkElements(el.objects);
    }
  }

  if (design.objects) walkElements(design.objects);
  if (design.elements) walkElements(design.elements);

  return design;
}
