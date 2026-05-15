# Phase 174: Scene Editor + Onboarding Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 174-scene-editor-onboarding-integration
**Areas discussed:** Editor return apply semantics, Onboarding starter-pack step UX, completed_starter_pack tracking, driver.js tour persistence + trigger

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Editor return apply semantics | Use Template behavior, polotno handling, entry point, URL contract | ✓ |
| Onboarding starter-pack step UX | Step position, layout, filtering, post-apply behavior | ✓ |
| completed_starter_pack tracking | Schema, tri-state, RPC changes, is_complete rollup | ✓ |
| driver.js tour persistence + trigger | State storage, trigger condition, tour steps, dismiss semantics | ✓ |

**User's choice:** All four areas selected.

---

## Editor Return Apply Semantics

### Q1: When the user clicks 'Use Template' in editorReturn mode, what should happen to the scene they came from?

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite active slide design (Recommended) | Replace the *currently active slide's* design_json/svgContent with the chosen template; other slides untouched | ✓ |
| Append as a new slide | Add a new scene_slides row at the end with the template's design_json | |
| Create a sibling scene + nav back | Run existing apply RPC, navigate editor to the new scene | |

**User's choice:** Overwrite active slide design (Recommended)

### Q2: How should a Polotno template selected during editorReturn from an SVG scene editor be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Filter polotno out in editorReturn (Recommended) | Hide polotno templates entirely when editorReturn=true | ✓ |
| Allow + auto-create new scene | Polotno fallback creates new scene + navs to scene-editor-<id> | |
| Warn-and-confirm | Show confirm dialog, user opts in to new scene | |

**User's choice:** Filter polotno out in editorReturn (Recommended)

### Q3: Where should the 'Browse Templates' entry point live in the SceneEditorPage UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Topbar button next to AI Wizard (Recommended) | New button in existing topbar action cluster | ✓ |
| Inside the AI Suggestions panel | Card inside right-rail AiSuggestionsPanel | |
| Empty-slide affordance only | Show only when active slide is on default empty design | |

**User's choice:** Topbar button next to AI Wizard (Recommended)

### Q4: What URL contract should editorReturn mode use?

| Option | Description | Selected |
|--------|-------------|----------|
| ?editorReturn=1&returnSceneId=<id> (Recommended) | Gallery reads both params; sceneId-only handoff (preserves Phase 172 D-12) | ✓ |
| ?editorReturn=1 + sessionStorage for sceneId | Phase 172 deliberately killed sessionStorage handoff — not recommended | |
| Single page key 'template-gallery-from-editor-<id>' | Encode return target in page key | |

**User's choice:** ?editorReturn=1&returnSceneId=<id> (Recommended)

---

## Onboarding Starter-Pack Step UX

### Q1: Where should the starter-pack step sit in the ONBOARDING_STEPS sequence?

| Option | Description | Selected |
|--------|-------------|----------|
| After 'logo', before 'first_media' (Recommended) | welcome → logo → starter_pack → first_media → first_playlist → first_screen → screen_pairing | ✓ |
| First step after welcome | Higher conversion potential but logo not yet uploaded | |
| Last optional step | Push to the end as a 'bonus' step | |

**User's choice:** After 'logo', before 'first_media' (Recommended)

### Q2: What does the step look like inside the wizard?

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded grid in wizard modal (Recommended) | Reuse existing OnboardingWizard chrome, body shows 3-6 PackCards | ✓ |
| Full-screen takeover | Full-page mini-gallery view | |
| Embed StarterPacksStrip in wizard | Reuse Phase 173 horizontal strip verbatim | |

**User's choice:** Embedded grid in wizard modal (Recommended)

### Q3: How should packs be filtered in the onboarding step?

| Option | Description | Selected |
|--------|-------------|----------|
| Top N by display_order, no filter (Recommended) | First 6 by display_order ASC; no business_type dependency | ✓ |
| Filter by profile.business_type | Personalized but column unreliable; TPER-F1 deferred | |
| Show all, with industry chips above | More choice, more chrome | |

**User's choice:** Top N by display_order, no filter (Recommended)

### Q4: What happens after the user applies a pack in the onboarding step?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + auto-advance (Recommended) | Success toast, mark complete, advance to next step | ✓ |
| Inline confirmation, manual continue | Step swaps to success state, user clicks Continue | |
| Auto-advance silently, no toast | Mark complete, advance, no UI feedback | |

**User's choice:** Toast + auto-advance (Recommended)

---

## completed_starter_pack Tracking

### Q1: Schema choice for tracking the starter-pack step in onboarding_progress?

| Option | Description | Selected |
|--------|-------------|----------|
| Single BOOLEAN column (Recommended) | Add completed_starter_pack BOOLEAN DEFAULT FALSE; mirrors existing 6 step columns | ✓ |
| BOOLEAN + nullable applied_pack_id UUID | Records which pack was applied | |
| Tri-state ENUM column | Most expressive but breaks the boolean-column pattern | |

