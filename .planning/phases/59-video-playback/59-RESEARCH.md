# Phase 59: Video Playback - Research

**Researched:** 2026-02-17
**Domain:** HTML5 Video / HLS Adaptive Streaming / Layout Editor Integration
**Confidence:** HIGH

## Summary

Phase 59 adds video elements to the layout editor and player. The codebase already has partial video support: the LeftSidebar creates `type: 'video'` elements with `{autoplay, loop, muted}` props, and the FloatingLayersPanel has a Video icon mapping. However, **no rendering path exists** for video elements -- neither `LayoutElementRenderer` nor `LayoutEditorCanvas` handle `case 'video'`, and the `types.js` ElementType typedef does not include `'video'`. The ZonePlayer already plays videos via `<video>` tags for playlist items, and the `useStuckDetection` hook monitors video stalls.

HLS adaptive streaming requires hls.js (~62KB gzipped for the light build), which handles MediaSource Extensions on non-Safari browsers. Safari has native HLS support via `<video src="...m3u8">`. The key architectural decision is whether video is a new element type (like `'text'`, `'image'`, `'shape'`) or a widget registered in `WIDGET_REGISTRY`. Given that video is a media element (like images) with URL-based content rather than a data-driven widget, it should be a **new element type** -- not a widget. This aligns with how the LeftSidebar already creates `type: 'video'` elements.

**Primary recommendation:** Add `'video'` as a new ElementType alongside text/image/shape/widget. Create a `VideoElement` rendering in LayoutElementRenderer (poster frame in editor, autoplay in player). Use hls.js (light build) for .m3u8 URL detection with a Safari native fallback. Wire into the existing `useStuckDetection` hook for stall recovery.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIDEO-01 | User can add video (MP4) as an element in layout zones | LeftSidebar already creates `type: 'video'` elements. Need to: add 'video' to ElementType, create `createVideoElement()` factory, add 'video' case to LayoutElementRenderer |
| VIDEO-02 | Video elements play with autoplay, muted, and loop in player | LeftSidebar already sets `{autoplay: true, loop: true, muted: true}` props. Need video rendering in LayoutElementRenderer player-mode and SceneBlock. Chrome policy: muted autoplay always allowed; must also include `playsInline` |
| VIDEO-03 | Player supports HLS adaptive streaming (.m3u8 URLs) via hls.js | Install hls.js (light build). Detect URL suffix; if .m3u8, use `Hls.isSupported()` check + `hls.loadSource()`/`hls.attachMedia()`. Safari fallback: native `<video src="...m3u8">` |
| VIDEO-04 | Video elements show poster frame/thumbnail in editor (not autoplay in editor) | In editor mode, render static poster/thumbnail image. Use `props.posterUrl` or `props.thumbnail_url` from media library metadata. Fallback: a generic video icon placeholder |
| VIDEO-05 | Video playback integrates with existing stuck detection for stall recovery | `useStuckDetection` already accepts videoRef and monitors `currentTime` stalls. Video elements in layouts need to expose their `<video>` ref. For HLS, also listen to `Hls.Events.ERROR` for fatal errors and use `hls.recoverMediaError()` / `hls.startLoad()` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hls.js (light) | ^1.6.x | HLS adaptive bitrate streaming | 3.5M+ weekly npm downloads, 16K+ GitHub stars, de facto standard for HLS in browsers. Light build excludes DRM/subtitles/CMCD (~62KB gzip) |
| HTML5 `<video>` | native | MP4 playback, autoplay/muted/loop | Browser-native, no dependencies. Digital signage players always support it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react `Video` icon | (already installed) | Video element icon in editor sidebar, layers panel | Already used in FloatingLayersPanel and LeftSidebar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| hls.js | video.js | video.js is a full player UI framework (~300KB+). Overkill for headless digital signage. hls.js is engine-only |
| hls.js | dash.js | DASH is an alternative to HLS. Requirement specifies HLS/.m3u8 specifically |
| hls.js light | hls.js full | Full build adds DRM, subtitles, CMCD. Not needed for digital signage video playback |
| react-hls-player | hls.js direct | react-hls-player (3.0.7) wraps hls.js but is unmaintained and doesn't support latest hls.js. Direct integration gives full control |

