/**
 * Brand Theme Service
 *
 * Manages brand themes including:
 * - CRUD operations for brand themes
 * - Logo upload and color extraction
 * - Theme application to scenes and slides
 * - Font pairing suggestions
 *
 * @module services/brandThemeService
 */

import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ============================================
// DEFAULT THEME
// ============================================

export const DEFAULT_THEME = {
  name: 'Default Theme',
  primary_color: '#3B82F6',
  secondary_color: '#1D4ED8',
  accent_color: '#10B981',
  neutral_color: '#6B7280',
  background_color: '#0F172A',
  text_primary_color: '#FFFFFF',
  text_secondary_color: '#94A3B8',
  font_heading: 'Inter',
  font_body: 'Inter',
  background_style: {
    type: 'solid',
    color: '#0F172A',
    gradient: null,
    pattern: null,
  },
  widget_style: {
    textColor: '#FFFFFF',
    backgroundColor: 'transparent',
    accentColor: '#3B82F6',
    borderRadius: 8,
  },
  block_defaults: {
    text: {
      color: '#FFFFFF',
      fontFamily: 'Inter',
    },
    shape: {
      fill: '#3B82F6',
      borderRadius: 12,
    },
  },
};

// ============================================
// FONT PAIRINGS
// ============================================

export const FONT_PAIRINGS = [
  { heading: 'Inter', body: 'Inter', style: 'Modern & Clean' },
  { heading: 'Playfair Display', body: 'Source Sans Pro', style: 'Elegant & Classic' },
  { heading: 'Montserrat', body: 'Open Sans', style: 'Professional & Bold' },
  { heading: 'Roboto', body: 'Roboto', style: 'Neutral & Versatile' },
  { heading: 'Poppins', body: 'Lato', style: 'Friendly & Modern' },
  { heading: 'Oswald', body: 'Merriweather', style: 'Bold & Traditional' },
  { heading: 'Raleway', body: 'Nunito', style: 'Sleek & Approachable' },
  { heading: 'Bebas Neue', body: 'Open Sans', style: 'Impactful & Dynamic' },
];

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a logo image to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadLogo(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return { url: null, error: 'Cloudinary is not configured' };
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'File must be an image' };
  }

  // Validate file size (max 5MB for logos)
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'Logo must be less than 5MB' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'brand-themes/logos');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return { url: result.secure_url, error: null };
  } catch (err) {
    console.error('uploadLogo error:', err);
    return { url: null, error: err.message };
  }
}

// ============================================
// COLOR EXTRACTION
// ============================================

/**
 * Extract dominant colors from an image
 * Uses canvas to analyze pixel data
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string[]>} Array of hex colors
 */
export async function extractColorsFromImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Scale down for faster processing
        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Color quantization using simple k-means-like clustering
        const colorCounts = {};

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip very light or very dark colors (likely background)
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 235) continue;

          // Quantize to reduce color space
          const qR = Math.round(r / 32) * 32;
          const qG = Math.round(g / 32) * 32;
          const qB = Math.round(b / 32) * 32;

          const hex = rgbToHex(qR, qG, qB);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        // Sort by frequency and get top colors
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([color]) => color);

        // Ensure we have at least 4 colors
        while (sortedColors.length < 4) {
          sortedColors.push(DEFAULT_THEME.primary_color);
        }

        resolve(sortedColors);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Get contrast ratio between two colors
 */
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate a complete color palette from extracted colors
 * @param {string[]} extractedColors - Array of hex colors
 * @returns {Object} Complete theme colors
 */
export function generatePaletteFromColors(extractedColors) {
  if (!extractedColors || extractedColors.length === 0) {
    return {
      primary_color: DEFAULT_THEME.primary_color,
      secondary_color: DEFAULT_THEME.secondary_color,
      accent_color: DEFAULT_THEME.accent_color,
      neutral_color: DEFAULT_THEME.neutral_color,
      background_color: DEFAULT_THEME.background_color,
      text_primary_color: DEFAULT_THEME.text_primary_color,
      text_secondary_color: DEFAULT_THEME.text_secondary_color,
    };
  }

  // Sort colors by saturation (most saturated = primary)
  const sortedBySaturation = [...extractedColors].sort((a, b) => {
    return getSaturation(b) - getSaturation(a);
  });

  const primary = sortedBySaturation[0] || DEFAULT_THEME.primary_color;
  const secondary = sortedBySaturation[1] || darkenColor(primary, 20);
  const accent = sortedBySaturation[2] || '#10B981';

  // Find a neutral color (lowest saturation)
  const neutral = [...extractedColors].sort((a, b) => {
    return getSaturation(a) - getSaturation(b);
  })[0] || '#6B7280';

  // Determine background color (dark by default for TV screens)
  const background = '#0F172A';

  // Determine text colors based on background
  const textPrimary = '#FFFFFF';
  const textSecondary = '#94A3B8';

  return {
    primary_color: primary,
    secondary_color: secondary,
    accent_color: accent,
    neutral_color: neutral,
    background_color: background,
    text_primary_color: textPrimary,
    text_secondary_color: textSecondary,
  };
}

