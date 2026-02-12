# Phase 53: Social Feed & Content Moderation - Research

**Researched:** 2026-02-12
**Domain:** Social media feed integration, content moderation UI, hashtag filtering, layout zone widget assignment
**Confidence:** HIGH

## Summary

Phase 53 wires together an extensive set of existing components to deliver social feed assignment to layout zones, content moderation, and hashtag filtering. The critical finding is that **nearly all backend infrastructure already exists**: the `social_accounts`, `social_feeds`, `social_feed_settings`, `social_feed_moderation`, and `social_sync_queue` tables are already created (migration 081). The `SocialFeedWidget` (editor), `SocialFeedRenderer` (player), `SocialFeedWidgetSettings` (settings panel), and `socialFeedSyncService` (sync + CRUD) are all built and functional. The `get_social_feed_posts` PostgreSQL function already handles moderation filtering (`approved` mode) and hashtag filtering (`hashtag` mode with GIN index on `social_feeds.hashtags`). Provider-specific sync services exist for Instagram, Facebook, TikTok, and Google Reviews.

What is **missing** is the glue: (1) a `social-feed` widget type in the scene editor's `WidgetControls` selector and corresponding `SocialFeedWidgetControls` in PropertiesPanel, (2) a `SocialFeedWidget` player widget component registered in `SceneWidgetRenderer` and the widgets barrel export, (3) a dedicated content moderation queue page where users can approve/reject individual posts, and (4) the ability to assign a social feed widget to a layout zone (either via the existing `content_type`/`content_id` polymorphic pattern or by extending the zone assignment UI). The layout zone system currently supports `assigned_playlist_id` and `assigned_media_id` but not widgets directly -- the scene editor's block/widget pipeline is the natural integration point.

**Primary recommendation:** Follow the exact Phase 52 RSS widget pattern -- add `social-feed` as a new widget type in the scene editor WidgetControls, create `SocialFeedWidgetControls` for configuration, create a player `SocialFeedWidget` that wraps the existing `SocialFeedRenderer`, and build a moderation queue page reusing the existing `moderatePost` and `getModerationQueue` service functions.

## Existing Codebase Analysis (CRITICAL -- what's already built)

### Already Built -- DO NOT rebuild

| Component | File | Relevance |
|-----------|------|-----------|
| Social accounts table + RLS | `supabase/migrations/081_social_media_feeds.sql` | `social_accounts` with OAuth tokens per provider |
| Social feeds cache table | Same migration | `social_feeds` with hashtags (GIN-indexed), media, engagement metrics |
| Social feed settings table | Same migration | `social_feed_settings` per-widget config (provider, layout, filter_mode, hashtags, display opts) |
| Social feed moderation table | Same migration | `social_feed_moderation` with approved boolean, moderated_by, notes |
| Social sync queue table | Same migration | `social_sync_queue` for rate-limited background sync |
| `get_social_feed_posts()` function | Same migration | Server-side filtering by moderation status AND hashtags (uses `&&` array overlap) |
| `upsert_social_feed_post()` function | Same migration | Idempotent post insert/update with hashtag extraction |
| `SocialFeedWidget` (editor) | `src/components/SocialFeedWidget.jsx` | Full widget with carousel/grid/list/single/masonry layouts, auto-rotation |
| `SocialFeedWidgetSettings` | `src/components/SocialFeedWidgetSettings.jsx` | Config panel: provider, account, layout, filter mode, hashtags, display toggles |
| `SocialFeedRenderer` (player) | `src/components/player/SocialFeedRenderer.jsx` | Player-side renderer, cached data only, no API calls, offline-safe |
| `socialFeedSyncService` | `src/services/socialFeedSyncService.js` | Full sync lifecycle + CRUD: `moderatePost()`, `getModerationQueue()`, `saveFeedWidgetSettings()`, `getSocialFeedPosts()` |
| Social provider services | `src/services/social/*.js` | Instagram, Facebook, TikTok, Google Reviews sync + OAuth |
| Social constants | `src/services/social/index.js` | `SOCIAL_PROVIDERS`, `PROVIDER_LABELS`, `FILTER_MODES`, `LAYOUT_OPTIONS` |
| `SocialAccountsPage` | `src/pages/SocialAccountsPage.jsx` | Account connection management (OAuth flow, sync, disconnect) |
| RSS widget pattern (Phase 52) | `src/components/scene-editor/RssWidgetControls.jsx` | **Exact pattern to follow** for SocialFeedWidgetControls |
| Widget type selector | `src/components/scene-editor/PropertiesPanel.jsx` L643-652 | `widgetTypes` array -- add `social-feed` entry |
| Scene widget renderer | `src/player/components/SceneRenderer.jsx` L131 | `SceneWidgetRenderer` switch -- add `social-feed` case |
| Widget barrel export | `src/player/components/widgets/index.js` | Add `SocialFeedWidget` export |
| EditorCanvas widget previews | `src/components/scene-editor/EditorCanvas.jsx` L48 | `WIDGET_ICONS` map -- add `social-feed` icon |
| Alert engine integration | `src/services/alertEngineService.js` | `raiseSocialFeedSyncFailedAlert` already implemented |

