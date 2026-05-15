# Phase 179: Gallery Virtualization + Launch Validation — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 10 (5 CREATE + 5 MODIFY)
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Action | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|--------|------|-----------|----------------|---------------|
| `src/components/template-gallery/VirtualizedTemplateGrid.jsx` | CREATE | component (presentation, headless-virt wrapper) | request-response / render | `src/components/template-gallery/StarterPacksStrip.jsx` + `src/design-system/components/TemplateCard.jsx` (`TemplateCardGrid` block) | role-match |
| `src/hooks/useContainerColumns.js` | CREATE | hook (ResizeObserver derive state from DOM) | event-driven (RO callbacks) | `src/ScaledStage.jsx` lines 22–32 (RO setup) + `src/hooks/useAbortSignal.js` (hook file shape) | **exact** (ResizeObserver pattern matches verbatim) |
| `tests/unit/components/VirtualizedTemplateGrid.test.jsx` | CREATE | test (RTL render + structural assertions) | request-response | `tests/unit/components/PackCard.test.jsx` | **exact** (same shape: render + assert DOM attrs/classes) |
| `tests/unit/hooks/useContainerColumns.test.js` | CREATE | test (renderHook + RO mock) | event-driven | `tests/unit/hooks/useAbortSignal.test.js` + `tests/unit/hooks/useGalleryTour.test.js` (vi.mock pattern) | **exact** |
| `tests/e2e/template-gallery-perf.spec.js` | CREATE | test (Playwright + CDP + `performance.mark`) | request-response (perf measurement) | `tests/e2e/template-gallery.spec.js` (login + gotoTemplates) + `tests/e2e/admin-template-queue.spec.js` (live-DB precedent) | role-match (no perf-test analog exists; navigation pattern matches) |
| `tests/e2e/template-gallery-axe.spec.js` | CREATE | test (Playwright + AxeBuilder scoped scan) | request-response | `tests/e2e/template-gallery.spec.js` (login + gotoTemplates) | role-match (no axe-core analog exists in repo) |
| `src/pages/TemplateGalleryPage.jsx` | MODIFY | page (assembly + state + render branches) | request-response | self — restructure existing 5 render branches at lines 619–800 | self-modify |
| `src/design-system/components/TemplateCard.jsx` | MODIFY | component (design-system primitive) | render | self — `TemplateCard` already has `orientation` prop + `aspectClasses` mapping at lines 46–51 | self-modify (Claude-discretion confirms `orientation` prop is already shipped — no actual modification needed for masonry per `aspectClass` mapping) |
| `src/design-system/index.js` | MODIFY | barrel re-export | n/a | self — add export at line 79 alongside existing `TemplateCard` exports | self-modify |
| `package.json` | MODIFY | config | n/a | self — `dependencies` block lines 34–58, `devDependencies` lines 59–86 | self-modify |
| `tests/e2e/template-gallery.spec.js` | MODIFY | test (extend existing E2E suite) | request-response | self — extend the existing `test.describe('Template Gallery (Phase 171)', ...)` block | self-modify |

---

## Pattern Assignments

### `src/hooks/useContainerColumns.js` (NEW; hook, event-driven)

**Analog:** `src/ScaledStage.jsx` lines 22–32 (the **only** existing ResizeObserver pattern in the codebase, explicitly cited by RESEARCH §Pattern 2).

**ResizeObserver setup pattern** (copy verbatim — adapt the `setState` mapping to `widthToCols`):

```jsx
// src/ScaledStage.jsx:19-32
const boxRef = useRef(null);
const [scale, setScale] = useState(1);

useEffect(() => {
  const el = boxRef.current;
  if (!el) return;
  const ro = new ResizeObserver(() => {
    const { width, height } = el.getBoundingClientRect();
    const s = Math.min(width / baseWidth, height / baseHeight);
    setScale(s);
  });
  ro.observe(el);
  return () => ro.disconnect();
}, [baseWidth, baseHeight]);
```

**Key points to mirror:**
- `useEffect` (not `useLayoutEffect`) — RO is async per spec; useLayoutEffect gains nothing
- Early `if (!el) return;` guard
- Cleanup via `ro.disconnect()` from return function — idempotent under React 18+ StrictMode double-invocation
- Effect deps are the *stable inputs* (here `baseWidth`, `baseHeight`), NOT `el.current`

