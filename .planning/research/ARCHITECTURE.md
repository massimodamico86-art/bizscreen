# Architecture: v3.0 Creative Experience

**Domain:** Premium template browsing, stock asset integration, editor polish for digital signage
**Researched:** 2026-02-10
**Overall Confidence:** HIGH (existing codebase fully analyzed, external APIs verified via official docs)

---

## Executive Summary

The v3.0 Creative Experience milestone requires integrating three major feature areas into BizScreen's existing React 19 + Supabase + Polotno architecture: (1) consolidating the two separate template systems into a unified premium browsing experience, (2) adding stock asset integration via Unsplash API with a server-side proxy, and (3) polishing the editor with animations and a streamlined template-to-editor flow.

The primary architectural challenge is that the current system has **two parallel template systems** with different data models, services, and UI flows -- `templateService.js` + `TemplatesPage.jsx` (content_templates table) and `marketplaceService.js` + `TemplateMarketplacePage.jsx` (template_library table). These need to converge. The secondary challenge is the **Polotno iframe isolation**: the editor runs in a separate React 18 iframe communicating via postMessage, meaning stock asset integration and animation features must be coordinated across the iframe boundary.

---

## Current Architecture Analysis

### Two Template Systems: The Core Problem

**System 1: Template Library** (`templateService.js` + `TemplatesPage.jsx`)
- **Table:** `content_templates` with `content_template_blueprints`
- **Types:** playlist, layout, pack
- **Apply flow:** `applyTemplate()` / `applyPack()` via Supabase RPC --> creates playlists/layouts/schedules
- **UI flow:** Browse --> Click "Use Template" --> `TemplateCustomizeModal` (rename) --> Apply --> `SuccessModal` (shows created items) --> Navigate to playlist/layout
- **Features:** Favorites (`user_template_favorites`), history (`user_template_history`), search, category tabs, type filters, pagination
- **Scope:** Creates operational signage infrastructure (playlists, layouts, schedules)

**System 2: Template Marketplace** (`marketplaceService.js` + `TemplateMarketplacePage.jsx`)
- **Table:** `template_library` with `template_library_slides`
- **Types:** scene, slide, block (license tiers: free/pro/enterprise)
- **Apply flow:** `installTemplateAsScene()` via `clone_template_to_scene` RPC --> creates a scene
- **UI flow:** Browse --> Click --> `TemplatePreviewPanel` (side panel) --> "Quick Apply" --> `TemplateCustomizationWizard` (if customizable: logo/color/texts) --> Navigate to `/scene-editor/{sceneId}`
- **Features:** Sidebar with recents/favorites/suggestions, featured row, starter packs, ratings, usage counts, enterprise access
- **Scope:** Creates editable scene content with slide-based design

**Assessment:** These systems serve fundamentally different purposes. System 1 creates *infrastructure* (playlists + layouts + schedules). System 2 creates *visual content* (scenes with design JSON). The v3.0 "premium browsing" should enhance System 2 (marketplace) as the primary creative experience, while keeping System 1 available for operational setup. Do NOT merge the data models. Instead, unify the browsing UX.

### Polotno Editor Architecture

The Polotno editor is isolated in an iframe at `/polotno/index.html`:

```
Main App (React 19)
  |
  +-- EditorModal.jsx (full-screen modal wrapper)
       |
       +-- PolotnoEditor.jsx (iframe host, postMessage bridge)
            |
            +-- /polotno/index.html (React 18 iframe)
                 |
                 +-- polotno-editor.js (bundled Polotno SDK)
```

**Communication protocol:** Parent sends `{ target: 'polotno-editor', action, payload }`, iframe sends `{ source: 'polotno-editor', type, data }`.

**Existing message types:**
- Parent --> Iframe: `loadDesign`, `loadTemplate`, `exportImage`, `getDesign`, `setTemplates`, `triggerSave`
- Iframe --> Parent: `ready`, `save`, `close`, `error`, `requestTemplates`, `designChanged`, `imageExported`

