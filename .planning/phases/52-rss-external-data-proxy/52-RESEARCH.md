# Phase 52: RSS & External Data Proxy - Research

**Researched:** 2026-02-12
**Domain:** RSS/Atom feed parsing, server-side HTML sanitization, scrolling ticker & card layout rendering for digital signage players
**Confidence:** HIGH

## Summary

Phase 52 adds RSS feed support to BizScreen's digital signage platform. The architecture decomposes into three layers: (1) a Supabase Edge Function that fetches, parses, and sanitizes RSS/Atom feeds server-side, (2) two new player widget components (`RssTickerWidget` for scrolling news tickers and `RssCardWidget` for article card layouts), and (3) admin UI for adding RSS feed URLs as content sources and configuring display options in the scene editor.

The existing codebase provides an extremely strong foundation. Phase 51 established the complete widget pipeline: `DataTableWidget` on the player, `DataTableWidgetControls` in the scene editor, the `SceneWidgetRenderer` switch statement in `SceneRenderer.jsx`, the `WidgetControls` widget type selector in `PropertiesPanel.jsx`, and IndexedDB caching in `cacheService.js`. The unsplash-proxy Edge Function establishes the exact pattern for server-side proxy functions (auth, CORS, caching, rate limiting). The RSS widgets follow these patterns directly.

The key technical question flagged during v3.1 research -- fast-xml-parser Deno compatibility -- is resolved. fast-xml-parser v5.3.5 is pure JavaScript with zero native dependencies and works via Deno's `npm:` specifier (the same pattern used by the existing unsplash-proxy Edge Function with `npm:@supabase/supabase-js@2`). For HTML sanitization on the Deno Edge Function, `sanitize-html` (also pure JS, built on htmlparser2) works via `npm:` specifier without requiring a DOM -- unlike DOMPurify which needs jsdom.

**Primary recommendation:** Use `fast-xml-parser` for RSS/Atom XML parsing in the Edge Function, `sanitize-html` for server-side HTML sanitization, and pure CSS `transform: translateX()` animations for the scrolling ticker widget (GPU-accelerated, no additional dependencies needed on the player).

## Existing Codebase Analysis (CRITICAL -- what's already built)

### Already Built -- DO NOT rebuild

| Component | File | Relevance to Phase 52 |
|-----------|------|----------------------|
| Edge Function pattern | `supabase/functions/unsplash-proxy/index.ts` | Exact pattern for rss-proxy: auth, CORS, caching, rate limiting, `npm:` imports |
| CORS headers | `supabase/functions/_shared/cors.ts` | Shared CORS config, reuse directly |
| Widget rendering pipeline | `src/player/components/SceneRenderer.jsx` | `SceneWidgetRenderer` switch -- add `rss-ticker` and `rss-card` cases |
| Widget type selector | `src/components/scene-editor/PropertiesPanel.jsx` | `widgetTypes` array in `WidgetControls` -- add new types |
| Widget controls pattern | `src/components/scene-editor/DataTableWidgetControls.jsx` | Exact pattern for `RssWidgetControls` |
| IndexedDB cache | `src/player/cacheService.js` | `DATA_SOURCES` store pattern -- reuse for RSS feed caching |
| Data source CRUD | `src/services/dataSourceService.js` | `DATA_SOURCE_TYPES` enum -- add `RSS_FEED` type |
| Player offline pattern | `src/player/components/widgets/DataTableWidget.jsx` | Silent offline fallback: try fetch -> fall back to cache -> render nothing if no data |
| Widget barrel export | `src/player/components/widgets/index.js` | Add new widget exports |
| SocialFeedRenderer | `src/components/player/SocialFeedRenderer.jsx` | Reference for auto-rotating card layouts (carousel, grid, list patterns) |
| Package dependencies | `package.json` | `framer-motion` (animations), `isomorphic-dompurify` (client sanitization) already installed |

### What Needs to Be Built (net-new)

| Component | Purpose | Depends On |
|-----------|---------|-----------|
| **rss-proxy Edge Function** | Fetch, parse, sanitize RSS/Atom feeds server-side | fast-xml-parser, sanitize-html |
| **RSS feed cache table** | Database table caching parsed feed data | Supabase migration |
| **RssTickerWidget** (player) | Scrolling news ticker across screen bottom | CSS transform animation, cached feed data |
| **RssCardWidget** (player) | Article card layout with images and excerpts | Cached feed data |
| **RssWidgetControls** (editor) | RSS feed URL input, display config, preview | Scene editor pattern |
| **RSS_FEED data source type** | Extend data source types for RSS feeds | dataSourceService.js |