**RESEARCH-mandated additions (Pattern 2, line 309-310):**
- Synchronous pre-fill before `ro.observe()`: `setCols(widthToCols(el.getBoundingClientRect().width))` — RO does not fire on first observe in some browsers; this prevents a one-render flash with the SSR default
- `widthToCols` thresholds map to Tailwind `sm/md/lg`: 640 / 768 / 1024 → 2 / 3 / 4 cols (mobile default 1)

**File shape pattern** (named export only — matches the `useAbortSignal` family):

```js
// src/hooks/useAbortSignal.js (file-level convention — verified via:
//   ls src/hooks/ → useAbortSignal.js, useAdmin.js, useAuditLogs.js,
//   useDataCache.js, useGalleryTour.js, useLayout.js, useMedia.js, ...)
// All hooks export a NAMED function (no default export) and live at src/hooks/<name>.js
export function useContainerColumns(ref) { /* ... */ }
```

---

### `src/components/template-gallery/VirtualizedTemplateGrid.jsx` (NEW; component, render)

**Analogs:**
- `src/components/template-gallery/StarterPacksStrip.jsx` — sibling-folder placement convention (`src/components/template-gallery/`)
- `src/design-system/components/TemplateCard.jsx` lines 156–182 — the `TemplateCardGrid` block being replaced; reuse `gap-4` + Tailwind grid classes inside the virtual row

**Sibling component file shape** (matches `StarterPacksStrip.jsx`):

```jsx
// src/components/template-gallery/StarterPacksStrip.jsx:1-24 — header doc + named exports + named default
import { useEffect, useState } from 'react';
import { fetchStarterPacks } from '../../services/marketplaceService';
import PackCard from './PackCard';

const SKELETON_COUNT = 3;

/**
 * StarterPacksStrip — horizontal lane above the gallery template grid.
 * Phase 173 (TPCK-01). [...]
 *
 * @param {{ onSelect: (packId: string, packs: Array, index: number) => void }} props
 */
export default function StarterPacksStrip({ onSelect }) {
  // ...
}
```

**Apply to VirtualizedTemplateGrid:**
- File header doc with phase tag + UI-SPEC reference + `@param` JSDoc
- Module-level constants (`const OVERSCAN = 5;`) above the component
- `export default function VirtualizedTemplateGrid({ ... }) {`