**Key constraint:** The Polotno iframe is a pre-built bundle (`polotno-editor.js` at 1.6MB). Adding features like stock image panels or animation controls requires rebuilding this bundle. The iframe approach exists to isolate React 18 (Polotno's requirement) from the main app's React 19.

### Scene Editor (Non-Polotno)

`SceneEditorPage.jsx` is a **separate, native React editor** (not Polotno-based) for the scene slide system. It has:
- Slide strip (left), Canvas (center), Properties panel (right), AI panel
- Block operations: text, image, shape, widget
- Auto-save with 800ms debounce
- Brand theme integration
- Undo/redo history
- Live preview with device sync

This editor is where marketplace templates land after "Quick Apply". It operates on `scene_slides.design_json`, not Polotno JSON format.

---

## Recommended Architecture

### Component 1: Unified Template Browser

**Strategy:** Create a new unified browsing page that merges the best UX from both systems, backed by a single composite data layer. Do NOT merge the database tables.

**New/Modified Files:**

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/CreativeHubPage.jsx` | NEW | Unified browse page replacing both TemplatesPage and TemplateMarketplacePage as the primary creative entry point |
| `src/services/creativeHubService.js` | NEW | Composite service that queries both template systems and merges results into a unified response |
| `src/components/templates/PremiumTemplateCard.jsx` | NEW | Enhanced card with hover preview, instant-apply button, license badge, rating |
| `src/components/templates/TemplateDetailDrawer.jsx` | NEW | Right-side drawer replacing both TemplateCustomizeModal and TemplatePreviewPanel |
| `src/components/templates/CategoryHeroSection.jsx` | NEW | Featured category banners with hero imagery |
| `src/pages/TemplatesPage.jsx` | MODIFY | Add redirect/link to CreativeHubPage, keep for backwards compat |
| `src/pages/TemplateMarketplacePage.jsx` | MODIFY | Add redirect/link to CreativeHubPage, keep for backwards compat |

**Data Flow:**

```
CreativeHubPage
  |
  +-- creativeHubService.fetchUnifiedTemplates(filters)
  |     |
  |     +-- marketplaceService.fetchMarketplaceTemplates()  // Scene templates
  |     +-- templateService.fetchTemplates()                 // Pack/playlist/layout templates
  |     +-- Merge, normalize, rank results
  |
  +-- PremiumTemplateCard (renders both types uniformly)
  |     |
  |     +-- Marketplace template: shows slides preview, license tier, rating
  |     +-- Library template: shows type badge, category, pack contents
  |
  +-- TemplateDetailDrawer (slide-out detail view)
        |
        +-- For scene templates: Live preview, customization, "Edit Now" --> SceneEditorPage
        +-- For pack templates: Contents list, customization, "Apply Pack" --> SuccessModal
```

**Why a composite service instead of a unified table:** The data models are genuinely different. `content_templates` stores blueprint references for creating infrastructure, while `template_library` stores design JSON for visual content. Merging them would create a bloated table with half-null columns. A composite frontend service is cheaper and more maintainable.

### Component 2: Unsplash API Proxy

**Strategy:** Supabase Edge Function that proxies Unsplash API requests. The proxy holds the API key server-side, adds caching, and enforces per-tenant rate limits.

**Architecture:**

```
Browser (React)
  |
  +-- stockAssetService.js
       |
       +-- POST /functions/v1/unsplash-proxy
            |
            +-- Supabase Edge Function (Deno)
                 |
                 +-- Rate limit check (per tenant, stored in Supabase table)
                 +-- Cache check (search results cached 24h in Supabase table)
                 +-- Unsplash API (api.unsplash.com)
                 +-- Cache write
                 +-- Return results
```

**New/Modified Files:**

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/unsplash-proxy/index.ts` | NEW | Edge Function: authenticates user, rate limits, proxies to Unsplash |
| `src/services/stockAssetService.js` | NEW | Frontend service: search, download tracking, attribution helpers |
| `src/components/media/StockImagePicker.jsx` | NEW | Reusable picker UI: search, grid, attribution footer |
| `src/components/media/UnsplashAttribution.jsx` | NEW | "Photo by X on Unsplash" attribution component (required by Unsplash TOS) |
| `supabase/migrations/142_stock_asset_cache.sql` | NEW | Cache table + rate limit tracking table |

**Unsplash API Details (verified from official docs):**

| Concern | Value |
|---------|-------|
| Demo rate limit | 50 requests/hour (during development) |
| Production rate limit | 5,000 requests/hour (after approval) |
| Image hotlinking | **Required** -- must use Unsplash URLs directly, preserve `ixid` param |
| Attribution | **Required** -- "Photo by {name} on Unsplash" with links |
| Download tracking | **Required** -- must trigger download endpoint when image is used |
| Image file requests | NOT rate-limited (only JSON API calls count) |

**Edge Function Design:**

```typescript
// supabase/functions/unsplash-proxy/index.ts
import { createClient } from '@supabase/supabase-js';

const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_HOUR = 100; // per tenant

Deno.serve(async (req) => {
  // 1. Verify JWT from Authorization header
  const supabase = createClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser(jwt);

  // 2. Rate limit check (per tenant)
  const { data: usage } = await supabase.rpc('check_unsplash_rate_limit', {
    p_tenant_id: user.tenant_id,
    p_limit: RATE_LIMIT_PER_HOUR
  });
  if (usage.exceeded) return new Response('Rate limited', { status: 429 });

  // 3. Cache check
  const { action, params } = await req.json();
  const cacheKey = `${action}:${JSON.stringify(params)}`;
  const { data: cached } = await supabase
    .from('unsplash_cache')
    .select('response_json')
    .eq('cache_key', cacheKey)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) return new Response(JSON.stringify(cached.response_json));

  // 4. Forward to Unsplash
  const unsplashUrl = `https://api.unsplash.com/${action}?${new URLSearchParams(params)}`;
  const response = await fetch(unsplashUrl, {
    headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
  });
  const data = await response.json();

  // 5. Cache response
  await supabase.from('unsplash_cache').upsert({
    cache_key: cacheKey,
    response_json: data,
    expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 3600000).toISOString()
  });

  // 6. Record usage
  await supabase.rpc('record_unsplash_usage', { p_tenant_id: user.tenant_id });

  return new Response(JSON.stringify(data));
});
```

**Database Schema:**

```sql
-- Migration 142: Stock asset proxy infrastructure
CREATE TABLE unsplash_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  response_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_unsplash_cache_key ON unsplash_cache(cache_key);
CREATE INDEX idx_unsplash_cache_expires ON unsplash_cache(expires_at);

