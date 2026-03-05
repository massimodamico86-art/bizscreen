# Phase 114: Integration Pipeline Fixes - Research

**Researched:** 2026-03-04
**Domain:** Cross-phase integration wiring (document upload pipeline, embed widget rendering, broken import)
**Confidence:** HIGH

## Summary

Phase 114 addresses three distinct integration gaps that emerged during the v12.0 audit. Each gap represents work that was completed in isolation during earlier phases (108, 111) but never wired into the existing application pipelines.

**Gap 1 -- Document Upload Pipeline:** The `documentService.uploadDocument()` function exists and is fully implemented (Phase 111), but the media library upload flow (`useMediaLibrary` hook -> `useS3Upload` -> `handleUploadSuccess`) never calls it. When a user uploads a PDF or Office file via the media library, the file goes through the generic S3 upload path and gets saved as a regular media asset via `createMediaAsset()`. The document conversion pipeline (upload to Supabase Storage, create `media_assets` record with `conversionStatus: 'pending'`, invoke `doc-converter` Edge Function) is never triggered. The `isDocumentMimeType()` helper is only imported within `documentService.js` itself -- no other file in the codebase checks for document MIME types during upload.

**Gap 2 -- Embed Widget Rendering in ZonePlayer:** The embed widgets (YouTubeWidget, VimeoWidget, WebPageWidget, GoogleSlidesWidget) exist as fully implemented player components registered in `WIDGET_REGISTRY`. However, `ZonePlayer.jsx` only handles four content types: `video` (HTML5 video element), `image` (img tag), `app` (AppRenderer), and `web_page` (bare iframe). It has no `widget` type branch and no import of the widget registry. When a layout zone contains an embed widget, ZonePlayer falls through to the default branch showing just the item name on a dark background. The `LayoutElementRenderer` (used in the layout editor) correctly routes `type: 'widget'` elements through `getWidgetComponent()`, but ZonePlayer does not replicate this logic for playback.

**Gap 3 -- TVPreviewModal Build Blocker:** `TVPreviewModal.jsx` imports `ScaledStage` from `../tv-layouts/ScaledStage`, but the directory `src/components/tv-layouts/` does not exist. The actual `ScaledStage` component lives at `src/ScaledStage.jsx` (default export). The same broken import exists in `PropertyDetailsModal.jsx`. This causes `npm run build` (Vite/Rollup) to fail with: `Could not resolve "../tv-layouts/ScaledStage" from "src/components/listings/TVPreviewModal.jsx"`. This is a fatal build error that blocks all production deployments.

**Primary recommendation:** Fix all three gaps in a single phase with three focused tasks: (1) intercept document uploads in `useMediaLibrary` or `useS3Upload`, (2) add widget rendering branch to `ZonePlayer`, (3) fix the ScaledStage import path.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOC-01 | User can upload PDF documents as media assets | Gap 1: `handleUploadSuccess` in `useMediaLibrary` must detect document MIME types and route to `documentService.uploadDocument()` instead of generic `createMediaAsset()` |
| DOC-02 | User can upload Word/PPT/Excel documents as media assets | Gap 1: Same routing logic -- `isDocumentMimeType()` already covers all Office MIME types |
| DOC-03 | Uploaded documents are converted to images server-side for player compatibility | Gap 1: `uploadDocument()` already invokes `doc-converter` Edge Function and creates records with `conversionStatus: 'pending'` -- just needs to be called |
| DOC-06 | Document widget works on WebOS/Tizen devices (rendered as pre-converted images) | Gap 1: Conversion pipeline produces PNG page images -- pipeline must be triggered for this to work |
| EMBED-01 | User can add a YouTube video widget to a layout zone with a video URL | Gap 2: YouTubeWidget exists in registry, ZonePlayer needs widget rendering branch |
| EMBED-02 | User can add a Vimeo video widget to a layout zone with a video URL | Gap 2: VimeoWidget exists in registry, ZonePlayer needs widget rendering branch |
| EMBED-03 | YouTube/Vimeo widget plays the video on the screen player via iframe embed | Gap 2: Widget components render iframes correctly, ZonePlayer must route to them |
| EMBED-04 | YouTube/Vimeo widget shows a cached thumbnail with "requires internet" message when offline | Gap 2: EmbedOfflineFallback component exists, ZonePlayer must render widget to trigger it |
| EMBED-05 | User can add a web page widget to a layout zone with a URL | Gap 2: WebPageWidget exists in registry with auto-refresh and zoom support |
| EMBED-06 | Web page widget displays the live website on the screen player | Gap 2: WebPageWidget renders iframe, ZonePlayer must route to it |
| EMBED-07 | User can configure auto-refresh interval for web page widget | Gap 2: WebPageWidget already supports `refreshIntervalMinutes` prop |
| SLIDES-01 | User can add a Google Slides widget to a layout zone | Gap 2: GoogleSlidesWidget exists in registry |
| SLIDES-02 | User can paste a Google Slides URL to display a presentation | Gap 2: `extractGoogleSlidesId()` and `buildGoogleSlidesEmbedUrl()` exist in embedUtils |
| SLIDES-03 | Google Slides widget renders slides on the screen with configurable auto-advance interval | Gap 2: GoogleSlidesWidget supports `delayMs` and `loop` props |
</phase_requirements>