**Grid-row inner layout pattern** (reuse `TemplateCardGrid`'s grid + gap conventions inside each virtual row):

```jsx
// src/design-system/components/TemplateCard.jsx:166-182
const gridClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

return (
  <div ref={ref} className={`grid ${gridClasses[columns]} gap-4 ${className}`} {...props}>
    {children}
  </div>
);
```

**Within VirtualizedTemplateGrid each virtual row uses `gridTemplateColumns: 'repeat(${cols}, minmax(0, 1fr))'` + `gap: '1rem'` (matches `gap-4`) + `alignItems: 'start'` (LOAD-BEARING for masonry; see RESEARCH Anti-Patterns).**

**Card render pattern** (copy from existing `TemplateGalleryPage.jsx` content branch lines 749–784):

```jsx
// src/pages/TemplateGalleryPage.jsx:749-784 — current content branch
<TemplateCardGrid columns={4}>
  {displayedTemplates.map((t, i) => (
    <StaggeredItem key={t.id}>
      <div className="relative">
        {isNew(t.created_at) && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="success" size="sm">New</Badge>
          </div>
        )}
        {(t.use_count ?? 0) >= popularityThreshold && popularityThreshold > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="default" size="sm">Popular</Badge>
          </div>
        )}
        <TemplateCard
          title={t.name}
          description={t.description}
          imageUrl={t.thumbnail}
          orientation={t.orientation}
          onSelect={() => handleSelectTemplate(t)}
          loading={applyingId === t.id}
          isFavorited={!!t.is_favorited}
          onToggleFavorite={(nextValue) => handleToggleFavorite(t, nextValue)}
          data-tour={i === 0 ? 'first-card' : undefined}
        />
      </div>
    </StaggeredItem>
  ))}
</TemplateCardGrid>
```

**Notes for migration into VirtualizedTemplateGrid:**
- `StaggeredItem` wrapper: planner decides whether to keep (likely drop inside virtual rows — `StaggeredPageTransition` orchestrates a one-shot fade-in that doesn't compose well with virtualizer remounts on scroll). Out-of-scope detail; either is acceptable, but RESEARCH does not require it.
- `data-tour={i === 0 ? 'first-card' : undefined}` must continue to attach to the first rendered card — needed for `useGalleryTour` anchor lookup (see `src/hooks/useGalleryTour.js:45` `document.querySelector('[data-tour="first-card"]')`).
- `key={t.id}` on the cards within the row (NOT on the row itself — the row uses `key={vRow.key}` from virtualizer).

---

### `tests/unit/components/VirtualizedTemplateGrid.test.jsx` (NEW; test, RTL)

**Analog:** `tests/unit/components/PackCard.test.jsx` — same shape (render + structural assertions; no service mocks needed for a pure presentation component).

**Imports + describe pattern**:

```jsx
// tests/unit/components/PackCard.test.jsx:1-26
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import PackCard from '../../../src/components/template-gallery/PackCard';

const basePack = { id: 'pack-1', name: 'Restaurant Starter', /* ... */ };

describe('PackCard', () => {
  it('renders 2x2 mosaic of first 4 member thumbnails (D-12)', () => {
    const { container } = render(<PackCard pack={basePack} onSelect={() => {}} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(4);
    // ...
    expect(container.querySelector('.grid-cols-2.grid-rows-2')).toBeTruthy();
  });

  it('click on card invokes onSelect prop', () => {
    const onSelect = vi.fn();
    render(<PackCard pack={basePack} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('pack-card-pack-1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

**SC-1 specific assertions** (from RESEARCH Example 3):

```jsx
it('count=0 when templates=[] (count guard during isLoading)', () => {
  const { container } = render(
    <VirtualizedTemplateGrid templates={[]} cols={4} scrollElement={null} />
  );
  expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '0');
});

it('aria-rowcount equals ceil(templates.length / cols)', () => {
  const templates = Array.from({ length: 17 }, (_, i) => ({ id: `t${i}`, name: 'T', orientation: 'landscape' }));
  const { container } = render(
    <VirtualizedTemplateGrid templates={templates} cols={4} scrollElement={document.body} />
  );
  expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '5');
});
```

---

### `tests/unit/hooks/useContainerColumns.test.js` (NEW; test, renderHook)

**Analogs:**
- `tests/unit/hooks/useAbortSignal.test.js` — `renderHook` + `act` pattern, no module-level mocks
- `tests/unit/hooks/useGalleryTour.test.js` lines 13–53 — `vi.mock` of a browser API + DOM setup in `beforeEach`

**Imports + renderHook pattern**:

```js
// tests/unit/hooks/useAbortSignal.test.js:1-7
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useAbortSignal', () => {
  let useAbortSignal;

  beforeEach(async () => {
    const mod = await import('../../../src/hooks/useAbortSignal');
    useAbortSignal = mod.useAbortSignal;
  });
});
```

**ResizeObserver mock pattern** (adapt from `tests/unit/hooks/useGalleryTour.test.js:21-26` `vi.mock` of `driver.js`):

```js
// useGalleryTour.test.js:21-26 (analog for mocking a third-party API)
vi.mock('driver.js', () => ({
  driver: vi.fn((options) => {
    lastDriverOptions = options;
    return { drive: mockDrive, destroy: mockDestroy };
  }),
}));
```

**Apply to RO mock** — `globalThis.ResizeObserver` is the standard mock target (no `vi.mock` needed; assign on `globalThis`):

```js
// Adapted pattern — RO is a browser global, not an importable module
beforeEach(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) {
      // Simulate the initial contentRect fire
      this.cb([{ contentRect: { width: 1200 } }]);
    }
    disconnect() {}
  };
});
```

---

### `tests/e2e/template-gallery-perf.spec.js` (NEW; E2E, Playwright + CDP)

**Analogs:**
- `tests/e2e/template-gallery.spec.js` — `loginAndPrepare` + `gotoTemplates` navigation pattern
- `tests/e2e/admin-template-queue.spec.js` — live-DB precedent per RESEARCH (Phase 177 Plan 06)

**Imports + describe + skip-guard pattern** (copy from `template-gallery.spec.js:26-49`):

```js
// tests/e2e/template-gallery.spec.js:26-49
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady, expectAtLeastOneTemplateCard } from './helpers.js';

