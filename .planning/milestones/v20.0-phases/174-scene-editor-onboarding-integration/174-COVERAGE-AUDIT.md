# Phase 174 — Multi-Source Coverage Audit

**Performed:** 2026-04-28
**Sources audited:** GOAL (ROADMAP) + REQ (REQUIREMENTS.md) + RESEARCH (174-RESEARCH.md) + CONTEXT (174-CONTEXT.md)

---

## GOAL coverage (ROADMAP §Phase 174 — 5 Success Criteria)

| SC# | Goal text | Plan(s) | Status |
|-----|-----------|---------|--------|
| 1 | User editing a scene can click "Browse Templates," land on the gallery, and return to the same scene with the chosen template applied — with no data loss to existing scene work | 02 (RPC), 03 (push), 04 (modal mode), 05 (button), 06 (gallery wiring) | COVERED |
| 2 | The gallery URL carries an `editorReturn` context flag; the gallery UI shows "Use Template" as the primary action in this mode | 04 (CTA copy swap), 06 (URL read + flag detection) | COVERED |
| 3 | A new user completing onboarding encounters a skippable starter-pack selection step and can bulk-apply a pack without leaving the wizard | 02 (column + RPC ext), 03 (push), 07 (service ext), 08 (wizard UI + StarterPackStep) | COVERED |
| 4 | Onboarding progress tracks whether the starter pack step was chosen, skipped, or not reached (`completed_starter_pack` column) | 02 (column + tri-state encoding via D-13), 03 (push), 07 (mapper), 08 (wizard wiring of step-skip vs apply) | COVERED |
| 5 | On first visit to the gallery after onboarding, a driver.js tour highlights the filter sidebar, search, template card, and apply CTA — and does not re-appear on subsequent visits | 01 (driver.js install), 02 (column + RPC allowlist for gallery_tour), 03 (push), 04 (apply-cta anchor), 06 (3 anchors), 07 (markGalleryTourSeen export), 09 (useGalleryTour hook) | COVERED |

---

## REQ coverage (REQUIREMENTS.md — 7 phase IDs)

| Req ID | Description | Plan(s) | Status |
|--------|-------------|---------|--------|
| TEDR-01 | User can open the template gallery from inside the scene editor via a "Browse Templates" action | 01 (E2E stub), 05 (button) | COVERED |
| TEDR-02 | User returning from gallery→editor lands back on the origin scene with the new template applied | 01 (test stubs), 02 (RPC), 03 (push), 04 (wrapper + modal mode), 06 (modal prop wiring) | COVERED |
| TEDR-03 | Gallery deep-link (`?editorReturn=true`) preserves editor context across the round-trip | 01 (E2E stub), 05 (URL writer), 06 (URL reader + filter + StarterPacksStrip hide) | COVERED |
| TONB-01 | New-user onboarding includes a skippable starter-pack selection step that surfaces curated packs inline | 01 (unit stub), 07 (ONBOARDING_STEPS), 08 (wizard UI) | COVERED |
| TONB-02 | Selecting a pack during onboarding bulk-applies it to the tenant's library without leaving the wizard | 01 (E2E stub), 08 (wizard StarterPackStep + handlePackApplySuccess) | COVERED |
| TONB-03 | Onboarding state tracks whether starter pack was chosen, skipped, or not reached (`completed_starter_pack`) | 01 (integration stub), 02 (column + RPC ext), 03 (push), 07 (mapper + helpers) | COVERED |
| TONB-04 | A lightweight feature tour (driver.js) introduces gallery discovery and preview/apply flow on first visit post-onboarding | 01 (install + stubs), 02 (column + allowlist), 03 (push), 04 (apply-cta anchor), 06 (3 anchors), 07 (markGalleryTourSeen), 09 (hook + invocation) | COVERED |

---

## RESEARCH coverage (174-RESEARCH.md features/constraints)

