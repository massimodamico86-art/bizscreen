# Pitfalls Research

**Domain:** Digital signage template platform — adding LLM-to-SVG generation, third-party SVG bulk import, Polotno QuickCustomize, and gallery virtualization to an existing v20.0 infrastructure
**Researched:** 2026-05-06
**Confidence:** HIGH (capability-specific, verified against existing codebase + official docs)

---

## Critical Pitfalls

### Pitfall A1: Stored Prompt Injection via Admin-Created Template Descriptions

**What goes wrong:**
When the AI generator pipeline stores the admin's input prompt alongside the template record (for audit/reuse), a future step that feeds stored template metadata back into the LLM — e.g., "regenerate variations of this template" — becomes an indirect prompt injection vector. An admin who can write template names or descriptions can craft a payload that escapes the system prompt at regeneration time and causes the model to emit malicious SVG containing `<script>`, `javascript:` URLs, or `on*` event handlers.

This is distinct from a direct injection (admin types payload into the generator UI). It is the *stored* form: the payload survives in the database and activates silently on the next automated generation pass.

**Why it happens:**
Developers trust admin-tier content implicitly and pass stored text directly into LLM prompts without sanitizing or quoting it. The pipeline treats "these are safe because they came from an admin" as an axiom — but the database is a second-order attack surface.

**How to avoid:**
- Never concatenate raw stored text directly into the system or user prompt. Wrap stored prompts in a delimited block (`---TEMPLATE_DESCRIPTION_START---`) and instruct the system prompt to treat everything inside as data, not instructions.
- Strip HTML/XML characters from stored prompts before they enter the generation context.
- Always run the svgValidator + DOMPurify pipeline on AI-generated SVG output *before* it enters the admin queue — not just before publish. The admin queue is not a safe staging area; it must be a post-validation holding area.

**Warning signs:**
- Generation pipeline passes `template.description` or `template.prompt` directly into a template literal without escaping.
- Admin queue entries bypass svgValidator because "the AI already produced valid SVG."

**Phase to address:** AI generator phase (TPIPE). The generation Edge Function and admin queue ingestion must both include a post-generation svgValidator pass with explicit prompt-as-data wrapping in the system prompt.

---

### Pitfall A2: LLM Model Deprecation Silently Breaking the Pipeline

**What goes wrong:**
The AI generation pipeline is built against a specific model (e.g., `gpt-4o`). When OpenAI deprecates that model — GPT-4o was retired in February 2026; GPT-5 is now the successor — the API returns a 404 or substitutes a different model. GPT-5 enforces stricter JSON schema validation and changes structured output behavior. The pipeline breaks silently or emits structurally different SVG that passes the old svgValidator rules but renders incorrectly (wrong viewport, missing elements, different color token behavior).

**Why it happens:**
Model name is hardcoded in the Edge Function. No eval suite exists to catch schema drift after a model swap. The pipeline only breaks in production when an admin next attempts to generate a template.

**How to avoid:**
- Use an environment variable for the model name (`OPENAI_MODEL_ID`) so it can be swapped without a code deploy.
- Build a regression eval suite — a minimal set of 5-10 canonical prompts with known expected SVG structure (presence of viewBox, no forbidden color tokens, customization anchors present). Run this suite in CI against the configured model on every PR that touches the generation pipeline.
- Pin model to an explicit snapshot version (e.g., `gpt-4o-2024-08-06`) rather than the floating alias, so deprecation is controlled.

**Warning signs:**
- Generation Edge Function has a hardcoded model string literal.
- No CI job runs generation smoke tests.
- Admin queue fills with "generation failed" entries after an OpenAI changelog update.

**Phase to address:** AI generator phase (TPIPE). The regression eval suite is a launch criterion for the generation pipeline, not a nice-to-have.

---

### Pitfall A3: Cost Runaway from Retry Storms in the Generation Pipeline

**What goes wrong:**
The generation Edge Function calls the LLM API, gets a structurally invalid SVG back (which happens ~10-30% of the time without constrained output), and retries automatically. Retry logic with exponential backoff can silently burn hundreds of API calls if the model is producing consistently malformed output for a given prompt style. At $15/M input tokens for GPT-4o-class models, a batch generation run of 373 templates (to reach ~500 from 127) with 3 retries each and a 4K-token average SVG prompt becomes significant cost exposure.

**Why it happens:**
Retry logic is added as a defensive measure without a per-run cost ceiling. Developers reason "retries are cheap" until a batch run on a new vertical category triggers a prompt pattern the model systematically fails on.

**How to avoid:**
- Implement a hard maximum of 2 retries per generation attempt. On the second failure, mark the job as `needs_human_review` and park it rather than retrying indefinitely.
- Use OpenAI structured outputs (JSON schema mode) to constrain the model's SVG output to a pre-defined element schema. This reduces the structural failure rate from ~20% to under 5%.
- Set a monthly spend cap at the OpenAI account level (Settings → Billing) *before* running the first batch. The cap should be set to ~2× the estimated single-run cost.
- Log token counts per generation attempt to Supabase so cost can be audited.