CREATE TABLE unsplash_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id),
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  UNIQUE(tenant_id, window_start)
);

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_unsplash_rate_limit(p_tenant_id UUID, p_limit INT)
RETURNS TABLE(exceeded BOOLEAN, current_count INT) AS $$
  SELECT
    COALESCE(SUM(request_count), 0) >= p_limit,
    COALESCE(SUM(request_count), 0)::INT
  FROM unsplash_usage_log
  WHERE tenant_id = p_tenant_id
    AND window_start = date_trunc('hour', now());
$$ LANGUAGE sql SECURITY DEFINER;

-- Usage recording (upsert to increment)
CREATE OR REPLACE FUNCTION record_unsplash_usage(p_tenant_id UUID)
RETURNS void AS $$
  INSERT INTO unsplash_usage_log (tenant_id, request_count, window_start)
  VALUES (p_tenant_id, 1, date_trunc('hour', now()))
  ON CONFLICT (tenant_id, window_start)
  DO UPDATE SET request_count = unsplash_usage_log.request_count + 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Cleanup old cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_unsplash_cache()
RETURNS void AS $$
  DELETE FROM unsplash_cache WHERE expires_at < now();
  DELETE FROM unsplash_usage_log WHERE window_start < now() - INTERVAL '48 hours';
$$ LANGUAGE sql SECURITY DEFINER;
```

### Component 3: Stock Image Integration Points

The `StockImagePicker` component needs to work in three contexts:

| Context | Where | How Image Is Used |
|---------|-------|-------------------|
| Scene Editor | `SceneEditorPage.jsx` block toolbar | Inserted as image block in `design_json` via `addBlockToDesign()` |
| Polotno Editor | Inside Polotno iframe side panel | Added via Polotno `store.activePage.addElement({ type: 'image', src })` |
| Media Library | `MediaLibraryPage.jsx` upload area | Saved to Supabase storage as a regular media asset |

**For the Scene Editor (native):** Straightforward. Add a new toolbar button "Stock Photos" next to the existing Image/Shape/Widget buttons. Opens `StockImagePicker` as a modal/drawer. On select, calls `handleAddBlock('image')` with the Unsplash URL as `src`.

**For the Polotno Editor (iframe):** More complex due to iframe boundary.

Option A (Recommended): **Rebuild Polotno bundle with custom Unsplash side panel.** The Polotno SDK supports custom side panels via `ImagesGrid` component. Add a custom panel in the Polotno iframe source that calls back to the parent for API proxying:

```
User clicks "Stock Photos" tab in Polotno sidebar
  --> Polotno iframe sends postMessage: { type: 'searchStockImages', query: '...' }
  --> Parent receives, calls stockAssetService.searchPhotos(query)
  --> Parent sends postMessage: { action: 'stockImageResults', payload: results }
  --> Polotno panel renders results via ImagesGrid
  --> User clicks image --> Polotno adds to canvas via store API
