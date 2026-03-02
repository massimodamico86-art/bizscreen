# Phase 104: React Render Crash Fixes - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the "Objects are not valid as a React child" crash across 6 pages (Team Management, Activity Log, Template Marketplace, Translation Dashboard, Demo Tools, Security Dashboard) so they render successfully and display their intended content. The root cause pattern must be identified and fixed consistently so the same class of bug does not recur.

</domain>

<decisions>
## Implementation Decisions

### Fix pattern
- Claude's discretion on per-page fixes vs. shared utility — pick the best approach based on actual root causes discovered
- If the same fix repeats 3+ times, Claude judges whether to extract a utility or keep inline
- **Fix all pages with the pattern, not just the 6 listed** — while diagnosing the 6 CRASH requirements, audit the broader codebase for the same pattern and fix any found
- When fixing a page, Claude may fix co-located obvious bugs discovered during investigation (e.g., wrong prop types, broken imports) at their discretion

### Error display
- Error messages: extract `.message` property from error objects, fall back to generic "Something went wrong" string
- Error placement (inline alert vs. EmptyState replacement): Claude decides per page based on whether partial data makes sense
- Retry buttons in error states: Claude decides based on error type (retry for network errors, no retry for data format errors)
- Loading states: keep whatever pattern each page already uses; add one if missing

### Error recovery UX
- **Add a "Try Again" button to ErrorBoundary** that resets the error state and re-renders children (avoids full page reload)
- Auto-recovery behavior: Claude decides based on error types discovered
- Per-page vs. global error boundaries: Claude decides based on App.jsx routing architecture
- Error logging enhancement: Claude evaluates existing `handleReactError()` and enhances if needed

### Regression guard
- **Verification: both manual screenshots AND automated tests** — navigate to each page visually during development, plus automated tests for ongoing prevention
- Test type (render tests, E2E, etc.): Claude decides based on existing test suite patterns
- Project-wide safeguards (ESLint rules, runtime wrappers): Claude decides based on actual root causes
- If i18n `t()` function is the root cause: Claude decides whether to fix translation layer or defend at rendering layer

### Claude's Discretion
- Overall fix approach (per-page vs. utility pattern)
- Error state UX details per page (inline vs. full-page, retry vs. no retry)
- Test type and coverage depth
- Whether to add ESLint rules or runtime safeguards
- i18n layer fixes if applicable
- Loading state patterns for pages missing them
- Error boundary scope (global vs. per-page)
- Auto-recovery behavior

</decisions>

<specifics>
## Specific Ideas

- Previous quick phase 48 categorized crashes into 3 types: (A) missing/wrong component imports, (B) wrong Modal prop name (`isOpen` → `open`), (C) error state storing objects instead of strings — same patterns likely apply here
- User wants the broader codebase audited for the same crash pattern, not just the 6 listed pages — proactive fixing

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ErrorBoundary` (src/components/ErrorBoundary.jsx): Global error boundary with reload/go-home buttons — needs "Try Again" button added
- `handleReactError` (src/utils/errorTracking.jsx): Centralized error logging — already called by ErrorBoundary
- Design system components (`Alert`, `EmptyState`, `Button`, `Card`, `Modal`): Available for consistent error/empty states

### Established Patterns
- `Modal` uses `open` prop (NOT `isOpen`) — known cause of crashes from phase 48
- `Badge` is in design-system (NOT lucide-react) — lucide Badge is an SVG icon, causes crash if used as component
- `Button` variants: primary, secondary, ghost, danger (NO "outline" variant)
- Error state pattern: `setError(typeof err === 'string' ? err : err?.message || 'Failed to load')` — used in SecurityDashboardPage

### Integration Points
- App.jsx: String-keyed page routing object (`pages`) — where ErrorBoundary wrapping would go if per-page boundaries are added
- main.jsx: Global ErrorBoundary wrapping the entire app

### Known Crash Pages (6 listed + potential others)
- src/pages/TeamPage.jsx (CRASH-01)
- src/pages/ActivityLogPage.jsx (CRASH-02)
- src/pages/TemplateMarketplacePage.jsx (CRASH-03)
- src/pages/TranslationDashboardPage.jsx (CRASH-04)
- src/pages/DemoToolsPage.jsx (CRASH-05)
- src/pages/SecurityDashboardPage.jsx (CRASH-06)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 104-react-render-crash-fixes*
*Context gathered: 2026-03-02*
