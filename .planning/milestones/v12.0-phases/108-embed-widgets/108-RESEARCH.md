# Phase 108: Embed Widgets - Research

**Researched:** 2026-03-03
**Domain:** iframe-based embed widgets (YouTube, Vimeo, Web Page, Google Slides) for digital signage
**Confidence:** HIGH

## Summary

Phase 108 adds 4 new widget types to BizScreen's established widget registry: YouTube, Vimeo, Web Page, and Google Slides. All 4 render via `<iframe>` on the player with platform-specific URL parameters. The implementation follows the project's one-file-registration pattern -- one entry in `src/widgets/registry.js` per widget, one player component in `src/player/components/widgets/`, and one controls component in `src/components/scene-editor/`. Offline fallback uses cached thumbnails stored in IndexedDB via the existing `cacheService.js`.

The core technical challenge is URL parsing/normalization (YouTube alone has 5+ URL formats), iframe security (sandbox + permissions policy attributes), and browser autoplay policies (all platforms require `mute=1` for autoplay without user interaction). Thumbnail capture is straightforward -- YouTube provides free static URLs, Vimeo provides a no-auth oEmbed API, and Google Slides exposes first-slide export URLs.

**Primary recommendation:** Implement as 4 separate widget components following the WeatherWidget/RssCardWidget pattern exactly: each receives `{ props, timezone }`, uses no external state, and renders a self-contained iframe with platform-specific parameters. Create a shared `embedUtils.js` service for URL parsing, validation, and thumbnail resolution used by both editor controls and player components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 4 separate widget type entries in the registry: `youtube`, `vimeo`, `webpage`, `google-slides`
- Each gets its own icon and label in the widget picker (not a single "Embed" type)
- Follows the existing one-file registration pattern in `src/widgets/registry.js`
- Each widget gets a player component in `src/player/components/widgets/`
- When offline, all 4 embed types show a cached thumbnail with a subtle "Requires Internet" badge
- Badge only appears when device is actually offline -- not during normal loading
- During normal loading, show thumbnail as brief placeholder until iframe loads
- Web pages get thumbnail-only fallback (no HTML snapshot caching)
- Consistent fallback behavior across all 4 embed types
- Thumbnails captured on save in the editor (not on first player load)
- YouTube: fetch via YouTube thumbnail API (img.youtube.com/vi/{ID}/maxresdefault.jpg)
- Vimeo: fetch via Vimeo oEmbed API (vimeo.com/api/oembed.json?url={URL})
- Google Slides: fetch first slide thumbnail from the published URL
- Web pages: extract Open Graph image or use a screenshot approach
- Autoplay always on for YouTube/Vimeo (digital signage)
- Two configurable options for video: mute toggle + loop toggle
- Web Page: URL input, auto-refresh dropdown (5/15/30/60 min), zoom/scale slider
- Google Slides: URL input, auto-advance interval dropdown (5/10/15/30/60 seconds)
- Google Slides rendered via published embed URL (File > Share > Publish to web)
- No OAuth needed for Google Slides -- purely URL-based
- If user pastes regular Slides URL (not published), show helpful instruction
- Validate URLs on paste/blur with inline preview thumbnail
- Accept all common URL formats and normalize (YouTube: watch?v=, youtu.be/, embed/, shorts/; Vimeo: vimeo.com/{ID}, player.vimeo.com/video/{ID}; Google Slides: /pub, /edit)
- Inline error messages for invalid/private URLs (red border + explanation)
- Don't block saving on validation failure
- All 4 embed types share common panel layout: URL input at top, type-specific options below
- Reuse existing prop adapter pattern (onPropChange adapter bridging scene/layout editor)