## Standard Stack

### Core

This phase is purely integration wiring -- no new libraries are needed. All required code already exists in the codebase.

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `documentService.js` | `src/services/documentService.js` | Document upload + conversion pipeline | Exists, unused by upload flow |
| `useMediaLibrary.js` | `src/pages/hooks/useMediaLibrary.js` | Media library upload orchestration | Exists, needs document MIME routing |
| `useS3Upload.jsx` | `src/hooks/useS3Upload.jsx` | File upload via presigned URLs | Exists, no document awareness |
| `ZonePlayer.jsx` | `src/player/components/ZonePlayer.jsx` | Zone content playback | Exists, missing widget branch |
| `WIDGET_REGISTRY` | `src/widgets/registry.js` | Widget type -> component mapping | Exists, fully populated |
| `getWidgetComponent()` | `src/widgets/registry.js` | Registry lookup function | Exists, used by LayoutElementRenderer |
| `ScaledStage.jsx` | `src/ScaledStage.jsx` | 1920x1080 scale container | Exists at root, wrong import path |
| `TVPreviewModal.jsx` | `src/components/listings/TVPreviewModal.jsx` | TV preview dialog | Exists, broken import |
| `PropertyDetailsModal.jsx` | `src/components/listings/PropertyDetailsModal.jsx` | Property details dialog | Exists, broken import |

### Supporting

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| React | 18.x | Component rendering | Yes |
| Vite | 7.2.x | Build tool (produces the build error) | Yes |
| lucide-react | latest | Icons (used by widgets) | Yes |

### No New Dependencies

No `npm install` needed. All integration is wiring between existing modules.

## Architecture Patterns

### Pattern 1: Document Upload Routing (MIME-Type Branching)

**What:** Intercept file uploads in the media library pipeline to route document files through `documentService.uploadDocument()` instead of the generic S3 upload + `createMediaAsset()` path.

**When to use:** When the uploaded file has a document MIME type (PDF, Word, PPT, Excel).

**Where to intercept:** The cleanest interception point is in `useMediaLibrary.js` `handleUploadSuccess` callback. However, the S3 upload happens first (via `useS3Upload`), so documents would be uploaded to S3 AND then re-uploaded to Supabase Storage by `documentService.uploadDocument()`. A better approach is to intercept BEFORE the S3 upload, in the file selection handler.

**Recommended approach:** Modify `useS3Upload.jsx` or the `handleFileSelectImpl` / `handleUploadSuccess` flow to:
1. Check `isDocumentMimeType(file.type)` before uploading
2. If document: call `documentService.uploadDocument(file)` directly (bypasses S3, uploads to Supabase Storage as designed)
3. If not document: proceed with existing S3 upload path

**Key constraint from STATE.md (111-01):** "Documents MUST convert server-side before player rendering (WebOS/Tizen crash risk)"

```jsx
// In useMediaLibrary.js handleUploadSuccess or useS3Upload handleFileSelectImpl:
import { isDocumentMimeType, uploadDocument } from '../../services/documentService';

// Before S3 upload:
if (isDocumentMimeType(file.type)) {
  const asset = await uploadDocument(file, {
    onStatusChange: (status) => {
      // Update UI with 'uploading' or 'converting' status
    },
  });
  onSuccess?.({
    ...asset,
    mediaType: 'document',
    originalFilename: file.name,
  });
  return; // Skip S3 upload
}
```

