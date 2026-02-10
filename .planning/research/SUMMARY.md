# Project Research Summary

**Project:** BizScreen v3.0 Creative Experience
**Domain:** Digital signage - premium template marketplace and in-editor stock asset integration
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

BizScreen v3.0 is positioned to deliver a premium template browsing and editor experience without adding a single new npm dependency. The existing stack (Framer Motion ^12.23.24, Lucide React ^0.548.0, Polotno SDK ^2.33.2, canvas-confetti, Tailwind CSS) provides all needed capabilities for rich animations, icon integration, and editor polish. The single external addition required is an Unsplash API key (free tier: 50 req/hr demo, 5,000 req/hr production) accessed through a Supabase Edge Function proxy to maintain API key security and enable caching.

The v3.0 milestone enhances three interconnected areas: (1) template browsing with hover micro-interactions, stagger animations, and instant template-to-editor flow, (2) stock asset integration via Unsplash photos and Lucide icon library panels inside the Polotno editor, and (3) editor UI polish with shared element transitions, loading states, and save celebrations. The key architectural insight is that Polotno runs in an isolated React 18 iframe — stock asset panels must be added to the iframe build itself, not bridged via postMessage, because Polotno's custom side panel API requires direct React component registration.

The highest-risk pitfall is the Polotno iframe boundary blocking naive stock asset integration approaches. Teams commonly attempt to build asset browsers in the main app and communicate with the editor via postMessage, which fails because Polotno's `ImagesGrid` and custom sections require MobX store access inside the iframe React tree. The second critical risk is Unsplash API compliance — four mandatory requirements (attribution with UTM links, hotlinking their CDN, download tracking endpoint, no re-hosting) are strictly enforced and non-compliance risks API access revocation. A third concern is the offline signage player vs hotlinking conflict: Unsplash requires CDN hotlinking, but BizScreen players must work offline.

## Key Findings

### Recommended Stack

**Zero new npm dependencies required.** The v3.0 stack leverages existing tools more effectively rather than adding libraries.