## Standard Stack

### Core (for Edge Function -- Deno runtime)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fast-xml-parser | ^5.3.5 | Parse RSS/Atom XML into JS objects | Pure JS, no native deps, 15k+ GitHub stars, works via `npm:` in Deno, handles malformed XML gracefully |
| sanitize-html | ^2.x | Strip dangerous HTML from feed content | Pure JS (built on htmlparser2), no DOM required, works via `npm:` in Deno, allowlist-based sanitization |

### Core (for client -- React player)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | ^19.1.1 | UI framework | Already installed |
| idb | ^8.0.3 | IndexedDB for offline cache | Already installed |
| Tailwind CSS | ^3.4.18 | Styling | Already installed |

### No New Client Dependencies Needed

The scrolling ticker uses pure CSS `@keyframes` with `transform: translateX()` for GPU-accelerated animation. This avoids adding `react-fast-marquee` or `framer-motion` ticker components, keeping the player bundle small for Raspberry Pi targets. The existing `framer-motion` is available if subtle entrance/exit animations are desired for card layouts.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-xml-parser | @mikaelporttila/rss (JSR) | Deno-native RSS parser (v1.1.3), handles RSS/RSS2/Atom directly. Simpler API but less control over XML parsing. fast-xml-parser preferred for: broader ecosystem, more active maintenance, ability to handle edge-case XML |
| fast-xml-parser | txml | Tiny (2kb) pure JS parser. Less battle-tested, fewer features for namespace handling |
| sanitize-html | ammonia-wasm | WASM-based Rust sanitizer for Deno. Last updated 2021 (v0.3.1), maintenance concerns. sanitize-html is actively maintained and pure JS |
| sanitize-html | DOMPurify | Industry standard but requires jsdom in server environments. DOMPurify needs a real DOM -- impractical for Deno Edge Functions |
| Pure CSS ticker | react-fast-marquee | Nice API but adds +8kb to player bundle. Pure CSS is GPU-accelerated and zero-dependency |
| Pure CSS ticker | Motion (framer-motion) Ticker | framer-motion already installed but Ticker component adds complexity. Pure CSS is simpler for a horizontal scroll |

**Installation (Edge Function only):**
```typescript
// In the Edge Function file, use npm: specifiers (no package.json needed)
import { XMLParser } from 'npm:fast-xml-parser@5';
import sanitizeHtml from 'npm:sanitize-html@2';
```

No `npm install` needed for client -- all client dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    rss-proxy/
      index.ts              # Edge Function: fetch, parse, sanitize RSS
    _shared/
      cors.ts               # (existing) shared CORS headers

src/
  services/
    dataSourceService.js     # (modify) add RSS_FEED to DATA_SOURCE_TYPES
    rssFeedService.js        # (new) RSS feed CRUD, Edge Function calls

  player/
    components/
      widgets/
        RssTickerWidget.jsx  # (new) scrolling ticker widget
        RssCardWidget.jsx    # (new) article card widget
        index.js             # (modify) add exports
    cacheService.js          # (modify) add RSS feed cache store

  components/
    scene-editor/
      RssWidgetControls.jsx  # (new) RSS config in scene editor
      PropertiesPanel.jsx    # (modify) add rss-ticker/rss-card to widget types
```

### Pattern 1: Edge Function Proxy (Server-Side Fetch + Sanitize)
**What:** All RSS fetching happens server-side via Supabase Edge Function. The client never directly fetches external RSS URLs.
**When to use:** Always -- this satisfies INFRA-02 (no CORS/key exposure) and RSS-04 (server-side sanitization).
**Example:**
```typescript
// supabase/functions/rss-proxy/index.ts
// Follow exact pattern from unsplash-proxy/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@5';
import sanitizeHtml from 'npm:sanitize-html@2';
import { corsHeaders } from '../_shared/cors.ts';

// Parse RSS feed
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});
const parsed = parser.parse(xmlText);

