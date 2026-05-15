---
phase: 172-preview-apply-flow
verified: 2026-04-21T21:07:42Z
status: human_needed
score: 5/5 roadmap success criteria verified (all 6 TPRV requirements structurally satisfied); 3 manual UAT items intentionally deferred
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Split-view proportions 65/35 at 1440px viewport"
    expected: "Preview pane ≈ 65% width, QuickCustomizePanel ≈ 35% at 1440x900 viewport"
    why_human: "Visual proportion; jsdom has no layout engine. Structural contract (`md:grid-cols-[65fr_35fr]`) confirmed in source but paint/layout needs eye-on-glass"
  - test: "Stacked mobile layout at 375px viewport"
    expected: "Preview pinned top, QuickCustomizePanel scrolls beneath, Apply CTA sticky at bottom"
    why_human: "Paint + scroll semantics at 375px need real device or DevTools emulation; grid-cols-1 stack + sticky bottom-0 structurally present"
  - test: "Backdrop click does NOT close modal"
    expected: "Click on dim area outside the modal card does not close the modal"
    why_human: "closeOnOverlay={false} is structurally present but regression-prone; interactive verification recommended by UI-SPEC checklist"
  - test: "Apply failure Alert behaviour with exact copy"
    expected: "Inline Alert with exact copy 'Couldn't apply template. Your customizations are saved — tap Apply to try again.' appears above Apply button; dismissible; Apply re-enables"
    why_human: "Unit tests assert Alert appears on rejection; live RPC-failure visual inspection still recommended by UI-SPEC"
  - test: "Color swatch opens native picker on iOS Safari / Android Chrome"
    expected: "Native OS color picker appears when tapping swatch"
    why_human: "Native input[type=color] invocation is device-specific; cannot be automated from Playwright/Chromium"
  - test: "Polotno apply lands on scene-editor-<uuid>"
    expected: "Applying a Polotno template navigates to scene-editor-<uuid>; rendering fidelity inside is out-of-scope per D-16"
    why_human: "Requires a Polotno template in dev DB seed; if absent, cannot be exercised automatically. If seed data contains a Polotno row, E2E Test 3 covers this branch via regex"
  - test: "DOMPurify strips <script>/on* in live RPC payload"
    expected: "DevTools intercept of supabase.rpc('clone_template_with_customization') shows no <script> tags and no on* attributes in p_customized_svg"
    why_human: "Unit test asserts DOMPurify is called before RPC with <script> input returning stripped payload; live-flow DOM-side injection test still recommended by UI-SPEC checklist"
  - test: "Keyboard-only full flow — focus trap + focus return on close"
    expected: "Tab into card → Enter → modal opens → ArrowRight → Escape → focus returns to originating card"
    why_human: "Plan 07 E2E covers modal open, ArrowRight, Escape close. Focus restoration on close is delegated to design-system Modal and not asserted in automated tests"
  - test: "Flip UI-SPEC Checker Sign-Off checkboxes and VALIDATION frontmatter"
    expected: "After all above manual items PASS, flip 172-UI-SPEC.md §Checker Sign-Off to 6×[x]+Approval:approved; flip 172-VALIDATION.md frontmatter to nyquist_compliant:true, wave_0_complete:true, Approval:approved"
    why_human: "Plan 07 Task 3 was deferred pending human sign-off on the 8-item manual checklist"
---

# Phase 172: Preview + Apply Flow Verification Report

**Phase Goal:** Users can preview a template full-screen with their brand already applied, customize it in the preview, and apply it to a new scene with a race-safe, single-click flow.

