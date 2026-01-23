/**
 * SVG Template Service
 *
 * Handles SVG template loading, parsing, and user design management.
 * Integrates with Fabric.js for canvas serialization.
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('SvgTemplateService');

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

    logger.info('Thumbnail uploaded to S3:', { data: fileUrl });
    return fileUrl;
  } catch (err) {
    logger.error('S3 thumbnail upload error:', { error: err });
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
 * Local SVG templates configuration
 * Templates stored in public/templates/svg/
 */
export const LOCAL_SVG_TEMPLATES = [
  {
    id: 'restaurant-menu-1',
    name: 'Restaurant Menu',
    description: 'Elegant restaurant menu template with sections for starters, mains, desserts and drinks',
    category: 'Restaurant',
    orientation: 'landscape',
    thumbnail: '/templates/svg/restaurant-menu/menu-design.svg',
    svgUrl: '/templates/svg/restaurant-menu/menu-design.svg',
    width: 1920,
    height: 1080,
    tags: ['menu', 'restaurant', 'food', 'dining'],
    isFeatured: true,
  },
  {
    id: 'cafe-special-1',
    name: 'Cafe Daily Special',
    description: 'Coffee shop daily special board with pricing',
    category: 'Restaurant',
    orientation: 'portrait',
    thumbnail: '/templates/svg/cafe-special/design.svg',
    svgUrl: '/templates/svg/cafe-special/design.svg',
    width: 1080,
    height: 1920,
    tags: ['cafe', 'coffee', 'special', 'daily'],
  },
  {
    id: 'retail-sale-1',
    name: 'Retail Sale Banner',
    description: 'Eye-catching sale promotion banner for retail displays',
    category: 'Retail',
    orientation: 'landscape',
    thumbnail: '/templates/svg/retail-sale/design.svg',
    svgUrl: '/templates/svg/retail-sale/design.svg',
    width: 1920,
    height: 1080,
    tags: ['sale', 'retail', 'promotion', 'discount'],
  },
  {
    id: 'welcome-sign-1',
    name: 'Welcome Display',
    description: 'Professional welcome sign for lobbies and entrances',
    category: 'Corporate',
    orientation: 'landscape',
    thumbnail: '/templates/svg/welcome-sign/design.svg',
    svgUrl: '/templates/svg/welcome-sign/design.svg',
    width: 1920,
    height: 1080,
    tags: ['welcome', 'corporate', 'lobby', 'entrance'],
  },
  {
    id: 'holiday-sale-1',
    name: 'Holiday Sale',
    description: 'Festive holiday sale promotion with discount badge and call-to-action',
    category: 'Retail',
    orientation: 'landscape',
    thumbnail: '/templates/svg/holiday-sale/design.svg',
    svgUrl: '/templates/svg/holiday-sale/design.svg',
    width: 1920,
    height: 1080,
    tags: ['holiday', 'sale', 'christmas', 'promotion', 'seasonal'],
    isFeatured: true,
  },
  {
    id: 'real-estate-1',
    name: 'Real Estate Listing',
    description: 'Professional property listing display with features, price, and agent info',
    category: 'Real Estate',
    orientation: 'landscape',
    thumbnail: '/templates/svg/real-estate/design.svg',
    svgUrl: '/templates/svg/real-estate/design.svg',
    width: 1920,
    height: 1080,
    tags: ['real estate', 'property', 'listing', 'home', 'sale'],
    isFeatured: true,
  },
  {
    id: 'healthcare-info-1',
    name: 'Healthcare Services',
    description: 'Medical center services display with departments, hours, and contact info',
    category: 'Healthcare',
    orientation: 'landscape',
    thumbnail: '/templates/svg/healthcare-info/design.svg',
    svgUrl: '/templates/svg/healthcare-info/design.svg',
    width: 1920,
    height: 1080,
    tags: ['healthcare', 'medical', 'hospital', 'clinic', 'services'],
  },
  {
    id: 'corporate-welcome-1',
    name: 'Corporate Welcome',
    description: 'Modern corporate welcome display for lobbies and meeting rooms',
    category: 'Corporate',
    orientation: 'landscape',
    thumbnail: '/templates/svg/corporate-welcome/design.svg',
    svgUrl: '/templates/svg/corporate-welcome/design.svg',
    width: 1920,
    height: 1080,
    tags: ['corporate', 'welcome', 'meeting', 'lobby', 'business'],
  },
  {
    id: 'happy-hour-1',
    name: 'Happy Hour Specials',
    description: 'Bar and restaurant happy hour promotion with drink specials',
    category: 'Restaurant',
    orientation: 'portrait',
    thumbnail: '/templates/svg/happy-hour/design.svg',
    svgUrl: '/templates/svg/happy-hour/design.svg',
    width: 1080,
    height: 1920,
    tags: ['happy hour', 'bar', 'drinks', 'specials', 'restaurant'],
    isFeatured: true,
  },
  {
    id: 'fitness-promo-1',
    name: 'Fitness Gym Promo',
    description: 'Dynamic gym membership promotion with pricing and features',
    category: 'Fitness',
    orientation: 'landscape',
    thumbnail: '/templates/svg/fitness-promo/design.svg',
    svgUrl: '/templates/svg/fitness-promo/design.svg',
    width: 1920,
    height: 1080,
    tags: ['fitness', 'gym', 'membership', 'promotion', 'health'],
  },
  {
    id: 'hotel-amenities-1',
    name: 'Hotel Amenities',
    description: 'Hotel guest information display with amenities, dining hours, and services',
    category: 'Hospitality',
    orientation: 'portrait',
    thumbnail: '/templates/svg/hotel-amenities/design.svg',
    svgUrl: '/templates/svg/hotel-amenities/design.svg',
    width: 1080,
    height: 1920,
    tags: ['hotel', 'amenities', 'hospitality', 'guest', 'services'],
  },
  {
    id: 'event-promo-1',
    name: 'Event Promotion',
    description: 'Vibrant event promotion display for concerts, festivals, and live events',
    category: 'Events',
    orientation: 'landscape',
    thumbnail: '/templates/svg/event-promo/design.svg',
    svgUrl: '/templates/svg/event-promo/design.svg',
    width: 1920,
    height: 1080,
    tags: ['event', 'concert', 'festival', 'music', 'entertainment'],
    isFeatured: true,
  },
];