### What Needs to Be Built (net-new)

| Component | Purpose | Depends On |
|-----------|---------|-----------|
| `SocialFeedWidgetControls` | Scene editor controls for social feed widget config | Follow `RssWidgetControls` pattern |
| `social-feed` widget type registration | Add to `widgetTypes[]` in WidgetControls, `WIDGET_ICONS` in EditorCanvas, switch in SceneWidgetRenderer | Existing arrays/switches |
| Player `SocialFeedWidget` wrapper | Thin wrapper in `player/components/widgets/` that delegates to `SocialFeedRenderer` | Existing `SocialFeedRenderer` |
| EditorCanvas social-feed preview | Static preview tile for social feed in the scene editor canvas | Follow `rss-card` pattern |
| Moderation Queue page | List posts, approve/reject, filter by account/status | `getModerationQueue()`, `moderatePost()` already built |
| Layout zone social feed assignment | Enable assigning social feed widget to layout zones | Layout zone system extension |

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | ^19.1.1 | UI framework | Already installed |
| Supabase JS | ^2.x | DB queries, auth, realtime | Already installed |
| Tailwind CSS | ^3.4.18 | Styling | Already installed |
| Lucide React | ^0.x | Icons | Already installed |

### No New Dependencies Required

Phase 53 is entirely a wiring/integration phase. All backend tables, functions, sync services, and rendering components already exist. No new npm packages are needed. The work is:
1. Registering `social-feed` as a widget type in the scene editor pipeline
2. Creating thin adapter/wrapper components
3. Building the moderation queue UI
4. Ensuring social feeds render correctly in layout zones

## Architecture Patterns

### Pattern 1: Widget Type Registration (established in Phase 51-52)

**What:** Adding a new widget type follows a fixed 4-point registration pattern.
**When to use:** Every time a new widget type is added to the scene editor.

```
1. PropertiesPanel.jsx > WidgetControls > widgetTypes[] -- add { key, icon, label }
2. PropertiesPanel.jsx > WidgetControls > conditional render -- add widget-specific controls
3. EditorCanvas.jsx > WIDGET_ICONS -- add icon mapping
4. EditorCanvas.jsx > renderBlockContent > widget switch -- add preview tile
5. SceneRenderer.jsx > SceneWidgetRenderer > switch -- add player rendering case
6. player/components/widgets/index.js -- barrel export
```

**Source:** Phase 52 (`rss-ticker`, `rss-card`) established this exact pattern.

### Pattern 2: Widget Controls Component (from RssWidgetControls)

**What:** Extract widget-specific configuration into a standalone component file.
**Why:** Keeps PropertiesPanel.jsx manageable; each widget type gets its own controls file.

