# Production Stabilization Pitfalls

**Project:** BizScreen Digital Signage Platform
**Domain:** Production stabilization for existing SaaS application
**Researched:** 2026-01-22
**Confidence:** HIGH (specific to codebase analysis + verified patterns)

## Executive Summary

BizScreen faces five stabilization challenges: logging migration (197+ console.log calls), rate limiting (Supabase APIs), retry logic (offline player), component refactoring (no test coverage), and GDPR compliance (multi-tenant data). Each has domain-specific pitfalls that can cause regressions, outages, or compliance violations if not addressed carefully.

---

## 1. Logging Migration Pitfalls

**Context:** 197 console.log calls across 40 files need replacement with structured logging. BizScreen already has `loggingService.js` but it's not widely adopted.

### Critical Pitfall: Performance Degradation from Aggressive Logging

**What goes wrong:** Teams migrate all console.log calls to the new logging service, but the structured logging adds serialization overhead. In hot paths (Player.jsx, cacheService.js), this causes performance degradation.

**Why it happens:** console.log is lazy - it only serializes when DevTools is open. Structured logging serializes on every call, even when logs are filtered by level.

**Warning signs:**
- Player frame drops or stuttering after migration
- Increased memory usage in production
- Longer initial load times

**Prevention strategy:**
1. Profile before and after migration in Player.jsx (16 console.log calls)
2. Use lazy evaluation: `log.debug(() => expensiveOperation())` for complex objects
3. Skip serialization entirely for filtered log levels
4. Test with DevTools closed - console.log behaves differently when open

**Phase mapping:** Address in early stabilization phase; profile Player.jsx separately due to performance sensitivity

