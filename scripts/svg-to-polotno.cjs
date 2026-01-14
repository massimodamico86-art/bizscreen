#!/usr/bin/env node
/**
 * SVG to Polotno Converter (Enhanced)
 *
 * Parses SVG files (like those from Freepik/Adobe Illustrator) and extracts elements
 * into Polotno-compatible JSON with editable text layers.
 *
 * Features:
 * - Parses CSS <style> blocks for class definitions
 * - Extracts fonts, colors, and sizes from CSS classes
 * - Handles transform matrices for positioning
 * - Generates Polotno JSON with editable text
 *
 * Usage: node svg-to-polotno.cjs <input.svg> [output.json]
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Default canvas size for digital signage
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

/**
 * Parse CSS styles from <style> block
 */
function parseCssStyles(styleContent) {
  const styles = {};

  // Match class definitions: .className{...}
  const classRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = classRegex.exec(styleContent)) !== null) {
    const className = match[1];
    const rules = match[2];
    const props = {};

    // Parse individual CSS properties
    rules.split(';').forEach(rule => {
      const [prop, value] = rule.split(':').map(s => s?.trim());
      if (prop && value) {
        // Remove quotes from font-family
        props[prop] = value.replace(/['"]/g, '');
      }
    });

    styles[className] = props;
  }

  return styles;
}

/**
 * Parse transform attribute and return transformation matrix values
 */
function parseTransform(transformStr) {
  if (!transformStr) return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };

  const result = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };

  // Parse translate
  const translateMatch = transformStr.match(/translate\s*\(\s*([^,\s]+)[\s,]*([^)]*)\s*\)/);
  if (translateMatch) {
    result.translateX = parseFloat(translateMatch[1]) || 0;
    result.translateY = parseFloat(translateMatch[2]) || 0;
  }

  // Parse scale
  const scaleMatch = transformStr.match(/scale\s*\(\s*([^,\s]+)[\s,]*([^)]*)\s*\)/);
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1]) || 1;
    result.scaleY = parseFloat(scaleMatch[2]) || result.scaleX;
  }

  // Parse rotate
  const rotateMatch = transformStr.match(/rotate\s*\(\s*([^)]+)\s*\)/);
  if (rotateMatch) {
    result.rotate = parseFloat(rotateMatch[1]) || 0;
  }

  // Parse matrix
  const matrixMatch = transformStr.match(/matrix\s*\(\s*([^)]+)\s*\)/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(/[\s,]+/).map(parseFloat);
    if (values.length >= 6) {
      result.translateX = values[4] || 0;
      result.translateY = values[5] || 0;
      result.scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
      result.scaleY = Math.sqrt(values[2] * values[2] + values[3] * values[3]);
    }
  }

  return result;
}

/**
 * Get computed position by traversing parent transforms
 */
function getComputedPosition(element, baseX = 0, baseY = 0) {
  let x = baseX;
  let y = baseY;
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;

  // Collect all parent transforms
  const transforms = [];
  let current = element;
  while (current && current.tagName) {
    const transform = current.getAttribute('transform');
    if (transform) {
      transforms.unshift(parseTransform(transform));
    }
    current = current.parentElement;
  }

  // Apply transforms in order
  for (const t of transforms) {
    x = x * t.scaleX + t.translateX;
    y = y * t.scaleY + t.translateY;
    scaleX *= t.scaleX;
    scaleY *= t.scaleY;
    rotation += t.rotate;
  }

  return { x, y, scaleX, scaleY, rotation };
}

/**
 * Get styles from element including CSS class resolution
 */
