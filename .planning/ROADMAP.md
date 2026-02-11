# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** — Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** — Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** — Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** — Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** — Phases 36-41 (shipped 2026-02-09)
- [x] **v2.4 Tech Debt Zero** — Phases 42-45 (shipped 2026-02-10)
- [ ] **v3.0 Creative Experience** — Phases 46-50 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4)</summary>

**v1 Production Release** — Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** — Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** — Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** — Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

**v2.3 Production Hardening** — Phases 36-41
See `.planning/milestones/v2.3-ROADMAP.md`

**v2.4 Tech Debt Zero** — Phases 42-45
See `.planning/milestones/v2.4-ROADMAP.md`

All milestones shipped successfully.

</details>

## v3.0 Creative Experience (In Progress)

**Milestone Goal:** Make the template-to-editor experience feel premium and effortless — a design marketplace quality that beats Yodeck and OptiSigns. Users browse templates with visual richness, flow instantly into the editor, access stock assets without leaving the canvas, and experience polished interactions throughout.

### Phases

- [x] **Phase 46: Unsplash Proxy Infrastructure** — Server-side foundation for stock photo integration (completed 2026-02-10)
- [x] **Phase 47: Template Browse Premium** — Visual richness and micro-interactions on the template grid (completed 2026-02-10)
- [x] **Phase 48: Template-to-Editor Flow** — One-click path from template selection to editing (completed 2026-02-10)
- [ ] **Phase 49: Stock Assets in Editor** — Unsplash photos, icons, and media library inside the Polotno editor
- [ ] **Phase 50: Editor Polish** — Toolbar refinement, loading states, save celebrations, and keyboard shortcuts

### Phase Details

#### Phase 46: Unsplash Proxy Infrastructure
**Goal:** Users can access Unsplash stock photos through a secure, compliant, and rate-limited server-side proxy — without the API key ever reaching the browser.
**Depends on:** Nothing (first phase of v3.0)
**Requirements:** INFRA-01
**Success Criteria** (what must be TRUE):
  1. Searching for a term (e.g., "coffee shop") via the proxy returns Unsplash photo results with thumbnails and full-size URLs
  2. Photo results include photographer name, profile URL with UTM params, and photo page link per Unsplash TOS
  3. Repeated identical searches within 24 hours are served from cache (no Unsplash API call)
  4. A single tenant making excessive requests gets rate-limited with a clear error message
**Plans:** 2 plans
Plans:
- [x] 46-01-PLAN.md — Database migrations, CORS module, and Edge Function handler (server-side proxy)
- [x] 46-02-PLAN.md — Client-side service layer for frontend integration

#### Phase 47: Template Browse Premium
**Goal:** Users experience a visually rich, responsive template browsing page with large thumbnails, smooth animations, and instant search — the first impression says "premium."
**Depends on:** Nothing (independent of Phase 46)
**Requirements:** BROWSE-01, BROWSE-02, BROWSE-03, BROWSE-04, BROWSE-05
**Success Criteria** (what must be TRUE):
  1. User sees large template thumbnails (minimum 240px height) with consistent aspect ratios and no layout shift during load
  2. Hovering a template card triggers a smooth lift effect (shadow deepens, subtle scale) that feels responsive, not jarring
  3. Before thumbnails load, the user sees animated skeleton placeholders matching final card dimensions — no raw spinners
  4. Typing in the search bar produces filtered results within 300ms and category filters narrow the grid immediately
  5. The template grid gracefully adapts from 4 columns on desktop to 1 column on mobile without horizontal scrolling
**Plans:** 2 plans
Plans:
- [x] 47-01-PLAN.md — Enhance design-system TemplateCard with Framer Motion hover lift, h-60 thumbnails, and matched skeletons
- [x] 47-02-PLAN.md — Upgrade SvgTemplateGalleryPage with skeleton loading, debounced search, stagger animations, and responsive grid

#### Phase 48: Template-to-Editor Flow
**Goal:** Users go from browsing a template to editing it in one click — no intermediate modals, no waiting, no confusion about what happened.
**Depends on:** Phase 47 (browse page must exist with premium cards)
**Requirements:** FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Edit" on a template card opens the Polotno editor with that template loaded as a fully editable design (not a flattened image) — no intermediate confirmation modal
  2. On first open from a template, a collapsible quick-customize panel appears offering brand color, logo, and text overrides without leaving the editor
  3. Pressing back from the editor returns to the template browse page with scroll position preserved — the user lands exactly where they left off
**Plans:** 2 plans
Plans:
- [x] 48-01-PLAN.md — Scroll position save/restore in gallery and isFromTemplate prop to editor
- [x] 48-02-PLAN.md — QuickCustomizePanel component with brand colors, logo, and text overrides inside FabricSvgEditor

#### Phase 49: Stock Assets in Editor
**Goal:** Users can search and insert Unsplash photos, icons, and their own uploaded media directly onto the canvas without ever leaving the editor.
**Depends on:** Phase 46 (Unsplash proxy), Phase 48 (editor flow is working)
**Requirements:** ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05, ASSET-06
**Success Criteria** (what must be TRUE):
  1. User can open an Unsplash panel inside the editor, search for photos, and see results with photographer attribution displayed per TOS
  2. Selecting an Unsplash photo triggers a download tracking call and inserts it onto the canvas as a manipulable image element
  3. User can open an icon panel inside the editor, search by keyword, and insert icons as SVG elements onto the canvas
  4. User can open a media library panel inside the editor that shows their previously uploaded images and insert them onto the canvas
  5. User can drag any asset (photo, icon, uploaded media) from its panel directly onto the canvas at the desired position
**Plans:** TBD

#### Phase 50: Editor Polish
**Goal:** The editor feels modern and responsive — toolbar interactions are snappy, state changes have visual feedback, and power users discover keyboard shortcuts.
**Depends on:** Phase 48 (editor flow must be stable before polishing)
**Requirements:** EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05
**Success Criteria** (what must be TRUE):
  1. Toolbar button clicks respond with immediate visual feedback (press state, animation) and reduced perceived latency
  2. Editor loading states show skeleton or progress indicators instead of raw spinners
  3. Saving a design triggers a brief celebration animation (checkmark or confetti) confirming the save succeeded
  4. User can open a keyboard shortcuts overlay that lists available shortcuts and dismiss it easily
  5. Undo and redo actions produce visible feedback (brief toast or element highlight) confirming what changed
**Plans:** TBD

## Progress Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1 Production Release | 1-12 | 75 | Complete | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | Complete | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | Complete | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | Complete | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | Complete | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | Complete | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | TBD | In progress | - |

**Total:** 47 phases complete, 174 plans executed | 6 milestones shipped

### v3.0 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 46. Unsplash Proxy Infrastructure | 2/2 | ✓ Complete | 2026-02-10 |
| 47. Template Browse Premium | 2/2 | ✓ Complete | 2026-02-10 |
| 48. Template-to-Editor Flow | 2/2 | ✓ Complete | 2026-02-10 |
| 49. Stock Assets in Editor | 0/TBD | Not started | - |
| 50. Editor Polish | 0/TBD | Not started | - |

---
*Last updated: 2026-02-10 — Phase 48 complete (2/2 plans, human verification needed).*
