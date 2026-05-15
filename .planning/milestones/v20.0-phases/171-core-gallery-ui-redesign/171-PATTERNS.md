# Phase 171: Core Gallery UI Redesign — Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 6 (1 replaced page + 1 modified router + 3 new tests + 1 npm install)
**Analogs found:** 6 / 6 (100%)

This map tells each downstream task exactly which existing files to `<read_first>` and which
concrete excerpts to copy. Every analog is inside this repo. No net-new components are required —
the design system ships every primitive the phase needs; the work is assembly.

---

## File Classification

| Phase-171 file | Verb | Role | Data flow | Closest in-repo analog | Match quality |
|-----------------|------|------|-----------|-------------------------|---------------|
| `src/pages/TemplateGalleryPage.jsx` | CREATE | page component | request-response (fetch-once) + client-side filter/sort/search | `src/pages/SvgTemplateGalleryPage.jsx` (legacy being replaced) + `src/pages/CampaignsPage.jsx` (filter bar shape) + `src/pages/TemplatesPage.jsx` (PageLayout usage) | exact |
| `src/pages/SvgTemplateGalleryPage.jsx` | DELETE | legacy page | — | — | n/a (replaced by file above) |
| `src/App.jsx` (3 pageMap entries + 1 lazy import) | MODIFY | router shell | route registration | its own existing `lazy(() => import(...))` + `pageMap` entries (lines 128, 531, 558, 563) | exact (self-analog) |
| `tests/unit/pages/TemplateGalleryPage.test.jsx` | CREATE | unit test (RTL) | test harness | `tests/unit/pages/DashboardPage.test.jsx` | exact |
| `tests/unit/pages/templateMarketplaceAlias.test.jsx` | CREATE | unit test (module identity) | static analysis | no perfect analog; use the mock-setup header of `DashboardPage.test.jsx` + direct import of `src/App.jsx` pageMap object | role-match |
| `tests/e2e/template-gallery.spec.js` | CREATE | Playwright E2E | browser automation | `tests/e2e/scenes.spec.js` (navigation + structural assertions) + `tests/e2e/template-gallery-rls.spec.js` (URL-goto pattern) | exact |
| `package.json` (add `fuse.js@^7.3.0`) | MODIFY | dependency manifest | — | — | n/a (one-line install) |

All analog file paths are absolute in the sections below so the planner can paste them straight
into each task's `<read_first>` block.

---

## Pattern Assignments

### File 1 — `src/pages/TemplateGalleryPage.jsx` (NEW)