**Core technologies:**
- **Framer Motion ^12.23.24** (already installed) — All animations, hover micro-interactions, scroll-triggered reveals, shared element transitions via `layoutId`. The existing `motion.js` design system has 15+ presets that are underutilized; template cards currently use zero Framer Motion. The premium upgrade is architectural, not dependency-driven.
- **Unsplash API** (key only, no npm package) — Stock photos via direct `fetch` calls (the official `unsplash-js` package is archived as of January 2026). Proxied through Supabase Edge Function with 24h caching and per-tenant rate limiting.
- **Lucide React ^0.548.0** (already installed) — 1500+ icons exposed in the Polotno editor via a JSON manifest of SVG strings. Already used in 238 files in the main app.
- **Polotno SDK ^2.33.2** (already installed) — Custom side panels using built-in `ImagesGrid`, `SectionTab`, and `useInfiniteAPI` utilities. No external image browsing libraries needed.
- **Tailwind CSS ^3.4.18** + Native browser APIs — `loading="lazy"` for thumbnail grids, `IntersectionObserver` (via Framer Motion's `useInView`) for scroll animations, CloudFront URL-based image resizing.

**Critical version notes:**
- `unsplash-js` is ARCHIVED — do not install. Use raw HTTP `fetch` to Unsplash REST API.
- Framer Motion 12.x fully supports React 19 (verified in 16 existing files).
- Polotno iframe runs React 18 (isolated from main app's React 19).

**Infrastructure additions:**
- `VITE_UNSPLASH_ACCESS_KEY` environment variable (server-side only)
- Supabase Edge Function: `unsplash-proxy` with caching and rate limiting
- Build-time script: `generate-icon-manifest.cjs` to export Lucide icons as JSON

### Expected Features

**Must have (table stakes):**
- **Large thumbnail grid with lazy loading** — Current h-40 (160px) cards are too small. Minimum 240px height with `aspect-video` ratio. Users expect Canva-level visual quality.
- **Skeleton loading with shimmer** — Reduces perceived load time by 40% vs spinners. Industry standard for template marketplaces.
- **Card hover micro-interactions** — Canva, Netflix, every premium marketplace uses hover state changes. Current cards have only binary overlay; feels flat.
- **Instant template-to-editor navigation** — Eliminate success modal and multi-step customization. Canva-level speed: click template, land in editor.
- **Unsplash stock photos in editor** — ScreenCloud and Canva embed stock photos directly. Leaving the editor to find images is significant friction.
- **Unsplash API compliance** — All four requirements mandatory: attribution with UTM params, hotlinking their CDN, download tracking endpoint, no re-hosting.
- **Template preview detail view** — Enhanced preview panel with larger images, multi-slide carousel, color palette, similar templates row.
- **Search with instant results** — Client-side fuzzy filtering for instant feedback while server query runs. Reduce debounce to 200ms.

**Should have (differentiators):**
- **Icon library in editor** — Digital signage needs icons constantly. Lucide's 1500+ icons (already installed) inserted as SVG elements via custom Polotno panel.
- **BizScreen media library panel in Polotno** — Users have already uploaded images to media library. Browsing them in-editor without re-uploading eliminates friction.
- **Full-screen lightbox preview** — See template at actual display resolution (16:9) before applying. Neither Yodeck nor OptiSigns offer this.
- **Smart suggestions** — "Recommended for you" based on tenant's business_type field. Recently viewed but unapplied templates.

**Defer (v2+ or anti-features):**
- **User-to-user template marketplace** — Requires moderation, payment processing, copyright handling. Negative ROI for digital signage.
- **AI template generation** — Unreliable visual coherence. Undermines "premium" positioning.
- **Multiple stock photo sources** — Unsplash alone provides 3M+ photos. Adding Pexels/Pixabay creates attribution complexity without value.
- **Template ratings/reviews** — With a curated (not user-generated) library, ratings have limited signal.

### Architecture Approach

The v3.0 architecture integrates three feature clusters into BizScreen's React 19 + Supabase + Polotno stack: (1) unified template browsing combining the existing dual-template systems (content_templates for infrastructure, template_library for visual content) via a composite service layer rather than database merging, (2) Unsplash stock photos proxied through a Supabase Edge Function to hide API keys and enable caching, and (3) stock asset panels built inside the Polotno iframe using custom side panel sections registered with Polotno's SDK.

**Major components:**
1. **CreativeHubPage.jsx (new)** — Unified template browser merging best UX from TemplatesPage and TemplateMarketplacePage. Backed by composite `creativeHubService.js` that queries both systems and normalizes results. Do NOT merge database tables.
2. **Unsplash proxy Edge Function** — Server-side Supabase Edge Function at `/functions/v1/unsplash-proxy` that authenticates users, enforces per-tenant rate limits, caches search results 24h, and proxies to Unsplash API. Stores API key server-side. Cache and rate limit tracking tables in Supabase.
3. **Polotno custom stock panels** — Inside the Polotno iframe build (`polotno-editor.jsx`), custom side panel sections for (a) Unsplash photos, (b) Lucide icons, (c) BizScreen media library. Uses Polotno's built-in `ImagesGrid` and `SectionTab` components. Communicates with parent via postMessage only for API proxying, not for UI rendering.
4. **PremiumTemplateCard.jsx (new)** — Enhanced card with Framer Motion hover effects: card lifts with shadow + subtle scale (1.03), thumbnail zooms (1.08), action buttons fade in with stagger. Replaces existing plain CSS `transition-shadow` approach.
5. **TemplateDetailDrawer.jsx (new)** — Right-side drawer replacing both TemplateCustomizeModal and TemplatePreviewPanel. Streamlines the "instant edit" flow: preview → "Edit Now" button → navigate directly to editor with optional in-editor customization panel.

**Key architectural decision:** The Polotno iframe boundary requires stock asset panels to be built inside the iframe, not the main app. Polotno's custom section API needs direct React component registration with MobX `store` access. PostMessage bridges only handle API proxying and data fetching, not UI rendering.

### Critical Pitfalls

1. **Polotno iframe boundary blocks direct stock asset integration** — Teams attempt to build Unsplash/icon browsers in the main app and communicate via postMessage. This fails because Polotno's custom side panel API requires React components registered inside the Polotno iframe's React tree with MobX store access. Prevention: Modify `polotno-editor.jsx` to register custom sections using Polotno's `ImagesGrid` component. Proxy API calls through Edge Function. Lazy-load stock panel code to avoid increasing iframe load time past 10-second timeout.

2. **Unsplash API compliance violations risk API access revocation** — Four mandatory requirements: (a) attribution with UTM-parameterized links, (b) hotlinking their CDN URLs (never re-host to S3), (c) trigger `download_location` endpoint when user "uses" a photo, (d) no user re-registration. Current `createStockAsset()` in `mediaService.js` has gaps: attribution lacks links/UTM, no download tracking endpoint call, potential re-hosting to S3. Prevention: Store Unsplash URLs directly in design JSON, fire download tracking on image insertion, render linked photographer attribution with UTM params.

3. **Unsplash hotlinking vs offline signage player conflict** — Unsplash requires hotlinking their CDN, but BizScreen's players must work offline. Fundamental tension between Unsplash's business model (CDN tracking) and BizScreen's offline-first architecture. Prevention: Contact Unsplash developer support to clarify if caching for offline display is permitted. If not, consider Pexels (CC0, allows re-hosting) or mark Unsplash images as "requires internet" with fallback placeholders.

4. **Animation performance degrades template browse page** — Adding hover animations to 50+ template cards without virtualization causes jank. Current `TemplateGrid` renders ALL templates in a flat grid. Staggering 50+ `motion.div` components creates style recalculation storms. Prevention: Use CSS transitions for hover effects (not Framer Motion), limit stagger to first 8-12 visible cards, add `loading="lazy"` to thumbnails (currently missing), animate only `transform` and `opacity` properties, maintain 60fps during scroll at 4x CPU slowdown.

5. **Template thumbnail grid causes layout shift** — Loading 50+ thumbnails simultaneously creates waterfall requests and layout shifts. Current `TemplateCard` uses plain `<img>` tags instead of the existing `OptimizedImage.jsx` component with lazy loading and blur placeholder. Prevention: Use `OptimizedImage` component (already exists), add `width`/`height` attributes, implement progressive loading (first 12 immediately, remaining on scroll), use `srcset` with multiple sizes.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Unsplash Proxy Infrastructure
**Rationale:** Foundation that unblocks both editor integration and template browsing enhancements. No UI dependencies, so it ships first. Server-side infrastructure can be built and tested independently.

**Delivers:**
- Supabase Edge Function: `unsplash-proxy` with JWT auth, rate limiting, caching
- Database migration: `unsplash_cache` and `unsplash_usage_log` tables
- `stockAssetService.js`: client-side search, download tracking, attribution helpers
- `UnsplashAttribution.jsx`: TOS-compliant attribution component
- Production Unsplash API key application submitted (takes days/weeks for review)

**Addresses:**
- TS-5: In-editor stock photos (Unsplash) — infrastructure
- TS-6: Unsplash API compliance — all four requirements
- Pitfall 2: API compliance violations
- Pitfall 6: `unsplash-js` is archived (use raw HTTP)
- Pitfall 7: Rate limiting in demo mode (cache + production access)

**Technical notes:**
- Edge Function proxies all Unsplash API calls, holds API key server-side
- 24h cache TTL for search results
- Per-tenant rate limit: 100 req/hr (configurable)
- Client never sees API key

### Phase 2: Template Browse Premium Polish
**Rationale:** Enhances the main entry point to the creative experience. Highest visible impact with lowest technical risk. Builds user-facing "premium" perception before deeper editor work.

**Delivers:**
- `PremiumTemplateCard.jsx`: Framer Motion hover effects (lift, scale, stagger)
- Thumbnail grid: Increase to 240px min height, `aspect-video`, lazy loading
- Skeleton loading: Shimmer effect matching final card dimensions
- `TemplateGrid` refactor: Use `OptimizedImage`, add `useInView` scroll reveals
- Search enhancements: 200ms debounce, client-side fuzzy filtering
- New `motion.js` presets: `templateGrid`, `cardLift`, `imageReveal`, `scrollReveal`

**Addresses:**
- TS-1: Large, high-quality thumbnail grid
- TS-2: Skeleton loading with shimmer
- TS-3: Card hover micro-interactions
- TS-8: Search with instant results
- Pitfall 4: Animation performance (use CSS transitions for cards)
- Pitfall 5: Thumbnail grid layout shift (use OptimizedImage)

**Performance budget:**
- Lighthouse score ≥ 90 on template browse page
- 60fps during scroll at 4x CPU slowdown
- CLS ≤ 0.1

### Phase 3: Instant Template-to-Editor Flow
**Rationale:** Eliminates friction in the apply workflow before adding editor enhancements. Users need a smooth path from template to editing before stock assets and editor polish matter.

**Delivers:**
- `TemplateDetailDrawer.jsx`: Unified preview + apply (replaces TemplatePreviewPanel + TemplateCustomizeModal)
- SceneEditorPage: Accept `?fromTemplate=true` query param, show QuickCustomizePanel
- `QuickCustomizePanel.jsx`: In-editor customization (logo/color/texts) as collapsible properties panel section
- Remove intermediate success modal (use toast instead)
- Fix template loading: Pass `design_json` not thumbnail image to Polotno

**Addresses:**
- TS-4: Instant template-to-editor navigation
- TS-7: Template preview detail view (enhanced)
- Pitfall 8: Template loads as flat image (pass design_json)
- Pitfall 12: Back navigation breaks (push history entries)

**Technical notes:**
- Customization moves INTO editor (not before)
- Deprecate `TemplateCustomizationWizard.jsx`
- Verify template JSON format is Polotno-compatible

### Phase 4: Stock Assets in Polotno Editor
**Rationale:** Depends on Phase 1 (Unsplash proxy) and Phase 3 (editor flow is smooth). Requires Polotno iframe rebuild, which is high-risk, so defer until core flows are working.

**Delivers:**
- Polotno iframe rebuild (`polotno-editor.jsx`): Add custom side panel sections
- Unsplash panel: Search photos, `ImagesGrid` display, insert on canvas with attribution
- Icons panel: Lucide icons via JSON manifest, SVG insertion
- Media library panel: Browse BizScreen uploads, insert directly
- PostMessage handlers in `PolotnoEditor.jsx`: Bridge API calls to parent `stockAssetService`
- Icon manifest generation: Build-time script `generate-icon-manifest.cjs`

**Addresses:**
- TS-5: Unsplash stock photos in editor
- DF-2: Icon library in editor
- DF-7: BizScreen media library panel
- Pitfall 1: Iframe boundary blocking integration (build inside iframe)
- Pitfall 10: Icon library bundle bloat (API-served metadata)
- Pitfall 17: CORS errors with canvas (verify Unsplash CORS, use `crossOrigin`)

**Technical notes:**
- Custom sections must be registered inside Polotno React tree
- Use Polotno's `ImagesGrid`, `SectionTab`, `getImageSize` utilities
- Lazy-load stock panel code to keep iframe load time < 8 seconds
- Test: search → select → canvas → save → export PNG (CORS check)

### Phase 5: Editor UI Polish & Secondary Features
**Rationale:** Final visual enhancements after core workflows are complete. Lower priority items that add delight without blocking functionality.

**Delivers:**
- Full-screen lightbox preview (Space key or double-click on template)
- Shared element transition: template card → editor modal via `layoutId`
- Save celebration: `canvas-confetti` (already installed) on successful apply
- Smart suggestions: "Recommended for you" based on business_type
- "Recently viewed" tracking: IndexedDB client-side storage
- Accessibility: `prefers-reduced-motion` support, keyboard navigation

**Addresses:**
- DF-4: Smart suggestions based on business type
- DF-6: Full-screen lightbox preview
- Pitfall 9: AnimatePresence memory leaks (profile + fallback to CSS)
- Pitfall 11: UX overwhelm (progressive disclosure)
- Pitfall 15: Animation accessibility (prefers-reduced-motion)

**Optional enhancements (low priority):**
- Animated template preview on hover (slow CSS keyframe slideshow)
- Template color auto-adaptation to brand theme
- Dark mode for browse page

### Phase Ordering Rationale

- **Infrastructure first (Phase 1):** Unsplash proxy has zero UI dependencies and unblocks both editor and browse features. Build and test server-side logic independently.
- **Browse before editor (Phase 2):** Highest visible impact, lowest technical risk. Establishes "premium" perception early. Uses existing stack (Framer Motion, Tailwind) without Polotno complexity.
- **Flow before assets (Phase 3):** Template-to-editor workflow must be smooth before adding stock assets. Users need a frictionless path to the editor before worrying about what's inside it.
- **Iframe rebuild deferred (Phase 4):** Highest risk (Polotno rebuild, 10-second load timeout constraint). Only tackle after core flows are proven.
- **Polish last (Phase 5):** Delight features that don't block functionality. Can be shipped iteratively.

**Dependency chain:**
- Phase 2 and Phase 3 can overlap (browse polish + flow work are independent)
- Phase 4 MUST follow Phase 1 (needs proxy) and Phase 3 (editor flow must work)
- Phase 5 depends on all previous phases being complete

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Polotno iframe rebuild):** Polotno SDK custom panel API needs hands-on prototyping. Official docs show examples, but BizScreen's iframe isolation adds complexity. Allocate spike story to prototype custom section inside iframe before committing to phase scope.
- **Unsplash offline caching decision (Phase 1):** Fundamental go/no-go question. Contact Unsplash developer support BEFORE Phase 1 implementation. If offline caching not permitted, entire Unsplash strategy needs pivot to Pexels or hybrid approach.

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (Template browse polish):** Well-documented Framer Motion patterns, existing `motion.js` provides presets, image lazy loading is standard practice.
- **Phase 3 (Template flow):** Router-based navigation, modal → page transitions, existing template apply logic just needs refactoring.
- **Phase 5 (UI polish):** Established accessibility patterns, confetti library already installed, lightbox is standard UX pattern.

### Two-Phase Simplification (Alternative)

If aggressive timeline, collapse to 2 phases:

**Phase A: Premium Browse + Flow (Phases 2+3 merged)**
- Template grid polish + instant edit flow
- Highest user impact, no infrastructure risk
- 3-4 week sprint

**Phase B: Stock Assets + Polish (Phases 1+4+5 merged)**
- Unsplash proxy + Polotno panels + final enhancements
- All infrastructure and iframe work together
- 4-5 week sprint

This alternative trades iterative risk reduction for faster delivery.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing dependencies verified in package.json and 16+ files using Framer Motion. Unsplash API official docs confirm direct fetch approach. `unsplash-js` archived status verified on GitHub. |
| Features | HIGH | Feature requirements drawn from verified competitor analysis (Canva, Envato, Yodeck, OptiSigns, ScreenCloud) and existing BizScreen codebase gaps. Table stakes vs differentiators validated against industry standards. |
| Architecture | HIGH | Polotno iframe isolation verified in `PolotnoEditor.jsx` line 6 comment. Custom side panel API verified in Polotno official docs. Dual template systems verified in `templateService.js` and `marketplaceService.js`. Edge Function proxy pattern standard Supabase approach. |
| Pitfalls | HIGH | Iframe boundary risk verified from codebase analysis and Polotno docs. Unsplash compliance requirements verified from official API guidelines. Animation performance issues verified from `TemplateGrid.jsx` (no virtualization, plain `<img>` tags). All 17 pitfalls backed by source documentation. |

**Overall confidence:** HIGH

### Gaps to Address

**During Phase 1 (Unsplash proxy implementation):**
- **Unsplash offline caching clarification:** Unsplash API terms are ambiguous about whether caching images for offline display violates hotlinking requirement. MUST contact Unsplash developer support directly before committing to Phase 1. If offline caching not permitted, this is a go/no-go decision point for Unsplash vs Pexels. Have Pexels integration as backup plan.
- **CloudFront image resizing setup:** Current assumption is CloudFront can append URL parameters for resizing (`?w=400&q=80&f=webp`). Verify CloudFront function configuration or Lambda@Edge setup supports this. If not, thumbnail optimization strategy needs adjustment.

**During Phase 3 (Template flow):**
- **Template JSON format verification:** Current assumption is marketplace templates store Polotno-compatible `design_json`. Verify actual schema in `template_library_slides.design_json` column. If templates are rasterized or use incompatible schema, a conversion step or template re-authoring is required.

**During Phase 4 (Polotno rebuild):**
- **Iframe bundle size impact:** Adding Unsplash client code, icon manifest loading, and media library panel code to Polotno iframe will increase bundle size. Current load timeout is 10 seconds. Measure bundle size before and after; fail if iframe load time exceeds 8 seconds (leaving 2-second buffer). May need dynamic imports or lazy panel loading.
- **React 18 vs React 19 Framer Motion compatibility:** Polotno iframe runs React 18. Verify Framer Motion 12.x works identically in both React versions. If behavior differs, may need to use CSS transitions in Polotno panels instead.

**During Phase 5 (Polish):**
- **AnimatePresence memory leak profiling:** Known Framer Motion issue with `AnimatePresence` + `layoutId` may not affect BizScreen's specific usage. Profile with DevTools Memory tab: open/close preview panel 30 times, check for heap growth. If leaks found, fall back to CSS transitions.

## Sources

### Primary (HIGH confidence)

**Unsplash API:**
- [Unsplash API Documentation](https://unsplash.com/documentation) — Endpoints, rate limits, auth
- [Unsplash Attribution Guidelines](https://help.unsplash.com/en/articles/2511315-guideline-attribution) — Mandatory format with UTM params
- [Unsplash Hotlinking Guidelines](https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images) — Must use CDN URLs
- [Unsplash Download Trigger Guidelines](https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download) — Required endpoint call
- [Unsplash API Terms](https://unsplash.com/api-terms) — Legal requirements
- [unsplash-js GitHub (archived)](https://github.com/unsplash/unsplash-js) — Confirmed archived January 2026

**Polotno SDK:**
- [Polotno Custom Images Panel](https://polotno.com/docs/custom-images-panel) — ImagesGrid, SectionTab API
- [Polotno Side Panel Overview](https://polotno.com/docs/side-panel-overview) — Custom sections registration
- [Polotno Pexels Integration](https://polotno.com/docs/pexels-photos) — Reference pattern for stock photo panels
- [Polotno Utils API](https://polotno.com/docs/utils-api) — useInfiniteAPI, getImageSize

**Framer Motion:**
- [Motion for React docs](https://motion.dev/docs/react) — Official documentation
- [Layout animations](https://www.framer.com/motion/layout-animations/) — layoutId, shared element transitions
- [useInView hook](https://motion.dev/docs/react-use-in-view) — IntersectionObserver wrapper
- [Framer Motion npm](https://www.npmjs.com/package/framer-motion) — v12.34.0 latest

**Lucide React:**
- [Lucide React guide](https://lucide.dev/guide/packages/lucide-react) — Tree-shaking, bundle size
- [lucide-react npm](https://www.npmjs.com/package/lucide-react) — v0.563.0 latest

**Codebase analysis:**
- `/Users/massimodamico/bizscreen/package.json` — Verified installed versions
- `/Users/massimodamico/bizscreen/src/components/PolotnoEditor.jsx` — Iframe isolation comment line 6
- `/Users/massimodamico/bizscreen/src/pages/TemplateMarketplacePage.jsx` — Current marketplace UX
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateGrid.jsx` — Current grid implementation gaps
- `/Users/massimodamico/bizscreen/src/services/templateService.js` — Content templates system
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` — Marketplace system
- `/Users/massimodamico/bizscreen/src/design-system/utils/motion.js` — Existing animation presets

### Secondary (MEDIUM confidence)

**Competitor analysis:**
- [5 Visual Effects Canva Uses to Thrill Users](https://www.canva.dev/blog/engineering/5-visual-effects-canva-uses-to-thrill-users/) — Micro-interaction patterns
- [Envato December 2025 Updates](https://author.envato.com/hub/whats-new-to-envato-december-2025/) — Template marketplace UX trends
- [OptiSigns vs Yodeck Comparison](https://www.optisigns.com/optisigns-vs-yodeck) — Digital signage competitor features
- [ScreenCloud Canvas Best Practices](https://screencloud.com/product-updates/digital-signage/canvas-in-app-editor-best-practices) — In-app editor patterns

**Performance optimization:**
- [Motion Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) — Layout thrashing prevention
- [Framer Motion Performance Tips](https://tillitsdone.com/blogs/framer-motion-performance-tips/) — Transform vs layout animations
- [Lazy Loading Images in React](https://medium.com/@albertjuhe/an-easy-to-use-performant-solution-to-lazy-load-images-in-react-e6752071020c) — IntersectionObserver patterns
- [Skeleton Loading Screen Design](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/) — Shimmer effects

**Digital signage UX:**
- [Digital Signage Content Best Practices](https://kiosk.com/8-best-practices-for-digital-signage-content-a-guide-for-high-impact-kiosks/) — 3-second rule, content overcrowding
- [Common Digital Signage Mistakes](https://www.digitalsignagetrends.com/post/digital-signage-common-mistakes) — Overwhelming users with choices

### Tertiary (LOW confidence, needs validation)

**Animation issues:**
- [Framer Motion AnimatePresence Memory Leak #625](https://github.com/framer/motion/issues/625) — Known unmount issue (may not affect this usage)
- [Framer Motion layoutId Unmount Bug #2172](https://github.com/framer/motion/issues/2172) — layoutId + AnimatePresence failure cases

---

*Research completed: 2026-02-10*
*Ready for roadmap: Yes*
*Researcher: gsd-synthesizer*