```

Option B: **Parent-hosted picker.** Show `StockImagePicker` as an overlay above the Polotno iframe. On select, send the image URL to the iframe via postMessage `addImageElement`. Simpler but breaks the Polotno workflow (user leaves editor context).

**Recommendation:** Option A for production quality. The Polotno bundle at `/public/polotno/` is already pre-built; adding a custom panel requires modifying the source and rebuilding. This is a one-time build step.

**For Media Library:** Add "Stock Photos" tab alongside existing upload. On select, download the image via Unsplash's download endpoint (required by TOS) and upload to Supabase storage.

### Component 4: Editor Polish -- Animations

**Polotno Animations (verified from official docs):**

```javascript
import { setAnimationsEnabled } from 'polotno/config';
setAnimationsEnabled(true);
```

Enabling this in the Polotno bundle automatically adds:
- Animation property controls in the toolbar per selected element
- A "Videos" side panel for stock video library
- Scene preview with animation playback
- Export to GIF (`store.saveAsGIF()`) and MP4 (`@polotno/video-export`)

**Impact:** Animations are stored in the Polotno design JSON. This does NOT affect the scene editor's `design_json` format. The two editors have separate design schemas.

**For the Scene Editor (native, SceneEditorPage):** Animations require a different approach since this editor uses a custom block-based `design_json` format, not Polotno's format.

Recommended approach for scene editor animations:
- Add `animation` property to block schema: `{ type: 'fadeIn'|'slideLeft'|'slideRight'|'scaleUp', duration: 500, delay: 0 }`
- Add animation controls in `PropertiesPanel.jsx` when a block is selected
- Render animations via CSS transitions in `EditorCanvas.jsx` (edit mode) and `LivePreviewWindow.jsx` (preview mode)
- Store in `design_json.blocks[].animation`

**This is separate from Polotno animations** and should be built as a Scene Editor feature, not a Polotno feature.

### Component 5: Instant Template-to-Editor Flow

**Current Flow (Marketplace):**
```
Browse --> Click template --> TemplatePreviewPanel (side drawer)
  --> "Quick Apply" --> installTemplateAsScene() RPC (creates scene + slides)
  --> hasCustomizableFields? --> TemplateCustomizationWizard (full screen)
  --> Apply customizations --> Navigate to /scene-editor/{sceneId}
```

**Problems with current flow:**
1. 3-4 steps before user can edit
2. Scene is created before user decides to customize (wasteful if they cancel)
3. TemplateCustomizationWizard is a full-screen takeover that feels disconnected
4. No "undo" -- once applied, the scene exists even if user abandons

**Proposed "Instant Edit" Flow:**
```
Browse --> Click template --> TemplateDetailDrawer (enhanced preview)
  --> "Edit Now" --> installTemplateAsScene() RPC
  --> Navigate to /scene-editor/{sceneId} immediately
  --> Editor loads with customization panel open by default (optional first-time UX)