**Verified:** 2026-04-21T21:07:42Z
**Status:** human_needed — all automated/structural verification passed; manual UAT items deferred by Plan 07 require eye-on-glass sign-off.
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth                                                                                                                           | Status     | Evidence                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can open a full-screen preview modal from any template card and navigate prev/next without closing the modal               | VERIFIED   | TemplatePreviewModal.jsx:161-293 (Modal size="full"); TemplateGalleryPage.jsx:557 (onSelect opens modal); ArrowLeft/Right + arrow buttons wired at TemplatePreviewModal.jsx:86-103,197-218; 3 unit tests + 2 E2E tests cover open+nav |
| 2   | User can adjust brand colors, logo placement, and text overrides and see the SVG update live                                    | VERIFIED   | QuickCustomizePanel.jsx:42-309 renders Colors/Logo/Text; emits onChange(serializeSvg) on every mutation (debounced color 50ms, text onBlur, logo upload/remove); TemplatePreviewModal.jsx:127-132,220-229 feeds customizedSvg back to sanitized preview via dangerouslySetInnerHTML; 6 unit tests + TemplatePreviewModal Test 8 (`fill="#ff0000"` asserted in innerHTML) |
| 3   | Apply to a new scene in one click; SVG → FabricSvgEditor, Polotno → Polotno scene editor — no routing ambiguity                 | VERIFIED   | templateApplyService.js:45-77 dispatches by editor_type; editorRouteFor at :91-95 returns `svg-editor?sceneId=<id>` (SVG) or `scene-editor-<id>` (Polotno); 8 unit tests cover dispatcher + route builder; SvgEditorPage.jsx:87-118 handles sceneId branch; PolotnoInfoBlock intentionally shows info (D-05/D-16) — Polotno in-preview customize deferred to TPRV-F1 |
| 4   | Applying never produces a scene with un-customized SVG due to clone-then-patch race — verified by slow-DB sim test              | VERIFIED   | Migration 168 (supabase/migrations/168_clone_template_with_customization.sql) is a single PL/pgSQL function that INSERTs scene + LOOP INSERTs slides with jsonb_set(design_json, '{svgContent}', to_jsonb(p_customized_svg)) atomically; integration Test 1 (rpc-atomicity.test.js) asserts 500ms RPC delay + button stays disabled; Test 3 asserts `supabase.rpc.mock.calls.length === 1` (no follow-up UPDATE) |
| 5   | No `sessionStorage` used in gallery-to-editor handoff — URL params or nav state only                                            | VERIFIED   | `grep -rn "sessionStorage.*pendingTemplate" src/` → 0 hits; `grep -rn "pendingTemplate" src/` → 0 hits (only legitimate assertions-of-absence in tests/e2e/preview-apply.spec.js). SvgEditorPage.jsx:28 reads `sceneId` URL param; editorRouteFor builds URL with sceneId; installWithCustomization + installTemplateAsScene dead code deleted (marketplaceService.js now 22 exports, was 24) |

