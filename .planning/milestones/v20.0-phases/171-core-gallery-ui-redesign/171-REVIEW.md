---
phase: 171-core-gallery-ui-redesign
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/App.jsx
  - src/pages/TemplateGalleryPage.jsx
  - src/services/svgTemplateService.js
  - tests/e2e/helpers.js
  - tests/e2e/template-gallery.spec.js
  - tests/fixtures/galleryTemplates.js
  - tests/setup.js
  - tests/unit/pages/TemplateGalleryPage.test.jsx
  - tests/unit/pages/templateMarketplaceAlias.test.jsx
  - vitest.config.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 171: Code Review Report

**Reviewed:** 2026-04-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 171 introduces `TemplateGalleryPage.jsx` (569 LOC) and re-points three App.jsx pageMap aliases (`templates`, `template-marketplace`, `svg-templates`) from the deleted `SvgTemplateGalleryPage` to the new component. The data contract correctly consumes raw snake_case VIEW rows from `fetchGalleryTemplates` without re-shaping — matching the Phase 170 service boundary. Pattern coverage (D/E/F/G/H/I/K from 171-PATTERNS.md) is present. No security issues (no XSS, injection, unsafe deserialization, or RLS bypass) and no data-loss risks were found.

Four user-facing / correctness concerns warrant attention before Phase 172 wiring lands:

1. A hover "Use Template" button renders on every card but wires to a no-op handler, surfacing a dead-end UI path in production.
2. "Recently Used" sort is exposed in the dropdown but the localStorage writer is deferred to Phase 172 — today the option silently aliases to "Newest" tiebreak ordering.
3. The URL→input sync effect only handles the clear case, so external URL changes with a non-empty `q` leave the search box stale.
4. The `popularityThreshold` math does not match the docstring's "top 20%" claim for catalogs with a single non-zero `use_count` or small datasets — behaviour is defensible but documentation is misleading.

The unit test file is well-structured and the E2E spec follows the stated structural-only assertion contract (no exact-count checks). One minor test discrepancy noted in Info.

## Warnings

### WR-01: `onSelect` no-op surfaces a dead-end "Use Template" button on every card

**File:** `src/pages/TemplateGalleryPage.jsx:557-559`
**Issue:** `<TemplateCard onSelect={() => { /* Phase 172 wires... */ }} />` passes a handler, but the design-system `TemplateCard` (src/design-system/components/TemplateCard.jsx:60-64, 97-103) treats a truthy `onSelect` as "card is interactive" — it adds `cursor-pointer`, a click handler, AND renders a visible "Use Template" button on hover (via `{onSelect && <Button>...}`). The default `actionLabel="Use Template"` is used. Result: every card in production shows a clickable button that does nothing. Users will click it, see no feedback, and assume the app is broken. This is the user-facing analog of the "dead code path" anti-pattern.
**Fix:** Pass no handler at all so the card renders in its non-interactive state until Phase 172 wires the flow:
```jsx
<TemplateCard
  title={t.name}
  description={t.description}
  imageUrl={t.thumbnail}
  orientation={t.orientation}
  // onSelect intentionally omitted — wired in Phase 172
/>
```
Alternatively, if the card must remain clickable for discovery, show a toast on click via the already-accepted `showToast` prop: `onSelect={() => showToast?.('Preview coming soon', 'info')}` — this also removes the need for the `void showToast;` line.

### WR-02: "Recently Used" sort option is exposed but Recently Used writer is deferred to Phase 172