**Installation:**
```bash
npm install hls.js
```
(Use the light build import: `import Hls from 'hls.js/dist/hls.light.min.js'`)

## Architecture Patterns

### Recommended File Structure
```
src/
├── player/
│   └── components/
│       └── VideoPlayer.jsx          # Reusable <video> with HLS support + stall recovery
├── components/
│   └── layout-editor/
│       ├── LayoutElementRenderer.jsx  # Add 'video' case (poster in editor, VideoPlayer in player)
│       ├── LayoutPropertiesPanel.jsx   # Add VideoControls section
│       └── types.js                   # Add 'video' to ElementType, createVideoElement()
└── widgets/
    └── registry.js                    # NO changes -- video is an element type, not a widget
```

### Pattern 1: Video as Element Type (NOT Widget)
**What:** Video is a new ElementType (`'video'`) alongside text/image/shape/widget, NOT a widget registered in WIDGET_REGISTRY.
**When to use:** Always -- this is the architectural decision for this phase.
**Why:**
- Widgets receive `{ props, timezone }` and are data-driven (clock, weather, RSS)
- Video is URL-based media content, same category as images
- LeftSidebar already creates `type: 'video'` elements (line 196)
- FloatingLayersPanel already maps `video: Video` icon (line 41)
- Image/video share similar props (url, fit, borderRadius, opacity)
- Widget registry is for self-rendering components; video needs DOM-level `<video>` control

**Example -- types.js update:**
```javascript
/**
 * @typedef {'text' | 'image' | 'video' | 'widget' | 'shape'} ElementType
 */

/**
 * @typedef {Object} VideoElementProps
 * @property {string} url - Video URL (MP4 or .m3u8)
 * @property {string} [posterUrl] - Poster/thumbnail image URL for editor preview
 * @property {'cover' | 'contain' | 'fill'} [fit='cover'] - Object fit mode
 * @property {number} [borderRadius=0] - Border radius in pixels
 * @property {number} [opacity=1] - Opacity (0-1)
 * @property {boolean} [autoplay=true] - Autoplay in player
 * @property {boolean} [loop=true] - Loop playback
 * @property {boolean} [muted=true] - Muted playback
 */

export const DEFAULT_ELEMENT_SIZE = {
  text: { width: 0.3, height: 0.1 },
  image: { width: 0.25, height: 0.25 },
  video: { width: 0.4, height: 0.3 },    // NEW: larger default for video
  widget: { width: 0.15, height: 0.1 },
  shape: { width: 0.15, height: 0.15 },
};

export function createVideoElement(url, overrides = {}) {
  return {
    id: generateElementId('video'),
    type: 'video',
    position: {
      x: 0.3, y: 0.35,
      ...DEFAULT_ELEMENT_SIZE.video,
    },
    layer: 1,
    locked: false,
    props: {
      url,
      posterUrl: '',
      fit: 'cover',
      borderRadius: 0,
      opacity: 1,
      autoplay: true,
      loop: true,
      muted: true,
    },
    ...overrides,
    props: { url, posterUrl: '', fit: 'cover', borderRadius: 0, opacity: 1, autoplay: true, loop: true, muted: true, ...overrides?.props },
    position: { x: 0.3, y: 0.35, ...DEFAULT_ELEMENT_SIZE.video, ...overrides?.position },
  };
}
```

### Pattern 2: Dual-Mode Rendering (Editor vs Player)
**What:** LayoutElementRenderer checks rendering context to decide poster vs autoplay.
**When to use:** Always for video elements.
**How:** The existing LayoutEditorCanvas has a `mode` prop ('edit' | 'preview'). In the LayoutPreviewModal (preview mode) and the player, videos autoplay. In the editor, they show a poster frame.

