/**
 * Auto-Tagging Service
 *
 * Uses AI (Claude API) to automatically generate tags, categories,
 * and descriptions for SVG templates based on their content analysis.
 */

import { analyzeSvg, analyzeSvgFromUrl } from './svgAnalyzerService';

// Predefined categories for digital signage templates
const TEMPLATE_CATEGORIES = [
  'restaurant',
  'retail',
  'hospitality',
  'healthcare',
  'education',
  'corporate',
  'real-estate',
  'fitness',
  'entertainment',
  'transportation',
  'finance',
  'automotive',
  'salon-spa',
  'events',
  'social-media',
  'general',
];

// Common tags for digital signage
const COMMON_TAGS = [
  // Content types
  'menu', 'pricing', 'promotion', 'sale', 'discount', 'announcement',
  'schedule', 'directory', 'wayfinding', 'welcome', 'hours', 'contact',
  // Industries
  'food', 'drinks', 'coffee', 'pizza', 'burger', 'sushi', 'bakery',
  'clothing', 'electronics', 'grocery', 'pharmacy', 'hotel', 'gym',
  // Visual styles
  'modern', 'classic', 'minimal', 'bold', 'elegant', 'playful', 'professional',
  // Layouts
  'single-item', 'multi-item', 'grid', 'list', 'slideshow', 'fullscreen',
  // Features
  'animated', 'dynamic', 'static', 'portrait', 'landscape', 'square',
];

/**
 * Generate tags using AI based on SVG analysis
 * @param {Object} analysis - Output from analyzeSvg()
 * @returns {Promise<Object>} Generated tags and metadata
 */
export async function generateTagsWithAI(analysis) {
  // Build a prompt for the AI
  const prompt = buildTaggingPrompt(analysis);

  try {
    // Call Claude API
    const response = await fetch('/api/ai/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, analysis }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return parseAIResponse(result);
  } catch (error) {
    console.warn('AI tagging failed, using fallback:', error.message);
    // Fallback to rule-based tagging
    return generateTagsWithRules(analysis);
  }
}

/**
 * Build prompt for AI tagging
 */
function buildTaggingPrompt(analysis) {
  return `Analyze this SVG template for digital signage and generate appropriate tags.

Template Analysis:
${analysis.summary}

Text Content Found:
${analysis.texts.map(t => `- "${t.content}" (${t.type}, ${t.contentType})`).join('\n')}

Colors: ${analysis.colors.palette.map(c => `${c.hex} (${c.category})`).join(', ')}
Dominant Color: ${analysis.colors.dominant}

Shapes: ${Object.entries(analysis.shapes).filter(([k, v]) => v > 0 && k !== 'total').map(([k, v]) => `${k}: ${v}`).join(', ')}

Patterns Detected: ${analysis.patterns.join(', ') || 'none'}

Dimensions: ${analysis.dimensions.width}x${analysis.dimensions.height} (${analysis.dimensions.orientation})

Based on this analysis, provide:
1. A single category from: ${TEMPLATE_CATEGORIES.join(', ')}
2. Up to 10 relevant tags from common digital signage terms
3. A brief description (1-2 sentences)

Respond in JSON format:
{
  "category": "category-name",
  "tags": ["tag1", "tag2", ...],
  "description": "Brief description",
  "confidence": 0.0-1.0
}`;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(result) {
  // If the API returns structured data directly
  if (result.category && result.tags) {
    return {
      category: normalizeCategory(result.category),
      tags: normalizeTags(result.tags),
      description: result.description || '',
      confidence: result.confidence || 0.8,
      source: 'ai',
    };
  }

  // Try to parse JSON from text response
  try {
    const text = result.text || result.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: normalizeCategory(parsed.category),
        tags: normalizeTags(parsed.tags),
        description: parsed.description || '',
        confidence: parsed.confidence || 0.7,
        source: 'ai',
      };
    }
  } catch (e) {
    console.warn('Failed to parse AI response:', e);
  }

  // Return empty result if parsing fails
  return {
    category: 'general',
    tags: [],
    description: '',
    confidence: 0,
    source: 'ai-failed',
  };
}

/**
 * Normalize category to match predefined list
 */
function normalizeCategory(category) {
  if (!category) return 'general';
  const normalized = category.toLowerCase().trim().replace(/\s+/g, '-');
  return TEMPLATE_CATEGORIES.includes(normalized) ? normalized : 'general';
}