**Score:** 5/5 roadmap success criteria verified at automated/structural level. (Note: 3 criteria — #2 live update visual, #3 Polotno routing confirmation, and #4 live-DB atomicity — have strong unit/integration evidence but are additionally listed in the manual UAT checklist per UI-SPEC convention.)

### Requirements Coverage (TPRV-01..06)

| Requirement | Source Plan   | Description                                                  | Status     | Evidence                                                                                                                                                                                                                                              |
| ----------- | ------------- | ------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TPRV-01     | 172-05, 06    | Full-screen preview modal with prev/next across filtered set | SATISFIED  | TemplatePreviewModal Modal primitive at full size; arrow keyboard handler + nav buttons; TemplateGalleryPage passes displayedTemplates (filtered array); TemplatePreviewModal snapshots on open (Pitfall 7); 3 unit + 2 E2E + keyboard guard unit test |
| TPRV-02     | 172-04        | QuickCustomize integrated in modal for brand colors/logo/text | SATISFIED | QuickCustomizePanel mounted at TemplatePreviewModal.jsx:257-261 for editor_type='svg'; sections Colors/Logo/Text render in order; 6 panel unit tests + modal Test 6 asserts panel content changes on nav                                             |
| TPRV-03     | 172-04, 05    | Preview modal shows live SVG updates as customize values change | SATISFIED | Panel emits onChange(serializeSvg) debounced on color and onBlur on text; modal receives via setCustomizedSvg, feeds back via sanitizedPreview memo into dangerouslySetInnerHTML; Test 8 asserts fill="#ff0000" reaches innerHTML; panel Test 3 asserts debounce timing |
| TPRV-04     | 172-03, 05, 06 | One-click apply routes to correct editor by template type     | SATISFIED | applyTemplate dispatches by editor_type; editorRouteFor builds SVG vs Polotno route; TemplatePreviewModal.jsx:106-122 invokes both then calls onNavigate; SvgEditorPage reads ?sceneId=; 8 service unit tests + E2E Test 3 asserts currentPage matches `/(svg-editor?sceneId=|scene-editor-)[uuid]/` |
| TPRV-05     | 172-02, 03    | Race-safe atomic apply (single RPC/transaction)               | SATISFIED | Migration 168 creates `clone_template_with_customization` as a single PL/pgSQL function; scene INSERT + slide LOOP INSERTs are atomic by construction; integration Test 3 proves single RPC call with no follow-up UPDATE; mirror migration 110's license gate |
| TPRV-06     | 172-06, 07    | Eliminate sessionStorage handoff — URL params/nav state only  | SATISFIED | SvgEditorPage.jsx sessionStorage('pendingTemplate') branch fully deleted; dep array updated to [urlDesignId, urlSceneId]; `grep -rn "pendingTemplate" src/` = 0; E2E Test 4 asserts sessionStorage.getItem('pendingTemplate') returns null pre- and post-Apply |

**No orphaned requirements.** All 6 TPRV-0N IDs from ROADMAP map cleanly to plans 172-01..07.

### Required Artifacts

| Artifact                                                                                       | Expected                                                             | Status     | Details                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/services/templateApplyService.js`                                                         | Apply dispatcher + route builder + DOMPurify                          | VERIFIED   | 95 lines; named exports applyTemplate, editorRouteFor; sole dompurify consumer in src/; DOMPurify config with svg+svgFilters profiles; 500KB size cap; size cap runs before sanitizer |
| `src/components/template-gallery/TemplatePreviewModal.jsx`                                     | Full-screen split-view modal with QuickCustomize + Apply              | VERIFIED   | 315 lines; design-system Modal size="full"; toolbar+split-view grid `md:grid-cols-[65fr_35fr]`; Polotno variant (PolotnoInfoBlock); sanitized dangerouslySetInnerHTML; snapshot semantics; inline Alert on failure |
| `src/components/template-gallery/QuickCustomizePanel.jsx`                                      | Colors/Logo/Text panel emitting serialized SVG                        | VERIFIED   | 420 lines; uses all 8 svgCustomizeService helpers; brandThemeService prefill guarded by prefilledRef; 50ms debounce; 2MB logo cap; accept="image/*"; onBlur text commit; empty-state fallback copy exact |
| `supabase/migrations/168_clone_template_with_customization.sql`                                | Atomic RPC migration                                                  | VERIFIED   | 158 lines; mirrors migration 110 license gate (not 080); SECURITY DEFINER + search_path=public; jsonb_set patches slide design_json; no install_count increment (deferred to Phase 175); GRANT EXECUTE TO authenticated |
| `src/pages/TemplateGalleryPage.jsx` (modified)                                                 | Modal mounted, onSelect wired with index closure                      | VERIFIED   | Import at line 49; previewState at line 108; `.map((t, i) =>` at line 535; onSelect at line 557; modal mounted at lines 564-571 |
| `src/pages/SvgEditorPage.jsx` (modified)                                                       | ?sceneId= branch added, sessionStorage branch removed                  | VERIFIED   | parseQueryParams returns sceneId (line 28); destructure urlSceneId (line 56); scene + slides fetch branch at lines 87-118; no urlTemplateId; no pendingTemplate references |
| `src/services/marketplaceService.js` (modified)                                                | Dead installWithCustomization (+ installTemplateAsScene) deleted      | VERIFIED   | `grep` across src/ tests/ scripts/ supabase/functions/ returns 0 hits for both symbols; export count dropped 24→22 |
| `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx`                         | 8 real passing unit tests                                             | VERIFIED   | 8/8 passing; mocks only templateApplyService + brandThemeService + dompurify + supabase (real QuickCustomizePanel mounts) |
| `tests/unit/components/template-gallery/QuickCustomizePanel.test.jsx`                          | 6 real passing unit tests                                             | VERIFIED   | 6/6 passing; real svgCustomizeService; mocked brandThemeService only |
| `tests/unit/services/templateApplyService.test.js`                                             | 8 real passing unit tests (7 scaffolds + new T-172-04 size cap)       | VERIFIED   | 8/8 passing including `<script>` strip test (Test 5) and 500KB cap (Test 8) |
| `tests/integration/preview-apply/rpc-atomicity.test.js`                                        | 4 real passing integration tests                                      | VERIFIED   | 4/4 passing; single-RPC assertion; license-gate error propagation; fake-timer 500ms delay simulation |
| `tests/e2e/preview-apply.spec.js`                                                              | 7 real Playwright tests covering full flow + TPRV-06 runtime           | VERIFIED   | 7 tests listed by Playwright; TEST_USER_EMAIL skip guard present; assertions for sessionStorage null, URL/currentPage pattern, Escape close, in-flight disabled state; no fixmes, no waitForTimeout, no screenshot-diffs |

### Key Link Verification

| From                                              | To                                                             | Via                                                                                        | Status | Details                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| TemplateGalleryPage.jsx TemplateCard.onSelect     | TemplatePreviewModal (opened with current index)                | `setPreviewState({ open: true, index: i })` closure over `.map((t, i))`                    | WIRED  | Line 557; modal props `open`, `templates={displayedTemplates}`, `initialIndex={previewState.index}`     |
| TemplatePreviewModal                              | templateApplyService                                           | `import { applyTemplate, editorRouteFor }`; handleApply at :106-122                         | WIRED  | setApplying(true) BEFORE await; onNavigate + onClose on success; inline Alert on failure                |
| TemplatePreviewModal                              | QuickCustomizePanel                                            | `<QuickCustomizePanel key={current.id} template={current} onChange={setCustomizedSvg} />`  | WIRED  | Mounted only when editor_type='svg' (line 256); setCustomizedSvg feeds back into sanitizedPreview memo  |
| TemplatePreviewModal                              | DOMPurify (render-site defense-in-depth)                        | `DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } })` at line 131    | WIRED  | useMemo keyed on [current, customizedSvg]; output flows into dangerouslySetInnerHTML                    |
| templateApplyService                              | Supabase RPCs                                                   | `supabase.rpc('clone_template_with_customization', ...)` + `supabase.rpc('clone_template_to_scene', ...)` | WIRED  | Dispatcher at lines 45-74; named-parameter keys match SQL function signature                            |
| templateApplyService                              | DOMPurify                                                       | `import DOMPurify from 'dompurify'` at line 25                                              | WIRED  | Sole consumer in src/ (verified by grep)                                                                |
| SvgEditorPage.jsx                                 | supabase.from('scenes') / supabase.from('scene_slides')         | `.select('id, name, settings').eq('id', urlSceneId).single()` + slides `.limit(1)`          | WIRED  | Lines 88-101; feeds svgContent into `data:image/svg+xml;base64,...` URL                                 |
| SvgEditorPage.jsx                                 | FabricSvgEditor                                                 | `setEditorConfig({ svgUrl, ... })` drives FabricSvgEditor mount (existing wiring)           | WIRED  | Lines 109-117; templateName/width/height pulled from scene row                                          |
| Migration 168                                     | scenes table + scene_slides table                               | INSERT INTO scenes + FOR LOOP INSERT INTO scene_slides (jsonb_set design_json.svgContent)   | WIRED  | Lines 96-143 of migration; single PL/pgSQL function = single transaction                                |
| Migration 168                                     | authenticated role                                              | `GRANT EXECUTE ON FUNCTION clone_template_with_customization(uuid, text, text) TO authenticated` | WIRED  | Line 154                                                                                                |

All 10 key links present, wired, and substantive.

### Data-Flow Trace (Level 4)

| Artifact                       | Data Variable        | Source                                                                                                           | Produces Real Data     | Status   |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- |
| TemplatePreviewModal preview   | `customizedSvg`      | setCustomizedSvg passed to QuickCustomizePanel, which calls it with `serializeSvg(docRef.current)` on every mutation | Yes                    | FLOWING  |
| TemplatePreviewModal preview   | `current.svg_content`| From `displayedTemplates` (real gallery_templates VIEW rows)                                                      | Yes                    | FLOWING  |
| TemplatePreviewModal snapshot  | `snapshot`            | snapshotRef captured on open edge from templates prop                                                             | Yes                    | FLOWING  |
| TemplateGalleryPage modal mount| `displayedTemplates` | Phase 171 memo over real templateGalleryService fetches + filter/sort pipeline                                    | Yes                    | FLOWING  |
| SvgEditorPage scene branch     | `svgContent`         | `slides?.[0]?.design_json?.svgContent` — live supabase read from scene_slides                                      | Yes (when RPC wrote data) | FLOWING |
| QuickCustomizePanel colors     | `controls.colors`    | `extractColors(doc)` from `parseSvgForCustomize(template.svg_content)`                                           | Yes                    | FLOWING  |
| QuickCustomizePanel text       | `controls.texts`     | `extractTextNodes(doc)` — real DOM traversal                                                                       | Yes                    | FLOWING  |
| QuickCustomizePanel logo       | `controls.logoEl`    | `findLogoElement(doc)` — real DOM query                                                                            | Yes                    | FLOWING  |
| Apply RPC payload              | `p_customized_svg`   | DOMPurify.sanitize of customizedSvg (or null when not supplied)                                                    | Yes                    | FLOWING  |

No HOLLOW_PROP or DISCONNECTED nodes. Every UI surface traces to real user-controlled or server-returned data.

### Behavioral Spot-Checks

| Behavior                                                                  | Command                                                                                                                  | Result                                | Status |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------ |
| Phase 172 vitest suite (26 tests) passes                                   | `npx vitest run tests/unit/components/template-gallery tests/unit/services/templateApplyService.test.js tests/integration/preview-apply` | 26 passed / 0 failed / 4 files / 866ms | PASS   |
| Phase 171 regression: template-gallery unit tests still green after wiring | `npx vitest run tests/unit/components/template-gallery`                                                                   | 14 passed / 0 failed / 2 files / 737ms | PASS   |
| Phase 171 regression: TemplateGalleryPage page tests still green           | `npx vitest run tests/unit/pages/TemplateGalleryPage.test.jsx`                                                             | 9 passed / 0 failed / 846ms            | PASS   |
| Playwright E2E listing reports 7 tests                                     | `npx playwright test tests/e2e/preview-apply.spec.js --list`                                                              | 7 tests listed (preview-apply.spec.js) | PASS   |
| dompurify is sole consumer in src/                                         | `grep -rn "dompurify\|DOMPurify" src/`                                                                                   | 1 file: templateApplyService.js + 1 DOMPurify reference in TemplatePreviewModal.jsx (defense-in-depth) | PASS (expected — 2 files per plans 03+05) |
| TPRV-06 source-level scrub                                                 | `grep -rn "sessionStorage.*pendingTemplate\|pendingTemplate" src/`                                                         | 0 hits                                | PASS   |
| Dead-code removal audit                                                    | `grep -rn "installWithCustomization\|installTemplateAsScene" src/ tests/ scripts/ supabase/functions/`                   | 0 hits in any production or test path (docs only) | PASS |
| Migration 168 file exists and has correct shape                            | Manual read — SECURITY DEFINER, search_path=public, jsonb_set design_json, GRANT EXECUTE authenticated, no install_count | All present at lines 46-47,132-140,145-147,154 | PASS |

### Anti-Patterns Found

| File                                                  | Line | Pattern                      | Severity | Impact                                                                                                   |
| ----------------------------------------------------- | ---- | ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| _(none found in Phase 172 source files)_              | —    | —                            | —        | grep for TODO/FIXME/XXX/HACK/PLACEHOLDER/"coming soon"/"not yet implemented" against the 4 new src/ files returned zero hits. Code is production-complete. |

Note: `PolotnoInfoBlock` at TemplatePreviewModal.jsx:300-314 is static informational copy — this is NOT a stub. It is the intentional Polotno variant per D-05/D-16 (TPRV-F1 Polotno in-preview customize is explicitly deferred to v20.1 in ROADMAP Out-of-scope). Classified as "intentional static content" not "placeholder."

### Cross-Phase Integration Check (Phase 171)

| Check                                                          | Status | Notes                                                                                                |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| TemplateGalleryPage still fetches + filters + sorts templates | PASS   | 9/9 TemplateGalleryPage.test.jsx pass; displayedTemplates memo untouched; filter pipeline untouched |
| TemplateCard props unchanged (title, description, imageUrl, orientation) | PASS   | Only onSelect changed from placeholder to real handler; all other props preserved                    |
| Badge overlays (New/Popular) still render                      | PASS   | Lines 538-551 untouched; Badge renders inside StaggeredItem as before                                |
| No regressions to TGAL-01..05 or TDSC-01..05                   | PASS   | Phase 171 test suite reported 9/9 (matches pre-Phase-172 baseline in 171-03-SUMMARY)                 |
| Gallery URL-backed filter state preserved                      | PASS   | `useSearchParams`/query-state code path in TemplateGalleryPage.jsx untouched by Plan 06               |

### Deferred Items (Plan-07 documented; not gap-blocking)

Items explicitly documented as deferred in 172-07-SUMMARY.md "Deferred Manual Verifications" and in 172-VALIDATION.md §Manual-Only Verifications. These are NOT regressions or gaps — they are intentional handoffs to human UAT per UI-SPEC convention.

| # | Item                                                          | Addressed In    | Evidence                                                                                             |
| - | ------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| 1 | Manual UAT: split-view proportions, stacked mobile, keyboard flow, backdrop regression, Apply failure visual, native color picker, Polotno live apply, DOMPurify live payload inspection | Plan 07 Task 2 (checkpoint:human-verify) | 172-VALIDATION.md §Manual-Only Verifications 8-item table; 172-07-SUMMARY.md "Deferred Manual Verifications" section |
| 2 | Flip UI-SPEC Sign-Off checkboxes + VALIDATION frontmatter flags to approved | Plan 07 Task 3 (gated on Task 2) | 172-07-SUMMARY.md "Deviations from Plan" explicitly documents why Task 3 was NOT executed (gated on Task 2 human reply) |
| 3 | Polotno in-preview QuickCustomize (TPRV-F1)                   | v20.1 / Phase 174 | ROADMAP Out-of-scope; 172-CONTEXT.md D-05 |
| 4 | Polotno design_json rendering fidelity inside SceneEditorPage | Phase 174       | 172-CONTEXT.md D-16 explicitly out-of-scope for this phase |
| 5 | use_count increment on Apply                                   | Phase 175       | Migration 168 has explicit deferral comment lines 145-147 |

### Documentation / Summary Drift Check

| Claim                                                                                               | Reality                                                                                  | Drift?                                    |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| SUMMARY "26 vitest tests passing + 7 Playwright tests listed"                                       | Re-ran: 26/26 vitest pass; 7 Playwright tests listed                                     | None                                      |
| SUMMARY "sessionStorage.*pendingTemplate repo-wide zero hits"                                       | Confirmed via grep                                                                       | None                                      |
| SUMMARY "dompurify sole consumer in src/ (templateApplyService.js)"                                 | templateApplyService.js imports dompurify; TemplatePreviewModal.jsx ALSO imports dompurify for defense-in-depth (Plan 05 addition) | Minor — SUMMARY 03 "sole consumer" was true at Plan 03 completion; Plan 05 added a second consumer at TemplatePreviewModal.jsx:15 for render-site T-172-01 mitigation. This is documented in 172-05-SUMMARY.md and 172-CONTEXT.md D-17 but worth flagging. Not a functional issue. |
| SUMMARY "Mirrored migration 110 instead of 080"                                                     | Confirmed — migration 168 license gate uses `v_template.license IN ('free','pro')` + allow-list for enterprise, matching 110 | Acknowledged in Plan 02 SUMMARY as intentional bug-avoidance |
| SUMMARY "filename typo in plan ref (080_clone_template_to_scene vs 080_template_marketplace)"       | 080_template_marketplace.sql is the actual file                                          | Acknowledged in Plan 02 SUMMARY; inconsequential |
| SUMMARY "Plan 07 SPA pseudo-routing (React state, not window.location)"                             | Confirmed — E2E reads App's currentPage React state via fiber BFS; URL does not change after Apply | Acknowledged in Plan 07 SUMMARY as intentional deviation |
| SUMMARY "UI-SPEC + VALIDATION sign-off flags NOT flipped"                                           | Confirmed — flags still pending                                                          | None; documented as deferred              |

### Suspicious Patterns / Latent Issues

1. **Fiber BFS reliance in E2E Test 3** — `readCurrentPage(page)` reads React 18's `__reactContainer$` internal key to reach the App's `currentPage` useState cell. If React upgrades and changes the attachment key, Test 3 will silently fail to read state and incorrectly assert "not changed." The helper does return `{ ok: false, reason }` on failure, but only the "poll until pattern matches" assertion uses this — a false-positive risk exists if the helper starts returning `ok: false` and the poll times out silently. **Severity: low-info** — the test still explicitly checks `after.ok === true` before asserting.

2. **Modal preview uses `dangerouslySetInnerHTML`** even after DOMPurify sanitization. This is documented and intentional (T-172-01 render-site mitigation with USE_PROFILES svg+svgFilters), but merits a one-line mention because future refactors that bypass sanitizedPreview memo would reintroduce the risk. Currently safe.

3. **Migration 168 has NOT been re-verified in this verification pass** — phase context states it was APPLIED to gdxizdiltfqeugbsgtpx but the verifier cannot exercise the live DB from this sandbox. The Plan 02 Task 2 human-verify gate covered the apply; no regression detected because all automated tests mock supabase.rpc. **Severity: info** — if manual UAT exercises the live flow and Apply succeeds, this will be confirmed. E2E Test 3 against a live DB (when TEST_USER_EMAIL is set) would also exercise it.

4. **Mocked production behavior audit:**
   - Unit Test 5 (DOMPurify `<script>` strip) uses mocked DOMPurify that returns caller-supplied sanitized string — asserts the WIRING of sanitize → rpc, not the ACTUAL sanitize behavior. This is correct unit-test hygiene (we trust DOMPurify's 7000+ tests). Live payload strip verification is correctly listed as Manual UAT item 8.
   - Modal Test 8 (live-preview innerHTML) uses identity DOMPurify mock to let fixture bytes flow through; this is valid because we want to test the MEMO + render wiring, not DOMPurify's own correctness.
   - No mock hides a real bug that the verifier found.

### Human Verification Required

9 items require eye-on-glass / live-flow verification (see YAML frontmatter for full list). Summary: 8 from 172-VALIDATION.md §Manual-Only Verifications + 1 administrative task to flip sign-off flags after the above items PASS. These are intentionally deferred per Plan 07 Task 2 (checkpoint:human-verify gate).

**No blocking issues prevent closing the phase once manual UAT is complete.** All automated/structural evidence is green. The phase is ready for user UAT walkthrough.

### Gaps Summary

**No gaps found.** All 6 TPRV requirements have code + tests + wiring. All 5 ROADMAP success criteria are satisfied at the automated level. All 3 known deferrals (Plan 02 migration-110-mirror, Plan 02 filename-typo-in-ref, Plan 07 SPA-pseudo-routing) are documented and intentional. Phase 171 regressions are clean (9/9 + 14/14 green).

The only outstanding work is the human UAT walkthrough of the 8-item visual/device checklist and the subsequent flip of sign-off flags. This is by design — UI-SPEC sign-off is supposed to be eye-on-glass.

---

## Recommendation

**PASS WITH NOTES — Proceed to user UAT, then close phase.**

Summary verdict: **PASS WITH NOTES**. Phase 172 delivers what it promised: a race-safe, atomic, full-screen preview + customize + apply flow with zero sessionStorage handoff. All automated verification is green; no stubs; no dead code; no phase 171 regressions. The 9 items flagged as `human_verification` in frontmatter are deferred visual/device checks documented in the plan, NOT new defects.

Recommended next action:
1. User walks the 8-item `172-VALIDATION.md §Manual-Only Verifications` checklist.
2. On "all passed (or acceptable DEFERRED)", a small follow-up change flips:
   - `172-VALIDATION.md` frontmatter → `nyquist_compliant: true`, `wave_0_complete: true`, `Approval: approved`
   - `172-UI-SPEC.md §Checker Sign-Off` → 6×`[x]`, `Approval: approved`
3. Phase 172 is then fully closed and `/gsd-plan-phase 173` can proceed.

---

_Verified: 2026-04-21T21:07:42Z_
_Verifier: Claude (gsd-verifier), opus-4-7 1M-context_