```jsx
// SocialFeedWidgetControls.jsx -- follows RssWidgetControls pattern
export function SocialFeedWidgetControls({ props, onPropChange }) {
  // Provider selector (instagram, facebook, tiktok, google)
  // Account selector (from getConnectedAccounts)
  // Layout selector (carousel, grid, list, single, masonry)
  // Filter mode (all, approved, hashtag, latest)
  // Hashtag input (when filter_mode === 'hashtag')
  // Display toggles (showCaption, showLikes, showDate, showAuthor)
  // Max items slider
  // Rotation speed slider (for carousel/single)
}
```

### Pattern 3: Player Widget Wrapper (from DataTableWidget/RssTickerWidget)

**What:** Player widgets in `player/components/widgets/` are thin wrappers that handle data fetching and delegate rendering.

```jsx
// SocialFeedWidget.jsx in player/components/widgets/
export function SocialFeedWidget({ props }) {
  // props contains: accountId, provider, layout, maxItems, etc.
  // Delegates to existing SocialFeedRenderer with appropriate props
  return <SocialFeedRenderer {...props} />;
}
```

### Pattern 4: Moderation Queue (approve/reject UI)

**What:** A dedicated page for reviewing social feed posts before they appear on screens.
**Architecture:** Uses existing `getModerationQueue()` for data, `moderatePost()` for actions.

Key data flow:
```
social_feeds (cached posts)
  -> LEFT JOIN social_feed_moderation (approval status)
  -> get_social_feed_posts() filters by filter_mode
     - 'all': shows everything (default, moderation optional)
     - 'approved': only shows posts where approved = true (or no moderation record = auto-approved)
     - 'hashtag': filters by hashtag overlap
     - 'latest': most recent posts
```

**Important nuance in existing DB function:** `COALESCE(m.approved, true)` means posts WITHOUT a moderation record are treated as approved by default. This is intentional -- moderation is opt-in. When filter_mode is 'approved', unmoderated posts still show. To require explicit approval, users would need to set filter_mode to 'approved' AND proactively reject unwanted posts.

### Pattern 5: Layout Zone Widget Assignment

**What:** The layout zone system currently supports `assigned_playlist_id` and `assigned_media_id`. For social feed widgets, the most architecturally consistent approach is to use the scene editor's widget block system (which already supports social feed via the SVG editor's `createSocialFeedWidget()`).

**Two integration paths:**

1. **Scene editor widget (recommended):** Users add a social-feed widget block in the scene editor, configure it via `SocialFeedWidgetControls`. The widget is stored in the scene's `design_json`. When the scene is assigned to a layout zone (via `content_type: 'scene'`), the social feed renders in that zone. This leverages the ENTIRE existing widget pipeline.

2. **Direct zone assignment (not recommended for Phase 53):** Would require adding `assigned_widget_type` + `assigned_widget_config` columns to `layout_zones`, updating `get_layout_content()`, and extending `ZonePlayer`. This is more work for minimal gain since the scene editor path already works.

**Recommendation:** Use path 1 (scene editor widget). A user creates a scene with a social feed widget, then assigns that scene to a layout zone.

### Recommended Project Structure

```
src/
  components/
    scene-editor/
      SocialFeedWidgetControls.jsx    # NEW: Editor controls (follows RssWidgetControls)
    moderation/
      ModerationQueue.jsx             # NEW: Moderation queue component
  pages/
    ModerationPage.jsx                # NEW: Moderation queue page
  player/
    components/
      widgets/
        SocialFeedWidget.jsx          # NEW: Player widget wrapper
```

### Anti-Patterns to Avoid

