/**
 * SVG Template Service
 *
 * Handles SVG template loading, parsing, and user design management.
 * Integrates with Fabric.js for canvas serialization.
 */
import { supabase } from '../supabase';
import { fetchGalleryTemplates } from './templateGalleryService';

/**
 * PHASE 170 NOTES (v20.0 Templates Reimagined):
 *   - Hardcoded template array removed (D-19); 12 entries live in svg_templates seed.
 *   - fetchSvgTemplates now delegates to templateGalleryService (D-20).
 *   - fetchSvgTemplateById queries DB by slug or UUID (Pitfall 2).
 *   - Phase 171 replaces the legacy SVG gallery page with TemplateGalleryPage;
 *     fetchSvgTemplates is slated for removal in a follow-up cleanup pass.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Upload thumbnail to S3 using presigned URL
 * @param {Blob} blob - Image blob to upload
 * @param {string} userId - User ID for folder path
 * @returns {Promise<string|null>} Public URL of uploaded file
 */
async function uploadThumbnailToS3(blob, userId) {
  try {
    const filename = `thumbnail-${Date.now()}.png`;

    // Get presigned URL from API
    const response = await fetch(`${API_BASE}/api/media/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        contentType: 'image/png',
        folder: `thumbnails/${userId}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { uploadUrl, fileUrl } = await response.json();

    // Upload to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    }

    console.log('Thumbnail uploaded to S3:', fileUrl);
    return fileUrl;
  } catch (err) {
    console.error('S3 thumbnail upload error:', err);
    return null;
  }
}

/**
 * Standard digital signage resolutions
 * Used to scale up templates with small dimensions
 */
const SIGNAGE_RESOLUTIONS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

/**
 * Minimum dimension threshold for signage
 * Templates with dimensions below this will be scaled up
 */
const MIN_SIGNAGE_DIMENSION = 800;

/**
 * Normalize template dimensions for digital signage
 * Scales up small SVG dimensions (like A4 paper) to proper screen resolutions
 * while preserving aspect ratio
 *
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {Object} Normalized dimensions { width, height }
 */
function normalizeSignageDimensions(width, height, orientation) {
  // If dimensions are already large enough, use them
  if (width >= MIN_SIGNAGE_DIMENSION && height >= MIN_SIGNAGE_DIMENSION) {
    return { width, height };
  }

  // Get target resolution based on orientation
  const target = orientation === 'portrait'
    ? SIGNAGE_RESOLUTIONS.portrait
    : SIGNAGE_RESOLUTIONS.landscape;

  // Calculate scale factor to fit within target while preserving aspect ratio
  const aspectRatio = width / height;
  const targetAspectRatio = target.width / target.height;

  let newWidth, newHeight;

  if (aspectRatio > targetAspectRatio) {
    // Width is the limiting factor
    newWidth = target.width;
    newHeight = Math.round(target.width / aspectRatio);
  } else {
    // Height is the limiting factor
    newHeight = target.height;
    newWidth = Math.round(target.height * aspectRatio);
  }

  return { width: newWidth, height: newHeight };
}


/**
 * Fetch SVG-only templates through the unified gallery VIEW.
 *
 * Phase 170 D-20: delegates to templateGalleryService.fetchGalleryTemplates
 * with editorType='svg'. Shape is preserved for remaining legacy callers
 * still using this service surface (Phase 171 migrated the gallery page to
 * templateGalleryService directly; cleanup pass will remove this shim).
 *
 * @param {Object} [options]
 * @param {string} [options.category]    — 'all' means no filter
 * @param {string} [options.orientation] — 'all' means no filter
 * @param {string} [options.search]
 * @returns {Promise<Array<object>>} templates (empty array on error)
 */
export async function fetchSvgTemplates(options = {}) {
  const { category, orientation, search } = options;
  const { data, error } = await fetchGalleryTemplates({
    category: category && category !== 'all' ? category : undefined,
    orientation: orientation && orientation !== 'all' ? orientation : undefined,
    search: search || undefined,
    editorType: 'svg',
  });
  if (error) {
    console.warn('fetchSvgTemplates: DB error', error.message || error);
    return [];
  }
  return data;
}

/**
 * Fetch a single SVG template by id or slug.
 *
 * Phase 170 D-19 / Pitfall 2: hardcoded array .find() fallback removed.
 * The string slugs used by legacy callers (e.g. 'restaurant-menu-1') now
 * resolve via the `slug` column in svg_templates. Callers passing UUIDs
 * still hit the `id = ?` branch.
 *
 * @param {string} templateIdOrSlug
 * @returns {Promise<object|null>} template row or null if not found
 */
export async function fetchSvgTemplateById(templateIdOrSlug) {
  if (!templateIdOrSlug) return null;

  // Detect UUID vs slug (UUID v4/v5 = 36 chars, hyphenated, lowercase hex)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    templateIdOrSlug
  );

  const column = isUuid ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('svg_templates')
    .select('*')
    .eq(column, templateIdOrSlug)
    .maybeSingle();

  if (error) {
    console.warn('fetchSvgTemplateById: DB error', error.message || error);
    return null;
  }
  return data;
}