async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page.waitForTimeout(500);
  await waitForPageReady(page);
}

test.describe('Template Gallery (Phase 171)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });
});
```

**CDP + `performance.mark` pattern** (from RESEARCH Code Examples §Example 1):

```js
test('gallery first-paint <1s at ~500-template catalog with 1× CPU (SC-2)', async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  await page.addInitScript(() => {
    performance.mark('gallery-paint-start');
  });

  await gotoTemplates(page);
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible', timeout: 5000 });

  const elapsed = await page.evaluate(() => {
    performance.mark('gallery-paint-end');
    performance.measure('gallery-paint', 'gallery-paint-start', 'gallery-paint-end');
    return performance.getEntriesByName('gallery-paint')[0]?.duration ?? Infinity;
  });

  expect(elapsed).toBeLessThan(1000);
});
```

**Catalog-floor pre-flight gate** (RESEARCH Assumptions Log A2 mitigation):

```js
// Before asserting <1s, verify the fixture actually has ≥400 templates
const rowcount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');
expect(Number(rowcount) * 4).toBeGreaterThanOrEqual(400); // 4 = cols default at test viewport
```

---

### `tests/e2e/template-gallery-axe.spec.js` (NEW; E2E, axe-core)

**Analog:** `tests/e2e/template-gallery.spec.js` — same `loginAndPrepare` + `gotoTemplates` shell; no existing axe spec in repo.

**Imports** (add `AxeBuilder` import to the standard E2E header):

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAndPrepare, waitForPageReady } from './helpers.js';
```

**Scan pattern scoped to `[role="grid"]`** (from RESEARCH Code Examples §Example 2):

```js
test('virtualized gallery is axe-core clean at full catalog (SC-5)', async ({ page }) => {
  await loginAndPrepare(page, { /* creds */ });
  await gotoTemplates(page);
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });

  const results = await new AxeBuilder({ page })
    .include('[role="grid"]')
    .analyze();

  const rowcount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');
  expect(Number(rowcount)).toBeGreaterThan(50);

  expect(results.violations).toEqual([]);
});
```

---

### `src/pages/TemplateGalleryPage.jsx` (MODIFY; page, request-response)

**Analog:** **self.** The 5 render branches at lines 619–800 already implement the v20.0 contract; the modification restructures the outer shell into the flex column with internal scroll container (D-03) and routes the content branch through `VirtualizedTemplateGrid`.

**Imports to add** (lines ~29-50 region — alongside existing design-system imports):

```jsx
// Current (lines 29-50):
import {
  PageLayout, PageHeader, PageContent,
  SearchBar, ToggleChips, Select,
  TemplateCard, TemplateCardGrid, TemplateCardSkeleton,
  EmptyState, SearchIllustration, TemplatesIllustration,
  Badge, Button,
  StaggeredPageTransition, StaggeredItem,
} from '../design-system';

// Add (after extraction of VirtualizedTemplateGrid):
import VirtualizedTemplateGrid from '../components/template-gallery/VirtualizedTemplateGrid';
import { useContainerColumns } from '../hooks/useContainerColumns';
```

**Existing render-branch structure to preserve** (`src/pages/TemplateGalleryPage.jsx:622-800`):

