---
phase: 178-vertical-content-seeding
plan: 04
subsystem: api
tags: [prompt-library, parity, anthropic, system-prompt, vertical-specialization]

# Dependency graph
requires:
  - phase: 177
    provides: promptLibrary.js + prompts.json baseline (6 cross-vertical entries) + parity test
  - phase: 178
    provides: Plan 01 RED parity extensions (≥18 + uniqueness + templateTypesPerVertical cross-check)
provides:
  - "promptLibrary array of 39 entries (6 cross-vertical preserved + 33 per-vertical)"
  - "templateTypesPerVertical named export with ≥8 distinct types per vertical (matches TVRT-01..03 enumerations)"
  - "Deep-equal parity-locked .js + .json mirrors"
  - "Niche-type pinning enforced: queue_status NEVER in retail; drive_thru-restaurants only; healthcare niches single-vertical"
affects:
  - 178-06 (Generate-tab UI consumes templateTypesPerVertical for dropdown filtering)
  - 178-07 (seedTopics' (vertical, template_type) cells must match templateTypesPerVertical[vertical])
  - 178-08 (Wave 5 verification asserts ≥8 distinct types per vertical)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-shot CJS generator script as single source of truth for both .js + .json (eliminates manual paired-edit drift; produces deep-equal output by construction)"
    - "Per-cell GUIDANCE block authored from a base-type HARD RULES preamble + 3-5 vertical-specific bullets"
    - "Niche-type pinning enforced at generation time: every (template_type, vertical) entry must appear in templateTypesPerVertical[vertical] or generation fails"

key-files:
  created: []
  modified:
    - src/services/aiTemplate/promptLibrary.js
    - supabase/functions/generate-svg-template/prompts.json

key-decisions:
  - "Used a one-shot CJS generator script (/tmp/gen-prompt-library.cjs) to produce both .js and .json from a single source of truth — guarantees deep-equal parity by construction. The script also asserts cross-check + uniqueness + ≥8-types-per-vertical at generation time so any drift fails before files are written."
  - "Selected `base` type per per-vertical entry to inherit the closest cross-vertical HARD RULES preamble: e.g., flash_sale → promo's preamble; daypart_menu → menu's preamble; provider_directory → wayfinding's preamble. This satisfies the plan's verbatim preservation of HARD RULES while letting the GUIDANCE block change per cell."
  - "All bullets in vertical-specific GUIDANCE blocks reference concrete element IDs (e.g., id=\"text-bullet-1\", id=\"product-image-placeholder\") so the LLM can build consistent customization-anchor structures across the library."
  - "queue_status entries pinned strictly to {restaurants, healthcare} per TVRT-02 enumeration (which does NOT include queue_status for retail). Generator's cross-check assertion would fail if a queue_status-retail entry were added — locked out by construction."

patterns-established:
  - "Generator-driven authoring of paired source-of-truth files (eliminates parity drift)"
  - "Inline cross-check + uniqueness assertions in the generator (fail fast at generation, not at runtime)"

requirements-completed: [TVRT-01, TVRT-02, TVRT-03]

# Metrics
duration: ~25min
completed: 2026-05-10
---

# Phase 178 Plan 04: promptLibrary Expansion + templateTypesPerVertical Summary

**39 promptLibrary entries (6 cross-vertical preserved + 12 restaurants + 11 retail + 10 healthcare) + new templateTypesPerVertical mapping with ≥8 distinct types per vertical; D-09/D-11/D-12 closed; all 5 parity test assertions GREEN**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-10
- **Tasks:** 3 (Task 1 per-vertical entry authoring, Task 2 niche-type pinning verification, Task 3 templateTypesPerVertical mapping export)
- **Files modified:** 2
- **Entries added:** +33 (from 6 → 39)
- **LOC added:** +562 / −1 across both files

## Accomplishments

- promptLibrary.js: 39 total entries with full HARD RULES preamble verbatim across all entries (every system_prompt contains `viewBox="0 0 1920 1080"` literal)
- prompts.json: deep-equal mirror of promptLibrary array (562 LOC vs 50 baseline)
- New named export: `templateTypesPerVertical` mapping with 4 keys (null + restaurants + retail + healthcare); restaurants=12 distinct types, retail=11, healthcare=10
- Plan 01 RED parity test extensions all flipped GREEN: ≥18 entries (39 actual), (template_type, vertical) uniqueness, every entry's pair in templateTypesPerVertical[vertical]
- Phase 177 baseline assertions preserved: deep-equal + ≥6 entries
- Final vitest result: 5/5 parity assertions PASS

## Task Commits

1. **Task 1+2+3 combined: promptLibrary expansion + templateTypesPerVertical** — `5bfac934` (feat)

(Plan 04's 3 tasks share the same files; the generator script produces all 3 outcomes atomically — a single commit captures the full transition from 6 → 39 entries + new mapping export.)

## Files Created/Modified

- `src/services/aiTemplate/promptLibrary.js` — expanded from 6 → 39 entries; new `templateTypesPerVertical` named export added (+299 LOC)
- `supabase/functions/generate-svg-template/prompts.json` — deep-equal mirror of promptLibrary array (+264 LOC)

## Per-Vertical Entry Breakdown

| Vertical     | Entry count | Distinct template_types |
|--------------|-------------|-------------------------|
| null (cross) | 6           | 6 (preserved)           |
| restaurants  | 12          | 12 ✓ ≥8                 |
| retail       | 11          | 11 ✓ ≥8                 |
| healthcare   | 10          | 10 ✓ ≥8                 |
| **TOTAL**    | **39**      | —                       |

## Niche-Type Pinning Audit

| Template type            | Pinned to                  | Enforced? |
|--------------------------|----------------------------|-----------|
| drive_thru               | restaurants ONLY           | ✓         |
| queue_status             | {restaurants, healthcare}  | ✓ (NEVER retail) |
| waiting_room_ambient     | healthcare ONLY            | ✓         |
| emergency_alert          | healthcare ONLY            | ✓         |
| vaccination_reminder     | healthcare ONLY            | ✓         |
| provider_directory       | healthcare ONLY            | ✓         |
| clinic_hours_pharmacy    | healthcare ONLY            | ✓         |
| daypart_menu             | restaurants ONLY           | ✓         |
| daily_special            | restaurants ONLY           | ✓         |
| social_proof             | restaurants ONLY           | ✓         |
| hours_loyalty_drive_thru | restaurants ONLY           | ✓         |
| flash_sale               | retail ONLY                | ✓         |
| new_arrivals             | retail ONLY                | ✓         |
| product_spotlight        | retail ONLY                | ✓         |
| social_proof_ugc         | retail ONLY                | ✓         |
| loyalty_rewards          | retail ONLY                | ✓         |
| hours_window             | retail ONLY                | ✓         |

## Decisions Made

- **Generator-script authoring**: Wrote a one-shot CJS generator (`/tmp/gen-prompt-library.cjs`) that produces both promptLibrary.js and prompts.json from a single source of truth. This eliminates manual paired-edit drift — the deep-equal parity test is GREEN by construction. Generator also asserts cross-check + uniqueness + ≥8-types-per-vertical at generation time so any drift fails before files are written.
- **Base-type HARD RULES inheritance**: For per-vertical entries, the `base` field selects the closest cross-vertical entry's preamble (e.g., flash_sale → promo's preamble; daypart_menu → menu's preamble). This satisfies the plan's "HARD RULES preamble verbatim" requirement while letting the GUIDANCE block change per cell.
- **Concrete element IDs in GUIDANCE bullets**: Every per-vertical entry's GUIDANCE bullets reference concrete `id="..."` element IDs (e.g., `id="text-bullet-1"`, `id="product-image-placeholder"`). This gives the LLM consistent customization-anchor structures across the library.

## TVRT Enumeration Coverage

- **TVRT-01 Restaurants** (≥8 distinct types): all 8 named types covered + 4 extras = 12 distinct types ✓
  - Named: menu, daypart_menu, daily_special, announcement, social_proof, queue_status, seasonal_campaign, hours_loyalty_drive_thru
  - Extras: drive_thru, promo, reminder, wayfinding
- **TVRT-02 Retail** (≥8 distinct types): all 8 named types covered + 3 extras = 11 distinct types ✓
  - Named: flash_sale, new_arrivals, product_spotlight, seasonal_campaign, social_proof_ugc, loyalty_rewards, wayfinding, hours_window
  - Extras: promo, announcement, reminder
- **TVRT-03 Healthcare** (≥8 distinct types): all 8 named types covered + 2 extras = 10 distinct types ✓
  - Named: waiting_room_ambient, queue_status, health_tip, reminder, provider_directory, vaccination_reminder, emergency_alert, clinic_hours_pharmacy
  - Extras: announcement, wayfinding

## Deviations from Plan

**None — plan executed as written.** All acceptance criteria met:

- promptLibrary.js array length = 39 (≥30 ✓)
- 6 cross-vertical (≥6 ✓), 12 restaurants (≥8 ✓), 11 retail (≥8 ✓), 10 healthcare (≥8 ✓)
- Each vertical has ≥8 distinct template_types (12 / 11 / 10)
- Every entry's system_prompt contains the viewBox literal (39 occurrences = 39 entries)
- prompts.json has same entry count (39)
- All 6 cross-vertical IDs preserved verbatim
- queue_status pinned to {restaurants, healthcare} only — no retail entry
- drive_thru pinned to restaurants only
- waiting_room_ambient / emergency_alert / vaccination_reminder pinned to healthcare only
- templateTypesPerVertical mapping exported with all 4 keys; ≥8 types per vertical (12/11/10); queue_status NOT in retail
- All 5 parity test assertions GREEN (deep-equal, ≥6 baseline, ≥18, uniqueness, cross-check)

## Issues Encountered

- Initial generator script had wrong path resolution (`path.resolve(__dirname, '..', ...)` from /tmp/ resolved to /). Fixed by hardcoding PROJECT_ROOT to `/Users/massimodamico/bizscreen`. No impact on output correctness.

## Next Plan Readiness

- **Plan 05** (bulk approve/reject EF handlers) can proceed independently — no dependency on promptLibrary content
- **Plan 06** (admin UI) ready to consume `templateTypesPerVertical` for the Generate-tab template_type dropdown filtering
- **Plan 07** (seedTopics.js + seed driver) ready — every (vertical, template_type) cell scheduled in Plan 07 must match templateTypesPerVertical[vertical] (asserted by Plan 01's RED schema test)
- **Plan 08** (Wave 5 verification) ready — TVRT-01..03 enumeration coverage check is now satisfiable at the prompt-library layer; live content waves in Plan 08 will exercise these prompts

---
*Phase: 178-vertical-content-seeding*
*Completed: 2026-05-10*
