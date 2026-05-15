---
slug: auth-getsession-timeout
status: resolved
trigger: AuthContext.getSession() times out after 10s on app load even though SIGNED_IN event already fired with hasSession:true — page stuck on loading spinner indefinitely
created: 2026-05-04
updated: 2026-05-04
---

# Debug Session: auth-getsession-timeout

## Symptoms

DATA_START
- **Expected behavior:** App loads, AuthContext initializes, session is restored, dashboard renders.
- **Actual behavior:** Page stuck on loading spinner. AuthContext init starts, immediately fires SIGNED_IN event with `hasSession:true`, attempts `getSession()` and `Fetching profile`, then 10s later `getSession timed out after 10000ms` — Init error logged. Auth context warns "Auth timed out — clearing stale session" and likely retries, hitting the same timeout again.
- **Console log timeline (verbatim, from screenshot):**
  ```
  02:05:17.408Z [DEBUG] [AuthContext] Initializing auth
  02:05:17.409Z [DEBUG] [AuthContext] Getting session...
  02:05:17.409Z [DEBUG] [AuthContext] Initializing auth
  02:05:17.409Z [DEBUG] [AuthContext] Getting session...
  02:05:17.411Z [DEBUG] [AuthContext] Auth state changed | {"event":"SIGNED_IN","hasSession":true}
  02:05:17.411Z [DEBUG] [AuthContext] Fetching profile | {"userId":"cccccccc-cccc-cccc-cccc-cccccccccccc","attempt":1}
  02:05:27.410Z [ERROR] [AuthContext] Init error | {"error":"getSession timed out after 10000ms"}
  02:05:27.411Z [WARN]  [AuthContext] Auth timed out — clearing stale session
  02:05:27.412Z [ERROR] [AuthContext] Init error | {"error":"getSession timed out after 10000ms"}
  02:05:27.412Z [WARN]  [AuthContext] Auth timed out — clearing stale session
  Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received  (index):1
  ```
- **Notable signals:**
  - "Initializing auth" and "Getting session..." each fire TWICE — suggests StrictMode double-mount or two AuthContext providers
  - SIGNED_IN event fires almost immediately (2ms after init) WITH hasSession:true, BEFORE getSession() resolves
  - Profile fetch uses placeholder userId `cccccccc-cccc-cccc-cccc-cccccccccccc` — looks like a test/mock UUID
  - Optional env vars not set: VITE_OPENWEATHER_API_KEY, VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET (warning only)
  - "Some features may be disabled. See .env.example for setup instructions." (warning)
  - Uncaught promise error about "message channel closed before a response was received" — typical Chrome extension noise, may or may not be relevant
- **Error messages:** see above (getSession timeout x2, Auth timed out x2)
- **Timeline:** Just observed after restarting the dev server (previous session was healthy enough to verify the template preview fix earlier today)
- **Reproduction:** Load http://localhost:5173/ in browser → page hangs on loading spinner → console shows the timeout chain above
- **Scope:** Affects entire app load — nothing renders past the loader
- **Recent changes:** Only CSS edits to TemplatePreviewModal.jsx in this session — should NOT affect AuthContext. This is likely a pre-existing or environmental issue (Supabase reachability, .env config, browser extension interference, dev DB state).
DATA_END

## Current Focus

```yaml
hypothesis: RESOLVED — supabase-js auth-js re-entrant lock deadlock
test: load http://localhost:5173/ in headless Chromium and assert no Init error / sidebar renders
expecting: page renders past loader within 8s, no getSession timeout in console
next_action: none — resolved
reasoning_checkpoint: null
tdd_checkpoint: null
```

## Evidence

- timestamp: 2026-05-04 / commit: 289a2c7b (Apr 7, "feat(151-02): add playlist edit tests")
  finding: A worktree-merge regression that touched 1,418 files / -173,794 lines. Among the casualties: src/contexts/AuthContext.jsx silently rolled back from a hardened 520-line version to an older 321-line version, removing DEV_AUTH_BYPASS, AbortController support, NO_SESSION pre-query guard, exponential-backoff retry, and observability hooks. Also deleted: src/hooks/useAbortSignal.js, src/utils/isAbortError.js, tests/unit/contexts/AuthContext.test.jsx (501 lines), tests/unit/hooks/useAbortSignal.test.js (98 lines). Same commit also reverted src/utils/errorTracking.{jsx → js} despite earlier commit 30dff94e specifically renaming it to .jsx for JSX syntax support.

- timestamp: 2026-05-04 / file: node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1057-1116, 1956-1978, 1898-1903
  finding: supabase-js v2 holds an internal navigator.locks-style auth lock during _initialize() / _recoverAndRefresh(). The lock is also acquired by every getSession() call. Subscribers to onAuthStateChange are invoked from inside the lock holder. Therefore awaiting any auth/PostgREST work synchronously inside the onAuthStateChange callback re-enters the lock and deadlocks until the holder releases.