```

**Changes needed:**

| File | Action | Change |
|------|--------|--------|
| `src/components/templates/TemplateDetailDrawer.jsx` | NEW | Replaces TemplatePreviewPanel + TemplateCustomizeModal. Single drawer with preview, details, "Edit Now" button |
| `src/pages/SceneEditorPage.jsx` | MODIFY | Accept `?fromTemplate=true` query param. When present, auto-open a customization sidebar on first load |
| `src/components/scene-editor/QuickCustomizePanel.jsx` | NEW | Inline customization (logo/color/texts) panel that appears in the scene editor as a collapsible section in the properties panel |
| `src/components/templates/TemplateCustomizationWizard.jsx` | DEPRECATE | Replaced by inline customization in the editor itself |

**Key design decision:** Move customization INTO the editor rather than BEFORE it. The user should be editing immediately. Customization fields (logo, color, text) become a "Getting Started" panel within the scene editor that appears for newly-cloned template scenes.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `CreativeHubPage` | Unified template browsing, filtering, search | `creativeHubService`, `TemplateDetailDrawer`, `PremiumTemplateCard` |
| `creativeHubService` | Composite query layer over both template systems | `templateService`, `marketplaceService` |
| `TemplateDetailDrawer` | Preview + apply CTA for selected template | `marketplaceService.installTemplateAsScene()`, router (navigate to editor) |
| `stockAssetService` | Unsplash API client (search, download tracking) | `unsplash-proxy` Edge Function |
| `unsplash-proxy` Edge Function | Server-side API proxy with caching + rate limiting | Unsplash API, `unsplash_cache` table, `unsplash_usage_log` table |
| `StockImagePicker` | Reusable UI for searching/selecting stock photos | `stockAssetService` |
| `UnsplashAttribution` | TOS-compliant attribution display | Pure presentational |
| `PremiumTemplateCard` | Enhanced template card with hover effects | `CreativeHubPage` (parent) |
| `QuickCustomizePanel` | In-editor customization for template scenes | `SceneEditorPage`, `marketplaceService.applyCustomizationToScene()` |
| Polotno custom panel | Stock photos inside Polotno iframe | postMessage bridge to parent `stockAssetService` |

---

## Data Flow Diagrams

### Template Browse to Edit

```
User visits /creative-hub
  |
  v
CreativeHubPage loads
  |
  +-- creativeHubService.fetchUnifiedTemplates({ category, search, license })
  |     |-- marketplaceService.fetchMarketplaceTemplates() --> scene templates
  |     |-- templateService.fetchTemplates()                --> pack/playlist/layout templates
  |     +-- Normalize + merge + rank by featured/rating/recent
  |
  +-- Render PremiumTemplateCard grid
  |
  v
User clicks a scene template card
  |
  v
TemplateDetailDrawer opens (slide-out from right)
  |-- Shows full preview, slide thumbnails, rating, description
  |-- "Edit Now" button (primary CTA)
  |-- "Add to Favorites" toggle
  |
  v
User clicks "Edit Now"
  |
  +-- marketplaceService.installTemplateAsScene(templateId, autoName)
  |     |-- Supabase RPC: clone_template_to_scene
  |     +-- Returns new sceneId
  |
  +-- navigate(`/scene-editor/${sceneId}?fromTemplate=true`)
  |
  v
SceneEditorPage loads with fromTemplate=true
  |-- Detects query param
  |-- Shows QuickCustomizePanel in properties sidebar
  |-- User can customize logo/color/texts inline
  |-- Or dismiss and start editing directly
```

### Stock Image Search Flow

```
User in SceneEditorPage clicks "Stock Photos" in toolbar
  |
  v
StockImagePicker modal opens
  |
  v
