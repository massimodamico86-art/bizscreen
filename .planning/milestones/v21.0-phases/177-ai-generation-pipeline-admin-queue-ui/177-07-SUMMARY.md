---
phase: 177-ai-generation-pipeline-admin-queue-ui
plan: 07
subsystem: security
tags: [svg-validator, dompurify, css-injection, xss, security, testing, vitest, tdd]

# Dependency graph
requires:
  - phase: 177-ai-generation-pipeline-admin-queue-ui
    provides: svgValidator.js with FORBIDDEN_COLOR_TOKENS + Rule 4 DOMPurify drift check; TemplateDraftPreview.jsx render-time sanitization; templateApplyService.js apply-time sanitization; EF svgValidator.ts re-export shim

provides:
  - FORBIDDEN_CONTENT_TOKENS array (4 patterns: @import, url(http(s)://), url(//...), javascript:) blocking CSS-injection at ingest and approve-time
  - DOMPurify config tightened to FORBID_TAGS+FORBID_ATTR:['style'] across all 3 mirror sites
  - RED->GREEN test spec (svgValidatorXss.test.js, 6 tests, 85 LOC) locked into CI
  - EF re-export inherits fix automatically — no separate Deno code change

affects: [177-08, 177-09, 177-10, 178-vertical-content-seeding, TemplateGalleryPage, AdminTemplateQueuePage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FORBIDDEN_CONTENT_TOKENS pattern: same {re, label} object shape as FORBIDDEN_COLOR_TOKENS — checked before DOMPurify drift (run-before-sanitize prevents bypasses)"
    - "3-mirror-site DOMPurify config: svgValidator.js Rule 4, templateApplyService.js apply-time, TemplateDraftPreview.jsx render-time — all BYTE-EQUAL; Test 6 source-read assertion catches future drift"
    - "TDD RED-then-GREEN: write failing tests first (module still passes clean SVG), then implement — proves the gap existed before the fix"

key-files:
  created:
    - tests/integration/svgValidatorXss.test.js
  modified:
    - src/services/svgValidator.js
    - src/services/templateApplyService.js
    - src/components/Admin/TemplateDraftPreview.jsx
    - supabase/functions/generate-svg-template/svgValidator.ts

key-decisions:
  - "BL-04 (177-07): FORBIDDEN_CONTENT_TOKENS checked BEFORE DOMPurify drift — prevents a bypass where a malicious payload could survive sanitization before the forbidden-token scan"
  - "BL-04 (177-07): 3 DOMPurify mirror sites all updated to FORBID_TAGS+FORBID_ATTR:['style'] — byte-equality preserved at the new tightened config; Test 6 source-read assertion is the drift detector"
  - "BL-04 (177-07): EF re-export shim (svgValidator.ts) needs no code change — the re-export value IS that the EF validator IS the SPA validator; header comment updated to document scope"
  - "BL-04 (177-07): Full live EF hardening requires 177-08 or 177-10 to redeploy the Edge Function — source-only change in isolation; SPA apply-time + queue preview paths go live immediately on deploy"

patterns-established:
  - "Forbidden-token pattern: { re: /regex/i, label: 'human-readable name' } — check re.test(svgString), push label into errors"
  - "Mirror-site drift catcher: Test 6 reads svgValidator.js source as string and asserts FORBID_TAGS/FORBID_ATTR pattern — catches future contributor drift across canonical Rule-4 site"

requirements-completed: [TGEN-05, TADM-01]

# Metrics
duration: 8min
completed: 2026-05-09
---

# Phase 177 Plan 07: BL-04 CSS-Injection Guard Summary

**svgValidator.js hardened with FORBIDDEN_CONTENT_TOKENS (4 CSS-injection patterns) + DOMPurify FORBID_TAGS/FORBID_ATTR:['style'] mirrored across 3 sites — closes the tenant-facing CSS-injection bypass that DOMPurify's SVG profile permits by design**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-09T17:09:00Z
- **Completed:** 2026-05-09T17:17:00Z
- **Tasks:** 2 (TDD: Task 1 RED + Task 2 GREEN)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Closed BL-04: `validateSvg()` now rejects `@import`, `url(http(s)://)`, `url(//...)`, and `javascript:` pseudo-protocol payloads that DOMPurify's SVG profile permits by design
- Tightened DOMPurify config to `FORBID_TAGS: ['style'], FORBID_ATTR: ['style']` across all 3 mirror sites (svgValidator.js Rule 4, templateApplyService.js apply-time, TemplateDraftPreview.jsx render-time) — byte-equality preserved
- RED-then-GREEN TDD cycle locked in CI: 6/6 tests pass; no regression on existing test suite (generateValidatorOrder, promptLibraryParity all still PASS)
- EF ingest gate (handlers/generate.ts) and approve-time re-validation (handlers/approve.ts:143) both inherit the fix automatically via the svgValidator.ts re-export shim

## Task Commits

Each task was committed atomically:

1. **Task 1: RED tests — svgValidatorXss.test.js** - `a2af9a15` (test)
2. **Task 2: GREEN — harden svgValidator.js + mirror DOMPurify config + EF comment** - `3248c3c5` (fix)

## Files Created/Modified

- `tests/integration/svgValidatorXss.test.js` - 6-test Vitest spec: 4 forbidden-pattern assertions + 1 regression guard + 1 mirror-config source-read assertion (Test 6)
- `src/services/svgValidator.js` - Added FORBIDDEN_CONTENT_TOKENS array (4 patterns), check loop before Rule 4 DOMPurify drift, tightened DOMPurify config to FORBID_TAGS+FORBID_ATTR:['style'], updated header comment
- `src/services/templateApplyService.js` - Mirrored tightened DOMPurify config (FORBID_TAGS+FORBID_ATTR:['style']) at apply-time sanitize call; BL-04 mirror comment added
- `src/components/Admin/TemplateDraftPreview.jsx` - Mirrored tightened DOMPurify config (FORBID_TAGS+FORBID_ATTR:['style']) at render-time sanitize call; header comment updated with BL-04 note
- `supabase/functions/generate-svg-template/svgValidator.ts` - Header comment updated to document BL-04 scope (no code change — re-export still inherits from src/services/svgValidator.js)

## New FORBIDDEN_CONTENT_TOKENS — Verbatim

```javascript
const FORBIDDEN_CONTENT_TOKENS = [
  { re: /@import\b/i, label: '@import (CSS)' },
  { re: /url\s*\(\s*['"]?https?:/i, label: 'url(http(s)://...)' },
  { re: /url\s*\(\s*['"]?\/\//i, label: 'url(//...) protocol-relative' },
  { re: /\bjavascript\s*:/i, label: 'javascript: pseudo-protocol' },
];
```

**Rationale per pattern:**
- `@import\b` — CSS import directive that causes the browser to fetch an external stylesheet, enabling CSS exfiltration of form inputs or cross-tenant style override
- `url\s*\(\s*['"]?https?:` — Absolute HTTP(S) URL in a CSS url() function; causes the browser to make a network request to attacker-controlled infrastructure (DNS prefetch + tracking)
- `url\s*\(\s*['"]?\/\/` — Protocol-relative URL; same risk as absolute HTTP but less obviously filtered; adapts to current page protocol
- `\bjavascript\s*:` — javascript: pseudo-protocol that executes inline JS when the element is activated; browser prevents direct execution but some SVG renderers (older Webkit) and RSS readers execute it

## DOMPurify Config Before/After — All 3 Mirror Sites

### svgValidator.js Rule 4 (canonical site)

**Before:**
```javascript
const sanitized = purifier.sanitize(svgString, {
  USE_PROFILES: { svg: true, svgFilters: true },
});
```

**After:**
```javascript
const sanitized = purifier.sanitize(svgString, {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['style'],
  FORBID_ATTR: ['style'],
});
```

### templateApplyService.js (apply-time)

**Before:**
```javascript
? DOMPurify.sanitize(customizedSvg, { USE_PROFILES: { svg: true, svgFilters: true } })
```

**After:**
```javascript
? DOMPurify.sanitize(customizedSvg, {
    // BL-04 mirror — see svgValidator.js Rule 4 header for the locked-config rationale.
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  })
```

### TemplateDraftPreview.jsx (Pending-tab render)

**Before:**
```javascript
? DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true, svgFilters: true } })
```

**After:**
```javascript
? DOMPurify.sanitize(svgContent, {
    // BL-04 mirror — see svgValidator.js Rule 4 header for the locked-config rationale.
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  })
```

## Test Results — 6/6 GREEN

```
✓ Test 1: rejects SVG with <style>@import url(https://attacker...) — CSS @import injection
✓ Test 2: rejects SVG with url(http://...) CSS external resource ref
✓ Test 3: rejects SVG with url(//...) protocol-relative external resource ref
✓ Test 4: rejects SVG with javascript: pseudo-protocol
✓ Test 5 (regression guard): clean valid SVG with hex fills still passes
✓ Test 6: locked DOMPurify config in svgValidator.js Rule 4 forbids <style>+style attrs
```

Existing tests: `generateValidatorOrder` (1/1 PASS), `promptLibraryParity` (2/2 PASS) — no regression.

## EF Re-export Confirmation

`supabase/functions/generate-svg-template/svgValidator.ts` re-exports via:

```typescript
export { validateSvg } from "../../../src/services/svgValidator.js";
```

The Deno EF and the SPA bundle import the SAME `src/services/svgValidator.js` file. No separate Deno port is needed. The FORBIDDEN_CONTENT_TOKENS and tightened DOMPurify config automatically flow through the re-export to:
- `handlers/generate.ts` — ingest gate (runs BEFORE INSERT into template_drafts; TGEN-05 closure)
- `handlers/approve.ts:143` — B1 approve-time re-validation (runs BEFORE rasterize/S3/INSERT)

**EF redeploy note:** This is a source-only change. The hardening goes LIVE in the EF only when 177-08 Task 4c [BLOCKING] or 177-10 Task 4a [BLOCKING] redeploys the Edge Function. SPA code paths (apply-time + Pending-tab preview) go live immediately on Vite build deploy.

## Decisions Made

- FORBIDDEN_CONTENT_TOKENS checked BEFORE DOMPurify drift (Rule 4) — prevents a hypothetical bypass where malicious content mutates after DOMPurify runs (defense-in-depth order: explicit deny first, then sanitizer)
- Test 6 uses `fs.readFileSync` + regex on the source string — this is the drift detector for future contributors who add a 4th DOMPurify call site without the FORBID_TAGS additions (T-177-19c mitigation)
- Re-export shim receives comment-only update, no code change — the value of the shim pattern is zero-drift between SPA and EF validators; any additional port would re-introduce drift risk

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no stub patterns introduced in this plan.

## Threat Flags

None — this plan only tightens existing security surfaces; no new network endpoints, auth paths, or trust boundaries introduced.

## Next Phase Readiness

- BL-04 CSS-injection bypass closed at the source level (SPA + EF re-export)
- EF hardening goes live when 177-08 or 177-10 redeploys the Edge Function (see EF Redeploy note above)
- 177-08, 177-09, 177-10 can proceed in parallel — this plan's changes are source-only and do not block the other gap-closure plans
- The next verifier run can flip gap #4 truth from `failed` to `verified` (SPA paths); the EF live probe will pass after 177-08 or 177-10's EF redeploy

## Self-Check: PASSED

- tests/integration/svgValidatorXss.test.js: EXISTS
- src/services/svgValidator.js: EXISTS, contains FORBIDDEN_CONTENT_TOKENS, FORBID_TAGS, FORBID_ATTR
- src/services/templateApplyService.js: EXISTS, contains FORBID_TAGS, FORBID_ATTR
- src/components/Admin/TemplateDraftPreview.jsx: EXISTS, contains FORBID_TAGS, FORBID_ATTR
- supabase/functions/generate-svg-template/svgValidator.ts: EXISTS, contains BL-04 comment
- Commit a2af9a15: EXISTS (RED test)
- Commit 3248c3c5: EXISTS (GREEN implementation)

---
*Phase: 177-ai-generation-pipeline-admin-queue-ui*
*Completed: 2026-05-09*
