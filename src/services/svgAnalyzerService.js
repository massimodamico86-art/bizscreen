/**
 * SVG Analyzer Service
 *
 * Extracts features from SVG files for auto-tagging.
 * Features extracted:
 * - Text content (titles, labels, prices, etc.)
 * - Colors used
 * - Shape patterns
 * - Dimensions and orientation
 * - Font styles
 */
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('SvgAnalyzerService');

/**
 * Parse SVG content and extract analyzable features
 * @param {string} svgContent - Raw SVG string
 * @returns {Object} Extracted features
 */
export function analyzeSvg(svgContent) {
  if (!svgContent || typeof svgContent !== 'string') {
    throw new Error('Invalid SVG content');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    throw new Error('No SVG element found');
  }

  // Extract all features
  const features = {
    dimensions: extractDimensions(svg),
    texts: extractTexts(svg),
    colors: extractColors(svg),
    shapes: extractShapes(svg),
    fonts: extractFonts(svg),
    images: extractImages(svg),
    patterns: detectPatterns(svg),
  };

  // Generate summary for AI
  features.summary = generateSummary(features);

  return features;
}

/**
 * Extract SVG dimensions and orientation
 */
function extractDimensions(svg) {
  const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [];
  const width = parseFloat(svg.getAttribute('width')) || viewBox[2] || 1920;
  const height = parseFloat(svg.getAttribute('height')) || viewBox[3] || 1080;

  let orientation = 'landscape';
  if (height > width) {
    orientation = 'portrait';
  } else if (Math.abs(width - height) < 50) {
    orientation = 'square';
  }

  return {
    width,
    height,
    viewBox: viewBox.length ? viewBox : [0, 0, width, height],
    orientation,
    aspectRatio: `${Math.round(width / Math.gcd(width, height))}:${Math.round(height / Math.gcd(width, height))}`,
  };
}

// GCD helper for aspect ratio
Math.gcd = function(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
};

/**
 * Extract all text content from SVG
 */
function extractTexts(svg) {
  const textElements = svg.querySelectorAll('text, tspan');
  const texts = [];
  const seenTexts = new Set();

  textElements.forEach((el) => {
    const text = el.textContent?.trim();
    if (!text || seenTexts.has(text.toLowerCase())) return;
    seenTexts.add(text.toLowerCase());

    // Get text properties
    const fontSize = parseFloat(el.getAttribute('font-size') || el.style?.fontSize) || 16;
    const fontWeight = el.getAttribute('font-weight') || el.style?.fontWeight || 'normal';
    const fill = el.getAttribute('fill') || el.style?.fill || '#000000';

    // Classify text by size and position
    let type = 'body';
    if (fontSize >= 48) type = 'headline';
    else if (fontSize >= 32) type = 'title';
    else if (fontSize >= 24) type = 'subtitle';
    else if (fontSize >= 18) type = 'heading';
    else if (fontSize <= 12) type = 'caption';

    // Detect special content types
    const contentType = detectTextContentType(text);

    texts.push({
      content: text,
      type,
      contentType,
      fontSize,
      fontWeight,
      fill,
    });
  });

  return texts;
}

/**
 * Detect the type of text content
 */
function detectTextContentType(text) {
  const lowerText = text.toLowerCase();

  // Price patterns
  if (/^\$[\d,.]+$/.test(text) || /^[\d,.]+\s*€$/.test(text) || /price|cost/i.test(text)) {
    return 'price';
  }

  // Time patterns
  if (/^\d{1,2}:\d{2}/.test(text) || /am|pm|hours?|open|close/i.test(text)) {
    return 'time';
  }

  // Date patterns
  if (/\d{1,2}\/\d{1,2}|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i.test(text)) {
    return 'date';
  }

  // Phone patterns
  if (/^\+?[\d\s\-().]{10,}$/.test(text) || /phone|call|tel/i.test(text)) {
    return 'phone';
  }

  // Email patterns
  if (/@.*\./.test(text) || /email/i.test(text)) {
    return 'email';
  }

  // Address patterns
  if (/\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive)/i.test(text)) {
    return 'address';
  }

  // URL patterns
  if (/www\.|\.com|\.org|\.net|http/i.test(text)) {
    return 'url';
  }

  // Percentage/discount patterns
  if (/\d+%|off|discount|sale/i.test(text)) {
    return 'discount';
  }

  // Menu item patterns
  if (/starter|appetizer|main|entree|dessert|drink|beverage|soup|salad/i.test(text)) {
    return 'menu_section';
  }

  // CTA patterns
  if (/buy|shop|order|book|reserve|subscribe|sign up|get started|learn more|contact/i.test(lowerText)) {
    return 'cta';
  }

  return 'general';
}

/**
 * Extract colors used in SVG
 */
function extractColors(svg) {
  const colors = new Map();
  const elements = svg.querySelectorAll('*');

  elements.forEach((el) => {
    // Check fill
    const fill = el.getAttribute('fill') || el.style?.fill;
    if (fill && fill !== 'none' && !fill.startsWith('url(')) {
      const hex = normalizeColor(fill);
      if (hex) {
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }
    }

    // Check stroke
    const stroke = el.getAttribute('stroke') || el.style?.stroke;
    if (stroke && stroke !== 'none' && !stroke.startsWith('url(')) {
      const hex = normalizeColor(stroke);
      if (hex) {
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }
    }

    // Check stop-color for gradients
    const stopColor = el.getAttribute('stop-color');
    if (stopColor) {
      const hex = normalizeColor(stopColor);
      if (hex) {
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }
    }
  });

  // Sort by frequency and categorize
  const sortedColors = Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex, count]) => ({
      hex,
      count,
      category: categorizeColor(hex),
    }));

  return {
    palette: sortedColors,
    dominant: sortedColors[0]?.hex || '#ffffff',
    hasGradients: svg.querySelectorAll('linearGradient, radialGradient').length > 0,
  };
}