```jsx
// Lines 622-624 — page description
const pageDescription = isFetching
  ? undefined
  : `${displayedTemplates.length} templates available`;

// Lines 626-640 — Loading branch (TemplateCardGrid with N skeletons)
if (isFetching) { return <PageLayout>...<TemplateCardGrid columns={4}>...</TemplateCardGrid>...</PageLayout>; }

// Lines 642-662 — Error branch (EmptyState + Try again Button)
if (fetchError) { return <PageLayout>...<EmptyState .../>...</PageLayout>; }

// Lines 664-679 — Zero-content branch
if (allTemplates.length === 0) { /* EmptyState "No templates yet" */ }

// Lines 681-703 — Favorites-empty branch (precedes generic no-results)
if (filters.favorites && displayedTemplates.length === 0) { /* EmptyState "No favorites yet" */ }

// Lines 705-727 — No-results branch (filters yield zero)
if (displayedTemplates.length === 0) { /* EmptyState + filterBar + activeFiltersRow */ }

// Lines 729-800 — Content branch (filterBar + StarterPacksStrip + StaggeredPageTransition > TemplateCardGrid)
```

**D-03 restructure pattern** (collapse the 5 early-return branches into a single shell with an internal `flex-1` scroll container — see RESEARCH §Pattern 3):

```jsx
return (
  <PageLayout maxWidth="wide">
    <PageHeader title="Templates" description={pageDescription} />
    <PageContent>
      <div className="flex flex-col h-full">
        {/* sticky FilterBar zone — stays in place above the scrolling grid */}
        <div className="sticky top-0 z-10 bg-white">
          {filterBar}
          {activeFiltersRow}
        </div>

        {/* internal scroll container — ref'd for ResizeObserver + virtualizer */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {/* StarterPacksStrip remains ABOVE the virtualized region per CONTEXT
              Integration Points; gated as before on !filters.q && !isEditorReturn */}
          {!isFetching && !fetchError && !filters.q && !isEditorReturn && (
            <StarterPacksStrip onSelect={...} />
          )}

          {isFetching ? (
            <TemplateCardGrid columns={4}>{/* N skeletons */}</TemplateCardGrid>
          ) : fetchError ? (
            <EmptyState ... title="Couldn't load templates" ... />
          ) : allTemplates.length === 0 ? (
            <EmptyState ... title="No templates yet" ... />
          ) : filters.favorites && displayedTemplates.length === 0 ? (
            <EmptyState ... title="No favorites yet" ... />
          ) : displayedTemplates.length === 0 ? (
            <EmptyState ... title="No templates match your search" ... />
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

    <PackPreviewModal {...packModalState} ... />
  </PageLayout>
);
```

**State additions** (alongside existing `useState`/`useRef` cluster ~line 158-185):

```jsx
const scrollContainerRef = useRef(null);
const cols = useContainerColumns(scrollContainerRef); // D-01
```

---

### `src/design-system/components/TemplateCard.jsx` (MODIFY; component)

**Analog:** **self** — the `aspectClasses` map at lines 46–51 is **already correct** for D-02 masonry. RESEARCH Architecture Patterns §"TemplateCard.jsx — ALREADY supports orientation prop — no change needed" confirms this is a near-zero-op file in this phase.

**Existing aspect-aware rendering** (lines 45–71, ALREADY supports landscape / portrait / square):

```jsx
// src/design-system/components/TemplateCard.jsx:45-71
// Aspect ratio based on orientation
const aspectClasses = {
  landscape: 'aspect-video',
  portrait: 'aspect-[9/16]',
  square: 'aspect-square',
};
const aspectClass = aspectClasses[orientation] || 'aspect-video';

return (
  <div ref={ref} className={`group bg-white border border-gray-200 ...`} ...>
    {/* Preview Image */}
    <div className={`${aspectClass} bg-gray-100 relative overflow-hidden`}>
      {imageUrl && !imageError ? (
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" ... />
      ) : (
        <div className="w-full h-full flex items-center justify-center"> ... </div>
      )}
      {/* ... */}
    </div>
    {/* ... */}
  </div>
);
```

**What to verify, not change:**
- D-02 minimal change scope: confirm `displayedTemplates[i].orientation` reaches `<TemplateCard orientation={t.orientation} />` (already wired at `TemplateGalleryPage.jsx:771`).
- `TemplateCardSkeleton` (lines 187–208) still uses hard-coded `aspect-video`. **One narrow modification candidate:** parameterize the skeleton's aspect to match the loading-row mix (planner may opt to leave as-is if loading branch uses a fixed `aspect-video` skeleton block and SC-5 axe scan still passes — the skeleton branch renders BEFORE the masonry-mixed catalog is visible, so a uniform `aspect-video` skeleton is acceptable per RESEARCH OQ-3 (c)).

