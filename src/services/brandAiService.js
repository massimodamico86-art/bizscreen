/**
 * Brand AI Service
 *
 * AI-powered brand identity extraction and enhancement.
 * Provides intelligent color extraction, theme improvement,
 * and slide styling based on brand themes.
 *
 * @module services/brandAiService
 */

import {
  extractColorsFromImage,
  generatePaletteFromColors,
  suggestFontPairings,
  DEFAULT_THEME,
  FONT_PAIRINGS,
} from './brandThemeService';

// ============================================
// COLOR HARMONY RULES
// ============================================

const COLOR_HARMONIES = {
  complementary: { angle: 180, description: 'High contrast, vibrant' },
  triadic: { angle: 120, description: 'Balanced, colorful' },
  analogous: { angle: 30, description: 'Harmonious, natural' },
  splitComplementary: { angle: 150, description: 'Subtle contrast' },
};

// ============================================
// BRAND IDENTITY EXTRACTION
// ============================================

/**
 * Extract complete brand identity from a logo/image URL
 * Returns colors, font suggestions, and background variations
 *
 * @param {string} imageUrl - URL of the brand image (logo)
 * @returns {Promise<Object>} Brand identity object
 */
export async function extractBrandIdentity(imageUrl) {
  try {
    // Extract colors from the image
    const extractedColors = await extractColorsFromImage(imageUrl);

    // Generate a complete palette
    const palette = generatePaletteFromColors(extractedColors);

    // Get font recommendations based on the palette mood
    const fontSuggestions = suggestFontPairings(palette);

    // Generate background variations
    const backgroundVariations = generateBackgroundVariations(palette);

    // Determine the overall mood/style
    const brandMood = analyzeBrandMood(extractedColors);

    return {
      colors: {
        extracted: extractedColors,
        primary: palette.primary_color,
        secondary: palette.secondary_color,
        accent: palette.accent_color,
        neutral: palette.neutral_color,
        background: palette.background_color,
        textPrimary: palette.text_primary_color,
        textSecondary: palette.text_secondary_color,
      },
      fonts: {
        recommended: fontSuggestions,
        heading: fontSuggestions[0]?.heading || 'Inter',
        body: fontSuggestions[0]?.body || 'Inter',
      },
      backgrounds: backgroundVariations,
      mood: brandMood,
      success: true,
    };
  } catch (err) {
    console.error('extractBrandIdentity error:', err);
    return {
      colors: {
        extracted: [],
        primary: DEFAULT_THEME.primary_color,
        secondary: DEFAULT_THEME.secondary_color,
        accent: DEFAULT_THEME.accent_color,
        neutral: DEFAULT_THEME.neutral_color,
        background: DEFAULT_THEME.background_color,
        textPrimary: DEFAULT_THEME.text_primary_color,
        textSecondary: DEFAULT_THEME.text_secondary_color,
      },
      fonts: {
        recommended: FONT_PAIRINGS.slice(0, 3),
        heading: 'Inter',
        body: 'Inter',
      },
      backgrounds: generateBackgroundVariations(DEFAULT_THEME),
      mood: 'modern',
      success: false,
      error: err.message,
    };
  }
}

/**
 * Generate background style variations from a palette
 * @param {Object} palette - Color palette
 * @returns {Object[]} Array of background options
 */
function generateBackgroundVariations(palette) {
  const primary = palette.primary_color || DEFAULT_THEME.primary_color;
  const secondary = palette.secondary_color || DEFAULT_THEME.secondary_color;
  const background = palette.background_color || DEFAULT_THEME.background_color;

  return [
    {
      id: 'dark-solid',
      name: 'Dark Solid',
      type: 'solid',
      color: '#0F172A',
      preview: '#0F172A',
    },
    {
      id: 'brand-dark',
      name: 'Brand Dark',
      type: 'solid',
      color: darkenColor(primary, 70),
      preview: darkenColor(primary, 70),
    },
    {
      id: 'gradient-primary',
      name: 'Brand Gradient',
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { color: darkenColor(primary, 60), position: 0 },
          { color: darkenColor(secondary, 70), position: 100 },
        ],
      },
      preview: primary,
    },
    {
      id: 'gradient-subtle',
      name: 'Subtle Gradient',
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#1E293B', position: 0 },
          { color: '#0F172A', position: 100 },
        ],
      },
      preview: '#1E293B',
    },
    {
      id: 'light-solid',
      name: 'Light Solid',
      type: 'solid',
      color: '#F8FAFC',
      preview: '#F8FAFC',
    },
  ];
}

