# Phase 111: Documents and Calendar - Research

**Researched:** 2026-03-04
**Domain:** Server-side document conversion (PDF/Office to images), calendar OAuth integration (Google Calendar, Outlook)
**Confidence:** HIGH

## Summary

Phase 111 adds two distinct capabilities: (1) document upload and conversion -- users can upload PDF and Office (Word/PPT/Excel) files as media assets, which are automatically converted to page images server-side, then displayed via a document widget that auto-advances through pages; and (2) calendar widgets -- users can connect Google Calendar and Microsoft Outlook via OAuth and display upcoming events on screen with auto-refresh.

The document conversion path has a critical architectural constraint: **WebOS and Tizen smart TVs cannot render PDFs or Office files natively**, so all documents MUST be pre-converted to images server-side before reaching the player. This means a Supabase Edge Function (or external microservice) must handle conversion. For PDFs, `magick-wasm` (already proven in the Supabase Edge Functions docs for image manipulation) can convert PDF pages to PNG images within a Deno Edge Function using ephemeral `/tmp` storage. For Office files (Word/PPT/Excel), LibreOffice headless conversion is required -- this cannot run in a Deno Edge Function and needs an external microservice (Gotenberg or a custom Docker container with LibreOffice). A two-stage pipeline handles both: Office files are first converted to PDF via the external service, then PDF pages are rasterized to images via the Edge Function.

The calendar integration follows the established OAuth pattern from `cloudOAuthService.js` (PKCE + state, token storage in localStorage, refresh-on-expiry). Google Calendar uses the v3 REST API with `calendar.events.readonly` scope. Microsoft Outlook uses Microsoft Graph API v1.0 with `Calendars.ReadBasic` permission. Both return events as JSON, which a `calendar-proxy` Edge Function fetches and caches server-side (following the `rss-proxy` pattern). The calendar widget renders events in a list/agenda format and auto-refreshes on a configurable interval.

