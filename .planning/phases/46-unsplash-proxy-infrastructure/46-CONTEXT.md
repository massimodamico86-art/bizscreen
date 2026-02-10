# Phase 46: Unsplash Proxy Infrastructure - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side proxy that handles Unsplash API search requests, caches results, enforces per-tenant rate limits, and returns TOS-compliant photo data — keeping the API key server-side. The proxy serves Phase 49 (Stock Assets in Editor) but does not include any UI panels or editor integration.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions delegated to Claude — this is a pure infrastructure phase with technical choices:

- **API response shape** — What fields to return (thumbnails, attribution, pagination), response format, error envelope
- **Caching behavior** — Cache layer choice, TTL duration, cache key strategy, stale-while-revalidate vs hard expiry
- **Rate limiting design** — Per-tenant limits, burst allowance, error responses, backoff signals
- **Offline/player conflict** — How to reconcile Unsplash hotlink-only TOS with offline player requirements (may need to accept limitation or proxy-serve cached images)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 46-unsplash-proxy-infrastructure*
*Context gathered: 2026-02-10*
