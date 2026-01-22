import DOMPurify from 'isomorphic-dompurify';

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