**Primary recommendation:** Implement document conversion as a two-stage pipeline (Office-to-PDF via external service, PDF-to-images via Edge Function). Register `document` and `calendar` as two new widget types in the established widget registry. Extend `cloudOAuthService.js` for Google Calendar and Outlook OAuth. Build a `calendar-proxy` Edge Function following the existing `rss-proxy` pattern for server-side event fetching and caching.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOC-01 | User can upload PDF documents as media assets | Extend `getMediaTypeFromMime()` in `mediaService.js` to accept `application/pdf` as type `document`. Upload to Supabase Storage. Trigger conversion pipeline after upload. |
| DOC-02 | User can upload Word/PPT/Excel documents as media assets | Add MIME types: `application/vnd.openxmlformats-officedocument.*`, `application/msword`, `application/vnd.ms-*`. Two-stage conversion: Office-to-PDF (external), then PDF-to-images. |
| DOC-03 | Uploaded documents are converted to images server-side for player compatibility | `doc-converter` Edge Function uses `magick-wasm` for PDF-to-PNG. Office files go through Gotenberg (Docker sidecar) first. Converted page images stored in Supabase Storage with `config_json.convertedPages` array of URLs. |
| DOC-04 | User can add a document widget to display pages in a layout zone | New `document` entry in `WIDGET_REGISTRY`. Widget component cycles through pre-converted page images. Controls: document picker (select from media library filtered to type=document), page interval. |
| DOC-05 | Document pages auto-advance on the screen player with configurable interval | Document widget uses `setInterval` to cycle through `convertedPages` URLs with configurable delay (5/10/15/30/60 seconds). Crossfade transition between pages. |
| DOC-06 | Document widget works on WebOS/Tizen devices (rendered as pre-converted images) | Pre-converted PNG images render as standard `<img>` tags -- universally supported on all smart TV platforms. No PDF/Office rendering on client. |
| CAL-01 | User can add a calendar widget to a layout zone | New `calendar` entry in `WIDGET_REGISTRY`. Widget component displays events list. Controls: calendar source picker, date range, event count, refresh interval. |
| CAL-02 | User can connect Google Calendar via OAuth | Extend `cloudOAuthService.js` with `GOOGLE_CALENDAR` provider. OAuth flow uses PKCE + `calendar.events.readonly` scope. Token exchange via Edge Function (server-side, not client-side for security). |
| CAL-03 | Calendar widget displays upcoming events on screen with auto-refresh | `calendar-proxy` Edge Function fetches events from Google Calendar API v3 / Microsoft Graph API using stored tokens. Results cached in `calendar_event_cache` table with TTL. Widget polls Edge Function on interval. |
| CAL-04 | User can connect Outlook calendar via Microsoft OAuth | Add `OUTLOOK_CALENDAR` provider to `cloudOAuthService.js`. Uses Microsoft identity platform v2.0 OAuth with `Calendars.ReadBasic` delegated permission. Token exchange via Edge Function. |
| CAL-05 | Calendar widget supports multiple calendar sources per widget | Widget `defaultProps` includes `sources: []` array. Each source has `{ provider, calendarId, accessToken }`. Widget merges events from all sources, sorts by start time. Controls panel has "Add Calendar" button with provider picker. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@imagemagick/magick-wasm` | 0.0.30 | PDF-to-PNG conversion in Edge Function | WASM-based, works in Deno Edge Functions (documented by Supabase), handles PDF rendering via ImageMagick's built-in PDF support |
| Supabase Edge Functions (Deno) | N/A | `doc-converter` and `calendar-proxy` Edge Functions | 5 Edge Functions already in project; established deployment pattern |
| Google Calendar API v3 | v3 | Read calendar events via REST | Standard API at `googleapis.com/calendar/v3/calendars/{id}/events` with `calendar.events.readonly` scope |
| Microsoft Graph API | v1.0 | Read Outlook calendar events via REST | Standard API at `graph.microsoft.com/v1.0/me/calendarView` with `Calendars.ReadBasic` permission |
| Supabase Storage | N/A | Store converted document page images | Already used for media uploads (media bucket). Converted pages go to same bucket under `documents/{mediaId}/` prefix |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Gotenberg | 8.x | Office-to-PDF conversion (Docker) | External microservice for Word/PPT/Excel to PDF. Wraps LibreOffice headless. Only needed for Office files, not PDFs. |
| Existing `cloudOAuthService.js` | N/A | PKCE, state management, token storage | Extend with `GOOGLE_CALENDAR` and `OUTLOOK_CALENDAR` providers following the same pattern as Google Drive |
| Existing `rss-proxy` Edge Function | N/A | Pattern for server-side fetching + caching | `calendar-proxy` follows same architecture: JWT auth, fetch from external API, cache in DB table with TTL |
| Existing `cacheService.js` | N/A | IndexedDB for offline page image caching on player | Document widget pre-caches page images for offline display |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `magick-wasm` for PDF rendering | `pdfjs-dist` (Mozilla PDF.js) in Node.js | PDF.js is better for PDF but requires Node.js canvas library (`@napi-rs/canvas`). `magick-wasm` works natively in Deno Edge Functions without native deps. PDF.js not available as WASM module for Deno. |
| Gotenberg (Docker) for Office conversion | API2PDF (SaaS), CloudConvert (SaaS) | SaaS adds cost per conversion and external dependency. Gotenberg is self-hosted, free, and runs alongside Supabase in Docker Compose. |
| Separate `doc-converter` Edge Function | Client-side PDF.js rendering | Client-side rendering fails on WebOS/Tizen. Project requirement DOC-06 mandates server-side conversion. |
| Server-side OAuth token exchange | Client-side token exchange | Server-side is more secure -- client secret stays on server. Edge Function handles token exchange, client never sees the secret. |
| `calendar-proxy` Edge Function | Direct client-side Google/Microsoft API calls | Server-side proxy hides API keys, handles token refresh, provides caching, and works for the player (which may not have user OAuth tokens). |

**Installation:**
```bash
# New npm packages: None needed for the frontend
# Edge Function deployment:
supabase functions deploy doc-converter
supabase functions deploy calendar-proxy
# External service (Docker):
docker pull gotenberg/gotenberg:8
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    documentService.js           # NEW: Upload, conversion status polling, page URL resolution
    calendarService.js           # NEW: Calendar source CRUD, event fetching via Edge Function
  services/cloud/
    cloudOAuthService.js         # EXTEND: Add GOOGLE_CALENDAR and OUTLOOK_CALENDAR providers
    googleCalendarService.js     # NEW: Google Calendar OAuth flow + event fetching
    outlookCalendarService.js    # NEW: Microsoft OAuth flow + event fetching
  widgets/
    registry.js                  # EXTEND: Add 'document' and 'calendar' entries
  player/components/widgets/
    DocumentWidget.jsx           # NEW: Page image carousel with auto-advance
    CalendarWidget.jsx           # NEW: Event list display with auto-refresh
    index.js                     # EXTEND: Export 2 new components
  components/scene-editor/
    DocumentWidgetControls.jsx   # NEW: Document picker, page interval
    CalendarWidgetControls.jsx   # NEW: Calendar source management, display options