### Pattern 2: Widget Rendering in ZonePlayer

**What:** Add a `widget` content type branch to ZonePlayer that uses `getWidgetComponent()` from the widget registry to render embed widgets.

**When to use:** When `currentItem.mediaType === 'widget'` or when the zone content includes widget type information.

**Key insight:** The existing `LayoutElementRenderer.jsx` already demonstrates the correct pattern for widget rendering via the registry. ZonePlayer should replicate this pattern for its playback path.

**Data flow question:** How does widget type information reach ZonePlayer? Zone content items come from playlists or direct media assignment. The `zone.content` object structure is:
- `type: 'playlist'` with `items[]` where each item has `mediaType`
- `type: 'media'` with `item` where item has `mediaType`
- The widget type key (e.g., 'youtube', 'vimeo') must be accessible on the item

**Recommended approach:** Add a rendering branch in ZonePlayer:

```jsx
import { getWidgetComponent } from '../../widgets/registry.js';

// In the render section, add before the default fallback:
) : currentItem.widgetType ? (
  (() => {
    const WidgetComp = getWidgetComponent(currentItem.widgetType);
    return WidgetComp
      ? <WidgetComp props={currentItem.widgetProps || currentItem.config || {}} timezone={timezone} />
      : <div>...</div>;
  })()
) : (
```

**Important:** The exact property name for widget type on the item needs verification. Check how layout zones store widget assignments. The `LayoutElementRenderer` uses `element.widgetType` and `element.props`. ZonePlayer items may use `currentItem.config?.widgetType` or similar. The implementation must match whatever structure the zone content API returns.

### Pattern 3: Import Path Fix (ScaledStage)

**What:** Fix the broken import path in TVPreviewModal.jsx and PropertyDetailsModal.jsx.

**Current (broken):**
```jsx
import { ScaledStage } from '../tv-layouts/ScaledStage';
```

**Fix:**
```jsx
import ScaledStage from '../../ScaledStage';
```

**Key details:**
- `ScaledStage` is a default export (`export default function ScaledStage`), not a named export
- It lives at `src/ScaledStage.jsx` (project root, not in a subdirectory)
- Both `TVPreviewModal.jsx` and `PropertyDetailsModal.jsx` (in `src/components/listings/`) need the fix
- The import must use default import syntax (no curly braces)

### Anti-Patterns to Avoid

- **Duplicating document upload logic:** Do NOT copy-paste the upload + conversion flow from `documentService.js` into `useMediaLibrary.js`. Import and call the existing function.
- **Adding widget-specific branches in ZonePlayer:** Do NOT add separate `if (mediaType === 'youtube')` / `if (mediaType === 'vimeo')` branches. Use the registry pattern (`getWidgetComponent()`) so new widget types auto-work.
- **Creating a tv-layouts directory:** Do NOT create `src/components/tv-layouts/ScaledStage.jsx` as a redirect. Fix the import path to point to the existing file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Document MIME type detection | Manual MIME string checks | `isDocumentMimeType()` from documentService | Already handles all 7 MIME types |
| Document upload + conversion | Inline S3 upload + manual Edge Function call | `uploadDocument()` from documentService | Handles storage path, DB record, Edge Function invocation, error handling |
| Widget type resolution | `switch/case` on widget type strings | `getWidgetComponent(widgetType)` from registry | Central registry auto-resolves, supports all 17 widget types |
| Conversion status polling | Manual setInterval | `pollConversionStatus()` from documentService | Exponential backoff, cancellation, timeout handling |

**Key insight:** All three fixes are wiring exercises. The components exist and work in isolation. The implementation is about connecting existing pieces, not building new ones.

## Common Pitfalls

### Pitfall 1: Double Upload for Documents

**What goes wrong:** If the document routing is added only in `handleUploadSuccess` (after S3 upload), the file gets uploaded to S3 first AND then uploaded to Supabase Storage by `documentService.uploadDocument()`. This wastes bandwidth, doubles storage cost, and the S3 copy is never used.

**Why it happens:** `useS3Upload` uploads the file before calling `onSuccess`. If document detection happens only in the success handler, the S3 upload already happened.

