# Phase 162: Restore Deleted Spec Files - Research

**Researched:** 2026-04-11
**Domain:** Git history recovery, Playwright E2E spec restoration, fixture merging
**Confidence:** HIGH

## Summary

Commit `75371133` (feat(161-01): add assertAppReady helper and barrel export) was a worktree merge that deleted 27 spec files, `helpers/screenshots.js`, the original `fixtures/index.js` (with Playwright fixtures), and all `.planning` artifacts from phases 149–160. This is the second time the worktree merge process has destroyed test files (first: commit `289a2c7b`). All deleted content is fully recoverable via `git checkout 75371133~1 -- <files>`.

The recovery has three distinct sub-problems: (1) restore 27 deleted spec files verbatim from `75371133~1`, (2) restore `playlists.spec.js` and `template-marketplace.spec.js` to their pre-deletion content (both exist on disk but were truncated/overwritten by the merge), and (3) merge the pre-deletion `fixtures/index.js` (which had `authenticatedPage` and `freshPage` Playwright fixtures) with the current `fixtures/index.js` (which has `LAYOUT_PRESETS`, `WIDGET_TYPES`, and `TEST_LAYOUT_PREFIX` constants added by Phase 161).

**Primary recommendation:** Use `git checkout 75371133~1 -- <path>` to restore all 27 deleted files and `helpers/screenshots.js`. For the two overwritten files and `fixtures/index.js`, restore from `75371133~1` and then re-add any Phase 161 additions that must be preserved.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Signup form fields and validation | `auth-signup-reset-invite.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-02 | Login with valid credentials reaches /app | `auth-login-logout.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-03 | Logout redirects to login and blocks /app | `auth-login-logout.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-04 | Password reset request flow | `auth-signup-reset-invite.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-05 | Session persists across page refresh | `auth-login-logout.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-06 | Invalid credentials display error | `auth-login-logout.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-07 | Form validation catches empty/malformed fields | `auth-signup-reset-invite.spec.js` exists at `75371133~1` — restore verbatim |
| AUTH-08 | Team invite acceptance page | `auth-signup-reset-invite.spec.js` exists at `75371133~1` — restore verbatim |
| NAVX-01 through NAVX-10 | Navigation routes, deep links, responsive, a11y | 4 nav spec files at `75371133~1`: `nav-route-loading`, `nav-error-handling`, `nav-responsive`, `nav-accessibility-onboarding` — restore verbatim |
| CONT-02 | Playlist editing | `playlists.spec.js` pre-deletion (619 lines) has `test.describe('Playlist Editing (CONT-02)')` — restore full pre-deletion content |
| CONT-03 | Nested playlists | `playlists.spec.js` pre-deletion has `test.describe('Nested Playlists (CONT-03)')` |
| CONT-04 | Background audio | `playlists.spec.js` pre-deletion has `test.describe('Background Audio (CONT-04)')` |
| CONT-07 | Template browsing/filtering | `template-marketplace.spec.js` pre-deletion (484 lines) covers this |
| CONT-08 | Drag-drop reorder | `playlists.spec.js` pre-deletion has `test.describe('Drag-Drop Reorder (CONT-08)')` |
| CONT-09 | Playlist empty state | `playlists.spec.js` pre-deletion has `test.describe('Playlist Empty State (CONT-09 partial)')` |
| CONT-10 | Playlist validation | `playlists.spec.js` pre-deletion has `test.describe('Playlist Validation (CONT-10 partial)')` |
| CONT-11 | Apply template via hover overlay | `template-marketplace.spec.js` pre-deletion has `test('can apply a template via hover overlay (CONT-11)')` |
| CONT-12 | Template customization | `template-marketplace.spec.js` pre-deletion has `test.describe('Template Customization (CONT-12)')` |
| SCRN-01, SCRN-02, SCRN-04 | Screen list, OTP pairing, remote commands | `screen-management.spec.js` at `75371133~1` — restore verbatim |
| SCRN-03, SCRN-05, SCRN-06, SCRN-07, SCRN-08 | Screen groups, diagnostics, orientation, screenshots, alerts | `screen-groups-diagnostics.spec.js` at `75371133~1` — restore verbatim |
| SCHED-01 through SCHED-08 | Schedule CRUD, time/day rules, overlap indicators | `scheduling.spec.js` and `campaigns.spec.js` at `75371133~1` — restore verbatim |
| WDGT-01 through WDGT-10 | Widget catalog and rendering | `widgets-basic.spec.js`, `widgets-data.spec.js`, `widgets-embeds.spec.js`, `widgets-rendering.spec.js`, `edge-functions.spec.js` at `75371133~1` — restore verbatim |
| MENU-01 through MENU-04 | Menu board CRUD, reorder, dietary tags, DSMenu widget | `menu-boards.spec.js` at `75371133~1` — restore verbatim |
| LANG-01 through LANG-03 | Language variants, user-level assignment, fallback chain | `multi-language.spec.js` at `75371133~1` — restore verbatim |
| ADMN-01 | Team member management | `admin-settings-team.spec.js` at `75371133~1` — restore verbatim |
| ADMN-02, ADMN-03, ADMN-06 | Branding, security, notification settings | `admin-settings-branding-security.spec.js` at `75371133~1` — restore verbatim |
| ADMN-04, ADMN-05 | Billing & subscription, admin tools | `admin-settings-billing-tools.spec.js` at `75371133~1` — restore verbatim |
| ENTR-01 | Enterprise SSO configuration | `enterprise-sso.spec.js` at `75371133~1` — restore verbatim |
| ENTR-02, ENTR-03 | Enterprise REST API gateway | `enterprise-api.spec.js` at `75371133~1` — restore verbatim |
| ENTR-04, ENTR-05 | Enterprise analytics & CSV export | `enterprise-analytics.spec.js` at `75371133~1` — restore verbatim |
| PLYR-01, PLYR-02 | Player rendering, multi-zone layouts | `player-rendering.spec.js` at `75371133~1` — restore verbatim |
| PLYR-03, PLYR-04 | Player offline fallback, self-heal | `player-offline-selfheal.spec.js` at `75371133~1` — restore verbatim |
| PLYR-05, PLYR-06 | Player telemetry, heartbeat | `player-telemetry.spec.js` at `75371133~1` — restore verbatim |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| git | system | Source recovery | All content exists in git history at `75371133~1` |
| `git checkout <commit> -- <file>` | N/A | Restore deleted/overwritten files | Preserves exact content, author attribution implicit |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `git show <commit>:<path>` | N/A | Inspect file content at a commit | Verify content before/after checkout |
| `git ls-tree -r --name-only <commit> -- <dir>` | N/A | List all files at a commit | Build exact file list for batch restore |
| `node --input-type=module` | system | Parse-check ES module spec files | Catch syntax errors before committing |
| `npx playwright test --list` | system | List all discovered tests | Verify all 29 files parse without errors |