**Confidence:** HIGH (verified from [performance research](https://dev.to/alex_aslam/the-hidden-cost-of-consolelog-in-production-how-we-lost-40-performance-1ca3))

---

### Moderate Pitfall: Logging Sensitive Data

**What goes wrong:** During migration, developers convert `console.log('User:', user)` to `log.info('User', { user })` without sanitizing PII.

**Why it happens:** console.log statements often dump entire objects for debugging. Structured logs are indexed and searchable, making PII exposure worse.

**BizScreen-specific risk:** Multi-tenant data in objects like `tenant`, `profile`, `device` contains customer information that shouldn't be logged.

**Warning signs:**
- Log entries containing email addresses
- Tenant IDs appearing in indexed log aggregators
- Customer data in error stack traces

**Prevention strategy:**
1. Create allowlist of safe-to-log fields for common objects
2. Add lint rule: `no-restricted-syntax` for logging without sanitization
3. Audit these files first (highest PII risk):
   - `src/contexts/AuthContext.jsx` (user profiles)
   - `src/services/gdprService.js` (ironic but true)
   - `src/services/resellerService.js` (customer data)

**Phase mapping:** Include PII audit checklist in logging migration phase

**Confidence:** HIGH (verified from [structured logging best practices](https://www.dash0.com/guides/logging-best-practices))

---

### Minor Pitfall: Inconsistent Log Levels

**What goes wrong:** Different developers assign different log levels to similar events. `error` gets used for warnings, `debug` for important info.

**Why it happens:** No documented convention for what constitutes each level.

**Prevention strategy:**
1. Document level guidelines in CONTRIBUTING.md:
   - `error`: Something failed that shouldn't have
   - `warn`: Recoverable issue, may need attention
   - `info`: Significant business events (user signed up, device connected)
   - `debug`: Developer-useful context (API responses, state changes)
2. Review log levels during PR review

**Phase mapping:** Define before migration begins

**Confidence:** MEDIUM (standard practice, not BizScreen-specific)

---

## 2. Rate Limiting Pitfalls

**Context:** BizScreen uses Supabase. Rate limiting options are: Supabase Edge Functions with Upstash Redis, or PostgreSQL-level with pg_headerkit.

### Critical Pitfall: GET Requests Not Protected

**What goes wrong:** Team implements rate limiting using PostgreSQL triggers, but GET requests go to read replicas which can't write rate limit state back.

**Why it happens:** pg_headerkit approach only works for write operations. The most common attack vector (hammering SELECT queries) remains unprotected.

**BizScreen-specific risk:** Player endpoints (`get_resolved_player_content`, `player_heartbeat`) are high-frequency and could be abused.

**Warning signs:**
- Database CPU spikes on read replicas
- Slow player content loading for legitimate users
- Elevated Supabase costs from query volume

**Prevention strategy:**
1. Use Supabase Edge Functions with Upstash Redis for API-level rate limiting
2. Implement rate limits at multiple dimensions:
   - Per-device for player endpoints
   - Per-user for dashboard endpoints
   - Per-IP as fallback
3. Test with both read and write operations

**Phase mapping:** Implement in dedicated rate limiting phase after logging migration

**Confidence:** HIGH (verified from [Supabase community discussion](https://github.com/orgs/supabase/discussions/19493))

---

### Critical Pitfall: Load Balancer IP Masking

**What goes wrong:** Rate limiter tracks `request.remote_addr` but gets the load balancer's IP, not the client's. All requests look like they come from one source.

**Why it happens:** Running behind Supabase's infrastructure means client IP is in headers (`X-Forwarded-For`), not the socket.

**Warning signs:**
- All users blocked when one exceeds limits
- Legitimate users hitting rate limits unexpectedly
- Rate limit logs showing same IP for all requests

**Prevention strategy:**
1. Extract client IP from `X-Forwarded-For` header in Edge Functions
2. Trust only first IP in chain (rightmost is load balancer)
3. Fall back to authenticated user ID when IP is unreliable (NAT/proxy)

**Phase mapping:** Address during rate limiting implementation

**Confidence:** HIGH (verified from [rate limiting debugging article](https://dev.to/ackermannq/the-rate-limiting-bug-that-cost-us-14-engineering-hours-and-what-we-learned-24mj))

---

### Moderate Pitfall: Fixed Window Boundary Abuse

**What goes wrong:** Rate limiter resets at fixed intervals (e.g., every 60 seconds). Attackers send burst at second 59, then another burst at second 1 - 200 requests in 2 seconds while "respecting" 100/minute limit.

**Why it happens:** Fixed window is simplest to implement but has inherent boundary issues.

**Prevention strategy:**
1. Use sliding window or token bucket algorithm instead
2. Upstash @upstash/ratelimit package supports these out of the box
3. For critical endpoints, use token bucket with refill rate

**Phase mapping:** Consider during algorithm selection

**Confidence:** HIGH (verified from [rate limiting patterns article](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies))

---

## 3. Retry Logic Pitfalls (Offline Player)

**Context:** Player.jsx has retry logic with exponential backoff. offlineService.js handles offline detection and sync. No jitter in current implementation.

### Critical Pitfall: Thundering Herd on Recovery

**What goes wrong:** Network outage affects multiple players. When connectivity returns, all players retry at the same time intervals, overwhelming the backend.

**Why it happens:** Current `getRetryDelay()` in Player.jsx adds only 0-25% jitter, and all devices start their retry timers from the same event (network recovery).

**BizScreen-specific risk:** Hundreds of player devices in a deployment could all reconnect simultaneously.

**Current code location:** `src/Player.jsx` lines 109-118
```javascript
function getRetryDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // Add jitter (0-25% of delay)
  return delay + Math.random() * delay * 0.25;
}
```

**Warning signs:**
- Backend errors spike after network recovery
- Some players recover quickly, others timeout
- Supabase rate limits hit during recovery windows

**Prevention strategy:**
1. Increase jitter to 50-100% (AWS recommendation is "full jitter")
2. Add startup randomization: delay first retry by random 0-30 seconds
3. Implement circuit breaker: if 3 consecutive failures, wait longer before retrying
4. Use decorrelated jitter: `min(cap, random(base, previous_delay * 3))`

**Phase mapping:** Address in retry logic hardening phase

**Confidence:** HIGH (verified from [AWS builders library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/))

---

### Critical Pitfall: Retrying Non-Retryable Errors

**What goes wrong:** Player retries on 401 (unauthorized) or 404 (scene deleted) errors, wasting resources and potentially causing infinite retry loops.

**Why it happens:** Current retry logic catches all errors without checking if they're transient.

**BizScreen-specific risk:** If a scene is deleted while player is offline, player will retry forever when it comes back online.

**Current risk in:** `src/Player.jsx` `retryWithBackoff()` doesn't check error types

**Warning signs:**
- Players stuck in retry loops
- Elevated API calls to Supabase
- Console logs showing repeated identical failures

**Prevention strategy:**
1. Classify errors as retryable/non-retryable:
   - Retryable: 408, 429, 500, 502, 503, 504, network errors
   - Non-retryable: 400, 401, 403, 404, 422
2. For non-retryable, fail immediately and show appropriate UI
3. Add utility from existing `src/utils/errorMessages.js` `isRetryableError()`

**Phase mapping:** Must address before rate limiting (rate limit 429s should trigger backoff)

**Confidence:** HIGH (verified from [retry patterns article](https://jaytech.substack.com/p/retry-logic-and-exponential-backoff))

---

### Moderate Pitfall: Offline Queue Growing Unbounded

**What goes wrong:** During extended offline periods, the IndexedDB offline queue grows without limit, eventually causing storage quota errors.

**Current code:** `OFFLINE_CONFIG.MAX_QUEUE_SIZE: 100` in offlineService.js, but `queueOfflineEvent()` in cacheService.js doesn't enforce this.

**Warning signs:**
- IndexedDB quota errors in player logs
- Playback events lost during extended offline periods
- Sync taking extremely long when coming back online

**Prevention strategy:**
1. Enforce MAX_QUEUE_SIZE in queueOfflineEvent()
2. Use LRU eviction: drop oldest events when queue is full
3. Prioritize critical events: errors > playback > heartbeats
4. Add queue size monitoring to `getCacheStatus()`

**Phase mapping:** Address during offline service hardening

**Confidence:** HIGH (BizScreen-specific, verified by code review)

---

### Minor Pitfall: Cache/Server State Conflicts

**What goes wrong:** Player caches content while offline, server content changes, player syncs with stale version information causing visual glitches or missing content.

**Current mitigation:** `checkSceneNeedsUpdate()` compares content hashes, but only on explicit check.

**Prevention strategy:**
1. Always validate cache on reconnection before displaying
2. Show "updating" indicator while validating
3. Implement optimistic display with background validation
4. Handle partial cache invalidation (some media updated, not all)

**Phase mapping:** Consider in offline sync improvements

**Confidence:** MEDIUM (potential issue based on code review)

---

## 4. Refactoring Pitfalls (Large Components)

**Context:** No test files found in src/. Large components like Player.jsx (1000+ lines), ScreensPage.jsx have complex state management. No safety net for refactoring.

### Critical Pitfall: Refactoring Without Characterization Tests

**What goes wrong:** Developer refactors large component, introduces subtle behavior change, no tests catch it, bug ships to production.

**Why it happens:** "Tests slow us down" mentality, or "I'll add tests after refactoring" (never happens).

**Michael Feathers definition:** "Legacy code is code without tests."

**BizScreen-specific risk:** Player.jsx handles offline mode, caching, real-time sync, playback tracking - any regression here affects all customer screens.

**Warning signs:**
- "It worked before the refactor" bugs
- Subtle timing issues that are hard to reproduce
- Customer-reported issues with no repro steps

**Prevention strategy:**
1. Write characterization tests BEFORE refactoring:
   - Capture current behavior, not intended behavior
   - Focus on external API: props in, rendered output, callbacks called
2. Start with E2E tests for critical flows:
   - Player: loads content, handles offline, recovers on reconnect
   - Screens: list, pair, edit, delete operations
3. Use Strangler Fig pattern: wrap old component, gradually replace pieces
4. Set refactoring budget: no refactor takes more than 2 days without tests

**Phase mapping:** Must precede any refactoring work

**Confidence:** HIGH (verified from [legacy code patterns](https://understandlegacycode.com/blog/4-tips-refactor-without-tools/))

---

### Critical Pitfall: Big Bang Refactoring

**What goes wrong:** Developer attempts to refactor entire large component at once. Merge conflicts pile up. Eventually branch is abandoned or merged with bugs.

**Why it happens:** "While I'm in here, I might as well..." scope creep.

**Warning signs:**
- Refactoring PR has 500+ lines changed
- PR sits open for more than 3 days
- "I'll finish this after the holidays" comments

**Prevention strategy:**
1. Strangler Fig pattern: extract one responsibility at a time
2. Use feature flags to deploy partial refactors safely
3. Maximum PR size: 200 lines for refactoring changes
4. Parallel implementations: new code alongside old, gradually shift traffic

**Example approach for Player.jsx:**
1. Extract usePlayerContent hook (content loading logic)
2. Extract useOfflineSync hook (offline/online handling)
3. Extract usePlaybackTracking hook (analytics)
4. Each extraction is separate PR with tests

**Phase mapping:** Define extraction order before starting

**Confidence:** HIGH (verified from [Shopify strangler pattern article](https://shopify.engineering/refactoring-legacy-code-strangler-fig-pattern))

---

### Moderate Pitfall: Hooks Migration Gotchas

**What goes wrong:** Extracting state to custom hooks changes component lifecycle timing, causing subtle bugs.

**React team advice:** "Don't go refactor all your components to hooks" all at once.

**BizScreen-specific risk:** Player.jsx uses many useEffect hooks with complex dependencies. Extracting to custom hooks can change when effects run.

**Warning signs:**
- "Effect runs twice" bugs after extraction
- Stale closure issues (old values captured in callbacks)
- Cleanup functions not running at expected times

**Prevention strategy:**
1. Keep useEffect dependencies explicit, not spread from hooks
2. Test with React.StrictMode (catches double-render issues)
3. Use useRef for values that shouldn't trigger re-renders
4. Extract one hook at a time, verify behavior before continuing

**Phase mapping:** Document known useEffect quirks before refactoring

**Confidence:** HIGH (verified from [hooks migration article](https://medium.com/@MilkMan/read-this-before-refactoring-your-big-react-class-components-to-hooks-515437e9d96f))

---

## 5. GDPR Pitfalls (Existing System)

**Context:** BizScreen has existing gdprService.js with data export and account deletion. Multi-tenant with existing user data. No indication of backup replay consideration.

### Critical Pitfall: Backups Restoring Deleted Data

**What goes wrong:** User requests data deletion. Data is deleted from production. Backup restore (disaster recovery test or actual incident) brings deleted data back.

**Why it happens:** Deletion removes from production, but backups are immutable snapshots.

**BizScreen-specific risk:** Multi-tenant means one user's erasure request shouldn't affect other tenants' backups, complicating selective restore.

**Warning signs:**
- Deleted users reappearing after backup restore
- Compliance audit finds "deleted" data in backup logs
- Data subject access request returns "deleted" records

**Prevention strategy:**
1. Maintain separate table of deleted user IDs with timestamps
2. After any backup restore, replay deletions from this table
3. Document backup retention policy (e.g., 30 days)
4. Communicate to users: "Erasure fully effective in 30 days"
5. For immediate compliance, use cryptographic erasure: delete encryption key

**Phase mapping:** Must implement before advertising GDPR compliance

**Confidence:** HIGH (verified from [GDPR for SaaS guide](https://gdpr4saas.eu/deleting-personal-data))

---

### Critical Pitfall: Soft Delete Doesn't Satisfy GDPR

**What goes wrong:** Team implements "deletion" as `is_deleted = true` flag. Regulator or audit finds data still accessible in database.

**Why it happens:** Soft delete is easier for referential integrity and "undo" functionality.

**Current risk:** Review current deletion implementation in Supabase to verify actual deletion vs. soft delete.

**Warning signs:**
- "Deleted" user data still appears in admin queries
- Foreign key constraints block actual deletion
- Export functions return "deleted" records

**Prevention strategy:**
1. Audit current deletion: is it hard delete or soft delete?
2. If soft delete is needed for business reasons:
   - Anonymize PII fields (replace with hash or random data)
   - Clear identifiable foreign key references
   - Document as "anonymization" not "deletion"
3. For true deletion:
   - Use CASCADE DELETE carefully (test impact)
   - Handle foreign keys with SET NULL where appropriate
   - Implement deletion order: dependents first, then primary

**Phase mapping:** Audit before any GDPR feature work

**Confidence:** HIGH (verified from [GDPR erasure requirements](https://gdpr-info.eu/art-17-gdpr/))

---

### Moderate Pitfall: Incomplete Data Discovery

**What goes wrong:** Deletion removes user from `profiles` table but misses data in `activity_log`, `consent_records`, `device_screenshots`, etc.

**Why it happens:** Data spreads across tables over time. No single source of truth for "all user data."

**BizScreen tables likely containing user data:**
- profiles
- user_settings
- activity_log
- consent_records
- audit_log
- data_export_requests
- account_deletion_requests
- (potentially) screenshots, analytics, device assignments

**Warning signs:**
- Data subject access request misses some data
- "Deleted" user's email appears in logs
- Analytics still reference deleted user ID

**Prevention strategy:**
1. Create data map: document every table with user_id foreign key
2. Implement cascading deletion via database function
3. Test deletion with data subject access request: verify nothing returns
4. Consider anonymization for analytics (keep data, remove identity)

**Phase mapping:** Data mapping must precede deletion implementation

**Confidence:** HIGH (BizScreen-specific, verified by GDPR requirements)

---

### Moderate Pitfall: Third-Party Data Not Deleted

**What goes wrong:** User data is deleted from BizScreen database, but copies exist in:
- Cloudinary (media uploads)
- S3 (if used for storage)
- Email service (SendGrid, etc.)
- Analytics (if external service)

**GDPR requirement:** Controller must notify processors about erasure requests.

**BizScreen-specific risk:** `useCloudinaryUpload.js` and `useS3Upload.jsx` suggest external storage that needs erasure.

**Warning signs:**
- Media URLs still work after user deletion
- User receives emails after account deletion
- Analytics dashboards still show deleted user data

**Prevention strategy:**
1. Inventory all third-party processors
2. Implement deletion API calls for each:
   - Cloudinary: Delete by public_id
   - S3: Delete by object key
   - Email service: Unsubscribe/delete profile
3. Log third-party deletion status in audit trail
4. Verify with test deletion before production

**Phase mapping:** Include in GDPR phase, not afterthought

**Confidence:** HIGH (verified from [GDPR third-party obligations](https://jetico.com/blog/how-right-erasure-applied-under-gdpr-complete-guide-organizational-compliance/))

---

## Critical Warnings Summary

These must-avoid mistakes have the highest impact:

| Pitfall | Impact | Detection Difficulty | Fix Cost |
|---------|--------|---------------------|----------|
| Backups restoring deleted data | GDPR violation, fines | Hard (discovered in audit) | High |
| Thundering herd on recovery | Production outage | Medium (monitoring) | Low |
| Refactoring without tests | Silent regressions | Hard (customer reports) | High |
| Logging sensitive data | Privacy breach | Medium (log review) | Medium |
| Soft delete not satisfying GDPR | Compliance failure | Medium (audit) | High |

## Phase Recommendations

Based on pitfall analysis, recommended phase order:

1. **Logging Migration** (prerequisites: log level conventions, PII audit)
2. **Characterization Tests** (must precede any refactoring)
3. **Rate Limiting** (after logging, so issues are visible)
4. **Retry Logic Hardening** (after rate limiting, to handle 429s properly)
5. **Component Refactoring** (only after tests exist)
6. **GDPR Compliance** (requires data mapping first)

## Sources

### Logging
- [The Hidden Cost of console.log in Production](https://dev.to/alex_aslam/the-hidden-cost-of-consolelog-in-production-how-we-lost-40-performance-1ca3)
- [9 Logging Best Practices](https://www.dash0.com/guides/logging-best-practices)
- [Why Structured Logging is Fundamental](https://betterstack.com/community/guides/logging/structured-logging/)

### Rate Limiting
- [Rate Limiting Bug That Cost 14 Engineering Hours](https://dev.to/ackermannq/the-rate-limiting-bug-that-cost-us-14-engineering-hours-and-what-we-learned-24mj)
- [API Rate Limiting at Scale](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [Supabase Rate Limiting Docs](https://supabase.com/docs/guides/functions/examples/rate-limiting)
- [Supabase Rate Limiting Discussion](https://github.com/orgs/supabase/discussions/19493)

### Retry Logic
- [AWS Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Retry Logic & Exponential Backoff Guide](https://jaytech.substack.com/p/retry-logic-and-exponential-backoff)
- [Mastering Exponential Backoff](https://betterstack.com/community/guides/monitoring/exponential-backoff/)

### Refactoring
- [Refactoring Legacy Code with Strangler Fig Pattern - Shopify](https://shopify.engineering/refactoring-legacy-code-strangler-fig-pattern)
- [4 Tips to Refactor Without Tools](https://understandlegacycode.com/blog/4-tips-refactor-without-tools/)
- [Read This Before Refactoring to Hooks](https://medium.com/@MilkMan/read-this-before-refactoring-your-big-react-class-components-to-hooks-515437e9d96f)

### GDPR
- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR for SaaS - Deleting Personal Data](https://gdpr4saas.eu/deleting-personal-data)
- [How Right to Erasure is Applied](https://jetico.com/blog/how-right-erasure-applied-under-gdpr-complete-guide-organizational-compliance/)
- [5 GDPR Mistakes US Companies Make](https://edpo.com/4-of-the-most-common-gdpr-mistakes-made-by-us-companies/)