// Extract items from RSS 2.0 or Atom format
const items = parsed?.rss?.channel?.item     // RSS 2.0
           || parsed?.feed?.entry             // Atom
           || [];

// Sanitize each item's HTML content
const sanitized = items.map(item => ({
  title: sanitizeHtml(item.title || '', { allowedTags: [] }),
  description: sanitizeHtml(item.description || item.summary || '', {
    allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
    allowedAttributes: {},
  }),
  link: item.link,
  pubDate: item.pubDate || item.published || item.updated,
  imageUrl: extractImageUrl(item),  // from enclosure, media:content, or content
}));
```

### Pattern 2: RSS Widget as Scene Widget (follows DataTableWidget pattern)
**What:** RSS widgets are scene editor widget types, configured via PropertiesPanel, rendered by SceneWidgetRenderer.
**When to use:** This is how ALL widgets work in BizScreen. Not a choice -- follow the pattern.
**Example:**
```jsx
// In SceneRenderer.jsx SceneWidgetRenderer switch:
case 'rss-ticker':
  return <RssTickerWidget props={safeProps} />;
case 'rss-card':
  return <RssCardWidget props={safeProps} />;

// In PropertiesPanel.jsx WidgetControls widgetTypes array:
{ key: 'rss-ticker', icon: Rss, label: 'News Ticker' },
{ key: 'rss-card', icon: Newspaper, label: 'News Cards' },
```

### Pattern 3: Pure CSS Scrolling Ticker (GPU-accelerated)
**What:** Horizontal scrolling ticker using CSS `transform: translateX()` with `@keyframes` animation.
**When to use:** For RSS-02 (scrolling news ticker display).
**Why CSS not JS:** `transform` is GPU-composited, runs on a separate thread from JS, and stays smooth even under heavy JS load (important for Raspberry Pi players).
**Example:**
```jsx
// RssTickerWidget.jsx
function RssTickerWidget({ props }) {
  const { items, speed = 60 } = props; // speed in px/sec

  // Calculate animation duration based on content width
  const contentRef = useRef(null);
  const [duration, setDuration] = useState(20);

  useEffect(() => {
    if (contentRef.current) {
      const width = contentRef.current.scrollWidth;
      setDuration(width / speed);
    }
  }, [items, speed]);

  return (
    <div style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        ref={contentRef}
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          animation: `ticker-scroll ${duration}s linear infinite`,
          willChange: 'transform',  /* GPU hint */
        }}
      >
        {/* Duplicate content for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{ padding: '0 2rem' }}>
            {item.title}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 4: Edge Function Caching (database-backed)
**What:** Cache parsed RSS feed responses in a Supabase table with TTL, similar to `unsplash_search_cache`.
**When to use:** Always -- RSS feeds change infrequently, caching reduces external requests and speeds up responses.
**Example:**
```typescript
// Cache structure (following unsplash_search_cache pattern)
// Table: rss_feed_cache
//   feed_url TEXT PRIMARY KEY
//   feed_title TEXT
//   items JSONB  -- array of sanitized feed items
//   fetched_at TIMESTAMPTZ
//   expires_at TIMESTAMPTZ
//   etag TEXT    -- for conditional GET
//   last_modified TEXT -- for conditional GET
```

### Anti-Patterns to Avoid
- **Client-side RSS fetching:** CORS will block most RSS feeds. Even if it worked, it exposes the fetch to script injection. Always proxy through Edge Function.
- **Storing raw unsanitized HTML:** Sanitize at the Edge Function before storing in cache or returning to client. Never trust RSS feed content.
- **JavaScript-driven ticker animation:** `setInterval` + `style.left` will jank on Raspberry Pi. Use CSS `transform: translateX()` which is GPU-composited.
- **Parsing RSS on the client:** XML parsing is CPU-intensive and RSS formats vary wildly. Keep parsing server-side where fast-xml-parser handles edge cases.
- **Single widget type for both ticker and cards:** Ticker and card layouts have fundamentally different rendering, props, and animations. Two distinct widget types is cleaner.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML/RSS parsing | Custom regex or DOM-based parser | `fast-xml-parser` via `npm:` | RSS feeds have dozens of format variations (RSS 1.0, 2.0, Atom, namespace prefixes). fast-xml-parser handles all of them |
| HTML sanitization | Regex-based tag stripping | `sanitize-html` via `npm:` | XSS bypass vectors are subtle (nested tags, encoding tricks, malformed HTML). sanitize-html built on battle-tested htmlparser2 |
| Feed format detection | Manual XML structure sniffing | Check for `rss` or `feed` root element | RSS 2.0 has `<rss><channel>`, Atom has `<feed>`. Two-line check after parsing |
| Conditional GET (ETag/If-Modified-Since) | Custom HTTP caching | Standard `fetch` headers + db storage | HTTP conditional GET is a standard pattern -- store ETag/Last-Modified from response, send back on next request |
| Scrolling animation | JS-based animation loop | CSS `@keyframes` + `transform` | Browser's compositor thread handles CSS transforms -- immune to JS thread blocking |

**Key insight:** RSS feed parsing and sanitization are deceptively complex. RSS "standards" are loosely followed, feeds contain arbitrary HTML, and format detection requires handling multiple spec versions. Libraries exist precisely because hand-rolling this breaks on real-world feeds.

## Common Pitfalls

### Pitfall 1: RSS Format Variation
**What goes wrong:** Code assumes RSS 2.0 structure and breaks on Atom feeds, RSS 1.0 feeds, or feeds with namespace prefixes.
**Why it happens:** RSS "standard" has multiple incompatible versions. Atom uses different element names. Some feeds use namespace prefixes (e.g., `content:encoded` instead of `description`).
**How to avoid:** After XML parsing, check for both RSS 2.0 (`parsed.rss.channel.item`) and Atom (`parsed.feed.entry`) structures. Handle `content:encoded` as primary content source when available (it typically has richer HTML than `description`).
**Warning signs:** Feed items showing as empty or missing content for certain feed URLs.

### Pitfall 2: Image Extraction From RSS
**What goes wrong:** Feed items display without images even though the original articles have them.
**Why it happens:** RSS feeds store images in multiple locations: `<enclosure>` tags, `<media:content>` elements, `<media:thumbnail>`, inline `<img>` tags in description/content, or the channel's `<image>` element. No single location is universal.
**How to avoid:** Check multiple sources in priority order: (1) `<media:content>` or `<media:thumbnail>`, (2) `<enclosure>` with image MIME type, (3) first `<img>` tag in description/content HTML, (4) channel-level `<image>` as fallback.
**Warning signs:** Images appearing for some feeds but not others.

### Pitfall 3: Ticker Speed vs Content Length
**What goes wrong:** Ticker scrolls too fast with long content or too slow with short content, or the loop has a visible gap/jump.
**Why it happens:** Fixed CSS animation duration does not account for content width. When the animation resets, there's a visible jump if content isn't duplicated.
**How to avoid:** Calculate animation duration dynamically based on content width: `duration = scrollWidth / pixelsPerSecond`. Duplicate the content (render items twice) so when the first copy scrolls off-screen, the second copy is already showing, creating a seamless loop. Use `translateX(-50%)` as the end position (scrolls exactly one copy's width).
**Warning signs:** Visible jump/gap in the ticker loop, speed varying between different feeds.

### Pitfall 4: XSS Through RSS Content
**What goes wrong:** Malicious or poorly-formed RSS feeds inject scripts or dangerous HTML into the display.
**Why it happens:** RSS `<description>` and `<content:encoded>` fields often contain raw HTML. Some feeds include `<script>` tags, `onclick` handlers, or other dangerous content.
**How to avoid:** Sanitize ALL text content server-side in the Edge Function BEFORE returning to the client or storing in cache. Use allowlist approach (only permit safe tags like `<b>`, `<i>`, `<p>`, `<br>`, `<img>`). Strip ALL attributes except `src` on `<img>` tags. For ticker display, strip ALL HTML (text only).
**Warning signs:** Unexpected HTML rendering, broken layouts from injected styles.

### Pitfall 5: Edge Function Cold Start + Timeout
**What goes wrong:** First RSS fetch after idle period is slow, or fetching a slow/large RSS feed times out.
**Why it happens:** Supabase Edge Functions have cold start latency (~200-500ms) and execution timeouts. Some RSS feeds are slow to respond or return very large XML.
**How to avoid:** (1) Cache parsed feeds in database with TTL (e.g., 15 min), so most requests hit cache. (2) Use HTTP conditional GET (ETag/If-Modified-Since) to avoid re-downloading unchanged feeds. (3) Set a fetch timeout (e.g., 10s) on the RSS URL fetch. (4) Limit parsed items (e.g., max 50 items) to bound response size.
**Warning signs:** Intermittent timeouts, slow widget loading on first display.

### Pitfall 6: CORS on Feed Images
**What goes wrong:** RSS ticker/card widgets display sanitized text but images fail to load on the player.
**Why it happens:** RSS feed image URLs point to external domains. While `<img>` tags generally bypass CORS for rendering, some CDNs block cross-origin image requests or the URLs may be relative.
**How to avoid:** In the Edge Function, resolve relative image URLs to absolute URLs using the feed's base URL. For the card widget, use `<img>` tags (which don't require CORS for display). If an image fails to load, show a graceful fallback (colored placeholder or hide the image area).
**Warning signs:** Broken image icons in the card layout.

## Code Examples

### RSS Feed Edge Function Structure
```typescript
// Source: Pattern from existing supabase/functions/unsplash-proxy/index.ts
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check (same as unsplash-proxy)
  const authHeader = req.headers.get('Authorization');
  // ... verify JWT ...

  const body = await req.json();
  const { action, ...params } = body;

  switch (action) {
    case 'fetch':
      return await handleFetchFeed(supabaseAdmin, tenantId, params);
    default:
      return jsonResponse({ ok: false, error: { code: 'BAD_REQUEST' } }, 400);
  }
});
```

### RSS/Atom Format Detection
```typescript
// After fast-xml-parser parses the XML:
function extractFeedItems(parsed: any) {
  // RSS 2.0: <rss><channel><item>
  if (parsed?.rss?.channel) {
    const channel = parsed.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item :
                  channel.item ? [channel.item] : [];
    return {
      format: 'rss2',
      title: channel.title,
      items: items.map(normalizeRssItem),
    };
  }

  // Atom: <feed><entry>
  if (parsed?.feed) {
    const feed = parsed.feed;
    const entries = Array.isArray(feed.entry) ? feed.entry :
                    feed.entry ? [feed.entry] : [];
    return {
      format: 'atom',
      title: feed.title,
      items: entries.map(normalizeAtomEntry),
    };
  }

  throw new Error('Unrecognized feed format');
}
```

### Widget Registration Pattern (from Phase 51)
```jsx
// PropertiesPanel.jsx WidgetControls -- existing pattern
const widgetTypes = [
  { key: 'clock', icon: Clock, label: 'Clock' },
  { key: 'date', icon: Calendar, label: 'Date' },
  { key: 'weather', icon: CloudSun, label: 'Weather' },
  { key: 'qr', icon: QrCode, label: 'QR Code' },
  { key: 'data-table', icon: Table2, label: 'Data Table' },
  // Phase 52 adds:
  { key: 'rss-ticker', icon: Rss, label: 'News Ticker' },
  { key: 'rss-card', icon: Newspaper, label: 'News Cards' },
];
```

### Pure CSS Ticker Animation
```css
/* GPU-accelerated ticker -- runs on compositor thread */
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.ticker-content {
  display: flex;
  white-space: nowrap;
  will-change: transform;
  animation: ticker-scroll var(--ticker-duration) linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ticker-content {
    animation: none;
  }
}
```

### Card Layout Pattern (from SocialFeedRenderer)
```jsx
// The existing SocialFeedRenderer provides the exact pattern for card layouts:
// - CarouselView: auto-rotating single card display
// - GridView: fixed grid of cards
// - ListView: vertical list with thumbnails
// RSS card widget follows the same structure but with RSS-specific fields
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side RSS fetch | Server-side proxy (Edge Functions) | CORS era (~2015+) | RSS feeds cannot be fetched cross-origin from browsers; server proxy is mandatory |
| `<marquee>` HTML tag | CSS `transform: translateX()` | HTML5 deprecation (~2014) | GPU-accelerated, accessible, customizable |
| DOMPurify server-side | sanitize-html (no DOM needed) | N/A (different use cases) | sanitize-html runs without jsdom, ideal for Deno/Edge Functions |
| XML regex parsing | fast-xml-parser | N/A | Handles namespaces, CDATA, entities, malformed XML properly |
| jsdom for server sanitization | sanitize-html (htmlparser2-based) | N/A | No DOM tree construction needed, much lighter for serverless |

**Deprecated/outdated:**
- `<marquee>` HTML element: Deprecated in HTML5, removed from web standards
- Client-side RSS fetching: Blocked by CORS on most feeds
- ammonia-wasm for Deno: Last updated 2021, maintenance concerns

## Open Questions

1. **RSS feed refresh scheduling**
   - What we know: The existing `dataFeedScheduler.js` handles periodic syncing for Google Sheets data sources. RSS feeds need similar periodic refresh.
   - What's unclear: Whether to reuse the existing scheduler or build a parallel one for RSS. RSS feeds typically update less frequently than data sources.
   - Recommendation: Reuse existing scheduler pattern. Add RSS feeds to the scheduling system with a configurable poll interval (default 15 min). The Edge Function handles caching with TTL and conditional GET, so even frequent polls are cheap if the feed hasn't changed.

2. **RSS feed as data source vs standalone entity**
   - What we know: Phase 51 established `DATA_SOURCE_TYPES` with `INTERNAL_TABLE`, `CSV_IMPORT`, `GOOGLE_SHEETS`. RSS feeds could be another type.
   - What's unclear: RSS feed items don't map perfectly to the rows/fields/columns model of data sources. A feed item has fixed fields (title, description, image, date, link).
   - Recommendation: Add `RSS_FEED` as a new data source type for consistency in the admin UI (same creation flow), but RSS widget components should fetch feed data directly via the rss-proxy Edge Function rather than going through the data source rows/fields abstraction. Store the RSS URL and config in the data source record; store parsed/cached feed items in a separate `rss_feed_cache` table.

3. **Ticker item separator style**
   - What we know: News tickers typically separate items with a visual separator (bullet, vertical bar, or spacing).
   - What's unclear: What separator style fits BizScreen's design language.
   - Recommendation: Default to a subtle vertical bar separator (`|` or `\u2022`) with configurable option in widget controls. Match the existing dark-on-light theme pattern.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/functions/unsplash-proxy/index.ts` -- verified Edge Function pattern with `npm:` imports
- Existing codebase: `src/player/components/widgets/DataTableWidget.jsx` -- verified widget pattern with offline fallback
- Existing codebase: `src/components/scene-editor/PropertiesPanel.jsx` -- verified widget type registration
- Existing codebase: `src/player/cacheService.js` -- verified IndexedDB caching with LRU eviction
- Existing codebase: `src/components/player/SocialFeedRenderer.jsx` -- verified card layout patterns
- [Supabase Edge Functions Dependencies](https://supabase.com/docs/guides/functions/dependencies) -- verified `npm:` specifier support
- [fast-xml-parser GitHub releases](https://github.com/NaturalIntelligence/fast-xml-parser/releases) -- v5.3.5 (Feb 2025), pure JS, no native deps
- [sanitize-html GitHub](https://github.com/apostrophecms/sanitize-html) -- pure JS, built on htmlparser2, no DOM required

### Secondary (MEDIUM confidence)
- [Deno npm compatibility for fast-xml-parser](https://deno.com/npm/package/fast-xml-parser) -- confirmed `npm:` specifier works
- [@mikaelporttila/rss v1.1.3](https://github.com/MikaelPorttila/rss) -- Deno-native RSS parser alternative, JSR registry
- [CSS GPU Animation (Smashing Magazine)](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/) -- `transform` is GPU-composited
- [Motion Ticker component](https://motion.dev/docs/react-ticker) -- alternative React ticker, adds +2.1kb
- [react-fast-marquee](https://github.com/justin-chu/react-fast-marquee) -- 1.5k stars, CSS-animation based marquee

### Tertiary (LOW confidence)
- [ammonia-wasm](https://github.com/lucacasonato/ammonia-wasm) -- Deno WASM sanitizer, last updated 2021, not recommended

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- fast-xml-parser and sanitize-html are verified pure JS, work via Deno `npm:`, no native deps
- Architecture: HIGH -- follows exact patterns from existing unsplash-proxy Edge Function and DataTableWidget
- Pitfalls: HIGH -- RSS format variations and XSS are well-documented problem spaces with known solutions
- Ticker animation: HIGH -- CSS `transform: translateX()` is the established pattern for smooth GPU-accelerated scrolling

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable domain, well-established libraries)
