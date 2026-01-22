import { sanitizeHTML } from './sanitize.js';

/**
 * SafeHTML component for rendering HTML content safely.
 * Sanitizes HTML to prevent XSS attacks before rendering.
 *
 * @param {Object} props
 * @param {string} props.html - The HTML string to render
 * @param {string} [props.className] - Optional CSS class name
 * @param {string} [props.as='div'] - The wrapper element type (div, span, etc.)
 * @returns {JSX.Element|null} The sanitized HTML wrapped in the specified element
 */
export function SafeHTML({ html, className, as: Element = 'div' }) {
  if (!html) {
    return null;
  }

  const sanitized = sanitizeHTML(html);

  return (
    <Element
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