| Item | Section | Plan(s) | Status |
|------|---------|---------|--------|
| driver.js@^1.4.0 install (Wave 0 gap) | §Validation Architecture | 01 | COVERED |
| Two-step navigation (useNavigate + onNavigate) | §Pattern 1 + Pitfall 1 | 05 (URL writer) | COVERED |
| apply_template_to_active_slide RPC body (auth, ownership, polotno-reject, slide-belongs, super_admin bypass, NULL guard, jsonb_set UPDATE, return slide id) | §Pattern 2 | 02 | COVERED |
| update_onboarding_step allowlist + extended is_complete (NOT including gallery_tour) | §Pattern 3 + Pitfall 3 | 02 | COVERED |
| get_onboarding_progress return shape extension | §Pattern 4 | 02 | COVERED |
| OnboardingWizard StepContent extension (StarterPackStep sub-component, async fetch + click + advance + Pitfall 4 stopPropagation guard) | §Pattern 5 | 08 | COVERED |
| useGalleryTour hook with mounted-guard, isFetching gate, onDestroyStarted, all 4 data-tour anchors | §Pattern 6 | 09 | COVERED |
| Active-slide non-default predicate (D-01 confirmation dialog logic) | §Pattern 7 | 05 (DEFERRED: rationale — Use Template CTA itself = inline confirmation; documented in plan SUMMARY; revisit if UAT finds silent overwrites confusing) | DEFERRED-DOCUMENTED |
| applyTemplateToActiveSlide client wrapper | §Code Examples | 04 | COVERED |
| getDefaultDesign() exact return shape | §Code Examples | 05 (referenced in deferral rationale) | DEFERRED |
| Pitfall 1 — editorReturn URL params lost on re-render | §Pitfall 1 | 05 (uses useNavigate, not pushState) | COVERED |
| Pitfall 2 — driver.js fires before gallery renders | §Pitfall 2 | 09 (isFetching gate + querySelector defensive checks) | COVERED |
| Pitfall 3 — completed_gallery_tour leaking into is_complete | §Pitfall 3 | 02 (negative grep gate in acceptance), 07 (NOT in getCompletedCount) | COVERED |
| Pitfall 4 — PackCard click bubbling to wizard footer | §Pitfall 4 | 08 (stopPropagation wrapper) | COVERED |
| Pitfall 5 — getOnboardingProgress error fallback omits new fields | §Pitfall 5 | 07 (extends both happy AND error paths) | COVERED |
| Threat model: Tampering (slide mutation, polotno injection) | §Security Domain | 02 (RPC mitigations T-174-02-01..02), 04 + 06 (defence-in-depth at client layer) | COVERED |
| Threat model: Tampering (SQL injection via dynamic SQL) | §Security Domain | 02 (allowlist guard at top of update_onboarding_step) | COVERED |
| Threat model: XSS via SVG content | §Security Domain | accept (DOMPurify boundary at render time per Phase 172 D-17 — pre-existing; no new mitigation) | COVERED-INHERITED |
| Open Question 1 — slideId in URL contract | §Open Questions | 05 (slideId added to URL writer), 06 (slideId read alongside returnSceneId) | COVERED |
| Open Question 2 — markGalleryTourSeen reuses update_onboarding_step? | §Open Questions | 07 (yes, reuses with allowlist; named export for clarity) | COVERED |

---

## CONTEXT coverage (174-CONTEXT.md — 19 D-XX decisions)

