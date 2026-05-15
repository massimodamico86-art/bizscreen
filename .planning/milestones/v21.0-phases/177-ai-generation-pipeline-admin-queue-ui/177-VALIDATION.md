---
phase: 177
slug: ai-generation-pipeline-admin-queue-ui
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
validation_signed_off: 2026-05-11
wave_0_evidence_ref: "177-01-SUMMARY.md key-files block — 5 RED test files created: tests/integration/edgeFunctionSpike.test.js (47 LOC), tests/integration/generateSvgTemplate.test.js (67 LOC), tests/integration/approveDraftPipeline.test.js (76 LOC), tests/integration/promptLibraryParity.test.js (32 LOC), tests/unit/generateValidatorOrder.test.js (68 LOC). All 5 RED tests committed before any production code per Plan 01 Wave 0 deliverable; downstream waves (Plan 02 onward) flipped them to GREEN. Cross-reference: Phase 180 Plan 04 spot-check 2026-05-11 confirms files physically present + 177-01-SUMMARY.md cites them in key-files."
---

# Phase 177 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `177-RESEARCH.md` §"Validation Architecture" + override addendum (D-04, D-05, D-15).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (already installed; verified by 176-03-SUMMARY vitest output) |
| **Config file** | `vitest.config.js` (existing) |
| **Quick run command** | `npx vitest run --reporter=basic <file>` |
| **Full suite command** | `npm test` |
| **EF integration command** | `npx vitest run tests/integration/generateSvgTemplate.test.js` (skip-guarded via `describe.runIf(SHOULD_RUN)`) |
| **E2E command** | `npx playwright test tests/e2e/admin-template-queue.spec.js` |
| **Estimated runtime** | unit ~3s / integration ~30s (skipped if EF not deployed) / E2E ~45s |

---

## Sampling Rate

- **After every task commit:** Run the targeted unit/integration test for the file just touched (`npx vitest run --reporter=basic <file>`).
- **After every plan wave:** Run `npm test` (full Vitest suite).
- **Before `/gsd-verify-work`:** Full suite green + Wave-5 Playwright suite green + manual `eval-prompt-library.cjs` run captured.
- **Max feedback latency:** ~3s per task (unit), ~30s per wave (integration), ~45s for E2E.

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Wave |
|--------|----------|-----------|-------------------|-------------|------|
| TGEN-01 | EF returns draftId on valid generation | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "happy path"` | ❌ W0 | 0 → 2 |
| TGEN-02 | EF retries 2× on validator fail; lands `needs_human_review` after 3 fails | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "retry budget"` | ❌ W0 | 0 → 2 |
| TGEN-03 | EF returns 403 to non-admin caller | integration | `npx vitest run tests/integration/generateSvgTemplate.test.js -t "admin gate"` | ❌ W0 | 0 → 2 |
| TGEN-04 | `dist/` contains zero `ANTHROPIC` substrings | smoke | `npm run build && [ "$(grep -r ANTHROPIC dist/ \| wc -l)" -eq 0 ]` | ❌ W5 | 5 |
| TGEN-05 | `validateSvg` called BEFORE any INSERT into `template_drafts` | unit | `npx vitest run tests/unit/generateValidatorOrder.test.js` | ❌ W0 | 0 → 2 |
| TGEN-06 | A/B harness produces ≥30pp first-pass improvement | manual-only | `node scripts/eval-prompt-library.cjs --runs=5` (~$0.63 / run) | ❌ W5 | 5 |
| TADM-01 | Pending tab renders draft list with sanitized thumbnails | E2E | `npx playwright test admin-template-queue.spec.js -g "pending list"` | ❌ W5 | 4 → 5 |
| TADM-02 | Approve / Edit (modal) / Reject row actions work | E2E | `npx playwright test admin-template-queue.spec.js -g "row actions"` | ❌ W5 | 4 → 5 |
| TADM-03 | Approve produces `svg_templates` row + S3 PNG in same request | integration | `npx vitest run tests/integration/approveDraftPipeline.test.js` | ❌ W0 | 0 → 3 |
| TADM-04 | Non-admin user redirected from `admin-template-queue` | E2E | `npx playwright test admin-template-queue.spec.js -g "auth gate"` | ❌ W5 | 4 → 5 |
| (parity) | `promptLibrary.js` ≡ `prompts.json` byte-equal entries | unit | `npx vitest run tests/integration/promptLibraryParity.test.js` | ❌ W0 | 0 → 1 |
| (spike) | Wave 0 Edge Function spike — `@anthropic-ai/sdk` + `deno-dom` + `resvg-wasm` boot | integration | `npx vitest run tests/integration/edgeFunctionSpike.test.js` | ❌ W0 | 0 |

*Status legend (filled per task during execution): ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/edgeFunctionSpike.test.js` — Deno-compat spike: minimal EF boots with `@anthropic-ai/sdk` + `jsr:@b-fuze/deno-dom` + `npm:@resvg/resvg-wasm`, returns a known-good SVG, runs `svgValidator` with injected DOMParser, rasterizes to PNG. **Resolves D-17 landmine** (Phase 176 SUMMARY's Deno DOMParser open question).
- [ ] `tests/integration/generateSvgTemplate.test.js` — RED stubs covering TGEN-01 / TGEN-02 / TGEN-03 / TGEN-05.
- [ ] `tests/integration/approveDraftPipeline.test.js` — RED stub covering TADM-03 (rasterize → S3 → INSERT).
- [ ] `tests/integration/promptLibraryParity.test.js` — RED stub asserting `src/services/aiTemplate/promptLibrary.js` and `supabase/functions/generate-svg-template/prompts.json` are deep-equal.
- [ ] `tests/unit/generateValidatorOrder.test.js` — RED stub asserting INSERT happens AFTER validateSvg in the EF handler.
- [ ] `tests/conftest.js` (or shared `setup-tests.js`) — Vitest skip-guards: `SHOULD_RUN = process.env.SUPABASE_URL && process.env.ANTHROPIC_API_KEY`.

*Wave 0 deliverable: all RED tests committed; downstream waves flip them to GREEN.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A/B prompt-library lift ≥30pp | TGEN-06 SC-6 | Anthropic API spend (~$0.63/run) — not safe to gate CI on cost; repeatability requires a recent secret + threshold tuning per CONTEXT.md D-13 | `node scripts/eval-prompt-library.cjs --runs=5` then paste headline number into `177-VERIFICATION.md`. Re-run after prompt iteration if first run lands in [25, 35]pp gap. |
| Edge Function deploy on dev box | infra | `supabase functions deploy` requires Docker + Supabase CLI ≥2.7.0 (verify via `supabase --version`); `static_files` config requires deploy from local CLI not dashboard | Step in plan: `supabase functions deploy generate-svg-template --use-api`. If Docker absent, pause and install before Wave 5. |
| End-to-end Approve flow visual sanity | TADM-03 | Live S3 + live Anthropic call; verifies thumbnail appears in `gallery_templates` UI without lag | Login as admin, generate 1 template, approve, navigate to `template-gallery`, confirm new thumbnail appears within 5s of Approve click. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify command OR documented Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (spike + 5 RED test files)
- [ ] No `--watch` flags in any command (CI-safe)
- [ ] Feedback latency < 30s for unit/integration; E2E budgeted in CI separately
- [ ] `nyquist_compliant: true` to be set after Wave 0 commit lands

**Approval:** pending — flips to `approved YYYY-MM-DD` when Wave 0 RED tests are committed.
