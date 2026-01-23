/**
 * Branding Service - Manages branding configuration for clients
 *
 * Provides functions for:
 * - Getting current branding (respects impersonation)
 * - Updating branding settings
 * - Uploading branding assets (logo)
 */

import { supabase } from '../supabase';
import { getCurrentTenant, getImpersonatedClientId } from './tenantService';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('BrandingService');

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file to Cloudinary
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<{secure_url: string}|null>}
 */
async function uploadToCloudinary(file, folder = 'branding') {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

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

  return response.json();
}

// Default branding values
export const DEFAULT_BRANDING = {
  businessName: 'BizScreen',
  logoUrl: null,
  primaryColor: '#3B82F6', // Blue-500
  secondaryColor: '#1D4ED8', // Blue-700
  isDarkTheme: false,
  faviconUrl: null,
};

/**
 * @typedef {Object} BrandingConfig
 * @property {string} businessName
 * @property {string|null} logoUrl
 * @property {string} primaryColor - Hex color
 * @property {string} secondaryColor - Hex color
 * @property {boolean} isDarkTheme
 * @property {string|null} faviconUrl
 */

/**
 * Get branding configuration for the current tenant
 * Respects impersonation if active
 *
 * @returns {Promise<{data: BrandingConfig|null, error: string|null}>}
 */
export async function getBranding() {
  try {
    const { data: tenant, error: tenantError } = await getCurrentTenant();

    if (tenantError) {
      logger.error('Error fetching tenant:', { error: tenantError });
      return { data: { ...DEFAULT_BRANDING }, error: null };
    }

    if (!tenant) {
      return { data: { ...DEFAULT_BRANDING }, error: null };
    }

    return {
      data: {
        businessName: tenant.business_name || DEFAULT_BRANDING.businessName,
        logoUrl: tenant.branding_logo_url || DEFAULT_BRANDING.logoUrl,
        primaryColor: tenant.branding_primary_color || DEFAULT_BRANDING.primaryColor,
        secondaryColor: tenant.branding_secondary_color || DEFAULT_BRANDING.secondaryColor,
        isDarkTheme: tenant.branding_is_dark_theme ?? DEFAULT_BRANDING.isDarkTheme,
        faviconUrl: tenant.branding_favicon_url || DEFAULT_BRANDING.faviconUrl,
      },
      error: null,
    };
  } catch (err) {
    logger.error('getBranding error:', { error: err });
    return { data: { ...DEFAULT_BRANDING }, error: err.message };
  }
}

/**
 * Update branding configuration
 * Updates the current tenant's branding (respects impersonation)
 *
 * @param {Partial<BrandingConfig>} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateBranding(updates) {
  try {
    // Determine target profile ID
    const impersonatedId = getImpersonatedClientId();
    let targetId;

    if (impersonatedId) {
      targetId = impersonatedId;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      targetId = user.id;
    }

    // Use the RPC function for proper permission checking
    const { data, error } = await supabase.rpc('update_profile_branding', {
      target_id: targetId,
      p_business_name: updates.businessName ?? null,
      p_branding_primary_color: updates.primaryColor ?? null,
      p_branding_secondary_color: updates.secondaryColor ?? null,
      p_branding_logo_url: updates.logoUrl ?? null,
      p_branding_favicon_url: updates.faviconUrl ?? null,
      p_branding_is_dark_theme: updates.isDarkTheme ?? null,
    });

    if (error) {
      logger.error('Error updating branding:', { error: error });
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Permission denied' };
    }

    // Log activity
    logActivity(
      ACTIONS.BRANDING_UPDATED,
      RESOURCE_TYPES.BRANDING,
      targetId,
      'Branding Settings',
      { updates }
    );

    return { success: true, error: null };
  } catch (err) {
    logger.error('updateBranding error:', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Upload a logo image
 * Returns the URL of the uploaded image
 *
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadLogo(file) {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: 'File must be an image' };
    }

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      return { url: null, error: 'Logo must be less than 2MB' };
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file, 'branding/logos');

    if (!result || !result.secure_url) {
      return { url: null, error: 'Upload failed' };
    }

    return { url: result.secure_url, error: null };
  } catch (err) {
    logger.error('uploadLogo error:', { error: err });
    return { url: null, error: err.message };
  }
}

/**
 * Upload a favicon
 * Returns the URL of the uploaded favicon
 *
 * @param {File} file - Image file to upload
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadFavicon(file) {
  try {
    // Validate file type
    const validTypes = ['image/png', 'image/x-icon', 'image/ico', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      return { url: null, error: 'Favicon must be a PNG or ICO file' };
    }

    // Validate file size (max 500KB for favicons)
    if (file.size > 500 * 1024) {
      return { url: null, error: 'Favicon must be less than 500KB' };
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file, 'branding/favicons');

    if (!result || !result.secure_url) {
      return { url: null, error: 'Upload failed' };
    }

    return { url: result.secure_url, error: null };
  } catch (err) {
    logger.error('uploadFavicon error:', { error: err });
    return { url: null, error: err.message };
  }
}

/**
 * Reset branding to defaults
 *
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function resetBranding() {
  return updateBranding({
    businessName: null,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
    isDarkTheme: false,
    faviconUrl: null,
  });
}

/**
 * Validate a hex color string
 *
 * @param {string} color
 * @returns {boolean}
 */
export function isValidHexColor(color) {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Generate CSS custom properties from branding config
 *
 * @param {BrandingConfig} branding
 * @returns {object} CSS custom properties object
 */
export function brandingToCssVars(branding) {
  return {
    '--branding-primary': branding.primaryColor || DEFAULT_BRANDING.primaryColor,
    '--branding-secondary': branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    '--branding-primary-rgb': hexToRgb(branding.primaryColor || DEFAULT_BRANDING.primaryColor),
    '--branding-secondary-rgb': hexToRgb(branding.secondaryColor || DEFAULT_BRANDING.secondaryColor),
  };
}

/**
 * Convert hex color to RGB values string
 *
 * @param {string} hex
 * @returns {string} RGB values like "59, 130, 246"
 */
function hexToRgb(hex) {
  if (!hex) return '59, 130, 246'; // Default blue

  // Remove # if present
  hex = hex.replace('#', '');

  // Handle shorthand notation
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

/**
 * Get contrasting text color (black or white) for a background color
 *
 * @param {string} hexColor
 * @returns {string} '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor) {
  if (!hexColor) return '#FFFFFF';

  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default {
  getBranding,
  updateBranding,
  uploadLogo,
  uploadFavicon,
  resetBranding,
  isValidHexColor,
  brandingToCssVars,
  getContrastColor,
  DEFAULT_BRANDING,
};
