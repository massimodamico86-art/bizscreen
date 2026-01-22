import DOMPurify from 'isomorphic-dompurify';
import { logSanitizationEvent } from '../services/securityService.js';

/**
 * Default sanitization configuration for DOMPurify.
 * Allows rich text formatting while blocking XSS vectors.
 */
export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'u', 's', 'em', 'strong', 'mark',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class'],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true
};

// Track if logging has been initialized
let loggingInitialized = false;
let getCurrentUserFn = null;

/**
 * Initialize sanitization logging with DOMPurify hooks.
 *
 * This sets up a hook that logs when DOMPurify removes potentially
 * malicious content. Logs summary data only (element types/counts),
 * NOT the actual malicious content.
 *
 * @param {Function} getCurrentUser - Function that returns current user { id, email }
 */
export function initSanitizationLogging(getCurrentUser) {
  if (loggingInitialized) {
    console.warn('Sanitization logging already initialized');
    return;
  }

  getCurrentUserFn = getCurrentUser;

  // Add hook that runs after sanitization completes
  DOMPurify.addHook('afterSanitizeElements', (currentNode, data, config) => {
    // Check if anything was removed during this sanitization
    if (DOMPurify.removed && DOMPurify.removed.length > 0) {
      // Create summary of removed elements (NOT the actual content)
      const summary = DOMPurify.removed.reduce((acc, item) => {
        // Categorize removed items
        if (item.element?.tagName === 'SCRIPT') {
          acc.scripts = (acc.scripts || 0) + 1;
        } else if (item.element?.tagName === 'IFRAME') {
          acc.iframes = (acc.iframes || 0) + 1;
        } else if (item.element?.tagName === 'OBJECT') {
          acc.objects = (acc.objects || 0) + 1;
        } else if (item.element?.tagName === 'EMBED') {
          acc.embeds = (acc.embeds || 0) + 1;
        } else if (item.attribute?.name?.toLowerCase().startsWith('on')) {
          // Event handlers like onclick, onerror, onload, etc.
          acc.handlers = (acc.handlers || 0) + 1;
        } else if (item.attribute?.name?.toLowerCase() === 'javascript:') {
          acc.javascriptUrls = (acc.javascriptUrls || 0) + 1;
        } else if (item.element) {
          acc.otherElements = (acc.otherElements || 0) + 1;
        } else if (item.attribute) {
          acc.otherAttributes = (acc.otherAttributes || 0) + 1;
        } else {
          acc.other = (acc.other || 0) + 1;
        }
        return acc;
      }, {});

      // Only log if there's meaningful removed content
      const totalRemoved = Object.values(summary).reduce((a, b) => a + b, 0);
      if (totalRemoved > 0) {
        // Get current user (if available)
        const user = getCurrentUserFn?.();

        // Log the sanitization event asynchronously (don't await)
        logSanitizationEvent({
          userId: user?.id || null,
          removedSummary: summary,
          context: config?.CONTEXT || 'unknown',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  loggingInitialized = true;
}

/**
 * Sanitize HTML string to prevent XSS attacks.
 *
 * @param {string} html - The HTML string to sanitize
 * @param {Object} customConfig - Optional custom DOMPurify configuration to merge with defaults
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(html, customConfig = {}) {
  if (!html) {
    return '';
  }

  const config = { ...SANITIZE_CONFIG, ...customConfig };
  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize HTML with context for logging.
 *
 * Use this when you want to track where sanitization occurred.
 *
 * @param {string} html - The HTML string to sanitize
 * @param {string} context - Where sanitization is occurring (e.g., 'playlist-description')
 * @param {Object} customConfig - Optional custom DOMPurify configuration
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTMLWithContext(html, context, customConfig = {}) {
  if (!html) {
    return '';
  }

  const config = { ...SANITIZE_CONFIG, ...customConfig, CONTEXT: context };
  return DOMPurify.sanitize(html, config);
}

/**
 * Check if sanitization logging is initialized
 * @returns {boolean}
 */
export function isLoggingInitialized() {
  return loggingInitialized;
}