**Role:** React page component
**Data flow:** one-shot fetch on mount → client-side pipeline (fuse.js search → filter → sort) → design-system grid render
**Read first (absolute paths):**
1. `/Users/massimodamico/bizscreen/src/pages/SvgTemplateGalleryPage.jsx` — the page being replaced; copy the `loadData` shape and `useMemo` filter discipline, but REMOVE: sidebar (`CollapsibleFilterSection`), horizontal scroll sections, `FILTER_CONFIG` const, inline `TemplateCard` def, `sessionStorage.pendingTemplate` write, `activeView === 'your-designs'` branch.
2. `/Users/massimodamico/bizscreen/src/services/templateGalleryService.js` — the data source; note the snake_case return shape (D-08 in its JSDoc) and the `{data, error}` contract at line 69.
3. `/Users/massimodamico/bizscreen/src/design-system/index.js` — barrel export of every component this page imports.
4. `/Users/massimodamico/bizscreen/src/design-system/components/TemplateCard.jsx` — the card + grid + skeleton; verify prop names (`imageUrl`, `title`, `orientation`, `onSelect`, `onPreview`, `featured`) before using them.
5. `/Users/massimodamico/bizscreen/src/design-system/components/SearchBar.jsx` — verify `value`/`onChange(str)` (NOT event) callback signature.
6. `/Users/massimodamico/bizscreen/src/design-system/components/FilterChips.jsx` — `ToggleChips` component for the orientation row; props: `options`, `selected`, `onChange(id)`, `variant="primary"`.
7. `/Users/massimodamico/bizscreen/src/design-system/components/FormElements.jsx` lines 223–289 — `Select` component; accepts either `options` prop OR `<option>` children.
8. `/Users/massimodamico/bizscreen/src/design-system/components/EmptyState.jsx` — `icon`, `title`, `description`, `action`, `size="lg"` API.
9. `/Users/massimodamico/bizscreen/src/design-system/components/Badge.jsx` — variants map; `success` = green-50/green-700, `default` = gray-100/gray-700 (line 25–32).
10. `/Users/massimodamico/bizscreen/src/design-system/components/PageLayout.jsx` — `PageLayout maxWidth="wide"` and `PageHeader title`/`description` API.
11. `/Users/massimodamico/bizscreen/src/design-system/components/PageTransition.jsx` — `StaggeredPageTransition` + `StaggeredItem` usage.
12. `/Users/massimodamico/bizscreen/src/contexts/AuthContext.jsx` lines 11–17 — `useAuth()` returns `{user, ...}`; use `user?.id` for localStorage namespace.
13. `/Users/massimodamico/bizscreen/src/auth/SignupPage.jsx` lines 6, 14–15 — concrete `useSearchParams` usage in the codebase (proof that the hook works under `App.jsx`'s render tree).
14. `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-RESEARCH.md` lines 478–697 — full skeleton to decompose.
15. `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-UI-SPEC.md` — visual contract.

#### Pattern A — Imports (copy this shape)
Source: `src/pages/CampaignsPage.jsx` lines 1–30 (React + router + lucide + service + design-system + auth).
```javascript
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Monitor, Smartphone } from 'lucide-react';
import {
  PageLayout, PageHeader, PageContent,
  SearchBar, ToggleChips, Select,
  TemplateCard, TemplateCardGrid, TemplateCardSkeleton,
  EmptyState, SearchIllustration, TemplatesIllustration,
  Badge, Button,
  StaggeredPageTransition, StaggeredItem,
} from '../design-system';
import { fetchGalleryTemplates } from '../services/templateGalleryService';
import { useAuth } from '../contexts/AuthContext';
```
Note: ordering — React → router → third-party → lucide icons → design-system barrel → services → contexts. This matches `CampaignsPage.jsx`, `TemplatesPage.jsx`, and `SvgTemplateGalleryPage.jsx`.

#### Pattern B — Page component signature (copy this shape)
Source: `src/pages/SvgTemplateGalleryPage.jsx` line 75 + `src/pages/CampaignsPage.jsx` line 69.
```javascript
export default function TemplateGalleryPage({ showToast, onNavigate }) {
  const { user } = useAuth();
  // ...
}
```
All BizScreen pages accept `showToast` (toast callback) and `onNavigate` / `setCurrentPage` (pseudo-router). `App.jsx` injects both at the pageMap render site (see File 3 below).

#### Pattern C — Fetch-once-on-mount + error state (copy this shape)
Source: `src/pages/SvgTemplateGalleryPage.jsx` lines 102–121 — **simplify**: drop the try/catch showToast approach and replace with a state machine that renders `EmptyState` on error (per CONTEXT D-13). Use the service's `{data, error}` return from `src/services/templateGalleryService.js` line 69.
```javascript
const [allTemplates, setAllTemplates] = useState([]);
const [isFetching, setIsFetching]     = useState(true);
const [fetchError, setFetchError]     = useState(null);

const refetch = async () => {
  setIsFetching(true);
  setFetchError(null);
  const { data, error } = await fetchGalleryTemplates({ limit: 500 });
  if (error) setFetchError(error);
  else      setAllTemplates(data);
  setIsFetching(false);
};

useEffect(() => { refetch(); }, []);
```

#### Pattern D — URL-backed filter state (NET-NEW in gallery)
Source: `src/auth/SignupPage.jsx` lines 6, 14–15 (confirms React Router v7 `useSearchParams` works in this tree) + RESEARCH Pattern 2 + 171-RESEARCH.md `updateFilter` at lines 526–535.
```javascript
const [searchParams, setSearchParams] = useSearchParams();
const filters = {
  q:           searchParams.get('q')           ?? '',
  category:    searchParams.get('category')    ?? '',
  tags:        searchParams.getAll('tags'),                 // repeated param (RESEARCH Pitfall 5)
  orientation: searchParams.get('orientation') ?? '',
  sort:        searchParams.get('sort')        ?? 'newest',
};
const updateFilter = (key, value) => {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.delete(key);
    if (Array.isArray(value)) value.forEach(v => v && next.append(key, v));
    else if (value) next.set(key, value);
    return next;
  }, { replace: true });
};
const clearAllFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
```

#### Pattern E — Client-side filter/sort pipeline
Source: `src/pages/SvgTemplateGalleryPage.jsx` lines 124–150 (legacy filter useMemo) — **extend** with fuse.js search stage and the 4-way sort branch documented in RESEARCH Pattern 3 (lines 310–355).
```javascript
const fuse = useMemo(() => new Fuse(allTemplates, {
  keys: [
    { name: 'name',        weight: 2 },
    { name: 'tags',        weight: 1.5 },
    { name: 'description', weight: 1 },
  ],
  threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
}), [allTemplates]);

const displayedTemplates = useMemo(() => {
  let rows = filters.q.length >= 2 ? fuse.search(filters.q).map(r => r.item) : allTemplates;
  if (filters.category)       rows = rows.filter(t => t.category === filters.category);
  if (filters.tags.length)    rows = rows.filter(t => (t.tags ?? []).some(tag => filters.tags.includes(tag)));
  if (filters.orientation)    rows = rows.filter(t => t.orientation === filters.orientation);
  rows = [...rows];
  if      (filters.sort === 'popular') rows.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
  else if (filters.sort === 'alpha')   rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  else if (filters.sort === 'recent') { /* readRecentlyUsed(user?.id); see Pattern G */ }
  else                                 rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return rows;
}, [allTemplates, fuse, filters, user?.id]);
```

#### Pattern F — Derived option lists (kill hard-coded FILTER_CONFIG)
Source: `src/pages/SvgTemplateGalleryPage.jsx` lines 38–72 (`FILTER_CONFIG`) — **delete entirely**; derive from data instead (RESEARCH Pitfall 2 at lines 422–436).
```javascript
const categoryOptions = useMemo(
  () => [...new Set(allTemplates.map(t => t.category).filter(Boolean))].sort(),
  [allTemplates]
);
const tagOptions = useMemo(
  () => [...new Set(allTemplates.flatMap(t => t.tags ?? []).filter(Boolean))].sort(),
  [allTemplates]
);
```

#### Pattern G — Recently-Used localStorage (namespaced by user)
Source: no direct analog in gallery; RESEARCH Pitfall 8 at lines 468–472 + skeleton lines 497–507.
```javascript
const RECENT_KEY = (uid) => `bizscreen:recentTemplates:${uid ?? 'anon'}`;
function readRecentlyUsed(userId) {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY(userId)) ?? '{}'); }
  catch { return {}; }
}
```
Writing side is out of scope for Phase 171 (uses will update this in Phase 172 when the apply
flow lands). This phase only READS.

#### Pattern H — "New" badge window + "Popular" threshold
Source: RESEARCH skeleton lines 496–507 and 586–589.
```javascript
const NEW_BADGE_WINDOW_DAYS = 30;
const isNew = (createdAt) => Date.now() - new Date(createdAt).getTime() < NEW_BADGE_WINDOW_DAYS * 86_400_000;

const popularityThreshold = useMemo(() => {
  const counts = allTemplates.map(t => t.use_count ?? 0).sort((a, b) => b - a);
  return counts[Math.floor(counts.length * 0.2)] ?? 0;      // top 20%
}, [allTemplates]);
```

#### Pattern I — Three-state UI discriminator (copy this branch order)
Source: RESEARCH Pattern 4 (lines 361–367).
```jsx
if (isFetching)                      return <SkeletonBranch />;
if (fetchError)                      return <ErrorBranch onRetry={refetch} />;
if (allTemplates.length === 0)       return <EmptyBranch kind="zero-content" />;
// otherwise render filter bar + grid; if displayedTemplates.length === 0 → "no results" EmptyState
```

#### Pattern J — Badge placement on TemplateCard (wrap, do NOT extend component)
Source: RESEARCH Pitfall 7 + `src/design-system/components/TemplateCard.jsx` lines 83–90 (existing Featured badge is absolutely positioned inside the image area).
```jsx
<div className="relative">
  {isNew(t.created_at) && (
    <div className="absolute top-2 left-2 z-10"><Badge variant="success" size="sm">New</Badge></div>
  )}
  {(t.use_count ?? 0) >= popularityThreshold && popularityThreshold > 0 && (
    <div className="absolute top-2 right-2 z-10"><Badge variant="default" size="sm">Popular</Badge></div>
  )}
  <TemplateCard
    title={t.name}
    description={t.description}
    imageUrl={t.thumbnail}
    orientation={t.orientation}
    onSelect={() => { /* Phase 172 wires preview modal */ }}
  />
</div>
```
Do NOT pass `featured={t.is_featured}` — that would render the built-in "Featured" badge which
CONTEXT D-02 explicitly omits.

#### Pattern K — Active-filter chip row + Clear all
Source: UI-SPEC Active Filters Row + RESEARCH skeleton lines 652–659. Use plain `Badge` + a child `<button>` for the dismiss X (no dedicated design-system "DismissibleChip" exists).
```jsx
{hasActiveFilters && (
  <div className="flex items-center gap-2 flex-wrap mb-4">
    {filters.category && (
      <Badge variant="default">
        Category: {filters.category}
        <button onClick={() => updateFilter('category', '')} aria-label="Remove Category filter">×</button>
      </Badge>
    )}
    {/* repeat for tags (map), orientation */}
    <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear all</Button>
  </div>
)}
```

---

### File 2 — `src/pages/SvgTemplateGalleryPage.jsx` (DELETE)

No pattern to copy. Verification step: after the file is removed, `grep -r "SvgTemplateGalleryPage" src/` must return zero hits. The four current references live in `src/App.jsx` lines 128, 531, 558, 563 — see File 3 below.

---

### File 3 — `src/App.jsx` (MODIFY — 4 existing lines)

**Role:** router shell / pseudo-router
**Data flow:** route registration (internal `currentPage` state map)
**Read first:**
1. `/Users/massimodamico/bizscreen/src/App.jsx` lines 120–130 (lazy imports block)
2. `/Users/massimodamico/bizscreen/src/App.jsx` lines 525–564 (pageMap)
3. `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-RESEARCH.md` Pitfall 1 (lines 416–420)

#### Pattern L — Lazy import (copy surrounding style)
Source: `src/App.jsx` line 128 (the current legacy import is the self-analog).
```javascript
// BEFORE
const SvgTemplateGalleryPage = lazy(() => import('./pages/SvgTemplateGalleryPage'));
// AFTER
const TemplateGalleryPage = lazy(() => import('./pages/TemplateGalleryPage'));
```

#### Pattern M — pageMap registration (three entries, one atomic change)
Source: `src/App.jsx` lines 531, 558, 563 — copy the exact `<Suspense fallback={<PageLoader />}>`
wrapper + `showToast`/`onNavigate` props and swap only the component name.
```jsx
// BEFORE (three entries)
'templates':            <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'template-marketplace': <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'svg-templates':        <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
// AFTER
'templates':            <Suspense fallback={<PageLoader />}><TemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'template-marketplace': <Suspense fallback={<PageLoader />}><TemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
'svg-templates':        <Suspense fallback={<PageLoader />}><TemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
```
All three MUST change in one commit to avoid Pitfall 1 (stale pageMap alias).

---

### File 4 — `tests/unit/pages/TemplateGalleryPage.test.jsx` (NEW)

**Role:** Vitest + React Testing Library unit test
**Data flow:** mount page in `<BrowserRouter>`, mock service, assert state renderings
**Read first:**
1. `/Users/massimodamico/bizscreen/tests/unit/pages/DashboardPage.test.jsx` — line-by-line template
2. `/Users/massimodamico/bizscreen/src/services/templateGalleryService.js` — exported function name to mock (`fetchGalleryTemplates`)
3. `/Users/massimodamico/bizscreen/src/contexts/AuthContext.jsx` lines 11–17 — `useAuth` hook to mock

#### Pattern N — Imports + mock scaffolding
Source: `tests/unit/pages/DashboardPage.test.jsx` lines 1–70 (copy verbatim, change module paths).
```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import TemplateGalleryPage from '../../../src/pages/TemplateGalleryPage';

const mockUser = { id: 'test-user-id', email: 'test@example.com' };
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchGalleryTemplates = vi.fn();
vi.mock('../../../src/services/templateGalleryService', () => ({
  fetchGalleryTemplates: (opts) => mockFetchGalleryTemplates(opts),
}));
```

#### Pattern O — Router-wrapped render helper
Source: `tests/unit/pages/DashboardPage.test.jsx` lines 104–116.
```javascript
const renderPage = (props = {}) => render(
  <BrowserRouter>
    <TemplateGalleryPage showToast={vi.fn()} onNavigate={vi.fn()} {...props} />
  </BrowserRouter>
);
```
`BrowserRouter` is critical — the page uses `useSearchParams`, which throws outside a `<Routes>` tree.

#### Pattern P — Test shape per requirement
Source: `tests/unit/pages/DashboardPage.test.jsx` lines 142–482. One `describe` block per CONTEXT state family:
- `Loading State` → RESEARCH 803–809 task TGAL-02 loading
- `Error State` → 803–809 task TGAL-02 error
- `Filter & Sort Pipeline` → TGAL-03, TDSC-02
- `URL State` → TDSC-04
- `Empty States` → TDSC-05 (two kinds: zero-content vs no-results)
- `Badges` → TGAL-04

Each test:
1. sets `mockFetchGalleryTemplates.mockResolvedValue({ data: [...factory], error: null })`;
2. `await waitFor(() => expect(screen.queryByTestId('skeleton-grid')).not.toBeInTheDocument())` or equivalent loading-cleared assertion;
3. asserts the state-specific copy from UI-SPEC Copywriting Contract (e.g. `screen.getByText("No templates match your search")`).

Factory pattern (copy from DashboardPage.test.jsx lines 72–101):
```javascript
const createMockTemplate = (overrides = {}) => ({
  id: 'tpl-1',
  name: 'Restaurant Menu',
  description: 'Daily specials',
  category: 'Menu',
  tags: ['Food'],
  orientation: 'landscape',
  thumbnail: 'https://example.com/tpl.png',
  use_count: 0,
  created_at: new Date().toISOString(),
  is_featured: false,
  ...overrides,
});
```

---

### File 5 — `tests/unit/pages/templateMarketplaceAlias.test.jsx` (NEW)

**Role:** Unit test verifying `App.jsx` pageMap wiring (Pitfall 1 safety net)
**Data flow:** module identity / static import inspection
**Read first:**
1. `/Users/massimodamico/bizscreen/src/App.jsx` lines 128, 531, 558, 563
2. `/Users/massimodamico/bizscreen/tests/unit/pages/DashboardPage.test.jsx` lines 11–70 (mock-setup header pattern)
3. `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-RESEARCH.md` Pitfall 1 (lines 416–420)

There is no close analog for "assert that three pageMap entries point to the same lazy-imported module." Options (planner may choose):
- **Option 1 (simplest):** assert that the component imported via dynamic `import('../../../src/pages/TemplateGalleryPage')` returns a default export that is a React component, AND assert that `grep -r "SvgTemplateGalleryPage" src/` returns 0 hits via `execSync` in the test. Brittle but zero-setup.
- **Option 2 (recommended):** `import { readFileSync } from 'fs'` and regex-scan `src/App.jsx` for the three strings `'templates':`, `'template-marketplace':`, `'svg-templates':` — assert each is followed by `<TemplateGalleryPage` within 200 chars. Matches the existing "file inspection" style of `tests/unit/utils/*` where present.
- **Option 3 (heaviest):** mount `<App />` and `setCurrentPage('template-marketplace')`, assert `TemplateGalleryPage` renders. High mock cost.

Recommendation: **Option 2**. Example:
```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('App.jsx pageMap aliases (Pitfall 1 regression)', () => {
  const appSrc = readFileSync(path.resolve(__dirname, '../../../src/App.jsx'), 'utf8');

  it('does not import SvgTemplateGalleryPage', () => {
    expect(appSrc).not.toMatch(/SvgTemplateGalleryPage/);
  });

  it.each(['templates', 'template-marketplace', 'svg-templates'])(
    "pageMap entry %s renders TemplateGalleryPage",
    (key) => {
      const pattern = new RegExp(`'${key}':[\\s\\S]{0,200}<TemplateGalleryPage`);
      expect(appSrc).toMatch(pattern);
    }
  );
});
```

---

### File 6 — `tests/e2e/template-gallery.spec.js` (NEW)

**Role:** Playwright end-to-end test
**Data flow:** browser automation over authenticated session
**Read first:**
1. `/Users/massimodamico/bizscreen/tests/e2e/scenes.spec.js` lines 1–60 — structural assertion pattern with `loginAndPrepare` + `navigateToSection`
2. `/Users/massimodamico/bizscreen/tests/e2e/template-gallery-rls.spec.js` lines 1–38 — page.goto('/svg-templates') pattern
3. `/Users/massimodamico/bizscreen/tests/e2e/helpers.js` lines 1–53 — `loginAndPrepare` signature
4. `/Users/massimodamico/bizscreen/tests/e2e/fixtures/index.js` lines 60–82 — `authenticatedPage` fixture
5. `/Users/massimodamico/bizscreen/.planning/phases/171-core-gallery-ui-redesign/171-UI-SPEC.md` Copywriting Contract — locked test copy ("Templates", "Search templates...", "Browse all templates", etc.)

#### Pattern Q — Spec scaffolding (copy this header verbatim)
Source: `tests/e2e/scenes.spec.js` lines 1–22.
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, navigateToSection } from './helpers.js';

