/**
 * TemplateGalleryPage - Phase 171 (v20.0 Templates Reimagined)
 *
 * Single-file assembly of existing design-system primitives + fuse.js +
 * `useSearchParams` + localStorage-based Recently Used. Replaces the legacy
 * SVG template gallery page that was deleted in the same plan.
 *
 * Requirements covered (10): TGAL-01..05 + TDSC-01..05.
 *
 * Data contract: consumes raw snake_case rows from
 * `templateGalleryService.fetchGalleryTemplates()` (Phase 170 VIEW) — do NOT
 * re-shape into camelCase.
 *
 * Anti-patterns (enforced — see RESEARCH.md lines 374–397):
 *   - No server-side search via `fetchGalleryTemplates({ search })` — client
 *     fuse.js only; catalog fits in-memory at <500 rows.
 *   - No writes to browser Storage for template handoff (Pitfall 4) — Phase
 *     172 will wire the apply flow via URL params instead.
 *   - No hard-coded category / tag lists — all derived from `allTemplates`.
 *   - TemplateCard must NOT receive a truthy `featured` prop (Pitfall 7) —
 *     would re-render the legacy amber "Featured" badge.
 *   - No custom useDebounce hook — inline setTimeout is sufficient.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Monitor, Smartphone, X } from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  SearchBar,
  ToggleChips,
  Select,
  TemplateCardGrid,
  TemplateCardSkeleton,
  EmptyState,
  SearchIllustration,
  TemplatesIllustration,
  Button,
} from '../design-system';
import { fetchGalleryTemplates, toggleFavorite } from '../services/templateGalleryService';
import { useAuth } from '../contexts/AuthContext';
import { applyTemplate, editorRouteFor } from '../services/templateApplyService';
import { applyTemplateToActiveSlide } from '../services/marketplaceService';
import StarterPacksStrip from '../components/template-gallery/StarterPacksStrip';
import PackPreviewModal from '../components/template-gallery/PackPreviewModal';
import VirtualizedTemplateGrid from '../components/template-gallery/VirtualizedTemplateGrid';
import { useContainerColumns } from '../hooks/useContainerColumns';
import { useGalleryTour } from '../hooks/useGalleryTour';

// ---------------------------------------------------------------------------
// Module-scope constants (Pattern G + H)
// ---------------------------------------------------------------------------

/**
 * Recency window for the "New" badge. Configurable via module-scope constant
 * per 171-RESEARCH Q2 RESOLVED. Admin-UI exposure is explicitly deferred —
 * not in Phase 171 scope.
 */
const NEW_BADGE_WINDOW_DAYS = 30;

/** Debounce window for search input → URL param write. */
const SEARCH_DEBOUNCE_MS = 150;

/** Namespaced localStorage key so admin impersonation cannot leak per-user data. */
const RECENT_KEY = (uid) => `bizscreen:recentTemplates:${uid ?? 'anon'}`;

/** Number of skeletons rendered during loading state (2 full rows @ 4 columns). */
const LOADING_SKELETON_COUNT = 12;

/**
 * Safely read the Recently Used template usage map from localStorage.
 * Returns `{}` on any parse/read error so callers can sort without guards.
 */