### Claude's Discretion
- Exact iframe sandbox attributes and permissions (allow-scripts, allow-same-origin, etc.)
- Error recovery behavior when an iframe fails to load
- Loading spinner design during iframe initialization
- Thumbnail image size/quality tradeoffs
- Whether to use YouTube's iframe API or a plain iframe

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EMBED-01 | User can add a YouTube video widget to a layout zone with a video URL | Widget registry pattern (one entry in registry.js), YouTube URL parser extracts video ID from 5+ formats, editor controls with URL input + validation |
| EMBED-02 | User can add a Vimeo video widget to a layout zone with a video URL | Same registry pattern, Vimeo URL parser extracts video ID from 2 formats, editor controls with URL input + validation |
| EMBED-03 | YouTube/Vimeo widget plays the video on the screen player via iframe embed | Iframe with platform-specific embed URLs + autoplay/mute/loop parameters + `allow="autoplay"` permissions policy |
| EMBED-04 | YouTube/Vimeo widget shows cached thumbnail with "requires internet" message when offline | Thumbnail fetched on save (YouTube static URL, Vimeo oEmbed), cached in IndexedDB media store, offline detection via `offlineService.isOnline()` |
| EMBED-05 | User can add a web page widget to a layout zone with a URL | Registry entry + editor controls with URL input, zoom slider, auto-refresh dropdown |
| EMBED-06 | Web page widget displays the live website on the screen player | Plain iframe with the URL, `sandbox="allow-scripts allow-same-origin allow-forms"`, auto-refresh via key-based remount |
| EMBED-07 | User can configure auto-refresh interval for web page widget | Dropdown with 5/15/30/60 minute options, `setInterval` triggers iframe remount via React key |
| SLIDES-01 | User can add a Google Slides widget to a layout zone | Registry entry + editor controls, URL parser extracts presentation ID from /pub and /edit formats |
| SLIDES-02 | User can paste a Google Slides URL to display a presentation | URL validation with helpful guidance when pasting /edit URLs, embed URL construction from presentation ID |
| SLIDES-03 | Google Slides widget renders slides on screen with configurable auto-advance interval | Embed URL parameters: `?start=true&loop=true&delayms={ms}`, interval dropdown maps to delayms values |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | Component framework | Already in project, all widgets are React components |
| lucide-react | 0.548.0 | Widget icons | Already used for all widget type icons in registry |
| idb | 8.0.3 | IndexedDB wrapper | Already used by cacheService.js for thumbnail storage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| isomorphic-dompurify | 2.35.0 | HTML sanitization | Already in project -- use for sanitizing any HTML in OG meta extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain iframe for YouTube | YouTube IFrame Player API (JS SDK) | Player API gives event callbacks (onStateChange, onError) and programmatic control, but adds ~200KB and complexity unnecessary for digital signage autoplay-only use case. Plain iframe with URL parameters is sufficient. |
| Custom URL parser | url-regex / get-youtube-id npm | External deps for something achievable with 20 lines of regex. Keep deps minimal. |
| html2canvas for web page thumbnails | Puppeteer/Playwright server-side | html2canvas is already in the project but cannot screenshot cross-origin iframes. Server-side screenshot would need backend. For MVP, use OG image extraction (client-side fetch to `/api/og-image` edge function). |

**Installation:**
```bash
# No new dependencies required
# All needed libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── widgets/
│   └── registry.js                    # Add 4 entries: youtube, vimeo, webpage, google-slides
├── services/
│   └── embedUtils.js                  # NEW: URL parsing, validation, thumbnail resolution (shared by editor + player)
├── player/
│   ├── components/
│   │   └── widgets/
│   │       ├── YouTubeWidget.jsx      # NEW: YouTube player iframe
│   │       ├── VimeoWidget.jsx        # NEW: Vimeo player iframe
│   │       ├── WebPageWidget.jsx      # NEW: Web page iframe with auto-refresh
│   │       ├── GoogleSlidesWidget.jsx # NEW: Google Slides embed iframe
│   │       ├── EmbedOfflineFallback.jsx # NEW: Shared offline thumbnail + badge component
│   │       └── index.js              # Add 4 new exports
│   └── cacheService.js              # Add thumbnail caching functions (new THUMBNAILS store)
├── components/
│   └── scene-editor/
│       └── EmbedWidgetControls.jsx   # NEW: Shared controls for all 4 embed types (URL input, inline preview, type-specific options)
```