test.describe('Template Gallery', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });

  // tests here
});
```

#### Pattern R — Structural-only assertions (do NOT hard-code template counts)
Source: `tests/e2e/template-gallery-rls.spec.js` lines 18–29 (page.goto + no-error-toast) + RESEARCH line 819 (TQAL-05 pattern).
```javascript
test('renders gallery without errors', async ({ page }) => {
  await page.goto('/app/#templates');       // or whatever the pseudo-router surfaces
  await expect(page.getByRole('heading', { name: /templates/i })).toBeVisible();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
});

test('URL-synced filters round-trip (TDSC-04)', async ({ page }) => {
  await page.goto('/app/#templates?orientation=landscape&sort=alpha');
  // Assert the ToggleChip active state reflects the URL
  await expect(page.getByRole('button', { name: /landscape/i })).toHaveClass(/bg-brand-500/);
});

test('search narrows results (TDSC-01)', async ({ page }) => {
  await page.goto('/app/#templates');
  const initialCount = await page.locator('[class*="group bg-white border"]').count();
  await page.getByPlaceholder('Search templates...').fill('nonexistentquerystring');
  await expect(page.getByText("No templates match your search")).toBeVisible({ timeout: 1500 });
});
```

Assertion guardrail: use semantic selectors (`getByRole`, `getByPlaceholder`, `getByText`) over
CSS classes where possible — matches the codebase's existing pattern (`scenes.spec.js` line 30
`page.locator('h1, h2').filter({ hasText: /scenes/i })`).

---

### File 7 — `package.json` (MODIFY — install `fuse.js@^7.3.0`)

**Role:** dependency manifest
**Data flow:** npm install
**Read first:** `/Users/massimodamico/bizscreen/package.json` (to see current ordering — planner should put `fuse.js` alphabetically in `dependencies`).

```bash
npm install fuse.js@^7.3.0
```
Commit the resulting `package.json` + `package-lock.json` diff in the same task that introduces
`TemplateGalleryPage.jsx` (the file that imports it). That way the import and install land atomic.

---

## Shared Patterns

### Shared A — Toast / navigate prop wiring
**Source:** `src/App.jsx` lines 531, 558, 563 — every page receives `showToast={showToast}` and (when applicable) `onNavigate={setCurrentPage}` as props from the pageMap.
**Apply to:** `TemplateGalleryPage.jsx` signature.
```javascript
export default function TemplateGalleryPage({ showToast, onNavigate }) { ... }
```
Phase 171 uses `showToast` only for debug purposes (can be omitted); `onNavigate` is a no-op in
this phase because `onSelect` is a Phase 172 concern.

### Shared B — Snake_case VIEW rows at render boundary
**Source:** `src/services/templateGalleryService.js` JSDoc line 13 ("D-08: Raw VIEW rows (snake_case from Postgres). Callers handle casing.") + `TemplateCard` component accepts camelCase props (`imageUrl`, `title`).
**Apply to:** every render of a template in `TemplateGalleryPage.jsx`. Read `t.created_at`, `t.use_count`, `t.is_featured`, `t.svg_url`, `t.thumbnail` directly; map to `TemplateCard` camelCase props at the JSX boundary.
```jsx
<TemplateCard
  title={t.name}
  description={t.description}
  imageUrl={t.thumbnail}
  orientation={t.orientation}
