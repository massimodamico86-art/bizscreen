# Feature Landscape: Premium Template Browse, Editor Polish, and Stock Assets

**Domain:** Digital signage -- premium template marketplace UX and in-editor stock asset integration
**Researched:** 2026-02-10
**Scope:** New features for v3.0 milestone on top of existing template library/marketplace, Polotno editor, and customization wizard

---

## Current State (Already Built)

Before defining new features, here is what BizScreen already has:

| Component | Current Implementation | Gaps |
|-----------|----------------------|------|
| TemplatesPage | Category tabs, type filters (pack/playlist/layout), favorites, recently used, search with 300ms debounce, hover preview popover (300ms delay), customize modal, success modal | Cards are h-40 thumbnails in 3-col grid. No animation on cards. No infinite scroll. Skeleton is basic spinner. |
| TemplateMarketplacePage | Sidebar filters, featured row, starter packs row, 4-col grid, Quick Apply, preview panel (right drawer), customization wizard, favorites, usage counts | Card overlay is binary opacity-0/100. No scale or spring. Preview panel is functional but not visually rich. |
| SceneEditorPage | Full-screen dark editor, slide strip, block toolbar (text/image/shape/widget), properties panel, AI suggestions, undo/redo, auto-save, preview mode | No stock photo tab. No icon library. Adding images requires separate media upload. No Unsplash inside editor. |
| DesignEditorPage (Polotno) | Iframe-embedded Polotno with DEFAULT_SECTIONS, postMessage communication, template loading, save to media | Uses default Polotno side panels. No custom Unsplash panel. No custom icons panel. No BizScreen media library panel. |
| Design System motion.js | fadeIn, fadeInScale, slideUp, scaleHover (1.02), scaleTap (0.97), staggerContainer, drawer, modal presets | No spring-based hover. No card-specific premium animations. scaleHover is subtle (1.02) -- needs more for premium feel. |
| SVG Editor (LeftSidebar) | Already has Unsplash API integration with search, 20 results, photographer attribution | API key hardcoded. Not shared with Polotno. No caching layer. No download tracking. |

---

## Table Stakes

Features users expect from a modern template browse. Missing = product feels dated compared to Canva/ScreenCloud.

### TS-1: Large, High-Quality Thumbnail Grid
| Aspect | Detail |
|--------|--------|
| Why Expected | Envato testing shows actual content thumbnails generate higher click-through than text-heavy cards. Canva, Figma Community, and Envato all use large preview images. Current h-40 (160px) cards are too small. |
| What | Increase card thumbnails to minimum 240px height (aspect-video = ~427x240). Support high-DPI with srcSet. Lazy-load with IntersectionObserver. |
| Complexity | Low |
| Dependencies | None |
| Confidence | HIGH -- visual inspection of Canva, Envato, Figma confirms this is universal |

### TS-2: Skeleton Loading with Shimmer
| Aspect | Detail |
|--------|--------|
| Why Expected | Skeleton screens reduce perceived loading time by up to 40% vs spinners. Every major template marketplace uses them. Current implementation shows a spinner or basic pulse rectangles. |
| What | Shimmer-effect skeleton cards matching final card dimensions. Maintain grid structure during load. Use Tailwind `animate-pulse` with a linear-gradient overlay for shimmer. |
| Complexity | Low |
| Dependencies | TS-1 (must match final card dimensions) |
| Confidence | HIGH -- skeleton loading is industry standard |

### TS-3: Card Hover Micro-Interactions
| Aspect | Detail |
|--------|--------|
| Why Expected | Canva, Netflix, and every premium marketplace use hover state changes. Current cards have only `hover:shadow-md` and a binary overlay. This feels flat. |
| What | On hover: (1) Card lifts with shadow + subtle scale (1.03), (2) Thumbnail zooms slightly (1.08 over 300ms), (3) Action buttons fade in with stagger, (4) Title slides up. Use existing Framer Motion. Spring config: stiffness 300, damping 20. |
| Complexity | Low-Medium |
| Dependencies | TS-1 |
| Confidence | HIGH -- Framer Motion already in project, spring configs verified from docs |

