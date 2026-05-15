# Phase 166.1: Template Marketplace Navigation & Dev Seed Data

**Status:** Inserted 2026-04-12 from Phase 166 UAT blockers (option 3 of /gsd-verify-work).

## Why this phase exists

Phase 166 shipped QuickCustomizePanel and was code-verified by E2E tests
(Playwright suite in commit `20a32518` running against the CI-seeded database).
Manual UAT of Phase 166, however, could not proceed because two pre-existing
infrastructure gaps blocked every checkpoint:

1. **No UI entry point to Template Marketplace.** The page is registered at
   [src/App.jsx:556](../../../src/App.jsx#L556) but nothing in the sidebar or
   any route invokes `setCurrentPage('template-marketplace')`. The marketplace
   was reachable only via React fiber-level state injection during verification.
2. **Empty `template_library` in local Supabase.** CI tests pass because CI
   uses the seeded CI database, but a fresh local dev environment has zero
   templates, so Quick Customize cannot be exercised manually.

Both gaps predate Phase 166 and are out of scope for that phase's charter
(which only added customization *inside* the marketplace). They were routed
here to be tracked as their own work.

## Next step

Run `/gsd-discuss-phase 166.1` to gather context, then `/gsd-plan-phase 166.1`.

## Success Criteria (from ROADMAP)

1. A visible UI entry point invokes `setCurrentPage('template-marketplace')`
   from the main app shell.
2. A seed migration populates `template_library` in local Supabase with at
   least one template per category.
3. Running `/gsd-verify-work 166.1` afterward unblocks the original Phase 166
   manual checkpoints (color preview, logo upload, Apply & Create, no-SVG
   fallback).