- **Rebuilding SocialFeedRenderer:** The player renderer already exists and handles all 5 layout modes. Do NOT create a new one. Wrap it.
- **Rebuilding the sync service:** `socialFeedSyncService.js` already has `moderatePost()`, `getModerationQueue()`, `saveFeedWidgetSettings()`. Use them directly.
- **Direct API calls from player:** The explicit constraint says "Real-time social media API polling from player is OUT OF SCOPE." The existing `SocialFeedRenderer` correctly uses cached Supabase data only.
- **Custom moderation state management:** The DB function `get_social_feed_posts()` already handles all filter modes. Don't re-implement filtering client-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Social feed rendering | New social card/grid renderer | `SocialFeedRenderer` + `SocialFeedWidget` | Already handles 5 layout modes with auto-rotation |
| Post moderation logic | Custom approve/reject service | `moderatePost()` in socialFeedSyncService | Already handles upsert with user tracking |
| Moderation queue data | Custom query builder | `getModerationQueue()` + `get_social_feed_posts()` | Already joins feeds with moderation status |
| Hashtag filtering | Client-side array filtering | DB function `get_social_feed_posts()` with `&&` operator | Uses GIN index for performance |
| Widget settings CRUD | New settings service | `saveFeedWidgetSettings()` / `getFeedWidgetSettings()` | Already handles upsert on widget_id conflict |
| Account management | New OAuth flow | `SocialAccountsPage` + provider services | Complete OAuth flow already built |
| Feed sync | New polling service | `socialFeedSyncService` | Rate-limited, multi-provider, with alert integration |

**Key insight:** Phase 53 is primarily an integration/wiring phase. The heavy lifting (DB schema, sync service, rendering components, OAuth) was built as part of migration 081 and the social services. The work is connecting these pieces to the scene editor pipeline and building the moderation UI.

## Common Pitfalls

### Pitfall 1: Moderation Default Behavior Confusion
**What goes wrong:** Misunderstanding that `COALESCE(m.approved, true)` means unmoderated posts are auto-approved.
**Why it happens:** The moderation is opt-in -- if no moderation record exists, the post shows by default.
**How to avoid:** Document this clearly in the moderation UI. When filter_mode is 'approved', show a notice: "Posts without moderation records are shown by default. Reject posts you don't want displayed."
**Warning signs:** Users expect "approved only" to mean "only explicitly approved posts."

### Pitfall 2: Widget ID Mismatch Between Scene Editor and Settings
**What goes wrong:** The `social_feed_settings.widget_id` references the scene element's UUID from `design_json`, not a layout zone ID.
**Why it happens:** The settings table was designed for scene editor widgets (per the comment: "References element ID in scene design_json").
**How to avoid:** When creating the `SocialFeedWidgetControls`, ensure the widget ID passed is the scene block's `id` field, which is a UUID generated when the block is added to the scene.
**Warning signs:** Settings don't persist, or settings from one widget appear on another.

### Pitfall 3: Missing Tenant ID in Queries
**What goes wrong:** Social feed queries return empty results because tenant_id is not properly scoped.
**Why it happens:** The `get_social_feed_posts` function derives tenant_id from `auth.uid()` when not explicitly passed, but the player may not have the same auth context.
**How to avoid:** Always pass `tenant_id` explicitly in player contexts. The `SocialFeedRenderer` uses direct Supabase queries (not the RPC function), which bypasses this issue but may not respect moderation filtering.
**Warning signs:** Posts show in editor preview but not on player, or moderation filtering doesn't apply on player.

### Pitfall 4: Not Connecting SocialFeedRenderer to the Widget Settings Pipeline
**What goes wrong:** The new player `SocialFeedWidget` passes raw props but doesn't look up `social_feed_settings` to get the full configuration.
**Why it happens:** The existing `SocialFeedRenderer` already has internal settings lookup via `fetchCachedPosts(widgetId, ...)`, but the scene editor stores config in `design_json` props, not in `social_feed_settings`.
**How to avoid:** Decide on ONE source of truth. Recommendation: store core display props in scene `design_json` (like RSS widgets do), and only use `social_feed_settings` for the feed-specific config (account_id, filter_mode, hashtags). The `SocialFeedWidgetControls` should save to `social_feed_settings` when the widget ID is known.
**Warning signs:** Duplicate or conflicting configuration between design_json and social_feed_settings.