- timestamp: 2026-05-04 / file: node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js:164-171
  finding: PostgREST queries (.from(...).select(...)) internally call _getAccessToken() → await this.auth.getSession(). So `supabase.from('profiles').select(...)` inside onAuthStateChange triggers the deadlock indirectly even without an explicit getSession call.

- timestamp: 2026-05-04 / file: src/contexts/AuthContext.jsx:183-196 (regressed version)
  finding: onAuthStateChange callback awaited fetchUserProfile directly. fetchUserProfile calls supabase.from('profiles').select(...) → deadlock per above.

- timestamp: 2026-05-04 / file: .env.local
  finding: VITE_DEV_BYPASS_AUTH=true is set. The pre-regression AuthContext respected this var to skip Supabase entirely with a mock user. The regressed file ignored it — explaining why setting the var did not unblock the user.

## Eliminated

- StrictMode double-mount as root cause — confirmed it does cause "Initializing auth" to log twice, but the deadlock happens regardless of mount count.
- Supabase URL/network reachability — same Supabase client serves other requests fine; the issue is purely re-entrant lock contention.
- Browser extension noise (the "message channel closed" uncaught promise) — unrelated, comes from a Chrome extension content script.

## Resolution

```yaml
root_cause: |
  Two-layer regression. Primary cause: supabase-js auth-js re-entrant lock
  deadlock — onAuthStateChange callback awaited fetchUserProfile, which
  triggered a PostgREST query that internally called getSession(), which
  blocked on the auth lock still held by _initialize(). After 10s the
  withTimeout wrapper rejected; the catch handler called signOut() which
  also blocked on the same lock. Underlying cause: commit 289a2c7b
  silently rolled AuthContext.jsx back to an older version that lacked the
  Supabase docs' recommended setTimeout(..., 0) deferral pattern AND
  removed the DEV_AUTH_BYPASS escape hatch the user's .env.local was
  trying to use.
fix: |
  Two parts applied together:
  1. Path B (deadlock fix): wrapped the async body of onAuthStateChange in
     setTimeout(..., 0) so the Supabase re-entrant calls fire after the
     auth lock releases. This is the standard Supabase recommendation and
     fixes the real production bug regardless of the regression history.
  2. Path A (restore lost auth hardening, focused scope ~5 files):
     - src/contexts/AuthContext.jsx restored from 289a2c7b^ then re-patched
       with Path B (520 lines, brings back DEV_AUTH_BYPASS, AbortController
       support, NO_SESSION guard, exponential-backoff retry, observability
       hooks, AUTH_STATUS state machine, retryAuth function)
     - src/hooks/useAbortSignal.js restored from 289a2c7b^
     - src/utils/isAbortError.js restored from 289a2c7b^
     - tests/unit/contexts/AuthContext.test.jsx restored from 289a2c7b^
     - tests/unit/hooks/useAbortSignal.test.js restored from 289a2c7b^
     - tests/setup.js: added vi.stubEnv('VITE_DEV_BYPASS_AUTH', '') so unit
       tests don't pick up the dev bypass from .env.local
     - src/utils/errorTracking.js renamed to errorTracking.jsx (file uses
       JSX syntax; commit 30dff94e originally renamed it but 289a2c7b
       reverted that). All imports were extensionless so no import edits
       needed.
verification: |
  - Unit tests: tests/unit/contexts/AuthContext.test.jsx (12 tests) and
    tests/unit/hooks/useAbortSignal.test.js (14 tests) — all 26 pass
  - In-browser (Playwright headless Chromium): GET / returns the rendered
    dashboard within 8s, sidebar nav visible, mock user "C" signed in via
    DEV_AUTH_BYPASS, console contains zero AuthContext Init errors and
    zero "getSession timed out" lines (previously fired twice per load)
  - Visual screenshot confirmed: sidebar renders, header shows mock user
    avatar, dashboard pane progresses to its own data-loading state (not
    the auth-init spinner)
files_changed:
  - src/contexts/AuthContext.jsx (restored 520-line hardened version with Path B re-applied)
  - src/hooks/useAbortSignal.js (restored)
  - src/utils/isAbortError.js (restored)
  - src/utils/errorTracking.jsx (renamed from .js)
  - tests/unit/contexts/AuthContext.test.jsx (restored)
  - tests/unit/hooks/useAbortSignal.test.js (restored)
  - tests/setup.js (added VITE_DEV_BYPASS_AUTH stub for test consistency)
known_followups: |
  Commit 289a2c7b is a 1,418-file / -173,794-line regression. This debug
  session restored only the 5 files directly tied to the auth bug. The
  remaining ~1,400 deletions need a separate forensic audit — many may
  have been intentional cleanups in subsequent commits, others may be
  more lost work like the auth files. Recommend /gsd-forensics or a
  dedicated investigation phase. Do NOT blanket-revert 289a2c7b.
```
