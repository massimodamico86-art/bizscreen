/**
 * AI Designer Service
 *
 * Client-side service for the AI Designer feature. Calls the ai-designer
 * Supabase Edge Function to generate and refine layout elements from
 * text prompts. Manages conversation state and validates responses.
 *
 * @module services/aiDesignerService
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('AiDesignerService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid element types matching the layout editor types.js */
const VALID_ELEMENT_TYPES = ['text', 'image', 'shape', 'widget'];

/** Maximum conversation exchanges to keep (to avoid exceeding token limits) */
const MAX_CONVERSATION_EXCHANGES = 10;

/**
 * Example prompts for the UI to help users get started
 */
export const EXAMPLE_PROMPTS = [
  'Restaurant menu board with daily specials',
  'Gym class schedule with motivational quotes',
  'Retail store welcome screen with promotions',
  'Hotel lobby information display',
  'Coffee shop menu with seasonal drinks',
  'Corporate lobby visitor welcome screen',
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Clamp a numeric value to the 0-1 range
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value
 */
function clamp01(value) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Validate and clean layout elements returned from the AI
 *
 * - Ensures each element has required fields (id, type, position with x/y/width/height)
 * - Clamps position values to 0-1 range
 * - Filters out elements with invalid types
 *
 * @param {Array} elements - Raw elements from AI response
 * @returns {Array} Cleaned and validated elements
 */
export function validateLayoutElements(elements) {
  if (!Array.isArray(elements)) {
    logger.warn('validateLayoutElements received non-array input', { type: typeof elements });
    return [];
  }

  const cleaned = [];

  for (const element of elements) {
    // Must have an id
    if (!element || !element.id || typeof element.id !== 'string') {
      logger.warn('Skipping element without valid id', { element });
      continue;
    }

    // Must have a valid type
    if (!VALID_ELEMENT_TYPES.includes(element.type)) {
      logger.warn('Skipping element with invalid type', { id: element.id, type: element.type });
      continue;
    }

    // Must have position object
    if (!element.position || typeof element.position !== 'object') {
      logger.warn('Skipping element without position', { id: element.id });
      continue;
    }

    const { x, y, width, height } = element.position;

    // All position values must be present
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      logger.warn('Skipping element with incomplete position', { id: element.id, position: element.position });
      continue;
    }

    // Clamp position values to 0-1
    const clampedPosition = {
      x: clamp01(x),
      y: clamp01(y),
      width: clamp01(width),
      height: clamp01(height),
    };

    // Ensure element doesn't overflow canvas
    if (clampedPosition.x + clampedPosition.width > 1) {
      clampedPosition.width = Math.max(0.01, 1 - clampedPosition.x);
    }
    if (clampedPosition.y + clampedPosition.height > 1) {
      clampedPosition.height = Math.max(0.01, 1 - clampedPosition.y);
    }

    cleaned.push({
      ...element,
      position: clampedPosition,
      layer: typeof element.layer === 'number' ? element.layer : 1,
      locked: false,
    });
  }

  if (cleaned.length < elements.length) {
    logger.warn('Some elements were filtered during validation', {
      original: elements.length,
      valid: cleaned.length,
    });
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Conversation Management
// ---------------------------------------------------------------------------

/**
 * Build a conversation history array for the API call.
 * Manages truncation if conversation gets too long (keeps last N exchanges).
 *
 * @param {Array<{role: string, content: string}>} history - Full conversation history
 * @returns {Array<{role: string, content: string}>} Truncated conversation
 */
export function buildConversation(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  // Filter to valid entries
  const valid = history.filter(
    (entry) => entry && (entry.role === 'user' || entry.role === 'assistant') && entry.content,
  );

  // Each exchange = 1 user + 1 assistant message = 2 entries
  const maxEntries = MAX_CONVERSATION_EXCHANGES * 2;

  if (valid.length <= maxEntries) {
    return valid;
  }

  // Keep the most recent exchanges
  const truncated = valid.slice(-maxEntries);

  logger.info('Conversation history truncated', {
    original: valid.length,
    kept: truncated.length,
    maxExchanges: MAX_CONVERSATION_EXCHANGES,
  });

  return truncated;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Generate a new layout from a text prompt
 *
 * @param {Object} params
 * @param {string} params.prompt - Text description of the desired layout
 * @param {string} [params.orientation='16:9'] - Aspect ratio
 * @param {Object} [params.brandContext] - Brand colors, fonts, logo
 * @param {string} [params.imageBase64] - Base64-encoded reference image
 * @returns {Promise<{elements: Array, background: Object, name: string}>}
 */
export async function generateLayout({ prompt, orientation, brandContext, imageBase64 }) {
  logger.info('Generating layout', { prompt: prompt?.substring(0, 100), orientation });

  try {
    const { data, error } = await supabase.functions.invoke('ai-designer', {
      body: {
        prompt,
        orientation: orientation || '16:9',
        brandContext,
        imageBase64,
      },
    });

    if (error) {
      logger.error('Edge function invocation error', { error: error.message });
      throw new Error(error.message || 'Failed to generate layout');
    }

    if (data?.error) {
      logger.error('AI Designer returned error', { error: data.error });
      throw new Error(data.error);
    }

    // Validate the returned elements
    const elements = validateLayoutElements(data?.elements || []);
    const background = data?.background || { type: 'solid', color: '#1a1a2e' };
    const name = data?.name || 'AI Generated Layout';

    if (elements.length === 0) {
      logger.warn('AI generated layout with no valid elements');
    }

    logger.info('Layout generated successfully', {
      elementCount: elements.length,
      name,
    });

    return { elements, background, name };
  } catch (err) {
    logger.error('generateLayout failed', { error: err.message });
    throw new Error(`Failed to generate layout: ${err.message}`);
  }
}

/**
 * Refine an existing layout using conversation history
 *
 * @param {Object} params
 * @param {string} params.prompt - Refinement instruction
 * @param {Array<{role: string, content: string}>} params.messages - Conversation history
 * @param {string} [params.orientation='16:9'] - Aspect ratio
 * @param {Object} [params.brandContext] - Brand colors, fonts, logo
 * @returns {Promise<{elements: Array, background: Object, name: string}>}
 */
export async function refineLayout({ prompt, messages, orientation, brandContext }) {
  logger.info('Refining layout', { prompt: prompt?.substring(0, 100), messageCount: messages?.length });

  try {
    // Truncate conversation if needed
    const conversation = buildConversation(messages || []);

    const { data, error } = await supabase.functions.invoke('ai-designer', {
      body: {
        prompt,
        messages: conversation,
        orientation: orientation || '16:9',
        brandContext,
      },
    });

    if (error) {
      logger.error('Edge function invocation error during refinement', { error: error.message });
      throw new Error(error.message || 'Failed to refine layout');
    }

    if (data?.error) {
      logger.error('AI Designer returned error during refinement', { error: data.error });
      throw new Error(data.error);
    }

    // Validate the returned elements
    const elements = validateLayoutElements(data?.elements || []);
    const background = data?.background || { type: 'solid', color: '#1a1a2e' };
    const name = data?.name || 'AI Refined Layout';

    if (elements.length === 0) {
      logger.warn('AI refined layout has no valid elements');
    }

    logger.info('Layout refined successfully', {
      elementCount: elements.length,
      name,
    });

    return { elements, background, name };
  } catch (err) {
    logger.error('refineLayout failed', { error: err.message });
    throw new Error(`Failed to refine layout: ${err.message}`);
  }
}