---

### `src/design-system/index.js` (MODIFY; barrel)

**Analog:** **self** — line 79 is the Template Components export line.

**Existing export pattern** (line 78-79):

```js
// src/design-system/index.js:78-79
// Template Components
export { TemplateCard, TemplateCardGrid, TemplateCardSkeleton } from './components/TemplateCard';
```

**Pattern decision:** `VirtualizedTemplateGrid` lives at `src/components/template-gallery/VirtualizedTemplateGrid.jsx`, NOT inside `src/design-system/components/`. **It should NOT be re-exported from `src/design-system/index.js`** — it's a page-specific composite, not a design-system primitive. CONTEXT line 108 says "add `VirtualizedTemplateGrid` re-export if extracted" — but the cleaner pattern (matching `StarterPacksStrip`, `PackCard`, `PackPreviewModal` which all live in `src/components/template-gallery/` and are NOT re-exported from the design-system barrel) is to import directly: `import VirtualizedTemplateGrid from '../components/template-gallery/VirtualizedTemplateGrid';`

**Recommendation:** **Do not modify `src/design-system/index.js`.** Planner can re-confirm or override.

---

### `package.json` (MODIFY; config)

**Analog:** **self** — `dependencies` block lines 34–58, `devDependencies` lines 59–86.

**Existing dependency-ordering convention** (alphabetical within each block):

```json
// package.json:34-58 — dependencies block sorted alphabetically by key
"dependencies": {
  "@aws-sdk/client-s3": "^3.946.0",
  "@aws-sdk/s3-request-presigner": "^3.946.0",
  "@sentry/react": "^10.36.0",
  "@supabase/supabase-js": "^2.80.0",
  // ... insert "@tanstack/react-virtual": "^3.13.24" here (between @supabase and date-fns)
  "date-fns": "^4.1.0",
  // ...
}
```

```json
// package.json:59-86 — devDependencies block sorted alphabetically by key
"devDependencies": {
  "@anthropic-ai/sdk": "^0.94.0",
  // ... insert "@axe-core/playwright": "^4.11.3" here (between @anthropic-ai and @eslint/js)
  "@eslint/js": "^9.36.0",
  // ...
}
```

**Install commands** (RESEARCH §Environment Availability):

```bash
npm install @tanstack/react-virtual
npm install --save-dev @axe-core/playwright
```

---

### `tests/e2e/template-gallery.spec.js` (MODIFY; E2E)

**Analog:** **self** — extend the existing `test.describe('Template Gallery (Phase 171)', ...)` block at line 41.

**Existing skip-guard + login pattern** (lines 41-49 — DO NOT duplicate):

```js
test.describe('Template Gallery (Phase 171)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });
  });

  // existing tests TGAL-01, TDSC-01, TDSC-03, TDSC-04, TGAL-05, Pitfall 1...
  // ADD new test() blocks for SC-3 (scroll reset + focus retention) + SC-4 (skeleton-flash gate)
});
```

**SC-3 scenario shape** (extend with new `test(...)` block — pattern matches existing TDSC-01 search test at lines 65–76):

```js
test('search filter resets grid scroll + retains input focus (SC-3)', async ({ page }) => {
  await gotoTemplates(page);
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });

  // scroll the internal grid container mid-catalog
  await page.locator('[role="grid"]').first().evaluate((el) => {
    el.parentElement.scrollTop = 800;
  });

  const search = page.getByPlaceholder('Search templates...');
  await search.focus();
  await search.fill('menu');

  // After fuse search: grid scroll resets, search keeps focus, no blank viewport
  await expect.poll(async () => {
    return await page.locator('[role="grid"]').first().evaluate((el) => el.parentElement.scrollTop);
  }, { timeout: 2000 }).toBe(0);

  await expect(search).toBeFocused();
  // Grid is still visible (no blank viewport)
  await expect(page.locator('[role="grid"]').first()).toBeVisible();
});
```

**SC-4 skeleton-flash gate** (extend the existing TDSC-04 case at lines 92–107 — add a skeleton-visible assertion BEFORE the chip assertion):