**File:** `src/pages/TemplateGalleryPage.jsx:74-81, 282-288, 380`
**Issue:** `readRecentlyUsed(userId)` reads the `bizscreen:recentTemplates:<uid>` key, but no code path in this phase writes to that key (the write is part of the Phase 172 apply flow). The Sort dropdown at line 380 exposes `<option value="recent">Recently Used</option>`. With no writes, `usage[id]` is always `undefined` → coerces to `0` for every row → tiebreak always wins → the "Recently Used" sort is behaviourally identical to "Newest" for every user. This is a silent UX degradation (user selects a feature, sees no effect). Unit test `sort changes order` at line 161 only asserts alpha, so there is no test coverage preventing this ship.
**Fix:** Either (a) drop the `<option value="recent">` from the Select in Phase 171 and add it in Phase 172 when the writer lands, or (b) add a visible annotation (disabled option with "(coming soon)" label) so the user understands the state. Option (a):
```jsx
<Select value={filters.sort} onChange={...}>
  <option value="newest">Newest</option>
  <option value="popular">Most Popular</option>
  <option value="alpha">Alphabetical</option>
  {/* 'recent' sort deferred to Phase 172 — requires localStorage writer */}
</Select>
```
If (a), also delete the unused `readRecentlyUsed` + `RECENT_KEY` helpers to keep the module lean.

### WR-03: URL→input sync effect misses the "external URL change to non-empty `q`" case

**File:** `src/pages/TemplateGalleryPage.jsx:181-188`
**Issue:** The effect only copies the URL `q` into the input when `urlQ === '' && searchInput !== ''` (the clear case). If a user navigates to `/app/templates?q=pizza` via a deep link or browser back/forward from a page with a different query, the filter pipeline applies `pizza` to results but the `<input>` still shows whatever the old local state was (empty on fresh mount, stale on in-page navigation). The mount-time initializer `useState(() => searchParams.get('q') ?? '')` handles the initial case, but subsequent URL-only changes leak the divergence.
**Fix:** Sync in both directions when the URL changes, guarding against the typing-loop by checking for inequality with the current input:
```jsx
useEffect(() => {
  const urlQ = searchParams.get('q') ?? '';
  if (urlQ !== searchInput) {
    // Pending debounce would overwrite us — cancel it first
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchInput(urlQ);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);
```
This still avoids the typing-loop because `onSearchChange` updates `searchInput` synchronously and the debounced URL write happens 150ms later; by the time `searchParams` reflects the write, `searchInput === urlQ` and the branch skips.

### WR-04: `popularityThreshold` computation diverges from the "top-20%" docstring in common edge cases

**File:** `src/pages/TemplateGalleryPage.jsx:240-254`
**Issue:** The docstring says "Top-20% popularity threshold", and the fixture comment in `tests/fixtures/galleryTemplates.js:19` asserts "top-20% = 2 rows earn Popular" for 10 rows. The implementation does `counts.sort(desc); idx = floor(counts.length * 0.2); threshold = counts[idx]`, where `counts` has already been filtered to `n > 0`. Two issues:
  - For the fixture dataset (10 rows, one with `use_count=0`), `counts.length = 9`, `idx = floor(9 * 0.2) = 1`, so threshold = `counts[1]` = 2nd-highest = 60. Rows r7 (60) and r10 (100) qualify. The fixture comment happens to be correct but only by accident — the comment assumes `floor(10 * 0.2) = 2` → top-2 rows, which is a different computation.
  - For a catalog with only 1 non-zero `use_count` (e.g., fresh install, one template applied once), `counts.length = 1`, `idx = 0`, threshold = that single count. Every row with `use_count >= that` (just itself) gets "Popular" — which is defensible but reads as "every non-zero row is popular" on sparse data. With 2 non-zero rows, `idx = floor(2*0.2) = 0`, threshold = highest count → BOTH rows qualify if tied, otherwise only the single top one. The math is jagged for small N.
**Fix:** Either correct the docstring to describe the actual behaviour ("threshold set to the (floor(N*0.2)+1)-th highest non-zero use_count") OR implement the described behaviour by selecting the top-ceil(N*0.2) set:
```jsx
const popularityThreshold = useMemo(() => {
  const counts = allTemplates.map((t) => t.use_count ?? 0).filter((n) => n > 0);
  if (counts.length === 0) return Infinity;
  counts.sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(counts.length * 0.2));
  return counts[topCount - 1]; // the N-th highest use_count
}, [allTemplates]);
```
`ceil` gives at least 1 row for any non-empty non-zero set and is closer to the "top 20%" user expectation. Also, add a minimum-N guard (e.g., require `counts.length >= 5` before showing ANY "Popular" badge) to avoid the "every non-zero row is popular" on tiny catalogs.