### TS-4: Instant Template-to-Editor Navigation
| Aspect | Detail |
|--------|--------|
| Why Expected | Yodeck and OptiSigns both have friction in template application (multiple modals, page reloads). Users expect Canva-level speed: click template, land in editor. |
| What | Quick Apply creates scene and navigates to `/scene-editor/{id}` with no intermediate success modal (current flow shows customize modal then success modal then navigate). For templates without customizable fields, go directly. For customizable templates, show inline customization step then navigate. Eliminate the success modal entirely -- show a toast instead. |
| Complexity | Medium |
| Dependencies | Existing installTemplateAsScene API |
| Confidence | HIGH -- this is a UX simplification, no new APIs needed |

### TS-5: In-Editor Stock Photos (Unsplash)
| Aspect | Detail |
|--------|--------|
| Why Expected | ScreenCloud Canvas and Canva both embed stock photos directly in the editor. Having to leave the editor to find images is a significant friction point. |
| What | Add a custom "Stock Photos" side panel tab in the Polotno editor using Polotno's custom section API. Search Unsplash, display results in ImagesGrid, click to insert on canvas. Reuse the Unsplash integration pattern from SVG editor LeftSidebar. Must include photographer attribution per Unsplash API terms. Must trigger download tracking endpoint. |
| Complexity | Medium |
| Dependencies | Polotno custom section API, Unsplash API key (already exists in codebase) |
| Confidence | HIGH -- Polotno docs confirm custom image panels are supported. Unsplash integration already exists in SVG editor. |

### TS-6: Unsplash API Compliance
| Aspect | Detail |
|--------|--------|
| Why Expected | Unsplash API terms are non-negotiable. Violating them risks API access revocation. |
| What | (1) Hotlink images directly from Unsplash CDN (do not re-upload), (2) Display photographer name + link to Unsplash profile with UTM params, (3) Call `GET /photos/:id/download` on every use to track downloads, (4) Move API key from hardcoded string to environment variable, (5) Apply for production rate limit (50 req/hr demo vs 5,000 req/hr production). |
| Complexity | Low-Medium |
| Dependencies | TS-5 |
| Confidence | HIGH -- verified from official Unsplash API documentation |

### TS-7: Template Preview Detail View
| Aspect | Detail |
|--------|--------|
| Why Expected | Figma Community and Envato both show detailed previews before applying. Current TemplatePreviewPanel shows basic info in a drawer. |
| What | Enhance the existing preview panel: (1) Larger preview image (full-width in panel), (2) Multi-slide carousel if template has multiple slides, (3) Color palette preview showing template colors, (4) "Similar templates" row (already partially built -- SimilarTemplatesRow component exists), (5) Keyboard navigation (arrow keys for next/prev template). |
| Complexity | Medium |
| Dependencies | TS-1 |
| Confidence | MEDIUM -- component exists, enhancement scope is well-defined |

### TS-8: Search with Instant Results
| Aspect | Detail |
|--------|--------|
| Why Expected | Canva shows results as you type with no perceptible delay. Current 300ms debounce + server round-trip creates visible lag. |
| What | (1) Client-side fuzzy filtering for instant visual feedback while server query runs, (2) Reduce debounce to 200ms, (3) Show "Searching..." skeleton during fetch, (4) Highlight matching text in results. |
| Complexity | Medium |
| Dependencies | None |
| Confidence | MEDIUM -- requires client-side index, complexity depends on template count |

---

## Differentiators

Features that set BizScreen apart from Yodeck/OptiSigns. Not expected, but create "wow" moments.

### DF-1: Animated Template Preview on Hover
| Aspect | Detail |
|--------|--------|
| Value Proposition | Neither Yodeck (static thumbnails) nor OptiSigns (basic previews) show animated template previews. This is what makes Canva's browse feel alive. |
| What | On hover (after 500ms dwell), play a slow CSS animation cycling through template slides. Use CSS `@keyframes` to crossfade between slide thumbnails. For multi-slide templates, show a mini slideshow. For single-slide templates, apply subtle Ken Burns (slow pan/zoom). |
| Complexity | Medium-High |
| Dependencies | TS-1, TS-3. Requires slide thumbnail URLs to be preloaded. |
| Confidence | MEDIUM -- requires pre-generated slide thumbnails per template |

