---
phase: 170-data-layer-foundation
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - .env.example
  - scripts/smoke-template-gallery.mjs
  - src/components/svg-editor/FabricSvgEditor.jsx
  - src/services/svgTemplateService.js
  - src/services/templateGalleryService.js
  - supabase/migrations/167_gallery_templates_view_and_rls.sql
  - tests/e2e/helpers/tenantB.js
  - tests/e2e/template-gallery-rls.spec.js
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 170: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This phase introduces the `gallery_templates` Postgres VIEW (migration 167), wires `templateGalleryService.fetchGalleryTemplates` as the sole data-access point, migrates `svgTemplateService.fetchSvgTemplates` to delegate through it, and adds a skeleton cross-tenant RLS smoke test. The approach is sound and the RLS fix is necessary. Two critical issues were found: a SQL injection vector in the search path of `templateGalleryService`, and a broken RLS policy that continues to block system-global templates from being readable by unauthenticated (or anonymous) callers while simultaneously failing to fully close the cross-tenant leak for rows that are `tenant_id IS NOT NULL` but `created_by != auth.uid()`. Five warnings cover logic errors in the undo/redo history, a silent insert failure in `saveUserSvgDesign`, an unsanitized `window.prompt` URL being loaded as a canvas image, a missing `await` on undo/redo canvas loads, and a stale closure in `saveToHistory`. Four info items cover debug `console.log` statements, a dead comment block in the smoke script, skeleton-only E2E assertions, and a magic number.

---

## Critical Issues

### CR-01: SQL injection via unescaped search term in PostgREST `or=` filter

**File:** `src/services/templateGalleryService.js:60-61`
**Issue:** The search term is inserted directly into a PostgREST `or=` filter string after only stripping `,()` characters. An attacker who controls the `search` parameter can inject arbitrary PostgREST filter syntax. For example, the string `%25 OR id=not.null` breaks out of the `ilike` predicate and causes all active rows to be returned regardless of the caller's intent. While PostgREST's server-side validation limits blast radius compared to raw SQL, filter injection still allows data exfiltration beyond the intended query scope (e.g., bypassing category/orientation filters).

```js
// CURRENT (vulnerable):
const s = search.trim().replace(/[,()]/g, ' ');
query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);

// FIX — use separate chained .ilike() calls, which PostgREST escapes properly,
// or use .textSearch() for full-text search. The simplest safe fix:
query = query.or(
  `name.ilike.${encodeURIComponent(`%${s}%`)},description.ilike.${encodeURIComponent(`%${s}%`)}`
);
// Better — avoid string interpolation entirely:
query = query
  .ilike('name', `%${s}%`)  // PostgREST client escapes this correctly
  // Can't AND two ILIKE on different columns through the chained API;
  // use .or() with properly escaped identifiers, or add a generated column.
  // The safest path is a Postgres function / RPC that takes `search text` as a bound param.
```

---

### CR-02: RLS policy still exposes non-global tenant rows to other tenants under specific conditions

**File:** `supabase/migrations/167_gallery_templates_view_and_rls.sql:39-45`
**Issue:** The new `svg_templates_select` policy is:

```sql
USING (
  is_active = TRUE
  AND (tenant_id IS NULL OR created_by = auth.uid())
)
```

This correctly closes the leak for rows where `tenant_id IS NOT NULL AND created_by != auth.uid()`. However, a row where `tenant_id IS NOT NULL AND created_by = auth.uid()` is visible — which is intentional — but a row where `tenant_id IS NOT NULL AND created_by IS NULL` (system-seeded rows that are tenant-scoped, if any exist from earlier migrations) becomes invisible to everyone, silently. More critically: the VIEW is not `SECURITY DEFINER`, which is correct per the comment, but the `gallery_templates` VIEW inherits RLS from `svg_templates`. An **anonymous** (unauthenticated) Supabase caller with the `anon` role will receive zero rows from the VIEW because the policy is `TO authenticated` only. The smoke script (`scripts/smoke-template-gallery.mjs`) creates an **anonymous** client (no sign-in) and queries the VIEW directly. This means the smoke test passes today only if the `anon` role has a separate policy, which is not defined here. If the intent is that global templates (`tenant_id IS NULL`) are publicly readable (as suggested by the old policy "Anyone can read active global svg templates"), a separate `anon` SELECT policy is needed:

```sql
-- Add alongside the authenticated policy:
CREATE POLICY "svg_templates_anon_global_select" ON svg_templates
  FOR SELECT
  TO anon
  USING (
    is_active = TRUE
    AND tenant_id IS NULL
  );
```

Without this, the smoke script will silently return 0 rows on a fresh DB after the migration runs (the `createClient` call in line 38 of the smoke script uses only the anon key and does not sign in), which the smoke script's `Array.isArray(data)` check passes (empty array is still an array), making the test produce a false-positive `OK: fetchGalleryTemplates returned 0 rows`.

---

## Warnings

### WR-01: `saveToHistory` stale closure causes undo history to be silently truncated

**File:** `src/components/svg-editor/FabricSvgEditor.jsx:258-275`
**Issue:** `saveToHistory` is a `useCallback` with `[historyIndex]` in its dependency array. At the same time it is called from inside the `useEffect` that registers Fabric canvas event listeners (line 195-214), which has `[canvasWidth, canvasHeight]` as its dependency array and does NOT re-run when `historyIndex` changes. This means the `historyIndex` captured in `saveToHistory` by the canvas `object:added` / `object:modified` / `object:removed` event listeners is always the value from the time the canvas was initialized (typically `-1`). As a result, `prev.slice(0, historyIndex + 1)` always computes `prev.slice(0, 0)`, so every history save truncates the entire existing history array and appends a single entry. Undo/redo state is therefore always limited to one step after the first interaction.

**Fix:** Move `historyIndex` tracking into a `useRef` so it is always current inside event handler closures, or use the functional updater form throughout:

```js
const historyIndexRef = useRef(-1);

const saveToHistory = useCallback(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  const json = JSON.stringify(canvas.toJSON(['id', 'name', 'selectable', 'evented']));
  setHistory(prev => {
    const newHistory = prev.slice(0, historyIndexRef.current + 1);
    newHistory.push(json);
    if (newHistory.length > 50) newHistory.shift();
    historyIndexRef.current = newHistory.length - 1;
    return newHistory;
  });
}, []); // no dependencies needed
```

---

### WR-02: Missing `await` on `canvas.loadFromJSON` in `handleUndo` / `handleRedo`

**File:** `src/components/svg-editor/FabricSvgEditor.jsx:551-556` and `570-575`
**Issue:** Both `handleUndo` and `handleRedo` call `canvas.loadFromJSON(json).then(...)`. In Fabric.js v6, `loadFromJSON` returns a `Promise`. If the promise rejects (e.g., due to a corrupt history entry), `isUndoRedoAction.current` is never reset to `false`, which permanently silences all subsequent `object:added`/`object:modified` history saves for the session. Additionally, `.then()` without a `.catch()` creates an unhandled promise rejection.

**Fix:**
```js
const handleUndo = useCallback(async () => {
  if (historyIndex <= 0) return;
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  isUndoRedoAction.current = true;
  const newIndex = historyIndex - 1;
  try {
    await canvas.loadFromJSON(JSON.parse(history[newIndex]));
    canvas.renderAll();
    setHistoryIndex(newIndex);
  } catch (err) {
    console.error('Undo failed:', err);
  } finally {
    isUndoRedoAction.current = false;
    setHasUnsavedChanges(true);
  }
}, [history, historyIndex]);
```

Apply the same pattern to `handleRedo`.

---

### WR-03: `saveUserSvgDesign` silently swallows the error from `svg_templates` insert on new design creation

**File:** `src/services/svgTemplateService.js:371-393`
**Issue:** When creating a new design (the `else` branch starting at line 371), `supabase.from('svg_templates').insert(...)` is called without `await` and without checking its error return. If the insert fails (e.g., RLS denial, constraint violation), the function returns the successfully-created `layouts` row and the caller has no indication that the `svg_templates` entry was not created. This means the playlist library silently loses the user's custom design entry.

**Fix:**
```js
const { error: tplError } = await supabase
  .from('svg_templates')
  .insert({ ... });
if (tplError) {
  // Non-fatal but should be surfaced — log and optionally re-throw
  console.warn('saveUserSvgDesign: svg_templates insert failed', tplError.message);
}
```

---

### WR-04: `window.prompt`-supplied URLs are loaded as canvas images without any validation