/**
 * Normalize and filter tags
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(tag => tag.toLowerCase().trim().replace(/\s+/g, '-'))
    .filter(tag => tag.length > 1 && tag.length < 30)
    .slice(0, 15);
}

/**
 * Rule-based tag generation (fallback when AI is unavailable)
 * @param {Object} analysis - Output from analyzeSvg()
 * @returns {Object} Generated tags and metadata
 */
export function generateTagsWithRules(analysis) {
  const tags = new Set();
  let category = 'general';
  let description = '';
  let confidence = 0.5;

  // Analyze text content for category hints
  const allText = analysis.texts.map(t => t.content.toLowerCase()).join(' ');
  const headlines = analysis.texts.filter(t => t.type === 'headline' || t.type === 'title');

  // Restaurant/Food detection
  if (
    /menu|appetizer|entree|dessert|chef|special|dish|cuisine|order|dine|food|drink|beverage/i.test(allText) ||
    analysis.texts.some(t => t.contentType === 'price' || t.contentType === 'menu_section')
  ) {
    category = 'restaurant';
    tags.add('menu');
    tags.add('food');
    confidence = 0.7;

    // Specific food types
    if (/pizza/i.test(allText)) tags.add('pizza');
    if (/burger|sandwich/i.test(allText)) tags.add('burger');
    if (/coffee|cafe|espresso|latte/i.test(allText)) { tags.add('coffee'); tags.add('cafe'); }
    if (/sushi|japanese|ramen/i.test(allText)) tags.add('sushi');
    if (/bakery|pastry|bread|cake/i.test(allText)) tags.add('bakery');
    if (/bar|cocktail|wine|beer/i.test(allText)) tags.add('drinks');
  }

  // Retail detection
  if (/sale|discount|%\s*off|price|shop|store|buy|deal|offer|clearance/i.test(allText)) {
    if (category === 'general') category = 'retail';
    tags.add('promotion');
    tags.add('sale');
    confidence = Math.max(confidence, 0.65);
  }

  // Real estate detection
  if (/property|home|house|apartment|rent|lease|sqft|bedroom|bath|listing/i.test(allText)) {
    category = 'real-estate';
    tags.add('listing');
    tags.add('property');
    confidence = 0.7;
  }

  // Healthcare detection
  if (/doctor|clinic|patient|health|medical|appointment|hospital|pharmacy/i.test(allText)) {
    category = 'healthcare';
    tags.add('medical');
    confidence = 0.7;
  }

  // Fitness detection
  if (/gym|fitness|workout|exercise|class|trainer|membership/i.test(allText)) {
    category = 'fitness';
    tags.add('gym');
    tags.add('fitness');
    confidence = 0.7;
  }

  // Hospitality detection
  if (/hotel|room|suite|check-in|guest|reservation|booking|amenities/i.test(allText)) {
    category = 'hospitality';
    tags.add('hotel');
    confidence = 0.7;
  }

  // Events detection
  if (/event|conference|meeting|seminar|workshop|schedule|agenda|speaker/i.test(allText)) {
    category = 'events';
    tags.add('schedule');
    tags.add('event');
    confidence = 0.65;
  }

  // Social media detection
  if (/follow|@|#|instagram|facebook|twitter|tiktok|social/i.test(allText)) {
    if (category === 'general') category = 'social-media';
    tags.add('social');
    confidence = Math.max(confidence, 0.6);
  }

  // Content type tags from text analysis
  analysis.texts.forEach(t => {
    switch (t.contentType) {
      case 'price':
        tags.add('pricing');
        break;
      case 'time':
        tags.add('hours');
        break;
      case 'phone':
        tags.add('contact');
        break;
      case 'email':
        tags.add('contact');
        break;
      case 'address':
        tags.add('location');
        break;
      case 'discount':
        tags.add('promotion');
        tags.add('sale');
        break;
      case 'cta':
        tags.add('call-to-action');
        break;
    }
  });

  // Visual style tags
  if (analysis.colors.hasGradients) {
    tags.add('gradient');
    tags.add('modern');
  }

  // Color-based style hints
  const dominantCategory = analysis.colors.palette[0]?.category;
  if (dominantCategory === 'black' || dominantCategory === 'dark-gray') {
    tags.add('dark');
    tags.add('elegant');
  } else if (dominantCategory === 'white' || dominantCategory === 'light-gray') {
    tags.add('minimal');
    tags.add('clean');
  }

  // Layout patterns
  if (analysis.patterns.includes('grid-layout')) {
    tags.add('grid');
    tags.add('multi-item');
  }
  if (analysis.patterns.includes('card-layout')) {
    tags.add('cards');
  }

  // Orientation
  tags.add(analysis.dimensions.orientation);

  // Generate description
  if (headlines.length > 0) {
    description = `Template featuring "${headlines[0].content}"`;
    if (category !== 'general') {
      description += ` for ${category} displays`;
    }
  } else {
    description = `${analysis.dimensions.orientation.charAt(0).toUpperCase() + analysis.dimensions.orientation.slice(1)} template`;
    if (category !== 'general') {
      description += ` for ${category}`;
    }
  }

  return {
    category,
    tags: Array.from(tags).slice(0, 15),
    description,
    confidence,
    source: 'rules',
  };
}

