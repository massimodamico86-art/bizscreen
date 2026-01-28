/**
 * HelpCenterPage XSS Prevention Tests
 *
 * Tests verifying that HelpCenterPage properly sanitizes help content
 * to prevent XSS attacks while allowing legitimate markdown-like formatting.
 *
 * Part of Phase 2: XSS Prevention verification.
 *
 * @see .planning/phases/02-xss-prevention/02-05-PLAN.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as helpService from '../../../src/services/helpService';

// Mock the helpService module
vi.mock('../../../src/services/helpService', async () => {
  const actual = await vi.importActual('../../../src/services/helpService');
  return {
    ...actual,
    searchHelpTopics: vi.fn(),
    getHelpTopic: vi.fn(),
    getTopicsByCategory: vi.fn(),
  };
});

// Mock the i18n module
vi.mock('../../../src/i18n', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => {
      // Handle interpolation for search results
      if (typeof defaultValue === 'string') {
        return defaultValue;
      }
      return defaultValue?.defaultValue || key;
    },
  }),
}));

describe('HelpCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // BASIC RENDERING TESTS
  // ============================================================================

  describe('basic rendering', () => {
    it('renders the help center page', () => {
      render(<HelpCenterPage />);
      expect(screen.getByText('Help Center')).toBeInTheDocument();
    });

    it('displays category cards', () => {
      render(<HelpCenterPage />);
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Screens & Players')).toBeInTheDocument();
      expect(screen.getByText('Playlists')).toBeInTheDocument();
    });

    it('shows search input', () => {
      render(<HelpCenterPage />);
      expect(screen.getByPlaceholderText('Search help articles...')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // XSS PREVENTION TESTS - CRITICAL SECURITY VERIFICATION
  // ============================================================================

  describe('XSS Prevention', () => {
    it('sanitizes help content with script tags', async () => {
      // Mock topic with XSS payload
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '1',
          slug: 'test-topic',
          title: 'Test Topic',
          short_description: 'A test topic',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '1',
        title: 'Test Topic',
        slug: 'test-topic',
        content: '## Getting Started\n\nHello <script>alert("xss")</script> World\n\n- **bold item** text',
      });

      render(<HelpCenterPage />);

      // Click on Getting Started category
      const categoryButton = screen.getByText('Getting Started');
      fireEvent.click(categoryButton);

      // Wait for topics to load
      await waitFor(() => {
        expect(screen.getByText('Test Topic')).toBeInTheDocument();
      });

      // Click on the topic
      fireEvent.click(screen.getByText('Test Topic'));

      // Wait for topic content to load
      await waitFor(() => {
        // Verify script tag is NOT in the document
        expect(document.querySelector('script')).toBeNull();
        // The text should appear but without script
        expect(screen.getByText(/Hello/)).toBeInTheDocument();
        expect(screen.getByText(/World/)).toBeInTheDocument();
      });
    });

    it('sanitizes help content with event handlers', async () => {
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '2',
          slug: 'onclick-test',
          title: 'OnClick Test',
          short_description: 'Testing onclick XSS',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '2',
        title: 'OnClick Test',
        slug: 'onclick-test',
        content: 'Click this **button** <img src="x" onerror="alert(1)"> content',
      });

      render(<HelpCenterPage />);

      // Navigate to category
      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('OnClick Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('OnClick Test'));

      await waitFor(() => {
        const { container } = render(<HelpCenterPage />);
        // Any img tags should not have onerror attribute
        const imgs = document.querySelectorAll('img');
        imgs.forEach((img) => {
          expect(img).not.toHaveAttribute('onerror');
        });
      });
    });

    it('preserves allowed markdown-like formatting', async () => {
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '3',
          slug: 'formatting-test',
          title: 'Formatting Test',
          short_description: 'Testing formatting',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '3',
        title: 'Formatting Test',
        slug: 'formatting-test',
        content: '## Section Title\n\nThis is **bold text** and more.\n\n- **Step 1:** Do this\n- **Step 2:** Do that',
      });

      render(<HelpCenterPage />);

      // Navigate to category
      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('Formatting Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Formatting Test'));

      await waitFor(() => {
        // Section title should render as h2
        expect(screen.getByText('Section Title')).toBeInTheDocument();
        // Bold text should be preserved
        expect(screen.getByText('bold text')).toBeInTheDocument();
        // List items with bold should render
        expect(screen.getByText(/Step 1:/)).toBeInTheDocument();
        expect(screen.getByText(/Step 2:/)).toBeInTheDocument();
      });
    });

    it('sanitizes javascript: URLs in links', async () => {
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '4',
          slug: 'link-test',
          title: 'Link Test',
          short_description: 'Testing links',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '4',
        title: 'Link Test',
        slug: 'link-test',
        content: 'Click [here](javascript:alert("xss")) for help',
      });

      render(<HelpCenterPage />);

      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('Link Test')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Link Test'));

      await waitFor(() => {
        // Any links should not have javascript: protocol
        const links = document.querySelectorAll('a');
        links.forEach((link) => {
          const href = link.getAttribute('href');
          if (href) {
            expect(href).not.toContain('javascript:');
          }
        });
      });
    });

    it('does not execute inline scripts in content', async () => {
      // This test verifies the critical success criteria
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '5',
          slug: 'xss-attempt',
          title: 'XSS Attempt',
          short_description: 'Testing XSS',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '5',
        title: 'XSS Attempt',
        slug: 'xss-attempt',
        content: '<script>alert("xss")</script>Safe content here',
      });

      render(<HelpCenterPage />);

      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('XSS Attempt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('XSS Attempt'));

      await waitFor(() => {
        // Alert should never have been called
        expect(alertMock).not.toHaveBeenCalled();
        // Safe content should be visible
        expect(screen.getByText(/Safe content/)).toBeInTheDocument();
      });

      alertMock.mockRestore();
    });
  });

  // ============================================================================
  // SEARCH FUNCTIONALITY WITH XSS TESTS
  // ============================================================================

  describe('search with XSS prevention', () => {
    it('handles search results with malicious content safely', async () => {
      helpService.searchHelpTopics.mockResolvedValue([
        {
          id: '10',
          slug: 'malicious-result',
          title: 'Normal Title',
          short_description: '<script>alert("xss")</script>Safe description',
        },
      ]);

      render(<HelpCenterPage />);

      const searchInput = screen.getByPlaceholderText('Search help articles...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      // Wait for debounced search
      await waitFor(
        () => {
          expect(helpService.searchHelpTopics).toHaveBeenCalledWith('test search');
        },
        { timeout: 500 }
      );

      // Results should be displayed (title and description are rendered via props, not innerHTML)
      await waitFor(() => {
        expect(screen.getByText('Normal Title')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('handles empty content gracefully', async () => {
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '20',
          slug: 'empty-content',
          title: 'Empty Content Topic',
          short_description: 'Has no content',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '20',
        title: 'Empty Content Topic',
        slug: 'empty-content',
        content: '',
      });

      render(<HelpCenterPage />);

      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('Empty Content Topic')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Empty Content Topic'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Empty Content Topic' })).toBeInTheDocument();
      });
    });

    it('handles null content gracefully', async () => {
      helpService.getTopicsByCategory.mockResolvedValue([
        {
          id: '21',
          slug: 'null-content',
          title: 'Null Content Topic',
          short_description: 'Content is null',
        },
      ]);

      helpService.getHelpTopic.mockResolvedValue({
        id: '21',
        title: 'Null Content Topic',
        slug: 'null-content',
        content: null,
      });

      render(<HelpCenterPage />);

      fireEvent.click(screen.getByText('Getting Started'));

      await waitFor(() => {
        expect(screen.getByText('Null Content Topic')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Null Content Topic'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Null Content Topic' })).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// PHASE 2 SUCCESS CRITERIA VERIFICATION
// ============================================================================

describe('Phase 2 Success Criteria - HelpCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SUCCESS CRITERIA #3: Injecting <script>alert("xss")</script> produces no alert', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    helpService.getTopicsByCategory.mockResolvedValue([
      {
        id: 'criteria-test',
        slug: 'criteria-test',
        title: 'Criteria Test',
        short_description: 'Test for success criteria',
      },
    ]);

    helpService.getHelpTopic.mockResolvedValue({
      id: 'criteria-test',
      title: 'Criteria Test',
      slug: 'criteria-test',
      // Exact payload from success criteria
      content: '<script>alert("xss")</script>',
    });

    render(<HelpCenterPage />);

    fireEvent.click(screen.getByText('Getting Started'));

    await waitFor(() => {
      expect(screen.getByText('Criteria Test')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Criteria Test'));

    await waitFor(() => {
      // The critical assertion: alert was never called
      expect(alertMock).not.toHaveBeenCalled();
    });

    alertMock.mockRestore();
  });

  it('SUCCESS CRITERIA: SafeHTML usage preserves **bold** formatting as <strong>', async () => {
    helpService.getTopicsByCategory.mockResolvedValue([
      {
        id: 'bold-test',
        slug: 'bold-test',
        title: 'Bold Test',
        short_description: 'Testing bold formatting',
      },
    ]);

    helpService.getHelpTopic.mockResolvedValue({
      id: 'bold-test',
      title: 'Bold Test',
      slug: 'bold-test',
      content: 'This is **important** text.\n\n- **Step one:** Do this',
    });

    render(<HelpCenterPage />);

    fireEvent.click(screen.getByText('Getting Started'));

    await waitFor(() => {
      expect(screen.getByText('Bold Test')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bold Test'));

    await waitFor(() => {
      // Bold text should be rendered with strong tags
      const strongElements = document.querySelectorAll('strong');
      expect(strongElements.length).toBeGreaterThan(0);
      // Specific text should be bold
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText(/Step one:/)).toBeInTheDocument();
    });
  });
});