**Example -- LayoutElementRenderer video case:**
```javascript
function VideoElement({ props, isPreview }) {
  const { url, posterUrl, fit = 'cover', borderRadius = 0, opacity = 1 } = props;

  if (!url) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center"
           style={{ borderRadius: `${borderRadius}px`, opacity }}>
        <Video className="w-8 h-8 text-gray-600" />
      </div>
    );
  }

  // Editor mode: show poster/thumbnail only
  if (!isPreview) {
    return (
      <div className="w-full h-full relative" style={{ borderRadius: `${borderRadius}px`, opacity }}>
        {posterUrl ? (
          <img src={posterUrl} alt="" className="w-full h-full" style={{ objectFit: fit }} />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Video className="w-12 h-12 text-gray-500" />
            <span className="absolute bottom-2 left-2 text-xs text-gray-400">Video</span>
          </div>
        )}
        {/* Play icon overlay to indicate it's a video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Preview/Player mode: actual video playback
  return <VideoPlayer url={url} fit={fit} borderRadius={borderRadius} opacity={opacity} />;
}
```

### Pattern 3: HLS Detection and Fallback
**What:** Detect .m3u8 URLs, use hls.js on non-Safari, native on Safari.
**When to use:** In the VideoPlayer component for any video URL.

**Example:**
```javascript
import Hls from 'hls.js/dist/hls.light.min.js';

function isHlsUrl(url) {
  return url && (url.endsWith('.m3u8') || url.includes('.m3u8?'));
}

function VideoPlayer({ url, fit, borderRadius, opacity, loop = true, muted = true }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (isHlsUrl(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, handleHlsError);
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = url;
      }
    } else {
      // Direct MP4
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      autoPlay muted={muted} loop={loop} playsInline
      style={{ width: '100%', height: '100%', objectFit: fit, borderRadius, opacity }}
    />
  );
}
```

### Pattern 4: Stuck Detection Integration
**What:** Video elements in layouts must integrate with the existing `useStuckDetection` hook.
**When to use:** In the player (ViewPage, ZonePlayer) when rendering layout elements that contain video.
**Approach:** The VideoPlayer component should expose its videoRef to the parent for stuck detection monitoring. For HLS errors, handle them internally with `hls.recoverMediaError()` and `hls.startLoad()`.

### Anti-Patterns to Avoid
- **Registering video as a widget in WIDGET_REGISTRY:** Widgets are for data-driven components (clock, weather, RSS). Video is media content like images.
- **Playing video in the editor canvas:** Chrome will throttle autoplay of multiple videos. Editor should always show poster/thumbnail.
- **Creating a separate HLS player component AND a separate MP4 player component:** Use ONE VideoPlayer that handles both MP4 and HLS internally.
- **Ignoring the existing LeftSidebar video element creation:** Lines 173-213 already create `type: 'video'` elements. Don't change the approach there.
- **Adding hls.js full build when only streaming is needed:** Use `hls.js/dist/hls.light.min.js` to avoid bundling DRM, subtitles, CMCD.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HLS adaptive streaming | Custom MSE/fetch-based streaming | hls.js light build | ABR algorithms, segment parsing, level switching are enormously complex |
| HLS error recovery | Custom retry/reconnect logic | hls.js built-in `recoverMediaError()` / `startLoad()` | Handles fragment-level retry, codec errors, buffer management |
| Video autoplay policy | Custom user-interaction detection | `muted + playsInline` attributes | Browser-native policy -- muted autoplay always works in all browsers |
| Video stall detection | New stall monitoring system | Existing `useStuckDetection` hook | Already monitors `videoRef.current.currentTime` stalls with 30s threshold |
| Safari HLS support detection | UserAgent sniffing | `video.canPlayType('application/vnd.apple.mpegurl')` | Feature detection is more reliable than UA parsing |

**Key insight:** hls.js handles the hardest part (adaptive bitrate streaming, segment parsing, error recovery). The integration work is wiring it to the existing layout system and stuck detection.

## Common Pitfalls

### Pitfall 1: Forgetting `playsInline` on Mobile
**What goes wrong:** On iOS Safari, video goes fullscreen instead of inline when autoplay triggers.
**Why it happens:** iOS default behavior opens video in fullscreen player.
**How to avoid:** Always include `playsInline` attribute alongside `autoPlay muted loop`.
**Warning signs:** Video works on desktop but goes fullscreen on iOS/iPad.