User types search query
  |
  +-- stockAssetService.searchPhotos(query, page)
  |     |
  |     +-- POST /functions/v1/unsplash-proxy
  |           |-- JWT auth (from Supabase session)
  |           |-- Rate limit check
  |           |-- Cache check (24h TTL)
  |           |-- If miss: GET api.unsplash.com/search/photos?query=...
  |           |-- Cache write
  |           +-- Return { results, total, total_pages }
  |
  +-- Render image grid with UnsplashAttribution per image
  |
  v
User clicks an image
  |
  +-- stockAssetService.trackDownload(photo.links.download_location)
  |     |-- Required by Unsplash TOS
  |     +-- POST /functions/v1/unsplash-proxy { action: 'track-download', ... }
  |
  +-- SceneEditorPage.handleAddBlock('image', { src: photo.urls.regular })
  |     |-- Creates image block with Unsplash URL (hotlinking required by TOS)
  |     +-- Block metadata stores attribution: { unsplash: true, photographer, photographerUrl }
  |
  v
Image appears on canvas as a new block
```

### Polotno Stock Image Flow (iframe bridge)

```
User in Polotno editor clicks "Stock Photos" side panel tab
  |
  v
Custom Polotno panel renders search UI
  |
  v
User types query --> Panel sends postMessage to parent:
  { source: 'polotno-editor', type: 'searchStockImages', data: { query, page } }
  |
  v
Parent (PolotnoEditor.jsx) receives message
  |-- Calls stockAssetService.searchPhotos(query, page)
  +-- Sends results back via postMessage:
      { target: 'polotno-editor', action: 'stockImageResults', payload: { images, total } }
  |
  v
Polotno panel receives results, renders in ImagesGrid
  |
  v
User clicks image --> Polotno panel:
  1. Sends postMessage: { type: 'trackStockDownload', data: { downloadUrl } }
  2. Calls store.activePage.addElement({ type: 'image', src: photo.urls.regular, ... })
  |
  v
Parent tracks download via stockAssetService.trackDownload()
Image appears on Polotno canvas
```

---

## Patterns to Follow

### Pattern 1: Composite Service Layer

**What:** Frontend services that aggregate data from multiple backend sources into a unified interface for UI components.

**When:** Two or more data sources need to appear as one to the UI, but merging them in the database would be wrong.

**Example:**
```javascript
// src/services/creativeHubService.js
export async function fetchUnifiedTemplates(filters) {
  const [marketplace, library] = await Promise.all([
    fetchMarketplaceTemplates({
      search: filters.search,
      categoryId: filters.categoryId,
      license: filters.license,
    }),
    fetchTemplates({
      search: filters.search,
      categorySlug: filters.categorySlug,
    }).then(r => r.data),
  ]);

  // Normalize to common shape
  const normalized = [
    ...marketplace.map(t => ({
      id: t.id,
      source: 'marketplace',
      name: t.name,
      thumbnail: t.thumbnail_url,
      type: t.template_type,
      license: t.license,
      rating: t.average_rating,
      category: t.category?.name,
      // ... common fields
    })),
    ...library.map(t => ({
      id: t.id,
      source: 'library',
      name: t.name,
      thumbnail: t.thumbnail_url,
      type: t.type,
      license: 'free', // library templates are always free
      category: t.category?.name,
      // ... common fields
    })),
  ];

  return rankTemplates(normalized, filters);
}
```

### Pattern 2: PostMessage Bridge for Iframe Integration

**What:** Extend the existing Polotno postMessage protocol with new message types for stock images.

**When:** New functionality needs to cross the React 19 / React 18 iframe boundary.

**Example:**
```javascript
// In PolotnoEditor.jsx - add to handleMessage switch
case 'searchStockImages':
  try {
    const results = await stockAssetService.searchPhotos(
      data.query, data.page
    );
    sendToIframe('stockImageResults', results);
  } catch (err) {
    sendToIframe('stockImageError', { message: err.message });
  }
  break;

case 'trackStockDownload':
  stockAssetService.trackDownload(data.downloadUrl).catch(() => {});
  break;