### Pattern 1: Widget Registration (Established)
**What:** Single registry entry auto-wires rendering, editor, and factory paths
**When to use:** Every new widget type
**Example:**
```javascript
// Source: src/widgets/registry.js (existing pattern)
import { Youtube } from 'lucide-react';
import { YouTubeWidget } from '../player/components/widgets/index.js';

export const WIDGET_REGISTRY = {
  // ... existing entries ...
  youtube: {
    component: YouTubeWidget,
    icon: Youtube,
    label: 'YouTube',
    defaultProps: {
      url: '',
      muted: true,
      loop: true,
      thumbnailUrl: '',
    },
  },
};
```

### Pattern 2: Embed Player Widget Component
**What:** Self-contained iframe widget that handles online/offline states
**When to use:** All 4 embed widget types
**Example:**
```jsx
// Pattern derived from WeatherWidget/RssCardWidget structure
export function YouTubeWidget({ props = {} }) {
  const { url, muted = true, loop = true, thumbnailUrl } = props;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // Construct embed URL with parameters
  const embedUrl = buildYouTubeEmbedUrl(videoId, { muted, loop });

  // Offline: show cached thumbnail
  if (!isOnline) {
    return <EmbedOfflineFallback thumbnailUrl={thumbnailUrl} label="YouTube" />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Thumbnail placeholder while iframe loads */}
      {!iframeLoaded && thumbnailUrl && (
        <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <iframe
        src={embedUrl}
        title="YouTube video"
        allow="autoplay; encrypted-media"
        allowFullScreen
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', border: 'none',
          opacity: iframeLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={() => setIframeLoaded(true)}
      />
    </div>
  );
}
```

### Pattern 3: URL Parsing Service
**What:** Pure functions for extracting IDs and building embed URLs
**When to use:** Shared between editor controls (validation/preview) and player components (rendering)
**Example:**
```javascript
// src/services/embedUtils.js

/** Extract YouTube video ID from any URL format */
export function extractYouTubeId(url) {
  if (!url) return null;
  // Handles: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

/** Build YouTube embed URL with parameters */
export function buildYouTubeEmbedUrl(videoId, { muted = true, loop = true } = {}) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
  });
  // YouTube loop requires playlist parameter with same video ID
  if (loop) params.set('playlist', videoId);
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

/** Extract Vimeo video ID from any URL format */
export function extractVimeoId(url) {
  if (!url) return null;
  // Handles: vimeo.com/{ID}, player.vimeo.com/video/{ID}
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return match?.[1] || null;
}

/** Build Vimeo embed URL with parameters */
export function buildVimeoEmbedUrl(videoId, { muted = true, loop = true } = {}) {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    autopause: '0',
    background: '0',
    controls: '1',
  });
  return `https://player.vimeo.com/video/${videoId}?${params}`;
}

