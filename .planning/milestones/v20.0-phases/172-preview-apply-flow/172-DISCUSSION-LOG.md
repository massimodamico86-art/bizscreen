# Phase 172: Preview + Apply Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `172-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 172-preview-apply-flow
**Areas discussed:** Modal anatomy, Polotno preview handling, Apply architecture (race-safe)
**Areas skipped (user discretion):** Customize defaults

---

## Modal Anatomy

### Q1: How should the preview and QuickCustomizePanel share the full-screen modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Split view (recommended) | Preview left (~65%), sticky customize panel right (~35%). Both visible. | ✓ |
| Slide-over drawer | Preview fills modal; drawer slides in on demand. One extra tap to customize. | |
| Stacked (preview top, panel bottom) | Full-width preview on top, customize below. Squeezes desktop vertical space. | |
| Tabs (Preview | Customize) | Two tabs; never both visible. Breaks TPRV-03 live-update flow. | |

**User's choice:** Split view.
**Notes:** Delivers live-preview-while-editing out of the box.

### Q2: On mobile/narrow screens, what happens to the split-view layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Stack vertically (recommended) | Preview pinned top, panel below, Apply sticky at bottom. | ✓ |
| Drawer on mobile only | Preview fills screen; bottom-sheet drawer for customize. Extra tap. | |
| Tabs on mobile only | Preview | Customize tabs. Loses live-preview on mobile. | |

**User's choice:** Stack vertically.

### Q3: How should prev/next template navigation work inside the preview modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Arrows + keyboard (recommended) | On-screen ‹/› buttons plus Left/Right arrow shortcuts. | ✓ |
| Arrows only (no keyboard) | Simpler; loses power-user keyboard flow. | |
| Keyboard + swipe (no on-screen arrows) | Cleanest visuals, worst discoverability. | |

**User's choice:** Arrows + keyboard.

### Q4: What happens when the user edits customization then navigates prev/next?

| Option | Description | Selected |
|--------|-------------|----------|
| Discard silently, reset panel (recommended) | Context switch — edits aren't saved work until Apply. | ✓ |
| Confirm before discarding | Modal "Discard changes?" dialog. Safer, more friction. | |
| Persist edits per template in memory | Return to a customized template, edits still there. Complex state. | |

**User's choice:** Discard silently, reset panel.

---

## Polotno Preview Handling

### Q1: When a user clicks a Polotno template card, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Open same modal, hide customize panel (recommended) | Full-screen preview for ALL templates; Polotno gets an info block + Apply on the right. | ✓ |
| Skip modal, route directly to Polotno editor | Bypass preview. Breaks TPRV-01 prev/next uniformity. | |
| Open read-only mini-preview (tooltip) | Card overlay. Breaks full-screen preview contract. | |

**User's choice:** Same modal, hide customize panel.

### Q2: What does the preview image show for Polotno templates inside the modal?

| Option | Description | Selected |
|--------|-------------|----------|
| Static thumbnail from gallery VIEW (recommended) | Reuse `thumbnail` column. No Polotno runtime in modal. | ✓ |
| Rendered preview via Polotno read-only | Pixel-accurate but heavy bundle + perf cost. | |

**User's choice:** Static thumbnail.

### Q3: How should prev/next navigation behave across mixed SVG + Polotno templates?

| Option | Description | Selected |
|--------|-------------|----------|
| Unified — respect filtered order (recommended) | Cycle through filtered set regardless of editor_type. Panel swaps automatically. | ✓ |
| Segregated — keep within editor_type | Prev/next only cycles same-type templates. Predictable but less fluid. | |

**User's choice:** Unified.

### Q4: Does Polotno-flavored Apply share the same button UX as SVG Apply?

| Option | Description | Selected |
|--------|-------------|----------|
| Same button, same position; 'Apply to new scene' (recommended) | Consistent CTA; routing hidden. Matches TPRV-04. | ✓ |
| Different labels (e.g., 'Open in editor' for Polotno) | Communicates destination, but splits UX into two mental models. | |

**User's choice:** Same button, same label.

---

## Apply Architecture (Race-Safe)

### Q1: How should clone-and-patch become atomic?

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated RPC `clone_template_with_customization` (recommended) | Single PL/pgSQL transaction. Leaves `clone_template_to_scene` untouched. | ✓ |
| Extend existing `clone_template_to_scene` with optional patch param | One function, more complex; all callers must be re-audited. | |
| Keep client-side, wrap in a stored transaction via supabase rpc | Double round-trip; weaker atomicity under hiccups. | |

**User's choice:** New dedicated RPC.

### Q2: What payload shape does the atomic RPC accept for customization?

| Option | Description | Selected |
|--------|-------------|----------|
| Final serialized SVG string (recommended) | Client runs svgCustomizeService; server persists as-is. ~20-200KB. | ✓ |
| Structured diff JSON (colors, logoSrc, textOverrides) | Smaller payload but duplicates mutation logic in SQL. | |

**User's choice:** Final serialized SVG string.

### Q3: How should the customized-flavored RPC handle the Polotno case (no SVG to patch)?

| Option | Description | Selected |
|--------|-------------|----------|
| Client dispatches to the right RPC by editor_type (recommended) | SVG → new RPC; Polotno → existing `clone_template_to_scene`. | ✓ |
| One RPC with NULL customization → pass-through clone | Always call the new RPC; branching moves into SQL. | |

**User's choice:** Client dispatches by editor_type.

### Q4: How is the template handoff carried from gallery → editor (replacing sessionStorage)?

| Option | Description | Selected |
|--------|-------------|----------|
| URL params: sceneId only; editor re-fetches scene row (recommended) | Apply RPC returns sceneId; navigate to `/editor/:sceneId`. Clean, shareable. | ✓ |
| React Router navigation state | Survives hop, lost on refresh. Two load paths downstream. | |
| URL params: templateId + customizationJson encoded | Verbose URLs, size limits, wrong layering. | |

**User's choice:** URL params: sceneId only.

### Q5: How should Apply behave when the atomic RPC fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline toast + keep modal open (recommended) | Preserve customize state; re-enable Apply. Nothing partially written. | ✓ |
| Dismiss modal, show error on gallery | Loses edit state. More jarring. | |
| Retry automatically (up to N times) | Masks real issues; overkill for user-initiated action. | |

**User's choice:** Inline toast + keep modal open.

### Q6: Should the sessionStorage read-branch in `SvgEditorPage.jsx:86` be removed in this phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove fully; editor loads scene by ID only (recommended) | TPRV-06 explicit; Apply pre-writes customized design_json. | ✓ |
| Keep sessionStorage branch as fallback | Risks TPRV-06 regression. | |

**User's choice:** Remove fully.

---

## Claude's Discretion

Area deferred at present_gray_areas stage:
- **Customize defaults** — whether to auto-prefill from `brandThemeService` or start with template defaults. Claude recommends brand-color prefill + per-control Clear; planner may revisit if ambiguity surfaces.

Also left to Claude:
- Exact split-view proportions and breakpoint pixel values
- QuickCustomizePanel internal layout
- Scene naming behavior on Apply
- File paths and component boundaries
- Migration number for the new RPC
- Whether `marketplaceService.installWithCustomization` is rewritten or replaced by a new `templateApplyService`

## Deferred Ideas

- Polotno in-preview customization (TPRV-F1 → v20.1)
- `use_count` increment on Apply (Phase 175)
- Scene-editor → gallery entry point (Phase 174)
- Starter packs / favorites integration in preview modal (Phase 173)