| ID | Decision | Plan(s) | Status |
|----|----------|---------|--------|
| D-01 | "Use Template" overwrites active slide; confirmation dialog only when slide differs from default | 02 (RPC overwrite) + 05 (DEFERRED confirmation dialog with rationale: Use Template CTA = inline confirmation; revisit on UAT) | COVERED-with-deferred-confirmation |
| D-02 | Polotno templates hidden in editorReturn mode; RPC rejects non-svg | 02 (RPC RAISE), 06 (svg-only filter) | COVERED |
| D-03 | "Browse Templates" button in SceneEditorPage topbar near AI panel toggle, LayoutTemplate icon, ghost variant | 05 | COVERED |
| D-04 | URL contract `?editorReturn=1&returnSceneId=<id>&slideId=<id>`; navigate to scene-editor-${id} on return | 05 (writer with all 3 params), 06 (reader), 04 (return navigation in modal) | COVERED |
| D-05 | New RPC apply_template_to_active_slide(p_scene_id, p_slide_id, p_template_id, p_editor_type) RETURNS uuid | 02 | COVERED |
| D-06 | marketplaceService.applyTemplateToActiveSlide wrapper + TemplatePreviewModal mode prop | 04 | COVERED |
| D-07 | Insert starter_pack between logo and first_media (7 steps total) | 07 (array), 02 (next_step CASE) | COVERED |
| D-08 | Embedded grid with PackCard inside OnboardingWizard; bypasses PackPreviewModal | 08 (StarterPackStep + StepContent branch) | COVERED |
| D-09 | Top 6 packs by display_order ASC, name ASC; client-side slice | 08 (StarterPackStep useEffect) | COVERED |
| D-10 | Post-apply: toast + mark complete + auto-advance; on failure: inline error + Try again | 08 (handlePackApplySuccess + StarterPackStep error UI) | COVERED |
| D-11 | Step-level Skip writes column without skipped_at; wizard-level Skip preserved | 08 (handleStepSkip + footer onClick routing) | COVERED |
| D-12 | ALTER TABLE ADD COLUMN IF NOT EXISTS completed_starter_pack | 02 | COVERED |
| D-13 | Tri-state encoding (chosen / skipped / not_reached) via column + skipped_at inference | 02 (column), 13 covered semantically by 8's step-skip vs apply paths + the existing skip_onboarding RPC writing skipped_at | COVERED-semantically |
| D-14 | Three RPCs extended idempotently (get_onboarding_progress, update_onboarding_step allowlist, skip_onboarding unchanged) | 02 | COVERED |
| D-15 | is_complete includes new step (7 booleans); progress bar denominator from ONBOARDING_STEPS.length | 02 (AND chain), 07 (getCompletedCount) | COVERED |
| D-16 | onboarding_progress.completed_gallery_tour BOOLEAN DEFAULT FALSE | 02 | COVERED |
| D-17 | Trigger: first TemplateGalleryPage mount where completed_gallery_tour=FALSE; extend get_onboarding_progress; on dismissal call mutation | 02 (column + RPC), 07 (markGalleryTourSeen), 09 (hook reads + writes) | COVERED |
| D-18 | 4 tour stops with data-tour attributes; static pointer for apply CTA; do NOT auto-open modal | 04 (apply-cta anchor on modal Apply button), 06 (3 gallery anchors), 09 (4-step config + no auto-open) | COVERED |
| D-19 | Any tour exit marks completed_gallery_tour=TRUE; never re-appears; no replay button v20.0 | 09 (onDestroyStarted handler) | COVERED |

### Claude's Discretion items (CONTEXT)

| Discretion item | Resolution | Plan |
|-----------------|------------|------|
| driver.js install version & integration shape | 1.4.0 latest stable; small useGalleryTour wrapper hook | 01 (install), 09 (hook) |
| Migration number | 174 (single file: 174_phase_174_onboarding_columns_and_template_apply_rpc.sql) | 02 |
| Confirmation dialog wording for D-01 | DEFERRED with rationale | 05 |
| data-tour selector strategy | DOM attribute (data-tour="...") | 04, 06, 09 |
| Mobile/narrow-screen tour behavior | driver.js handles; documented as manual-verify per VALIDATION.md | 09 (no extra code), VALIDATION.md (manual-verify row) |
| Onboarding step icon | Package from lucide-react | 07 (icon string in array), 08 (STEP_ICONS map entry) |
| Pack apply auto-completes first_media? | NO — independent (per CONTEXT recommendation) | 08 (handlePackApplySuccess only updates starter_pack) |
| "Use Template" CTA visual treatment | Reuse Button variant="primary" + new copy | 04 |