/**
 * Get saturation of a hex color
 */
function getSaturation(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Darken a color by a percentage
 */
function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor)
  );
}

// ============================================
// FONT SUGGESTIONS
// ============================================

/**
 * Suggest font pairings based on color palette mood
 * @param {Object} colors - The color palette
 * @returns {Object[]} Array of font pairing suggestions
 */
export function suggestFontPairings(colors) {
  // Analyze the primary color to determine mood
  const primary = colors?.primary_color || DEFAULT_THEME.primary_color;
  const { r, g, b } = hexToRgb(primary);

  // Heuristic: warmer colors (red/orange) = more traditional fonts
  // Cooler colors (blue/green) = more modern fonts
  const warmth = (r - b) / 255;

  if (warmth > 0.3) {
    // Warm palette - suggest classic/elegant fonts
    return [
      FONT_PAIRINGS[1], // Playfair Display + Source Sans Pro
      FONT_PAIRINGS[5], // Oswald + Merriweather
      FONT_PAIRINGS[0], // Inter + Inter (always good)
    ];
  } else if (warmth < -0.2) {
    // Cool palette - suggest modern/clean fonts
    return [
      FONT_PAIRINGS[0], // Inter + Inter
      FONT_PAIRINGS[4], // Poppins + Lato
      FONT_PAIRINGS[6], // Raleway + Nunito
    ];
  } else {
    // Neutral - suggest versatile fonts
    return [
      FONT_PAIRINGS[2], // Montserrat + Open Sans
      FONT_PAIRINGS[3], // Roboto + Roboto
      FONT_PAIRINGS[0], // Inter + Inter
    ];
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get the active brand theme for the current user
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function getBrandTheme() {
  try {
    const { data, error } = await supabase
      .rpc('get_active_brand_theme');

    if (error) throw error;

    return { data: data || DEFAULT_THEME, error: null };
  } catch (err) {
    console.error('getBrandTheme error:', err);
    return { data: DEFAULT_THEME, error: err.message };
  }
}

/**
 * Get all brand themes for the current user
 * @returns {Promise<{data: Object[]|null, error: string|null}>}
 */
export async function getAllBrandThemes() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('brand_themes')
      .select('*')
      .eq('profile_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getAllBrandThemes error:', err);
    return { data: [], error: err.message };
  }
}

