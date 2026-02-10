# Features Research: BizScreen v2

**Domain:** Digital Signage Platform Enhancement
**Researched:** 2026-01-24
**Focus:** Templates Marketplace, Multi-Language Content, Advanced Scheduling

## Summary

Research into digital signage platform features reveals clear patterns for the three target v2 capabilities:

1. **Templates Marketplace**: Industry standard is platform-provided templates (not user commerce). Platforms like Yodeck offer 400+ templates organized by category/industry. The key differentiator is one-click apply + customization workflow. User-generated template marketplaces (like Canva's creator economy) require significant moderation infrastructure.

2. **Multi-Language Content**: Expected behavior is per-device language assignment with content variants. Standard approach uses a centralized CMS with language variants stored together, then device-level selection determines which variant plays. Cultural adaptation beyond translation is increasingly expected.

3. **Advanced Scheduling**: Industry features dayparting, priority-based override (emergency content), date ranges, and campaign grouping. Priority scheduling is critical for emergency alerts (can override in <3 seconds). Conflict detection with visual preview is table stakes.

**Key insight for BizScreen**: The existing "save layout as template" feature and schedule system provide foundation. v2 should focus on:
- Template discovery and import (not commerce)
- Content language variants (not UI translation which exists)
- Campaign grouping and priority override

---

## Templates Marketplace Features

### Table Stakes
Features users expect in any template marketplace implementation.

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Category browsing | Templates organized by industry (restaurant, retail, salon, etc.) | LOW | Existing `template_categories` table supports this |
| Search functionality | Text search by name/description | LOW | Already implemented in `templateService.js` |
| Template preview | Visual preview before applying | LOW | `thumbnail_url` exists, need modal preview |
| One-click apply | Apply template creates usable content immediately | MEDIUM | `applyTemplate` RPC exists, verify scene/layout creation |
| Featured templates | Curated selection on homepage | LOW | Already have `is_featured` in `template_library` |
| Orientation filter | Landscape vs portrait filtering | LOW | `meta.orientation` exists in current schema |
| Recently used | Quick access to templates user has applied before | LOW | `user_template_history` table exists |
| Favorites | User can bookmark templates for later | LOW | `user_template_favorites` table exists |

### Differentiators
Features that set BizScreen apart from competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Starter packs | Pre-configured scene+layout+schedule bundles for quick onboarding | MEDIUM | `apply_pack_template` RPC exists, needs UX refinement |
| Canva integration | Edit templates with Canva, sync changes to BizScreen | HIGH | Yodeck offers this; requires Canva Connect API |
| Template customization wizard | Guided replacement of placeholder content (logo, colors, text) | MEDIUM | Improve on raw editor for non-designers |
| Smart template suggestions | Recommend templates based on user's industry/usage | MEDIUM | Leverage `business_type` from onboarding |
| Template rating/reviews | Community feedback on template quality | LOW | Simple star rating + review text |
| Usage analytics | Show which templates perform best (view duration) | MEDIUM | Connect to existing analytics infrastructure |

### Anti-Features
Features to explicitly NOT build.

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| User template marketplace (buy/sell) | Requires complex moderation, payment processing, copyright enforcement, and ongoing curation. Canva has 220M users to make creator economy viable. | Platform-curated templates only; allow users to share templates within their organization |
| AI-generated templates | Generative AI for templates is emerging trend but adds complexity, unpredictable results, and support burden | Manual curation of professionally designed templates |
| Real-time template collaboration | Multi-user editing adds significant complexity | Sequential editing with version history |
| Custom template pricing tiers | Monetizing individual templates creates support burden | Simpler plan-based access (free/pro/enterprise on templates) |

---

## Multi-Language Content Features

### Table Stakes
Features users expect for multi-language digital signage.

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Content language variants | Same scene/playlist with multiple language versions | MEDIUM | Need `language_code` field on content, or separate language_variants table |
| Per-device language assignment | Device plays content in assigned language | LOW | Add `language_code` to `tv_devices` table |
| Language fallback | If variant missing, show default language | LOW | Logic in player content resolution |
| CMS language selector | Easy toggle between language versions when editing | MEDIUM | UI component for scene/playlist editor |
| Language indicator | Visual badge showing which languages have content | LOW | UI badge on content cards |
| Bulk language management | View all content needing translation in one place | MEDIUM | Dashboard for translation status |

### Differentiators
Features that provide competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Screen group language assignment | Assign language to group, all devices inherit | LOW | Leverage existing `screen_groups` table |
| Location-based language | Auto-assign language based on device location | MEDIUM | Map locations to default languages |
| Playlist per-language scheduling | Different playlists for different languages on same schedule | MEDIUM | Alternative to content variants approach |
| Translation workflow | Track draft/review/approved status per language | MEDIUM | Similar to existing content approval workflow |
| AI translation suggestions | Machine translation as starting point | MEDIUM | Integration with translation API (DeepL, Google) |
| Dynamic text localization | Text elements with per-language values | HIGH | Requires Polotno editor modifications |

### Anti-Features
Features to explicitly NOT build.

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Real-time translation display | On-screen language switching is viewer-confusing and technically complex | Static language assignment per device |
| Automatic content translation | AI translation without human review creates quality/liability issues | Translation suggestions with required human approval |
| Character-based languages (CJK) | Significant font/rendering complexity, requires special testing | Focus on LTR Latin alphabet languages initially (already have: en, es, pt, it, fr, de) |
| RTL language support | Hebrew, Arabic require complete UI/content mirroring | Defer to future version; current i18n config notes direction but no RTL locales |

---

## Advanced Scheduling Features

### Table Stakes
Features users expect in advanced scheduling systems.

| Feature | Description | Complexity | Notes |
|---------|-------------|------------|-------|
| Date range scheduling | Content plays only between start/end dates | LOW | `start_date`/`end_date` already in `schedule_entries` |
| Priority levels | Higher priority content overrides lower | LOW | `priority` field exists, verify player respects it |
| Conflict detection | Warn when entries overlap | LOW | `check_schedule_entry_conflicts` RPC exists |
| Week preview | Visual 7-day view of schedule | LOW | `getWeekPreview` function exists |
| Campaign grouping | Group related schedule entries as campaign | MEDIUM | New `campaigns` table or add campaign_id to entries |
| Emergency override | Instant content push that overrides all schedules | MEDIUM | Max priority entry + push notification to players |
| Dayparting presets | Quick-select breakfast/lunch/dinner time slots | LOW | Predefined time templates in UI |

### Differentiators
Features that provide competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Campaign analytics | Performance metrics grouped by campaign | MEDIUM | Extend existing analytics to campaign level |
| Content rotation rules | Percentage-based content mix within time slot | MEDIUM | Multiple entries same slot with rotation logic |
| Frequency limits | Play content max N times per hour/day | LOW | Xibo has this; add to `schedule_entries` |
| Conditional triggers | Play based on external data (weather, inventory) | HIGH | Already have data feeds infrastructure |
| Campaign templates | Save campaign configuration for reuse | LOW | Serialize campaign as JSON template |
| Seasonal campaigns | Auto-activate campaigns by season/holiday | LOW | Pre-set date ranges with optional yearly recurrence |
| Multi-zone scheduling | Different content per zone within layout, per time | HIGH | Extends layout zone concept into scheduling |

### Anti-Features
Features to explicitly NOT build.

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Per-viewer personalization | Face detection, demographic targeting is privacy nightmare and technically complex | Time-based dayparting achieves similar goals |
| Programmatic advertising integration | Complex ad-tech ecosystem, billing, reporting | Focus on owned content scheduling |
| AI content optimization | Auto-scheduling based on predicted performance adds unpredictability | Manual scheduling with performance reports |
| Complex recurrence rules (RFC 5545) | iCal-level recurrence is over-engineered for signage | Simple daily/weekly/yearly repeat options |

---

## Feature Dependencies

How new v2 features depend on existing BizScreen capabilities.

### Templates Marketplace Dependencies

| New Feature | Depends On | Status |
|-------------|------------|--------|
| Category browsing | `template_categories` table | EXISTS |
| Template preview | `thumbnail_url` on templates | EXISTS |
| One-click apply | `applyTemplate` RPC, scene/layout creation | EXISTS |
| Favorites | `user_template_favorites` table | EXISTS |
| Recently used | `user_template_history` table | EXISTS |
| Starter packs | `apply_pack_template` RPC | EXISTS |
| Template search | `fetchTemplates` with search param | EXISTS |

**Gap:** Template customization wizard needs new UI component.

### Multi-Language Content Dependencies

| New Feature | Depends On | Status |
|-------------|------------|--------|
| Admin UI translation | i18n context with locale files | EXISTS (6 locales configured) |
| Content variants | `language_code` field on content | NEEDS MIGRATION |
| Per-device language | `language_code` on `tv_devices` | NEEDS MIGRATION |
| Language fallback | Player content resolution logic | NEEDS PLAYER UPDATE |
| CMS language selector | Scene/playlist editor UI | NEEDS UI COMPONENT |

**Gap:** Need database schema for language variants and player logic update.

### Advanced Scheduling Dependencies

| New Feature | Depends On | Status |
|-------------|------------|--------|
| Date range scheduling | `start_date`/`end_date` fields | EXISTS |
| Priority levels | `priority` field | EXISTS |
| Conflict detection | `check_schedule_entry_conflicts` RPC | EXISTS |
| Week preview | `getWeekPreview` function | EXISTS |
| Filler content | `filler_content_type/id` fields | EXISTS |
| Device assignment | `assigned_schedule_id` on devices | EXISTS |

**Gap:** Campaign grouping needs new table or field; emergency override needs push mechanism.

---

## MVP Recommendation

For v2 MVP, prioritize:

### Templates Marketplace
1. **Improved browse UI** with category filtering and search (table stakes)
2. **Template preview modal** with full-size image and details (table stakes)
3. **Starter packs UX** on onboarding flow (differentiator, partially exists)
4. Template customization wizard (differentiator)

### Multi-Language Content
1. **Per-device language assignment** (table stakes, lowest complexity)
2. **Content language variants** with simple variant picker (table stakes)
3. **Language fallback** logic in player (table stakes)
4. Translation status dashboard (differentiator)

### Advanced Scheduling
1. **Campaign grouping** to organize related entries (table stakes for "advanced" label)
2. **Emergency override** capability (table stakes for enterprise)
3. **Frequency limits** per schedule entry (differentiator, low complexity)
4. Campaign analytics view (differentiator)

### Defer to Post-v2
- Canva integration (high complexity)
- AI translation suggestions (medium complexity, quality concerns)
- Conditional triggers (high complexity)
- Multi-zone scheduling (high complexity)
- User template marketplace (not aligned with platform model)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Templates table stakes | HIGH | Well-documented by multiple platforms (Yodeck, ScreenCloud, OptiSigns) |
| Templates differentiators | MEDIUM | Canva integration common but integration complexity uncertain |
| Multi-language table stakes | HIGH | Standard approach documented across platforms |
| Multi-language differentiators | MEDIUM | AI translation accuracy and integration effort unclear |
| Scheduling table stakes | HIGH | Xibo documentation provides clear priority/dayparting patterns |
| Scheduling differentiators | MEDIUM | Conditional triggers complexity depends on data feed maturity |
| Existing code foundation | HIGH | Direct code inspection confirms feature presence |
| Player impact | MEDIUM | Player changes needed for language support not fully scoped |

---

## Sources

### Templates Marketplace
- [Yodeck Digital Signage](https://www.yodeck.com/) - 400+ templates, Canva integration
- [ScreenCloud vs Yodeck](https://www.yodeck.com/news/yodeck-vs-screencloud/) - Template library comparison
- [OptiSigns Templates](https://www.optisigns.com/templates) - Template organization patterns
- [Canva Creators Program](https://www.canva.com/creators/) - Creator economy model (for reference)
- [Play Digital Signage Templates](https://playsignage.com/blog/free-digital-signage-templates/) - Category organization

### Multi-Language Content
- [ScreenCloud Multilingual](https://screencloud.com/digital-signage/multilingual) - Language assignment patterns
- [Fugo Wiki: Localized Multi-Language Support](https://www.fugo.ai/wiki/localized-multi-language-support/) - Cultural adaptation
- [NowSignage Multi-Language CMS](https://www.nowsignage.com/2022/05/nowsignage-launches-multi-language-cms/) - CMS approach
- [MetroClick Multi-Language Implementation](https://www.metroclick.com/digital-signage/software/implementing-multi-language-support-in-digital-signage-software/) - Technical considerations
- [PosterBooking Multilingual Setup](https://www.posterbooking.com/signage/how-to-guides/set-up-multilingual-support-on-digital-signage/) - Playlist-per-language approach

### Advanced Scheduling
- [Xibo Priority and Display Order](https://account.xibosignage.com/manual/en/scheduling_priority_display_order) - Priority scheduling documentation
- [NowSignage Content Scheduling](https://www.nowsignage.com/2024/07/content-scheduling) - Campaign scheduling
- [Digital Signage Today: Dayparting](https://www.digitalsignagetoday.com/blogs/keys-to-dayparting-and-digital-signage/) - Dayparting best practices
- [PiSignage Emergency Playlist](https://blog.pisignage.com/emergency-playlist-feature/) - Emergency override patterns
- [AIScreen Scheduled Content](https://www.aiscreen.io/digital-signage/scheduled-content/) - Date range scheduling

### Approval Workflows (for template moderation reference)
- [Courier Template Approval Workflow](https://www.courier.com/docs/platform/content/template-approval-workflow/) - Webhook-based approval
- [Adobe Express Template Approval](https://helpx.adobe.com/express/web/share-and-publish/share-and-collaborate/set-template-approval.html) - Review workflows

---

## v3.0 Features: Premium Template Browsing, Editor Polish, Stock Assets

**Domain:** Digital Signage Platform -- Premium Creative Experience
**Researched:** 2026-02-10
**Focus:** Animated template gallery, in-editor stock photos/icons, editor polish and micro-interactions

### Summary

v3.0 focuses on the "premium feel" -- making BizScreen's template browsing and editor experience competitive with Yodeck and OptiSigns. The key insight from stack research is that BizScreen already has all the infrastructure needed (Framer Motion, Lucide, Polotno SDK, canvas-confetti) but underutilizes it. The template grid uses zero Framer Motion despite `motion.js` having 15+ animation presets. The upgrade is about **better utilization of existing tools**, not new capabilities.

---

### Table Stakes

Features users expect in a premium template browsing + editor experience.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Animated template card entrance | Competitors show cards with stagger fade-in; static grids feel dated | LOW | Framer Motion staggerChildren + motion.js presets |
| Card hover micro-interactions | Lift, shadow, scale on hover is standard in modern galleries | LOW | Framer Motion whileHover + whileTap |
| Smooth preview panel transitions | Slide-in panel for template details is expected UX pattern | LOW | Already implemented with `drawer` preset in TemplatePreviewPanel |
| Image lazy loading | Off-screen images should not load until near viewport | LOW | Native `loading="lazy"` already in OptimizedImage; add `useInView` for animation trigger |
| Stock photo search in editor | Canva, Yodeck, OptiSigns all offer in-editor stock photos | MEDIUM | Polotno custom side panel with Unsplash API |
| Loading state polish | Skeleton screens or blur-to-sharp image reveal vs. bare spinners | LOW | Framer Motion `imageReveal` preset + Tailwind skeleton |
| Save success feedback | Visual confirmation beyond a plain toast | LOW | canvas-confetti (already installed) + animated checkmark |

### Differentiators

Features that set BizScreen apart from Yodeck/OptiSigns.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Shared element transition (card to editor) | Template thumbnail morphs into editor loading screen -- feels native, not web | MEDIUM | Framer Motion `layoutId` on TemplateCard + EditorModal |
| In-editor icon library | Drop-in Lucide icons directly onto design canvas -- competitors lack this | MEDIUM | Polotno custom side panel + icon manifest generated from Lucide at build time |
| Scroll-triggered section animations | Featured templates, starter packs animate in on scroll -- premium feel | LOW | Framer Motion `useInView` + `scrollReveal` preset |
| Dual stock photo sources | Both Pexels (Polotno built-in) AND Unsplash -- wider selection than competitors | MEDIUM | Custom Unsplash side panel alongside Polotno's default photos section |
| Template usage badges | "Used 5x" badge shows social proof and helps users find their go-to templates | LOW | Already in TemplateCard (`usageCount` prop); currently data-backed via `user_template_history` |
| Animated "Quick Apply" button | Pulse/glow effect draws attention to primary action on hover | LOW | Tailwind `animate-pulse` or Framer Motion `scaleTap` |
| Confetti on first template apply | Celebration effect on first-time use drives engagement and delight | LOW | canvas-confetti already installed; track first-use in localStorage |

### Anti-Features

Features to explicitly NOT build for v3.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Lottie/animated loading spinners | Adds animation file management burden, Lottie runtime is 60KB+ | Tailwind `animate-spin` + Framer Motion `fadeInScale` is sufficient |
| Masonry layout for template grid | Adds complexity; template cards are uniform aspect ratio (16:9) | Tailwind grid with `aspect-video` -- consistent, predictable |
| Virtual scrolling for template grid | Template grids are paginated (20-50 items); virtual scroll adds complexity | Native `loading="lazy"` handles off-screen images; revisit if grid exceeds 500 items |
| AI-powered template recommendations | Recommendation engine adds ML infrastructure complexity | Use simple rules: "popular in your industry", "recently featured" -- already have `business_type` from onboarding |
| Custom animation builder in editor | Allowing users to define keyframe animations is massively complex | Polotno has built-in animation presets (setAnimationsEnabled); use those |
| Re-hosting Unsplash images | Violates Unsplash TOS; they require hotlinking to their URLs | Store Unsplash URLs directly in design JSON; only download to media library on explicit user action |
| Icon upload feature | Users uploading custom SVG icons creates validation/security burden | Curated Lucide icon set (1500+ icons) covers signage needs |
| Real-time collaborative editing | Multi-user editing in Polotno iframe is architecturally impossible | Sequential editing with save/load |

---

### Feature Dependencies (v3.0)

```
Template Card Animations --> motion.js presets (exists) + TemplateGrid.jsx refactor
    |
Template Preview Transitions --> TemplatePreviewPanel.jsx (already uses drawer preset)
    |
Shared Element Transition --> layoutId on TemplateCard + EditorModal (new wiring)
    |
Scroll-Triggered Sections --> useInView from framer-motion (already bundled)
    |
Stock Photo Panel --> Unsplash API key (new) + Polotno custom section (new)
    |                  + polotno-editor.jsx rebuild
    |
Icon Panel in Editor --> Build-time icon manifest (new) + Polotno custom section (new)
    |                    + polotno-editor.jsx rebuild (same rebuild as stock photos)
    |
Image Optimization --> OptimizedImage.jsx enhancement + CloudFront URL params
    |
Save Celebration --> canvas-confetti (already installed) + PostSaveDialog.jsx enhancement
```

**Critical dependency:** Both the Stock Photo Panel and Icon Panel require a Polotno iframe rebuild. These should ship together in a single rebuild to avoid double effort.

---

### MVP Recommendation (v3.0)

**Prioritize (immediate high impact):**

1. **Template card animations** -- Highest visible impact for lowest effort. Wrap existing `TemplateGrid` and `TemplateCard` in Framer Motion `motion.div` with stagger, cardLift, and imageReveal presets from motion.js. Goes from "static HTML grid" to "premium animated gallery" in a few hours of work.

2. **Stock photo panel in Polotno editor** -- Users currently leave BizScreen to find stock photos. Adding Unsplash inside the editor keeps them in-flow. Uses Polotno's built-in `ImagesGrid` + `SectionTab` API, so the panel is mostly configuration, not custom rendering.

3. **Save celebration with confetti** -- Canvas-confetti is already installed and unused. Firing it on PostSaveDialog open is a one-line integration that creates memorable delight.

4. **Shared element transition (card to editor)** -- The "wow" factor. Template thumbnail morphs into editor modal loading state using Framer Motion `layoutId`. Medium complexity but high perceived polish.

**Defer (v3.1 or later):**

- **In-editor icon library** -- Valuable but requires build script for manifest + custom panel. Ship stock photos first, add icons in follow-up.
- **Scroll-triggered section animations** -- Nice-to-have; the featured templates row and starter packs row can get `scrollReveal` treatment, but it is polish on top of polish.
- **CloudFront image resizing** -- May require Lambda@Edge configuration. Current image sizes are adequate; optimize when performance data demands it.

---

### Confidence Assessment (v3.0 Features)

| Area | Confidence | Reason |
|------|------------|--------|
| Template card animations | HIGH | Framer Motion presets verified in codebase; TemplateGrid.jsx reviewed and confirmed zero animation usage |
| Stock photo integration | HIGH | Unsplash API docs verified; Polotno custom panel API verified; unsplash-js confirmed archived |
| Icon panel feasibility | HIGH | Lucide SVG output confirmed across 238 files; Polotno SVG element support verified |
| Shared element transition | MEDIUM | layoutId API documented in Framer Motion; cross-component animation may need testing with Modal overlay |
| Save celebration | HIGH | canvas-confetti already in package.json; PostSaveDialog exists as integration point |
| Competitor comparison | MEDIUM | Based on WebSearch-verified competitor feature sets; some features may have changed |

---

### Sources (v3.0 Features)

- [Yodeck Template Gallery](https://www.yodeck.com/features/free-digital-signage-templates/) -- Competitor feature analysis
- [OptiSigns Template Library](https://www.optisigns.com/templates) -- Competitor template browsing UX
- [Unsplash API Documentation](https://unsplash.com/documentation) -- Stock photo integration requirements
- [Polotno Custom Images Panel](https://polotno.com/docs/custom-images-panel) -- ImagesGrid, SectionTab API
- [Framer Motion Layout Animations](https://www.framer.com/motion/layout-animations/) -- layoutId for shared element transitions
- [Motion useInView](https://motion.dev/docs/react-use-in-view) -- Scroll-triggered animation hook
- Existing codebase analysis: `TemplateGrid.jsx`, `TemplateCard`, `EditorModal.jsx`, `TemplatePreviewPanel.jsx`, `motion.js`, `OptimizedImage.jsx`, `PostSaveDialog.jsx`
