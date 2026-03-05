# Phase 113: Enterprise Platform Fixes - Research

**Researched:** 2026-03-04
**Status:** Complete

## Scope

Two targeted fixes from the v12.0 audit:
1. **API-04**: Fix scope mismatch on `PUT /v1/screens/:id/assignment` — currently requires `screens:read` but should require `screens:write`
2. **POP-05**: Wire playback summary statistics to the main DashboardPage (currently only on ProofOfPlayPage)

## Finding 1: API Scope Mismatch

### Current State

The `PUT /v1/screens/:id/assignment` endpoint incorrectly requires `screens:read` scope in **three locations**:

1. **API Gateway route table** (`supabase/functions/api-gateway/index.ts:56`):
   ```ts
   'PUT /v1/screens/:id/assignment': { rpc: 'api_update_screen_assignment', scope: 'screens:read' },
   ```

2. **Developer Settings docs** (`src/pages/DeveloperSettingsPage.jsx:603`):
   ```js
   { method: 'PUT', path: '/v1/screens/:id/assignment', scope: 'screens:read', ... }
   ```

3. **API Version Service** (`src/services/apiVersionService.js:205-206`): Only has GET endpoints for screens, no entry for the PUT assignment endpoint.

### What Needs to Change

- Change `scope: 'screens:read'` → `scope: 'screens:write'` in the gateway route table
- Change `scope: 'screens:read'` → `scope: 'screens:write'` in the DeveloperSettingsPage docs
- Add `screens:write` to `AVAILABLE_SCOPES` in `src/services/apiTokenService.js` (currently missing — only `screens:read` exists)

### Files to Modify
- `supabase/functions/api-gateway/index.ts` — line 56
- `src/pages/DeveloperSettingsPage.jsx` — line 603
- `src/services/apiTokenService.js` — add `screens:write` scope to AVAILABLE_SCOPES array (after `screens:read`)

## Finding 2: Playback Summary on Dashboard

### Current State

- `fetchPlaybackSummary()` in `src/services/proofOfPlayService.js` returns `{ total_plays, total_hours, unique_content, active_screens }`
- This is currently only used in `src/pages/ProofOfPlayPage.jsx`
- `DashboardPage.jsx` imports from `dashboardService` for stats (`getDashboardStats`, `getTopScreens`, `getRecentActivity`, `getAlertSummary`)
- The dashboard `StatsGrid` component in `DashboardSections.jsx` shows screens/playlists/media counts

### What Needs to Change

- Import `fetchPlaybackSummary` into `DashboardPage.jsx`
- Fetch playback summary during dashboard data load (default last 30 days, same as ProofOfPlayPage)
- Add a "Playback Summary" section to the dashboard (using existing `StatCard` components)
- Show: Total Plays, Total Hours, Unique Content, Active Screens

### Files to Modify
- `src/pages/DashboardPage.jsx` — add import, fetch, and pass data
- `src/pages/dashboard/DashboardSections.jsx` — add PlaybackSummarySection component

## Complexity Assessment

Both fixes are small, isolated changes:
- Fix 1: Three string replacements + one array entry addition
- Fix 2: One new import + fetch call + one new section component

**Recommendation:** Single plan, wave 1, autonomous execution.

## RESEARCH COMPLETE