```js
test('URL-synced filters restore state with skeleton flash (TDSC-04 + SC-4)', async ({ page }) => {
  await gotoTemplates(page);
  const base = page.url().split('?')[0];
  await page.goto(`${base}?category=Restaurant`);

  // SC-4 addition: skeleton appears before the category chip resolves.
  // Loading branch renders <TemplateCardSkeleton/> blocks; assert at least one
  // is in the DOM during the first ~300ms.
  // (planner picks selector — e.g., a [data-testid="skeleton"] in TemplateCardSkeleton)

  await waitForPageReady(page);
  // Existing TDSC-04 assertions follow unchanged
  await expect(page.getByRole('button', { name: /Category: Restaurant/i })).toBeVisible();
});
```

---

## Shared Patterns

### Hook file convention (`src/hooks/<name>.js`)

**Source:** `src/hooks/useAbortSignal.js`, `src/hooks/useGalleryTour.js`, `src/hooks/useAdmin.js`, etc.
**Apply to:** `src/hooks/useContainerColumns.js`

- Single named export (no default): `export function useContainerColumns(ref) { ... }`
- File-level JSDoc header (3-5 lines describing purpose + key constraints + `@param`)
- Standard React imports first; project-internal imports second
- `useEffect` returns the cleanup function; never use `useLayoutEffect` unless layout-thrash mitigation is required

### Component file convention (page-scoped composites)

**Source:** `src/components/template-gallery/StarterPacksStrip.jsx`, `src/components/template-gallery/PackCard.jsx`, `src/components/template-gallery/PackPreviewModal.jsx`
**Apply to:** `src/components/template-gallery/VirtualizedTemplateGrid.jsx`

- Page-scoped composites live under `src/components/<page-slug>/`, NOT `src/design-system/components/`
- `export default function ComponentName({ props }) { ... }` (default export per existing template-gallery siblings)
- File-level JSDoc with phase tag + decision references (`D-02`, `SC-1`, etc.) + `@param` block
- Module-level constants ABOVE the component (e.g., `const OVERSCAN = 5;`, `const COL_BREAKPOINTS = [...]`)

### Vitest unit test convention

**Source:** `tests/unit/components/PackCard.test.jsx`, `tests/unit/hooks/useAbortSignal.test.js`, `tests/unit/hooks/useGalleryTour.test.js`
**Apply to:** Both new unit test files

- Imports order: `vitest` (describe/it/expect/vi) → `@testing-library/react` (render/screen/fireEvent OR renderHook/act) → component-under-test (relative path `../../../src/...`)
- File-level JSDoc with phase tag + plan tag + decision anchors (`174-CONTEXT.md §D-16`)
- `vi.mock(...)` calls are TOP-LEVEL (hoisted by vitest) — declare mock state vars BEFORE the `vi.mock` block
- `beforeEach` for state reset (`vi.clearAllMocks()`, DOM setup, dynamic imports)
- Assertions use `expect(...).toHaveAttribute('aria-rowcount', '5')` or `container.querySelector(...)` — both shapes are present in `PackCard.test.jsx`

### Playwright E2E spec convention

**Source:** `tests/e2e/template-gallery.spec.js`, `tests/e2e/admin-template-queue.spec.js`
**Apply to:** `tests/e2e/template-gallery-perf.spec.js`, `tests/e2e/template-gallery-axe.spec.js`, modifications to `tests/e2e/template-gallery.spec.js`

- File-level JSDoc explaining coverage IDs (SC-2 / SC-3 / SC-4 / SC-5) + skip-guard rationale
- Imports: `import { test, expect } from '@playwright/test';` then `import { loginAndPrepare, waitForPageReady } from './helpers.js';`
- **Skip-guard at describe level** when env creds are required: `test.skip(() => !process.env.TEST_USER_EMAIL, 'Test credentials not configured');`
- `test.beforeEach` invokes `loginAndPrepare(page, { email: ..., password: ... })`
- Local `gotoTemplates(page)` helper inlined per-file (the shared `navigateToSection` helper does NOT have a templates branch — documented at `template-gallery.spec.js:21-25`)
- Selectors prefer `getByRole`, `getByText`, `getByPlaceholder`, and `getByTestId` over CSS selectors
- Structural-only assertions per **TQAL-05**: NO exact `toHaveCount(N)` for templates; only `toHaveCount(0)` is allowed (for absence-of-error-toast checks)