/** Extract Google Slides presentation ID */
export function extractGoogleSlidesId(url) {
  if (!url) return null;
  const match = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

/** Detect if a Google Slides URL is a published URL */
export function isPublishedSlidesUrl(url) {
  return /\/pub(\?|$|#)/.test(url) || /\/embed(\?|$|#)/.test(url);
}

/** Build Google Slides embed URL */
export function buildGoogleSlidesEmbedUrl(presentationId, { delayMs = 5000, loop = true } = {}) {
  const params = new URLSearchParams({
    start: 'true',
    loop: loop ? 'true' : 'false',
    delayms: String(delayMs),
  });
  return `https://docs.google.com/presentation/d/${presentationId}/embed?${params}`;
}

/** Get YouTube thumbnail URL (no API call needed) */
export function getYouTubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Get Vimeo thumbnail URL via oEmbed (async, no auth needed) */
export async function getVimeoThumbnailUrl(videoUrl) {
  const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.thumbnail_url || null;
}

/** Validate URL for embed widget */
export function validateEmbedUrl(url, type) {
  if (!url) return { valid: false, error: 'URL is required' };
  try { new URL(url); } catch { return { valid: false, error: 'Invalid URL format' }; }
  // Type-specific validation...
}
```

### Pattern 4: Shared Editor Controls (onPropChange Adapter)
**What:** Reusable controls component receiving `{ props, onPropChange }` for use in both scene editor and layout editor
**When to use:** All widget control panels
**Example:**
```jsx
// Follows RssWidgetControls / QRCodeWidgetControls pattern exactly
export function EmbedWidgetControls({ widgetType, props, onPropChange }) {
  // URL input with validation + inline thumbnail preview
  // Type-specific options below
}

// Consumed in LayoutPropertiesPanel.jsx:
{(widgetType === 'youtube' || widgetType === 'vimeo' || widgetType === 'webpage' || widgetType === 'google-slides') && (
  <EmbedWidgetControls
    widgetType={widgetType}
    props={props}
    onPropChange={(key, value) => onPropsUpdate({ [key]: value })}
  />
)}
```

### Pattern 5: Offline Fallback Component (Shared)
**What:** Reusable component showing cached thumbnail + "Requires Internet" badge
**When to use:** All 4 embed types when device is offline
**Example:**
```jsx
export function EmbedOfflineFallback({ thumbnailUrl, label }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a',
    }}>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
      ) : (
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</div>
      )}
      <div style={{
        position: 'absolute', bottom: '0.5rem', right: '0.5rem',
        background: 'rgba(0,0,0,0.7)', color: '#94a3b8',
        padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
        fontSize: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
      }}>
        <WifiOff style={{ width: 12, height: 12 }} />
        Requires Internet
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Shared "Embed" widget type with sub-type selector:** User locked decision: 4 separate entries in registry, not one umbrella type. Each type has its own icon, label, and defaultProps.
- **YouTube IFrame Player API JS SDK:** Adds 200KB+ for programmatic control nobody uses in digital signage. Plain `<iframe>` with URL parameters is sufficient.
- **Caching full web page HTML:** User locked decision: web pages get thumbnail-only fallback. HTML snapshots are too complex and pages change too often.
- **Blocking save on URL validation failure:** User locked decision: content might become available later. Show warning but allow save.
- **Using `sandbox` on YouTube/Vimeo iframes:** These providers require `allow-same-origin` for their players to function, and their own CSP headers provide security. Use `allow` permissions policy instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube URL parsing | Custom string splitting | Regex pattern matching all 5+ URL formats | Edge cases with query params, hash fragments, URL encoding; regex covers all |
| Vimeo thumbnail fetching | Direct API v3 integration | Vimeo oEmbed endpoint (no auth) | `vimeo.com/api/oembed.json?url={URL}` returns thumbnail_url, no API key needed |
| YouTube thumbnails | YouTube Data API v3 | Static URL pattern | `img.youtube.com/vi/{ID}/hqdefault.jpg` is free, no API key, no rate limits |
| Google Slides auto-advance | Custom slide detection + timer | Google's embed URL parameters | `?start=true&loop=true&delayms=5000` handled entirely by Google's embed player |
| Offline detection | Custom heartbeat polling | `navigator.onLine` + browser events | `online`/`offline` events sufficient for embed widget fallback (project already uses `offlineService.js` for deeper detection) |
| IndexedDB thumbnail storage | Custom storage layer | Existing `cacheService.js` media store | Already has LRU eviction, blob storage, and `cacheMedia()` / `getCachedMediaUrl()` functions |

**Key insight:** All 4 embed providers handle playback complexity in their own iframe. BizScreen only needs to (a) parse URLs, (b) construct embed URLs with parameters, (c) render iframes, and (d) cache thumbnails for offline. No playback logic needed.

## Common Pitfalls

### Pitfall 1: Browser Autoplay Policy Blocks Video
**What goes wrong:** YouTube/Vimeo iframe shows but video doesn't autoplay; user sees a play button overlay.
**Why it happens:** Browsers block unmuted autoplay by default. Cross-origin iframes need explicit `allow="autoplay"` in the permissions policy.
**How to avoid:**
1. Always set `mute=1` / `muted=1` as default (user locked: muted defaults to true)
2. Add `allow="autoplay; encrypted-media"` attribute to the iframe element
3. For YouTube, set both `autoplay=1` and `mute=1` URL parameters
4. For Vimeo, set `autoplay=1`, `muted=1`, and `autopause=0`
**Warning signs:** Video shows poster/thumbnail but never starts playing; console shows "Autoplay was prevented" error.