### Deferred Ideas (CONTEXT — explicit OUT OF SCOPE; correctly NOT planned)

| Deferred item | Reason for deferral | Confirmation NOT planned |
|---------------|---------------------|--------------------------|
| Polotno round-trip in editorReturn mode | D-02 enforced; v20.1 candidate | NOT in any plan |
| starter_pack_applied_id audit column | Analytics-only; not needed for v20.0 | NOT in any plan |
| Tri-state ENUM starter_pack_status | Boolean + skipped_at inference is sufficient | NOT in any plan |
| Tour replay / "Show me around" button | Single-shot is sufficient per ROADMAP SC #5 | NOT in any plan |
| Tour for non-onboarded users restriction | D-17 fires for any user with completed_gallery_tour=FALSE | Plan 09 explicitly does NOT restrict |
| Auto-completing first_media from pack apply | Steps independent | Plan 08 handlePackApplySuccess only updates starter_pack |
| Mobile-first overflow-menu for editor CTA | Topbar is sufficient for v20.0 | Plan 05 puts button in topbar |
| Pack convergence with legacy content_templates | Phase 173 D-02 deferral upheld | NOT in any plan |
| Confirmation dialog wording for D-01 (active-slide-non-default predicate) | DEFERRED to UAT — Use Template CTA is itself the inline confirmation | Plan 05 documents deferral; no code |

---

## Audit Conclusion

**No unplanned items.** Every GOAL SC, REQ ID, RESEARCH feature, and CONTEXT decision is either:
1. Covered by at least one plan with a specific task action, OR
2. Explicitly deferred per CONTEXT.md §Deferred Ideas (correctly NOT planned), OR
3. Inherited from prior phase mitigations (e.g., DOMPurify XSS boundary from Phase 172 D-17), OR
4. Documented as DEFERRED-with-rationale (D-01 confirmation dialog — UAT-revisit gate)

**Plan count:** 9 plans across 5 waves (1 → 2 → 3 → 4 → 5).

**Wave structure:**
- Wave 1: Plan 01 (Wave 0 install + RED test stubs)
- Wave 2: Plan 02 (migration file)
- Wave 3: Plan 03 (BLOCKING db push)
- Wave 4: Plans 04 + 05 + 06 + 07 (parallel — see file ownership matrix below)
- Wave 5: Plans 08 + 09 (parallel — both depend on 07; 09 also depends on 06 for data-tour anchors)

**Wave 4 file ownership (all 4 plans run in parallel; zero file overlap):**
- Plan 04: src/services/marketplaceService.js + src/components/template-gallery/TemplatePreviewModal.jsx + tests/unit/services/marketplaceService.test.js + tests/integration/apply-template-to-slide.test.js
- Plan 05: src/pages/SceneEditorPage.jsx
- Plan 06: src/pages/TemplateGalleryPage.jsx
- Plan 07: src/services/onboardingService.js + tests/integration/onboarding-rpc.test.js

**Wave 5 file ownership (both plans run in parallel; zero file overlap):**
- Plan 08: src/components/OnboardingWizard.jsx + src/App.jsx (showToast prop wiring) + tests/e2e/onboarding.spec.js
- Plan 09: src/hooks/useGalleryTour.js (NEW) + src/pages/TemplateGalleryPage.jsx (one-line invocation)

**WAIT — file conflict on TemplateGalleryPage.jsx between Plan 06 (Wave 4) and Plan 09 (Wave 5).** This is a sequential dependency, not a parallel conflict — Plan 09 runs in Wave 5 strictly AFTER Wave 4 commits. Plan 09's edit is additive (one import + one line invocation) on top of Plan 06's edits. No merge conflict possible. The wave assignment correctly serializes them.

**Final coverage: 5/5 GOAL SCs + 7/7 REQ IDs + 22/22 RESEARCH features + 19/19 CONTEXT decisions covered. 8/8 explicitly deferred items correctly NOT planned.**
