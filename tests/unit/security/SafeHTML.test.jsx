/**
 * SafeHTML Component Tests
 *
 * Tests verifying the SafeHTML React component properly sanitizes HTML
 * and supports all expected props.
 *
 * Part of Phase 2: XSS Prevention verification.
 *
 * @see .planning/phases/02-xss-prevention/02-05-PLAN.md
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeHTML } from '../../../src/security/SafeHTML.jsx';

describe('SafeHTML', () => {
  // ============================================================================
  // BASIC RENDERING TESTS
  // ============================================================================

  describe('renders sanitized content', () => {
    it('renders clean HTML correctly', () => {
      render(<SafeHTML html="<b>bold text</b>" />);
      expect(screen.getByText('bold text')).toBeInTheDocument();
    });

    it('renders multiple formatting tags', () => {
      render(<SafeHTML html="<strong>strong</strong> and <em>emphasis</em>" />);
      expect(screen.getByText(/strong/)).toBeInTheDocument();
      expect(screen.getByText(/emphasis/)).toBeInTheDocument();
    });

    it('renders links with href', () => {
      render(<SafeHTML html='<a href="https://example.com">click here</a>' />);
      const link = screen.getByText('click here');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders lists correctly', () => {
      render(<SafeHTML html="<ul><li>item one</li><li>item two</li></ul>" />);
      expect(screen.getByText('item one')).toBeInTheDocument();
      expect(screen.getByText('item two')).toBeInTheDocument();
    });

    it('renders headings', () => {
      render(<SafeHTML html="<h2>Section Title</h2>" />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Section Title');
    });
  });

  // ============================================================================
  // XSS PREVENTION TESTS
  // ============================================================================

  describe('strips XSS payloads', () => {
    it('removes script tags completely', () => {
      const { container } = render(<SafeHTML html='<b>text</b><script>alert("xss")</script>' />);
      expect(screen.getByText('text')).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
    });

    it('removes event handlers from elements', () => {
      const { container } = render(<SafeHTML html='<img src="test.jpg" onerror="alert(1)" alt="test">' />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).not.toHaveAttribute('onerror');
    });

    it('removes javascript: from href', () => {
      const { container } = render(<SafeHTML html='<a href="javascript:alert(1)">click</a>' />);
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      // DOMPurify removes the dangerous href entirely (returns null)
      const href = link.getAttribute('href');
      expect(href === null || !href.includes('javascript:')).toBe(true);
    });

    it('removes iframe tags', () => {
      const { container } = render(<SafeHTML html='<p>content</p><iframe src="evil.com"></iframe>' />);
      expect(screen.getByText('content')).toBeInTheDocument();
      expect(container.querySelector('iframe')).toBeNull();
    });

    it('removes style tags', () => {
      const { container } = render(<SafeHTML html='<style>body{display:none}</style><p>visible</p>' />);
      expect(screen.getByText('visible')).toBeInTheDocument();
      expect(container.querySelector('style')).toBeNull();
    });

    it('handles nested XSS attempts', () => {
      const { container } = render(
        <SafeHTML html='<div><b><script>alert("xss")</script>safe text</b></div>' />
      );
      expect(screen.getByText('safe text')).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
    });

    it('removes onclick handlers', () => {
      const { container } = render(<SafeHTML html='<b onclick="alert(1)">bold</b>' />);
      const bold = container.querySelector('b');
      expect(bold).toBeInTheDocument();
      expect(bold).not.toHaveAttribute('onclick');
    });

    it('removes onload handlers', () => {
      const { container } = render(<SafeHTML html='<img src="test.jpg" onload="alert(1)" alt="image">' />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).not.toHaveAttribute('onload');
    });
  });

  // ============================================================================
  // CLASSNAME PROP TESTS
  // ============================================================================

  describe('supports className prop', () => {
    it('applies className to wrapper element', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies multiple classes', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" className="class-one class-two" />);
      expect(container.firstChild).toHaveClass('class-one');
      expect(container.firstChild).toHaveClass('class-two');
    });

    it('works without className', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" />);
      expect(container.firstChild).toBeInTheDocument();
      // No className attribute or empty
      expect(container.firstChild.className).toBe('');
    });
  });

  // ============================================================================
  // AS PROP TESTS
  // ============================================================================

  describe('supports as prop for element type', () => {
    it('defaults to div element', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" />);
      expect(container.firstChild.tagName).toBe('DIV');
    });

    it('renders as span when specified', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" as="span" />);
      expect(container.firstChild.tagName).toBe('SPAN');
    });

    it('renders as p when specified', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" as="p" />);
      expect(container.firstChild.tagName).toBe('P');
    });

    it('renders as article when specified', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" as="article" />);
      expect(container.firstChild.tagName).toBe('ARTICLE');
    });

    it('renders as section when specified', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" as="section" />);
      expect(container.firstChild.tagName).toBe('SECTION');
    });

    it('combines as and className props', () => {
      const { container } = render(<SafeHTML html="<b>test</b>" as="span" className="custom" />);
      expect(container.firstChild.tagName).toBe('SPAN');
      expect(container.firstChild).toHaveClass('custom');
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('handles edge cases', () => {
    it('returns null for empty html prop', () => {
      const { container } = render(<SafeHTML html="" />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null for null html prop', () => {
      const { container } = render(<SafeHTML html={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null for undefined html prop', () => {
      const { container } = render(<SafeHTML html={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles whitespace-only html', () => {
      const { container } = render(<SafeHTML html="   " />);
      // Whitespace is valid HTML content
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles plain text without tags', () => {
      render(<SafeHTML html="Just plain text" />);
      expect(screen.getByText('Just plain text')).toBeInTheDocument();
    });

    it('handles deeply nested content', () => {
      render(<SafeHTML html="<p><strong><em><b>deep</b></em></strong></p>" />);
      expect(screen.getByText('deep')).toBeInTheDocument();
    });

    it('handles unicode characters', () => {
      render(<SafeHTML html="<p>Hello World</p>" />);
      expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    });

    it('handles special characters', () => {
      render(<SafeHTML html="<p>&amp; &lt; &gt;</p>" />);
      expect(screen.getByText(/&/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // REAL-WORLD USAGE TESTS
  // ============================================================================

  describe('real-world usage patterns', () => {
    it('renders markdown-converted HTML safely', () => {
      // Simulates content that might come from markdown conversion
      const markdownHtml = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      render(<SafeHTML html={markdownHtml} />);
      expect(screen.getByText(/bold/)).toBeInTheDocument();
      expect(screen.getByText(/italic/)).toBeInTheDocument();
    });

    it('renders user-generated content with XSS stripped', () => {
      // Simulates user-submitted content with XSS attempt
      const userContent = '<p>User message</p><script>document.cookie</script>';
      const { container } = render(<SafeHTML html={userContent} />);
      expect(screen.getByText('User message')).toBeInTheDocument();
      expect(container.querySelector('script')).toBeNull();
    });

    it('renders help article content', () => {
      // Simulates help center article content
      const helpContent = `
        <h2>Getting Started</h2>
        <p>Follow these steps:</p>
        <ol>
          <li><strong>Step 1:</strong> Click the button</li>
          <li><strong>Step 2:</strong> Enter your details</li>
        </ol>
      `;
      render(<SafeHTML html={helpContent} />);
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText(/Step 1/)).toBeInTheDocument();
      expect(screen.getByText(/Step 2/)).toBeInTheDocument();
    });

    it('renders inline in list items with as="span"', () => {
      // Pattern used in HelpCenterPage for list items
      const { container } = render(
        <ul>
          <li><SafeHTML html="<strong>bold</strong> text" as="span" /></li>
        </ul>
      );
      const li = container.querySelector('li');
      expect(li).toBeInTheDocument();
      // The SafeHTML should render as span inside li
      const span = li.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.innerHTML).toContain('<strong>bold</strong>');
    });
  });
});

// ============================================================================
// PHASE 2 SUCCESS CRITERIA VERIFICATION
// ============================================================================

describe('Phase 2 XSS Prevention - SafeHTML Component', () => {
  it('SUCCESS CRITERIA: SafeHTML component blocks script injection', () => {
    const { container } = render(
      <SafeHTML html='<script>alert("xss")</script>' />
    );
    // Script tag should be completely removed
    expect(container.querySelector('script')).toBeNull();
    // Container should be empty (no text content from script)
    expect(container.textContent).toBe('');
  });

  it('SUCCESS CRITERIA: SafeHTML preserves safe formatting', () => {
    render(
      <SafeHTML html='<strong>Bold</strong> and <a href="https://example.com">Link</a>' />
    );
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('Link')).toHaveAttribute('href', 'https://example.com');
  });
});