### Pitfall 5: Layout Zone Assignment Scope Creep
**What goes wrong:** Attempting to add direct social feed widget support to layout zones (new DB columns, new zone player logic) when the scene-based approach works.
**Why it happens:** The requirement says "assign social feed widget to layout zones" which could be interpreted as direct zone assignment.
**How to avoid:** Use the scene editor as the composition layer. A user creates a scene containing a social feed widget, then assigns that scene to a layout zone. This leverages all existing infrastructure.
**Warning signs:** Modifying layout_zones schema, get_layout_content function, or ZonePlayer for social feeds.

## Code Examples

### Example 1: Adding social-feed to WidgetControls (PropertiesPanel.jsx)

```jsx
// Source: Following pattern in PropertiesPanel.jsx L643-652
const widgetTypes = [
  { key: 'clock', icon: Clock, label: 'Clock' },
  { key: 'date', icon: Calendar, label: 'Date' },
  { key: 'weather', icon: CloudSun, label: 'Weather' },
  { key: 'qr', icon: QrCode, label: 'QR Code' },
  { key: 'data-table', icon: Table2, label: 'Data Table' },
  { key: 'rss-ticker', icon: Rss, label: 'News Ticker' },
  { key: 'rss-card', icon: Newspaper, label: 'News Cards' },
  { key: 'social-feed', icon: Share2, label: 'Social Feed' },  // NEW
];
```

### Example 2: SocialFeedWidgetControls structure

```jsx
// Source: Following RssWidgetControls.jsx pattern
import { getConnectedAccounts } from '../../services/socialFeedSyncService';
import { PROVIDER_LABELS, LAYOUT_LABELS, FILTER_MODE_LABELS } from '../../services/social';

export function SocialFeedWidgetControls({ props, onPropChange }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    getConnectedAccounts().then(setAccounts);
  }, []);

  return (
    <div className="space-y-3">
      {/* Provider selection */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Platform</label>
        <select value={props.provider || 'instagram'}
          onChange={(e) => onPropChange('provider', e.target.value)}
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700">
          {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      {/* Account, Layout, Filter Mode, Hashtags, Display Options... */}
    </div>
  );
}
```

### Example 3: Player SocialFeedWidget wrapper

```jsx
// Source: Following DataTableWidget/RssTickerWidget patterns
import SocialFeedRenderer from '../../../components/player/SocialFeedRenderer';

export function SocialFeedWidget({ props }) {
  const safeProps = props || {};
  return (
    <SocialFeedRenderer
      widgetId={safeProps.widgetId}
      accountId={safeProps.accountId}
      provider={safeProps.provider || 'instagram'}
      layout={safeProps.layout || 'carousel'}
      maxItems={safeProps.maxItems || 6}
      showCaption={safeProps.showCaption !== false}
      showLikes={safeProps.showLikes !== false}
      showDate={safeProps.showDate !== false}
      showAuthor={safeProps.showAuthor !== false}
      rotationSpeed={safeProps.rotationSpeed || 5}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
```

### Example 4: SceneWidgetRenderer addition

```jsx
// Source: SceneRenderer.jsx L131-155
case 'social-feed':
  return <SocialFeedWidget props={safeProps} />;
```

### Example 5: Moderation Queue using existing service

```jsx
// Source: Using socialFeedSyncService.js exports
import { getModerationQueue, moderatePost } from '../services/socialFeedSyncService';

// Fetch posts with moderation status
const posts = await getModerationQueue(accountId);
// posts[].moderation is { approved, moderated_at, notes } or null (unmoderated)

// Approve a post
await moderatePost(feedId, true, 'Approved for display');

// Reject a post
await moderatePost(feedId, false, 'Contains inappropriate content');
```

### Example 6: EditorCanvas social-feed preview

