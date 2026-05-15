---
phase: 166-template-quick-customize
reviewed: 2026-04-12T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/components/QuickCustomizePanel.jsx
  - src/components/TemplatePreviewModal.jsx
  - src/pages/TemplateMarketplacePage.jsx
  - src/services/marketplaceService.js
  - src/services/svgCustomizeService.js
  - tests/unit/services/svgCustomize.test.js
  - tests/e2e/template-marketplace.spec.js
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 166: Code Review Report

**Reviewed:** 2026-04-12T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the Quick Customize feature: SVG customization service, QuickCustomizePanel component, TemplatePreviewModal integration, marketplace page, marketplace service, unit tests, and E2E tests. The SVG customization service is well-structured with proper XSS protection in `updateText()`. However, the preview rendering in QuickCustomizePanel bypasses that protection by using `dangerouslySetInnerHTML` to render the full serialized SVG. Two warnings around state management bugs were also found, plus minor code quality items.

## Critical Issues

### CR-01: XSS via dangerouslySetInnerHTML rendering unsanitized SVG

**File:** `src/components/QuickCustomizePanel.jsx:188`
**Issue:** The SVG preview is rendered using `dangerouslySetInnerHTML={{ __html: svgPreview }}`. While `updateText()` correctly uses `textContent` to prevent injection in text mutations, the entire SVG document (sourced from `detail.metadata.svgContent`) is rendered directly into the DOM without sanitization. SVG supports inline `<script>` tags, event handler attributes (`onload`, `onerror`, `onclick`), and `<foreignObject>` elements that can contain arbitrary HTML. If a malicious or compromised template contains these, they will execute in the user's browser context. This is a stored XSS vector -- any admin who can create templates can inject scripts that run for all users who preview them.
**Fix:** Sanitize the SVG before rendering. Use DOMPurify with SVG-specific configuration:
```jsx
import DOMPurify from 'dompurify';

// In the render:
const sanitizedSvg = DOMPurify.sanitize(svgPreview, {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: ['script', 'foreignObject'],
  FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
});

<div
  className="w-full h-full flex items-center justify-center"
  dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
/>
```
Alternatively, render the SVG inside an `<iframe>` with `sandbox=""` attribute or use an `<img>` tag with a `data:image/svg+xml` src (which prevents script execution).

## Warnings

### WR-01: `applying` state never reset on success path

**File:** `src/components/QuickCustomizePanel.jsx:142-161`
**Issue:** In `handleApply`, `setApplying(true)` is called at line 149, but `setApplying(false)` only appears in the `catch` block (line 160). On the success path, `onSuccess?.(sceneId)` is called but `applying` is never set back to `false`. If the parent component does not immediately unmount the panel (e.g., if `onSuccess` is undefined or performs async work before closing), the button remains stuck in the "Creating Scene..." disabled state with no way to retry.
**Fix:** Add `setApplying(false)` in a `finally` block or before calling `onSuccess`:
```jsx
const handleApply = async () => {
  if (!detail?.canAccess) {
    setError('Access denied. Please check your plan.');
    return;
  }

  setApplying(true);
  setError(null);

  try {
    const finalSvg = serializeSvg(svgDoc);
    const sceneName = template.name;
    const sceneId = await installWithCustomization(template.id, sceneName, finalSvg);
    setApplying(false);
    onSuccess?.(sceneId);
  } catch (err) {
    console.error('Failed to apply customization:', err);
    setError(err.message || 'Failed to create scene');
    setApplying(false);
  }
};
```

### WR-02: Missing `search` in useEffect dependency array for debounced search

**File:** `src/pages/TemplateMarketplacePage.jsx:80-87`
**Issue:** The debounced search effect at line 80 compares `searchInput !== search` inside the callback, but the dependency array only includes `[searchInput]`. Since `search` (derived from URL params) is not in the dependency array, the effect captures a stale `search` value. If the URL is updated externally (e.g., browser back/forward), the comparison may be incorrect, causing either unnecessary API calls or missed updates.
**Fix:** Add `search` to the dependency array:
```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchInput !== search) {
      updateFilters({ q: searchInput || null });
    }
  }, 300);
  return () => clearTimeout(timer);
}, [searchInput, search]);
```

## Info

### IN-01: Unused `toast` state in QuickCustomizePanel

**File:** `src/components/QuickCustomizePanel.jsx:48`
**Issue:** The `toast` state and `<Toast>` component (lines 48, 301-306) are declared but never triggered -- `setToast` is never called with `show: true` anywhere in the component. This is dead code.
**Fix:** Either remove the unused toast state and JSX, or wire it up to show a success message after Apply completes.

### IN-02: Unused import `getEffectiveOwnerId`

**File:** `src/services/marketplaceService.js:9`
**Issue:** `getEffectiveOwnerId` is imported from `tenantService` but never used anywhere in the file.
**Fix:** Remove the unused import:
```js
import { supabase } from '../supabase';
// Remove: import { getEffectiveOwnerId } from './tenantService';
```

### IN-03: Console.error statements in production code

**File:** `src/components/QuickCustomizePanel.jsx:75`, `src/components/TemplatePreviewModal.jsx:53,73`, `src/pages/TemplateMarketplacePage.jsx:68`
**Issue:** Multiple `console.error` calls are present in catch blocks. While useful during development, these leak internal error details to the browser console in production.
**Fix:** Replace with a structured logging utility or remove if error state is already being set for the UI. At minimum, guard behind an environment check or use a project-level logger.

---

_Reviewed: 2026-04-12T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
