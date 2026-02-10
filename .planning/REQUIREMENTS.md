# Requirements: BizScreen

**Defined:** 2026-02-10
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v3.0 Requirements

Requirements for v3.0 Creative Experience milestone. Each maps to roadmap phases.

### Template Browse (BROWSE)

- [ ] **BROWSE-01**: User sees large, high-quality template thumbnails with consistent aspect ratio
- [ ] **BROWSE-02**: User sees smooth hover micro-interactions on template cards (lift, shadow, scale)
- [ ] **BROWSE-03**: User sees skeleton loading states while templates load (not spinners)
- [ ] **BROWSE-04**: User can search templates with instant results and filter by category
- [ ] **BROWSE-05**: User sees a responsive template grid that adapts to screen size (4→3→2→1 columns)

### Template-to-Editor Flow (FLOW)

- [ ] **FLOW-01**: User can go from template selection to editing with one click (no intermediate modals)
- [ ] **FLOW-02**: Template loads as a fully editable design in the editor (not a flattened image)
- [ ] **FLOW-03**: User sees a quick customize panel inside the editor on first open (brand colors, logo)
- [ ] **FLOW-04**: User can navigate back from editor to browse with scroll position preserved

### Stock Assets (ASSET)

- [ ] **ASSET-01**: User can search Unsplash photos inside the editor
- [ ] **ASSET-02**: User sees photographer attribution on Unsplash photos per TOS
- [ ] **ASSET-03**: Unsplash download tracking fires when user selects a photo
- [ ] **ASSET-04**: User can search an icon/sticker library inside the editor
- [ ] **ASSET-05**: User can browse their own uploaded media inside the editor
- [ ] **ASSET-06**: User can drag-and-drop from any asset panel onto the canvas

### Editor Polish (EDITOR)

- [ ] **EDITOR-01**: User experiences smoother toolbar interactions (reduced latency, animation feedback)
- [ ] **EDITOR-02**: User sees polished loading states in the editor (skeleton/progress, not raw spinners)
- [ ] **EDITOR-03**: User sees a save celebration animation (checkmark/confetti on successful save)
- [ ] **EDITOR-04**: User can view keyboard shortcuts via an overlay/panel
- [ ] **EDITOR-05**: User experiences improved undo/redo with visual feedback

### Infrastructure (INFRA)

- [ ] **INFRA-01**: Unsplash API proxied via Supabase Edge Function with caching and rate limiting

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Template Browse Enhancements

- **BROWSE-06**: Animated template previews (multi-slide cycling on hover)
- **BROWSE-07**: Smart suggestions based on industry and usage history
- **BROWSE-08**: Full-screen lightbox preview with device mockup

### Stock Asset Enhancements

- **ASSET-07**: Pexels integration as alternative stock photo source
- **ASSET-08**: Animated sticker library (GIPHY or similar)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User template marketplace (buy/sell) | Complex moderation/payment system, not core value |
| AI-generated templates | Unpredictable results, quality control issues |
| Multiple stock photo APIs (Pexels + Unsplash simultaneously) | Complexity without proportional value; start with Unsplash |
| Faceted search (multi-filter) | Over-engineering for current template library size |
| Public template ratings/reviews | Moderation burden, chicken-and-egg content problem |
| Custom font upload in editor | Font licensing complexity, rendering consistency issues |
| Video editing in editor | Entirely different tooling, massive scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BROWSE-01 | — | Pending |
| BROWSE-02 | — | Pending |
| BROWSE-03 | — | Pending |
| BROWSE-04 | — | Pending |
| BROWSE-05 | — | Pending |
| FLOW-01 | — | Pending |
| FLOW-02 | — | Pending |
| FLOW-03 | — | Pending |
| FLOW-04 | — | Pending |
| ASSET-01 | — | Pending |
| ASSET-02 | — | Pending |
| ASSET-03 | — | Pending |
| ASSET-04 | — | Pending |
| ASSET-05 | — | Pending |
| ASSET-06 | — | Pending |
| EDITOR-01 | — | Pending |
| EDITOR-02 | — | Pending |
| EDITOR-03 | — | Pending |
| EDITOR-04 | — | Pending |
| EDITOR-05 | — | Pending |
| INFRA-01 | — | Pending |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