```jsx
// Source: Following rss-card preview pattern in EditorCanvas.jsx L611-620
case 'social-feed':
  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-800/30 p-0.5"
      style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.5rem)' }}>
      {/* Preview: show placeholder social post cards */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="bg-gray-700/30 rounded-sm flex-1 flex items-center justify-center">
          <span className="text-gray-500 text-xs">Social Feed</span>
        </div>
      </div>
    </div>
  );
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct API calls from player | Server-side sync + cached data | Phase 52 (rss-proxy) | Players never make external API calls (rate limits, key exposure) |
| Single content type per zone | Scene-based composition | Phase 51+ | Zones can display any scene, which can contain any widget type |
| Manual hashtag extraction | GIN-indexed `hashtags TEXT[]` column | Migration 081 | Efficient server-side hashtag filtering via `&&` array overlap |

## Open Questions

1. **Settings Source of Truth**
   - What we know: Scene editor stores widget config in `design_json` props (like RSS widgets). Social feed also has a `social_feed_settings` table for per-widget config.
   - What's unclear: Should the SocialFeedWidgetControls write to `design_json` props (like RSS), to `social_feed_settings` (existing table), or both?
   - Recommendation: Store display props (layout, show flags, rotation speed) in `design_json` for consistency with other widgets. Store feed-specific config (accountId, filterMode, hashtags) also in `design_json` since the player `SocialFeedRenderer` can receive these as props. The `social_feed_settings` table becomes a secondary/optional persistence layer for cases where the widget ID is stable (e.g., standalone social feed display outside scenes).

2. **Moderation Page Location in Navigation**
   - What we know: No moderation page currently exists in the app routes.
   - What's unclear: Where in the navigation hierarchy should it live?
   - Recommendation: Add as a sub-section of a "Content Moderation" page accessible from the main nav, or as a tab on the Social Accounts page. The moderation queue is a natural extension of social account management.

3. **Auto-Approval vs. Explicit Approval Default**
   - What we know: Current DB function treats unmoderated posts as approved (`COALESCE(m.approved, true)`).
   - What's unclear: Should the moderation UI default new widgets to 'all' (no moderation) or 'approved' (require moderation)?
   - Recommendation: Default to 'all' for simplicity. Users who want moderation explicitly select 'approved' filter mode. The moderation queue page should make it easy to bulk-approve/reject.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/081_social_media_feeds.sql` -- Complete social feed DB schema with moderation, hashtag filtering, RLS, and helper functions
- `src/services/socialFeedSyncService.js` -- Full service layer with moderatePost(), getModerationQueue(), saveFeedWidgetSettings()
- `src/components/SocialFeedWidget.jsx` -- Existing editor widget with 5 layout modes
- `src/components/SocialFeedWidgetSettings.jsx` -- Existing settings panel
- `src/components/player/SocialFeedRenderer.jsx` -- Existing player renderer (cached data only)
- `src/services/social/index.js` -- Provider constants, filter modes, layout options
- `src/components/scene-editor/PropertiesPanel.jsx` -- Widget type registration pattern (L643-652)
- `src/player/components/SceneRenderer.jsx` -- SceneWidgetRenderer switch pattern (L131-155)
- `src/components/scene-editor/RssWidgetControls.jsx` -- Exact pattern to follow for controls component
- `.planning/phases/52-rss-external-data-proxy/52-RESEARCH.md` -- Phase 52 established widget pipeline pattern

### Secondary (MEDIUM confidence)
- `supabase/migrations/016_player_content_resolution.sql` -- get_layout_content() function showing zone content resolution
- `src/services/layoutService.js` -- Layout zone CRUD with assigned_playlist_id/assigned_media_id pattern
- `src/player/components/ZonePlayer.jsx` -- Zone content playback (currently playlist/media only)
- `supabase/migrations/014_yodeck_phase1_media_playlists.sql` -- Original layout_zones schema with content_type/content_id

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies needed; all components exist
- Architecture: HIGH -- Phase 52 RSS pattern is exact template; 4-point widget registration is proven
- Integration: HIGH -- All service functions, DB schema, and rendering components verified in codebase
- Pitfalls: HIGH -- Identified from direct code analysis of existing moderation logic and settings patterns

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable -- infrastructure is fully built, this is wiring work)