/**
 * Auto-tag an SVG template
 * @param {string} svgContent - Raw SVG string
 * @param {Object} options - Options
 * @param {boolean} options.useAI - Whether to use AI tagging (default: true)
 * @param {boolean} options.fallbackToRules - Use rules if AI fails (default: true)
 * @returns {Promise<Object>} Tag results
 */
export async function autoTagSvg(svgContent, options = {}) {
  const { useAI = true, fallbackToRules = true } = options;

  // First, analyze the SVG
  const analysis = analyzeSvg(svgContent);

  // Generate tags
  let result;
  if (useAI) {
    result = await generateTagsWithAI(analysis);
    // If AI failed and fallback is enabled, use rules
    if (result.source === 'ai-failed' && fallbackToRules) {
      result = generateTagsWithRules(analysis);
    }
  } else {
    result = generateTagsWithRules(analysis);
  }

  return {
    ...result,
    analysis, // Include raw analysis for debugging
  };
}

/**
 * Auto-tag an SVG template from URL
 * @param {string} url - URL to SVG file
 * @param {Object} options - Options
 * @returns {Promise<Object>} Tag results
 */
export async function autoTagSvgFromUrl(url, options = {}) {
  const analysis = await analyzeSvgFromUrl(url);
  const { useAI = true, fallbackToRules = true } = options;

  let result;
  if (useAI) {
    result = await generateTagsWithAI(analysis);
    if (result.source === 'ai-failed' && fallbackToRules) {
      result = generateTagsWithRules(analysis);
    }
  } else {
    result = generateTagsWithRules(analysis);
  }

  return {
    ...result,
    analysis,
  };
}

/**
 * Batch auto-tag multiple SVG templates
 * @param {Array} templates - Array of {id, svgContent} or {id, url}
 * @param {Object} options - Options
 * @param {Function} onProgress - Progress callback (index, total, result)
 * @returns {Promise<Array>} Array of tag results with template IDs
 */
export async function batchAutoTag(templates, options = {}, onProgress) {
  const results = [];
  const { concurrency = 3 } = options;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < templates.length; i += concurrency) {
    const batch = templates.slice(i, i + concurrency);
    const batchPromises = batch.map(async (template, batchIndex) => {
      try {
        let result;
        if (template.svgContent) {
          result = await autoTagSvg(template.svgContent, options);
        } else if (template.url) {
          result = await autoTagSvgFromUrl(template.url, options);
        } else {
          throw new Error('Template must have svgContent or url');
        }

        const tagResult = {
          id: template.id,
          name: template.name,
          success: true,
          ...result,
        };

        if (onProgress) {
          onProgress(i + batchIndex + 1, templates.length, tagResult);
        }

        return tagResult;
      } catch (error) {
        const errorResult = {
          id: template.id,
          name: template.name,
          success: false,
          error: error.message,
        };

        if (onProgress) {
          onProgress(i + batchIndex + 1, templates.length, errorResult);
        }

        return errorResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to be nice to the API
    if (i + concurrency < templates.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

export default {
  autoTagSvg,
  autoTagSvgFromUrl,
  batchAutoTag,
  generateTagsWithRules,
  generateTagsWithAI,
  TEMPLATE_CATEGORIES,
  COMMON_TAGS,
};