**Installation:** No new packages required. All tooling is already present.

## Architecture Patterns

### Recommended Restore Strategy

```
Phase 162 has 3 types of file recovery operations:

Type A — Verbatim restore (27 files + helpers/screenshots.js):
  git checkout 75371133~1 -- tests/e2e/<filename>
  (No post-processing needed — file content is exact)

Type B — Overwritten file restore (2 files):
  playlists.spec.js: restore from 75371133~1 (619 lines, full CONT-02..04/07..10 coverage)
  template-marketplace.spec.js: restore from 75371133~1 (484 lines, CONT-11/12 coverage)
  Note: both already exist on disk but with truncated content

Type C — Merge operation (fixtures/index.js):
  Pre-deletion content (at 75371133~1): authenticatedPage and freshPage Playwright fixtures
  Current HEAD content: LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX constants
  Action: Start with pre-deletion version, append the three constant exports at the end
```

### File Inventory: 27 Deleted Spec Files + helpers/screenshots.js

**Confirmed missing from HEAD, present at `75371133~1`:**

```
# AUTH (2 files)
tests/e2e/auth-login-logout.spec.js          # AUTH-02, AUTH-03, AUTH-05, AUTH-06
tests/e2e/auth-signup-reset-invite.spec.js   # AUTH-01, AUTH-04, AUTH-07, AUTH-08

# NAV (4 files)
tests/e2e/nav-route-loading.spec.js          # NAVX-01..04
tests/e2e/nav-error-handling.spec.js         # NAVX-05..07
tests/e2e/nav-responsive.spec.js             # NAVX-08..09
tests/e2e/nav-accessibility-onboarding.spec.js  # NAVX-10

# SCREEN (2 files)
tests/e2e/screen-management.spec.js          # SCRN-01, SCRN-02, SCRN-04
tests/e2e/screen-groups-diagnostics.spec.js  # SCRN-03, SCRN-05, SCRN-06, SCRN-07, SCRN-08

# SCHEDULING (2 files)
tests/e2e/scheduling.spec.js                 # SCHED-01, SCHED-02, SCHED-07
tests/e2e/campaigns.spec.js                  # SCHED-03..SCHED-08 (with product gaps on SCHED-04, SCHED-06)

# WIDGETS (5 files)
tests/e2e/widgets-basic.spec.js              # WDGT-01..04
tests/e2e/widgets-data.spec.js               # WDGT-05, WDGT-06, WDGT-09
tests/e2e/widgets-embeds.spec.js             # WDGT-07, WDGT-08
tests/e2e/widgets-rendering.spec.js          # WDGT-01..04, WDGT-10
tests/e2e/edge-functions.spec.js             # WDGT-10 (edge function proxy)

# MENU + LANG (2 files)
tests/e2e/menu-boards.spec.js                # MENU-01..04
tests/e2e/multi-language.spec.js             # LANG-01..03

# ADMIN (3 files)
tests/e2e/admin-settings-team.spec.js        # ADMN-01
tests/e2e/admin-settings-branding-security.spec.js  # ADMN-02, ADMN-03, ADMN-06
tests/e2e/admin-settings-billing-tools.spec.js      # ADMN-04, ADMN-05

# ENTERPRISE (3 files)
tests/e2e/enterprise-sso.spec.js             # ENTR-01
tests/e2e/enterprise-api.spec.js             # ENTR-02, ENTR-03
tests/e2e/enterprise-analytics.spec.js       # ENTR-04, ENTR-05

# PLAYER (3 files)
tests/e2e/player-rendering.spec.js           # PLYR-01, PLYR-02
tests/e2e/player-offline-selfheal.spec.js    # PLYR-03, PLYR-04
tests/e2e/player-telemetry.spec.js           # PLYR-05, PLYR-06

# HELPERS (1 file)
tests/e2e/helpers/screenshots.js             # required by helpers/index.js barrel
```