### DF-2: In-Editor Icon Library
| Aspect | Detail |
|--------|--------|
| Value Proposition | Digital signage frequently needs icons (arrows, phone, wifi, food, etc.). Currently users must find and upload SVG icons externally. Providing an in-editor icon browser eliminates this friction. |
| What | Add a custom "Icons" side panel tab in Polotno. Use Lucide icons (1,450+ icons, already in project as dependency) rendered as SVGs that can be inserted as vector elements. Include search, category filtering, and one-click insert. Could also integrate Iconify for 100,000+ icons from 100+ sets. |
| Complexity | Medium |
| Dependencies | Polotno custom section API. Lucide already installed. |
| Confidence | MEDIUM -- Polotno supports custom shapes/icons panels per docs. Lucide provides programmatic SVG access. Need to verify Polotno SVG element insertion path. |

### DF-3: Template Color Auto-Adaptation
| Aspect | Detail |
|--------|--------|
| Value Proposition | OptiSigns templates are rigid and resist customization. If BizScreen templates auto-adapt to the user's brand colors, that is a significant differentiator. |
| What | When a user applies a template, automatically replace template accent colors with the tenant's brand theme colors (primary, secondary, accent from existing brandThemeService). Show a before/after preview. Allow manual override of individual color replacements. |
| Complexity | High |
| Dependencies | Existing brandThemeService, template metadata with color mapping |
| Confidence | LOW -- requires templates to have color metadata. Current template format may not support this. Needs phase-specific research. |

### DF-4: "Recently Viewed" + Smart Suggestions
| Aspect | Detail |
|--------|--------|
| Value Proposition | Show templates the user browsed but did not apply, and suggest templates based on their industry/usage patterns. Goes beyond favorites/recents into intelligent curation. |
| What | (1) Track template views (not just applications) client-side with IndexedDB, (2) "Continue browsing" section showing recently viewed but unapplied templates, (3) "Recommended for you" section using business_type from tenant settings to filter category matches. |
| Complexity | Medium |
| Dependencies | Existing recentlyUsed infrastructure, tenant business_type field |
| Confidence | MEDIUM -- client-side tracking is straightforward. Recommendation algorithm is basic category matching. |

### DF-5: Drag-and-Drop Template Application
| Aspect | Detail |
|--------|--------|
| Value Proposition | Instead of click-to-apply, allow users to drag a template card directly onto a screen or playlist in a sidebar. This would be unique in the digital signage space. |
| What | Template cards become draggable (using existing @dnd-kit dependency). A persistent sidebar shows screens/playlists as drop targets. Dropping triggers the apply flow. |
| Complexity | High |
| Dependencies | @dnd-kit (already installed), screen/playlist APIs |
| Confidence | LOW -- complex interaction pattern. Needs careful UX validation. May confuse users. |

### DF-6: Full-Screen Lightbox Preview
| Aspect | Detail |
|--------|--------|
| Value Proposition | See a template at actual display resolution before applying. Simulates how it will look on a real screen. Neither Yodeck nor OptiSigns offer this. |
| What | Keyboard shortcut (Space) or double-click on template opens a full-screen lightbox showing the template at 16:9 with dark backdrop. Arrow keys navigate between templates. Escape closes. Shows Apply button floating in corner. |
| Complexity | Medium |
| Dependencies | TS-1, TS-7 |
| Confidence | HIGH -- standard lightbox pattern, easy to implement with existing modal system |

### DF-7: BizScreen Media Library Panel in Polotno
| Aspect | Detail |
|--------|--------|
| Value Proposition | Users have already uploaded images to BizScreen's media library. Being able to browse and insert them directly in the Polotno editor without re-uploading eliminates a major friction point. |
| What | Add a custom "My Media" side panel tab in Polotno editor. Fetches from existing media library API. Shows thumbnails in a grid. Click to insert on canvas. Include search and folder/tag filtering. |
| Complexity | Medium |
| Dependencies | Polotno custom section API, existing media service APIs |
| Confidence | HIGH -- same pattern as TS-5 (custom images panel), uses existing media APIs |

---

## Anti-Features

Features to explicitly NOT build. Including these would waste effort or hurt the product.

### AF-1: User-to-User Template Marketplace
| Why Avoid | Requires moderation infrastructure, payment processing, content review, copyright handling. Canva has hundreds of employees for this. The ROI is negative for a digital signage platform. |
| What to Do Instead | Admin-curated template library. Allow tenants to "save as template" for internal reuse only (already partially exists). |