### Pitfall 2: YouTube Loop Requires playlist Parameter
**What goes wrong:** YouTube video plays once but doesn't loop despite `loop=1`.
**Why it happens:** YouTube's `loop` parameter has "limited support in IFrame embeds." For single videos, the `playlist` parameter must also be set to the same video ID.
**How to avoid:** Always append `&playlist={VIDEO_ID}` when `loop=1` is set.
**Warning signs:** Video plays through once then shows related videos or stops.

### Pitfall 3: Google Slides URL Not Published
**What goes wrong:** User pastes a `docs.google.com/presentation/d/{ID}/edit` URL and sees a Google login page or access denied in the iframe.
**Why it happens:** Only published presentations (`/pub` or `/embed` URLs) are publicly accessible. Regular edit URLs require authentication.
**How to avoid:** Detect non-published URLs and show a helpful message: "This looks like a regular Slides link. To display it on screen, publish it first: File > Share > Publish to web."
**Warning signs:** iframe shows Google sign-in page instead of presentation.

### Pitfall 4: iframe onLoad Fires Even on Error
**What goes wrong:** Developer relies on `onLoad` to detect successful iframe load, but `onLoad` fires even when the iframe content fails (returns 404, access denied, etc.).
**Why it happens:** Per HTML spec and MDN: "As a security precaution user agents do not fire the error event on iframes, and the load event is always triggered even if the iframe content fails to load."
**How to avoid:** Cannot detect iframe load failure from the parent page for cross-origin iframes. Use a timeout approach: if the iframe hasn't "confirmed" successful load within N seconds, show the thumbnail fallback. For same-origin validation, use the oEmbed/thumbnail APIs as a proxy for URL validity.
**Warning signs:** UI shows "loaded" state but iframe content is blank or shows an error page.

### Pitfall 5: Vimeo maxresdefault Equivalent Not Always Available
**What goes wrong:** YouTube `maxresdefault.jpg` returns a 404 for some older videos; Vimeo oEmbed may not return a thumbnail for private videos.
**Why it happens:** `maxresdefault.jpg` is only available for videos with HD thumbnails. Vimeo private videos don't expose thumbnails via unauthenticated oEmbed.
**How to avoid:** For YouTube, fall back to `hqdefault.jpg` (always available, 480x360). For Vimeo, handle `thumbnail_url: null` gracefully with a generic Vimeo placeholder.
**Warning signs:** Broken image icon in editor preview panel.

### Pitfall 6: Web Page iframe Blocked by X-Frame-Options
**What goes wrong:** Some websites set `X-Frame-Options: DENY` or `SAMEORIGIN`, preventing them from being displayed in an iframe.
**Why it happens:** Website security headers explicitly block iframe embedding. This is common for banking sites, social media, Google docs, etc.
**How to avoid:** Cannot circumvent this server-side -- it's by design. Show a helpful error message: "This website doesn't allow embedding. Try a different URL." Detect this in the editor by attempting to load the URL and checking for frame-ancestor CSP violations (listen for `securitypolicyviolation` events on the window).
**Warning signs:** iframe appears blank with no visible error; console shows CSP or X-Frame-Options violation.

### Pitfall 7: Google Slides Thumbnail Export URL Format
**What goes wrong:** Developer tries to fetch thumbnail via a Slides API endpoint that requires OAuth.
**Why it happens:** The Google Slides API (slides.googleapis.com) requires authentication.
**How to avoid:** Use the public export URL format instead: `https://docs.google.com/presentation/d/{ID}/export/png?pageid=p` or `https://docs.google.com/presentation/d/{ID}/export?format=png`. This works for published presentations without authentication.
**Warning signs:** 401/403 errors when trying to fetch slide thumbnails.

## Code Examples

### YouTube Embed URL Construction
```javascript
// Verified pattern from official Google docs:
// https://developers.google.com/youtube/player_parameters
function buildYouTubeEmbedUrl(videoId, { muted = true, loop = true }) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Required for single-video loop
  }
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}
// Result: https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=dQw4w9WgXcQ
```