supabase/
  functions/
    doc-converter/
      index.ts                   # NEW: PDF-to-images conversion Edge Function
    calendar-proxy/
      index.ts                   # NEW: Calendar event fetching + caching Edge Function
  migrations/
    164_document_conversion.sql  # NEW: conversion_status columns, calendar_event_cache table
```

### Pattern 1: Document Conversion Pipeline
**What:** Two-stage async conversion: upload -> trigger conversion -> poll status -> use converted images
**When to use:** All document uploads (PDF and Office)
**Example:**
```javascript
// src/services/documentService.js

/**
 * Upload a document and trigger server-side conversion.
 * Returns the media asset record immediately; conversion happens async.
 */
export async function uploadDocument(file) {
  // 1. Upload file to Supabase Storage
  const path = `documents/originals/${user.id}/${timestamp}-${file.name}`;
  await supabase.storage.from('media').upload(path, file);
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);

  // 2. Create media_assets record with conversion_status = 'pending'
  const asset = await createMediaAsset({
    name: file.name.replace(/\.[^.]+$/, ''),
    type: MEDIA_TYPES.DOCUMENT,
    url: publicUrl,
    mimeType: file.type,
    fileSize: file.size,
    configJson: {
      conversionStatus: 'pending',
      convertedPages: [],
      pageCount: 0,
      originalFormat: getFileExtension(file.name),
    },
  });

  // 3. Trigger conversion via Edge Function (async)
  await supabase.functions.invoke('doc-converter', {
    body: { mediaId: asset.id, storageUrl: publicUrl, mimeType: file.type },
  });

  return asset;
}

/**
 * Poll conversion status for a document.
 */
export async function getConversionStatus(mediaId) {
  const asset = await getMediaAsset(mediaId);
  return {
    status: asset.config_json?.conversionStatus || 'unknown',
    pageCount: asset.config_json?.pageCount || 0,
    convertedPages: asset.config_json?.convertedPages || [],
    error: asset.config_json?.conversionError || null,
  };
}
```

### Pattern 2: Document Widget (Page Image Carousel)
**What:** Renders pre-converted page images with auto-advance, similar to Google Slides widget
**When to use:** Displaying documents on screen
**Example:**
```jsx
// src/player/components/widgets/DocumentWidget.jsx
export function DocumentWidget({ props = {} }) {
  const {
    mediaId,
    pageIntervalSeconds = 10,
    loop = true,
    transition = 'crossfade',
  } = props;

  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Load page URLs from media asset config_json
  useEffect(() => {
    if (!mediaId) return;
    getMediaAsset(mediaId).then((asset) => {
      setPages(asset?.config_json?.convertedPages || []);
    });
  }, [mediaId]);

  // Auto-advance pages
  useEffect(() => {
    if (pages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => {
        const next = prev + 1;
        if (next >= pages.length) return loop ? 0 : prev;
        return next;
      });
    }, pageIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [pages.length, pageIntervalSeconds, loop]);

  if (!pages.length) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <img
        src={pages[currentPage]}
        alt={`Page ${currentPage + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      {/* Page indicator */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, ... }}>
        {currentPage + 1} / {pages.length}
      </div>
    </div>
  );
}
```

### Pattern 3: Calendar OAuth Flow (Extends cloudOAuthService)
**What:** OAuth PKCE flow for Google Calendar and Outlook, following the established Google Drive pattern
**When to use:** Connecting calendar accounts
**Example:**
```javascript
// src/services/cloud/googleCalendarService.js
import {
  CLOUD_PROVIDERS,
  generateCodeVerifier,
  generateCodeChallenge,
  saveOAuthState,
  validateOAuthState,
  saveTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
} from './cloudOAuthService';

// Add to CLOUD_PROVIDERS in cloudOAuthService.js:
// GOOGLE_CALENDAR: 'gcal',
// OUTLOOK_CALENDAR: 'outlook_cal',

const PROVIDER = 'gcal';
const GOOGLE_CALENDAR_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

export async function startGoogleCalendarOAuth() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();
  saveOAuthState(PROVIDER, { codeVerifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_CALENDAR_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/cloud/callback?provider=${PROVIDER}`,
    scope: GOOGLE_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  window.location.href = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}
```

### Pattern 4: Calendar Proxy Edge Function
**What:** Server-side event fetching with caching, following the rss-proxy pattern
**When to use:** Calendar widget data refresh
**Example:**
```typescript
// supabase/functions/calendar-proxy/index.ts
// Pattern: Same as rss-proxy but fetches from Google Calendar / Microsoft Graph

async function handleFetchEvents(
  supabaseAdmin: any,
  params: { provider: string; calendarId: string; accessToken: string; refreshToken?: string },
): Promise<Response> {
  const { provider, calendarId, accessToken } = params;

  // Check cache first
  const { data: cached } = await supabaseAdmin
    .from('calendar_event_cache')
    .select('*')
    .eq('calendar_id', calendarId)
    .eq('provider', provider)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return jsonResponse({ ok: true, data: cached.events, meta: { cached: true } });
  }

  // Fetch from provider
  let events;
  if (provider === 'gcal') {
    events = await fetchGoogleCalendarEvents(calendarId, accessToken);
  } else if (provider === 'outlook_cal') {
    events = await fetchOutlookCalendarEvents(accessToken);
  }

  // Cache and return
  await supabaseAdmin.from('calendar_event_cache').upsert({
    calendar_id: calendarId,
    provider,
    events,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5-min TTL
  }, { onConflict: 'calendar_id,provider' });

  return jsonResponse({ ok: true, data: events, meta: { cached: false } });
}