### Pattern 1: Batch Git Restore Command

All 27 spec files and `helpers/screenshots.js` can be restored in a single git command:

```bash
# Source: [VERIFIED: git history inspection - all files confirmed at 75371133~1]
git checkout 75371133~1 -- \
  tests/e2e/auth-login-logout.spec.js \
  tests/e2e/auth-signup-reset-invite.spec.js \
  tests/e2e/nav-route-loading.spec.js \
  tests/e2e/nav-error-handling.spec.js \
  tests/e2e/nav-responsive.spec.js \
  tests/e2e/nav-accessibility-onboarding.spec.js \
  tests/e2e/screen-management.spec.js \
  tests/e2e/screen-groups-diagnostics.spec.js \
  tests/e2e/scheduling.spec.js \
  tests/e2e/campaigns.spec.js \
  tests/e2e/widgets-basic.spec.js \
  tests/e2e/widgets-data.spec.js \
  tests/e2e/widgets-embeds.spec.js \
  tests/e2e/widgets-rendering.spec.js \
  tests/e2e/edge-functions.spec.js \
  tests/e2e/menu-boards.spec.js \
  tests/e2e/multi-language.spec.js \
  tests/e2e/admin-settings-team.spec.js \
  tests/e2e/admin-settings-branding-security.spec.js \
  tests/e2e/admin-settings-billing-tools.spec.js \
  tests/e2e/enterprise-sso.spec.js \
  tests/e2e/enterprise-api.spec.js \
  tests/e2e/enterprise-analytics.spec.js \
  tests/e2e/player-rendering.spec.js \
  tests/e2e/player-offline-selfheal.spec.js \
  tests/e2e/player-telemetry.spec.js \
  tests/e2e/helpers/screenshots.js
```

