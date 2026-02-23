# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v7.0 UI Verification — systematic page-by-page audit and fix

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-23 — Milestone v7.0 UI Verification started

Progress: [░░░░░░░░░░░░] 0% (v7.0 — not started)

## Milestones Shipped

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1 Production Release | 1-12 | 75 | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | 10 | 2026-02-11 |
| v3.1 Data-Driven Screens | 51-55 | 15 | 2026-02-13 |
| v3.2 Display Toolkit | 56-63 | 16 | 2026-02-19 |
| v4.0 Player Hardening | 64-68 | 11 | 2026-02-20 |
| v5.0 UI Completeness | 69-71 | 5 | 2026-02-20 |

## Performance Metrics

**Cumulative (v1 through v5.0):**
- Total plans executed: 227
- Total phases: 71 completed
- Total milestones: 11 shipped

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table.

- Removed supabase.auth.admin code paths entirely since they never work in client context (72-01)
- Added PGRST202/PGRST301 and network error detection to device status RPC polling (72-01)
- [Phase 72]: Removed supabase.auth.admin code paths - never work in client context
- [Phase 72]: Added PGRST202/PGRST301 and network error detection to device status RPC polling
- [Phase 73]: Store hyperlinks as fabric custom properties for seamless JSON serialization
- [Phase 73]: Use isPreviewModeRef to bridge React state into canvas event handler
- [Phase 73]: Use fabric.js lockUniScaling for aspect ratio lock, default images to locked
- [Phase 73]: Settings panel reuses activePanel state pattern for consistent panel toggling
- [Phase 74]: Reuse file input with replaceImageRef flag for add vs replace image flows
- [Phase 74]: Preserve all geometry and custom properties during image replacement
- [Phase 74]: Use fabric.js clipPath with Rect for non-destructive image cropping
- [Phase 74]: Block keyboard shortcuts and deletion during crop mode to prevent accidental edits
- [Phase 80]: Use openInNewTab !== false for backward-compatible boolean defaulting in handleSaveHyperlink
- [Phase 75]: Extract PKCE/state/token utilities into shared cloudOAuthService for multi-provider reuse
- [Phase 75]: Use provider-keyed localStorage for token isolation across cloud providers
- [Phase 75]: Google Drive download URL returns headers-getter since API requires auth for media download
- [Phase 75]: OneDrive/SharePoint share VITE_MICROSOFT_CLIENT_ID with separate token storage keys
- [Phase 75]: Google Photos uses POST for mediaItems:search, baseUrl + '=d' for downloads
- [Phase 75]: CloudFilePicker uses lazy dynamic imports per provider to avoid bundling all 5 cloud services together
- [Phase 75]: OAuth return detection uses sessionStorage to bridge pre-redirect provider selection to post-OAuth picker opening
- [Phase 75]: Cloud callback handled inline in App.jsx via useEffect (no separate page needed like Canva)
- [Phase 76]: Use onNavigate as alias alongside onUpgradeClick in FeatureUpgradePrompt for backward compatibility
- [Phase 76]: Store password and session policies in tenant_settings table with key-based lookup
- [Phase 76]: validatePassword accepts optional policy parameter for runtime tenant-specific overrides
- [Phase 76]: Use inline confirmation panel instead of modal for deletion gravity
- [Phase 76]: Require exact case-sensitive phrase DELETE MY DATA to enable delete button
- [Phase 76]: Single root cause fix: adding tenant_id to AuthContext SELECT closes 3 verification gaps simultaneously
- [Phase 77]: Use Cloudinary upload widget with resourceType=video for carousel video uploads
- [Phase 77]: Store events in formData.upcomingEvents with inline CRUD form pattern
- [Phase 77]: Inline edit form replaces event row on edit click (not separate modal)
- [Phase 77]: Use seeded random from contentId for deterministic mock timeline data across refreshes
- [Phase 77]: Category filtering in graphics library uses name/folder string matching
- [Phase 77]: Unified TimelineChart supports view_count, play_count, and total_duration_seconds fields
- [Phase 77]: Use video.muted !== false for backward-compatible muted defaulting on existing video items
- [Phase 78]: Use Stripe Customer Portal flow_data with payment_method_update type for direct payment method update
- [Phase 78]: Primary button for Update Payment Method, secondary for Manage Billing
- [Phase 78]: Reuse existing create modals for edit by passing initialValues prop instead of separate edit modals
- [Phase 78]: Use editingApp state at parent level to toggle modal behavior between create and edit modes
- [Phase 79]: Use fetch directly to call Anthropic API in Deno edge function (no SDK needed)
- [Phase 79]: Strip markdown code fences from AI response as fallback for JSON extraction
- [Phase 79]: Clamp AI-generated position values to 0-1 range and trim overflow in client validation
- [Phase 79]: AI Designer tab placed first in sidebar (before Media) for prominence
- [Phase 79]: AiDesignerPanel has its own padding, other tabs keep existing p-4 wrapper
- [Phase 79]: handleApplyAiLayout replaces all elements (not merge) for clean AI generation
- [Phase 79]: Use camelCase branding fields from BrandingContext (primaryColor, not primary_color)
- [Phase 79]: Clear reference image after generation (one-time visual reference pattern)
- [Phase 79]: Previous elements passed as assistant message context for iterative refinement

### Blockers/Concerns

- Orphaned test file: `tests/unit/services/gdprDeletionService.test.js` imports deleted service (from v5.0)
- Tech debt: duplicate legacy player_heartbeat RPC, wrong lastActivityRef in ViewPage (from v4.0)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 43 | Fix 17 remaining Playwright e2e test failures | 2026-02-18 | cab3395 | [43-fix-17-remaining-playwright-e2e-test-fai](./quick/43-fix-17-remaining-playwright-e2e-test-fai/) |
| 44 | Fix 4 failing Playwright e2e tests (auth/connection) | 2026-02-19 | 0ce7539 | [44-fix-4-failing-playwright-e2e-tests](./quick/44-fix-4-failing-playwright-e2e-tests/) |
| Phase 72 P01 | 2min | 3 tasks | 3 files |
| Phase 73 P01 | 3min | 2 tasks | 3 files |
| Phase 73 P02 | 4min | 2 tasks | 3 files |
| Phase 74 P01 | 2min | 2 tasks | 2 files |
| Phase 74 P02 | 3min | 2 tasks | 2 files |
| Phase 80 P01 | 2min | 2 tasks | 3 files |
| Phase 75 P01 | 2min | 2 tasks | 3 files |
| Phase 75 P02 | 5min | 2 tasks | 3 files |
| Phase 75 P03 | 6min | 2 tasks | 3 files |
| Phase 76 P01 | 3min | 2 tasks | 4 files |
| Phase 76 P02 | 2min | 1 tasks | 1 files |
| Phase 76 P03 | 1min | 1 tasks | 2 files |
| Phase 77 P01 | 3min | 2 tasks | 2 files |
| Phase 77 P02 | 3min | 2 tasks | 3 files |
| Phase 77 P03 | 2min | 2 tasks | 2 files |
| Phase 78 P01 | 2min | 1 tasks | 2 files |
| Phase 78 P02 | 3min | 1 tasks | 2 files |
| Phase 79 P01 | 2min | 2 tasks | 2 files |
| Phase 79 P02 | 2min | 2 tasks | 4 files |
| Phase 79 P03 | 2min | 2 tasks | 2 files |

## Session Continuity

Last session: 2026-02-23
Stopped at: v7.0 milestone started — defining requirements
Resume file: N/A
Next: /gsd:plan-phase [N] once roadmap is created

---
*Updated: 2026-02-23 — v7.0 UI Verification milestone started*