**How to avoid:** Intercept BEFORE the S3 upload. Either:
1. Add document detection in `useS3Upload.handleFileSelectImpl` before calling `uploadFileToS3()`
2. Or add a pre-upload hook/filter to `useS3Upload` that allows callers to bypass S3 for specific file types
3. Or handle document files separately in the media library UI before they reach `useS3Upload`

**Warning signs:** Document files appearing in the S3 bucket AND Supabase Storage simultaneously.

### Pitfall 2: Widget Props Shape Mismatch

**What goes wrong:** ZonePlayer passes widget props in the wrong shape. The widget components expect `{ props: { url, muted, ... } }` but the zone content item might store them differently (e.g., `item.config`, `item.widgetProps`, or flat on the item).

**Why it happens:** Widget components in the registry receive props via `<WidgetComp props={props} />` where `props` is the inner props object. But zone content items coming from the DB might use a different property name.

**How to avoid:** Check the actual data shape returned by the layout/zone content API. The `LayoutElementRenderer` uses `element.props` -- verify that zone content items follow the same convention.

**Warning signs:** Widget renders but shows no content (empty URL, default props).

### Pitfall 3: Named vs Default Export Confusion

**What goes wrong:** Fixing the ScaledStage import path but keeping `{ ScaledStage }` (named import) when the component uses `export default`.

**Why it happens:** Quick find-and-replace of the path without checking the export type.

**How to avoid:** ScaledStage is `export default function ScaledStage`. Use `import ScaledStage from '../../ScaledStage'` (no curly braces).

**Warning signs:** `ScaledStage is not a function` or `ScaledStage is not defined` runtime error.

### Pitfall 4: Missing Conversion Status UI Feedback

**What goes wrong:** Document uploads work but the user sees no feedback about conversion progress. The file appears in the library with no indication that conversion is pending.

**Why it happens:** `uploadDocument()` returns the asset immediately after starting conversion. Without polling or status display, the user doesn't know conversion is happening.

**How to avoid:** After calling `uploadDocument()`, either start `pollConversionStatus()` or display the `conversionStatus: 'pending'` from `config_json` in the media library grid. Phase 111 already stores status in `config_json.conversionStatus`.

**Warning signs:** Document appears in library, user tries to play it, sees no pages because conversion hasn't completed yet.

## Code Examples

### Example 1: Document Upload Interception in useMediaLibrary

```jsx
// src/pages/hooks/useMediaLibrary.js
import { isDocumentMimeType, uploadDocument } from '../../services/documentService';

// Inside handleUploadSuccess callback (or better, before S3 upload):
const handleUploadSuccess = useCallback(async (uploadedFile) => {
  // ... existing code ...
  try {
    const mediaType = getMediaTypeFromUpload(
      uploadedFile.mediaType || uploadedFile.resourceType,
      uploadedFile.format
    );

    // Documents already handled by documentService pipeline
    if (mediaType === MEDIA_TYPES.DOCUMENT) {
      // Asset already created by documentService.uploadDocument()
      // Just refresh the library
      fetchAssets();
      setShowAddMediaModal(false);
      showToast?.('Document uploaded - conversion in progress', 'success');
      return;
    }

    // ... rest of existing createMediaAsset logic for non-documents ...
  }
}, [...]);
```

### Example 2: Widget Branch in ZonePlayer

```jsx
// src/player/components/ZonePlayer.jsx
import { getWidgetComponent } from '../../widgets/registry.js';

// In the render switch, add widget support:
) : currentItem.mediaType === 'app' ? (
  <AppRenderer item={currentItem} timezone={timezone} />
) : currentItem.widgetType || currentItem.mediaType === 'widget' ? (
  (() => {
    const widgetType = currentItem.widgetType || currentItem.config?.widgetType;
    const WidgetComp = getWidgetComponent(widgetType);
    if (WidgetComp) {
      return <WidgetComp props={currentItem.widgetProps || currentItem.config || {}} timezone={timezone} />;
    }
    return <div style={{ /* fallback */ }}><p>{currentItem.name}</p></div>;
  })()
) : currentItem.mediaType === 'web_page' ? (
```

### Example 3: ScaledStage Import Fix

```jsx
// src/components/listings/TVPreviewModal.jsx
// BEFORE (broken):
import { ScaledStage } from '../tv-layouts/ScaledStage';

// AFTER (fixed):
import ScaledStage from '../../ScaledStage';
```

