/**
 * sanitizeHTML Unit Tests
 *
 * Tests verifying XSS prevention while allowing legitimate formatting.
 * Part of Phase 2: XSS Prevention verification.
 *
 * @see .planning/phases/02-xss-prevention/02-05-PLAN.md
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHTML, SANITIZE_CONFIG } from '../../../src/security/sanitize.js';

describe('sanitizeHTML', () => {
  // ============================================================================
  // XSS VECTOR TESTS - Security Critical
  // ============================================================================

  describe('XSS vectors are blocked', () => {
    it('strips script tags completely', () => {
      const dirty = '<script>alert("xss")</script>';
      const result = sanitizeHTML(dirty);
      expect(result).toBe('');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('strips script tags with attributes', () => {
      const dirty = '<script src="evil.js"></script>';
      expect(sanitizeHTML(dirty)).toBe('');
    });

    it('removes onerror event handler from img tags', () => {
      const dirty = '<img src="x" onerror="alert(\'xss\')">';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
      // Image tag should still exist (just sanitized)
      expect(result).toContain('<img');
    });

    it('removes onclick event handler from divs', () => {
      const dirty = '<div onclick="alert(\'xss\')">content</div>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
      // Content should remain but div may be stripped (not in allowed tags)
      expect(result).toContain('content');
    });

    it('removes javascript: protocol from href', () => {
      const dirty = '<a href="javascript:alert(\'xss\')">click me</a>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
      // Link text should remain
      expect(result).toContain('click me');
    });

    it('strips iframe tags completely', () => {
      const dirty = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHTML(dirty);
      expect(result).toBe('');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
    });

    it('strips style tags completely', () => {
      const dirty = '<style>@import url("evil")</style>';
      const result = sanitizeHTML(dirty);
      expect(result).toBe('');
      expect(result).not.toContain('<style');
      expect(result).not.toContain('@import');
    });

    it('handles nested XSS - keeps allowed tags, strips malicious content', () => {
      const dirty = '<b><script>alert("xss")</script>bold text</b>';
      const result = sanitizeHTML(dirty);
      expect(result).toContain('<b>');
      expect(result).toContain('bold text');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('removes onload event handler', () => {
      const dirty = '<img src="valid.jpg" onload="alert(1)">';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
    });

    it('removes onmouseover event handler', () => {
      const dirty = '<a href="https://example.com" onmouseover="alert(1)">hover</a>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('hover');
    });

    it('removes onfocus event handler', () => {
      const dirty = '<input onfocus="alert(1)" autofocus>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onfocus');
      expect(result).not.toContain('alert');
    });

    it('strips object tags', () => {
      const dirty = '<object data="malicious.swf"></object>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('<object');
    });

    it('strips embed tags', () => {
      const dirty = '<embed src="malicious.swf">';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('<embed');
    });

    it('strips form tags', () => {
      const dirty = '<form action="https://evil.com"><input></form>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('action=');
    });

    it('handles SVG-based XSS vectors', () => {
      const dirty = '<svg onload="alert(1)"><circle></circle></svg>';
      const result = sanitizeHTML(dirty);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
    });

    it('data: URIs in img src are not executable (safe context)', () => {
      // data:text/html in an img src attribute is NOT executable
      // The img will simply fail to load, but no script executes
      // This is different from data: URIs in iframe src or anchor hrefs
      const dirty = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHTML(dirty);
      // DOMPurify keeps img tag - the data URI is in a non-executable context
      expect(result).toContain('<img');
      // The script text is just part of the URL, not an actual script element
      // DOM would never parse and execute this - browser treats it as image data
    });
  });

  // ============================================================================
  // ALLOWED FORMATTING TESTS - Usability Critical
  // ============================================================================

  describe('allowed formatting passes through', () => {
    it('preserves bold tags <b>', () => {
      const html = '<b>bold text</b>';
      expect(sanitizeHTML(html)).toBe('<b>bold text</b>');
    });

    it('preserves italic tags <i>', () => {
      const html = '<i>italic text</i>';
      expect(sanitizeHTML(html)).toBe('<i>italic text</i>');
    });

    it('preserves strong tags', () => {
      const html = '<strong>strong text</strong>';
      expect(sanitizeHTML(html)).toBe('<strong>strong text</strong>');
    });

    it('preserves emphasis tags <em>', () => {
      const html = '<em>emphasized text</em>';
      expect(sanitizeHTML(html)).toBe('<em>emphasized text</em>');
    });

    it('preserves underline tags <u>', () => {
      const html = '<u>underlined text</u>';
      expect(sanitizeHTML(html)).toBe('<u>underlined text</u>');
    });

    it('preserves strikethrough tags <s>', () => {
      const html = '<s>strikethrough text</s>';
      expect(sanitizeHTML(html)).toBe('<s>strikethrough text</s>');
    });

    it('preserves mark tags', () => {
      const html = '<mark>highlighted text</mark>';
      expect(sanitizeHTML(html)).toBe('<mark>highlighted text</mark>');
    });

    it('preserves links with https href', () => {
      const html = '<a href="https://example.com">link text</a>';
      expect(sanitizeHTML(html)).toBe('<a href="https://example.com">link text</a>');
    });

    it('preserves links with target attribute', () => {
      const html = '<a href="https://example.com" target="_blank">link</a>';
      const result = sanitizeHTML(html);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
    });

    it('preserves images with src and alt', () => {
      const html = '<img src="https://example.com/img.png" alt="test image">';
      const result = sanitizeHTML(html);
      expect(result).toContain('src="https://example.com/img.png"');
      expect(result).toContain('alt="test image"');
    });

    it('preserves unordered lists', () => {
      const html = '<ul><li>item one</li><li>item two</li></ul>';
      const result = sanitizeHTML(html);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('item one');
      expect(result).toContain('item two');
    });

    it('preserves ordered lists', () => {
      const html = '<ol><li>first</li><li>second</li></ol>';
      const result = sanitizeHTML(html);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });

    it('preserves h1 through h6 headings', () => {
      const headings = [
        '<h1>Heading 1</h1>',
        '<h2>Heading 2</h2>',
        '<h3>Heading 3</h3>',
        '<h4>Heading 4</h4>',
        '<h5>Heading 5</h5>',
        '<h6>Heading 6</h6>',
      ];
      headings.forEach((heading) => {
        expect(sanitizeHTML(heading)).toBe(heading);
      });
    });

    it('preserves paragraph tags', () => {
      const html = '<p>A paragraph of text.</p>';
      expect(sanitizeHTML(html)).toBe('<p>A paragraph of text.</p>');
    });

    it('preserves br tags', () => {
      const html = 'line one<br>line two';
      expect(sanitizeHTML(html)).toContain('<br>');
    });

    it('preserves hr tags', () => {
      const html = 'above<hr>below';
      expect(sanitizeHTML(html)).toContain('<hr>');
    });

    it('preserves table structure', () => {
      const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
      const result = sanitizeHTML(html);
      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<th>');
      expect(result).toContain('<td>');
    });

    it('preserves nested formatting', () => {
      const html = '<p><strong>Bold and <em>italic</em></strong></p>';
      const result = sanitizeHTML(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('Bold and');
    });
  });

  // ============================================================================
  // STYLE ATTRIBUTE TESTS
  // ============================================================================

  describe('style attribute handling', () => {
    it('allows style attribute on allowed tags', () => {
      const html = '<p style="color: red">styled text</p>';
      const result = sanitizeHTML(html);
      expect(result).toContain('style="color: red"');
      expect(result).toContain('styled text');
    });

    it('allows style attribute on strong tags', () => {
      const html = '<strong style="font-size: 16px">big bold</strong>';
      const result = sanitizeHTML(html);
      expect(result).toContain('style=');
      expect(result).toContain('big bold');
    });

    it('preserves class attribute on allowed tags', () => {
      const html = '<p class="highlight">text</p>';
      const result = sanitizeHTML(html);
      expect(result).toContain('class="highlight"');
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('handles null input gracefully', () => {
      expect(sanitizeHTML(null)).toBe('');
    });

    it('handles undefined input gracefully', () => {
      expect(sanitizeHTML(undefined)).toBe('');
    });

    it('handles plain text without tags', () => {
      const text = 'Just plain text without any HTML';
      expect(sanitizeHTML(text)).toBe(text);
    });

    it('handles malformed HTML without throwing', () => {
      const malformed = '<p>unclosed paragraph<b>nested unclosed';
      expect(() => sanitizeHTML(malformed)).not.toThrow();
    });

    it('handles deeply nested tags', () => {
      const deep = '<p><strong><em><b><i>deep</i></b></em></strong></p>';
      const result = sanitizeHTML(deep);
      expect(result).toContain('deep');
      expect(() => sanitizeHTML(deep)).not.toThrow();
    });

    it('handles unicode characters', () => {
      const unicode = '<p>Hello, world! Hola, mundo!</p>';
      expect(sanitizeHTML(unicode)).toContain('Hello');
      expect(sanitizeHTML(unicode)).toContain('world');
      expect(sanitizeHTML(unicode)).toContain('mundo');
    });

    it('handles HTML entities', () => {
      const entities = '<p>&amp; &lt; &gt; &quot;</p>';
      const result = sanitizeHTML(entities);
      // DOMPurify preserves entities
      expect(result).toContain('&amp;');
    });

    it('handles whitespace-only content', () => {
      const whitespace = '   \n\t   ';
      expect(sanitizeHTML(whitespace)).toBe(whitespace);
    });

    it('handles very long strings', () => {
      const longText = '<p>' + 'a'.repeat(10000) + '</p>';
      expect(() => sanitizeHTML(longText)).not.toThrow();
      expect(sanitizeHTML(longText).length).toBeGreaterThan(10000);
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe('SANITIZE_CONFIG', () => {
    it('exports configuration object', () => {
      expect(SANITIZE_CONFIG).toBeDefined();
      expect(typeof SANITIZE_CONFIG).toBe('object');
    });

    it('has ALLOWED_TAGS array', () => {
      expect(Array.isArray(SANITIZE_CONFIG.ALLOWED_TAGS)).toBe(true);
      expect(SANITIZE_CONFIG.ALLOWED_TAGS.length).toBeGreaterThan(0);
    });

    it('includes expected formatting tags', () => {
      const expectedTags = ['b', 'i', 'strong', 'em', 'a', 'img', 'ul', 'li', 'p', 'h1', 'table'];
      expectedTags.forEach((tag) => {
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain(tag);
      });
    });

    it('does NOT include dangerous tags', () => {
      const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'style'];
      dangerousTags.forEach((tag) => {
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).not.toContain(tag);
      });
    });

    it('has ALLOWED_ATTR array', () => {
      expect(Array.isArray(SANITIZE_CONFIG.ALLOWED_ATTR)).toBe(true);
    });

    it('includes expected attributes', () => {
      const expectedAttrs = ['href', 'src', 'alt', 'style', 'class'];
      expectedAttrs.forEach((attr) => {
        expect(SANITIZE_CONFIG.ALLOWED_ATTR).toContain(attr);
      });
    });

    it('has ALLOW_DATA_ATTR set to false', () => {
      expect(SANITIZE_CONFIG.ALLOW_DATA_ATTR).toBe(false);
    });

    it('has KEEP_CONTENT set to true', () => {
      expect(SANITIZE_CONFIG.KEEP_CONTENT).toBe(true);
    });
  });

  // ============================================================================
  // CUSTOM CONFIG TESTS
  // ============================================================================

  describe('custom configuration', () => {
    it('accepts custom config that overrides defaults', () => {
      const html = '<b>bold</b>';
      // Override to NOT allow bold
      const result = sanitizeHTML(html, { ALLOWED_TAGS: ['p'] });
      // With KEEP_CONTENT: true, content should remain
      expect(result).toContain('bold');
      expect(result).not.toContain('<b>');
    });

    it('merges custom config with defaults', () => {
      const html = '<p style="color: blue">text</p>';
      // Config merge should still work
      const result = sanitizeHTML(html, {});
      expect(result).toContain('style=');
    });
  });
});

// ============================================================================
// SUCCESS CRITERIA VERIFICATION
// ============================================================================

describe('Phase 2 Success Criteria #3', () => {
  /**
   * Success Criteria from ROADMAP.md:
   * "Injecting <script>alert('xss')</script> produces no alert"
   *
   * This test directly verifies that the exact payload specified in the
   * success criteria is properly sanitized.
   */
  it('ROADMAP Success Criteria: Injecting <script>alert("xss")</script> produces no script output', () => {
    const xssPayload = '<script>alert("xss")</script>';
    const result = sanitizeHTML(xssPayload);

    // The script tag and its contents should be completely removed
    expect(result).toBe('');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('xss');
  });

  it('ROADMAP Success Criteria: XSS payload in content preserves content but removes script', () => {
    const contentWithXSS = 'Hello <script>alert("xss")</script> World';
    const result = sanitizeHTML(contentWithXSS);

    // Content should be preserved
    expect(result).toContain('Hello');
    expect(result).toContain('World');

    // Script should be removed
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });
});