### Pitfall 2: Multiple Video Elements Competing for Resources
**What goes wrong:** Multiple video elements in different layout zones stall or skip frames.
**Why it happens:** Browser limits concurrent video decode pipelines (typically 4-8 depending on hardware).
**How to avoid:** Document this as a limitation. Digital signage layouts rarely need more than 2-3 video zones. The stuck detection hook will catch individual stalls.
**Warning signs:** Videos stutter when 4+ video elements are in the same layout.

### Pitfall 3: HLS Destroy on Unmount
**What goes wrong:** Memory leak and background network requests when navigating away from video.
**Why it happens:** hls.js keeps fetching segments and maintaining buffers until explicitly destroyed.
**How to avoid:** Always call `hls.destroy()` in the useEffect cleanup function.
**Warning signs:** Network tab shows ongoing .ts segment requests after leaving a page with HLS video.

### Pitfall 4: Not Handling HLS Fatal Errors
**What goes wrong:** HLS stream fails silently, showing black video.
**Why it happens:** Network interruptions or corrupt segments cause fatal errors that stop playback.
**How to avoid:** Listen to `Hls.Events.ERROR`, check `data.fatal`, and call `hls.recoverMediaError()` for MEDIA_ERROR or `hls.startLoad()` for NETWORK_ERROR.
**Warning signs:** Video plays initially then stops with no error visible to user.

### Pitfall 5: Video Props Missing from Properties Panel
**What goes wrong:** User adds a video element but can't edit its properties (URL, fit, poster, etc.).
**Why it happens:** `LayoutPropertiesPanel` only has cases for text/image/widget/shape -- not video.
**How to avoid:** Add `VideoControls` component in LayoutPropertiesPanel for `element.type === 'video'`.
**Warning signs:** Selecting a video element shows empty properties panel.

### Pitfall 6: Missing poster/thumbnail for Videos from Media Library
**What goes wrong:** Videos in the editor show a generic icon instead of a meaningful preview.
**Why it happens:** Media library stores `thumbnail_url` for videos, but this needs to be passed through as `posterUrl` in the video element props.
**How to avoid:** When adding a video from the media library (LeftSidebar `handleAddImage`), pass `thumbnail_url` as `posterUrl` in props.
**Warning signs:** All video elements in the editor look the same (generic Video icon).

## Code Examples

### HLS Error Recovery with Retry Limit
```javascript
// Source: hls.js official docs + community patterns
function useHlsPlayer(videoRef, url) {
  const hlsRef = useRef(null);
  const errorCountRef = useRef(0);
  const MAX_ERRORS = 3;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || !isHlsUrl(url)) return;

    if (!Hls.isSupported()) {
      // Safari native HLS fallback
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      }
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return; // Non-fatal errors recover automatically

      errorCountRef.current++;
      if (errorCountRef.current > MAX_ERRORS) {
        hls.destroy();
        return;
      }

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          hls.destroy();
          break;
      }
    });

    // Reset error count on successful playback
    hls.on(Hls.Events.FRAG_LOADED, () => {
      errorCountRef.current = 0;
    });

    hlsRef.current = hls;

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [url, videoRef]);

  return hlsRef;
}
```

### Video Element in LayoutElementRenderer
```javascript
// Pattern: Video renders differently in editor vs player/preview
case 'video':
  return <VideoElement props={props} isPreview={isPreview} />;
```