/>
```

### Shared C — BrowserRouter test wrapper
**Source:** `tests/unit/pages/DashboardPage.test.jsx` line 13 + lines 104–116.
**Apply to:** both unit test files. Any component in this phase that uses `useSearchParams`,
`useNavigate`, `useLocation` must render inside `<BrowserRouter>`.

### Shared D — Lazy import + Suspense wrapper
**Source:** `src/App.jsx` lines 120–130 (all page lazy-imports are in this block) and lines 525–564 (every pageMap entry uses `<Suspense fallback={<PageLoader />}>`).
**Apply to:** `TemplateGalleryPage` registration — keep the Suspense wrapper. Do not break the pattern with a static import.

### Shared E — Copy strings live in UI-SPEC, not hard-coded in tests
**Source:** UI-SPEC Copywriting Contract (171-UI-SPEC.md lines 252–276).
**Apply to:** every test file. Assert against these exact strings:
- `"Templates"` (page title)
- `"Search templates..."` (search placeholder)
- `"All Categories"`, `"All Tags"` (select defaults)
- `"Newest"`, `"Most Popular"`, `"Alphabetical"`, `"Recently Used"` (sort options)
- `"No templates match your search"` / `"Try different keywords, fewer filters, or browse the full library."` / `"Browse all templates"` (no-results)
- `"Couldn't load templates"` / `"Something went wrong. Check your connection and try again."` / `"Try again"` (error)
- `"No templates yet"` / `"Templates will appear here once content is added to the library."` (zero-content)
- `"New"`, `"Popular"` (badge text)
- `"Clear all"`

Diverging from these strings silently breaks the UI-SPEC checker sign-off in `171-UI-SPEC.md`.

### Shared F — Atomic commit discipline for the legacy delete
**Source:** RESEARCH Pitfall 1 (lines 416–420).
**Apply to:** File 2 (delete of `src/pages/SvgTemplateGalleryPage.jsx`) + File 3 (`src/App.jsx`
edits — all four sites: lazy-import + three pageMap aliases) MUST land in the **same commit as
each other**. The create of `src/pages/TemplateGalleryPage.jsx` (File 1) MAY be committed in a
preceding commit — `171-02-PLAN.md` uses exactly this split (Task 1 commits File 1; Task 2
atomically commits File 2 + File 3).

**Why the two-commit split is safe** (planner-verified): after Task 1's commit, the repo contains
the new page file *and* still has the legacy page file + the legacy `App.jsx` import pointing at
it. `App.jsx` continues to resolve at runtime because nothing about its imports has changed yet.
The Pitfall 1 concern — a stale pageMap alias pointing at a deleted component — is avoided because
the delete (File 2) and the four `App.jsx` edits (File 3) are written, staged, and committed
together in Task 2. A partial landing of Task 2 is not possible within a single commit, so the
pageMap can never reference a deleted file at any SHA.

**Rationale for the split:** keeping Task 1 (page create) in its own commit preserves clean task
boundaries, keeps Task 2's diff focused on the swap, and avoids ballooning a single task into a
3-file commit. The build is never broken at any intermediate SHA.

---

## No Analog Found

None — every file in this phase has a close in-repo analog. The phase is 90% assembly.

---

## Pattern Extraction Metadata

- **Analog search scope:** `src/pages/`, `src/design-system/components/`, `src/services/`, `src/contexts/`, `src/auth/`, `src/App.jsx`, `tests/unit/pages/`, `tests/e2e/`
- **Files scanned:** ~30 direct reads; grep scans over `src/` and `tests/`
- **Pattern extraction date:** 2026-04-19
- **Consumer:** `gsd-planner` — use these per-file `<read_first>` lists + copy-from excerpts when
  writing plan actions. Every code block above is already copy-paste ready; the planner's job is
  to assign them to task units (e.g. "Task 02.01 creates File 1 using Patterns A–K" etc.).