/**
 * Analyze the mood/style of extracted colors
 * @param {string[]} colors - Array of hex colors
 * @returns {string} Mood descriptor
 */
function analyzeBrandMood(colors) {
  if (!colors || colors.length === 0) return 'modern';

  // Calculate average warmth and saturation
  let totalWarmth = 0;
  let totalSaturation = 0;

  colors.forEach(hex => {
    const { r, g, b } = hexToRgb(hex);
    totalWarmth += (r - b) / 255;
    totalSaturation += getSaturation(hex);
  });

  const avgWarmth = totalWarmth / colors.length;
  const avgSaturation = totalSaturation / colors.length;

  if (avgSaturation < 0.2) {
    return 'minimal'; // Low saturation = minimalist
  } else if (avgWarmth > 0.3) {
    return avgSaturation > 0.6 ? 'vibrant' : 'warm'; // Warm colors
  } else if (avgWarmth < -0.2) {
    return avgSaturation > 0.6 ? 'bold' : 'cool'; // Cool colors
  } else {
    return 'modern'; // Balanced
  }
}

// ============================================
// THEME ENHANCEMENT
// ============================================

/**
 * Enhance an existing theme to improve harmony and modernize the palette
 *
 * @param {Object} theme - Existing theme JSON
 * @returns {Object} Enhanced theme
 */
export function enhanceTheme(theme) {
  if (!theme) return DEFAULT_THEME;

  const enhanced = { ...theme };

  // Improve color harmony
  const primaryHsl = hexToHsl(theme.primary_color || DEFAULT_THEME.primary_color);

  // Generate a complementary accent if needed
  if (!theme.accent_color || theme.accent_color === theme.primary_color) {
    const accentHue = (primaryHsl.h + 150) % 360; // Split-complementary
    enhanced.accent_color = hslToHex({
      h: accentHue,
      s: Math.min(primaryHsl.s * 1.1, 100),
      l: primaryHsl.l,
    });
  }

  // Ensure good contrast for text colors
  const bgLuminance = getLuminance(theme.background_color || DEFAULT_THEME.background_color);
  if (bgLuminance < 0.5) {
    // Dark background - ensure light text
    enhanced.text_primary_color = '#FFFFFF';
    enhanced.text_secondary_color = '#94A3B8';
  } else {
    // Light background - ensure dark text
    enhanced.text_primary_color = '#1E293B';
    enhanced.text_secondary_color = '#64748B';
  }

  // Modernize border radius
  if (enhanced.block_defaults) {
    enhanced.block_defaults = {
      ...enhanced.block_defaults,
      shape: {
        ...enhanced.block_defaults.shape,
        borderRadius: 12, // Modern rounded corners
      },
    };
  }

  // Update widget style for consistency
  enhanced.widget_style = {
    textColor: enhanced.text_primary_color,
    backgroundColor: 'transparent',
    accentColor: enhanced.accent_color,
    borderRadius: 8,
    fontFamily: enhanced.font_body,
  };

  return enhanced;
}

/**
 * Adjust theme contrast for better readability
 * @param {Object} theme - Theme object
 * @returns {Object} Theme with adjusted contrast
 */
export function adjustThemeContrast(theme) {
  const enhanced = { ...theme };

  const bgColor = theme.background_color || DEFAULT_THEME.background_color;
  const primaryColor = theme.primary_color || DEFAULT_THEME.primary_color;

  // Check contrast ratio between primary and background
  const contrastRatio = getContrastRatio(primaryColor, bgColor);

  if (contrastRatio < 4.5) {
    // Insufficient contrast - adjust primary color
    const bgLuminance = getLuminance(bgColor);
    if (bgLuminance < 0.5) {
      // Dark background - lighten primary
      enhanced.primary_color = lightenColor(primaryColor, 20);
    } else {
      // Light background - darken primary
      enhanced.primary_color = darkenColor(primaryColor, 20);
    }
  }

  return enhanced;
}