### Adding Video from Media Library (existing pattern, already in LeftSidebar)
```javascript
// LeftSidebar.jsx lines 171-213 already handle this:
const handleAddImage = (url, metadata = {}) => {
  const isVideo = metadata.type === 'video';
  onAddElement({
    id,
    type: isVideo ? 'video' : 'image',
    // ...
    props: {
      url,
      fit: 'cover',
      borderRadius: 0,
      opacity: 1,
      mediaId: metadata.mediaId || null,
      name: metadata.name || null,
      ...(isVideo && { autoplay: true, loop: true, muted: true }),
    },
  });
};
// Enhancement needed: also pass posterUrl from metadata.thumbnail_url
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flash-based HLS players | hls.js with MSE API | 2016+ | Flash deprecated; hls.js is now universal |
| Full video.js player for HLS | hls.js light build alone | 2020+ | For headless/custom UI, video.js overhead unnecessary |
| Autoplay with sound | Autoplay only when muted | Chrome 66 (2018) | Must always use `muted` attribute for reliable autoplay |
| UA sniffing for Safari HLS | `canPlayType()` feature detection | Always best practice | More reliable across Safari versions |
| hls.js separate iOS handling | hls.js 1.5+ supports MMS on iOS 17.1+ | 2024 | iOS Safari can now use hls.js via Managed Media Source |

**Deprecated/outdated:**
- `react-hls-player` (v3.0.7): Last update 2022, doesn't support latest hls.js. Use hls.js directly.
- Flash-based HLS: Flash is dead. Not relevant.

## Open Questions

1. **Multiple video stuck detection across layout zones**
   - What we know: `useStuckDetection` monitors a single videoRef. The ViewPage passes one videoRef for stuck detection.
   - What's unclear: How to monitor multiple video elements across multiple layout zones for stuck detection. ZonePlayer has its own videoRef but doesn't use useStuckDetection.
   - Recommendation: For Plan 59-01, wire the VideoPlayer to report stalls upward. Each VideoPlayer can self-recover (reset currentTime, call play()). The existing useStuckDetection remains for the top-level player. Individual video elements handle their own stalls internally via HLS error handling + a local stall timer.

2. **Poster URL availability from media library**
   - What we know: Media library assets have `thumbnail_url` field. LeftSidebar accesses `asset.thumbnail_url || asset.url` for preview images.
   - What's unclear: Whether all uploaded videos have `thumbnail_url` populated from the backend.
   - Recommendation: Use `thumbnail_url` if available, otherwise fall back to a generic video icon placeholder. This is a graceful degradation -- not a blocker.

3. **Video element in SceneRenderer**
   - What we know: SceneRenderer handles `text`, `image`, `shape`, `widget` block types. No `video` case exists.
   - What's unclear: Whether video blocks in scenes are in scope for this phase or a future phase.
   - Recommendation: Add the `video` case to SceneBlock as part of this phase since SceneRenderer follows the same block type pattern. The VideoPlayer component is reusable.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/widgets/registry.js` - Widget registry pattern (no video type)
- Codebase analysis: `src/components/layout-editor/types.js` - ElementType does not include 'video'
- Codebase analysis: `src/components/layout-editor/LeftSidebar.jsx` - Already creates `type: 'video'` elements (lines 171-213)
- Codebase analysis: `src/components/layout-editor/LayoutElementRenderer.jsx` - Missing 'video' case
- Codebase analysis: `src/player/hooks/useStuckDetection.js` - Stuck detection API
- Codebase analysis: `src/player/components/ZonePlayer.jsx` - Existing video playback in zones
- Codebase analysis: `src/player/hooks/usePlayerPlayback.js` - videoRef and video end handling
- hls.js GitHub README: https://github.com/video-dev/hls.js - Setup, browser support, native detection
- hls.js error handling docs: https://github.com/video-dev/hls.js/blob/master/docs/API.md

### Secondary (MEDIUM confidence)
- Chrome autoplay policy: https://developer.chrome.com/blog/autoplay - Muted autoplay always allowed
- MDN Autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- hls.js npm page: https://www.npmjs.com/package/hls.js - v1.6.x, 3.5M weekly downloads

### Tertiary (LOW confidence)
- hls.js bundle size (~62KB gzip for light build) - estimate from community reports, not officially documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - hls.js is the undisputed standard for HLS in browsers; 3.5M+ weekly downloads
- Architecture: HIGH - codebase patterns are clear from reading all relevant files; video-as-element-type follows existing LeftSidebar pattern
- Pitfalls: HIGH - well-documented browser autoplay policies; hls.js error handling is well-documented
- Integration points: HIGH - read all relevant files: registry, types, LayoutElementRenderer, LeftSidebar, FloatingLayersPanel, ZonePlayer, useStuckDetection, usePlayerPlayback, ViewPage, SceneRenderer, LivePreviewWindow

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable domain; hls.js API stable since v1.0)