**User's choice:** Single BOOLEAN column (Recommended)

### Q2: How should the tri-state from ROADMAP SC #4 be represented?

| Option | Description | Selected |
|--------|-------------|----------|
| completed_starter_pack + skipped_at (Recommended) | Reuses onboarding_progress.skipped_at semantics already in schema | ✓ |
| Add a starter_pack_skipped_at TIMESTAMPTZ column | Dedicated timestamp; three columns disambiguate cleanly | |
| Defer skip vs chosen — just track 'reached' boolean | Single boolean for "reached and dismissed in any way" | |

**User's choice:** completed_starter_pack + skipped_at (Recommended)

### Q3: What needs to change in the existing onboarding RPCs?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend all three RPCs idempotently (Recommended) | Migration adds column, CREATE OR REPLACE updates each RPC body | ✓ |
| Bypass RPC, use direct table UPDATE | Faster but breaks update_onboarding_step abstraction | |
| Add a dedicated RPC complete_starter_pack_step | Single-purpose RPC, keeps existing untouched | |

**User's choice:** Extend all three RPCs idempotently (Recommended)

### Q4: Should the starter-pack step participate in the wizard's is_complete rollup?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — 7 steps, all required for is_complete (Recommended) | Wizard is_complete now requires all 7 booleans true; skippable honored at UI layer | ✓ |
| No — starter pack is optional, is_complete unchanged | Starter-pack as side-channel column | |

**User's choice:** Yes — 7 steps, all required for is_complete (Recommended)

---

## driver.js Tour Persistence + Trigger

### Q1: Where should 'tour was shown' state be persisted?

| Option | Description | Selected |
|--------|-------------|----------|
| New column on onboarding_progress (Recommended) | completed_gallery_tour BOOLEAN DEFAULT FALSE; resolves STATE blocker explicitly | ✓ |
| localStorage flag | Per-browser, simple, can re-show after clearing | |
| Profiles row preference | Per-user durable but onboarding_progress is the natural home | |

**User's choice:** New column on onboarding_progress (Recommended)

### Q2: What should trigger the tour?

| Option | Description | Selected |
|--------|-------------|----------|
| First gallery visit when completed_gallery_tour=FALSE (Recommended) | Simple, idempotent, doesn't depend on onboarding completion timing | ✓ |
| Strict 'after onboarding completion' gate | Trigger only if is_complete=TRUE OR skipped_at IS NOT NULL | |
| Manual button + first-visit auto | Auto-trigger plus 'Show me around' replay button | |

**User's choice:** First gallery visit when completed_gallery_tour=FALSE (Recommended)

### Q3: Which gallery elements should the driver.js tour highlight? (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Filter sidebar / chips | ROADMAP SC #5 requirement | ✓ |
| Search input | ROADMAP SC #5 requirement | ✓ |
| Template card | ROADMAP SC #5 requirement | ✓ |
| Apply CTA in preview modal | ROADMAP SC #5 requirement; static-pointer recommended over auto-open | ✓ |

**User's choice:** All 4 selected (matches ROADMAP SC #5 verbatim).

### Q4: What happens when the user clicks 'Skip tour' or dismisses it mid-flow?

| Option | Description | Selected |
|--------|-------------|----------|
| Mark completed_gallery_tour=TRUE on any dismissal (Recommended) | Skip/X-close/complete all set the flag TRUE; one-and-done | ✓ |
| Only mark TRUE on full completion | Skip/X leaves it FALSE so re-show next visit | |
| Mark TRUE on dismiss + 'Don't show again' explicit checkbox | Two-tier; adds UX surface | |

**User's choice:** Mark completed_gallery_tour=TRUE on any dismissal (Recommended)

---

## Claude's Discretion

Captured under `<decisions>` in CONTEXT.md as Claude's Discretion. Includes: driver.js install version & wrapper hook shape, exact migration number (recommended 174 single-file), confirmation dialog wording for active-slide overwrite, `data-tour` selector strategy, mobile/narrow-screen tour behavior, onboarding step icon, whether starter-pack apply auto-completes `first_media`, "Use Template" CTA visual treatment.

## Deferred Ideas

Captured under `<deferred>` in CONTEXT.md. Major deferrals:
- Polotno round-trip in editorReturn (v20.1 candidate, blocked on Phase 172 D-16 gap)
- starter_pack_applied_id audit column (analytics-only, not needed for v20.0)
- Tri-state ENUM swap (only if BOOLEAN + skipped_at inference proves fragile)
- Tour replay button (single-shot is sufficient per SC #5)
- Pack convergence with legacy `content_templates` (Phase 173 D-02 deferral upheld)

## Sequencing Notes

- All 12 primary questions resolved with the recommended option — strong signal that the planner can proceed without another round-trip on these decisions.
- 4-area, single-pass discuss session. No `--chain`, `--auto`, `--all` flags — fully interactive.
- STATE blocker "Phase 174 verify before planning: driver.js tour state persistence" closed by D-16/D-17.