### AF-2: AI Template Generation
| Why Avoid | Generating visually coherent multi-element templates from prompts is unreliable. Results would look amateur compared to professionally designed templates. Would undermine the "premium" positioning. |
| What to Do Instead | AI-assisted customization of existing templates (color adaptation, text suggestions). This is already partially implemented with the AI panel in SceneEditor. |

### AF-3: Complex Filtering UI (Faceted Search)
| Why Avoid | Envato's faceted search works because they have 10M+ assets. For a library of 100-500 templates, faceted search with multiple dropdowns adds complexity without value. OptiSigns is criticized for having "too many buttons." |
| What to Do Instead | Simple category tabs + text search + orientation filter. The existing sidebar approach is appropriate. |

### AF-4: Template Ratings and Reviews
| Why Avoid | With a curated (not user-generated) template library, ratings from users have limited signal. A template with 3 stars but no alternative in its category just looks bad. |
| What to Do Instead | Use usage counts and admin curation (featured/promoted) to surface quality templates. TemplateRating component exists but should only be used for feedback to admins, not public display. |

### AF-5: Pexels + Unsplash + Pixabay (Multiple Stock Photo Sources)
| Why Avoid | Multiple stock photo APIs mean multiple attribution requirements, multiple rate limits, inconsistent image quality, and UI complexity of source switching. |
| What to Do Instead | Unsplash only. It has 3M+ photos, is the most recognized brand, has the best API documentation, and the project already has a working integration. Add Pexels only if Unsplash proves insufficient. |

### AF-6: Custom Font Upload in Editor
| Why Avoid | Custom fonts in digital signage are a rendering nightmare -- the player device must also have the font or the design breaks. Font licensing is complex. |
| What to Do Instead | Curate a set of web-safe + Google Fonts that are available across all players. Polotno already includes Google Fonts support. |

---

## Feature Dependencies

```
TS-1 (Large Thumbnails) ─────> TS-2 (Skeleton Loading)
    │                              │
    ├──> TS-3 (Hover Micro)        │
    │       │                      │
    │       └──> DF-1 (Animated Preview)
    │
    ├──> TS-7 (Preview Detail)
    │       │
    │       └──> DF-6 (Lightbox)
    │
    └──> TS-8 (Search)

TS-5 (Unsplash in Editor) ──> TS-6 (API Compliance)
    │
    └──> DF-7 (Media Library Panel) [same Polotno custom section pattern]
    │
    └──> DF-2 (Icon Library) [same Polotno custom section pattern]

TS-4 (Instant Nav) ── independent, can be done anytime

DF-3 (Color Adaptation) ── independent, but needs template metadata work
DF-4 (Smart Suggestions) ── independent, uses existing data
DF-5 (Drag and Drop) ── independent, risky
```

### Critical Path

The dependency chain that unlocks the most value fastest:

1. **TS-1 (Large Thumbnails)** -- foundation for everything visual
2. **TS-3 (Hover Micro-Interactions)** -- biggest "feel" improvement
3. **TS-4 (Instant Nav)** -- biggest workflow improvement
4. **TS-5 + TS-6 (Unsplash in Editor)** -- biggest editor improvement
5. **DF-7 (Media Library in Editor)** -- follows TS-5's pattern exactly

---

## MVP Recommendation

### Must Have (Phase 1 -- "Premium Browse")
1. **TS-1**: Large thumbnail grid with lazy loading
2. **TS-2**: Skeleton loading with shimmer effect
3. **TS-3**: Card hover micro-interactions (scale + shadow + image zoom)
4. **TS-4**: Instant template-to-editor flow (eliminate success modal)
5. **TS-8**: Improved search with instant client-side feedback

### Must Have (Phase 2 -- "Editor Assets")
6. **TS-5**: Unsplash stock photos in Polotno editor
7. **TS-6**: Unsplash API compliance (attribution, download tracking, env var)
8. **DF-7**: BizScreen media library panel in Polotno editor

### Should Have (Phase 3 -- "Delight")
9. **TS-7**: Enhanced preview panel with slide carousel
10. **DF-2**: Icon library in Polotno editor
11. **DF-6**: Full-screen lightbox preview
12. **DF-4**: Smart suggestions based on business type

