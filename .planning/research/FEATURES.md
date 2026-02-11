# Feature Landscape: Data-Driven Signage Widgets

**Domain:** Digital signage data source rendering, social/RSS feeds, utility widgets
**Researched:** 2026-02-11
**Overall confidence:** HIGH (strong training data for Yodeck, ScreenCloud, OptiSigns, Rise Vision, NoviSign patterns; verified against existing BizScreen codebase)

## Summary

Research into data-driven widget features for digital signage reveals three distinct feature clusters with different maturity expectations:

1. **Data Source Widgets (Google Sheets/CSV/API rendering)**: Table stakes is connecting a spreadsheet and showing it as a formatted table or menu board on screen. The differentiation comes from how seamlessly data binds to visual templates (not just raw tables), automatic refresh with visual transition, and multi-row pagination (auto-scrolling through rows that don't fit one screen). BizScreen already has the data management layer (DataSourcesPage, Google Sheets sync, CSV import, data binding resolution) -- what is missing is the rendering pipeline: a DataSourceWidget that resolves bindings at display time, styled table/list/card renderers for the player, and configurable poll refresh that triggers re-render.

2. **Social/RSS Feed Display**: BizScreen has strong foundations -- SocialFeedWidget with 5 layout modes (carousel, grid, list, single, masonry), SocialFeedRenderer for player with cached-data-only rendering, a sync service with rate limiting across 4 providers (Instagram, Facebook, TikTok, Google Reviews), and an RSS ticker app. What is missing is connecting these to the layout zone system, RSS feed widget (not just ticker), content moderation/approval for social posts before display, and hashtag filtering at the player level.

3. **Weather/Time/Countdown Widgets**: Weather and Clock already render in the player (WeatherWidget, ClockWidget, full WeatherWall app). Missing: countdown widget (event countdown, store opening, promotion end), date widget with formatting options, world clock (multi-timezone), and analog clock styles beyond the basic digital display.

**Critical dependency insight**: BizScreen's existing `AppRenderer` already routes app types (clock, weather, web_page, rss_ticker, data_table) with a `useAppData` hook for polling refresh. New widgets should follow this established pattern rather than inventing new rendering infrastructure.

---

## Table Stakes

Features users expect in any digital signage platform offering "data-driven content." Missing = product feels incomplete.

### Data Source Rendering

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Google Sheets table display | Every competitor offers this (Yodeck, ScreenCloud, OptiSigns) | Med | DataSourcesPage + googleSheetsService exist; DataTableApp renders generic tables; DataBoundWizardModal creates data-bound slides | Need to connect existing data sources to player rendering via DataTableApp or new widget |
| CSV data display | Complement to Sheets for offline/simple use | Low | CSV import + createDataSourceFromCSV exist; same rendering path as Sheets | Already built on management side; just need player path |
| Auto-refresh/polling | Users expect data to update without manual intervention | Med | `useAppData` hook polls every N minutes; data source has `pollIntervalMinutes`; Supabase realtime subscriptions exist | Configurable interval (5-60 min) already designed in link modal |
| Table layout with header/rows | Default expectation for spreadsheet data | Low | DataTableApp already renders headers + rows with alternating colors | Need to wire data source service into DataTableApp config |
| Menu board layout | #1 use case for restaurant/retail signage | Med | DataBoundWizardModal generates list/grid/featured blueprints | Scene-based approach exists; need standalone widget approach too |
| Real-time sync status indicator | Users need confidence data is current | Low | Sync status + sync history + last_sync_at all tracked in data source service | Need to expose "last updated" in player corner overlay |
| Data binding to scene text elements | Let users bind specific fields to text blocks in scene editor | Med | Full data binding system exists: `resolveBinding`, `resolveMultipleBindings`, `getBindingKey`, `formatValue` | Already implemented in DataBoundWizardModal; needs polish |

### Social/RSS Feed Display

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Social media wall/feed display | Standard feature in Yodeck, ScreenCloud, OptiSigns | Med | SocialFeedWidget (5 layouts), SocialFeedRenderer (player), socialFeedSyncService | Core exists; needs zone integration |
| Instagram feed | Most requested social platform for signage | Low | instagramService with syncInstagramPosts | Exists |
| Facebook feed | Second most requested | Low | facebookService with syncFacebookPosts | Exists |
| Google Reviews display | Critical for restaurants/retail | Low | googleReviewsService, star rating rendering in SocialFeedRenderer | Exists with rating stars |
| RSS feed content display | Expected for news/corporate comms | Med | RssTickerApp exists as scrolling ticker only | Need full RSS card/article layout, not just ticker |
| Auto-rotation of feed items | Signage cycles through content automatically | Low | rotationSpeed prop on SocialFeedWidget, carousel auto-advance | Already built |
| Configurable item count | Control how many posts/items show | Low | maxItems prop on SocialFeedWidget | Already built |

### Utility Widgets

| Feature | Why Expected | Complexity | Existing BizScreen State | Notes |
|---------|-------------|------------|--------------------------|-------|
| Clock display | Universal expectation | Low | ClockWidget (simple), ClockApp (full-screen with date) | Already built in two variants |
| Weather display | Top 3 most-used widget across all platforms | Low | WeatherWidget (minimal/card), WeatherWall (full-screen), weatherService | Already built |
| Current date display | Common companion to clock | Low | DateWidget exists in player widgets index | Already exported |
| Countdown timer | Expected for events, promotions, store openings | Med | Not built | Need new CountdownWidget |
| Configurable refresh intervals | Users control how often data updates | Low | `refreshMinutes` config on AppRenderer's useAppData, `pollIntervalMinutes` on data sources | Pattern exists; apply consistently |

---

## Differentiators

Features that set BizScreen apart. Not expected by all users, but valued when present.

### Data Source Rendering

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual template binding (not just tables) | Data appears in branded scene designs, not raw spreadsheet look | High | DataBoundWizardModal already does this; extend to more template types (cards, featured items, image grids) |
| Multi-row auto-pagination | When data has 20 items but screen fits 6, automatically cycle through pages with smooth transitions | Med | Yodeck and ScreenCloud offer this; critical for menu boards with many items |
| Row filtering/conditional display | Show only rows where a column matches a condition (e.g., "Category = Lunch") | Med | rowSelector already supports `match` mode in data binding; expose in UI |
| Image URL field rendering | If a data source field contains an image URL, render it as an image (product photos in menu boards) | Med | FIELD_DATA_TYPES.IMAGE_URL exists; DataTableApp currently renders as text |
| Data source preview in editor | See live data in the scene editor while designing | Med | DataBoundWizardModal has a preview; extend to real-time in EditorCanvas |
| Transition animations between data refreshes | Smooth fade/slide when data updates rather than jarring content replacement | Med | Improves perceived quality; standard in premium platforms |
| Multi-source dashboard | Combine multiple data sources in one layout (weather + menu + social in zones) | Low | Layout zone system already supports this via zone content assignment |

### Social/RSS Feed Display

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Content moderation/approval queue | Review social posts before they appear on screens | Med | ReviewInboxPage exists; socialFeedSyncService tracks posts; need approval status field |
| Hashtag-based filtering | Only show posts with specific hashtags | Low | FILTER_MODES.HASHTAG defined in social index; implement filter in query |
| TikTok video playback | Video content from TikTok plays natively on screens | Med | tiktokService + video rendering in SocialFeedRenderer exist |
| RSS article cards (not just ticker) | Full article preview with image, title, excerpt in card format | Med | RssTickerApp is ticker-only; need RssCardApp/RssFeedWidget |
| Multi-feed aggregation | Combine Instagram + Facebook + Reviews into one rotating wall | Med | Each provider syncs independently; need aggregation layer |
| Social proof overlay | Show review count + average rating as a persistent overlay on any content | Low | Google Reviews data available; create compact overlay widget |

### Utility Widgets

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Countdown to specific date/time | "Grand Opening in 3 days 14 hours" for promotions | Med | New widget; straightforward timer logic |
| Recurring countdown | Daily countdown (e.g., "Happy Hour starts in 2h 15m") | Med | Needs day-of-week + time-of-day logic |
| World clock (multi-timezone) | Corporate offices with teams across time zones | Low | ClockApp already supports timezone config; need multi-instance layout |
| Analog clock face | Visual variety; some venues prefer analog aesthetic | Med | SVG-based clock face rendering needed |
| Custom date format per locale | "Lundi 11 Fevrier 2026" vs "Monday, February 11, 2026" | Low | Intl.DateTimeFormat with locale prop |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full Google Sheets OAuth integration | Massive complexity (OAuth flows, token refresh, scoped permissions); public sheet access via API key already works | Keep current approach: publicly-shared sheets with API key reads. Document that sheets must be "Anyone with link" |
| User-editable data directly on player screens | Signage is display-only; interactive data editing belongs in CMS | Keep data editing in DataSourcesPage; player is read-only |
| Real-time social media API polling from player | Players should never make external API calls (rate limits, API keys on client) | Continue SocialFeedRenderer pattern: player reads cached data from Supabase; sync service handles API calls server-side |
| Custom widget SDK / plugin system | Premature abstraction; too few widget types to justify SDK overhead | Use the established AppRenderer switch pattern; add new widget types as cases |
| AI-powered data interpretation | "Smart" data display that reorganizes or summarizes spreadsheet data | Display data exactly as structured; users control layout via templates and field mapping |
| Bi-directional data sync (write back to Sheets) | Complexity + auth concerns; one-way sync is the standard | Read-only from Google Sheets; edits happen in Sheets or BizScreen DataSourcesPage |
| Social media posting/scheduling | Completely different product category; stay focused on display | Only consume/display social content, never post |
| Embeddable third-party widget marketplace | Too early; need core widgets solid first | Build first-party widgets; consider marketplace in future milestone |

---

## Feature Dependencies

```
Data Source Management (EXISTS) --> Data Source Widget Renderer (NEW)
                                --> Data-Bound Scene Templates (PARTIAL - DataBoundWizardModal)
                                --> Player Data Resolution (PARTIAL - resolveMultipleBindings)

Google Sheets Sync (EXISTS) --> Configurable Poll Refresh (PARTIAL - interval exists, timer needed)
                            --> Sync Status in Player (NEW)

Social Feed Sync (EXISTS) --> Social Feed Zone Widget (NEW - connect to layout zones)
                          --> Content Moderation Queue (NEW)
                          --> Hashtag Filtering (NEW)

SocialFeedWidget (EXISTS) --> Player SocialFeedRenderer (EXISTS)
                          --> Layout Zone Integration (NEW)

SocialFeedRenderer (EXISTS) --> Already reads from Supabase cached data
                             --> Needs: zone sizing awareness, refresh on new data

RssTickerApp (EXISTS) --> RSS Card Layout (NEW)
                      --> RSS in Layout Zones (NEW)

ClockWidget (EXISTS) --> Countdown Widget (NEW - separate widget)
WeatherWidget (EXISTS) --> No new dependencies for weather
DateWidget (EXISTS) --> Locale formatting enhancement (LOW)

AppRenderer routing (EXISTS) --> New widget types added as cases
useAppData hook (EXISTS) --> Reuse for all data-fetching widgets
Layout Zone System (EXISTS) --> All widgets must render in zones
```

---

## MVP Recommendation

### Prioritize (Phase 1 -- Wire Existing Infrastructure)

These features connect already-built infrastructure to produce visible value:

1. **Data Source Widget in Player** -- Connect DataSourcesPage data to DataTableApp rendering via direct Supabase query (not just useAppData API). The data source service has `getDataSource`, `getDataSourceRows`, `subscribeToDataSource`. Wire these to a new player widget.
   - Complexity: Med
   - Leverage: DataTableApp + dataSourceService + existing data
   - Why first: Highest user value; "I connected my Google Sheet, now show it on screen"

2. **Social Feed in Layout Zones** -- Make SocialFeedWidget/SocialFeedRenderer available as a layout zone content type. The widget exists with 5 layouts; it just needs to be assignable to zones.
   - Complexity: Low
   - Leverage: SocialFeedWidget + SocialFeedRenderer + layout zone system
   - Why second: Most infrastructure already built; small integration effort

3. **Countdown Widget** -- New widget but straightforward: target date/time, calculate remaining, display formatted countdown. Follow ClockWidget pattern.
   - Complexity: Low-Med
   - Leverage: AppRenderer routing, widget pattern from ClockWidget
   - Why third: Unique feature request; simple to build right

4. **Configurable Poll Refresh UI** -- Expose the existing pollIntervalMinutes in a user-friendly way across all data widgets. Show "last updated" timestamp.
   - Complexity: Low
   - Leverage: useAppData hook, data source pollIntervalMinutes
   - Why fourth: Completes the data pipeline UX

### Prioritize (Phase 2 -- Polish and Differentiate)

5. **Multi-row auto-pagination** for data tables/menus -- When data exceeds visible rows, auto-cycle through pages
6. **RSS card/article layout** -- Extend RssTickerApp with card view for news feeds
7. **Content moderation for social feeds** -- Approval queue before posts hit screens
8. **Image URL rendering in data sources** -- Render IMAGE_URL field type as actual images
9. **Transition animations** on data refresh

### Defer

- **Analog clock face** -- Nice to have, not core to data-driven milestone
- **World clock multi-timezone** -- Niche use case
- **Multi-feed aggregation** -- Complex; individual feeds work fine for v1
- **TikTok video playback optimization** -- Works via standard video tag; optimize later if needed
- **Recurring daily countdown** -- Complex scheduling logic; offer one-time countdown first

---

## Existing BizScreen Assets Inventory

This section maps what already exists to avoid rebuilding.

### Fully Built (Use As-Is)

| Asset | Location | What It Does |
|-------|----------|-------------|
| DataSourcesPage | `src/pages/DataSourcesPage.jsx` | Full CRUD for data sources, CSV import, Google Sheets linking, field/row editing, sync history |
| dataSourceService | `src/services/dataSourceService.js` | Complete service: CRUD, CSV parsing, data binding resolution, realtime subscriptions, sync status |
| googleSheetsService | `src/services/googleSheetsService.js` | Sheet fetching via API key, change detection, field generation, sync with status tracking |
| SocialFeedWidget | `src/components/SocialFeedWidget.jsx` | 5 layout modes (carousel, grid, list, single, masonry), auto-rotation, post info display |
| SocialFeedRenderer | `src/components/player/SocialFeedRenderer.jsx` | Player-optimized renderer, cached data only, 5 view modes, Google Reviews special rendering |
| socialFeedSyncService | `src/services/socialFeedSyncService.js` | Background sync for 4 providers, rate limiting, concurrent sync control |
| Social provider services | `src/services/social/` | Instagram, Facebook, TikTok, Google Reviews sync services |
| WeatherWidget | `src/player/components/widgets/WeatherWidget.jsx` | Minimal + card styles, auto-refresh, OpenWeatherMap integration |
| WeatherWall | `src/components/WeatherWall/` | Full-screen weather with 3 themes (animated, classic, glass) |
| ClockWidget | `src/player/components/widgets/ClockWidget.jsx` | Configurable size, color, 12-hour format |
| ClockApp | `src/player/components/AppRenderer.jsx` | Full-screen clock with date, timezone support, format options |
| DateWidget | `src/player/components/widgets/DateWidget.jsx` | Date display widget |
| AppRenderer | `src/player/components/AppRenderer.jsx` | Routes app types to components, `useAppData` hook with caching + polling |
| DataTableApp | `src/player/components/AppRenderer.jsx` | Table rendering with headers, alternating rows, dark/light theme, "has more" indicator |
| RssTickerApp | `src/player/components/AppRenderer.jsx` | Scrolling ticker with configurable speed, title bar, API data fetching |
| DataBoundWizardModal | `src/components/scene-editor/DataBoundWizardModal.jsx` | 3-step wizard: select source, configure layout (list/grid/featured), preview + create slide |

### Partially Built (Extend)

| Asset | Location | What Exists | What's Missing |
|-------|----------|-------------|----------------|
| Data binding in scenes | DataBoundWizardModal + dataSourceService | Blueprint generation with `dataBinding` props on text blocks | Runtime resolution in player SceneRenderer; only wizard creates bindings, not manual scene editor |
| RSS feed display | RssTickerApp | Scrolling ticker only | Card layout, image display, article excerpts |
| Social feed in zones | SocialFeedWidget | Works as standalone component | Not available as zone content type in layout editor |
| Poll refresh config | Data source link modal | UI for selecting 5/10/15/30/60 min intervals | No visible "last updated" indicator; no refresh trigger from player |
| Content moderation | ReviewInboxPage exists | Review inbox page for approvals | Not connected to social feed posts; no approve/reject workflow for social content |

### Not Built (Create New)

| Feature | Recommended Approach |
|---------|---------------------|
| CountdownWidget | New widget following ClockWidget pattern; target date prop, interval timer, formatted display |
| Data source zone widget | New zone content type that references a data source ID; renders via DataTableApp or template |
| RSS card/article widget | New RssCardApp component alongside RssTickerApp in AppRenderer |
| Social feed content moderation | Add `approval_status` to social_feeds table; filter in SocialFeedRenderer query |
| Auto-pagination for data tables | Page cycling logic in DataTableApp; calculate visible rows from container height |
| Sync status overlay | Small "Updated 5m ago" badge rendered in player widget corner |

---

## User Behavior Expectations

### Data Source Widget Users

- **Primary persona**: Restaurant/retail manager who maintains a Google Sheet with menu items and prices
- **Expected flow**: Create data source > Link Google Sheet > Choose display template > Assign to screen > Data auto-updates
- **Key expectation**: Change a price in Google Sheets, see it update on screen within 5-15 minutes without any action in BizScreen
- **Frustration point**: If data doesn't update, there must be clear status indicators explaining why
- **Power user behavior**: Multiple data sources (lunch menu, dinner menu, specials) assigned to different dayparts via scheduling

### Social Feed Widget Users

- **Primary persona**: Marketing manager at restaurant, retail store, or hotel
- **Expected flow**: Connect Instagram account > Choose layout > Assign to screen zone > Posts auto-appear
- **Key expectation**: New Instagram posts appear on screens automatically; no manual curation needed
- **Frustration point**: Inappropriate customer-tagged posts appearing on lobby screen without review
- **Power user behavior**: Filtered feeds (only posts with brand hashtag), moderation queue for review before display

### Utility Widget Users

- **Primary persona**: Office manager, event coordinator
- **Expected flow**: Add clock/weather/countdown to a layout zone > Configure > Done
- **Key expectation**: Widgets are always accurate and visually clean
- **Frustration point**: Clock showing wrong timezone; countdown that shows negative time after event passes
- **Power user behavior**: Multiple clocks for different office locations in one layout; countdown that switches to "Event is Live!" message

---

## Complexity Budget

Total estimated complexity for the full milestone, based on existing infrastructure:

| Category | Table Stakes | Differentiators | Total |
|----------|-------------|-----------------|-------|
| Data Source Widgets | ~3 features (Med) | ~4 features (Med-High) | 7 features |
| Social/RSS Widgets | ~2 features (Low-Med) | ~3 features (Med) | 5 features |
| Utility Widgets | ~1 feature (Med) | ~2 features (Low-Med) | 3 features |
| **Total** | **~6 features** | **~9 features** | **15 features** |

**Key insight**: BizScreen's existing infrastructure dramatically reduces complexity. The data source service, social feed sync, weather/clock widgets, and app renderer pattern are all built. This milestone is primarily about **connecting existing services to the player rendering pipeline** and adding the countdown widget as the only wholly new component.

---

## Sources

- BizScreen codebase analysis (HIGH confidence -- direct code review)
  - `src/pages/DataSourcesPage.jsx` -- Full data source management
  - `src/services/dataSourceService.js` -- Complete CRUD + binding resolution + realtime
  - `src/services/googleSheetsService.js` -- Google Sheets integration
  - `src/components/SocialFeedWidget.jsx` -- 5-layout social widget
  - `src/components/player/SocialFeedRenderer.jsx` -- Player social renderer
  - `src/services/socialFeedSyncService.js` -- Background sync with rate limiting
  - `src/player/components/AppRenderer.jsx` -- App routing + useAppData pattern
  - `src/player/components/widgets/` -- Clock, Date, Weather, QRCode widgets
  - `src/components/scene-editor/DataBoundWizardModal.jsx` -- Data binding wizard
  - `src/components/apps/WeatherWallConfigModal.jsx` -- Weather configuration
  - `src/config/appCatalog.js` -- App catalog with categories
- Digital signage industry knowledge (MEDIUM confidence -- training data from Yodeck, ScreenCloud, OptiSigns, Rise Vision, NoviSign documentation and feature comparisons; not verified against current 2026 versions)