function readRecentlyUsed(userId) {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * True if `createdAt` (ISO string) is within the last NEW_BADGE_WINDOW_DAYS.
 * Null/missing timestamps are NOT flagged as new.
 */
function isNew(createdAt) {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs < NEW_BADGE_WINDOW_DAYS * 86_400_000;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplateGalleryPage({ showToast, onNavigate }) {
  const { user } = useAuth();

  // Fetch state
  const [allTemplates, setAllTemplates] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Tracks the in-flight template apply (id of the card being applied) so we
  // can show a spinner on that card and ignore concurrent clicks.
  const [applyingId, setApplyingId] = useState(null);

  // Phase 173 TPCK-02: pack preview modal state — opens when a PackCard is clicked.
  const [packModalState, setPackModalState] = useState({
    open: false,
    packs: [],
    initialIndex: 0,
  });

  // Phase 173: Adapter bridging PackPreviewModal's object-form toast contract
  // ({variant, heading, action}) to App.jsx's 2-arg contract (message, type).
  // Plan 07 summary explicitly carves this adapter as Plan 08's responsibility.
  // The "View scenes" action from D-14 is surfaced via a follow-up toast when
  // the user clicks it (opt-in navigation; no auto-navigate).
  const showToastAdapter = useCallback(
    (payload) => {
      if (!showToast) return;
      // Support raw strings for the 2-arg shape as a fallback.
      if (typeof payload === 'string') {
        showToast(payload);
        return;
      }
      if (!payload || typeof payload !== 'object') return;
      const { variant, heading, message, action } = payload;
      const text = heading || message || '';
      const type = variant === 'error' ? 'error' : variant || 'success';
      showToast(text, type);
      // D-14: "View scenes" is opt-in. The PackPreviewModal's success path passes
      // action.onClick which calls onNavigate?.('scenes'). We invoke it ONLY if the
      // caller explicitly requested auto-invocation (payload.autoInvokeAction===true);
      // otherwise the navigation remains user-initiated from the real toast action
      // rendered at the App-level. Current App toast does not render action buttons,
      // so consumers that want an action today must either (a) inline-navigate or
      // (b) wait for a toast-action upgrade. Navigation MUST stay opt-in — do NOT
      // auto-call action.onClick here.
      void action;
    },
    [showToast],
  );


  // URL-backed filter state (Pattern D)
  const [searchParams, setSearchParams] = useSearchParams();

  // Local mirror of the search input — the URL param is debounced, so the
  // `<input>` must be driven by a local state for a responsive feel.
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const debounceTimerRef = useRef(null);

  // D-01 (179-CONTEXT.md): ResizeObserver-derived cols for VirtualizedTemplateGrid.
  // The hook reads scrollContainerRef.current width and maps it to 1/2/3/4
  // matching Tailwind sm/md/lg breakpoints (640/768/1024).
  const scrollContainerRef = useRef(null);
  const cols = useContainerColumns(scrollContainerRef);

  // Derived filter snapshot read from URL. Recomputed every render so URL
  // edits (back/forward button, deep link) stay authoritative.
  const filters = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    tags: searchParams.getAll('tags'),
    orientation: searchParams.get('orientation') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
    favorites: searchParams.get('favorites') === '1',  // Phase 173 TFAV-02
  };

  // Editor-return mode reads from URL. SceneEditorPage writes
  // ?editorReturn=1&returnSceneId=<id>&slideId=<id> before navigating here.
  // When set we restrict candidates to SVG (polotno design_json can't be
  // applied to an existing slide) and the apply path swaps the slide in place
  // rather than cloning into a new scene.
  const isEditorReturn = searchParams.get('editorReturn') === '1';
  const returnSceneId  = searchParams.get('returnSceneId') || null;
  const returnSlideId  = searchParams.get('slideId') || null;

  useGalleryTour({ isFetching });

  const hasActiveFilters = !!(
    filters.q ||
    filters.category ||
    filters.tags.length ||
    filters.orientation
  );

  // -------------------------------------------------------------------------
  // URL writers (Pattern D — `{ replace: true }` to avoid back-button spam)
  // -------------------------------------------------------------------------

  const updateFilter = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (v) next.append(key, v);
          });
        } else if (value) {
          next.set(key, value);
        }
        return next;
      },
      { replace: true }
    );
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Apply a template directly on card click — no preview modal step.
  // Routes through applyTemplate (clone-to-new-scene) or, when isEditorReturn,
  // applyTemplateToActiveSlide (swap-in-place) and navigates to the editor.
  // Concurrent clicks are ignored while an apply is in flight.
  const handleSelectTemplate = useCallback(
    async (template) => {
      if (applyingId) return;
      setApplyingId(template.id);
      try {
        if (isEditorReturn) {
          if (!returnSceneId || !returnSlideId) {
            throw new Error('editor-return requires returnSceneId and slideId');
          }
          await applyTemplateToActiveSlide(
            returnSceneId,
            returnSlideId,
            template.id,
            template.editor_type,
          );
          onNavigate?.(`scene-editor-${returnSceneId}`);
        } else {
          const sceneId = await applyTemplate(template);
          onNavigate?.(editorRouteFor(template, sceneId));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TemplateGalleryPage] apply template failed:', err);
        showToast?.("Couldn't apply template. Please try again.", 'error');
        setApplyingId(null);
      }
    },
    [applyingId, isEditorReturn, returnSceneId, returnSlideId, onNavigate, showToast],
  );

  // Phase 173 TFAV-01 — optimistic favorite toggle.
  // Flip local is_favorited synchronously, then await server write; on failure
  // revert AND surface an error toast (UI-SPEC §Color: red error toast).
  const handleToggleFavorite = useCallback(
    async (template, nextValue) => {
      // Optimistic flip
      setAllTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id && t.editor_type === template.editor_type
            ? { ...t, is_favorited: nextValue }
            : t,
        ),
      );
      try {
        await toggleFavorite({
          templateId: template.id,
          editorType: template.editor_type,
          nextValue,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TemplateGalleryPage] toggleFavorite failed:', err);
        // Revert
        setAllTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id && t.editor_type === template.editor_type
              ? { ...t, is_favorited: !nextValue }
              : t,
          ),
        );
        // Surface red toast via adapter (object-form → 2-arg).
        showToastAdapter?.({ variant: 'error', message: 'Failed to update favorite' });
      }
    },
    [showToastAdapter],
  );

  // -------------------------------------------------------------------------
  // Debounced search wiring (UI-SPEC 150ms)
  // -------------------------------------------------------------------------

  const onSearchChange = (v) => {
    setSearchInput(v);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => updateFilter('q', v), SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Keep the input in sync if the URL param is cleared externally (e.g. back
  // button, Clear all button in another active-filter chip). We only copy
  // DOWN when the URL truly diverges from the input — never up.
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    if (urlQ === '' && searchInput !== '') {
      setSearchInput('');
    }
    // Intentionally omit searchInput from deps so typing doesn't re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // Data fetch (`{ limit: 500 }` is the documented cap; catalog <500 rows)
  // -------------------------------------------------------------------------

  const refetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    const { data, error } = await fetchGalleryTemplates({ limit: 500 });
    if (error) {
      setFetchError(error);
    } else {
      setAllTemplates(data ?? []);
    }
    setIsFetching(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Derived data (Pattern E, F, H)
  // -------------------------------------------------------------------------

  const fuse = useMemo(
    () =>
      new Fuse(allTemplates, {
        keys: [
          { name: 'name', weight: 2 },
          { name: 'tags', weight: 1.5 },
          { name: 'description', weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [allTemplates]
  );

  const categoryOptions = useMemo(
    () => [...new Set(allTemplates.map((t) => t.category).filter(Boolean))].sort(),
    [allTemplates]
  );

  const tagOptions = useMemo(
    () => [...new Set(allTemplates.flatMap((t) => t.tags ?? []).filter(Boolean))].sort(),
    [allTemplates]
  );

  /**
   * Top-20% popularity threshold. Returns Infinity if no template has any
   * use_count — ensures "Popular" is never rendered on a zero-use catalog
   * (avoids every card showing the badge). Threshold>0 guard is redundant
   * with the Infinity sentinel but kept for clarity at the render site.
   */
  const popularityThreshold = useMemo(() => {
    const counts = allTemplates
      .map((t) => t.use_count ?? 0)
      .filter((n) => n > 0)
      .sort((a, b) => b - a);
    if (counts.length === 0) return Infinity;
    const idx = Math.max(0, Math.floor(counts.length * 0.2));
    return counts[idx] ?? counts[counts.length - 1];
  }, [allTemplates]);

  /**
   * Filter+sort pipeline. Branch order matters: search first (narrows the
   * candidate set), then exact-match filters, then sort — matches Pattern E.
   *
   * Phase 174 D-02: when isEditorReturn is true we restrict the candidate set
   * to editor_type === 'svg' BEFORE the existing filter chain. SceneEditorPage
   * cannot render polotno design_json (Phase 172 D-16 pre-existing gap), so
   * applying a polotno template to an existing slide would silently break the
   * editor. The DB RPC (Plan 02) also rejects non-svg editor_type as a
   * defense-in-depth gate; this UI filter just prevents the user from ever
   * being shown a template they cannot apply.
   */
  const displayedTemplates = useMemo(() => {
    let pool = allTemplates;
    if (isEditorReturn) {
      // D-02: editor-return only supports SVG templates.
      pool = pool.filter((t) => t.editor_type === 'svg');
    }

    let rows =
      filters.q.length >= 2 ? fuse.search(filters.q).map((r) => r.item) : pool;

    // When fuse runs against the full corpus its results may include polotno
    // rows; re-apply the svg-only constraint after the fuse search to keep the
    // editor-return guarantee end-to-end. (No-op when isEditorReturn is false.)
    if (isEditorReturn) {
      rows = rows.filter((t) => t.editor_type === 'svg');
    }

    if (filters.category) {
      rows = rows.filter((t) => t.category === filters.category);
    }
    if (filters.tags.length) {
      rows = rows.filter(
        (t) => Array.isArray(t.tags) && t.tags.some((tag) => filters.tags.includes(tag))
      );
    }
    if (filters.orientation) {
      rows = rows.filter((t) => t.orientation === filters.orientation);
    }
    // Phase 173 TFAV-02 — favorites-only filter
    if (filters.favorites) {
      rows = rows.filter((t) => t.is_favorited === true);
    }

    rows = [...rows]; // clone before in-place sort

    if (filters.sort === 'popular') {
      rows.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
    } else if (filters.sort === 'alpha') {
      rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    } else if (filters.sort === 'recent') {
      const usage = readRecentlyUsed(user?.id);
      rows.sort((a, b) => {
        const at = usage[a.id] ?? 0;
        const bt = usage[b.id] ?? 0;
        return bt - at || new Date(b.created_at) - new Date(a.created_at);
      });
    } else {
      // Default: 'newest'
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return rows;
    // `filters.tags.join(',')` used so dep array reacts to tag list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allTemplates,
    fuse,
    filters.q,
    filters.category,
    filters.tags.join(','),
    filters.orientation,
    filters.sort,
    filters.favorites,
    isEditorReturn,
    user?.id,
  ]);

  // -------------------------------------------------------------------------
  // Orientation ToggleChips options (static — 3 values per UI-SPEC)
  // -------------------------------------------------------------------------

  const orientationOptions = [
    { id: 'all', label: 'All' },
    { id: 'landscape', label: 'Landscape', icon: Monitor },
    { id: 'portrait', label: 'Portrait', icon: Smartphone },
  ];
  const orientationSelected = filters.orientation || 'all';

  // -------------------------------------------------------------------------
  // Filter bar (shared across content + no-results branches)
  // -------------------------------------------------------------------------

  const filterBar = (
    // Phase 174 D-18 — data-tour="filter-bar" anchors the driver.js gallery
    // tour's first stop (Plan 09). The filter cluster is the natural anchor
    // because it spans the full sticky filter row including search, category,
    // tags, orientation, sort, and favorites.
    <div
      data-tour="filter-bar"
      className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-4 flex items-center gap-3 flex-wrap"
    >
      <div className="flex-1 min-w-[220px]">
        <SearchBar
          value={searchInput}
          onChange={onSearchChange}
          placeholder="Search templates..."
          size="md"
          aria-label="Search templates"
          // Phase 174 D-18 — data-tour="search-input" anchors the tour's
          // second stop. SearchBar spreads {...props} onto its root <div>,
          // so the attribute reaches the DOM without a wrapper.
          data-tour="search-input"
        />
      </div>
      <Select
        value={filters.category}
        onChange={(e) => updateFilter('category', e.target.value)}
        aria-label="Filter by category"
        placeholder=""
      >
        <option value="">All Categories</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select
        value={filters.tags[0] ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          // Multi-value URL wire format preserved for Phase 175 combobox — in
          // Phase 171 we set a single value via the repeated-param writer.
          updateFilter('tags', v ? [v] : []);
        }}
        aria-label="Filter by tag"
        placeholder=""
      >
        <option value="">All Tags</option>
        {tagOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <ToggleChips
        variant="primary"
        options={orientationOptions}
        selected={orientationSelected}
        onChange={(id) => updateFilter('orientation', id === 'all' ? '' : id)}
      />
      <Select
        value={filters.sort}
        onChange={(e) => updateFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}
        aria-label="Sort templates"
        placeholder=""
      >
        <option value="newest">Newest</option>
        <option value="popular">Most Popular</option>
        <option value="alpha">Alphabetical</option>
        <option value="recent">Recently Used</option>
      </Select>
      {/* Phase 173 TFAV-02 — Favorites filter chip (URL param favorites=1) */}
      <button
        type="button"
        role="checkbox"
        aria-checked={filters.favorites}
        aria-label="Filter by favorites"
        onClick={() => updateFilter('favorites', filters.favorites ? '' : '1')}
        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
          filters.favorites
            ? 'bg-brand-50 text-brand-500 border-2 border-brand-500'
            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
        }`}
      >
        Favorites
      </button>
    </div>
  );

  // -------------------------------------------------------------------------
  // Active-filter chip row (Pattern K — rendered when hasActiveFilters)
  // -------------------------------------------------------------------------

  const activeFiltersRow = hasActiveFilters ? (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {filters.category && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          Category: {filters.category}
          <button
            type="button"
            aria-label="Remove Category filter"
            onClick={() => updateFilter('category', '')}
            className="ml-1 text-gray-400 hover:text-gray-700"
          >
            <X size={12} />
          </button>
        </span>
      )}
      {filters.tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
        >
          Tag: {tag}
          <button
            type="button"
            aria-label={`Remove Tag ${tag} filter`}
            onClick={() => updateFilter('tags', filters.tags.filter((t) => t !== tag))}
            className="ml-1 text-gray-400 hover:text-gray-700"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {filters.orientation && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          Orientation: {filters.orientation}
          <button
            type="button"
            aria-label="Remove Orientation filter"
            onClick={() => updateFilter('orientation', '')}
            className="ml-1 text-gray-400 hover:text-gray-700"
          >
            <X size={12} />
          </button>
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
        Clear all
      </Button>
    </div>
  ) : null;

  // -------------------------------------------------------------------------
  // Render branches (Pattern I + D-03/D-04 — all branches live INSIDE the
  // scroll container so the sticky FilterBar zone stays anchored across state
  // transitions. Precedence preserved: isFetching → fetchError →
  // allTemplates===0 → favorites&&empty → empty → content.)
  // -------------------------------------------------------------------------

  const pageDescription = isFetching
    ? undefined
    : `${displayedTemplates.length} templates available`;

  return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" description={pageDescription} />
      <PageContent>
        <div className="flex flex-col h-full">
          {/* D-03: sticky FilterBar zone — stays anchored above the scrolling
              grid. The inner filterBar wrapper already has sticky top-0; this
              outer wrapper provides a consistent paint surface and anchors
              activeFiltersRow next to it. */}
          <div className="sticky top-0 z-10 bg-white">
            {filterBar}
            {activeFiltersRow}
          </div>

          {/* D-03: internal flex-1 scroll container — owns the virtualizer.
              D-04: all 5 render branches (loading / error / zero-content /
              favorites-empty / no-results / content) live INSIDE this
              container so the FilterBar stays anchored across state
              transitions. */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            {/* Phase 180 Plan 180-12 (SC-5_v21.1) — sr-only heading chain.
                axe-core's heading-order rule walks the full document tree
                (the .include('[role="grid"]') scope in the axe spec restricts
                violation TARGETS, not the heading-order analysis itself), so
                the page <h1>"Templates" (PageHeader) followed by card <h4>
                titles (TemplateCard) skips h2 and h3 in the empty-
                StarterPacksStrip code path (no packs → strip collapses → no
                <h2> "Starter Packs" + no PackCard <h3>). These two sr-only
                headings ALWAYS render (independent of strip state), giving a
                continuous h1→h2→h3→h4 chain. The headings are visually
                hidden but semantically present (Tailwind sr-only). This is
                Option (a) from 180-VERIFICATION.md open_gaps[0] remediation. */}
            <h2 className="sr-only">Template gallery</h2>
            <h3 className="sr-only">All templates</h3>
            {/* Phase 173 TPCK-01 — Pack strip; gated on !filters.q ONLY
                (RESEARCH Pitfall 5; D-11). Filter chips do NOT hide the
                strip — only text search does, because text search implies
                "find a specific template". Phase 174 D-04 — additionally
                hidden when isEditorReturn: packs apply N templates and
                editor-return is a single-slide swap, so packs are out of
                scope in that mode. CONTEXT Integration Points: strip stays
                ABOVE the virtualized region inside the scroll container. */}
            {!isFetching && !fetchError && !filters.q && !isEditorReturn && (
              <StarterPacksStrip
                onSelect={(packId, packs, index) =>
                  setPackModalState({ open: true, packs, initialIndex: index })
                }
              />
            )}

            {isFetching ? (
              <TemplateCardGrid columns={4}>
                {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </TemplateCardGrid>
            ) : fetchError ? (
              <EmptyState
                icon={<TemplatesIllustration />}
                title="Couldn't load templates"
                description="Something went wrong. Check your connection and try again."
                action={
                  <Button variant="primary" onClick={refetch}>
                    Try again
                  </Button>
                }
                size="lg"
              />
            ) : allTemplates.length === 0 ? (
              <EmptyState
                icon={<TemplatesIllustration />}
                title="No templates yet"
                description="Templates will appear here once content is added to the library."
                size="lg"
              />
            ) : filters.favorites && displayedTemplates.length === 0 ? (
              <EmptyState
                icon={null}
                title="No favorites yet"
                description="Tap the heart on any template to save it here."
                action={
                  <Button variant="secondary" onClick={() => updateFilter('favorites', '')}>
                    Clear filter
                  </Button>
                }
                size="lg"
              />
            ) : displayedTemplates.length === 0 ? (
              <EmptyState
                icon={<SearchIllustration />}
                title="No templates match your search"
                description="Try different keywords, fewer filters, or browse the full library."
                action={
                  <Button variant="secondary" onClick={clearAllFilters}>
                    Browse all templates
                  </Button>
                }
                size="lg"
              />
            ) : (
              <VirtualizedTemplateGrid
                templates={displayedTemplates}
                cols={cols}
                scrollElement={scrollContainerRef.current}
                onApply={handleSelectTemplate}
                onToggleFavorite={handleToggleFavorite}
                applyingId={applyingId}
                popularityThreshold={popularityThreshold}
                isNew={isNew}
              />
            )}
          </div>
        </div>
      </PageContent>

      {/* Phase 173 TPCK-02 — Pack preview modal. D-13: closes on overlay/
          Escape/success. D-14: showToastAdapter bridges object-form
          ({variant, heading, action}) to App.jsx's 2-arg (message, type).
          Navigation to 'scenes' remains opt-in via the action callback; the
          adapter does NOT auto-invoke it. Sits OUTSIDE the scroll container
          (modal portal). */}
      <PackPreviewModal
        open={packModalState.open}
        packs={packModalState.packs}
        initialIndex={packModalState.initialIndex}
        onClose={() => setPackModalState((s) => ({ ...s, open: false }))}
        showToast={showToastAdapter}
        onNavigate={onNavigate}
      />
    </PageLayout>
  );
}