```

### Pattern 3: Feature-Flag-Gated Premium Features

**What:** Use existing feature flag system to gate stock assets and premium templates by plan.

**When:** Features that should only be available on certain pricing tiers.

**Example:**
```javascript
// In CreativeHubPage.jsx
const stockPhotosEnabled = isFeatureResolved('stock_assets', featureContext);

// In featureFlags.js
export const GLOBAL_FLAGS = {
  // ...existing flags
  [Feature.STOCK_ASSETS]: false, // Plan-gated, not global
};
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Unsplash API Calls from Browser

**What:** Calling `api.unsplash.com` directly from frontend JavaScript.

**Why bad:** Exposes your API key in client-side code. Anyone can extract it from browser dev tools. Unsplash explicitly warns against this. You also cannot enforce per-tenant rate limits.

**Instead:** Always proxy through the Edge Function. The only direct browser requests should be to `images.unsplash.com` (the CDN) for displaying images, which is expected and required by Unsplash's hotlinking policy.

### Anti-Pattern 2: Merging Template Database Tables

**What:** Creating a single `templates` table that holds both content_templates (infrastructure blueprints) and template_library (visual designs) data.

**Why bad:** These have fundamentally different schemas. content_templates link to blueprint records that create playlists/layouts/schedules. template_library stores slide-level design JSON with customizable fields. Merging them creates a wide table with nullable columns and complex conditional logic everywhere.

**Instead:** Keep separate tables, unify at the service layer with `creativeHubService.js`.

### Anti-Pattern 3: Storing Unsplash Images in Supabase Storage

**What:** Downloading Unsplash images and re-hosting them in your own storage.

**Why bad:** Violates Unsplash API TOS which explicitly requires hotlinking to their URLs. The `ixid` parameter in URLs enables photographer analytics. Re-hosting breaks attribution tracking.

**Instead:** Store the Unsplash URL directly in the design JSON. Display images via Unsplash CDN. Only exception: if user explicitly "downloads to media library", save a copy (this is permitted as a user-initiated download action, but attribution must be preserved).

### Anti-Pattern 4: Synchronous Template Cloning in the Apply Flow

**What:** Waiting for the full `clone_template_to_scene` RPC to complete before showing any UI feedback.

**Why bad:** RPC can take 1-3 seconds for complex templates with multiple slides. User sees a spinner with no progress.

**Instead:** Show optimistic navigation. Navigate to the scene editor immediately with a loading state. The scene editor already handles loading states (`if (loading) return <Loader />`). Let the RPC complete and the editor will load the data.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Unsplash API calls | Well within 5K/hr limit | Cache hit rate reduces to ~2K/hr actual API calls | Need multiple API keys or Unsplash Enterprise |
| Template browse queries | Direct Supabase queries fine | Add pagination, cache categories | Consider search index (pg_trgm or external) |
| Cache table growth | Negligible | ~50K rows, auto-cleanup handles it | Partition by month, consider Redis |
| Edge Function cold starts | Imperceptible | ~200ms p95 for cold starts | Acceptable; Supabase keeps warm for active functions |
| Polotno iframe load | 10s timeout is generous | Same; files are static/cached | CDN the static assets |

---

## Integration Points with Existing Files

### Files That Need Modification

| Existing File | Change Required | Why |
|---------------|----------------|-----|
| `src/components/PolotnoEditor.jsx` | Add stock image postMessage handlers | Bridge Polotno iframe stock photo requests |
| `src/pages/SceneEditorPage.jsx` | Add `?fromTemplate` detection, stock photos toolbar button | Instant edit flow + stock image access |
| `src/components/scene-editor/PropertiesPanel.jsx` | Add animation controls section | Block-level animation settings |
| `src/services/sceneDesignService.js` | Add `animation` to block schema | Store animation data in design_json |
| `src/components/scene-editor/EditorCanvas.jsx` | Render CSS animations on blocks | Visual animation preview in edit mode |
| `src/components/scene-editor/LivePreviewWindow.jsx` | Animate blocks during preview playback | Animation preview in preview mode |
| `public/polotno/polotno-editor.js` | Rebuild with animations enabled + custom stock panel | Polotno feature additions |
| `src/config/featureFlags.js` | Add STOCK_ASSETS feature flag | Plan gating |
| `src/config/env.js` | No change needed (Edge Function holds API key) | -- |
| App router | Add `/creative-hub` route | New page |