function getStyles(element, cssStyles) {
  const styles = {};

  // Get class-based styles first (handle multiple classes)
  const classAttr = element.getAttribute('class');
  if (classAttr) {
    // Split by space to handle multiple classes like "st12 st13 st14"
    const classes = classAttr.split(/\s+/);
    classes.forEach(className => {
      if (cssStyles[className]) {
        Object.assign(styles, cssStyles[className]);
      }
    });
  }

  // Get inline style (overrides class styles)
  const styleAttr = element.getAttribute('style') || '';
  styleAttr.split(';').forEach(rule => {
    const [prop, value] = rule.split(':').map(s => s?.trim());
    if (prop && value) {
      styles[prop] = value.replace(/['"]/g, '');
    }
  });

  // Get individual attributes (they override style)
  const attrs = ['fill', 'stroke', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'opacity'];
  attrs.forEach(attr => {
    const value = element.getAttribute(attr);
    if (value) styles[attr] = value.replace(/['"]/g, '');
  });

  return styles;
}

/**
 * Convert color to hex
 */
function toHex(color) {
  if (!color || color === 'none') return null;
  if (color.startsWith('#')) return color.toUpperCase();
  if (color.startsWith('rgb')) {
    const match = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
  }
  // Named colors
  const namedColors = {
    'white': '#FFFFFF', 'black': '#000000', 'red': '#FF0000',
    'green': '#00FF00', 'blue': '#0000FF', 'yellow': '#FFFF00',
    'orange': '#FFA500', 'gray': '#808080', 'grey': '#808080',
  };
  return namedColors[color.toLowerCase()] || color;
}

/**
 * Map font family names to standard names
 */
function mapFontFamily(fontFamily) {
  if (!fontFamily) return 'Arial';

  // Map Adobe Illustrator font names to standard names
  const fontMap = {
    'Poppins-SemiBold': 'Poppins',
    'Poppins-Regular': 'Poppins',
    'Poppins-Medium': 'Poppins',
    'Poppins-Light': 'Poppins',
    'Poppins-Bold': 'Poppins',
    'Poppins-ExtraLightItalic': 'Poppins',
    'FrederickatheGreat-Regular': 'Fredericka the Great',
    'Fredericka the Great': 'Fredericka the Great',
  };

  return fontMap[fontFamily] || fontFamily.split('-')[0] || fontFamily;
}

/**
 * Get font weight from font family name
 */
function getFontWeight(fontFamily) {
  if (!fontFamily) return 'normal';

  const lower = fontFamily.toLowerCase();
  if (lower.includes('bold') || lower.includes('semibold')) return 'bold';
  if (lower.includes('medium')) return '500';
  if (lower.includes('light')) return '300';
  return 'normal';
}

/**
 * Extract text elements from SVG
 */
function extractTextElements(svgDoc, viewBox, targetWidth, targetHeight, cssStyles) {
  const textElements = [];
  const texts = svgDoc.querySelectorAll('text');

  // Calculate scale factor from viewBox to target size
  const scaleX = targetWidth / viewBox.width;
  const scaleY = targetHeight / viewBox.height;

  texts.forEach((textEl, index) => {
    const x = parseFloat(textEl.getAttribute('x')) || 0;
    const y = parseFloat(textEl.getAttribute('y')) || 0;
    const styles = getStyles(textEl, cssStyles);
    const position = getComputedPosition(textEl, x, y);

    // Get text content (including tspans)
    let textContent = '';
    const tspans = textEl.querySelectorAll('tspan');
    if (tspans.length > 0) {
      tspans.forEach((tspan, i) => {
        // Check for tspan-specific styles
        const tspanStyles = getStyles(tspan, cssStyles);
        if (!styles['font-family'] && tspanStyles['font-family']) {
          styles['font-family'] = tspanStyles['font-family'];
        }
        if (!styles['fill'] && tspanStyles['fill']) {
          styles['fill'] = tspanStyles['fill'];
        }
        if (!styles['font-size'] && tspanStyles['font-size']) {
          styles['font-size'] = tspanStyles['font-size'];
        }
        textContent += tspan.textContent + (i < tspans.length - 1 ? '\n' : '');
      });
      textContent = textContent.trim();
    } else {
      textContent = textEl.textContent?.trim() || '';
    }

    if (!textContent) return;

    // Parse font size
    let fontSize = parseFloat(styles['font-size']) || 16;
    fontSize = fontSize * position.scaleY * scaleY;

    // Calculate final position
    const finalX = (position.x - viewBox.x) * scaleX;
    const finalY = (position.y - viewBox.y) * scaleY - fontSize; // Adjust for baseline

    // Get font family and weight
    const rawFontFamily = styles['font-family'] || 'Arial';
    const fontFamily = mapFontFamily(rawFontFamily);
    const fontWeight = getFontWeight(rawFontFamily);

    // Get text alignment from text-anchor
    let align = 'left';
    const anchor = styles['text-anchor'];
    if (anchor === 'middle') align = 'center';
    if (anchor === 'end') align = 'right';

    // Get color
    const fill = toHex(styles['fill']) || '#333333';

    textElements.push({
      id: `text-${index}-${Date.now()}`,
      type: 'text',
      x: Math.max(0, finalX),
      y: Math.max(0, finalY),
      width: Math.min(targetWidth - finalX, textContent.length * fontSize * 0.6 + 100),
      height: fontSize * 1.5 * (textContent.split('\n').length || 1),
      text: textContent,
      fontSize: Math.round(fontSize),
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      fill: fill,
      align: align,
      rotation: position.rotation,
      name: textContent.substring(0, 30) + (textContent.length > 30 ? '...' : ''),
    });
  });

  return textElements;
}

/**
 * Extract rect elements from SVG
 */
function extractRectElements(svgDoc, viewBox, targetWidth, targetHeight, cssStyles) {
  const rectElements = [];
  const rects = svgDoc.querySelectorAll('rect');

  const scaleX = targetWidth / viewBox.width;
  const scaleY = targetHeight / viewBox.height;

  rects.forEach((rectEl, index) => {
    const x = parseFloat(rectEl.getAttribute('x')) || 0;
    const y = parseFloat(rectEl.getAttribute('y')) || 0;
    const width = parseFloat(rectEl.getAttribute('width')) || 0;
    const height = parseFloat(rectEl.getAttribute('height')) || 0;
    const rx = parseFloat(rectEl.getAttribute('rx')) || 0;
    const styles = getStyles(rectEl, cssStyles);

    if (width === 0 || height === 0) return;

    const position = getComputedPosition(rectEl, x, y);
    const fill = toHex(styles['fill']);

    // Skip transparent/no-fill rects and pattern fills
    if (!fill || fill === 'none' || fill.startsWith('url(')) return;

    // Skip very large rects (likely backgrounds)
    const scaledWidth = width * position.scaleX * scaleX;
    const scaledHeight = height * position.scaleY * scaleY;
    if (scaledWidth > targetWidth * 0.9 && scaledHeight > targetHeight * 0.9) return;

    const finalX = (position.x - viewBox.x) * scaleX;
    const finalY = (position.y - viewBox.y) * scaleY;

    // Skip elements outside the visible canvas
    if (finalX < -50 || finalY < -50 || finalX > targetWidth + 50 || finalY > targetHeight + 50) return;

    rectElements.push({
      id: `rect-${index}-${Date.now()}`,
      type: 'rect',
      x: finalX,
      y: finalY,
      width: scaledWidth,
      height: scaledHeight,
      fill: fill,
      cornerRadius: rx * Math.min(scaleX, scaleY),
      rotation: position.rotation,
      name: `Shape ${index + 1}`,
    });
  });

  return rectElements;
}

/**
 * Get background color from SVG
 */
function getBackgroundColor(svgDoc, viewBox, cssStyles) {
  // Check for a rect that covers the viewBox (background)
  const rects = svgDoc.querySelectorAll('rect');
  for (const rect of rects) {
    const x = parseFloat(rect.getAttribute('x')) || 0;
    const y = parseFloat(rect.getAttribute('y')) || 0;
    const width = parseFloat(rect.getAttribute('width')) || 0;
    const height = parseFloat(rect.getAttribute('height')) || 0;
    const styles = getStyles(rect, cssStyles);

    // Check if this rect covers most of the viewBox
    if (width >= viewBox.width * 0.9 && height >= viewBox.height * 0.9) {
      const fill = toHex(styles['fill']);
      if (fill && fill !== 'none' && !fill.startsWith('url(')) {
        return fill;
      }
    }
  }

  // Check CSS classes for common background colors
  if (cssStyles.st3 && cssStyles.st3.fill) {
    return toHex(cssStyles.st3.fill);
  }

  // Check SVG style attribute
  const svgEl = svgDoc.querySelector('svg');
  if (svgEl) {
    const styles = getStyles(svgEl, cssStyles);
    const bg = toHex(styles['background']) || toHex(styles['background-color']);
    if (bg) return bg;
  }

  return '#F5EDE3'; // Default cream color for menu templates
}

/**
 * Main conversion function
 */
function convertSvgToPolotno(svgContent, options = {}) {
  const {
    targetWidth = DEFAULT_WIDTH,
    targetHeight = DEFAULT_HEIGHT,
    includeShapes = true,
    backgroundImage = null,
  } = options;

  const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
  const svgDoc = dom.window.document;
  const svgEl = svgDoc.querySelector('svg');

  if (!svgEl) {
    throw new Error('No SVG element found in the file');
  }

  // Parse CSS styles from <style> block
  const styleEl = svgDoc.querySelector('style');
  const cssStyles = styleEl ? parseCssStyles(styleEl.textContent) : {};

  // Parse viewBox
  const viewBoxAttr = svgEl.getAttribute('viewBox');
  let viewBox = { x: 0, y: 0, width: targetWidth, height: targetHeight };

  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(parseFloat);
    if (parts.length >= 4) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  } else {
    // Try width/height attributes
    const width = parseFloat(svgEl.getAttribute('width'));
    const height = parseFloat(svgEl.getAttribute('height'));
    if (width && height) {
      viewBox.width = width;
      viewBox.height = height;
    }
  }

  // Extract elements
  const children = [];

  // Add background image if provided (as first element, locked)
  if (backgroundImage) {
    children.push({
      id: `bg-image-${Date.now()}`,
      type: 'image',
      x: 0,
      y: 0,
      width: targetWidth,
      height: targetHeight,
      src: backgroundImage,
      locked: true,
      name: 'Background',
    });
  }

  // Extract shapes (buttons, badges, etc.)
  if (includeShapes) {
    const rects = extractRectElements(svgDoc, viewBox, targetWidth, targetHeight, cssStyles);
    children.push(...rects);
  }

  // Extract text last (on top)
  const texts = extractTextElements(svgDoc, viewBox, targetWidth, targetHeight, cssStyles);
  children.push(...texts);

  // Get background color
  const backgroundColor = getBackgroundColor(svgDoc, viewBox, cssStyles);

  // Collect unique fonts
  const fonts = [];
  const fontFamilies = new Set();
  texts.forEach(t => {
    if (t.fontFamily && !fontFamilies.has(t.fontFamily)) {
      fontFamilies.add(t.fontFamily);
      // Add Google Fonts URL if it's a common font
      const googleFonts = {
        'Poppins': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf',
        'Roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf',
        'Open Sans': 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf',
        'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf',
        'Fredericka the Great': 'https://fonts.gstatic.com/s/frederickathegreate/v21/9Bt33CxNwt7aIbN5NgRQdCYhGn8BKnQ.ttf',
        'Arial': null,
      };
      fonts.push({
        fontFamily: t.fontFamily,
        url: googleFonts[t.fontFamily] || null,
      });
    }
  });

  // Build Polotno JSON
  const polotnoJson = {
    width: targetWidth,
    height: targetHeight,
    fonts: fonts,
    pages: [{
      id: `page-${Date.now()}`,
      background: backgroundColor,
      children: children,
    }],
  };

  return {
    polotnoJson,
    stats: {
      textElements: texts.length,
      shapeElements: includeShapes ? children.filter(c => c.type === 'rect').length : 0,
      backgroundColor,
      viewBox,
      cssClasses: Object.keys(cssStyles).length,
      fontsFound: [...fontFamilies],
    },
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
SVG to Polotno Converter (Enhanced)

Usage: node svg-to-polotno.cjs <input.svg> [output.json] [options]

Options:
  --width <number>          Target canvas width (default: 1920)
  --height <number>         Target canvas height (default: 1080)
  --no-shapes               Exclude shape elements
  --background-image <url>  Add background image (locked)

Example:
  node svg-to-polotno.cjs menu.svg menu-polotno.json --width 1920 --height 1080
  node svg-to-polotno.cjs menu.svg --background-image /templates/menu-bg.png
`);
    process.exit(0);
  }

  const inputFile = args[0];
  let outputFile = args[1];

  // Parse options
  const options = {
    targetWidth: DEFAULT_WIDTH,
    targetHeight: DEFAULT_HEIGHT,
    includeShapes: true,
    backgroundImage: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--width' && args[i + 1]) {
      options.targetWidth = parseInt(args[i + 1]);
    }
    if (args[i] === '--height' && args[i + 1]) {
      options.targetHeight = parseInt(args[i + 1]);
    }
    if (args[i] === '--no-shapes') {
      options.includeShapes = false;
    }
    if (args[i] === '--background-image' && args[i + 1]) {
      options.backgroundImage = args[i + 1];
    }
  }

  // Default output file
  if (!outputFile || outputFile.startsWith('--')) {
    outputFile = inputFile.replace(/\.svg$/i, '-polotno.json');
  }

  try {
    const svgContent = fs.readFileSync(inputFile, 'utf8');
    const result = convertSvgToPolotno(svgContent, options);

    fs.writeFileSync(outputFile, JSON.stringify(result.polotnoJson, null, 2));

    console.log('\n✅ Conversion complete!');
    console.log(`\nOutput: ${outputFile}`);
    console.log('\nStats:');
    console.log(`  - Text elements: ${result.stats.textElements}`);
    console.log(`  - Shape elements: ${result.stats.shapeElements}`);
    console.log(`  - Background color: ${result.stats.backgroundColor}`);
    console.log(`  - CSS classes parsed: ${result.stats.cssClasses}`);
    console.log(`  - Fonts found: ${result.stats.fontsFound.join(', ') || 'none'}`);
    console.log(`  - Original viewBox: ${result.stats.viewBox.width}x${result.stats.viewBox.height}`);
    console.log(`  - Target size: ${options.targetWidth}x${options.targetHeight}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

module.exports = { convertSvgToPolotno };