### Defer
- **DF-1** (Animated Preview): Requires pre-generated slide thumbnails -- infrastructure work
- **DF-3** (Color Adaptation): Requires template metadata schema changes
- **DF-5** (Drag and Drop): Risky UX, low certainty of value

---

## Competitor Analysis

### Canva (Gold Standard -- Not a Direct Competitor but UX Benchmark)

**What they do well:**
- Instant search with visual results as you type
- Template cards show hover animation (subtle scale + shadow lift)
- One-click opens template directly in editor with all elements editable
- Stock photos, icons, and illustrations available directly in editor side panel
- Smart color adaptation to brand kit colors

**What BizScreen can learn:**
- The speed of template-to-editor is what makes Canva feel premium. Every modal is a speed bump.
- In-editor asset panels eliminate context switching. Users should never leave the editor to find content.
- Hover interactions signal quality. Static grids feel like a spreadsheet.

**What BizScreen should NOT copy:**
- Canva's complexity (4000+ template types, multiple content formats). BizScreen's focused scope on digital signage is an advantage.

### Envato Elements (Marketplace UX Benchmark)

**What they do well:**
- Very large preview images -- testing showed actual screenshots outperform marketing graphics
- Dark mode option for browsing (reduces eye strain during extended sessions)
- Orientation filter for vertical/landscape (critical for digital signage)
- Live preview URLs for web templates

**What BizScreen can learn:**
- Image quality in thumbnails matters more than card information density
- Orientation filter is critical for signage (landscape vs portrait screens)

### Yodeck (Direct Competitor)

**What they do well:**
- Simple template application flow
- Templates organized by industry vertical

**Weaknesses to exploit:**
- Small template library (400-500 templates)
- No search functionality in template browser
- Static thumbnails only -- no hover preview
- No in-editor stock photo integration
- Templates are not deeply customizable

### OptiSigns (Direct Competitor)

**What they do well:**
- Large template library
- Many integrations (Google Slides, Canva, social)

**Weaknesses to exploit:**
- Templates follow rigid structure, limiting creative customization
- Dashboard is cluttered with too many buttons and options
- No animated previews
- Template browsing feels utilitarian, not premium

### ScreenCloud (Emerging Competitor)

**What they do well:**
- Canvas (their in-app editor) has clean design
- Direct Canva integration for content creation
- Good template browsing with category organization

**What BizScreen can learn:**
- In-app design tools are table stakes now -- ScreenCloud positions their editor as a key differentiator

---

## Specific Micro-Interaction Patterns (Implementation Ready)

### Card Hover (TS-3) -- Concrete Specification

```javascript
// Extend motion.js with these new presets

export const premiumCardHover = {
  // Card container: lift + scale
  whileHover: {
    y: -4,
    scale: 1.03,
    boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
  },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 20
  },
};

export const thumbnailZoom = {
  // Image inside card: subtle zoom
  whileHover: { scale: 1.08 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
};

export const overlayReveal = {
  // Overlay: fade in with buttons staggering
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
};

export const buttonStagger = {
  // Buttons inside overlay: stagger entrance
  variants: {
    hidden: { opacity: 0, y: 8 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.15 },
    }),
  },
};
```

Duration: 200-500ms per research. Spring config: stiffness 300, damping 20 per Framer Motion best practices.

### Skeleton Shimmer (TS-2) -- Concrete Specification

