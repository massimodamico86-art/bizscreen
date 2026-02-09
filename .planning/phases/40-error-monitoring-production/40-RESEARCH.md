# Phase 40: Error Monitoring Production - Research

**Researched:** 2026-02-09
**Domain:** Sentry alerting, source map uploads, and production error notification
**Confidence:** HIGH

## Summary

Phase 40 builds on the Sentry SDK wiring completed in Phase 39 to deliver two production-critical capabilities: (1) alerting when critical errors occur (MON-04) and (2) readable stack traces via source map uploads (MON-05). The project deploys to Vercel via GitHub Actions, uses Vite as the build tool, and already has `@sentry/react@10.36.0` fully wired with error capture, user context, route-aware tracing, and Supabase instrumentation.

The source map work requires adding `@sentry/vite-plugin` to the Vite build pipeline to upload source maps to Sentry during each build. The current `vite.config.js` does NOT generate source maps (`build.sourcemap` is not set), so this must be added as `"hidden"` (generates .map files but does not reference them in the bundle, preventing public exposure). The Vite plugin auto-injects a release identifier into the SDK, which means the existing `release: import.meta.env.VITE_APP_VERSION || '1.0.0'` in `Sentry.init()` must be removed to avoid a release mismatch that would break source map association.

The alerting work is entirely Sentry dashboard configuration -- no code changes needed. Sentry provides two alert types: issue alerts (per-event triggers) and metric alerts (aggregate threshold triggers). For "critical error threshold triggers email/Slack notification within 5 minutes" (success criterion #1), the right approach is: (a) an issue alert for first-seen critical errors with immediate Slack notification, and (b) a metric alert for error volume spikes with Critical/Warning thresholds. The project already has Slack webhook integration in the deploy pipeline (`SLACK_WEBHOOK_URL` secret), and Sentry has a native Slack integration that should be connected at the organization level.

**Primary recommendation:** Install `@sentry/vite-plugin`, configure `build.sourcemap: "hidden"` with `filesToDeleteAfterUpload`, remove the hardcoded `release` from `Sentry.init()`, add `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` to Vercel environment, and configure Sentry alert rules via the dashboard.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sentry/react | 10.36.0 (installed) | Error capture SDK | Already wired in Phase 39 |
| @sentry/vite-plugin | ^4.9.0 (NEW) | Source map upload + release management | Official Sentry plugin for Vite; handles Debug ID injection, upload, and cleanup |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sentry Slack Integration | N/A (dashboard) | Alert routing to Slack channels | Configure in Sentry org settings |
| Sentry Vercel Integration | N/A (dashboard) | Auto-set SENTRY_AUTH_TOKEN + deploy tracking | Configure in Vercel integrations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sentry/vite-plugin | sentry-cli manual upload | CLI is lower-level, requires more scripting; plugin integrates directly into Vite build |
| @sentry/vite-plugin | Sentry Vercel Integration (auto) | Vercel integration is designed for Next.js; for plain Vite SPA, the bundler plugin is the documented approach |
| Sentry Slack alerts | Custom webhook alerts | Sentry native Slack integration provides threading, status charts, and investigation links; custom webhooks lose all of this |

**Installation:**
```bash
npm install @sentry/vite-plugin --save-dev
```

## Architecture Patterns

### Pattern 1: Source Map Upload via Vite Plugin
**What:** Add `sentryVitePlugin` to `vite.config.js` to automatically upload source maps during production builds
**When to use:** Every production build (not in dev/watch mode -- the plugin automatically skips)
**Critical detail:** The plugin auto-injects a release identifier into the SDK bundle. You must either REMOVE the `release` property from `Sentry.init()` or set it to match `release.name` in the plugin config exactly. A mismatch means Sentry cannot associate uploaded source maps with incoming error events.

**Example:**
```javascript
// Source: https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: "hidden", // Generate .map files but don't reference them in bundles
    // ... existing terser and rollupOptions config ...
  },
  plugins: [
    react(),
    // ... other existing plugins ...
    // IMPORTANT: Sentry plugin MUST be LAST
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
});
```

### Pattern 2: Release Property Alignment
**What:** Remove hardcoded `release` from `Sentry.init()` so the Vite plugin auto-injects it
**When to use:** When using `@sentry/vite-plugin` for source map uploads
**Why critical:** The Vite plugin injects `release` into the SDK at build time. If `Sentry.init()` also sets `release`, they must match exactly or source maps won't resolve.

**Current code (errorTracking.jsx line 74):**
```javascript
release: import.meta.env.VITE_APP_VERSION || '1.0.0',
```

**Fix:** Remove this line entirely. The Vite plugin will inject the release automatically.

### Pattern 3: Sentry Alert Configuration (Dashboard-Only)
**What:** Configure issue alerts and metric alerts in the Sentry dashboard
**When to use:** After SDK is deployed and errors are flowing

**Issue Alert -- "New Critical Error":**
- When: A new issue is created
- If: Issue priority is critical or high
- Then: Send Slack notification to #alerts channel
- Frequency: Once per issue (first occurrence only)

**Metric Alert -- "Error Spike":**
- Metric: Number of Errors (count())
- Time window: 5 minutes
- Warning threshold: >10 errors in 5 min
- Critical threshold: >50 errors in 5 min
- Action: Send Slack notification + email

### Pattern 4: Fingerprinting for Alert Fatigue Prevention
**What:** Configure fingerprint rules to group related errors, preventing duplicate alerts
**When to use:** When similar errors create separate issues that trigger separate alerts
**Where:** Sentry Dashboard > Project Settings > Issue Grouping > Fingerprint Rules

**Example rules:**
```
# Group all Supabase connection errors together
error.type:SupabaseApiError error.value:"*connection*" -> supabase-connection-error

# Group by HTTP status for API errors
tags.httpStatus:5* -> server-error-{{ tags.httpStatus }}
```

### Anti-Patterns to Avoid
- **Alerting on ALL errors without filtering:** Leads to immediate alert fatigue. Only alert on new/critical issues.
- **Setting release in both SDK and Vite plugin:** Causes source map resolution failure if values diverge.
- **Generating public source maps:** Using `sourcemap: true` instead of `"hidden"` exposes your source code. Always use `"hidden"`.
- **Forgetting `filesToDeleteAfterUpload`:** Source map files left in the build output could be deployed to production and served publicly.
- **Not placing Sentry plugin last:** The plugin needs all other transforms to complete first. It must be the last plugin in the array.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Source map upload | Custom sentry-cli script in CI | @sentry/vite-plugin | Plugin handles Debug ID injection, release creation, artifact upload, and cleanup in one step |
| Alert notifications | Custom Slack webhook from beforeSend | Sentry native Slack integration | Native integration provides threading, status charts, deduplication, and rate limiting |
| Error deduplication | Custom fingerprinting in beforeSend | Sentry fingerprint rules (dashboard) | Dashboard rules are editable without deploys; SDK-level fingerprinting is harder to iterate on |
| Release tracking | Manual git tag mapping | Vite plugin auto-release + Vercel deploy integration | Plugin auto-generates release from git SHA; Vercel integration notifies Sentry of deploys |

**Key insight:** Phase 40 is primarily a configuration phase, not a code-heavy phase. The heavy lifting (SDK wiring, error capture, user context) was done in Phase 39. This phase adds the Vite plugin, adjusts one line in `Sentry.init()`, and does the rest via Sentry/Vercel dashboard configuration.

## Common Pitfalls

### Pitfall 1: Release Mismatch Between SDK and Vite Plugin
**What goes wrong:** Source maps are uploaded under one release name, but errors are tagged with a different release. Stack traces show minified code.
**Why it happens:** `Sentry.init()` has `release: import.meta.env.VITE_APP_VERSION || '1.0.0'` while the Vite plugin generates a different release name (typically git SHA based).
**How to avoid:** Remove the `release` property from `Sentry.init()`. Let the Vite plugin auto-inject it.
**Warning signs:** Stack traces in Sentry show minified function names and line numbers that don't correspond to source code.

### Pitfall 2: Source Maps Deployed Publicly
**What goes wrong:** `.map` files are served from the production CDN, exposing source code.
**Why it happens:** Using `sourcemap: true` (which adds `//# sourceMappingURL` comments) or forgetting `filesToDeleteAfterUpload`.
**How to avoid:** Use `sourcemap: "hidden"` and set `filesToDeleteAfterUpload: ["./dist/**/*.map"]`.
**Warning signs:** Opening browser DevTools on production shows original source in Sources tab.

### Pitfall 3: Auth Token Missing in CI/CD
**What goes wrong:** Build succeeds but source maps are not uploaded. No error is thrown by default.
**Why it happens:** `SENTRY_AUTH_TOKEN` not set in Vercel environment variables or GitHub Actions secrets.
**How to avoid:** Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in Vercel project settings (or use Sentry's Vercel integration to auto-configure).
**Warning signs:** Build logs show no Sentry upload messages; stack traces remain minified.

### Pitfall 4: Alert Fatigue from Over-Broad Rules
**What goes wrong:** Team receives hundreds of alerts per day; everyone starts ignoring them.
**Why it happens:** Alert rules trigger on every error event instead of first occurrence or high-frequency spikes.
**How to avoid:** Use issue alerts with "A new issue is created" trigger (fires once per unique error). Use metric alerts with reasonable thresholds (not 1 error). Set action intervals (5-minute minimum between notifications for the same issue).
**Warning signs:** Slack channel has >20 alerts per day; team members mute the channel.

### Pitfall 5: Source Maps Not Uploaded Before Errors Occur
**What goes wrong:** First errors after deployment show minified stack traces.
**Why it happens:** The Vite plugin uploads during build, but if the build artifact is deployed before upload completes, or if upload fails silently, there's a gap.
**How to avoid:** The Vite plugin runs during `vite build`, which happens before deployment in the GitHub Actions workflow. The plugin blocks the build until upload completes.
**Warning signs:** Very first errors after deploy show minified traces, but later errors show resolved traces.

### Pitfall 6: Sentry Plugin Placement in Vite Config
**What goes wrong:** Source maps don't include all transformations; some files missing.
**Why it happens:** Plugin runs before other transforms complete.
**How to avoid:** Place `sentryVitePlugin()` as the LAST plugin in the `plugins` array.
**Warning signs:** Some source files resolve correctly while others don't.

## Code Examples

### Vite Config with Sentry Plugin (Complete)
```javascript
// Source: https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    // ... existing apiRoutesPlugin() ...
    visualizer({ /* existing config */ }),
    // MUST be last plugin
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
  build: {
    sourcemap: "hidden",
    // ... existing minify, terserOptions, chunkSizeWarningLimit, rollupOptions ...
  },
});
```

### Sentry.init() with Release Removed
```javascript
// Source: existing errorTracking.jsx, modified per
// https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/
Sentry.init({
  dsn,
  environment: config().env || 'development',
  // REMOVED: release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  // The @sentry/vite-plugin auto-injects the release at build time.
  // Setting it here would cause a mismatch and break source map resolution.

  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  // ... rest of existing config unchanged ...
});
```

### Environment Variables Needed
```bash
# In Vercel project settings (or .env.sentry-build-plugin for local testing)
SENTRY_AUTH_TOKEN=sntrys_eyJ...   # Auth token with Project:Read&Write, Release:Admin
SENTRY_ORG=your-org-slug          # Sentry organization slug
SENTRY_PROJECT=your-project-slug  # Sentry project slug

# Already configured (from Phase 39):
VITE_SENTRY_DSN=https://...@....ingest.sentry.io/...
VITE_ERROR_TRACKING_PROVIDER=sentry
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual sentry-cli upload in CI script | @sentry/vite-plugin with Debug IDs | Sentry SDK v7.47+ / bundler plugins v2+ | Auto Debug ID injection eliminates release matching issues |
| Release-based source map association | Debug ID-based association | Sentry SDK v7.47+ | More reliable; works even without explicit release |
| `sourcemap: true` with deletion post-build | `sourcemap: "hidden"` | Always available in Vite | "hidden" never adds sourceMappingURL comments, safer by default |
| Custom alert webhook integration | Native Sentry Slack integration | Available for years | Threading, charts, deduplication built-in |

**Deprecated/outdated:**
- `vite-plugin-sentry` (third-party): Use official `@sentry/vite-plugin` instead
- Manual `sentry-cli releases files upload-sourcemaps`: Replaced by bundler plugins with Debug ID
- Setting `release` in both SDK and plugin: Let the plugin auto-inject to avoid mismatches

## Open Questions

1. **Sentry Organization and Project Slugs**
   - What we know: The Sentry DSN is configured and errors flow to Sentry
   - What's unclear: The exact org slug and project slug needed for the Vite plugin config
   - Recommendation: Check Sentry dashboard > Settings > General for org slug; Settings > Projects for project slug. These can also be extracted from the DSN URL pattern.

2. **Sentry Auth Token Generation**
   - What we know: Need an auth token with "Project: Read & Write" and "Release: Admin" scopes
   - What's unclear: Whether the Sentry-Vercel integration is already installed (would auto-configure SENTRY_AUTH_TOKEN in Vercel)
   - Recommendation: Check Vercel project settings for existing SENTRY_* env vars. If not present, install the Sentry Vercel integration or manually create an org auth token.

3. **Slack Channel for Alerts**
   - What we know: The deploy pipeline already uses `SLACK_WEBHOOK_URL` for deployment notifications. Sentry has a native Slack integration.
   - What's unclear: Whether the Sentry Slack integration is already connected to the workspace; which Slack channel should receive error alerts.
   - Recommendation: Use `#alerts` or `#errors` channel. Connect Sentry's native Slack integration (separate from the webhook URL used in deploy.yml).

4. **Alert Thresholds**
   - What we know: The app is expected to have low error volume (sampleRate: 1.0 was chosen for this reason in Phase 39)
   - What's unclear: What constitutes a "critical" error spike for this application
   - Recommendation: Start conservative: Warning at >5 errors in 5 min, Critical at >20 errors in 5 min. Adjust after observing baseline.

## Sources

### Primary (HIGH confidence)
- [Sentry Vite Source Maps Official Docs](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/) - Plugin installation, config, and `filesToDeleteAfterUpload`
- [Sentry Issue Alert Configuration](https://docs.sentry.io/product/alerts/create-alerts/issue-alert-config/) - When/If/Then alert conditions, frequency, action types
- [Sentry Metric Alert Configuration](https://docs.sentry.io/product/alerts/create-alerts/metric-alert-config/) - Critical/Warning thresholds, time windows, notification actions
- [Sentry Alert Types](https://docs.sentry.io/product/alerts/alert-types/) - Issue alerts vs metric alerts
- [Sentry Slack Integration](https://docs.sentry.io/organization/integrations/notification-incidents/slack/) - Workspace connection, channel routing, threading
- [Sentry Vercel Integration](https://docs.sentry.io/organization/integrations/deployment/vercel/) - Auto env vars, deploy tracking
- [Sentry Fingerprint Rules](https://docs.sentry.io/product/data-management-settings/event-grouping/fingerprint-rules/) - Syntax, matchers, variables
- [Sentry Source Map Troubleshooting](https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/) - Debug ID, release matching, checklist

### Secondary (MEDIUM confidence)
- [Sentry Alerts Best Practices](https://docs.sentry.io/product/new-monitors-and-alerts/alerts/best-practices/) - Alert fatigue prevention, ownership routing
- [Sentry SDK-Level Fingerprinting](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/) - beforeSend fingerprint arrays

### Project-Specific (HIGH confidence - verified from codebase)
- `vite.config.js` - No sourcemap setting currently; terser minification; manual chunks
- `src/utils/errorTracking.jsx` line 74 - `release: import.meta.env.VITE_APP_VERSION || '1.0.0'` must be removed
- `.github/workflows/deploy.yml` - Vercel deployment; `VITE_APP_VERSION: ${{ github.sha }}` set during build
- `vercel.json` - SPA with CSP headers (already allows `*.ingest.sentry.io` in connect-src)
- Phase 39 verification - All 8 truths verified, Sentry fully wired

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Sentry docs, verified installed versions, well-documented plugin
- Architecture: HIGH - Clear patterns from official docs; existing codebase structure well-understood
- Pitfalls: HIGH - Release mismatch and public source maps are thoroughly documented gotchas
- Alert configuration: MEDIUM - Thresholds are application-specific; starting values are best-practice guesses

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain, well-documented tools)