### Pattern 2: Restore Overwritten Playlists Spec

```bash
# Source: [VERIFIED: git history - pre-deletion = 619 lines, HEAD = 209 lines]
git checkout 75371133~1 -- tests/e2e/playlists.spec.js
```

The pre-deletion version has full coverage of CONT-02 (Playlist Editing), CONT-03 (Nested Playlists), CONT-04 (Background Audio), CONT-08 (Drag-Drop Reorder), CONT-09 (Playlist Empty State), CONT-10 (Playlist Validation). The HEAD version has none of these.

### Pattern 3: Restore Overwritten Template Marketplace Spec

```bash
# Source: [VERIFIED: git history - pre-deletion = 484 lines, HEAD = 384 lines]
git checkout 75371133~1 -- tests/e2e/template-marketplace.spec.js
```

The pre-deletion version has CONT-11 (apply via hover overlay) and CONT-12 (template customization). The HEAD version differs only in a selector (`/templates/i` vs `/marketplace/i`) — the pre-deletion version is the correct one that matches the nav button label.

### Pattern 4: Merge fixtures/index.js

The pre-deletion `fixtures/index.js` (104 lines) has `authenticatedPage` and `freshPage` Playwright fixtures. The current `fixtures/index.js` has `LAYOUT_PRESETS`, `WIDGET_TYPES`, and `TEST_LAYOUT_PREFIX` constants (added by Phase 161 for `layouts-screenshots.spec.js`).

The merged version must export ALL of these. The correct approach:

```javascript
// Source: [VERIFIED: git inspection of both versions]
// Start with pre-deletion content (restore authenticatedPage, freshPage, test, expect)
git checkout 75371133~1 -- tests/e2e/fixtures/index.js
# Then append the constants from Phase 161:
# export const LAYOUT_PRESETS = [...]
# export const WIDGET_TYPES = [...]
# export const TEST_LAYOUT_PREFIX = 'E2E-Layout';
```

`layouts-screenshots.spec.js` (the only Phase 161 spec) imports:
```javascript
import { LAYOUT_PRESETS, WIDGET_TYPES, TEST_LAYOUT_PREFIX } from './fixtures/index.js';
```
Those constants must remain in the merged file or `layouts-screenshots.spec.js` will fail.

### Pattern 5: Restore helpers/index.js Barrel

The current `helpers/index.js` exports 6 functions from `../helpers.js` (including `assertAppReady` added by Phase 161) but does NOT export `screenshotStep`, `VIEWPORTS`, `cleanScreenshots`, or `detectViewport` from `screenshots.js` (because `screenshots.js` was deleted).

After restoring `helpers/screenshots.js`, the barrel must be updated to re-add those exports:

```javascript
// Source: [VERIFIED: git inspection of 75371133~1 version]
// The pre-deletion helpers/index.js had:
export { screenshotStep, VIEWPORTS, cleanScreenshots, detectViewport } from './screenshots.js';
export { loginAndPrepare, dismissAnyModals, waitForPageReady, navigateToSection, generateTestName } from '../helpers.js';

// Current helpers/index.js has:
export { loginAndPrepare, dismissAnyModals, waitForPageReady, navigateToSection, generateTestName, assertAppReady } from '../helpers.js';

// Merged version needs ALL of these:
export { screenshotStep, VIEWPORTS, cleanScreenshots, detectViewport } from './screenshots.js';
export { loginAndPrepare, dismissAnyModals, waitForPageReady, navigateToSection, generateTestName, assertAppReady } from '../helpers.js';
```