## Info

### IN-01: Unused prop suppression via `void` is non-idiomatic

**File:** `src/pages/TemplateGalleryPage.jsx:100-101`
**Issue:** `void showToast; void onNavigate;` silences unused-variable lint but reads as unusual. If Phase 172 forgets to wire these, a standard lint pass would catch it; the `void` statement disables that signal.
**Fix:** Remove the `void` statements. Either consume the props (see WR-01's toast suggestion) or omit them from the destructure until Phase 172 needs them. If silencing lint is required, use an eslint-disable-next-line comment so the reason is explicit.

### IN-02: `DAY_MS` magic number duplicated

**File:** `src/pages/TemplateGalleryPage.jsx:90`, `tests/fixtures/galleryTemplates.js:44, 63, 72, 81, 90, 99, 108, 117, 126, 135, 144`
**Issue:** `86_400_000` appears once in product code and 10 times in the fixture. The product file already has the good pattern (`NEW_BADGE_WINDOW_DAYS` constant); extracting `DAY_MS = 86_400_000` would match precedent.
**Fix:** Add `const DAY_MS = 86_400_000;` at module scope in both files and reference it (`NEW_BADGE_WINDOW_DAYS * DAY_MS`, `Date.now() - 10 * DAY_MS`).

### IN-03: Loading-branch title renders without a filter-count description (UX subtlety)

**File:** `src/pages/TemplateGalleryPage.jsx:443-461`
**Issue:** The loading branch passes `<PageHeader title="Templates" />` (no description), while the content/no-results branches pass `description={pageDescription}`. The header flicker on load may be perceived as the description "appearing" after fetch completes, which is a minor layout shift. The top-line `pageDescription` variable is defined at line 443 but only used in non-loading branches.
**Fix:** Inline the description computation into the content/no-results branches or render a placeholder ("Loading templates…") during fetch. Non-blocking.

### IN-04: Unit test for sort=alpha only checks the first heading

**File:** `tests/unit/pages/TemplateGalleryPage.test.jsx:158-168`
**Issue:** The test asserts `names[0]` matches "Birthday Bash" but doesn't verify the second or last element, so a regression that accidentally shuffles the middle (e.g., `localeCompare(b, a)` typo) would still pass as long as the minimum stays first. Given alphabetical is a simple deterministic ordering, asserting `names` joined equals the expected sequence would be stronger with negligible cost.
**Fix:** Assert the full sequence:
```jsx
const names = screen.getAllByRole('heading', { level: 3 }).map((n) => n.textContent);
expect(names).toEqual([
  'Birthday Bash', 'Chef Special', 'Clearance Flyer', 'Corporate Slides',
  'Grand Opening Poster', 'Happy Hour Special', 'Holiday Event',
  'Neon Deal Poster', 'Restaurant Menu', 'Summer Sale Banner',
]);
```

### IN-05: E2E test `gotoTemplates` helper is duplicated logic, not in `helpers.js`

**File:** `tests/e2e/template-gallery.spec.js:33-39`, `tests/e2e/helpers.js:144-283`
**Issue:** The spec's docstring explicitly notes that `navigateToSection` has no 'templates' branch and that adding one was considered out of scope. That's a reasonable decision, but the inline helper `gotoTemplates` duplicates the pattern used internally by the `layouts` branch (lines 168-177). If future templates E2E specs are added, each will re-inline this. Minor — Phase 171 only has one E2E file.
**Fix:** When a second templates E2E spec is added, promote `gotoTemplates` into `helpers.js` as a `templates` case in `navigateToSection`. No action required for Phase 171.

---

_Reviewed: 2026-04-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