### Vimeo Embed URL Construction
```javascript
// Verified from Vimeo Help Center documentation
function buildVimeoEmbedUrl(videoId, { muted = true, loop = true }) {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    autopause: '0',    // Required when multiple embeds on page
    background: '0',   // Keep controls visible (background mode hides all UI)
  });
  return `https://player.vimeo.com/video/${videoId}?${params}`;
}
// Result: https://player.vimeo.com/video/76979871?autoplay=1&muted=1&loop=1&autopause=0&background=0
```

### Google Slides Embed URL Construction
```javascript
// Verified from Google Slides URL parameters documentation
// Source: https://youneedawiki.com/blog/posts/google-slides-url-parameters.html
function buildGoogleSlidesEmbedUrl(presentationId, { delayMs = 5000, loop = true }) {
  const params = new URLSearchParams({
    start: 'true',
    loop: loop ? 'true' : 'false',
    delayms: String(delayMs),
  });
  return `https://docs.google.com/presentation/d/${presentationId}/embed?${params}`;
}
// Result: https://docs.google.com/presentation/d/1BxiM.../embed?start=true&loop=true&delayms=5000
```

### YouTube URL Parsing (All Formats)
```javascript
// Handles all 5 common YouTube URL formats:
// 1. https://www.youtube.com/watch?v=dQw4w9WgXcQ
// 2. https://youtu.be/dQw4w9WgXcQ
// 3. https://www.youtube.com/embed/dQw4w9WgXcQ
// 4. https://www.youtube.com/shorts/dQw4w9WgXcQ
// 5. https://www.youtube.com/v/dQw4w9WgXcQ
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}
```

### Vimeo oEmbed Thumbnail Fetch
```javascript
// Verified: no authentication required for public videos
// Source: vimeo.com/api/oembed.json endpoint
async function getVimeoThumbnail(videoUrl) {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}&width=640`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch {
    return null; // Private video or network error
  }
}
```

### Iframe with Correct Permissions (Discretion Decision)
```jsx
// YouTube/Vimeo: need autoplay + encrypted-media, no sandbox needed
// (providers handle security via their own CSP headers)
<iframe
  src={embedUrl}
  title="YouTube video"
  allow="autoplay; encrypted-media; fullscreen"
  allowFullScreen
  referrerPolicy="no-referrer-when-downgrade"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>

// Web Page: use sandbox for untrusted content
<iframe
  src={webPageUrl}
  title="Web Page"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  referrerPolicy="no-referrer"
  style={{
    width: '100%', height: '100%', border: 'none',
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: 'top left',
  }}
/>

// Google Slides: need scripts + same-origin for Google's player
<iframe
  src={slidesEmbedUrl}
  title="Google Slides"
  allow="autoplay; fullscreen"
  allowFullScreen
  referrerPolicy="no-referrer-when-downgrade"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

### Thumbnail Caching Pattern
```javascript
// Extends existing cacheService.js pattern
// Store in the existing MEDIA store (already has LRU eviction)
import { cacheMedia, getCachedMediaUrl } from '../../player/cacheService';

async function cacheThumbnail(widgetKey, thumbnailUrl) {
  if (!thumbnailUrl) return;
  try {
    const res = await fetch(thumbnailUrl);
    if (!res.ok) return;
    const blob = await res.blob();
    await cacheMedia(`thumbnail:${widgetKey}`, blob);
  } catch {
    // Silent fail -- thumbnail is non-critical
  }
}

async function getCachedThumbnail(widgetKey) {
  return getCachedMediaUrl(`thumbnail:${widgetKey}`);
}
```

### Web Page Auto-Refresh Pattern
```jsx
// Follows existing WebPageApp pattern in AppRenderer.jsx
function WebPageWidget({ props = {} }) {
  const { url, refreshIntervalMinutes = 0, zoom = 1 } = props;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!refreshIntervalMinutes || refreshIntervalMinutes <= 0) return;
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, refreshIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshIntervalMinutes]);

  return (
    <iframe
      key={refreshKey}  // Forces iframe reload
      src={url}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{
        width: zoom !== 1 ? `${100 / zoom}%` : '100%',
        height: zoom !== 1 ? `${100 / zoom}%` : '100%',
        border: 'none',
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: 'top left',
      }}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| YouTube Flash embeds | YouTube iframe embeds with URL parameters | 2015+ | Only iframe embeds supported |