**Key:** `assertAppReady` was added to `helpers.js` in Phase 161 and must stay. `screenshotStep`, `VIEWPORTS`, etc. were in the pre-deletion barrel and must be re-added once `screenshots.js` is restored.

### Import Dependency Map

Which restored specs need which infrastructure:

| Spec Group | Imports from `./fixtures/index.js` | Imports from `./helpers/index.js` | Imports from `./helpers.js` |
|-----------|-------------------------------------|-----------------------------------|-----------------------------|
| auth-login-logout | `test, expect` (Playwright fixtures) | `screenshotStep` | `loginAndPrepare`, `waitForPageReady` |
| auth-signup-reset-invite | `test, expect` | `screenshotStep` | — |
| nav-route-loading | `test, expect` | `screenshotStep`, `waitForPageReady`, `loginAndPrepare` | — |
| nav-error-handling | `test, expect` | (multiple) | — |
| nav-responsive | `test, expect` | (multiple) | — |
| nav-accessibility-onboarding | `test, expect` | (multiple) | — |
| screen-management | — | — | `loginAndPrepare`, `navigateToSection`, etc. |
| screen-groups-diagnostics | — | — | `loginAndPrepare`, `dismissAnyModals`, etc. |
| scheduling | — | — | `loginAndPrepare`, `navigateToSection`, etc. |
| campaigns | — | — | (check at restore time) |
| widgets-* | — | — | `loginAndPrepare`, `navigateToSection`, etc. |
| edge-functions | — | — | `loginAndPrepare`, `waitForPageReady` |
| menu-boards | — | — | `loginAndPrepare`, `waitForPageReady`, etc. |
| multi-language | — | — | `loginAndPrepare`, `waitForPageReady`, etc. |
| admin-settings-* | — | — | `loginAndPrepare`, `waitForPageReady` |
| enterprise-* | — | — | `loginAndPrepare`, `waitForPageReady`, `dismissAnyModals` |
| player-* | — | — | `@playwright/test` only (public routes, no auth) |

**Critical insight:** The 4 nav specs and 2 auth specs are the only restored specs that import `test, expect` from `./fixtures/index.js`. All other restored specs import directly from `@playwright/test`. This means `fixtures/index.js` merging is only required for those 6 specs to parse correctly.

### Anti-Patterns to Avoid

- **Restoring via manual copy-paste:** Do not manually recreate file content. Use `git checkout` to get exact pre-deletion content — avoids subtle transcription errors.
- **Restoring fixtures/index.js verbatim without merging:** If you blindly restore from `75371133~1`, it overwrites the Phase 161 constants and breaks `layouts-screenshots.spec.js`.
- **Forgetting to update helpers/index.js:** After restoring `helpers/screenshots.js`, the barrel must also be updated to re-export from it. Otherwise auth/nav specs that import `screenshotStep` from `./helpers/index.js` will fail.
- **Committing without parse-checking:** Always run `npx playwright test --list` before committing. A single bad import path silently fails all tests in that file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recreate spec content from scratch | Writing new tests for AUTH-01..08, NAVX, etc. | `git checkout 75371133~1 -- <file>` | The original tests already passed UAT; recreating introduces regressions and drift from original intent |
| Figure out which files are missing | Manual inspection of disk vs requirements | `git ls-tree` + `comm -23` | The exact list is already computed and verified (27 files) |

## Common Pitfalls

### Pitfall 1: Naive fixtures/index.js Restore Breaks Phase 161

