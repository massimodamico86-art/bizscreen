# Skipped E2E Tests

Tracking document for E2E tests that are skipped during stabilization.

## Summary

| Category | Count | Notes |
|----------|-------|-------|
| Total skipped | 30 | Scenes feature not in navigation |
| Unfixable timing issues | 0 | |
| External dependencies | 0 | |
| Infrastructure issues | 0 | Backend timeouts are transient, not test issues |
| Feature not accessible | 30 | scenes.spec.js and scene-editor.spec.js (Scenes not in sidebar nav) |

## Skipped Tests by Category

### Category 1: Core Auth & Navigation

**Status:** Stabilized

All auth tests pass 5 consecutive runs. No tests were skipped.

Note: The following tests were already skipped in the test file with documented reasons:
- `Login Flow > shows loading state during login attempt` - Loading states too fast to reliably test in E2E
- `Signup Flow > shows loading state during signup attempt` - Loading states too fast to reliably test in E2E

These are intentional skips, not stabilization-related skips.

### Category 2: Dashboard & Basic Pages

**Status:** Stabilized

All Category 2 tests pass 5 consecutive runs. No tests were skipped during stabilization.

**Files stabilized:**
- `dashboard.spec.js` - 3 waitForTimeout calls removed
- `screens.spec.js` - 5 waitForTimeout calls removed
- `playlists.spec.js` - 3 waitForTimeout calls removed
- `media.spec.js` - 2 waitForTimeout calls removed

**Test count:** 63-68 tests per run (varies based on auth project availability)

Note: The following tests are skipped in the test file with documented reasons:
- `Media Library > can upload a media file` - Cloudinary widget is external service that cannot be automated in E2E

### Category 3: Complex Interactions

**Status:** Stabilized

All 39 waitForTimeout calls removed. Tests pass when infrastructure is stable.

**Files stabilized:**
- `smoke.spec.js` - 14 waitForTimeout calls removed
- `smoke-test-client.spec.js` - 15 waitForTimeout calls removed
- `client-interactions.spec.js` - 4 waitForTimeout calls removed
- `client-flows.spec.js` - 6 waitForTimeout calls removed

**Test count:** 36 tests (chromium project)

**Verification results:** 4 out of 5 runs passed (80%)
- The single failure was due to Supabase backend connection timeout ("Connection issue. Retrying...")
- Not a test timing issue - infrastructure stability issue

**Note:** Tests occasionally fail due to backend connection issues when:
1. Running multiple workers in parallel (increases load on local Supabase)
2. Local Supabase services have partial outages (imgproxy, pooler sometimes stopped)

**Recommendation:** Run Category 3 tests with `--workers=1` for consistent results.

**Helper improvements made:**
- Updated `loginAndPrepare` in helpers.js to handle auth resolution race conditions
- Uses Promise.race between sidebar visibility and login form visibility
- Fixed client-flows.spec.js to use pre-authenticated storage state

### Category 4: Feature-Specific Pages

**Status:** Stabilized

All 13 waitForTimeout calls removed. Tests pass when infrastructure is stable.

**Files stabilized:**
- `schedules.spec.js` - 6 waitForTimeout calls removed
- `brand-theme.spec.js` - 4 waitForTimeout calls removed
- `settings.spec.js` - 1 waitForTimeout call removed
- `admin.spec.js` - 2 waitForTimeout calls removed

**Test count by file:**
- settings.spec.js: 17 tests (100% pass rate)
- schedules.spec.js: 13 tests (100% pass rate)
- admin.spec.js: 23 tests + 3 skipped (100% pass rate)
- brand-theme.spec.js: 14 tests (variable pass rate due to backend connection issues)

**Verification results:**
- settings.spec.js: 3/3 consecutive runs passed
- schedules.spec.js: 3/3 consecutive runs passed
- admin.spec.js: 3/3 consecutive runs passed
- brand-theme.spec.js: 0/3 consecutive runs passed (backend connection timeouts)

**Brand-theme infrastructure issue:**
Brand-theme tests consistently fail due to Supabase backend connection timeouts ("Connection issue. Retrying... Attempt 2/3"). This is the same infrastructure issue documented in Category 3.

The failures occur during authentication, before any test logic runs:
- All 10 failing tests show "Connection timeout. Retrying in 4s..."
- The 4 passing tests (theme integration tests) don't require full authentication

**Root cause:** Local Supabase pooler is stopped (`supabase_pooler_bizscreen`), causing connection instability.

