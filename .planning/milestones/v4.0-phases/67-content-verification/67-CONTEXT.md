# Phase 67: Content Verification - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Player reports a content version identifier to the server on every heartbeat, server detects when a player's reported content version differs from the currently published version, player auto-retries content sync on mismatch signal, and verification never interrupts active playback. Depends on Phase 64 (heartbeat carries content version) and Phase 66 (recovery path for verification failures).

</domain>

<decisions>
## Implementation Decisions

### Mismatch indicators
- Verification status shown in the **screen detail drawer only** — not on screen list cards
- Mismatch displayed as an **inline warning** (yellow/orange) within the diagnostics section — not a banner-style alert
- No indication needed when content is verified and current — only surface problems

### Content refresh timing
- On mismatch detection, player waits for the **current playlist item to finish** before swapping to new content — never interrupts mid-playback
- Swap happens at the natural transition point between items

### Version scope
- Content version represents the **active playlist assignment** to the screen
- Verification checks that the player is running the correct playlist/layout that's currently assigned

### Claude's Discretion
- **Indicator design**: Whether to add a status row in existing diagnostics or a small dedicated section — fit it to the existing drawer layout
- **Viewer-facing refresh**: Whether there's any visible indication on the physical screen during content refresh — optimize for seamless viewer experience
- **Heartbeat states**: Whether to report two states (Verified/Mismatched) or three (Verified/Mismatched/Syncing) — pick what's useful without over-complicating
- **Big change behavior**: Whether a completely different playlist assignment should swap sooner than a minor update — Claude determines based on change magnitude
- **Retry count and backoff**: Claude picks a reasonable retry count with appropriate backoff strategy
- **Failure degradation**: What happens when retries exhaust — keep playing stale content, fall back to cached content, or another strategy based on Phase 66's capabilities
- **Alert event emission**: Whether to emit a `content_mismatch_persistent` event for Phase 68 or just update status — design the right integration point
- **Reset behavior**: How verification state resets on publish and whether manual reset is needed — design around the publish flow
- **Media item changes**: Whether updates to media within a playlist (reorder, add/remove) trigger verification beyond the playlist assignment itself — base on how content publishing currently works
- **Schedule verification**: Whether time-based schedule content factors into verification or stays separate
- **Multi-zone granularity**: Whether multi-zone layouts verify as one unit or per-zone — determine right granularity for layout verification
- **Manual sync button**: Whether to include a "Force Sync" button in the drawer on mismatch — decide based on what makes sense with the retry mechanism

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The operator's primary concern is trusting that screens show the right content, with verification running unobtrusively in the background.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 67-content-verification*
*Context gathered: 2026-02-20*