**Warning signs:**
- Edge Function retry logic has no maximum attempt cap.
- No spend alert configured in OpenAI billing dashboard before first batch run.
- Generation logs show repeated attempts for the same `job_id`.

**Phase to address:** AI generator phase (TPIPE). Cost controls and retry caps are preconditions for the first production batch run, not post-hoc additions.

---

### Pitfall A4: Structured Output Guarantee Is Not Absolute

**What goes wrong:**
Structured outputs (JSON schema mode) are often described as a guarantee, but they constrain *schema structure* — field types and presence — not *semantic content*. A model can emit a `<rect>` with `fill="currentColor"` (which svgValidator Rule 3 will catch), or emit a `viewBox="0 0 NaN NaN"` value (a syntactically valid string that renders as a blank canvas), or produce an SVG with all text elements empty. The admin reviewing the queue sees a thumbnail that looks blank and approves it anyway.

**Why it happens:**
Developers interpret "structured output" as "valid output" and skip post-generation validation. The structured output schema ensures valid JSON *wrapping* the SVG string — it does not validate the SVG content itself.

**How to avoid:**
- The svgValidator must run on every generated SVG, regardless of structured output mode, before the record enters the admin queue.
- Add a thumbnail rasterization step (`@resvg/resvg-js`) immediately after generation. If the rasterizer returns a blank or all-white PNG above a luma threshold, flag the job as `suspect_output` for human review.
- Include semantic checks in the svgValidator for AI-generated paths: warn if no visible colored elements exist (all fills are white or transparent).

**Warning signs:**
- Admin queue thumbnails are blank but jobs are not flagged.
- svgValidator is only called at the admin-publish step, not at generation ingest.
- Structured output schema only enforces the JSON wrapper, not SVG content constraints.

**Phase to address:** AI generator phase (TPIPE). The generation pipeline MUST run svgValidator + thumbnail rasterization before writing to the admin queue, not at publish time.

---

### Pitfall B1: SVG `foreignObject` Bypasses svgValidator's Existing Rule Set

