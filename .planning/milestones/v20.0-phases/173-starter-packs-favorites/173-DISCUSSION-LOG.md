# Phase 173: Starter Packs + Favorites - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 173-starter-packs-favorites
**Areas selected by user:** Pack architecture, Pack surfacing in gallery, Pack apply flow
**Areas deselected (captured under Claude's Discretion):** Favorites end-to-end

---

## Area selection — which gray areas to discuss

| Option | Description | Selected |
|--------|-------------|----------|
| Pack architecture | DB model, legacy relation, service location, admin UI location | ✓ |
| Pack surfacing in gallery | Card placement, card shape, click behavior | ✓ |
| Pack apply flow | Bulk apply semantics, atomicity, success UI | ✓ |
| Favorites end-to-end | Data model, heart icon UI, filter | (deselected — Claude's Discretion) |

---

## Pack architecture

### Q1: How should starter packs be stored in the database?
| Option | Description | Selected |
|--------|-------------|----------|
| New tables (recommended) | `template_packs` + `template_pack_items` with polymorphic `(template_id, editor_type)` shape | ✓ |
| Extend template_library | Treat pack as a template_library row with type='pack' | |
| Reuse legacy content_templates | Repurpose migration 023 table | |

**User's choice:** New tables.

### Q2: What happens to existing onboarding starter packs (content_templates)?
| Option | Description | Selected |
|--------|-------------|----------|
| Coexist — untouched (recommended) | Legacy onboarding packs keep working; Phase 173 is a separate concept | ✓ |
| Seed 173 packs from legacy mappings | Derive a few Phase 173 packs from legacy slugs | |
| Deprecate legacy + migrate onboarding | Large cross-cutting change | |

**User's choice:** Coexist — untouched.

### Q3: Where does pack CRUD + fetch logic live?
| Option | Description | Selected |
|--------|-------------|----------|
| Extend marketplaceService.js (recommended) | Add pack methods to preserved service (TPCK-03 literal) | ✓ |
| New templatePackService.js | Fresh module | |
| Split — read in galleryService, CRUD in marketplace | Two modules | |

**User's choice:** Extend marketplaceService.js.

### Q4: Where does the admin pack editor surface live?
| Option | Description | Selected |
|--------|-------------|----------|
| New AdminStarterPacksPage (recommended) | Dedicated admin route | ✓ |
| Tab inside AdminTemplatesPage | Packs tab next to templates admin | |
| Modal launched from admin toolbar | Cramped for many-member packs | |

**User's choice:** New AdminStarterPacksPage.

**Advance check:** User chose "Move to Pack surfacing".

---

## Pack surfacing in gallery

### Q5: Where do pack cards appear in the gallery page?
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated top-of-grid strip (recommended) | Strip above the template grid; templates keep flat grid | ✓ |
| Mixed into flat grid | Pack cards interleaved with template cards | |
| Separate tab (Packs \| Templates) | Two tabs at top of page | |

**User's choice:** Dedicated top-of-grid strip.

### Q6: How does a pack card present TPCK-04 (thumbnail mosaic, count, industry)?
| Option | Description | Selected |
|--------|-------------|----------|
| 2×2 thumbnail mosaic (recommended) | Four tiles, count badge, industry label | ✓ |
| Hero + strip | One hero + row of 3 smaller thumbnails | |
| Single hero + badge only | Identical shape to TemplateCard | |

**User's choice:** 2×2 thumbnail mosaic.

### Q7: What happens when a user clicks a pack card?
| Option | Description | Selected |
|--------|-------------|----------|
| Pack preview modal (recommended) | Full-screen modal showing all members + Apply CTA | ✓ |
| Direct Apply (with confirm dialog) | Fastest; no preview | |
| Inline expansion in grid | Lightweight but causes layout shift | |

**User's choice:** Pack preview modal.

### Q8: When should the top-of-grid pack strip hide?
| Option | Description | Selected |
|--------|-------------|----------|
| Hide only on search (recommended) | Strip stays on filter chips; hides only on non-empty search query | ✓ |
| Hide on any filter or search | Any non-default state hides the strip | |
| Always visible | No hiding | |

**User's choice:** Hide only on search.

### Q9: Should the pack preview modal support prev/next like TemplatePreviewModal?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, mirror Phase 172 pattern (recommended) | Arrow buttons + Left/Right keyboard | ✓ |
| No, close-and-reopen only | Simpler, less feature parity | |

**User's choice:** Yes, mirror Phase 172 pattern.

---

## Pack apply flow

### Q10: When a user applies a pack, what exactly gets created in their account?
| Option | Description | Selected |
|--------|-------------|----------|
| One new scene per template (recommended) | Bulk apply creates N scene rows + N scene_slides rows | ✓ |
| One scene with N slides | Compacted slideshow | |
| Pack-membership only | No scenes; stored relationship only | |

**User's choice:** One new scene per template.

### Q11: How atomic should bulk Apply be?
| Option | Description | Selected |
|--------|-------------|----------|
| Single RPC, all-or-nothing (recommended) | New `apply_starter_pack` RPC in one PL/pgSQL transaction | ✓ |
| Client-side loop, best-effort | Partial-success toast possible | |
| Single RPC, best-effort inside transaction | Per-row errors caught; partial success | |

**User's choice:** Single RPC, all-or-nothing.

### Q12: What happens when a user applies the same pack twice?
| Option | Description | Selected |
|--------|-------------|----------|
| Allowed — creates fresh duplicates (recommended) | No de-dup; mirrors single-template Apply | ✓ |
| Block with warning | Requires scene-lineage tracking | |
| Skip duplicates silently | Confusing UX | |

**User's choice:** Allowed — creates fresh duplicates.

### Q13: What's the success UX after bulk Apply completes?
| Option | Description | Selected |
|--------|-------------|----------|
| Toast + 'View scenes' action (recommended) | Modal closes; opt-in navigation | ✓ |
| Inline banner in pack modal | Modal stays open in success state | |
| Navigate to Scenes page on success | Violates TPCK-02 'no navigation away' | |

**User's choice:** Toast + 'View scenes' action.

### Q14: Does bulk Apply carry any customization (e.g., brand colors)?
| Option | Description | Selected |
|--------|-------------|----------|
| No customization on bulk apply (recommended) | p_customized_svg NULL; user customizes per-scene later | ✓ |
| Auto-prefill brand colors server-side | Heavy scope; conflicts with dumb-persistor contract | |
| Auto-prefill brand colors client-side | Medium scope; N-times DOMPurify | |

**User's choice:** No customization on bulk apply.

### Q15: Favorites was deselected — confirm Claude's Discretion with sensible defaults?
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — defaults below (recommended) | Per-user table, heart icon, toggle chip, URL `favorites=1` | ✓ |
| Fold one favorites question back in | Open one more turn on most-impactful favorites decision | |

**User's choice:** Yes — defaults below.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` → "Claude's Discretion":

- **Favorites end-to-end** (user explicitly deselected the whole area; all defaults endorsed):
  - Table: `template_favorites(user_id, template_id, editor_type, created_at)` with RLS `user_id = auth.uid()` and per-user scope.
  - Exposure: either a convenience RPC `fetch_my_favorite_template_ids()` or a joined VIEW — planner picks.
  - Heart icon top-right on `TemplateCard`, always visible; filled when favorited.
  - Heart icon in `TemplatePreviewModal` header.
  - Optimistic toggle with silent success / red toast on error.
  - Filter = toggle chip in Phase 171 filter bar; URL param `favorites=1`.
  - Empty-state on "favorites-filter-on + zero favorites" uses Phase 171's `EmptyState` with a clear-filter action.
- Bulk-apply scene naming (no "Copy" suffix vs pack-lineage in name).
- Pack strip title copy ("Starter Packs" vs "Curated Packs").
- Admin pack editor layout (modal vs drill-in panel).
- Mosaic tile selection (first 4 by position vs curated subset).
- New `PackPreviewModal.jsx` file path.
- Migration numbering (next available after 170).
- Per-tenant custom pack CRUD (recommended super_admin-only for v20.0).

---

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:

- Converging Phase 173 packs with legacy `content_templates` onboarding packs.
- Per-tenant custom pack CRUD for non-admins.
- Scene-lineage column `source_pack_id` on `scenes`.
- Server-side or client-side brand-color prefill during bulk Apply.
- User-level pack ordering / pinning in the strip.
- Team-shared favorites.
- Onboarding starter-pack step + driver.js tour (Phase 174).
- Scene-editor "Browse Templates" entry point (Phase 174).