### Files That Stay Unchanged

| File | Why Unchanged |
|------|--------------|
| `src/services/templateService.js` | Still needed for pack/playlist/layout templates |
| `src/services/marketplaceService.js` | Still needed for scene templates, consumed by creativeHubService |
| `src/components/templates/TemplateCustomizeModal.jsx` | Deprecated but kept for TemplatesPage backward compat |
| `src/services/mediaService.js` | Stock images flow through it when user saves to library |

---

## Build Order (Dependency Graph)

```
Phase 1: Unsplash Proxy Infrastructure
  |-- Migration: cache + rate limit tables
  |-- Edge Function: unsplash-proxy
  |-- Service: stockAssetService.js
  |-- Component: StockImagePicker.jsx, UnsplashAttribution.jsx
  |
  +-- No dependencies on other phases

Phase 2: Scene Editor Stock Photos + Animation
  |-- Depends on: Phase 1 (stockAssetService)
  |-- Modify: SceneEditorPage.jsx (add stock photos button)
  |-- Modify: sceneDesignService.js (animation schema)
  |-- Modify: PropertiesPanel.jsx (animation controls)
  |-- Modify: EditorCanvas.jsx (animation rendering)
  |-- New: QuickCustomizePanel.jsx
  |
  +-- Depends on Phase 1

Phase 3: Polotno Editor Enhancements
  |-- Depends on: Phase 1 (stockAssetService via postMessage)
  |-- Rebuild: polotno-editor.js (enable animations + custom stock panel)
  |-- Modify: PolotnoEditor.jsx (add stock image message handlers)
  |
  +-- Depends on Phase 1, can parallel with Phase 2

Phase 4: Unified Template Browser
  |-- Depends on: Phase 2 (instant edit flow target)
  |-- New: creativeHubService.js, CreativeHubPage.jsx
  |-- New: PremiumTemplateCard.jsx, TemplateDetailDrawer.jsx
  |-- New: CategoryHeroSection.jsx
  |-- Modify: Router (add /creative-hub route)
  |
  +-- Depends on Phase 2 (for the instant-edit landing)

Phase 5: Polish + Integration Testing
  |-- Depends on: All previous phases
  |-- Wire up feature flags
  |-- Add redirects from old template pages
  |-- E2E testing of full flows
```

**Rationale for order:** The Unsplash proxy is infrastructure with zero UI dependencies, so it ships first and unblocks both editor integration phases. The scene editor gets stock photos and animations in Phase 2 because that is where marketplace templates land. Polotno can be enhanced in parallel. The unified browser is last because it depends on the instant-edit flow being ready in the scene editor.

---

## Sources

- [Unsplash API Official Documentation](https://unsplash.com/documentation) -- Rate limits, auth, attribution requirements (HIGH confidence)
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) -- Hotlinking and TOS requirements (HIGH confidence)
- [Polotno SDK Custom Images Panel](https://polotno.com/docs/custom-images-panel) -- ImagesGrid component, custom panel API (HIGH confidence)
- [Polotno SDK Animations](https://polotno.com/docs/animations-and-videos) -- setAnimationsEnabled, GIF/video export (HIGH confidence)
- [Polotno SDK Side Panel Overview](https://polotno.com/docs/side-panel-overview) -- Custom section registration (HIGH confidence)
- [Supabase Edge Functions Rate Limiting](https://supabase.com/docs/guides/functions/examples/rate-limiting) -- Upstash Redis pattern (MEDIUM confidence -- we use Supabase table instead)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) -- Deno runtime, cold starts (HIGH confidence)
- Existing codebase analysis: `templateService.js`, `marketplaceService.js`, `PolotnoEditor.jsx`, `EditorModal.jsx`, `SceneEditorPage.jsx`, `TemplatesPage.jsx`, `TemplateMarketplacePage.jsx`, `TemplateCustomizationWizard.jsx` (HIGH confidence -- direct code review)