```css
/* Add to Tailwind config or as utility class */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    theme('colors.gray.200') 25%,
    theme('colors.gray.100') 50%,
    theme('colors.gray.200') 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Polotno Custom Section Pattern (TS-5, DF-2, DF-7) -- Concrete Specification

All three editor panels follow the identical Polotno pattern:

```javascript
// Pattern for any custom side panel section
const CustomSection = {
  name: 'unique-name',
  Tab: (props) => (
    <SectionTab name="Display Name" {...props}>
      <IconComponent />
    </SectionTab>
  ),
  Panel: observer(({ store }) => {
    // 1. Search state
    // 2. Results state + loading
    // 3. Fetch from API on search change
    // 4. Render with ImagesGrid component
    // 5. On select: getImageSize() then store.activePage.addElement()
    return <div>...</div>;
  }),
};
```

Apply this pattern three times:
1. **UnsplashPanel**: Calls Unsplash API, displays photos, inserts as image element
2. **IconPanel**: Renders Lucide SVGs, inserts as SVG element
3. **MediaLibraryPanel**: Calls BizScreen media API, displays uploads, inserts as image element

---

## Unsplash Integration Specifics (TS-5 + TS-6)

### API Details (Verified from Official Docs)

| Detail | Value |
|--------|-------|
| Search endpoint | `GET /search/photos?query={q}&per_page=20&orientation=landscape` |
| Rate limit (demo) | 50 requests/hour |
| Rate limit (production) | 5,000 requests/hour |
| Download tracking | `GET /photos/:id/download` (REQUIRED on every use) |
| Hotlinking | REQUIRED -- use returned URLs directly, do not re-upload |
| Attribution | Photographer name + link to Unsplash profile with UTM params |
| Image resizing | Via Imgix params on URL: `?w=800&h=600&fit=crop` |
| Image requests | Requests to images.unsplash.com do NOT count against rate limit |

### Current Issues to Fix

1. **API key is hardcoded** in `src/components/svg-editor/LeftSidebar.jsx` line 255. Must move to environment variable.
2. **No download tracking** -- current SVG editor integration does not call the download endpoint.
3. **No proper attribution links** -- current implementation shows photographer name but no clickable link with UTM params.
4. **Demo rate limit** -- 50 req/hr is insufficient. Must apply for production access.

### Migration Path

Extract Unsplash service from LeftSidebar into a shared `src/services/unsplashService.js`:
- `searchPhotos(query, options)` -- search with caching
- `trackDownload(photoId)` -- required download tracking
- `getPhotoUrl(photo, size)` -- returns properly sized URL
- `getAttributionHtml(photo)` -- returns compliant attribution

---

## Sources

### Official Documentation (HIGH confidence)
- [Unsplash API Documentation](https://unsplash.com/documentation)
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [Unsplash Hotlinking Guidelines](https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images)
- [Polotno Custom Images Panel](https://polotno.com/docs/custom-images-panel)
- [Polotno Side Panel Overview](https://polotno.com/docs/side-panel-overview)
- [Polotno Shapes and Icons](https://polotno.com/sdk/product/features/shapes-icons)
- [Framer Motion Gestures (Hover)](https://www.framer.com/motion/gestures/)
- [Framer Motion Animation API](https://www.framer.com/motion/animation/)

### Engineering Blogs (MEDIUM confidence)
- [5 Visual Effects Canva Uses to Thrill Users](https://www.canva.dev/blog/engineering/5-visual-effects-canva-uses-to-thrill-users/)
- [Skeleton Loading Screen Design (LogRocket)](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)
- [6 Loading State Patterns That Feel Premium](https://medium.com/uxdworld/6-loading-state-patterns-that-feel-premium-716aa0fe63e8)
- [Micro Interactions in Web Design 2025](https://www.stan.vision/journal/micro-interactions-2025-in-web-design)

### Competitor Analysis (MEDIUM confidence)
- [Envato December 2025 Updates](https://author.envato.com/hub/whats-new-to-envato-december-2025/)
- [Envato Item Presentation Requirements](https://help.author.envato.com/hc/en-us/articles/360000424863-Item-Presentation-Requirements)
- [OptiSigns vs Yodeck Comparison](https://www.optisigns.com/optisigns-vs-yodeck)
- [Yodeck vs OptiSigns (CrownTV)](https://www.crowntv-us.com/blog/yodeck-vs-optisigns/)
- [ScreenCloud Canvas Best Practices](https://screencloud.com/product-updates/digital-signage/canvas-in-app-editor-best-practices)

### Icon Libraries (MEDIUM confidence)
- [Lucide Icons](https://lucide.dev/)
- [shadcn-iconpicker (GitHub)](https://github.com/alan-crts/shadcn-iconpicker)

### Stock Photo API Comparison (MEDIUM confidence)
- [7 Image APIs To Use In 2026](https://templated.io/blog/image-apis-to-use-on-your-product/)
- [Unsplash vs Pexels (Slant)](https://www.slant.co/versus/3470/3482/~unsplash_vs_pexels)