/**
 * Create a new brand theme
 * @param {Object} themeData - Theme configuration
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function createBrandTheme(themeData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const theme = {
      profile_id: user.id,
      name: themeData.name || 'My Brand Theme',
      logo_url: themeData.logo_url || null,
      source_image_url: themeData.source_image_url || null,
      primary_color: themeData.primary_color || DEFAULT_THEME.primary_color,
      secondary_color: themeData.secondary_color || DEFAULT_THEME.secondary_color,
      accent_color: themeData.accent_color || DEFAULT_THEME.accent_color,
      neutral_color: themeData.neutral_color || DEFAULT_THEME.neutral_color,
      background_color: themeData.background_color || DEFAULT_THEME.background_color,
      text_primary_color: themeData.text_primary_color || DEFAULT_THEME.text_primary_color,
      text_secondary_color: themeData.text_secondary_color || DEFAULT_THEME.text_secondary_color,
      font_heading: themeData.font_heading || DEFAULT_THEME.font_heading,
      font_body: themeData.font_body || DEFAULT_THEME.font_body,
      background_style: themeData.background_style || DEFAULT_THEME.background_style,
      widget_style: themeData.widget_style || DEFAULT_THEME.widget_style,
      block_defaults: themeData.block_defaults || DEFAULT_THEME.block_defaults,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('brand_themes')
      .insert(theme)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    logActivity(
      ACTIONS.CREATED,
      RESOURCE_TYPES.BRANDING,
      data.id,
      data.name,
      { colors: { primary: data.primary_color, secondary: data.secondary_color } }
    );

    return { data, error: null };
  } catch (err) {
    console.error('createBrandTheme error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Update an existing brand theme
 * @param {string} themeId - Theme ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function updateBrandTheme(themeId, updates) {
  try {
    const { data, error } = await supabase
      .from('brand_themes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', themeId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    logActivity(
      ACTIONS.UPDATED,
      RESOURCE_TYPES.BRANDING,
      data.id,
      data.name,
      { updates }
    );

    return { data, error: null };
  } catch (err) {
    console.error('updateBrandTheme error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Delete a brand theme
 * @param {string} themeId - Theme ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteBrandTheme(themeId) {
  try {
    const { error } = await supabase
      .from('brand_themes')
      .delete()
      .eq('id', themeId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    console.error('deleteBrandTheme error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Set a theme as the active theme
 * @param {string} themeId - Theme ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function setActiveTheme(themeId) {
  try {
    const { error } = await supabase
      .from('brand_themes')
      .update({ is_active: true })
      .eq('id', themeId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    console.error('setActiveTheme error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// THEME APPLICATION
// ============================================

/**
 * Apply brand theme to a scene (updates all slides)
 * @param {string} sceneId - Scene ID
 * @param {string} themeId - Theme ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function applyBrandThemeToScene(sceneId, themeId) {
  try {
    const { data, error } = await supabase
      .rpc('apply_brand_theme_to_scene', {
        p_scene_id: sceneId,
        p_theme_id: themeId,
      });

    if (error) throw error;

    return { success: data === true, error: data ? null : 'Failed to apply theme' };
  } catch (err) {
    console.error('applyBrandThemeToScene error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Apply brand theme to specific slides
 * @param {string[]} slideIds - Array of slide IDs
 * @param {Object} theme - Theme object
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function applyBrandThemeToSlides(slideIds, theme) {
  try {
    // Get current slides
    const { data: slides, error: fetchError } = await supabase
      .from('scene_slides')
      .select('id, design_json')
      .in('id', slideIds);

    if (fetchError) throw fetchError;

    // Update each slide with theme colors
    const updates = slides.map(slide => {
      const design = { ...slide.design_json };

      // Update background
      design.background = {
        type: 'solid',
        color: theme.background_color,
      };

      // Update text blocks with theme colors
      if (design.blocks) {
        design.blocks = design.blocks.map(block => {
          if (block.type === 'text') {
            return {
              ...block,
              props: {
                ...block.props,
                color: block.props?.fontSize > 30
                  ? theme.text_primary_color
                  : theme.text_secondary_color,
              },
            };
          }
          if (block.type === 'shape') {
            return {
              ...block,
              props: {
                ...block.props,
                fill: theme.primary_color,
              },
            };
          }
          return block;
        });
      }

      return {
        id: slide.id,
        design_json: design,
      };
    });

    // Batch update
    for (const update of updates) {
      const { error } = await supabase
        .from('scene_slides')
        .update({ design_json: update.design_json })
        .eq('id', update.id);

      if (error) throw error;
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('applyBrandThemeToSlides error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Generate themed block defaults for the editor
 * @param {Object} theme - Brand theme
 * @returns {Object} Block defaults with theme applied
 */
export function getThemedBlockDefaults(theme) {
  if (!theme) {
    return DEFAULT_THEME.block_defaults;
  }

  return {
    text: {
      color: theme.text_primary_color || DEFAULT_THEME.text_primary_color,
      fontFamily: theme.font_body || DEFAULT_THEME.font_body,
    },
    shape: {
      fill: theme.primary_color || DEFAULT_THEME.primary_color,
      borderRadius: theme.block_defaults?.shape?.borderRadius || 12,
    },
    heading: {
      color: theme.text_primary_color || DEFAULT_THEME.text_primary_color,
      fontFamily: theme.font_heading || DEFAULT_THEME.font_heading,
      fontWeight: '700',
    },
  };
}

/**
 * Generate themed widget style
 * @param {Object} theme - Brand theme
 * @returns {Object} Widget style configuration
 */
export function getThemedWidgetStyle(theme) {
  if (!theme) {
    return DEFAULT_THEME.widget_style;
  }

  return {
    textColor: theme.text_primary_color || DEFAULT_THEME.text_primary_color,
    backgroundColor: 'transparent',
    accentColor: theme.accent_color || DEFAULT_THEME.accent_color,
    borderRadius: 8,
    fontFamily: theme.font_body || DEFAULT_THEME.font_body,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  DEFAULT_THEME,
  FONT_PAIRINGS,
  uploadLogo,
  extractColorsFromImage,
  generatePaletteFromColors,
  suggestFontPairings,
  getBrandTheme,
  getAllBrandThemes,
  createBrandTheme,
  updateBrandTheme,
  deleteBrandTheme,
  setActiveTheme,
  applyBrandThemeToScene,
  applyBrandThemeToSlides,
  getThemedBlockDefaults,
  getThemedWidgetStyle,
};