### Render-branch ordering (Pattern I)

**Source:** `src/pages/TemplateGalleryPage.jsx:619-727` — comment at line 619 names the pattern explicitly
**Apply to:** `src/pages/TemplateGalleryPage.jsx` restructure

The 5 render branches MUST keep this precedence (FavoritesEmpty BEFORE generic NoResults — see line 681 comment "precedence: checked BEFORE the generic no-results branch"):

1. `isFetching` → Skeleton block
2. `fetchError` → Error EmptyState + retry
3. `allTemplates.length === 0` → Zero-content EmptyState
4. `filters.favorites && displayedTemplates.length === 0` → Favorites-empty EmptyState
5. `displayedTemplates.length === 0` → No-results EmptyState
6. else → VirtualizedTemplateGrid (content branch)

### URL-sync invariant (DO NOT TOUCH)

**Source:** `src/pages/TemplateGalleryPage.jsx:158-185` (filter state via `useSearchParams`)
**Apply to:** All page modifications

`searchParams.get('q' | 'category' | 'orientation' | 'favorites' | 'sort')` is the v20.0 contract. Phase 179 changes the render strategy, not the URL contract. SC-4 explicitly preserves this. The virtualizer sits one layer below the URL-sync logic.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/e2e/template-gallery-perf.spec.js` (CDP throttle + `performance.mark` portion) | E2E perf | request-response | No existing Playwright spec in the repo uses `context.newCDPSession()` or `performance.mark`. The login/navigation shell has an analog (`template-gallery.spec.js`), but the perf-instrumentation portion is greenfield — use RESEARCH §Code Examples Example 1 as the source. |
| `tests/e2e/template-gallery-axe.spec.js` (axe-core scan portion) | E2E a11y | request-response | No existing `AxeBuilder` usage in repo (`@axe-core/playwright` is a NEW dev dependency). The login/navigation shell has an analog (`template-gallery.spec.js`), but the axe-scan portion is greenfield — use RESEARCH §Code Examples Example 2 as the source. |

Both files use the existing E2E spec shell as their skeleton and add the new instrumentation from RESEARCH. Planner should pin to the verified Playwright + CDP + axe-core patterns in RESEARCH §Code Examples.

---

## Metadata

**Analog search scope:**
- `src/hooks/` (15 files)
- `src/components/template-gallery/` (3 files)
- `src/design-system/components/` (target: TemplateCard, EmptyState, Card primitives)
- `src/pages/TemplateGalleryPage.jsx` (801 LOC — primary integration site)
- `src/ScaledStage.jsx` (sole ResizeObserver pattern in codebase)
- `tests/unit/components/` (FavoriteButton, PackCard)
- `tests/unit/hooks/` (useAbortSignal, useGalleryTour, useAdmin, useAuditLogs)
- `tests/e2e/` (template-gallery, admin-template-queue, scenes — for skip-guard precedent)

**Files scanned:** ~25 high-signal files (early-stopped per analog-quality threshold)

**Pattern extraction date:** 2026-05-10

**Key cross-cutting insight:** The ResizeObserver pattern in `src/ScaledStage.jsx:22-32` is the **single** RO usage in the codebase — copying it verbatim into `useContainerColumns` is the highest-fidelity analog available, and the RESEARCH document explicitly cites these lines as the source. Likewise the `TemplateCard` `aspectClasses` map at lines 46–51 means D-02 masonry needs **no actual modification** to `TemplateCard.jsx` (the `orientation` prop is already shipped from Phase 178 D-10) — the masonry behavior emerges purely from the new `VirtualizedTemplateGrid`'s `align-items: start` CSS plus the existing per-card aspect class.

---

*Phase: 179-gallery-virtualization-launch-validation*
*Patterns mapped: 2026-05-10*
*Author: gsd-phase-pattern-mapper (Claude Opus 4.7 / 1M context)*
