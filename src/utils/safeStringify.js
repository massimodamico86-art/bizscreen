/**
 * Safe JSON Stringify Utility
 *
 * Provides circular-reference-safe JSON serialization for logging.
 * Handles special types like Error objects, DOM nodes, functions, symbols, etc.
 */

/**
 * Safely stringify an object, handling circular references and special types
 *
 * @param {*} obj - The object to stringify
 * @param {Function|null} replacer - Optional custom replacer function
 * @param {number|string} space - Indentation (default: 2)
 * @returns {string} JSON string or error representation
 */
export function safeStringify(obj, replacer = null, space = 2) {
  // Track seen objects to detect circular references
  const seen = new WeakSet();

  /**
   * Replacer function that handles circular references and special types
   */
  function circularReplacer(key, value) {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitive types
    if (typeof value !== 'object') {
      // Functions
      if (typeof value === 'function') {
        return '[Function]';
      }
      // Symbols
      if (typeof value === 'symbol') {
        return '[Symbol]';
      }
      // BigInt
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }
      return value;
    }

    // Check for circular reference
    if (seen.has(value)) {
      return '[Circular]';
    }

    // Add to seen set
    seen.add(value);

    // Handle Error objects specially
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack ? value.stack.split('\n').slice(0, 5).join('\n') : undefined,
      };
    }

    // Handle DOM nodes
    if (typeof window !== 'undefined' && value instanceof Node) {
      if (value.nodeType === Node.ELEMENT_NODE) {
        return `[Element: ${value.tagName}]`;
      }
      if (value.nodeType === Node.TEXT_NODE) {
        return `[TextNode: ${value.textContent?.substring(0, 50)}]`;
      }
      return '[DOMNode]';
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle RegExp
    if (value instanceof RegExp) {
      return value.toString();
    }

    // Apply custom replacer if provided
    if (typeof replacer === 'function') {
      return replacer(key, value);
    }

    return value;
  }

  // Attempt to stringify with error handling
  try {
    return JSON.stringify(obj, circularReplacer, space);
  } catch (error) {
    // Fallback for any unexpected errors
    return JSON.stringify({
      error: 'Failed to stringify',
      type: typeof obj,
      errorMessage: error.message,
    });
  }
}

export default safeStringify;