async function fetchGoogleCalendarEvents(calendarId: string, accessToken: string) {
  const now = new Date().toISOString();
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?`
    + `timeMin=${now}&timeMax=${maxDate}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(normalizeGoogleEvent);
}

async function fetchOutlookCalendarEvents(accessToken: string) {
  const now = new Date().toISOString();
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?`
    + `startDateTime=${now}&endDateTime=${maxDate}&$top=50&$orderby=start/dateTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Microsoft Graph API error: ${res.status}`);
  const data = await res.json();
  return (data.value || []).map(normalizeOutlookEvent);
}
```

### Pattern 5: Widget Registry Extension
**What:** Two new entries in the established widget registry
**When to use:** Registering document and calendar widgets
**Example:**
```javascript
// src/widgets/registry.js -- add these entries
import { FileText, CalendarDays } from 'lucide-react';
import { DocumentWidget } from '../player/components/widgets/index.js';
import { CalendarWidget } from '../player/components/widgets/index.js';

// In WIDGET_REGISTRY:
document: {
  component: DocumentWidget,
  icon: FileText,
  label: 'Document',
  defaultProps: {
    mediaId: '',
    pageIntervalSeconds: 10,
    loop: true,
    transition: 'crossfade',
  },
},

calendar: {
  component: CalendarWidget,
  icon: CalendarDays,
  label: 'Calendar',
  defaultProps: {
    sources: [],
    refreshIntervalMinutes: 5,
    maxEvents: 10,
    showEndTime: true,
    dateFormat: 'short',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    theme: 'dark',
  },
},
```

### Anti-Patterns to Avoid
- **Client-side PDF rendering on smart TVs:** WebOS and Tizen browsers cannot reliably render PDFs. Always use pre-converted images. Never send raw PDF/Office files to the player.
- **Client-side Google/Microsoft API calls from player:** The player runs on unattended screens without user interaction. OAuth tokens must be stored server-side and fetched via the calendar-proxy Edge Function.
- **Blocking upload on conversion completion:** Document conversion (especially Office files) can take 10-30 seconds. Upload must return immediately with `conversionStatus: 'pending'`. UI polls for completion.
- **Storing OAuth tokens in the database without encryption:** Calendar OAuth tokens grant access to user calendars. Store refresh tokens encrypted at rest (or use Supabase Vault if available). Access tokens in localStorage are acceptable for the editor UI (already the pattern for cloud storage).
- **Converting Office files in Edge Functions:** Deno Edge Functions cannot run LibreOffice. Office conversion MUST use an external Docker service (Gotenberg).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF page rendering | Custom canvas-based PDF renderer | `magick-wasm` in Edge Function | ImageMagick handles PDF rendering via Ghostscript internally; battle-tested for 30+ years |
| Office-to-PDF conversion | Custom document parser | Gotenberg (Docker) wrapping LibreOffice | Office document formats are absurdly complex; LibreOffice is the only reliable FOSS converter |
| Google Calendar OAuth | Custom OAuth token management | Extend `cloudOAuthService.js` with PKCE | PKCE, state validation, token refresh already implemented and tested for 5 cloud providers |
| Microsoft OAuth | Custom MSAL integration | Same `cloudOAuthService.js` pattern | Microsoft identity platform v2.0 supports standard OAuth 2.0 with PKCE; no MS-specific SDK needed |
| Calendar event normalization | Custom parsers per provider | Normalize in `calendar-proxy` Edge Function | Google and Microsoft return different event schemas; normalize to common shape server-side, not in widget |
| Document page caching | Custom IndexedDB store | Existing `cacheService.js` media store | Already has LRU eviction, blob storage, and offline support for all media types |

**Key insight:** This phase connects to two types of external complexity -- document format rendering (solved by ImageMagick/LibreOffice) and OAuth-secured calendar APIs (solved by reusing the established cloud OAuth pattern). Neither should be built from scratch.

## Common Pitfalls

### Pitfall 1: Edge Function Memory Limits for Large PDFs
**What goes wrong:** A 200-page PDF at high resolution exceeds the Edge Function's memory limit (256-512 MB) and the function crashes.
**Why it happens:** `magick-wasm` loads the entire PDF and renders pages in memory. Large PDFs with embedded images can consume several GB of RAM.
**How to avoid:** Process pages in batches (e.g., 10 at a time). Use `Deno.writeFile()` to write each rendered page to `/tmp` ephemeral storage before uploading to Supabase Storage. Set a maximum page count (e.g., 100 pages). Render at screen-appropriate resolution (1920x1080) not print resolution (300 DPI).
**Warning signs:** Edge Function returns 500 errors intermittently; works for small PDFs but fails on large ones.

### Pitfall 2: Office Conversion Requires External Service
**What goes wrong:** Developer tries to convert Word/PPT/Excel inside a Deno Edge Function and discovers LibreOffice cannot run in WASM.
**Why it happens:** LibreOffice is a native C++ application. There is no WASM port. Edge Functions only support WASM-based libraries.
**How to avoid:** Use Gotenberg as a Docker sidecar service. The Edge Function calls Gotenberg's HTTP API to convert Office files to PDF, then processes the PDF pages to images.
**Warning signs:** Looking for `libreoffice-wasm` or `docx-to-pdf` npm packages that work in Deno.

### Pitfall 3: OAuth Token Refresh Race Condition
**What goes wrong:** Multiple calendar sources refresh their tokens simultaneously, and one overwrites the other's refresh token.
**Why it happens:** Google and Microsoft return new refresh tokens on each token refresh. If two sources use the same provider and refresh concurrently, the last one to save wins.
**How to avoid:** Store tokens per calendar source (not per provider). Use `calendar_id` as the token storage key. The `cloudOAuthService.js` pattern already keys by provider, but calendar needs per-source keying.
**Warning signs:** One calendar source stops working after another refreshes its token.

### Pitfall 4: Google Calendar API Requires Published Calendar or OAuth
**What goes wrong:** Developer tries to fetch events from a private calendar without OAuth, getting 404 or 403 errors.
**Why it happens:** Google Calendar events are private by default. Only public calendars are accessible without authentication.
**How to avoid:** Always require OAuth for Google Calendar. The `calendar-proxy` Edge Function must use the user's access token for every request. For public calendars, the user can use the iCal URL directly (but this is not the primary use case).
**Warning signs:** API returns "Not Found" for calendars that clearly exist.

### Pitfall 5: Microsoft Graph API Requires Admin Consent for Organizational Calendars
**What goes wrong:** User connects their Outlook account but the widget shows "Access Denied" for shared/organizational calendars.
**Why it happens:** Microsoft Graph uses a two-tier permission model. `Calendars.ReadBasic` with delegated permissions only grants access to the user's own calendars. Accessing shared calendars requires `Calendars.Read` or admin consent.
**How to avoid:** Start with `Calendars.ReadBasic` (least privilege). Document that shared calendar access requires `Calendars.Read` and may need admin consent in Azure AD. Use `Calendars.Read` scope if the primary use case is organizational calendars (meeting room displays).
**Warning signs:** Widget shows the user's personal calendar but not shared/room calendars.

### Pitfall 6: Document Conversion Status Not Reflected in UI
**What goes wrong:** User uploads a document and the UI shows "pending" indefinitely because there is no status polling.
**Why it happens:** Document conversion is async. The UI must poll for completion.
**How to avoid:** Implement status polling with exponential backoff (1s, 2s, 4s, 8s, max 30s). Show a progress indicator with conversion status. Use Supabase Realtime subscription on the `media_assets` row for instant notification when `config_json.conversionStatus` changes.
**Warning signs:** Users refresh the page manually to see if conversion is done.

## Code Examples

### Document MIME Type Validation
```javascript
// Extend getMediaTypeFromMime() in mediaService.js
// Source: Codebase pattern from src/services/mediaService.js
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',                                                    // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint',                                         // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel',                                              // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',     // .xlsx
];

export function isDocumentMimeType(mimeType) {
  return DOCUMENT_MIME_TYPES.includes(mimeType);
}
```

### Doc-Converter Edge Function (PDF to Images)
```typescript
// supabase/functions/doc-converter/index.ts
// Source: Supabase Edge Functions Image Manipulation docs pattern
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickReadSettings,
} from 'npm:@imagemagick/magick-wasm@0.0.30';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize magick-wasm at startup
const wasmBytes = await Deno.readFile(
  new URL('magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.30')),
);
await initializeImageMagick(wasmBytes);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { mediaId, storageUrl, mimeType } = await req.json();

  try {
    // 1. Download the document from storage
    const docResponse = await fetch(storageUrl);
    const docBytes = new Uint8Array(await docResponse.arrayBuffer());

    // 2. For Office files: convert to PDF via Gotenberg first
    let pdfBytes = docBytes;
    if (mimeType !== 'application/pdf') {
      pdfBytes = await convertOfficeToPdf(docBytes, mimeType);
    }

    // 3. Render each PDF page to PNG
    const pageUrls: string[] = [];
    const settings = new MagickReadSettings();
    settings.density = 150; // 150 DPI -- good balance of quality and size

    ImageMagick.readCollection(pdfBytes, settings, (images) => {
      let pageIndex = 0;
      for (const page of images) {
        page.write(MagickFormat.Png, async (pageData) => {
          // Upload to Supabase Storage
          const pagePath = `documents/pages/${mediaId}/page-${String(pageIndex).padStart(3, '0')}.png`;
          await supabaseAdmin.storage.from('media').upload(pagePath, pageData, {
            contentType: 'image/png',
          });
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('media').getPublicUrl(pagePath);
          pageUrls.push(publicUrl);
        });
        pageIndex++;
      }
    });

    // 4. Update media asset with converted page URLs
    await supabaseAdmin
      .from('media_assets')
      .update({
        config_json: {
          conversionStatus: 'complete',
          convertedPages: pageUrls,
          pageCount: pageUrls.length,
        },
        thumbnail_url: pageUrls[0] || null,
      })
      .eq('id', mediaId);

    return jsonResponse({ ok: true, pageCount: pageUrls.length });
  } catch (err) {
    // Update media asset with error status
    await supabaseAdmin
      .from('media_assets')
      .update({
        config_json: {
          conversionStatus: 'error',
          conversionError: err.message,
        },
      })
      .eq('id', mediaId);

    return jsonResponse({ ok: false, error: err.message }, 500);
  }
});
```

### Google Calendar Event Fetch
```javascript
// Source: Google Calendar API v3 docs
// https://developers.google.com/workspace/calendar/api/v3/reference/events/list

async function fetchGoogleCalendarEvents(calendarId, accessToken) {
  const now = new Date().toISOString();
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin: now,
    timeMax: oneWeekFromNow,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);
  const data = await res.json();

  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    startTime: event.start?.dateTime || event.start?.date,
    endTime: event.end?.dateTime || event.end?.date,
    allDay: !event.start?.dateTime,
    location: event.location || null,
    color: event.colorId || null,
  }));
}
```

### Microsoft Graph Calendar Event Fetch
```javascript
// Source: Microsoft Graph API v1.0 docs
// https://learn.microsoft.com/en-us/graph/api/user-list-calendarview

async function fetchOutlookCalendarEvents(accessToken) {
  const now = new Date().toISOString();
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView`
    + `?startDateTime=${now}&endDateTime=${oneWeekFromNow}`
    + `&$top=50&$orderby=start/dateTime`
    + `&$select=subject,start,end,location,isAllDay,bodyPreview`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Prefer': 'outlook.timezone="UTC"',
      },
    },
  );

  if (!res.ok) throw new Error(`Microsoft Graph API error: ${res.status}`);
  const data = await res.json();

  return (data.value || []).map((event) => ({
    id: event.id,
    title: event.subject || '(No title)',
    description: event.bodyPreview || '',
    startTime: event.start?.dateTime,
    endTime: event.end?.dateTime,
    allDay: event.isAllDay || false,
    location: event.location?.displayName || null,
    color: null,
  }));
}
```

### Widget Registry Registration
```javascript
// Source: src/widgets/registry.js existing pattern
import { FileText, CalendarDays } from 'lucide-react';