**File:** `src/components/svg-editor/FabricSvgEditor.jsx:1327-1353`
**Issue:** In the `overlay` widget case, the user-supplied URL from `window.prompt` is passed directly to `fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })` without any URL validation. This allows loading of arbitrary `file://`, `data:`, or `javascript:` URIs. While browser security limits `javascript:` in image loads, `file://` paths can be used to probe local file system existence (the error vs success path differs), and `data:` URIs with large blobs can cause memory exhaustion.

**Fix:** Validate that the URL starts with `http://` or `https://` before passing it to Fabric:
```js
const imageUrl = window.prompt('Enter image URL:', 'https://');
if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
  fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then(...);
} else if (imageUrl) {
  showToast?.('Only http/https URLs are supported', 'error');
}
```

The same issue exists at line 1075-1077 in `handleAddImageFromUrl` (called from the stock photos flow), but that path receives a URL from an internal component rather than direct user text input, so it is lower priority.

---

### WR-05: `svg_templates` UPDATE in `saveUserSvgDesign` is also missing `await` and error check

**File:** `src/services/svgTemplateService.js:348-359`
**Issue:** In the update-existing-design branch (line 348), the `supabase.from('svg_templates').update(...)` call is not awaited and its error is not checked. The same silent failure risk applies as WR-03.

**Fix:**
```js
const { error: updateTplError } = await supabase
  .from('svg_templates')
  .update({ ... })
  .eq('metadata->>layoutId', id)
  .eq('created_by', user.id);
if (updateTplError) {
  console.warn('saveUserSvgDesign: svg_templates update failed', updateTplError.message);
}
```

---

## Info

### IN-01: Dead comment block in smoke script adds noise but does nothing

**File:** `scripts/smoke-template-gallery.mjs:20-25`
**Issue:** The `if (typeof globalThis.importMeta === 'undefined')` block contains only a comment and no executable code. The comment promises a shim that is never actually implemented. This is misleading — a reader expects the block to have a side effect.

**Fix:** Remove the entire dead block (lines 20-25) since the script already bypasses the Vite `import.meta.env` problem by using `@supabase/supabase-js` directly.

---

### IN-02: E2E RLS tests are pure skeletons with no real assertions

**File:** `tests/e2e/template-gallery-rls.spec.js:28-37`
**Issue:** Both tests assert only that the page body is visible and fire a `.catch(() => {})` on the error-toast count check, meaning the assertion can never fail. The comment says "Plan 02 fills in the exact assertion" but the skeleton currently produces a false-green signal in CI — it will always pass even if the RLS policy is broken.

**Fix:** Either add a `test.fixme()` marker so the intent is visible, or keep the skip guard for missing credentials and add at minimum a `page.waitForLoadState('networkidle')` plus a real card-count assertion against the seeded 12 global templates.

---

### IN-03: Multiple `console.log` debug statements in production service code

**File:** `src/services/svgTemplateService.js:59`, `src/services/svgTemplateService.js:302`, `src/services/svgTemplateService.js:306`
**File:** `src/components/svg-editor/FabricSvgEditor.jsx:285`, `292`, `331`, `335`, `370`, `404`, `413`, `533`
**Issue:** Many `console.log` calls are present in production paths — thumbnail upload confirmation, JSON load details, SVG loading progress, widget add confirmation. These expose internal state to the browser console and add noise.

**Fix:** Guard behind a `DEBUG` flag or remove. Warnings and errors (`console.warn`, `console.error`) are appropriate to keep.

---

### IN-04: Magic number `50` for history limit used inconsistently

**File:** `src/components/svg-editor/FabricSvgEditor.jsx:268-274`
**Issue:** The history array is capped at 50 entries (`if (newHistory.length > 50) { newHistory.shift(); }`) but `setHistoryIndex(prev => Math.min(prev + 1, 49))` uses `49` as the cap. If history ever reaches exactly 50 entries and an item is shifted, the index `49` now points past the end of the 49-entry shifted array.

**Fix:** Extract a constant and ensure the cap is consistent:
```js
const MAX_HISTORY = 50;
// In saveToHistory:
if (newHistory.length > MAX_HISTORY) newHistory.shift();
// setHistoryIndex cap:
setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
```

Note: this is a secondary concern compared to WR-01 (stale closure) which already breaks multi-step undo; both should be fixed together.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