| YouTube `mute` not needed for autoplay | All browsers require `mute=1` for cross-origin autoplay | Chrome 66 (2018), gradually adopted by all browsers | Must default to muted for autoplay to work |
| Vimeo old API (`vimeo.com/api/v2`) | Vimeo oEmbed (`vimeo.com/api/oembed.json`) | 2017+ | Old API deprecated, oEmbed is current |
| Vimeo `mute=1` | Vimeo `muted=1` | 2020+ | Parameter name changed from `mute` to `muted` |
| Google Slides `/preview` URL | Google Slides `/embed` URL | Current | `/embed` is the standard for iframe embedding |
| `allowfullscreen` attribute | `allow="fullscreen"` permissions policy | 2018+ | Both still work but `allow` is the modern standard |

**Deprecated/outdated:**
- YouTube Flash Player API: completely removed, use iframe API or plain iframe only
- Vimeo old API v2 (`/api/v2/video/{id}.json`): deprecated, use oEmbed endpoint
- `frameborder` attribute on iframe: deprecated in HTML5, use `border: none` CSS instead

## Discretion Decisions (Recommendations)

### Iframe Sandbox & Permissions
**Recommendation:** Do NOT use `sandbox` attribute on YouTube, Vimeo, or Google Slides iframes. These providers require `allow-same-origin` and `allow-scripts` to function, and combining both in a sandbox is a security anti-pattern per MDN. Instead, rely on the `allow` permissions policy attribute:
- YouTube/Vimeo: `allow="autoplay; encrypted-media; fullscreen"`
- Google Slides: `allow="autoplay; fullscreen"`
- Web Page (untrusted): `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` (safe because content is cross-origin, so `allow-same-origin` gives it back its own origin, NOT the parent page's origin)

### Error Recovery for Failed Iframes
**Recommendation:** Use a timeout-based approach. Set a 10-second timer after rendering the iframe. If the iframe hasn't triggered `onLoad` within 10 seconds, show the cached thumbnail with a subtle "Loading..." indicator. If the device goes offline during loading, immediately switch to the offline fallback. Do NOT try to detect specific error states -- cross-origin iframes make this impossible.

### Loading Spinner Design
**Recommendation:** Show the cached thumbnail as a brief placeholder (not a spinner). This provides immediate visual content. When the iframe loads successfully, crossfade from thumbnail to live content with a 300ms opacity transition. This matches the existing `dataFadeOpacity` pattern used by DataTableWidget and RssCardWidget.

### Thumbnail Size/Quality
**Recommendation:** Use `hqdefault.jpg` (480x360) for YouTube instead of `maxresdefault.jpg` (1280x720). The hq version is always available, loads faster, and is sufficient for a small thumbnail in the properties panel and offline fallback. For Vimeo, request `&width=640` in the oEmbed call. For Google Slides, use PNG export of the first slide. These sizes balance quality with storage/bandwidth.

### YouTube iframe API vs Plain iframe
**Recommendation:** Use plain `<iframe>` with URL parameters. The YouTube IFrame Player API (JS SDK) provides programmatic control (play/pause/seek, event callbacks) but is unnecessary for digital signage where content autoplays silently. The plain iframe approach is simpler, lighter (~200KB less), and requires no API key. If future phases need play state detection (e.g., for proof-of-play logging), the Player API can be added as an enhancement without changing the widget component interface.

## Open Questions

1. **Web Page Thumbnail via Open Graph**
   - What we know: Many websites provide Open Graph `<meta property="og:image">` tags. Extracting these requires fetching the page HTML (CORS may block client-side fetch).
   - What's unclear: Whether a client-side approach will work for most URLs, or if this needs a server-side edge function.
   - Recommendation: Start with a Supabase Edge Function (`/api/og-image?url=...`) that fetches the page and extracts OG image. Fall back to a generic "Web Page" placeholder if no OG image is found. This can be enhanced with a full screenshot service (Puppeteer) in a future phase if needed.

2. **Google Slides Thumbnail for Non-Published Presentations**
   - What we know: The `/export?format=png` URL works for published presentations. For non-published ones, it returns a 401.
   - What's unclear: If users will commonly try to use non-published URLs.
   - Recommendation: When the user pastes a non-published URL, show the guidance message (locked decision) and use a generic Google Slides placeholder icon for the thumbnail. Only fetch the real thumbnail once the URL is a valid published URL.

3. **IndexedDB Schema Migration for Thumbnail Store**
   - What we know: `cacheService.js` is at DB_VERSION 4. Thumbnails can use the existing MEDIA store (keyed by `thumbnail:{widgetType}:{url}`).
   - What's unclear: Whether thumbnail data should be in the MEDIA store or a separate THUMBNAILS store.
   - Recommendation: Use the existing MEDIA store with a `thumbnail:` prefix key convention. No schema migration needed. The existing LRU eviction will manage storage limits. This avoids a DB_VERSION bump.

## Sources

### Primary (HIGH confidence)
- [YouTube Player Parameters - Google Developers](https://developers.google.com/youtube/player_parameters) - Autoplay, mute, loop, controls parameters
- [YouTube IFrame Player API Reference - Google Developers](https://developers.google.com/youtube/iframe_api_reference) - IFrame API capabilities and limitations
- [MDN iframe Element Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) - Sandbox attributes, allow permissions policy, security considerations
- [Google Slides URL Parameters](https://youneedawiki.com/blog/posts/google-slides-url-parameters.html) - Complete parameter reference including start, loop, delayms, export formats

### Secondary (MEDIUM confidence)
- [Vimeo Help Center - Autoplay and Loop](https://help.vimeo.com/hc/en-us/articles/12426486963857-Autoplay-and-loop-embedded-videos) - Vimeo embed parameters (autoplay, muted, loop, background)
- [Vimeo Help Center - Player Parameters](https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters) - Complete Vimeo URL parameter documentation
- [web.dev - Sandboxed IFrames](https://web.dev/articles/sandboxed-iframes) - Iframe security best practices from Google
- Multiple sources confirming YouTube thumbnail URL pattern: `img.youtube.com/vi/{ID}/hqdefault.jpg`
- Multiple sources confirming Vimeo oEmbed endpoint: `vimeo.com/api/oembed.json?url={URL}`

### Tertiary (LOW confidence)
- Digital signage competitor patterns (Yodeck, OptiSigns) for offline thumbnail fallback -- from CONTEXT.md discussion, not independently verified

### Codebase (HIGH confidence)
- `src/widgets/registry.js` - Widget registration pattern (12 existing entries)
- `src/player/components/widgets/WeatherWidget.jsx` - Widget component pattern (props destructuring, offline cache, SyncStatusIndicator)
- `src/player/components/widgets/RssCardWidget.jsx` - Widget component pattern (useWidgetData hook, orchestrator integration)
- `src/player/cacheService.js` - IndexedDB caching (LRU eviction, media blob storage)
- `src/player/offlineService.js` - Offline detection (isOnline(), addOfflineListener())
- `src/player/components/AppRenderer.jsx` - Existing WebPageApp with iframe refresh pattern
- `src/components/layout-editor/LayoutPropertiesPanel.jsx` - Widget controls integration point
- `src/components/scene-editor/RssWidgetControls.jsx` - onPropChange adapter pattern for widget controls
- `src/player/hooks/useWidgetData.js` - Data refresh orchestrator integration hook

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all patterns directly observed in existing codebase
- Architecture: HIGH - Direct extension of established widget registry pattern with 12 existing examples
- Pitfalls: HIGH - YouTube/Vimeo/Slides parameters verified against official documentation; iframe security verified via MDN
- URL parsing: MEDIUM - Regex patterns verified against multiple documented URL formats but edge cases may exist in wild
- Offline thumbnails: MEDIUM - YouTube and Vimeo thumbnail APIs verified; Google Slides export URL and OG image extraction need runtime validation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days - stable domain, embed APIs change infrequently)