// Add to WIDGET_REGISTRY in src/widgets/registry.js
document: {
  component: DocumentWidget,
  icon: FileText,
  label: 'Document',
  defaultProps: {
    mediaId: '',
    pageIntervalSeconds: 10,
    loop: true,
  },
},

calendar: {
  component: CalendarWidget,
  icon: CalendarDays,
  label: 'Calendar',
  defaultProps: {
    sources: [],
    refreshIntervalMinutes: 5,
    maxEvents: 10,
    showEndTime: true,
    textColor: '#ffffff',
    accentColor: '#3b82f6',
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side PDF.js rendering | Server-side pre-rendering to images | Always for smart TV signage | Smart TVs cannot run PDF.js; images are universally supported |
| Google Calendar API v2 | Google Calendar API v3 | 2014 | v2 deprecated and shut down |
| Microsoft EWS (Exchange Web Services) | Microsoft Graph API v1.0 | 2020+ | EWS deprecated; Graph is the unified Microsoft API |
| OAuth 2.0 implicit flow | OAuth 2.0 + PKCE (Authorization Code) | 2019+ | Implicit flow deprecated by OAuth Security BCP; PKCE is the standard for SPAs |
| `@azure/msal-browser` for MS auth | Standard OAuth 2.0 + PKCE | Current | MSAL adds 50KB+ bundle; Microsoft identity platform v2.0 supports standard OAuth without MS-specific SDK |
| LibreOffice-as-a-service (custom) | Gotenberg (containerized API) | 2020+ | Gotenberg wraps LibreOffice with a clean REST API; no custom glue code needed |

**Deprecated/outdated:**
- Google Calendar API v2: completely removed, only v3 is available
- Microsoft EWS (Exchange Web Services): deprecated in favor of Microsoft Graph API
- OAuth implicit flow: deprecated by RFC 9700; use Authorization Code + PKCE

## Open Questions

1. **magick-wasm PDF rendering quality and reliability**
   - What we know: `magick-wasm` is documented by Supabase for image manipulation. ImageMagick can read PDFs (via Ghostscript delegate). The WASM port may or may not include the Ghostscript delegate.
   - What's unclear: Whether the WASM build of ImageMagick actually supports PDF input. Some WASM builds strip the Ghostscript delegate for size reasons.
   - Recommendation: Test with a sample PDF in a local Edge Function before planning. If `magick-wasm` cannot read PDFs, fall back to a Gotenberg-only pipeline where Gotenberg converts PDFs directly to PNG images (it supports this natively via Chromium/LibreOffice).

2. **Gotenberg deployment and hosting**
   - What we know: Gotenberg runs as a Docker container alongside the app. The Edge Function calls it via HTTP.
   - What's unclear: Where to host Gotenberg in production. Supabase does not offer Docker sidecar hosting. Options: Railway, Fly.io, AWS ECS, or a VM.
   - Recommendation: For development, run Gotenberg in Docker Compose. For production, deploy on Fly.io or Railway (cheapest, simplest). Document the deployment in the PLAN. If Gotenberg hosting is too complex, consider API2PDF ($1/month for 800 conversions) as an alternative.

3. **Calendar OAuth token storage for player-side refresh**
   - What we know: The editor UI stores tokens in localStorage via `cloudOAuthService.js`. The player needs to fetch calendar events but runs on unattended screens.
   - What's unclear: How the player gets access tokens without user interaction.
   - Recommendation: Store encrypted refresh tokens in the database (linked to the widget instance). The `calendar-proxy` Edge Function receives the widget's `sourceId`, looks up the stored refresh token, refreshes the access token, and fetches events. The player calls the Edge Function with the JWT auth header (Supabase session), not direct API tokens.

4. **Multiple calendar sources per widget**
   - What we know: CAL-05 requires "multiple calendar sources per widget instance."
   - What's unclear: Whether this means multiple calendars from the same provider (e.g., 3 Google calendars) or across providers (Google + Outlook in one widget).
   - Recommendation: Support both. The `sources` array in widget props holds `{ id, provider, calendarId, label }` entries. The `calendar-proxy` Edge Function accepts a source ID and returns events. The widget merges events from all sources and displays a unified list. The controls panel has an "Add Calendar" button that opens a provider picker.

## Database Schema Additions

```sql
-- Migration 164: Document conversion and calendar support

-- Add conversion metadata fields to config_json convention
-- (No schema change needed -- config_json JSONB already holds arbitrary data)
-- Convention: config_json = { conversionStatus, convertedPages, pageCount, conversionError }

-- Calendar event cache table (follows rss_feed_cache pattern)
CREATE TABLE IF NOT EXISTS public.calendar_event_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gcal', 'outlook_cal')),
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(calendar_id, provider)
);

-- Index for TTL-based cache lookups
CREATE INDEX idx_calendar_cache_expiry
ON public.calendar_event_cache(calendar_id, provider, expires_at);

-- Calendar OAuth tokens (for player-side refresh)
CREATE TABLE IF NOT EXISTS public.calendar_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gcal', 'outlook_cal')),
  calendar_id TEXT NOT NULL,
  label TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, provider, calendar_id)
);

-- RLS: users can only access their own calendar tokens
ALTER TABLE public.calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own calendar tokens"
  ON public.calendar_oauth_tokens
  FOR ALL
  USING (owner_id = auth.uid());

-- Index for token lookup by owner
CREATE INDEX idx_calendar_tokens_owner
ON public.calendar_oauth_tokens(owner_id, provider);
```

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation) - magick-wasm pattern for WASM-based image processing in Deno Edge Functions
- [Supabase Edge Functions Ephemeral Storage](https://supabase.com/docs/guides/functions/ephemeral-storage) - `/tmp` directory with 256-512MB limit for file processing
- [Supabase Edge Functions WASM](https://supabase.com/docs/guides/functions/wasm) - WASM module usage in Edge Functions
- [Google Calendar API v3 Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) - REST endpoint, scopes, response format
- [Google Calendar API Scopes](https://developers.google.com/workspace/calendar/api/auth) - `calendar.events.readonly` for read-only access
- [Microsoft Graph API calendarView](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0) - REST endpoint, permissions, response format
- [Microsoft Graph Calendar API Overview](https://learn.microsoft.com/en-us/graph/api/resources/calendar-overview?view=graph-rest-1.0) - Calendar resource model
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) - OAuth 2.0 + PKCE for Google APIs

### Secondary (MEDIUM confidence)
- [Gotenberg](https://gotenberg.dev/) - Containerized API for document-to-PDF conversion via LibreOffice
- [magick-wasm GitHub](https://github.com/dlemstra/magick-wasm) - WASM port of ImageMagick; Deno compatibility issue #81 (resolved with explicit wasm file loading)
- [pdf-to-img npm](https://www.npmjs.com/package/pdf-to-img) - Alternative PDF-to-image library using pdfjs-dist + canvas (Node.js only, not Deno)
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist) - Mozilla PDF.js for PDF rendering (requires canvas library for Node.js)

### Tertiary (LOW confidence)
- [API2PDF](https://www.api2pdf.com/) - SaaS alternative to self-hosted Gotenberg. $1/month for 800 conversions. Not verified in production.

### Codebase (HIGH confidence)
- `src/widgets/registry.js` - Widget registration pattern (15 existing entries including 4 from Phase 108)
- `src/services/cloud/cloudOAuthService.js` - PKCE + state management for OAuth flows (5 providers: gdrive, dropbox, onedrive, sharepoint, gphotos)
- `src/services/cloud/googleDriveService.js` - Google OAuth flow pattern (PKCE, redirect URI, token exchange)
- `src/services/mediaService.js` - Media upload, MIME type detection, `MEDIA_TYPES.DOCUMENT` already defined
- `src/services/embedUtils.js` - URL parsing and validation utilities pattern
- `src/player/components/widgets/GoogleSlidesWidget.jsx` - Auto-advancing content widget pattern (closest to document widget)
- `supabase/functions/rss-proxy/index.ts` - Server-side fetch + cache Edge Function pattern
- `supabase/functions/api-gateway/index.ts` - Edge Function with JWT auth and S3 integration
- `supabase/functions/_shared/cors.ts` - Shared CORS headers for Edge Functions
- `src/components/scene-editor/EmbedWidgetControls.jsx` - Widget controls panel pattern (onPropChange adapter)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - magick-wasm documented by Supabase; calendar APIs are mature stable REST endpoints; all patterns have codebase precedent
- Architecture: HIGH - Widget registry pattern proven with 15 entries; OAuth pattern proven with 5 providers; Edge Function pattern proven with 5 functions
- Document conversion: MEDIUM - magick-wasm PDF support in WASM build unverified; Gotenberg integration straightforward but requires external hosting
- Calendar integration: HIGH - Google Calendar API v3 and Microsoft Graph API are well-documented stable APIs; OAuth pattern directly reuses existing code
- Pitfalls: HIGH - Smart TV rendering limitations well-understood; OAuth token management patterns established

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days - stable domain; Google/Microsoft APIs change infrequently)