**What goes wrong:** `git checkout 75371133~1 -- tests/e2e/fixtures/index.js` overwrites the current file with only the Playwright fixtures. `layouts-screenshots.spec.js` then fails with "LAYOUT_PRESETS is not exported".

**Why it happens:** Phase 161 added constants to `fixtures/index.js` that didn't exist pre-deletion. `git checkout` replaces the entire file.

**How to avoid:** Restore from `75371133~1` first (getting `authenticatedPage`, `freshPage`, `test`, `expect`), then append the three constant arrays that Phase 161 added.

**Warning signs:** `layouts-screenshots.spec.js` import error, `npx playwright test --list` shows 0 tests in that file.

### Pitfall 2: helpers/index.js Barrel Missing Screenshots Exports

**What goes wrong:** After restoring `helpers/screenshots.js`, `helpers/index.js` still only exports from `../helpers.js`. Specs that do `import { screenshotStep } from './helpers/index.js'` fail with "does not provide an export named 'screenshotStep'".

**Why it happens:** The current `helpers/index.js` was rebuilt in Phase 161 without the screenshot exports (since `screenshots.js` didn't exist). Restoring `screenshots.js` alone isn't enough.

**How to avoid:** After restoring `screenshots.js`, update `helpers/index.js` to re-add the four screenshot exports while preserving the Phase 161 `assertAppReady` addition.

**Warning signs:** `auth-login-logout.spec.js` and all 4 nav specs fail at import time.

### Pitfall 3: Overwritten playlists.spec.js Has Silent Test Coverage Gap

**What goes wrong:** The current `playlists.spec.js` (209 lines) looks like a valid spec but covers only basic CRUD — no CONT-02/03/04/08/09/10 test groups. The phase success criteria is missed without obvious error.

**Why it happens:** The HEAD version is a legitimate (but earlier) version of the file that predates the Phase 151 additions. It is NOT corrupt — just incomplete.

**How to avoid:** Always restore from `75371133~1`, not from the current file. The 619-line pre-deletion version is the one with full coverage.

**Warning signs:** `npx playwright test --list` shows fewer tests than expected in `playlists.spec.js`.

### Pitfall 4: Nav Specs Parse Failure if fixtures/index.js Lacks Playwright Fixtures

**What goes wrong:** If `fixtures/index.js` only exports data constants (current state), importing `{ test, expect }` from it gives an ES module "test is not exported" error. All 4 nav specs + 2 auth specs fail immediately.

**Why it happens:** The current `fixtures/index.js` has no `test` or `expect` exports — it was rewritten by Phase 161 to hold layout/widget constants only.

**How to avoid:** Ensure `fixtures/index.js` merge is done before validating the nav/auth specs.

**Warning signs:** `SyntaxError: The requested module './fixtures/index.js' does not provide an export named 'test'`.

## Code Examples

### Verify pre-deletion content is available
```bash
# Source: [VERIFIED: git ls-tree run during research]
git ls-tree -r --name-only 75371133~1 -- tests/e2e/ | sort
# Should show all 65 files including the 27 missing ones
```

### Compute exact missing file list
```bash
# Source: [VERIFIED: comm command run during research]
comm -23 \
  <(git ls-tree -r --name-only 75371133~1 -- tests/e2e/ | sort) \
  <(git ls-tree -r --name-only HEAD -- tests/e2e/ | sort)
# Output: 27 files confirmed missing
```

### Validate restored files parse without errors
```bash
# Source: [VERIFIED: playwright.config.js - testDir is tests/e2e]
npx playwright test --list 2>&1 | grep -E "Error|error|Cannot" | head -20
# Expected: no errors
# Also check total test count:
npx playwright test --list 2>&1 | tail -5
```

### Merged fixtures/index.js structure
```javascript
// Source: [VERIFIED: git show 75371133~1:tests/e2e/fixtures/index.js + HEAD:tests/e2e/fixtures/index.js]
/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, expect } from '@playwright/test';
import { loginAndPrepare } from '../helpers.js';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await loginAndPrepare(page);
    await use(page);
  },
  freshPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

// Phase 161 additions — required by layouts-screenshots.spec.js
export const LAYOUT_PRESETS = ['Full Screen', 'Two Columns', 'Three Columns', 'Main + Sidebar', 'Header + Content', 'L-Shape', 'Quadrant'];
export const WIDGET_TYPES = ['Clock', 'Weather', 'RSS Feed', 'Web Page', 'QR Code', 'Countdown', 'Google Sheets', 'YouTube', 'Social Feed'];
export const TEST_LAYOUT_PREFIX = 'E2E-Layout';
```

### Merged helpers/index.js structure
```javascript
// Source: [VERIFIED: git show 75371133~1:tests/e2e/helpers/index.js + HEAD:tests/e2e/helpers/index.js]
/**
 * Unified E2E Helpers Barrel
 */

// Screenshot helpers (restored from screenshots.js)
export {
  screenshotStep,
  VIEWPORTS,
  cleanScreenshots,
  detectViewport,
} from './screenshots.js';

// Existing test helpers (Phase 161 added assertAppReady)
export {
  loginAndPrepare,
  dismissAnyModals,
  waitForPageReady,
  navigateToSection,
  generateTestName,
  assertAppReady,
} from '../helpers.js';
```

## Runtime State Inventory

> This is a restoration/recovery phase, not a rename/refactor phase. No runtime state is involved — the change is entirely file-level (adding deleted spec files back to disk).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None | No databases store spec file paths |
| Live service config | None | Playwright config auto-discovers all `*.spec.js` files in `tests/e2e/` |
| OS-registered state | None | No OS-level registrations reference spec file names |
| Secrets/env vars | None | Spec files reference env vars (`TEST_USER_EMAIL` etc.) but these are unchanged |
| Build artifacts | None — verified by inspection | No compiled artifacts from E2E spec files |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| git | File restoration | Yes | system | — |
| Node.js | Playwright test runner | Yes | system | — |
| @playwright/test | Spec parsing validation | Yes (in package.json) | installed | — |

**All dependencies available. No missing dependencies.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.js` |
| Quick run command | `npx playwright test --list` (parse check only, no browser) |
| Full suite command | `npx playwright test tests/e2e/auth-login-logout.spec.js --project=chromium` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTH-01..08 | Auth lifecycle | E2E | `npx playwright test --list 2>&1 \| grep auth-login\|auth-signup` | ❌ Wave 0 restore |
| NAVX-01..10 | Navigation routes | E2E | `npx playwright test --list 2>&1 \| grep nav-` | ❌ Wave 0 restore |
| CONT-02..04, 07..12 | Playlists + templates | E2E | `npx playwright test --list 2>&1 \| grep playlists\|template-marketplace` | ❌ Wave 0 restore (overwritten) |
| SCRN-01..08 | Screen management | E2E | `npx playwright test --list 2>&1 \| grep screen-` | ❌ Wave 0 restore |
| SCHED-01..08 | Scheduling | E2E | `npx playwright test --list 2>&1 \| grep scheduling\|campaigns` | ❌ Wave 0 restore |
| WDGT-01..10 | Widgets | E2E | `npx playwright test --list 2>&1 \| grep widgets\|edge-functions` | ❌ Wave 0 restore |
| MENU-01..04 | Menu boards | E2E | `npx playwright test --list 2>&1 \| grep menu-boards` | ❌ Wave 0 restore |
| LANG-01..03 | Multi-language | E2E | `npx playwright test --list 2>&1 \| grep multi-language` | ❌ Wave 0 restore |
| ADMN-01..06 | Admin settings | E2E | `npx playwright test --list 2>&1 \| grep admin-settings` | ❌ Wave 0 restore |
| ENTR-01..05 | Enterprise | E2E | `npx playwright test --list 2>&1 \| grep enterprise-` | ❌ Wave 0 restore |
| PLYR-01..06 | Player | E2E | `npx playwright test --list 2>&1 \| grep player-` | ❌ Wave 0 restore |

### Sampling Rate
- **Per task commit:** `npx playwright test --list 2>&1 | grep -c "•"` (count should increase with each batch)
- **Per wave merge:** `npx playwright test --list 2>&1 | tail -3` (no errors, total count shown)
- **Phase gate:** `npx playwright test --list` shows 0 import errors, all 29 files listed

### Wave 0 Gaps
- All 29 files are the deliverable of this phase — restoring them IS Wave 0
- No additional test infrastructure needed beyond what Phase 161 already established

## Security Domain

> No new authentication, access control, input handling, or cryptography is introduced by this phase. The phase restores pre-existing spec files that were already audited. Security domain does not apply.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `playlists.spec.js` at `75371133~1` covers CONT-07 through CONT-12 | Phase Requirements / File Inventory | [ASSUMED] — research confirmed CONT-02/03/04/08/09/10 but CONT-07/11/12 are in `template-marketplace.spec.js`, not `playlists.spec.js`. This claim is actually correct as stated (the CONT-07/11/12 entries point to `template-marketplace`). |
| A2 | `campaigns.spec.js` at `75371133~1` covers SCHED-03 through SCHED-08 | File Inventory | [ASSUMED based on milestone audit] — audit states "SCHED-04 dayparting presets UI never built" and "SCHED-06 campaign analytics play counts UI never wired" as product gaps |

**Note on A2:** The milestone audit already documented that SCHED-04 and SCHED-06 are product gaps (UI never built). The restored `campaigns.spec.js` may have tests that skip or soft-fail for these. This is expected behavior and does not block phase success.

## Open Questions

1. **campaigns.spec.js import pattern**
   - What we know: The file exists at `75371133~1`, restoring it is straightforward
   - What's unclear: The exact import pattern (Bash grep returned truncated output showing `import {` without the rest)
   - Recommendation: Restore verbatim; if import errors appear, check imports after restore with `head -20 tests/e2e/campaigns.spec.js`

2. **nav-error-handling and nav-accessibility-onboarding full import lists**
   - What we know: Both import `{ test, expect }` from `./fixtures/index.js`
   - What's unclear: Which specific helpers they import from `./helpers/index.js`
   - Recommendation: Restore verbatim; the merge of `helpers/index.js` exports all known helpers so any combination will work

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: git ls-tree 75371133~1]` — confirmed all 27 missing spec files exist at pre-deletion commit
- `[VERIFIED: comm -23 comparison]` — exact file list computed from HEAD vs 75371133~1
- `[VERIFIED: git show line counts]` — playlists.spec.js 619 vs 209 lines, template-marketplace.spec.js 484 vs 384 lines
- `[VERIFIED: git show grep]` — confirmed CONT-02/03/04/08/09/10 test groups in pre-deletion playlists.spec.js
- `[VERIFIED: git show grep]` — confirmed CONT-11/12 test groups in pre-deletion template-marketplace.spec.js
- `[VERIFIED: cat fixtures/index.js]` — confirmed current fixtures has constants only, no Playwright fixtures
- `[VERIFIED: cat helpers/index.js]` — confirmed current barrel missing screenshotStep exports
- `[VERIFIED: v18.0-MILESTONE-AUDIT.md]` — audit confirms root cause, exact commit reference, and recommended fix command

### Secondary (MEDIUM confidence)
- `[CITED: v18.0-MILESTONE-AUDIT.md]` — requirement-to-spec-file mapping for all 77 unsatisfied requirements

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — computed from git directly, every file confirmed
- Restore strategy: HIGH — standard git workflow, no ambiguity
- Merge targets (fixtures/index.js, helpers/index.js): HIGH — both versions read and compared
- Requirement coverage mapping: HIGH for confirmed specs, MEDIUM for campaigns.spec.js SCHED coverage details

**Research date:** 2026-04-11
**Valid until:** Permanent — git history does not change
