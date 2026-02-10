# Pitfalls Research: BizScreen v3.0 Creative Experience

**Project:** BizScreen Digital Signage Platform - v3.0 Creative Experience
**Features:** Premium template browsing, editor UI polish, stock asset integration (Unsplash/icons), instant template-to-editor flow
**Researched:** 2026-02-10
**Confidence:** HIGH (combination of codebase analysis, verified API documentation, and known integration patterns)

## Summary

Adding premium template browsing, stock asset integration, and editor polish to BizScreen's existing platform creates pitfalls across five areas: (1) animation performance when adding visual richness to a page already rendering 50+ template thumbnails, (2) Unsplash API compliance requirements that are stricter than most developers expect and carry risk of API access revocation, (3) the Polotno iframe boundary that fundamentally limits how stock assets and custom panels can be integrated into the editor, (4) template preview performance when scaling the existing grid to handle richer interactions, and (5) UX complexity from adding browsing flows that can overwhelm small-business users.

The single highest-risk pitfall is **Polotno iframe boundary blocking direct stock asset integration** -- BizScreen runs Polotno inside an iframe with React 18 (isolated from the main app's React 19). Polotno's custom side panel API requires direct React component registration inside the editor, which cannot cross the iframe boundary via postMessage. This means adding Unsplash/icon browsing *inside* the editor requires modifying the Polotno iframe build, not the main app.

---

## Critical Pitfalls

Mistakes that cause rewrites, compliance violations, or major architectural problems.

---

### Pitfall 1: Polotno Iframe Boundary Blocks Direct Stock Asset Integration

**What goes wrong:** Team attempts to add Unsplash photo browsing and icon/sticker panels to the Polotno editor by building React components in the main app and communicating via postMessage. This approach fails because Polotno's custom side panel API (`sections` prop on `<SidePanel>`) requires React components registered *inside* the Polotno React tree, not external components communicating across an iframe boundary.

**Why it happens:** BizScreen deliberately isolates Polotno in an iframe running React 18 to avoid React 19 conflicts (verified in `PolotnoEditor.jsx` line 6: "Embeds Polotno Studio in an iframe with React 18 isolated from main app's React 19"). The Polotno SDK's customization API assumes direct React component access to the store object and MobX observers, neither of which work across iframe postMessage.

**BizScreen-specific risk:** The current iframe build (`scripts/polotno-build/src/polotno-editor.jsx`) uses `DEFAULT_SECTIONS` from `polotno/side-panel`. Adding custom sections means modifying this build file, adding dependencies (Unsplash API client, icon libraries) to the *Polotno build*, not the main app. This increases the iframe bundle size and creates a second build pipeline to maintain.

**Consequences:**
- Weeks wasted building postMessage-based stock asset browsing that cannot actually insert images into the Polotno canvas
- Alternative "external picker" approach (search outside editor, paste URL) creates jarring UX with context switching
- Adding dependencies to Polotno iframe build increases load time past the 10-second timeout (verified in `EditorModal.jsx` line 150)

**Warning signs:**
- Stock asset panel prototype that searches and displays images but cannot drag-and-drop onto canvas
- "Add to canvas" button that requires serializing image data through postMessage
- Editor load time increasing beyond 10 seconds after adding Unsplash/icon dependencies

**Prevention:**
1. Accept that stock asset panels MUST live inside the Polotno iframe build, not the main app
2. Modify `scripts/polotno-build/src/polotno-editor.jsx` to register custom `sections` with `<SidePanel>` using Polotno's documented `ImagesGrid` component
3. Proxy Unsplash API calls through a lightweight backend endpoint (Supabase Edge Function or Vite dev server route) to avoid exposing API keys in the iframe
4. Lazy-load stock asset panel code within the iframe build to avoid increasing initial load time
5. Set a performance budget: Polotno iframe total JS must stay under current size + 50KB gzipped
6. Test editor load time after each stock panel addition; fail if > 8 seconds (leaving 2s buffer before 10s timeout)

**Phase mapping:** Must address in architecture phase BEFORE building any stock asset features

**Confidence:** HIGH (verified from `PolotnoEditor.jsx`, `polotno-editor.jsx`, and [Polotno custom images panel docs](https://polotno.com/docs/custom-images-panel))

---

### Pitfall 2: Unsplash API Compliance Violations Risk API Access Revocation

**What goes wrong:** Implementation fails to meet one or more of Unsplash's four mandatory API guidelines: (1) attribution, (2) hotlinking, (3) download tracking, (4) no user re-registration. Unsplash rejects rate limit increase application or revokes API access entirely.

**Why it happens:** Developers treat Unsplash like a generic image CDN. The requirements are stricter than expected and carry real enforcement -- Unsplash reviews applications before granting production rate limits (50 req/hr demo vs 5,000 req/hr production).

**BizScreen-specific risk:** The existing `createStockAsset()` function in `mediaService.js` (line 578) stores `photographer` and builds an `attribution` string, but the current implementation has gaps:
- Attribution string format (`Photo by {name} on {provider}`) lacks required UTM-parameterized links back to Unsplash profiles
- No mechanism to trigger the `download_location` endpoint when a user selects an image for their design
- The `url` field stores the direct image URL, but Unsplash requires hotlinking their CDN URLs, not re-hosting on S3/CloudFront
- No distinction between "browsing" (hotlink required) and "used in design" (download trigger required)

**Consequences:**
- API access stuck at 50 requests/hour (one user browsing uses this in minutes)
- Unsplash could revoke access entirely for non-compliance
- Legal exposure from licensing terms violation
- Having to rebuild the attribution and tracking system after launch

**The four mandatory requirements (verified):**

| Requirement | What It Means | Current BizScreen Gap |
|-------------|---------------|----------------------|
| **Attribution** | Display "Photo by [Name] on Unsplash" with UTM-linked profile URL | Attribution string exists but lacks links and UTM params |
| **Hotlinking** | Use `images.unsplash.com` URLs directly, never re-host to S3 | `createStockAsset` stores URL in `media_assets` -- if images are re-uploaded to S3, this violates terms |
| **Download trigger** | Hit `photo.links.download_location` when user "uses" a photo | No download tracking endpoint call exists |
| **No user re-auth** | Don't require users to create Unsplash developer accounts | Not applicable (BizScreen proxies API) |

**Prevention:**
1. Store Unsplash photo metadata including `download_location` URL alongside the photo data
2. When user inserts photo into design (the "download" event), fire async GET to `download_location` with your `client_id`
3. Never re-host Unsplash images to S3 -- use their CDN URLs directly for display in templates and editor
4. Build attribution component that renders linked photographer name with UTM params: `?utm_source=bizscreen&utm_medium=referral`
5. For images used in *published signage content* (played on screens), you may need to download and host -- check if this constitutes "offline use" which has different terms
6. Apply for production rate limit EARLY (takes days/weeks for review) -- don't wait until launch

**Phase mapping:** Must establish Unsplash compliance architecture before any Unsplash feature work begins

**Confidence:** HIGH (verified from [Unsplash Attribution Guidelines](https://help.unsplash.com/en/articles/2511315-guideline-attribution), [Unsplash Hotlinking Guidelines](https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images), [Unsplash Download Trigger Guidelines](https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download), and [Unsplash API Terms](https://unsplash.com/api-terms))

---

### Pitfall 3: Unsplash Hotlinking vs Offline Signage Player Conflict

**What goes wrong:** Unsplash requires hotlinking their CDN URLs. But BizScreen's digital signage players must work offline. An offline player cannot hotlink to `images.unsplash.com`. The image either fails to display (blank screen on production signage) or the team re-hosts to S3 (violating Unsplash terms).

**Why it happens:** The Unsplash API terms were designed for web applications with constant internet access, not for offline-first digital signage players. This is a fundamental tension between Unsplash's business model (tracking views via their CDN) and BizScreen's core value proposition (screens work offline).

**BizScreen-specific risk:** This is the most BizScreen-specific pitfall. The player has a 3-phase sync system (prefetch, background, reconnect) and caches content in IndexedDB for offline use. If Unsplash images are hotlinked, they will fail when the player is offline. If they are cached/re-hosted, Unsplash terms are violated.

**Consequences:**
- Blank images on production signage screens during network outages
- Loss of Unsplash API access if re-hosting is detected
- User confusion: "Why do some of my images work offline and Unsplash ones don't?"

**Prevention:**
1. Research whether Unsplash's terms allow caching for offline display -- contact Unsplash developer support directly (their terms mention "embedding" which may cover this use case)
2. If caching is permitted: download images at content-sync time (when player is online), trigger `download_location` endpoint at that point, cache in IndexedDB alongside other media
3. If caching is NOT permitted: clearly mark Unsplash images in the editor as "requires internet" with a warning icon, and show fallback placeholder on offline screens
4. Consider Unsplash's commercial licensing options which may permit re-hosting for a fee
5. Alternative: use Pexels API instead (CC0 license, explicitly allows downloading and re-hosting) -- Polotno already has a [Pexels integration example](https://polotno.com/docs/pexels-photos)

**Phase mapping:** Must resolve before committing to Unsplash -- this is a go/no-go decision point

**Confidence:** MEDIUM (Unsplash terms are ambiguous about offline caching for display purposes; direct clarification needed)

---

### Pitfall 4: Animation Performance Degrades Template Browse Page

**What goes wrong:** Adding hover animations, stagger effects, and micro-interactions to template cards causes jank on the browse page when 50+ template cards are visible. Users experience dropped frames, sluggish scrolling, and delayed hover responses.

**Why it happens:** The current `TemplateGrid` renders ALL templates in a flat grid without virtualization (verified in `TemplateGrid.jsx` line 174). Adding framer-motion animations to each card means 50+ `motion.div` components each running independent animation loops. Layout animations (`scale`, `y` transforms) can cause style recalculation storms when multiple cards animate simultaneously.

**BizScreen-specific risk:**
- framer-motion v12.23.24 is installed and used across 32 files already
- The existing `motion.js` design system has `staggerContainer` and `staggerItem` presets that will be tempting to apply to the template grid -- but staggering 50+ items causes visible "waterfall" delays
- `AnimatePresence` is already used for preview panel and wizard overlays -- nesting or combining with grid animations can cause memory leaks (known framer-motion issue with `layoutId` + `AnimatePresence`)
- Template thumbnails load from CloudFront with no `loading="lazy"` attribute (verified in `TemplateGrid.jsx` line 76-79 -- plain `<img>` with no lazy loading)

**Warning signs:**
- Lighthouse Performance score drops below 90 on template browse page
- "Long task" warnings in DevTools Performance tab during scroll
- Hover effects feel "sticky" or delayed (> 100ms response time)
- CPU usage spikes when scrolling through template grid

**Prevention:**
1. Use CSS transitions for hover effects, NOT framer-motion -- the existing `cssTransitions.cardHover` preset is sufficient and GPU-accelerated
2. Reserve framer-motion for entrance animations (page load stagger) and exit animations (panel open/close) only
3. Limit stagger to first 8-12 visible cards; remaining cards use instant `opacity: 1`
4. Add `loading="lazy"` to ALL template thumbnail `<img>` tags (currently missing)
5. Implement intersection-observer-based virtualization for grids with > 24 items
6. Animate only `transform` and `opacity` properties -- never `width`, `height`, `top`, `left`
7. Use `will-change: transform` on cards that will animate, but remove it after animation completes
8. Performance budget: template browse page must maintain 60fps during scroll, measured with DevTools at 4x CPU slowdown

**Phase mapping:** Address in the first animation/UI polish phase; establish performance testing before adding any animations

**Confidence:** HIGH (verified from codebase analysis, [Motion performance tier list](https://motion.dev/magazine/web-animation-performance-tier-list), and [framer-motion performance tips](https://tillitsdone.com/blogs/framer-motion-performance-tips/))

---

### Pitfall 5: Template Thumbnail Grid Causes Layout Shift and Waterfall Loading

**What goes wrong:** Loading 50+ template thumbnails simultaneously creates a waterfall of network requests, layout shifts as images load at different times, and a slow perceived load time even if the data arrives quickly.

**Why it happens:** The current `TemplateGrid` uses `aspect-video` containers but does not specify `width`/`height` on images, relying on CSS for sizing. The `TemplateCard` has no skeleton/placeholder state for individual cards -- only the page-level loading skeleton exists (8 pulse cards). When filter changes cause a re-render, all 50+ thumbnails re-request simultaneously.

**BizScreen-specific risk:**
- `OptimizedImage.jsx` exists with lazy loading and blur placeholder, but `TemplateCard` does NOT use it -- it uses plain `<img>` tags
- Template thumbnails are served from CloudFront CDN, which handles concurrent requests well, but the browser still has connection limits (6 concurrent per domain)
- The `fetchMarketplaceTemplates` call returns all matching templates at once (no pagination in the current grid view) -- could be 100+ templates

**Warning signs:**
- CLS (Cumulative Layout Shift) score > 0.1 on template browse page
- Users see images "popping in" one by one over 3-5 seconds
- Filtering categories causes a visible flash of empty cards before new thumbnails load
- Mobile users on slow connections see broken/partial grid for extended periods

**Prevention:**
1. Use `OptimizedImage` component (already exists!) instead of plain `<img>` in `TemplateCard` -- it has lazy loading, blur placeholder, and error handling
2. Add `width` and `height` attributes to thumbnail images for layout stability
3. Implement progressive loading: show first 12 templates immediately, load remaining on scroll
4. Use `srcset` with multiple thumbnail sizes: 200px for grid, 480px for preview panel, full-size only in editor
5. Pre-generate WebP thumbnails at upload time (CloudFront can serve WebP with content negotiation)
6. Consider using `<picture>` element with AVIF/WebP fallback chain for modern browsers
7. When switching categories, maintain skeleton state per-card rather than replacing entire grid

**Phase mapping:** Address alongside template browse page enhancements, before adding animations

**Confidence:** HIGH (verified from `TemplateCard.jsx`, `OptimizedImage.jsx`, and [image gallery lazy loading patterns](https://medium.com/@albertjuhe/an-easy-to-use-performant-solution-to-lazy-load-images-in-react-e6752071020c))

---

## Moderate Pitfalls

Mistakes that cause significant rework, degraded UX, or maintenance burden.

---

### Pitfall 6: unsplash-js Library Is Archived -- Must Use Raw HTTP

**What goes wrong:** Team installs `unsplash-js` (the official JavaScript wrapper), implements Unsplash integration, then discovers the library is archived (read-only, no updates, no bug fixes). Future breakages have no fix path.

**Why it happens:** Unsplash archived the `unsplash-js` repository on January 19, 2026. The npm package still installs but receives no updates. Unsplash now directs developers to use their REST API directly.

**BizScreen-specific risk:** Any new dependency on an archived package adds maintenance risk. If Unsplash changes API response format or endpoints, the wrapper will not be updated. The team would need to fork and maintain it or migrate mid-feature.

**Prevention:**
1. Do NOT install `unsplash-js` -- it is archived and unsupported
2. Build a thin service layer (`unsplashService.js`) that calls the Unsplash REST API directly using `fetch`
3. Key endpoints: `GET /search/photos`, `GET /photos/:id`, `GET /photos/:id/download`
4. Implement your own response type handling and error mapping
5. This also enables server-side proxying more easily (no client-side library needed)

**Phase mapping:** Address when starting Unsplash integration development

**Confidence:** HIGH (verified: [unsplash-js GitHub is archived](https://github.com/unsplash/unsplash-js) as of January 2026)

---

### Pitfall 7: Unsplash Rate Limiting Breaks Browse UX During Demo Mode

**What goes wrong:** During development and initial launch, the Unsplash API is in "demo mode" with a 50 requests/hour limit. A single user browsing stock photos can exhaust this in minutes (each search = 1 request, each page of results = 1 request). The stock photo panel suddenly stops working mid-session with no useful error message.

**Why it happens:** Unsplash starts all new API keys in demo mode. Production access (5,000 req/hr) requires application review, which takes days to weeks. Teams often don't apply early enough.

**BizScreen-specific risk:** If multiple developers test simultaneously during development, they share the 50 req/hr limit. In production, if rate limit increase hasn't been approved, the very first demo with a client could fail.

**Prevention:**
1. Apply for Unsplash production access the SAME DAY the API key is created -- do not wait for feature completion
2. Implement aggressive client-side caching: cache search results for 5 minutes, cache individual photo metadata for 1 hour
3. Add rate limit header monitoring: `X-Ratelimit-Remaining` header tells you how many requests remain
4. Show graceful degradation: "Stock photo search temporarily unavailable, please try again in X minutes" instead of generic error
5. Implement search debouncing (300ms minimum) to avoid wasting requests on partial searches -- the existing template search uses 300ms debounce (verified in `TemplateMarketplacePage.jsx` line 190), apply same pattern
6. Cache results in Supabase for common searches (e.g., "restaurant", "coffee", "business") to reduce API calls

**Phase mapping:** Apply for production access immediately when API key is created; implement caching in first sprint

**Confidence:** HIGH (verified from [Unsplash rate limit documentation](https://unsplash.com/documentation) and [rate limit help article](https://help.unsplash.com/en/articles/3887917-when-should-i-apply-for-a-higher-rate-limit))

---

### Pitfall 8: Template-to-Editor Flow Loses Template Structure

**What goes wrong:** User clicks "Quick Apply" on a template, expecting to edit individual text elements, images, and layers. Instead, the template loads as a single flattened background image, making individual element editing impossible.

**Why it happens:** The current `loadTemplate` handler in `polotno-editor.jsx` (line 144-166) loads templates as a single background image element:
```javascript
page.addElement({
  type: 'image',
  src: payload.backgroundImage,
  ...
  name: 'Template Background',
});
```
This is a rasterized image, not a structured Polotno design with editable text, shapes, and layers.

**BizScreen-specific risk:** The `EditorModal` passes `templateData.thumbnail` as the `backgroundImage` (line 180-182), which is the template's preview image. This means the user gets a non-editable image overlay, not the actual design template. The existing `installTemplateAsScene` function in `marketplaceService.js` creates a scene with `design_json`, but this JSON is not being passed through to the Polotno editor.

**Consequences:**
- Users cannot edit individual text elements, swap images, or change colors -- defeating the purpose of "template-to-editor"
- Users complain that editing is just "drawing over a picture"
- Template customization wizard becomes the only way to modify templates, which is limited to pre-defined fields

**Prevention:**
1. Modify the template-to-editor flow to pass the template's `design_json` (structured Polotno JSON) instead of the thumbnail image
2. Update `polotno-editor.jsx` to handle `loadDesign` with the full JSON: `store.loadJSON(payload.json)` (this handler already exists at line 137-143)
3. Ensure marketplace templates store proper Polotno-format `design_json` with editable elements, not just rasterized images
4. If templates are not in Polotno JSON format, add a conversion step that creates proper text/image/shape elements
5. Test: user applies template, can click on text to edit it, can swap images, can change colors

**Phase mapping:** Critical for the "instant template-to-editor" feature -- address in first phase

**Confidence:** HIGH (verified from `polotno-editor.jsx` line 144-166 and `EditorModal.jsx` line 179-185)

---

### Pitfall 9: AnimatePresence Memory Leaks with Template Preview Panel

**What goes wrong:** Opening and closing the template preview panel repeatedly causes memory to grow. After 20-30 open/close cycles, the page becomes sluggish. DOM nodes accumulate because `AnimatePresence` fails to properly unmount children in certain scenarios.

**Why it happens:** Known framer-motion bug: `AnimatePresence` can fail to unmount when children contain `motion` elements with `layoutId`, or when React fragments break key tracking. The current `TemplatePreviewPanel` uses `motion.div` with the `drawer.right` preset (verified in `TemplatePreviewPanel.jsx` line 107-109) inside `AnimatePresence` (verified in `TemplateMarketplacePage.jsx` line 473-481).

**BizScreen-specific risk:** Users browse templates by clicking cards, which opens/closes the preview panel repeatedly. The template customization wizard also uses `AnimatePresence` (line 484-493). Rapid open/close cycles (user quickly scanning templates) maximize exposure to this bug.

**Warning signs:**
- DevTools Memory tab shows increasing heap size after repeated panel open/close
- "Detached DOM" elements growing in DevTools Heap snapshot
- Page becomes sluggish after extended template browsing session
- React DevTools shows stale component instances

**Prevention:**
1. Verify framer-motion version supports React 19 properly -- current v12.23.24 should be compatible, but test with React 19's concurrent features
2. Avoid `layoutId` on elements inside `AnimatePresence` -- use simple `key` props instead
3. Do not use React fragments as direct children of `AnimatePresence`
4. Add cleanup in the preview panel: cancel pending fetch requests on unmount via AbortController
5. Profile with DevTools Memory tab: open/close panel 30 times, check for heap growth
6. Consider replacing `AnimatePresence` for the preview panel with CSS transitions (`transform: translateX()`) which have zero memory leak risk

**Phase mapping:** Test during UI polish phase; if leaks found, replace AnimatePresence with CSS

**Confidence:** MEDIUM (known framer-motion issue documented in [GitHub issue #625](https://github.com/framer/motion/issues/625) and [issue #2172](https://github.com/framer/motion/issues/2172); may not affect this specific usage pattern)

---

### Pitfall 10: Icon/Sticker Library Bloats Bundle Size

**What goes wrong:** Adding a searchable icon/sticker library to the editor increases the initial bundle or iframe load time significantly. Icon libraries like Lucide, Heroicons, or FontAwesome contain thousands of SVGs that balloon the bundle.

**Why it happens:** Naive icon library integration imports the entire icon set. Even tree-shakeable libraries add overhead when you need search/browse functionality (requires metadata for all icons). Sticker packs with raster images add CDN request overhead.

**BizScreen-specific risk:**
- The Polotno iframe build is already heavy (Polotno SDK itself is large)
- Current chunk splitting in `vite.config.js` has `vendor-icons` for `lucide-react` at the main app level, but the iframe build has its own bundling
- The 10-second editor timeout leaves little room for additional asset loading
- BizScreen already uses `lucide-react` in the main app (548+ icon version) -- adding a second icon library inside the iframe doubles icon-related bundle cost

**Prevention:**
1. Do NOT bundle icons into the iframe build -- serve icon metadata from an API endpoint
2. Use a CDN-hosted icon sprite sheet or individual SVG files loaded on-demand
3. Icon search: store icon name/tag metadata in a small JSON file (~50KB), load actual SVG only when user selects an icon
4. For stickers: use a Supabase table with CDN-hosted PNG/SVG URLs, not bundled assets
5. Implement pagination in icon browser: show 50 icons at a time, load more on scroll
6. Performance budget: icon/sticker panel should add < 20KB gzipped to the initial iframe bundle

**Phase mapping:** Address during icon/sticker library architecture; bundle size must be measured before and after

**Confidence:** HIGH (verified from bundle analysis setup in `vite.config.js` and editor timeout constraint)

---

### Pitfall 11: Template Browse Page UX Overwhelms Small Business Users

**What goes wrong:** Premium template browse page shows too many options, too many categories, and too many visual effects. Small business owners (BizScreen's target users) feel overwhelmed and abandon template selection, reverting to blank canvases or not using the editor at all.

**Why it happens:** Developers and designers optimize for "impressive" rather than "usable." Adding visual richness (animations, gradients, parallax scrolling, floating elements) makes the page feel like a showcase rather than a tool. Digital signage research consistently shows that content overcrowding is the number-one content mistake.

**BizScreen-specific risk:** The current `TemplateMarketplacePage` already has sidebar + featured row + starter packs row + grid -- four distinct UI sections competing for attention. Adding animations, hover effects, and "premium" visual treatment to all of these simultaneously creates cognitive overload.

**Warning signs:**
- Users spend > 30 seconds on template page without selecting anything (analysis paralysis)
- High bounce rate from template browse page back to dashboard
- Support tickets asking "which template should I use?"
- Users skipping templates entirely and using blank editor

**Prevention:**
1. Progressive disclosure: show 6 "recommended for you" templates prominently, rest behind "See all" links
2. Smart defaults: pre-filter by user's business type (already have `businessType` from onboarding)
3. "Start with this" hero section: one recommended template with large preview and single CTA
4. Limit animations to entrance only -- no continuous looping effects
5. Category tabs should show 3-5 categories max, not a scrollable list of 15
6. A/B test the page: measure template selection rate before and after visual polish
7. Follow the "3-second rule" from digital signage best practices: if a user cannot understand the page purpose in 3 seconds, simplify

**Phase mapping:** UX design review before implementing any visual polish

**Confidence:** MEDIUM (UX judgment based on [digital signage content best practices](https://kiosk.com/8-best-practices-for-digital-signage-content-a-guide-for-high-impact-kiosks/) and [common signage mistakes](https://www.digitalsignagetrends.com/post/digital-signage-common-mistakes))

---

### Pitfall 12: Back Navigation Breaks After Template-to-Editor Flow

**What goes wrong:** User flow: Browse templates -> Preview panel -> Quick Apply -> Editor. User presses browser "Back" button expecting to return to template browse. Instead, they navigate to a completely different page, or the editor closes without saving, or the back button does nothing.

**Why it happens:** The current flow uses modal overlays (`EditorModal`) and slide-in panels (`TemplatePreviewPanel`) which do not push history entries. Browser back button navigates to the previous *page route*, not the previous *UI state*.

**BizScreen-specific risk:**
- `TemplateMarketplacePage` uses `useSearchParams` for filters (verified line 57) but the preview panel is purely component state
- The editor opens via `navigate(\`/scene-editor/${sceneId}\`)` (line 222) which IS a route change, but "Quick Apply" from the grid also navigates (line 222)
- If user entered via deep link to a specific category filter, back should preserve that filter
- The `AnimatePresence` exit animations on preview panel can interfere with navigation timing

**Prevention:**
1. Push browser history entries for significant UI state changes: opening preview panel should add `?preview=templateId` to URL
2. Handle `popstate` event to close modals/panels before navigating
3. Add confirmation dialog when back button is pressed during editor session (already exists via `UnsavedChangesDialog`)
4. Test the complete flow: browse -> filter -> preview -> apply -> edit -> back -> back -> back -- each step should feel natural
5. Consider `react-router-dom`'s `useBlocker` hook for preventing navigation during unsaved editor state

**Phase mapping:** Address in template-to-editor flow implementation

**Confidence:** MEDIUM (common SPA navigation issue, verified from router usage patterns in codebase)

---

## Minor Pitfalls

Mistakes that cause polish issues, small bugs, or minor maintenance burden.

---

### Pitfall 13: Unsplash Image Sizes Not Optimized for Signage Resolutions

**What goes wrong:** Unsplash returns multiple image size URLs (`raw`, `full`, `regular`, `small`, `thumb`). Team uses `regular` (1080px wide) for everything. Template thumbnails use unnecessarily large images (wasting bandwidth), while full-screen signage displays use `regular` which is too small for 4K screens (3840x2160).

**Why it happens:** The Unsplash API returns size variants but choosing the right one for each context requires understanding the display context. BizScreen has multiple contexts: thumbnail grid (200px), preview panel (480px), editor canvas (1920px), and player display (up to 3840px).

**Prevention:**
1. Map Unsplash size variants to BizScreen contexts: `thumb` for grid, `small` for preview, `regular` for editor, `full` for player display
2. Use the `w` query parameter on Unsplash URLs for exact sizing: `&w=400` returns 400px wide image
3. Store the selected size context when user adds image to design, so player can request appropriate resolution
4. Add `srcset` to image elements that use Unsplash photos for responsive display

**Phase mapping:** Address during Unsplash integration implementation

**Confidence:** HIGH (verified from [Unsplash API documentation](https://unsplash.com/documentation))

---

### Pitfall 14: Stock Asset Attribution Lost When Exporting/Publishing Designs

**What goes wrong:** User adds Unsplash photo to a template design. Design is published to signage screens. The attribution ("Photo by X on Unsplash") is stored in the admin metadata but never displayed anywhere. Photographer gets no credit. When Unsplash reviews the integration, they note missing attribution.

**Why it happens:** Attribution is an admin-side concern. Signage screens display content, not metadata. The question of where to show attribution on a digital signage display is genuinely difficult.

**Prevention:**
1. Store attribution metadata on the scene/design level, not just the media asset level
2. Show attribution in the admin UI when viewing/editing designs that contain stock photos
3. For the Unsplash API review: attribution must be visible somewhere the user can see it, but it does NOT need to appear on the signage screen itself
4. Add an "Image Credits" section to the design properties panel in the editor
5. Consider a "Credits" page accessible from the admin that lists all stock photos used across designs

**Phase mapping:** Address during Unsplash integration, before applying for production rate limit

**Confidence:** MEDIUM (Unsplash requires attribution in the application, not necessarily on the end display)

---

### Pitfall 15: Hover Animations Inaccessible and Cause Motion Sickness

**What goes wrong:** Hover-triggered animations (card lift, scale, parallax preview) are inaccessible to keyboard users, touch-only users, and users with vestibular disorders. Adding `prefers-reduced-motion` support is forgotten.

**Why it happens:** Hover interactions are desktop-centric. Touch devices have no hover state. Users with motion sensitivity can experience discomfort from scaling and movement animations.

**Prevention:**
1. All hover effects must have keyboard-accessible equivalents (`:focus-visible` styles)
2. Wrap all framer-motion animations with `prefers-reduced-motion` check:
   ```javascript
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   ```
3. The existing `motion.js` design system should export a `useReducedMotion()` hook that all animation consumers check
4. Touch devices: use `:active` or long-press for hover-equivalent interactions
5. Test with keyboard-only navigation: can a user browse, preview, and apply templates without a mouse?

**Phase mapping:** Include in every animation implementation task

**Confidence:** HIGH (accessibility requirement, not specific to BizScreen)

---

### Pitfall 16: Two Template Systems Create User Confusion

**What goes wrong:** BizScreen has TWO template systems: (1) the original `templateService.js` content templates (playlists, layouts, packs) and (2) the marketplace templates via `marketplaceService.js`. Adding "premium browsing" to one but not the other creates an inconsistent experience. Users encounter different template UI patterns depending on where they entered.

**Why it happens:** Historical evolution -- v2 added marketplace on top of existing content templates. The two systems have different data models, different APIs, and different UIs.

**BizScreen-specific risk:**
- `templateService.js` has `fetchTemplates`, `formatTemplateForCard`, favorites, and history
- `marketplaceService.js` has `fetchMarketplaceTemplates`, `installTemplateAsScene`, separate favorites
- Two different card components, two different preview panels, two different "apply" flows
- User sees different UX in "Content Templates" vs "Template Marketplace"

**Prevention:**
1. v3.0 should consolidate or clearly differentiate the two systems -- do not add premium browsing to just one
2. If consolidating: migrate content templates into marketplace, deprecate `templateService.js`
3. If differentiating: make the visual and navigational distinction clear (e.g., "My Templates" vs "Marketplace")
4. Never show the same template appearing in both systems with different thumbnails or metadata
5. Share UI components between systems: one `TemplateCard`, one `TemplatePreviewPanel`

**Phase mapping:** Architectural decision needed before implementing premium browsing UI

**Confidence:** HIGH (verified from coexistence of `templateService.js` and `marketplaceService.js`)

---

### Pitfall 17: CORS Errors When Loading Unsplash Images in Polotno Canvas

**What goes wrong:** Unsplash images display fine in the stock photo browser panel but fail when dragged onto the Polotno canvas. The canvas shows a broken image icon or throws a CORS error, because HTML Canvas has different CORS requirements than `<img>` tags.

**Why it happens:** HTML5 Canvas becomes "tainted" when a cross-origin image is drawn without proper CORS headers. Tainted canvases cannot be exported (no `toDataURL`), which breaks Polotno's save and export functionality. Unsplash images are served from `images.unsplash.com` which is cross-origin relative to BizScreen.

**BizScreen-specific risk:** Polotno's documentation explicitly warns: "Configure servers and image tags to avoid CORS errors when loading images into Polotno." The current Polotno build runs inside an iframe at the same origin, but images from `images.unsplash.com` are cross-origin.

**Prevention:**
1. Unsplash CDN images typically include `Access-Control-Allow-Origin: *` header -- verify this is the case
2. When adding images to Polotno canvas, ensure `crossOrigin: 'anonymous'` is set on image elements
3. If CORS issues persist, proxy Unsplash images through your own backend (Supabase Edge Function) which adds proper CORS headers
4. Test the complete flow: search -> select -> canvas -> save -> export PNG -- CORS errors typically surface at the export step, not the display step
5. Polotno's `getImageSize()` utility handles CORS -- use it instead of manual image loading

**Phase mapping:** Test early in stock asset integration sprint

**Confidence:** MEDIUM (Unsplash CDN generally supports CORS, but edge cases exist per [GitHub issue #47](https://github.com/unsplash/unsplash-js/issues/47))

---

## Phase-Specific Warnings

Based on pitfall analysis, these are the critical warnings mapped to likely v3.0 phase structure:

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Architecture/planning | P1: Iframe boundary blocks stock panels | CRITICAL | Must modify Polotno iframe build for stock panels |
| Architecture/planning | P3: Hotlinking vs offline conflict | CRITICAL | Go/no-go decision on Unsplash vs Pexels |
| Architecture/planning | P16: Two template systems | MODERATE | Consolidate or clearly differentiate |
| Unsplash integration | P2: API compliance violations | CRITICAL | Implement all 4 requirements from day one |
| Unsplash integration | P6: unsplash-js is archived | MODERATE | Use raw fetch, not the wrapper |
| Unsplash integration | P7: Rate limiting in demo mode | MODERATE | Apply for production early, cache aggressively |
| Template browse polish | P4: Animation performance | CRITICAL | CSS transitions for cards, framer-motion only for panels |
| Template browse polish | P5: Thumbnail grid performance | CRITICAL | Use OptimizedImage, add lazy loading |
| Template browse polish | P11: UX overwhelm | MODERATE | Progressive disclosure, smart defaults |
| Template-to-editor flow | P8: Template loads as flat image | MODERATE | Pass design_json not thumbnail |
| Template-to-editor flow | P12: Back navigation breaks | MODERATE | Push history entries for UI state |
| Editor stock assets | P10: Icon library bundle bloat | MODERATE | API-served metadata, on-demand SVG |
| Editor stock assets | P17: Canvas CORS errors | MODERATE | Verify Unsplash CORS, proxy if needed |
| UI polish/animations | P9: AnimatePresence memory leaks | MODERATE | Profile, fallback to CSS transitions |
| UI polish/animations | P15: Accessibility of hover animations | MINOR | prefers-reduced-motion, keyboard equivalents |
| Publishing/player | P14: Attribution metadata lost | MINOR | Store on design level, show in admin |
| Publishing/player | P13: Wrong image sizes for contexts | MINOR | Map Unsplash variants to display contexts |

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Polotno iframe integration | HIGH | Verified from source code analysis of PolotnoEditor.jsx, polotno-editor.jsx, EditorModal.jsx, and Polotno documentation |
| Unsplash API compliance | HIGH | Verified from official Unsplash API guidelines, terms of service, and attribution documentation |
| Animation performance | HIGH | Verified from framer-motion documentation, motion.js design system, and TemplateGrid source code |
| Template browse UX | MEDIUM | Based on digital signage industry research and UX principles; specific user behavior needs A/B testing |
| Offline/hotlinking conflict | MEDIUM | Unsplash terms are ambiguous about offline caching; direct clarification from Unsplash needed |
| Memory leak risk | MEDIUM | Known framer-motion issue but may not affect BizScreen's specific usage pattern |

## Sources

### Unsplash API
- [Unsplash Attribution Guidelines](https://help.unsplash.com/en/articles/2511315-guideline-attribution) -- mandatory attribution format with UTM params
- [Unsplash Hotlinking Guidelines](https://help.unsplash.com/en/articles/2511271-guideline-hotlinking-images) -- must use their CDN URLs
- [Unsplash Download Trigger Guidelines](https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download) -- must hit download_location endpoint
- [Unsplash API Terms](https://unsplash.com/api-terms) -- legal requirements, hotlinking as material term
- [Unsplash API Documentation](https://unsplash.com/documentation) -- rate limits, endpoints, response format
- [Unsplash Rate Limit Help](https://help.unsplash.com/en/articles/3887917-when-should-i-apply-for-a-higher-rate-limit) -- 50/hr demo, 5000/hr production
- [unsplash-js GitHub (archived)](https://github.com/unsplash/unsplash-js) -- archived January 2026, no longer maintained
- [Unsplash CORS Issue #47](https://github.com/unsplash/unsplash-js/issues/47) -- historical CORS problems

### Polotno SDK
- [Polotno Custom Images Panel](https://polotno.com/docs/custom-images-panel) -- custom side panel API with ImagesGrid
- [Polotno Side Panel Overview](https://polotno.com/docs/side-panel-overview) -- sections array customization
- [Polotno Customizations](https://polotno.com/docs/customizations) -- what can/cannot be customized
- [Polotno Pexels Integration](https://polotno.com/docs/pexels-photos) -- stock photo panel example

### Animation Performance
- [Motion Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list) -- layout thrashing prevention
- [Motion frame API](https://motion.dev/docs/frame) -- batching reads/writes to prevent thrashing
- [Framer Motion Performance Tips](https://tillitsdone.com/blogs/framer-motion-performance-tips/) -- transform vs layout property animation
- [Framer Motion AnimatePresence Memory Leak #625](https://github.com/framer/motion/issues/625) -- known unmount issue
- [Framer Motion layoutId Unmount Bug #2172](https://github.com/framer/motion/issues/2172) -- layoutId + AnimatePresence failure

### Image Performance
- [Lazy Loading Images in React](https://medium.com/@albertjuhe/an-easy-to-use-performant-solution-to-lazy-load-images-in-react-e6752071020c) -- intersection observer patterns
- [500+ Images Gallery with Lazy Loading](https://www.buildwithmatija.com/blog/handling-500-images-in-a-gallery-with-lazy-loading-in-next-js-15) -- virtualization for large grids

### Digital Signage UX
- [Digital Signage Content Best Practices](https://kiosk.com/8-best-practices-for-digital-signage-content-a-guide-for-high-impact-kiosks/) -- 3-second rule, content overcrowding
- [Common Digital Signage Mistakes](https://www.digitalsignagetrends.com/post/digital-signage-common-mistakes) -- overwhelming users with choices
- [Maximizing Digital Signage UX](https://www.metroclick.com/digital-signage/software/maximizing-your-digital-signage-softwares-user-experience/) -- progressive disclosure patterns