/**
 * Load SVG content from URL
 * @param {string} svgUrl - URL to the SVG file
 * @returns {Promise<string>} SVG content as string
 */
export async function loadSvgContent(svgUrl) {
  const response = await fetch(svgUrl);
  if (!response.ok) {
    throw new Error(`Failed to load SVG: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Parse SVG and extract editable text elements
 * Returns metadata about text elements for the editor
 * @param {string} svgContent - SVG string content
 * @returns {Object} Parsed SVG data with text elements
 */
export function parseSvgTextElements(svgContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    throw new Error('Invalid SVG content');
  }

  // Get viewBox dimensions
  const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 800, 600];
  const width = parseFloat(svg.getAttribute('width')) || viewBox[2];
  const height = parseFloat(svg.getAttribute('height')) || viewBox[3];

  // Find all text elements
  const textElements = svg.querySelectorAll('text, tspan');
  const editableTexts = [];

  textElements.forEach((el, index) => {
    // Skip tspans that are children of text elements we already processed
    if (el.tagName === 'tspan' && el.parentElement?.tagName === 'text') {
      return;
    }

    const text = el.textContent?.trim();
    if (!text) return;

    // Get transform matrix if exists
    const transform = el.getAttribute('transform') || '';
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);

    let x = parseFloat(el.getAttribute('x')) || 0;
    let y = parseFloat(el.getAttribute('y')) || 0;

    // Parse matrix transform for position
    if (matrixMatch) {
      const matrix = matrixMatch[1].split(/[\s,]+/).map(Number);
      if (matrix.length >= 6) {
        x = matrix[4];
        y = matrix[5];
      }
    }

    // Get computed style
    const computedStyle = window.getComputedStyle ? window.getComputedStyle(el) : {};
    const fill = el.getAttribute('fill') || el.style?.fill || computedStyle.fill || '#333333';
    const fontSize = el.getAttribute('font-size') || el.style?.fontSize || computedStyle.fontSize || '16';
    const fontFamily = el.getAttribute('font-family') || el.style?.fontFamily || computedStyle.fontFamily || 'sans-serif';
    const fontWeight = el.getAttribute('font-weight') || el.style?.fontWeight || computedStyle.fontWeight || 'normal';

    editableTexts.push({
      id: `text-${index}`,
      text,
      x,
      y,
      fill: fill.replace(/url\([^)]+\)/, '#333333'), // Replace gradient refs with solid color
      fontSize: parseFloat(fontSize),
      fontFamily: fontFamily.replace(/['"]/g, ''),
      fontWeight,
      className: el.getAttribute('class') || '',
    });
  });

  return {
    viewBox,
    width,
    height,
    textElements: editableTexts,
    svgContent,
  };
}

/**
 * Save user design (Fabric.js JSON) to database
 * Saves to both layouts table (for design editing) and svg_templates (for playlist library)
 * @param {Object} designData - Design data to save
 * @returns {Promise<Object>} Saved design record
 */
export async function saveUserSvgDesign(designData) {
  const {
    id,
    name,
    templateId,
    fabricJson,
    thumbnailDataUrl,
    width,
    height,
  } = designData;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let thumbnailUrl = null;

  // Upload thumbnail to S3 if provided
  if (thumbnailDataUrl) {
    try {
      console.log('Generating thumbnail blob from data URL...');
      const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
      console.log('Uploading thumbnail to S3, Size:', thumbnailBlob.size);

      thumbnailUrl = await uploadThumbnailToS3(thumbnailBlob, user.id);

      if (thumbnailUrl) {
        console.log('Thumbnail uploaded successfully:', thumbnailUrl);
      }
    } catch (err) {
      console.error('Failed to upload thumbnail:', err);
    }
  } else {
    console.warn('No thumbnailDataUrl provided for save');
  }

  const layoutData = {
    owner_id: user.id,
    name: name || 'Untitled SVG Design',
    description: `Created from SVG template`,
    width: width || 1920,
    height: height || 1080,
    data: {
      type: 'svg_design',
      templateId,
      fabricJson,
      version: 1,
    },
    aspect_ratio: width > height ? '16:9' : (width < height ? '9:16' : '1:1'),
    background_image: thumbnailUrl,
  };

  let result;

  if (id) {
    // Update existing layout
    const { data, error } = await supabase
      .from('layouts')
      .update(layoutData)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) throw error;
    result = data;

    // Also update corresponding svg_template
    await supabase
      .from('svg_templates')
      .update({
        name: name || 'Untitled Design',
        thumbnail: thumbnailUrl,
        width: width || 1920,
        height: height || 1080,
        metadata: { fabricJson, layoutId: id },
        updated_at: new Date().toISOString(),
      })
      .eq('metadata->>layoutId', id)
      .eq('created_by', user.id);
  } else {
    // Create new layout
    const { data, error } = await supabase
      .from('layouts')
      .insert(layoutData)
      .select()
      .single();

    if (error) throw error;
    result = data;

    // Also create entry in svg_templates for the playlist library
    const orientation = (width || 1920) > (height || 1080) ? 'landscape' :
                        (width || 1920) < (height || 1080) ? 'portrait' : 'square';

    await supabase
      .from('svg_templates')
      .insert({
        tenant_id: null, // User's own template
        name: name || 'Untitled Design',
        description: 'My custom design',
        category: 'My Designs',
        orientation,
        thumbnail: thumbnailUrl,
        svg_url: thumbnailUrl || '', // Use thumbnail as preview
        width: width || 1920,
        height: height || 1080,
        tags: ['my designs', 'custom'],
        metadata: { fabricJson, layoutId: result.id },
        is_featured: false,
        is_active: true,
        created_by: user.id,
      });
  }

  return result;
}

/**
 * Load user's SVG design by ID
 * @param {string} designId - Design/layout ID
 * @returns {Promise<Object>} Design data with Fabric.js JSON
 */
export async function loadUserSvgDesign(designId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('id', designId)
    .single();

  if (error) throw error;

  if (data.data?.type !== 'svg_design') {
    throw new Error('This layout is not an SVG design');
  }

  return {
    id: data.id,
    name: data.name,
    width: data.width,
    height: data.height,
    templateId: data.data.templateId,
    fabricJson: data.data.fabricJson,
    thumbnailUrl: data.background_image,
  };
}

/**
 * Fetch user's SVG designs
 * @returns {Promise<Array>} List of user's SVG designs
 */
export async function fetchUserSvgDesigns() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('owner_id', user.id)
    .eq('data->>type', 'svg_design')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Delete user's SVG design
 * @param {string} designId - Design ID to delete
 */
export async function deleteUserSvgDesign(designId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('layouts')
    .delete()
    .eq('id', designId)
    .eq('owner_id', user.id);

  if (error) throw error;
}

/**
 * Get template categories
 * @returns {Array} List of categories
 */
export function getSvgTemplateCategories() {
  return [
    { id: 'all', label: 'All Templates' },
    { id: 'my designs', label: 'My Designs' },
    { id: 'restaurant', label: 'Restaurant & Food' },
    { id: 'retail', label: 'Retail & Shopping' },
    { id: 'corporate', label: 'Corporate & Business' },
    { id: 'events', label: 'Events & Entertainment' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'real estate', label: 'Real Estate' },
    { id: 'fitness', label: 'Fitness & Wellness' },
    { id: 'hospitality', label: 'Hotels & Hospitality' },
    { id: 'education', label: 'Education' },
  ];
}

export default {
  fetchSvgTemplates,
  fetchSvgTemplateById,
  loadSvgContent,
  parseSvgTextElements,
  saveUserSvgDesign,
  loadUserSvgDesign,
  fetchUserSvgDesigns,
  deleteUserSvgDesign,
  getSvgTemplateCategories,
};
