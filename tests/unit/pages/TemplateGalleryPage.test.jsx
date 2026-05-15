/**
 * TemplateGalleryPage Unit Tests — RED scaffolding (Phase 171 Plan 01)
 *
 * This file intentionally begins in a FAILING state. The component under test
 * (`src/pages/TemplateGalleryPage.jsx`) is not yet implemented — Wave 1
 * (Plan 02) will create it and turn these tests GREEN one at a time.
 *
 * Describe/it titles MUST match the `-t` grep patterns documented in
 * 171-RESEARCH.md lines 793–809 so the per-requirement test-command map keeps
 * working. All user-facing strings MUST come from the 171-UI-SPEC Copywriting
 * Contract (lines 252–276) — never paraphrase.
 *
 * Suite coverage (matches the `<describe>` block assertions in 171-VALIDATION):
 *   - Loading state (TGAL-02)
 *   - Error state (TGAL-02)
 *   - Empty states — zero-content vs no-results (TDSC-05, TGAL-02)
 *   - Filter pipeline (TDSC-02)
 *   - Clear all (TDSC-03)
 *   - Sort order (TGAL-03)
 *   - Badges — New / Popular (TGAL-04)
 *
 * Security note (T-171-V02, T-171-I01): `window.localStorage.clear()` in
 * beforeEach prevents cross-test leakage of per-user namespaced keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import TemplateGalleryPage from '../../../src/pages/TemplateGalleryPage';
import { mockGalleryRows, createMockGalleryRow } from '../../fixtures/galleryTemplates';

const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => children,
}));

const mockFetchGalleryTemplates = vi.fn();
vi.mock('../../../src/services/templateGalleryService', () => ({
  fetchGalleryTemplates: (opts) => mockFetchGalleryTemplates(opts),
}));

// Gap 3 fix (179-VERIFICATION.md): bypass the JSDOM virtualizer so the page-level
// unit tests can find rendered card titles + "New"/"Popular" badges. The real
// VirtualizedTemplateGrid renders 0 items in JSDOM because the scroll container
// has no measurable height; we mock it with a flat list that mirrors the real
// component's relevant DOM contract (h3 title per card + New/Popular badges in
// the same condition as the real component).
vi.mock('../../../src/components/template-gallery/VirtualizedTemplateGrid', () => ({
  default: function MockVirtualizedTemplateGrid({
    templates,
    cols,
    popularityThreshold,
    isNew,
    onApply,
    onToggleFavorite,
    applyingId,
  }) {
    // Silence unused-prop lint without touching the contract surface
    void cols;
    void onApply;
    void onToggleFavorite;
    void applyingId;
    return (
      <div role="grid" aria-rowcount={Math.ceil((templates?.length ?? 0) / Math.max(cols ?? 1, 1))}>
        {(templates ?? []).map((t) => (
          <div key={t.id} role="row" data-testid="mock-card">
            <h3>{t.name}</h3>
            {typeof isNew === 'function' && isNew(t.created_at) && (
              <span>New</span>
            )}
            {(t.use_count ?? 0) >= (popularityThreshold ?? 0) && (popularityThreshold ?? 0) > 0 && (
              <span>Popular</span>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

const renderPage = (props = {}) =>
  render(
    <BrowserRouter>
      <TemplateGalleryPage showToast={vi.fn()} onNavigate={vi.fn()} {...props} />
    </BrowserRouter>
  );

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: mockUser });
  mockFetchGalleryTemplates.mockReset();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('TemplateGalleryPage — loading state (TGAL-02)', () => {
  it('shows skeleton while fetching', async () => {
    // Arrange: fetch is pending — never resolves within this test
    let resolveFetch;
    mockFetchGalleryTemplates.mockReturnValue(
      new Promise((r) => {
        resolveFetch = r;
      })
    );
    renderPage();
    // Page title must render immediately (not blocked by fetch)
    expect(screen.getByRole('heading', { name: 'Templates', level: 1 })).toBeInTheDocument();
    // TODO Wave 1: assert 12 skeletons via testid or role
    // Keep the pending promise referenced so no unhandled rejection surfaces
    expect(typeof resolveFetch).toBe('function');
  });
});

describe('TemplateGalleryPage — error state (TGAL-02)', () => {
  it('shows error state on fetch failure', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: [], error: new Error('boom') });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Couldn't load templates")).toBeInTheDocument()
    );
    expect(
      screen.getByText(/Something went wrong\. Check your connection and try again\./)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('TemplateGalleryPage — empty states (TDSC-05, TGAL-02)', () => {
  it('shows zero-content empty state when DB is empty', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: [], error: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('No templates yet')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Templates will appear here once content is added to the library.')
    ).toBeInTheDocument();
  });

  it('shows no-results empty state when filters match nothing', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    window.history.replaceState({}, '', '/?q=zzzzzz-no-match-query');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('No templates match your search')).toBeInTheDocument()
    );
    expect(
      screen.getByText('Try different keywords, fewer filters, or browse the full library.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse all templates' })).toBeInTheDocument();
  });
});

describe('TemplateGalleryPage — filters narrow results (TDSC-02)', () => {
  it('filters narrow results', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    window.history.replaceState({}, '', '/?category=Menu');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Restaurant Menu')).toBeInTheDocument()
    );
    expect(screen.queryByText('Summer Sale Banner')).not.toBeInTheDocument();
  });

  it('active filters show as chips', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    window.history.replaceState({}, '', '/?category=Menu&orientation=landscape');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Category: Menu/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Orientation: landscape/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Remove Category filter/i })
    ).toBeInTheDocument();
  });
});

describe('TemplateGalleryPage — clear all (TDSC-03)', () => {
  it('clear all resets', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    window.history.replaceState({}, '', '/?category=Menu&orientation=landscape');
    renderPage();
    const clearBtn = await screen.findByRole('button', { name: 'Clear all' });
    fireEvent.click(clearBtn);
    await waitFor(() => expect(window.location.search).toBe(''));
  });
});

describe('TemplateGalleryPage — sort order (TGAL-03)', () => {
  it('sort changes order', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    window.history.replaceState({}, '', '/?sort=alpha');
    renderPage();
    await waitFor(() => {
      // Filter out sr-only chrome headings (Plan 180-12 added <h3 className="sr-only">All templates</h3>
      // inside the scroll container for axe-core heading-order compliance; it is not a card title).
      const names = screen.getAllByRole('heading', { level: 3 })
        .filter((n) => !n.classList.contains('sr-only'))
        .map((n) => n.textContent);
      // Alphabetical — first card heading should be the lexicographically-first template
      expect(names[0]).toMatch(/Birthday Bash/);
    });
  });
});

describe('TemplateGalleryPage — badges (TGAL-04)', () => {
  it('shows New badge on recent', async () => {
    mockFetchGalleryTemplates.mockResolvedValue({ data: mockGalleryRows(), error: null });
    renderPage();
    await waitFor(() => expect(screen.getAllByText('New').length).toBeGreaterThan(0));
    // Popular badge exists for top-20% use_count rows (r7 use_count=60, r10 use_count=100)
    expect(screen.getAllByText('Popular').length).toBeGreaterThan(0);
    // Silence linter — reference `within` and `createMockGalleryRow` imports that
    // Wave 1 tests will exercise directly.
    expect(typeof within).toBe('function');
    expect(typeof createMockGalleryRow).toBe('function');
  });
});