/**
 * Normalize color to hex
 */
function normalizeColor(color) {
  if (!color) return null;
  color = color.trim().toLowerCase();

  // Already hex
  if (/^#[0-9a-f]{3,6}$/i.test(color)) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color;
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Named colors (common ones)
  const namedColors = {
    white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', gray: '#808080', grey: '#808080', brown: '#a52a2a',
  };
  return namedColors[color] || null;
}

/**
 * Categorize color by hue/saturation
 */
function categorizeColor(hex) {
  if (!hex) return 'unknown';

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;

  if (l > 0.95) return 'white';
  if (l < 0.05) return 'black';
  if (max - min < 20) return l > 0.5 ? 'light-gray' : 'dark-gray';

  let h;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  h *= 360;

  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 150) return 'green';
  if (h < 210) return 'cyan';
  if (h < 270) return 'blue';
  if (h < 330) return 'purple';
  return 'pink';
}

/**
 * Extract shapes used in SVG
 */
function extractShapes(svg) {
  const shapes = {
    rectangles: svg.querySelectorAll('rect').length,
    circles: svg.querySelectorAll('circle').length,
    ellipses: svg.querySelectorAll('ellipse').length,
    lines: svg.querySelectorAll('line').length,
    paths: svg.querySelectorAll('path').length,
    polygons: svg.querySelectorAll('polygon').length,
    polylines: svg.querySelectorAll('polyline').length,
    groups: svg.querySelectorAll('g').length,
  };

  // Detect rounded corners
  const rects = svg.querySelectorAll('rect[rx], rect[ry]');
  shapes.roundedRectangles = rects.length;

  // Total shape count
  shapes.total = Object.values(shapes).reduce((a, b) => a + b, 0) - shapes.groups;

  return shapes;
}

/**
 * Extract font information
 */
function extractFonts(svg) {
  const fonts = new Set();
  const elements = svg.querySelectorAll('text, tspan, [font-family]');

  elements.forEach((el) => {
    const fontFamily = el.getAttribute('font-family') || el.style?.fontFamily;
    if (fontFamily) {
      // Clean font family name
      const cleaned = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
      if (cleaned) fonts.add(cleaned);
    }
  });

  return Array.from(fonts);
}

/**
 * Extract image references
 */
function extractImages(svg) {
  const images = svg.querySelectorAll('image');
  return {
    count: images.length,
    hasImages: images.length > 0,
  };
}

/**
 * Detect common design patterns
 */
function detectPatterns(svg) {
  const patterns = [];

  // Check for grid layout (multiple equally spaced elements)
  const rects = svg.querySelectorAll('rect');
  if (rects.length >= 4) {
    patterns.push('grid-layout');
  }

  // Check for cards (rounded rectangles with shadows or borders)
  const roundedRects = svg.querySelectorAll('rect[rx], rect[ry]');
  if (roundedRects.length >= 2) {
    patterns.push('card-layout');
  }

  // Check for header/footer pattern
  const textElements = svg.querySelectorAll('text');
  if (textElements.length > 0) {
    const positions = Array.from(textElements).map(el => {
      const y = parseFloat(el.getAttribute('y') || 0);
      return y;
    });
    const minY = Math.min(...positions);
    const maxY = Math.max(...positions);
    const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 1920, 1080];
    const height = viewBox[3];

    if (minY < height * 0.15) patterns.push('has-header');
    if (maxY > height * 0.85) patterns.push('has-footer');
  }

  // Check for icons (small paths/groups)
  const smallGroups = svg.querySelectorAll('g');
  smallGroups.forEach(g => {
    const bbox = g.getBBox?.();
    if (bbox && bbox.width < 100 && bbox.height < 100) {
      if (!patterns.includes('has-icons')) patterns.push('has-icons');
    }
  });

  // Check for decorative elements
  const circles = svg.querySelectorAll('circle');
  const ellipses = svg.querySelectorAll('ellipse');
  if (circles.length > 3 || ellipses.length > 3) {
    patterns.push('decorative-elements');
  }

  return patterns;
}

/**
 * Generate a text summary for AI analysis
 */
function generateSummary(features) {
  const parts = [];

  // Dimensions
  parts.push(`${features.dimensions.orientation} design (${features.dimensions.width}x${features.dimensions.height})`);

  // Text content
  const headlines = features.texts.filter(t => t.type === 'headline' || t.type === 'title');
  if (headlines.length > 0) {
    parts.push(`Headlines: ${headlines.map(t => `"${t.content}"`).join(', ')}`);
  }

  // Other text
  const otherTexts = features.texts
    .filter(t => t.type !== 'headline' && t.type !== 'title')
    .slice(0, 10);
  if (otherTexts.length > 0) {
    parts.push(`Other text: ${otherTexts.map(t => t.content).join(', ')}`);
  }

  // Special content types
  const contentTypes = [...new Set(features.texts.map(t => t.contentType).filter(t => t !== 'general'))];
  if (contentTypes.length > 0) {
    parts.push(`Contains: ${contentTypes.join(', ')}`);
  }

  // Colors
  parts.push(`Dominant color: ${features.colors.dominant} (${features.colors.palette[0]?.category || 'unknown'})`);

  // Patterns
  if (features.patterns.length > 0) {
    parts.push(`Patterns: ${features.patterns.join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Analyze SVG from URL
 * @param {string} url - URL to SVG file
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeSvgFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.statusText}`);
  }
  const svgContent = await response.text();
  return analyzeSvg(svgContent);
}

export default {
  analyzeSvg,
  analyzeSvgFromUrl,
};