**What goes wrong:**
The existing svgValidator (6 rules: well-formed XML, dimensions, no currentColor/var(), DOMPurify drift check, customization anchors, size cap) does not explicitly block `<foreignObject>`. An SVG with `<foreignObject><div><script>...</script></div></foreignObject>` or `<foreignObject><iframe src="javascript:..."></iframe></foreignObject>` is well-formed XML, has dimensions, has no forbidden color tokens, and DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }` strips the script — but only if DOMPurify is current. CVE-2026-41238 documents a prototype pollution bypass in DOMPurify that allows event handlers to survive sanitization. Additionally, if the SVG is rendered as an `<img>` tag, `foreignObject` is silently dropped by the browser; if rendered as an inline `<svg>`, it executes.

The current platform renders templates as inline SVG in the preview modal (live preview with brand color substitution), making `foreignObject` live attack surface.

**Why it happens:**
Bulk import pipelines assume the svgValidator is sufficient because it was designed for hand-authored templates. Third-party SVG sources (Wikimedia, OpenClipArt, third-party packs) regularly include `foreignObject` for accessibility descriptions — so it cannot be categorically blocked without false positives — but the *content* of foreignObject must be sanitized.

**How to avoid:**
- Add Rule 7 to svgValidator: detect `foreignObject` elements and, for bulk import paths, either (a) strip them entirely or (b) require that their content is only `<desc>` / `<title>` / `<metadata>`. Block any `foreignObject` containing HTML elements.
- Keep DOMPurify pinned and updated; add a Snyk/Dependabot alert for `dompurify` specifically.
- For the bulk import pipeline (not user-uploaded templates), prefer stripping foreignObject entirely — accessibility descriptions can be added separately.

**Warning signs:**
- svgValidator passes SVG files containing `<foreignObject>` without warning.
- DOMPurify version in `package.json` is not pinned to a patch version.
- Bulk import does not run through DOMPurify; it only runs through svgValidator.

**Phase to address:** Import phase (TPIPE). Rule 7 must be added to svgValidator before the first bulk import run. This is a prerequisite gate, not a post-import fix.

---

### Pitfall B2: Attribution Loss — License Obligation Silently Unfulfilled

**What goes wrong:**
Third-party SVG imports under Creative Commons Attribution (CC BY), CC BY-SA, or similar licenses require attribution to be displayed to the *end user* at the time of use. Storing attribution metadata in the database (e.g., a `license_attribution` column on `svg_templates`) is necessary but not sufficient. If the attribution is not surfaced in `TemplatePreviewModal` and on the applied scene, the license obligation is unfulfilled — even if the data is stored correctly. This is a legal risk, not a technical bug: platforms have received DMCA takedowns and legal notices specifically for failing to display required attribution.

**Why it happens:**
The import pipeline correctly stores attribution metadata. The UI work to surface it is deferred ("we have the data, we'll add the display later"). "Later" never arrives before a user applies an attribution-required template and the work shows up on a display without attribution.

**How to avoid:**
- Attribution display in `TemplatePreviewModal` is a launch criterion for the import pipeline, not a deferred nicety. The import phase MUST include an attribution UI display task.
- For CC-licensed assets, attribution must also persist to the scene itself (a metadata field on the scene record), so Proof of Play reports can include attribution context.
- SPDX or equivalent license classification must accompany each imported SVG in the database (a `license_spdx` column). Do not rely on free-text `license` strings that degrade over time.

**Warning signs:**
- `svg_templates` schema has no `license_spdx` or `attribution_text` column.
- `TemplatePreviewModal` shows no attribution credit for imported templates.
- Import pipeline task list has "display attribution" as a deferred item.

**Phase to address:** Import phase (TPIPE). Attribution display in the preview modal is a legal requirement, not a UX enhancement. It must ship with the first import batch.

---

### Pitfall B3: SPDX License Detection False Positives Leading to Wrong License Classification

**What goes wrong:**
Automated SPDX detection tools (scancode, licensee, spdx-tools) have known false positive rates — they match license text fragments in comments, README sections, or embedded metadata that do not reflect the actual license of the SVG file. A file with a comment mentioning "MIT" in a copyright block may be classified as MIT when it is actually CC BY 4.0. Acting on false positives results in displaying incorrect attribution or, worse, treating an attribution-required work as attribution-free.

**Why it happens:**
Bulk import pipelines run automated license detection and trust the output. SVG files from aggregators (e.g., OpenClipArt) often have inconsistent metadata — the SVG `<metadata>` block may say one license, the README of the pack may say another, and the upstream source may say a third.

**How to avoid:**
- Automated SPDX detection is a classification aid, not a classification authority. Every import batch must have a human review step for license classification before the records are marked `is_active = TRUE`.
- Prefer source packs with explicit machine-readable SPDX manifests (e.g., a `LICENSE.spdx` file) over scanning individual SVG metadata.
- Store both `license_detected` (automated) and `license_confirmed` (human-reviewed) columns. Only `license_confirmed` licenses enter the active gallery.
- When classification is ambiguous, default to the most restrictive interpretation (CC BY over CC0).

**Warning signs:**
- Import pipeline marks templates active immediately after automated license detection without a human review queue.
- No distinction between "detected license" and "confirmed license" in the schema.

**Phase to address:** Import phase (TPIPE). The import schema must include `license_confirmed` as a non-nullable field with no default, forcing human review as a required step before activation.

---

### Pitfall C1: Polotno JSON Schema Drift Breaking QuickCustomize Mutations

**What goes wrong:**
The QuickCustomize mutation for Polotno entries must traverse `template_library_slides` JSON to find and update text elements, color fills, and logo image references. The Polotno JSON schema is not publicly versioned and changes between SDK releases. A schema migration (e.g., `text.fontFamily` moved into `text.fontStyle.family`, or fill colors represented differently in a newer SDK version) will cause the mutation logic to silently produce no changes — the customization panel updates the UI but the underlying JSON is untouched.

The current codebase communicates with Polotno via `postMessage` through an iframe (see `PolotnoEditor.jsx`). The Polotno SDK inside the iframe may be at a different version than the mutation logic in the main app.

**Why it happens:**
Developers write mutation logic against the current schema, document it, and treat it as stable. Polotno SDK updates are applied to the iframe bundle without updating the mutation logic. No integration test exercises the mutation round-trip end-to-end.

**How to avoid:**
- Pin the Polotno SDK version in the iframe bundle. Do not auto-update. When updating, run the full QuickCustomize test suite first.
- Write mutation logic as pure functions that operate on the Polotno JSON object and are separately unit-testable without the Polotno runtime.
- Store the Polotno SDK version used to create a template record alongside the slide JSON. A version mismatch between the stored version and the active SDK version is a warning signal.
- Add a round-trip integration test: apply a known mutation, serialize the result, re-parse it, and verify the specific field changed.

**Warning signs:**
- QuickCustomize changes display in the preview panel but the applied scene has the original colors/text.
- No unit tests for the Polotno JSON mutation functions.
- Polotno SDK version in the iframe bundle does not match the version documented in STACK.md.

**Phase to address:** Polotno QuickCustomize phase (TPRV-F1). Schema version pinning and mutation unit tests are prerequisites to writing the mutation logic itself.

---

### Pitfall C2: Mutation Idempotence — Applying QuickCustomize Twice Corrupts the Template

**What goes wrong:**
The QuickCustomize mutation logic replaces color values and text strings in the Polotno JSON. If the apply path re-fetches the *original* template JSON and applies the current customizations, this is idempotent. But if the mutation operates on the *previously mutated* state held in component state, a second "Apply" click (or a state update that triggers a re-render loop) applies the mutation twice — doubling hex color darkening adjustments, appending logo image nodes, or wrapping text in nested spans.

This has already happened with SVG customization (the `svgCustomizeService` DOMPurify drift pitfall in v19.0). The Polotno JSON equivalent is more dangerous because Polotno does not have an equivalent of DOMPurify to normalize the output.

**Why it happens:**
The mutation is stateful: it is applied to the component's `designJson` state variable, which is initialized from the template and then mutated in place. Each QuickCustomize change re-mutates the already-mutated state rather than re-applying against the original.

**How to avoid:**
- Store the canonical original JSON as a `useRef` initialized once from the template fetch. The mutation always derives from `originalJsonRef.current`, never from derived/mutated state.
- The mutation function signature should be `mutate(originalJson, customizations) → mutatedJson`, not `mutate(currentJson, delta) → newJson`.
- Add a test case: apply QuickCustomize, apply again with the same inputs, verify the output is byte-equal on both passes.

**Warning signs:**
- The QuickCustomize state hook initializes from template JSON and then uses the same variable for both "current state" and "mutation target."
- No idempotence test in the QuickCustomize suite.

**Phase to address:** Polotno QuickCustomize phase (TPRV-F1). The mutation architecture must be reviewed at design time, before any code is written. Retrofitting idempotence after the fact requires a full rewrite of the mutation layer.

---

### Pitfall C3: Font Not Loaded When QuickCustomize Serializes Polotno JSON

**What goes wrong:**
Polotno templates reference fonts by name (e.g., `fontFamily: "Playfair Display"`). When the QuickCustomize panel modifies a text element and the font is not yet loaded in the iframe runtime, Polotno may substitute a fallback font in the serialized output. The admin queue thumbnail looks correct (font loaded on admin's machine) but the applied scene on a player device renders in the fallback font.

Additionally, Polotno has a known community-reported issue: custom fonts with rich text produce "Timeout loading asset text" errors during serialization, which silently falls back to the default font.

**Why it happens:**
Font loading is async. The mutation logic fires before the `fontLoaded` event resolves. The iframe's font loading state is not observable from the parent window without explicit postMessage plumbing.

**How to avoid:**
- Add a font pre-load step before the QuickCustomize panel activates: send a `prefetchFonts` message to the Polotno iframe listing all fonts used in the template's JSON, and await a `fontsReady` acknowledgment before enabling the Apply button.
- If the font load times out (Polotno's known issue), surface an explicit error in the UI rather than silently proceeding with the fallback.
- For the QuickCustomize panel specifically, restrict font changes to the fonts already present in the template JSON, avoiding the need to load new fonts during the customization flow.

**Warning signs:**
- Apply button is enabled before the Polotno iframe has sent a `fontsReady` message.
- Applied Polotno templates render with incorrect fonts on devices that were not used during customization.
- No `fontsReady` event in the postMessage protocol between main app and Polotno iframe.

**Phase to address:** Polotno QuickCustomize phase (TPRV-F1). The font pre-load protocol must be part of the postMessage contract design, not added after the panel is built.

---

### Pitfall C4: Race Between QuickCustomize Mutations and the Active Scene Editor

**What goes wrong:**
If a user opens TemplatePreviewModal from within SceneEditorPage (the `editorReturn=1` flow), applies QuickCustomize changes to a Polotno template, and the `apply_template_to_active_slide` RPC fires while the Polotno editor in the background has unsaved changes, the RPC overwrites the active slide's design with the template content. The user's unsaved editor work is silently lost.

This is analogous to the clone-then-patch race that was closed for SVG templates in v20.0 (migration 168). The Polotno path has the same race because `clone_template_to_scene` operates on the scene, not on the in-memory Polotno store.

**Why it happens:**
The `editorReturn=1` modal flow assumes the editor is in a clean state. When a user opens the gallery mid-edit, this assumption breaks. The RPC applies atomically to the database but the Polotno iframe's in-memory state is not synchronized.

**How to avoid:**
- Before showing the Apply button in `editorReturn=1` mode, check the Polotno iframe for unsaved changes via postMessage (`hasUnsavedChanges` query). If true, show a confirmation: "Applying this template will replace your current slide's content. Unsaved changes will be lost."
- This check must be async with a timeout fallback (assume dirty if no response within 500ms).

**Warning signs:**
- `TemplatePreviewModal` in `editorReturn=1` mode applies without checking Polotno's dirty state.
- No `hasUnsavedChanges` message type in the PolotnoEditor postMessage protocol.

**Phase to address:** Polotno QuickCustomize phase (TPRV-F1). The dirty-state check is part of the apply flow guard, not a separate feature.

---

### Pitfall D1: Measurement Loop When Container Size Changes During fuse.js Result Set Transitions

**What goes wrong:**
`@tanstack/react-virtual` requires a stable container ref with a known pixel height. When fuse.js produces a new result set (user types a search term), the number of rows changes, which may change the scrollable container's height if the container is dynamically sized. If the container height is derived from the virtualized content height (a common anti-pattern), you get a measurement feedback loop: content height changes → container resizes → virtualizer remeasures → new items render → content height changes again. This manifests as a layout thrash visible as a vertical jump/bounce on every keystroke.

At 500 templates with 4 columns, each card ~240px tall, the non-virtualized DOM would be ~125 rows × 240px = ~30,000px of scroll height. The virtualizer reduces this to the visible viewport. The measurement loop destroys this benefit.

**Why it happens:**
The grid container is given `height: auto` or wraps a `div` with no explicit height. TanStack Virtual's `useVirtualizer` needs a *fixed* or *CSS-constrained* height to measure against — not a height derived from its own output.

**How to avoid:**
- The scroll container must have an explicit height from CSS — either a fixed `px` value, `100vh`, or a height derived from a *parent* container that is independent of the virtualized content. Never `height: auto` on the scroll container.
- Use `useWindowVirtualizer` (TanStack Virtual) if the page itself is the scroll target, which avoids the nested scroll container problem entirely.
- Set the `estimateSize` function to return a stable estimate (e.g., `() => 260` for a card height) rather than measuring DOM nodes dynamically during search transitions.

**Warning signs:**
- Scroll container has `height: auto` or `min-height` only.
- Cards visually jump or bounce when typing in the search box.
- Chrome Performance profiler shows repeated `ResizeObserver` callbacks firing in a tight loop during search input.

**Phase to address:** Gallery virtualization phase (TGAL-F1). Container height architecture must be decided at the phase start, before writing the virtualization hook. Retrofitting requires CSS restructuring that breaks other layout constraints.

---

### Pitfall D2: Scroll Position Not Reset When fuse.js Result Set Changes

**What goes wrong:**
The user is scrolled to position 800px in a 500-template grid (viewing "around row 10"). They type a search term that returns 15 results. The virtualizer retains the scroll offset (800px) even though the new result set has only 15 items — the scroll offset now points past the end of the result set, and the user sees a blank grid. TanStack Virtual does not automatically reset scroll position when the data array changes.

**Why it happens:**
Developers wire fuse.js output directly into the virtualizer's `count` parameter and assume the virtualizer handles scroll reset. It does not. Scroll position is managed separately.

**How to avoid:**
- When the filtered results array changes identity (i.e., `prevResults !== nextResults`), explicitly call `virtualizer.scrollToOffset(0)` or use the `scrollToIndex(0)` API.
- Use a `useEffect` with `[filteredResults]` dependency that calls `scrollToOffset(0)` after each search update.
- Pair this with a stable `key` prop on the virtualizer container that changes with the search query, to force a scroll reset at the React level: `key={searchQuery}`.

**Warning signs:**
- After searching, the viewport shows blank space below the results.
- No `scrollToOffset` or `scrollToIndex(0)` call in the search result change handler.

**Phase to address:** Gallery virtualization phase (TGAL-F1). Scroll position reset is a launch criterion SCs item alongside the virtualization implementation.

---

### Pitfall D3: Keyboard Navigation Focus Loss When Cards Are Unmounted by Virtualizer

**What goes wrong:**
When a user is navigating the template grid with arrow keys and the virtualizer unmounts cards that scroll out of the viewport, the focused card is removed from the DOM. The browser moves focus to `document.body`. The user (including screen reader users) loses their place in the grid. This is not hypothetical — it is documented in react-virtualized GitHub issue #1296 and reproduces reliably with Tab/Arrow key navigation in TanStack Virtual when `overscan` is set too low.

**Why it happens:**
Virtualization unmounts DOM nodes for performance. Focus is a DOM-level concept. When the focused node is unmounted, focus is lost. TanStack Virtual does not implement any focus management by default — it is headless and expects the consumer to handle this.

**How to avoid:**
- Set `overscan={5}` (5 extra rows above and below the visible viewport) so keyboard navigation has a buffer before cards are unmounted. At 4 columns per row, overscan of 5 rows = 20 cards kept mounted beyond the visible area.
- Track `focusedTemplateId` in component state. On every virtualizer render, if `focusedTemplateId` is set, check if it is in the current virtual items. If not, call `virtualizer.scrollToIndex(focusedIndex)` to scroll it back into view before it unmounts.
- Add `aria-rowcount={filteredResults.length}` and `aria-rowindex` on each virtual row to inform screen readers of the total count even when rows are not in the DOM.

**Warning signs:**
- Tab/Arrow key navigation causes focus to jump to the browser address bar or page header.
- `overscan` is set to 0 or 1.
- No `aria-rowcount` attribute on the virtual grid container.

**Phase to address:** Gallery virtualization phase (TGAL-F1). Accessibility is not a post-launch fix — the WCAG 2.1 AA requirement for keyboard navigation applies. Include an axe-core automated accessibility check in the virtualization E2E suite.

---

### Pitfall D4: URL State Desync — Active Filter Chip Mismatches Virtualized Result Set

**What goes wrong:**
The current `TemplateGalleryPage` syncs search query, category, orientation, and sort to URL params (`useSearchParams`). When virtualization is added, the scroll offset is not part of the URL state. This is the correct behavior. However, a subtle desync occurs when a user deep-links to a URL with a category filter active: the virtualizer initializes at offset 0, which is correct — but if the initialization sequence runs (URL params → filter chips state → fuse.js filtering → virtualizer count update) in the wrong order, the virtualizer may flash the full 500-template list briefly before fuse.js applies the filter, causing a layout jump.

A second desync: if the user navigates Back (browser back button) from a scene editor back to the gallery, the URL params restore correctly but the fuse.js index may not be rebuilt yet (it is async-initialized on mount). The gallery shows a "0 results" flash before the index is ready.

**Why it happens:**
fuse.js index construction (`new Fuse(data, options)`) is synchronous but fast. The async is the upstream `fetchGalleryTemplates()` network call. The URL params restore before the data is fetched, so the filter is applied to an empty dataset, producing 0 results temporarily.

**How to avoid:**
- Show the skeleton state while `fetchGalleryTemplates` is in flight, regardless of whether URL params have been restored. Do not apply fuse.js filtering until data is loaded.
- Guard the virtualizer's `count` prop: `count={isLoading ? 0 : filteredResults.length}`. Render skeletons outside the virtualizer while loading.
- The existing `isLoading` state already gates this in the v20.0 implementation — verify this gate is preserved when virtualizer is wired in.

**Warning signs:**
- Brief "0 results" or "no templates found" flash visible on gallery load with an active URL filter.
- Virtualizer `count` is set to `filteredResults.length` without checking `isLoading`.

**Phase to address:** Gallery virtualization phase (TGAL-F1). This is a state sequencing issue that must be verified with a Playwright test that opens the gallery with `?category=Restaurant` in the URL and asserts the skeleton appears before results.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip per-generation svgValidator; only validate at publish | Faster admin queue ingestion | Malformed SVG reaches admin queue; admin may approve bad output | Never for AI pipeline |
| Store license as free-text string instead of SPDX ID | Less upfront schema work | License drift, attribution errors, impossible to query programmatically | Never for imported content |
| Hardcode OpenAI model name in Edge Function | Faster initial build | Pipeline breaks on model deprecation; requires code deploy to swap model | Never — use env var |
| Auto-update Polotno SDK in iframe bundle without running mutation tests | Latest features | Schema drift silently breaks QuickCustomize | Never — pin and test before upgrading |
| Defer attribution display to a follow-up task | Faster import phase | Legal obligation unfulfilled at time of first use by tenants | Never — attribution display is a legal requirement |
| Use `height: auto` on virtualizer scroll container | Simpler CSS | Measurement feedback loop; scroll jank on every keystroke | Never |
| Set overscan to 0 for virtualizer performance | Slightly fewer DOM nodes | Focus loss on keyboard navigation | Never — minimum overscan is 3 rows |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI structured outputs | Treating JSON schema mode as SVG validation | JSON schema validates wrapper structure; run svgValidator separately on the SVG string |
| OpenAI API key in Edge Function | Placing key in Supabase Edge Function environment but referencing it with a `VITE_` prefix | Edge Function env vars are server-only; `VITE_` prefix exposes them to the client bundle. Use `Deno.env.get('OPENAI_API_KEY')` without the VITE prefix |
| Polotno iframe + QuickCustomize | Mutating Polotno store from parent window via direct object reference | Polotno store is inside the iframe sandbox; all mutations must go through `postMessage`. Direct references silently fail or throw cross-origin errors |
| TanStack Virtual + fuse.js | Passing `allTemplates.length` to `count` instead of `filteredResults.length` | Virtualizer must receive the filtered count, not total count, or it renders empty rows for non-matching templates |
| DOMPurify + SVG bulk import | Running DOMPurify only in the browser (client-side) | Bulk import runs server-side (Edge Function or Node script); must inject DOMPurify-compatible sanitizer via `opts.DOMPurify` in svgValidator |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| fuse.js re-indexing on every render | Search box feels sluggish; React DevTools shows Fuse constructor called on every keystroke | Memoize `new Fuse(allTemplates, options)` with `useMemo`; rebuild index only when `allTemplates` changes | Visible at >100 templates; severe at >300 |
| Non-virtualized grid with 500 templates | Scroll jank visible in Chromium on M1 with 1× CPU throttling; initial paint >2s | Activate `@tanstack/react-virtual` before catalog exceeds 200 templates | 200+ templates in non-virtualized DOM = visible jank at 1× CPU throttle |
| Polotno JSON fetch on every QuickCustomize preview update | Preview lag; network tab shows repeated template_library_slides fetches | Fetch slides JSON once on modal open; cache in `useRef`; only re-fetch on explicit template change | Every brand color drag event if not memoized |
| Thumbnail rasterization in browser for 500 templates | Gallery initial load >5s; memory spike on low-end devices | Thumbnails are pre-rendered PNGs in S3 (already in place for v20.0 127 templates); extend same pattern to all new templates | Any template without a pre-rendered thumbnail causes live rasterization |
| Fuse.js result set change without scroll reset | User sees blank viewport after search | Call `scrollToOffset(0)` on result array identity change | Every search query transition |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| OpenAI API key in VITE_ environment variable | Key exposed in client bundle, visible in browser devtools | Use server-only env var in Supabase Edge Function; never prefix with VITE_ |
| `<foreignObject>` with HTML children in imported SVG | XSS via inline SVG rendering in TemplatePreviewModal | Add Rule 7 to svgValidator: block foreignObject with HTML element children |
| Running bulk import svgValidator without DOMPurify in Node context | Script/event handler content survives server-side validation | Pass `opts.DOMPurify` to svgValidator when running in Node/Edge Function context |
| Stored admin prompt passed unsanitized to LLM | Stored prompt injection activates on automated re-generation | Wrap stored prompts in delimited data blocks in system prompt; never concatenate raw |
| LLM-generated SVG enters admin queue without validation | Admin approves malformed or malicious SVG without knowing it | Run svgValidator + DOMPurify + thumbnail rasterization before writing to admin queue |
| AI-generated template published without confirming output ownership | Copyright ownership uncertain for commercially-used AI content | Use a model with an explicit commercial-use indemnification clause (OpenAI Enterprise or equivalent); document this in the admin queue |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Attribution not shown in TemplatePreviewModal for imported SVGs | Tenant publishes content without required attribution; legal exposure | Show attribution credit line in preview modal footer for any template with `license_attribution` data |
| QuickCustomize Apply button enabled before fonts load | Applied template renders with wrong font on devices | Disable Apply until `fontsReady` postMessage received from Polotno iframe |
| Blank viewport after search in virtualized grid | User thinks search returned no results when they are scrolled past the end | Reset scroll to 0 on every search query change |
| No "generation in progress" feedback in admin pipeline | Admin submits duplicate generation requests | Show per-job status in admin queue (queued / generating / validation_failed / pending_review / published) |
| License badge not visible on gallery card for imported templates | Tenant cannot distinguish license-restricted templates before previewing | Add a subtle license badge (CC BY, CC0, etc.) on the template card thumbnail |

## "Looks Done But Isn't" Checklist

### AI Generator Pipeline
- [ ] **svgValidator runs at generation ingest:** Verify the Edge Function runs `validateSvg()` on the LLM output *before* writing to the admin queue, not only at publish time
- [ ] **Regression eval suite exists:** CI includes a job that runs 5+ canonical prompts against the configured model and asserts structural SVG validity
- [ ] **Cost cap configured:** OpenAI account billing cap set before first batch run; token counts logged per job to Supabase
- [ ] **Model name in env var:** No hardcoded model string literal in the generation Edge Function
- [ ] **Retry cap enforced:** Maximum 2 retries per job; failed jobs park in `needs_human_review` state, not infinite retry
- [ ] **API key server-only:** OPENAI_API_KEY is a Supabase Edge Function secret, not a VITE_ variable

### Third-Party SVG Import
- [ ] **Rule 7 in svgValidator:** foreignObject with HTML children is blocked or stripped before import
- [ ] **Attribution displayed:** TemplatePreviewModal shows attribution text for templates with license_attribution data
- [ ] **license_confirmed required:** Schema has `license_confirmed` non-nullable column; no template is activated without human confirmation
- [ ] **DOMPurify runs server-side:** Bulk import script passes `opts.DOMPurify` to validateSvg when running in Node/Edge Function context
- [ ] **Attribution persists to scene:** Applied scenes carry `source_attribution` metadata for Proof of Play reporting

### Polotno QuickCustomize (TPRV-F1)
- [ ] **Mutation idempotence test:** Apply QuickCustomize twice with same inputs → output is byte-equal on both passes
- [ ] **Mutation targets original JSON:** Mutation function receives `originalJson` from `useRef`, not mutated component state
- [ ] **Font pre-load protocol:** postMessage contract includes `prefetchFonts` → `fontsReady` handshake; Apply button disabled until `fontsReady`
- [ ] **Dirty state check in editorReturn flow:** Apply button in `editorReturn=1` mode queries Polotno iframe for unsaved changes before proceeding
- [ ] **SDK version pinned:** Polotno SDK version in iframe bundle is pinned; STACK.md documents the pinned version

### Gallery Virtualization (TGAL-F1)
- [ ] **Scroll container has explicit height:** CSS audit confirms scroll container has `height: Xpx` or `height: 100vh`, not `height: auto`
- [ ] **Scroll reset on search:** `scrollToOffset(0)` called on every `filteredResults` identity change
- [ ] **overscan at least 3 rows:** `overscan` prop is at least 3 (12 cards at 4 columns) to buffer keyboard navigation
- [ ] **aria-rowcount on container:** Virtual grid container has `aria-rowcount={filteredResults.length}`
- [ ] **Loading guard on count:** Virtualizer `count` is 0 while `isLoading` is true; skeleton renders outside virtualizer
- [ ] **Playwright a11y test:** axe-core scan included in gallery virtualization E2E spec

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Malicious SVG published via import pipeline (foreignObject bypass) | HIGH | Set `is_active = FALSE` on affected rows immediately; audit all imported templates with the updated Rule 7; re-validate and re-activate clean records |
| Attribution displayed incorrectly (wrong or missing) | MEDIUM | Update `license_attribution` column for affected records; re-run VERIFICATION to confirm display; no content removal needed unless license requires it |
| Cost runaway from generation retry storm | MEDIUM | OpenAI billing cap halts the runaway; review job logs to identify the failing prompt pattern; add prompt guard and restart batch |
| Polotno QuickCustomize applies wrong mutations (schema drift) | MEDIUM | Pin Polotno SDK to prior version; add schema migration test; rewrite mutation logic against pinned schema |
| Virtualized gallery focus loss complaint (a11y) | LOW | Increase overscan; add `scrollToIndex` on focus change; deploy with no data migration needed |
| Model deprecation breaks generation pipeline | LOW | Update `OPENAI_MODEL_ID` env var to successor model; run regression eval suite to confirm output quality; no data migration |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| A1: Stored prompt injection | AI generator phase (TPIPE) | E2E test: inject prompt payload into stored template description; assert generated SVG contains no script/event content |
| A2: Model deprecation | AI generator phase (TPIPE) | CI regression eval suite runs against configured model on every PR; model version in env var confirmed in deploy checklist |
| A3: Cost runaway | AI generator phase (TPIPE) | Billing cap set before first batch; job retry cap verified in unit test |
| A4: Structured output not equal to valid SVG | AI generator phase (TPIPE) | svgValidator runs at generation ingest; thumbnail rasterization flags blank outputs |
| B1: foreignObject bypass | Import phase (TPIPE) | svgValidator Rule 7 unit test; bulk import smoke test with a foreignObject-containing SVG |
| B2: Attribution loss | Import phase (TPIPE) | Playwright test: preview modal shows attribution for an imported CC BY template |
| B3: SPDX false positives | Import phase (TPIPE) | Schema has `license_confirmed` non-nullable; import script asserts human review required |
| C1: Polotno JSON schema drift | Polotno QC phase (TPRV-F1) | Mutation unit tests run against pinned SDK; STACK.md documents pinned version |
| C2: Mutation idempotence | Polotno QC phase (TPRV-F1) | Unit test: double-apply produces byte-equal output |
| C3: Font not loaded at serialization | Polotno QC phase (TPRV-F1) | Apply button disabled until `fontsReady`; Playwright test verifies font appears correctly on applied scene |
| C4: Race with active editor | Polotno QC phase (TPRV-F1) | Playwright test: open gallery from editor with unsaved changes; assert confirmation dialog appears |
| D1: Measurement loop | Gallery virtualization phase (TGAL-F1) | CSS audit; Chrome Performance profiler shows no ResizeObserver loop during search |
| D2: Scroll position not reset | Gallery virtualization phase (TGAL-F1) | Playwright test: scroll to bottom, search, assert viewport shows first result |
| D3: Keyboard nav focus loss | Gallery virtualization phase (TGAL-F1) | Playwright keyboard navigation test; axe-core scan |
| D4: URL state desync | Gallery virtualization phase (TGAL-F1) | Playwright test: navigate to gallery with `?category=Restaurant`; assert skeleton appears before results |

## Sources

- OpenAI Model Deprecations (official): https://developers.openai.com/api/docs/deprecations
- OpenAI Structured Outputs (official): https://developers.openai.com/api/docs/guides/structured-outputs
- OWASP LLM Prompt Injection (LLM01:2025): https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- OWASP LLM Prompt Injection Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- SVG XXE and foreignObject attack surface (OPSWAT): https://www.opswat.com/blog/svg-unveiled-understanding-xxe-vulnerabilities-and-defending-your-codebase
- DOMPurify CVE-2026-41238 prototype pollution bypass: https://security.snyk.io/vuln/SNYK-JS-DOMPURIFY-16132234
- DOMPurify foreignObject issue (GitHub #1088): https://github.com/cure53/DOMPurify/issues/1088
- TanStack Virtual accessibility and overscan: https://tanstack.com/virtual/latest/docs/api/virtualizer
- react-virtualized accessibility issues (GitHub #1296): https://github.com/bvaughn/react-virtualized/issues/1296
- Polotno JSON schema and fonts: https://polotno.com/docs/schema and https://polotno.com/docs/fonts-consistency
- AI copyright and commercial use: https://fadel.com/resources/who-owns-ai-generated-content-the-truth-about-rights-and-licensing/
- SPDX false positive issue (scancode-toolkit #2878): https://github.com/aboutcode-org/scancode-toolkit/issues/2878
- svgValidator codebase: src/services/svgValidator.js (v20.0, 6 rules)
- PolotnoEditor.jsx postMessage contract: src/components/PolotnoEditor.jsx
- templateApplyService.js (DOMPurify config mirror): src/services/templateApplyService.js

---
*Pitfalls research for: BizScreen v21.0 Templates at Scale — LLM-to-SVG generation, third-party SVG bulk import, Polotno QuickCustomize, gallery virtualization*
*Researched: 2026-05-06*