/**
 * Fetch all available SVG templates (local + database + template_library)
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of templates
 */
export async function fetchSvgTemplates(options = {}) {
  const { category, orientation, search, includeLocal = true } = options;

  let templates = [];

  // Add local templates
  if (includeLocal) {
    templates = [...LOCAL_SVG_TEMPLATES];
  }

  // Fetch from svg_templates table
  try {
    let query = supabase
      .from('svg_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.ilike('category', `%${category}%`);
    }

    if (orientation && orientation !== 'all') {
      query = query.eq('orientation', orientation);
    }

    if (search) {
      // Search in name, description, category, and tags
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      templates = [...templates, ...data];
    }
  } catch (err) {
    logger.warn('Could not fetch SVG templates from database:', err.message);
  }

  // Also fetch from template_library (admin-uploaded templates)
  try {
    let libraryQuery = supabase
      .from('template_library')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: libraryData, error: libraryError } = await libraryQuery;

    if (!libraryError && libraryData) {
      // Transform template_library format to match SVG template format
      const transformedTemplates = libraryData.map(t => {
        // Get orientation and raw dimensions from metadata
        const rawWidth = t.metadata?.width || 1920;
        const rawHeight = t.metadata?.height || 1080;
        const orientation = t.metadata?.orientation || (rawHeight > rawWidth ? 'portrait' : 'landscape');

        // Normalize dimensions for digital signage (scale up small SVGs)
        const normalizedDims = normalizeSignageDimensions(rawWidth, rawHeight, orientation);

        // Generate data URL from SVG content if no thumbnail exists
        const svgContent = t.metadata?.svgContent;
        let thumbnailDataUrl = null;
        if (!t.thumbnail_url && svgContent) {
          try {
            // Use encodeURIComponent for UTF-8 safe encoding
            thumbnailDataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
          } catch (e) {
            logger.warn('Failed to create data URL from SVG content:', { data: e });
          }
        }

        const thumbnailUrl = t.thumbnail_url || thumbnailDataUrl;

        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.industry || 'General',
          orientation,
          width: normalizedDims.width,
          height: normalizedDims.height,
          // Store original dimensions for SVG scaling reference
          originalWidth: rawWidth,
          originalHeight: rawHeight,
          thumbnail: thumbnailUrl,
          thumbnailUrl: thumbnailUrl,
          svgUrl: t.preview_url || t.thumbnail_url || thumbnailDataUrl,
          svgContent: svgContent, // Original SVG content for editing
          tags: t.tags || [],
          isFeatured: t.is_featured,
          license: t.license,
          createdAt: t.created_at,
          source: 'library', // Mark as from template_library
        };
      });
      templates = [...templates, ...transformedTemplates];
    }
  } catch (err) {
    logger.warn('Could not fetch templates from template_library:', err.message);
  }

  // Apply filters to all templates (including local and library)
  if (category && category !== 'all') {
    templates = templates.filter(t =>
      t.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  if (orientation && orientation !== 'all') {
    templates = templates.filter(t => t.orientation === orientation);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    templates = templates.filter(t =>
      t.name?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower) ||
      t.category?.toLowerCase().includes(searchLower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  return templates;
}

/**
 * Fetch a single SVG template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Template data
 */
export async function fetchSvgTemplateById(templateId) {
  // Check local templates first
  const localTemplate = LOCAL_SVG_TEMPLATES.find(t => t.id === templateId);
  if (localTemplate) {
    return localTemplate;
  }

  // Fetch from database
  const { data, error } = await supabase
    .from('svg_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    throw error;
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
      logger.info('Generating thumbnail blob from data URL...');
      const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
      logger.debug('Uploading thumbnail to S3, Size:', thumbnailBlob.size);

      thumbnailUrl = await uploadThumbnailToS3(thumbnailBlob, user.id);

      if (thumbnailUrl) {
        logger.info('Thumbnail uploaded successfully:', { data: thumbnailUrl });
      }
    } catch (err) {
      logger.error('Failed to upload thumbnail:', { error: err });
    }
  } else {
    logger.warn('No thumbnailDataUrl provided for save');
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
  LOCAL_SVG_TEMPLATES,
};