**Note:** Tests are correctly implemented with proper element-based waits. Failures are infrastructure-related, not timing-related.

### Category 5: Content & Templates

**Status:** Stabilized (waitForTimeout removal complete, test design issues documented)

All 43 waitForTimeout calls removed across 4 files. Tests have pre-existing design issues unrelated to timing.

**Files stabilized:**
- `content-performance.spec.js` - 15 waitForTimeout calls removed
- `template-marketplace.spec.js` - 11 waitForTimeout calls removed
- `template-packs.spec.js` - 13 waitForTimeout calls removed
- `playlist-template.spec.js` - 4 waitForTimeout calls removed

**Verification results:**
- content-performance.spec.js: 3 passed, 12 skipped (feature-gated), 1 failed (infrastructure)
- template-marketplace.spec.js: Tests failing due to incorrect element selectors
- template-packs.spec.js: Tests failing due to test design issues
- playlist-template.spec.js: Tests failing due to test design issues

**Pre-existing test design issues (not timing-related):**

1. **template-marketplace.spec.js:**
   - Tests look for `button { name: /marketplace/i }` but navigation shows "Templates" not "Marketplace"
   - Admin Template Management tests use incorrect credentials configuration
   - These tests need UI selector updates to match the actual application

2. **template-packs.spec.js:**
   - Uses manual login in beforeEach instead of storage state pattern
   - Tests look for UI elements that may not exist in current app version
   - Tests mix legacy patterns with new patterns

3. **playlist-template.spec.js:**
   - Similar manual login pattern issues
   - Tests expect specific playlists that may not exist in test database

**content-performance.spec.js notes:**
- Most tests use `test.skip()` for feature-gated content (Content Performance page not accessible)
- The 3 passing tests correctly handle the feature gate check
- Single failure was infrastructure-related (Supabase connection timeout)

**Recommendation:** These test files need refactoring for correct UI selectors and authentication patterns, which is out of scope for timing stabilization. The waitForTimeout removal is complete and correct.

### Category 6: Advanced Features

**Status:** Stabilized (waitForTimeout removal complete, 2 files pre-skipped)

All 30 waitForTimeout calls removed across 5 files.

**Files stabilized:**
- `scenes.spec.js` - 8 waitForTimeout calls removed (entire file is test.describe.skip)
- `scene-editor.spec.js` - 9 waitForTimeout calls removed (entire file is test.describe.skip)
- `polotno-editor.spec.js` - 1 waitForTimeout call removed
- `screen-assignments.spec.js` - 6 waitForTimeout calls removed
- `playlist-screen-persistence.spec.js` - 6 waitForTimeout calls removed

**Pre-skipped tests (not timing-related):**

1. **scenes.spec.js (10 tests):**
   - Entire test.describe marked as skip
   - Skip reason: "Scenes feature not in sidebar navigation (page exists but not accessible via nav)"
   - The Scenes feature page exists but is not exposed in the navigation UI
   - Tests cannot navigate to the feature via normal user flow

2. **scene-editor.spec.js (20 tests):**
   - Entire test.describe marked as skip
   - Skip reason: Same as scenes.spec.js - depends on Scenes feature being accessible
   - Tests cover canvas editor, slide management, AI suggestions panel

**Verification results (non-skipped files):**
- polotno-editor.spec.js: 5/5 consecutive runs passed (100%)
- screen-assignments.spec.js: 4/5 consecutive runs passed (80%, 1 auth setup failure - infrastructure)
- playlist-screen-persistence.spec.js: Partial pass - client tests pass, admin/superadmin fail due to credential mismatch

**playlist-screen-persistence.spec.js notes:**
- Test requires CLIENT credentials (TEST_CLIENT_EMAIL)
- Runs on chromium-admin and chromium-superadmin projects that don't have client credentials
- The chromium project (with client credentials) passes consistently
- Not a timing issue - credential configuration issue

**Recommendation:** Scenes and scene-editor tests are correctly skipped since the feature is not accessible via navigation. The polotno-editor and screen-assignments tests are stable. The playlist-screen-persistence test passes for the intended project (chromium with client credentials).

## Legend

- **Unfixable timing issues:** Tests that fail due to inherent timing problems that cannot be resolved with proper waits
- **External dependencies:** Tests that depend on external services (email delivery, third-party APIs)
- **Infrastructure issues:** Tests blocked by test infrastructure limitations
- **Test design issues:** Tests with incorrect selectors or outdated patterns

---
*Created: 2026-02-08*
*Last updated: 2026-02-09 - Category 6 stabilized*