```jsx
// src/components/listings/PropertyDetailsModal.jsx
// BEFORE (broken):
import { ScaledStage } from '../tv-layouts/ScaledStage';

// AFTER (fixed):
import ScaledStage from '../../ScaledStage';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic S3 upload for all files | Document-aware upload routing | Phase 111 (service exists, not wired) | Documents get server-side conversion for smart TV compatibility |
| Hard-coded media type rendering in ZonePlayer | Widget registry pattern | Phase 108 (registry exists, not used by ZonePlayer) | Extensible widget system for all embed types |
| tv-layouts directory structure | Root-level ScaledStage.jsx | Pre-Phase 114 (path changed, imports not updated) | Build succeeds |

## Open Questions

1. **Widget item data shape in zone content**
   - What we know: `LayoutElementRenderer` uses `element.widgetType` and `element.props`. Zone content comes from playlists or direct zone assignment.
   - What's unclear: The exact property names on zone content items when they contain widgets. Is it `item.widgetType` + `item.widgetProps`? Or `item.config.widgetType`? Or does `item.mediaType` equal the widget type key?
   - Recommendation: Inspect the zone content API response or the layout zone assignment code in the layout editor to determine the exact data shape. Implementation should handle multiple conventions defensively.

2. **Document upload interception point**
   - What we know: `useS3Upload` uploads to S3, then `handleUploadSuccess` creates the DB record. `documentService.uploadDocument()` uploads to Supabase Storage.
   - What's unclear: Whether to intercept in `useS3Upload` (more reusable) or in `useMediaLibrary` (more specific). Also whether the existing file input `accept` attribute already allows document types.
   - Recommendation: The `useS3Upload` `accept` prop already includes `'application/pdf', '.doc,.docx,.ppt,.pptx,.xls,.xlsx'`, so document files are accepted. Intercept in `useMediaLibrary` or add a pre-upload filter to `useS3Upload` to avoid double-upload. The interception should happen BEFORE `uploadFileToS3()` is called.

3. **Conversion status display in media library**
   - What we know: `documentService` stores `config_json.conversionStatus` on the asset. `pollConversionStatus()` exists.
   - What's unclear: Whether the media library grid currently renders any conversion status indicator for documents.
   - Recommendation: At minimum, show a badge/indicator. The `DocumentWidget` controls panel already shows conversion status with colored dots (from Phase 111-02 decisions). A similar approach could be used in the media grid. However, this may be scope creep for Phase 114 -- the success criteria only require the pipeline to be wired, not a polished status UI.

## Sources

### Primary (HIGH confidence)
- `src/services/documentService.js` -- Full source reviewed: `uploadDocument()`, `isDocumentMimeType()`, `pollConversionStatus()`
- `src/pages/hooks/useMediaLibrary.js` -- Full source reviewed: `handleUploadSuccess`, `getMediaTypeFromUpload`
- `src/hooks/useS3Upload.jsx` -- Full source reviewed: `handleFileSelectImpl`, file type handling
- `src/player/components/ZonePlayer.jsx` -- Full source reviewed: content type branching
- `src/widgets/registry.js` -- Full source reviewed: `WIDGET_REGISTRY`, `getWidgetComponent()`
- `src/components/layout-editor/LayoutElementRenderer.jsx` -- Full source reviewed: widget rendering pattern
- `src/player/components/AppRenderer.jsx` -- Full source reviewed: app type routing
- `src/ScaledStage.jsx` -- Full source reviewed: default export
- `src/components/listings/TVPreviewModal.jsx` -- Full source reviewed: broken import
- `src/components/listings/PropertyDetailsModal.jsx` -- Header reviewed: same broken import
- Build output: `npm run build` fails with `Could not resolve "../tv-layouts/ScaledStage"`

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` -- Phase 111-01 decision: "removed legacy text/ MIME catch-all"
- `.planning/STATE.md` -- Phase 111-02 decision: "DocumentWidget reads directly from Supabase"
- `.planning/ROADMAP.md` -- Phase 114 definition and success criteria

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all code examined directly, no external dependencies
- Architecture: HIGH -- patterns verified by reading existing implementations
- Pitfalls: HIGH -- identified from actual code flow analysis (double upload, prop shape)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- all integration targets are internal code)