// ============================================
// SLIDE THEMING
// ============================================

/**
 * Apply a theme to a slide design
 * Updates colors, typography, and block styling
 *
 * @param {Object} slide - Slide design object
 * @param {Object} theme - Brand theme
 * @returns {Object} Themed slide design
 */
export function applyThemeToSlide(slide, theme) {
  if (!slide || !theme) return slide;

  const themedSlide = { ...slide };
  const design = { ...slide.design_json };

  // Apply background
  design.background = {
    type: theme.background_style?.type || 'solid',
    color: theme.background_color || DEFAULT_THEME.background_color,
    gradient: theme.background_style?.gradient || null,
  };

  // Apply theme to blocks
  if (design.blocks) {
    design.blocks = design.blocks.map(block => applyThemeToBlock(block, theme));
  }

  themedSlide.design_json = design;
  return themedSlide;
}

/**
 * Apply theme styling to a single block
 * @param {Object} block - Block object
 * @param {Object} theme - Brand theme
 * @returns {Object} Themed block
 */
export function applyThemeToBlock(block, theme) {
  if (!block || !theme) return block;

  const themed = { ...block };

  switch (block.type) {
    case 'text':
      themed.props = {
        ...block.props,
        color: block.props?.fontSize > 30
          ? theme.text_primary_color || DEFAULT_THEME.text_primary_color
          : theme.text_secondary_color || DEFAULT_THEME.text_secondary_color,
        fontFamily: block.props?.fontSize > 30
          ? theme.font_heading || DEFAULT_THEME.font_heading
          : theme.font_body || DEFAULT_THEME.font_body,
      };
      break;

    case 'shape':
      themed.props = {
        ...block.props,
        fill: theme.primary_color || DEFAULT_THEME.primary_color,
        borderRadius: theme.block_defaults?.shape?.borderRadius || 12,
      };
      break;

    case 'widget':
      themed.props = {
        ...block.props,
        style: {
          ...(block.props?.style || {}),
          textColor: theme.text_primary_color || DEFAULT_THEME.text_primary_color,
          accentColor: theme.accent_color || DEFAULT_THEME.accent_color,
        },
      };
      break;
  }

  return themed;
}

/**
 * Generate themed block defaults for creating new blocks
 * @param {Object} theme - Brand theme
 * @returns {Object} Block default configurations
 */
export function generateThemedBlockDefaults(theme) {
  return {
    text: {
      heading: {
        fontSize: 48,
        fontWeight: '700',
        color: theme?.text_primary_color || DEFAULT_THEME.text_primary_color,
        fontFamily: theme?.font_heading || DEFAULT_THEME.font_heading,
        align: 'center',
      },
      body: {
        fontSize: 24,
        fontWeight: '400',
        color: theme?.text_secondary_color || DEFAULT_THEME.text_secondary_color,
        fontFamily: theme?.font_body || DEFAULT_THEME.font_body,
        align: 'center',
      },
    },
    shape: {
      rectangle: {
        fill: theme?.primary_color || DEFAULT_THEME.primary_color,
        borderRadius: 12,
        opacity: 1,
      },
      accent: {
        fill: theme?.accent_color || DEFAULT_THEME.accent_color,
        borderRadius: 8,
        opacity: 0.9,
      },
    },
    widget: {
      clock: {
        textColor: theme?.text_primary_color || DEFAULT_THEME.text_primary_color,
        accentColor: theme?.accent_color || DEFAULT_THEME.accent_color,
      },
      date: {
        textColor: theme?.text_primary_color || DEFAULT_THEME.text_primary_color,
        accentColor: theme?.accent_color || DEFAULT_THEME.accent_color,
      },
      weather: {
        textColor: theme?.text_primary_color || DEFAULT_THEME.text_primary_color,
        accentColor: theme?.accent_color || DEFAULT_THEME.accent_color,
      },
    },
  };
}

// ============================================
// COLOR UTILITY FUNCTIONS
// ============================================

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) * 60;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) * 60;
        break;
    }
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  );
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rNorm, gNorm, bNorm] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
}

function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getSaturation(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lightenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractBrandIdentity,
  enhanceTheme,
  adjustThemeContrast,
  applyThemeToSlide,
  applyThemeToBlock,
  generateThemedBlockDefaults,
};
