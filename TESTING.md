# Testing Guide

This document explains how to run tests locally and how the CI pipeline works.

## Test Types

| Type | Framework | Location | Command |
|------|-----------|----------|---------|
| Unit tests | Vitest | `tests/unit/` | `npm test -- --run` |
| Integration tests | Vitest | `tests/integration/` | `npm test -- --run` |
| E2E tests | Playwright | `tests/e2e/` | `npm run test:e2e` |

## Quick Commands

| Command | What it does |
|---------|--------------|
| `npm test` | Run unit/integration tests once |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | Run all tests (unit + E2E) |
| `npm run test:ci` | Simulate CI locally (includes Supabase seeding) |
| `npm run test:ci:local` | Run all tests without seeding (for local dev) |

## Running Tests Locally

### Prerequisites

1. **Node.js 20+** installed
2. **Supabase project** (use a **test/dev project**, NOT production)
3. **Test user** created in that Supabase project

### Environment Variables

Create a `.env.local` file (or `.env.test`) with these values:

```bash
# Supabase connection (use your TEST project, not production!)
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test user credentials (must exist in your Supabase project)
TEST_USER_EMAIL=test@bizscreen.test
TEST_USER_PASSWORD=testpassword123
```

### Creating the Test User

If the test user doesn't exist in your Supabase project, create it:

**Option 1: Via Supabase Dashboard**
1. Go to Authentication → Users → Add User
2. Email: `test@bizscreen.test`
3. Password: `testpassword123`
4. Check "Auto Confirm User"

**Option 2: Via the seed script**
```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
TEST_USER_EMAIL=test@bizscreen.test \
TEST_USER_PASSWORD=testpassword123 \
node scripts/seed-ci-test-user.cjs
```

### Running Unit/Integration Tests

```bash
# Run all unit and integration tests once
npm test -- --run

# Run in watch mode (for development)
npm test

# Run with coverage
npm test -- --run --coverage
```

### Running E2E Tests

```bash
# Make sure the dev server is running first
npm run dev

# In another terminal, run E2E tests
TEST_USER_EMAIL=test@bizscreen.test \
TEST_USER_PASSWORD=testpassword123 \
npm run test:e2e

# Or run in CI mode (headless, no dev server needed if using preview)
CI=true \
TEST_USER_EMAIL=test@bizscreen.test \
TEST_USER_PASSWORD=testpassword123 \
npm run test:e2e
```

### Running a Specific Test File

```bash
# Unit test
npm test -- tests/unit/services/billingService.test.js --run

# E2E test
npx playwright test tests/e2e/auth.spec.js
```

## CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs automatically on:
- Push to `main`
- Pull requests targeting `main`

### Pipeline Steps

1. **Checkout** → Clone the repository
2. **Setup Node.js** → Install Node 20 with npm caching
3. **Install dependencies** → `npm ci` (with caching)
4. **Install Playwright** → Browser binaries (with caching)
5. **Run unit tests** → `npm test -- --run`
6. **Prepare Supabase test data** → `node scripts/seed-ci-test-user.cjs`
7. **Run E2E tests** → `npm run test:e2e`
8. **Upload artifacts** → Playwright report (on failure only)

### Supabase Seeding Script

The `scripts/seed-ci-test-user.cjs` script runs before E2E tests to ensure the test user exists:

- Connects to Supabase using the **service role key**
- Creates the test user if it doesn't exist
- Updates the password if the user exists (ensures credentials match)
- Creates/updates the user's profile with `admin` role
- Is idempotent (safe to run multiple times)

### Required GitHub Secrets

Set these in: `Settings → Secrets and variables → Actions → New repository secret`

| Secret | Description | Example |
|--------|-------------|---------|
| `TEST_USER_EMAIL` | Email for CI test user | `test@bizscreen.test` |
| `TEST_USER_PASSWORD` | Password for CI test user | `testpassword123` |
| `SUPABASE_URL` | Your **test** Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Your **test** project anon key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your **test** project service role key | `eyJhbG...` |

> **Important**: Use a dedicated **test/dev Supabase project**, not your production project. The seeding script modifies user data.

## Troubleshooting

### "Invalid login credentials" in E2E tests

**Cause**: Test user doesn't exist or password is wrong.

**Fix**:
1. Check that `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set
2. Verify the user exists in your Supabase project (Authentication → Users)
3. Run the seed script to create/update the user:
   ```bash
   node scripts/seed-ci-test-user.cjs
   ```

### "Supabase URL mismatch" or connection errors

**Cause**: `VITE_SUPABASE_URL` doesn't match your actual project.

**Fix**:
1. Check your `.env.local` or environment variables
2. Ensure the URL format is `https://your-project-ref.supabase.co`
3. Verify the anon key belongs to the same project

### Tests pass locally but fail in CI

**Cause**: Usually missing or incorrect GitHub Secrets.

**Fix**:
1. Go to `Settings → Secrets and variables → Actions`
2. Verify all 5 secrets are set and have correct values
3. Check the CI logs for the "Prepare Supabase test data" step output

### "Welcome Modal blocks tests"

**Cause**: The app shows a first-run modal that blocks interaction.

**Fix**: This is handled by the `loginAndPrepare()` helper in `tests/e2e/helpers.js`, which sets `localStorage.setItem('bizscreen_welcome_modal_shown', 'true')` before login. If you're writing new tests, use this helper.

### Playwright browser not found

**Cause**: Playwright browsers not installed.

**Fix**:
```bash
npx playwright install chromium
# Or install all browsers:
npx playwright install
```

### Tests time out

**Cause**: Dev server not running, or Supabase is slow.

**Fix**:
1. For local: ensure `npm run dev` is running
2. For CI: the workflow uses `webServer` config in `playwright.config.js`
3. Increase timeouts if needed (see `playwright.config.js`)

## Writing New Tests

### Unit Tests

```javascript
// tests/unit/services/myService.test.js
import { describe, it, expect, vi } from 'vitest';

describe('myService', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### E2E Tests

```javascript
// tests/e2e/myFeature.spec.js
import { test, expect } from '@playwright/test';
import { loginAndPrepare, navigateToSection } from './helpers.js';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page);
  });

  test('should work', async ({ page }) => {
    await navigateToSection(page, 'media');
    await page.getByRole('button', { name: /my button/i }).click();
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

## E2E Test Helpers

The `tests/e2e/helpers.js` file provides:

- `loginAndPrepare(page)` - Logs in and dismisses modals
- `dismissAnyModals(page)` - Closes any open modal dialogs
- `waitForPageReady(page)` - Waits for loading states to complete
- `navigateToSection(page, section)` - Navigates to 'media', 'playlists', 'screens', etc.
- `generateTestName(prefix)` - Creates unique names with timestamps

## Test Coverage

To generate a coverage report:

```bash
npm test -- --run --coverage
```

Coverage reports are generated in `coverage/`.

## Related Files

- `vitest.config.js` - Vitest configuration
- `playwright.config.js` - Playwright configuration
- `tests/setup.js` - Vitest global setup
- `tests/e2e/helpers.js` - E2E test utilities
- `scripts/seed-ci-test-user.cjs` - CI user seeding script
- `.github/workflows/ci.yml` - CI pipeline definition

## Test Adoption Plan

This section tracks our test coverage goals and implementation roadmap.

### Current Coverage Summary

| Layer | Files | Test Cases | Coverage |
|-------|-------|------------|----------|
| E2E (Playwright) | 10 | ~67 | Auth, navigation, media, playlists, screens, CRUD |
| Integration | 6 | ~25 | Billing/Campaigns APIs, RLS isolation |
| Unit | 4 | ~50 | Services: license, billing, reseller, player |

### Sprint 1: Critical Security Tests (Complete)

**Goal**: Replace placeholder tests with real assertions

1. **multitenancy.test.js** - RLS tenant isolation
   - Verify Tenant A cannot access Tenant B data
   - Cover: screens, playlists, media tables
   - Verify reseller managed_by pattern

2. **screens.test.js** - Screen pairing flow
   - OTP generation and validation
   - Heartbeat updates and command delivery
   - Online/offline detection

3. **content-resolution.test.js** - Priority system
   - Campaign > Schedule > Playlist priority
   - Time-based campaign/schedule filtering
   - Graceful fallback behavior

### Sprint 2: Core User Flow E2E (Complete)

**Goal**: Cover critical happy paths end-to-end

4. **media.spec.js** - Media Library (10 tests)
   - Navigate to media library
   - Open Add Media modal
   - Switch between upload/web page tabs
   - Note: Actual file upload uses Cloudinary widget (external)

5. **playlists.spec.js** - Playlist CRUD (10 tests)
   - Create blank playlist with unique name
   - Open template picker
   - Delete playlist with confirmation

6. **screen-assignments.spec.js** - Screen Management (9 tests)
   - Create new screen with pairing code
   - Assign playlist to screen via dropdown
   - Verify assignment persists after refresh
   - View screen status (online/offline)

### Sprint 3: Auth & Onboarding (Planned)

**Goal**: Complete authentication coverage

7. **Sign up flow** (planned)
8. **Password reset flow** (planned)
9. **Session persistence** (planned)

### Recommended Test Targets

| Metric | Current | Target |
|--------|---------|--------|
| E2E test cases | 67 | 80+ |
| Integration tests with real assertions | 40+ | 50+ |
| Unit test coverage | Good | Maintain |
| Placeholder tests | 0 | 0 |

### Test Pyramid

```
        /\
       /  \  E2E (15%)
      /    \  - Critical paths only
     /------\
    /        \  Integration (35%)
   /          \  - API contracts, RLS
  /------------\
 /              \  Unit (50%)
/                \  - Pure logic, no I/O
```

### CI Validation

All tests run on every PR via `.github/workflows/ci.yml`:

```bash
npm test -- --run          # Unit + Integration
npm run test:e2e           # E2E with Supabase seeding
```

Tests block merge if failing. Run locally before pushing:

```bash
npm run test:all           # Full suite
npm run test:ci:local      # Simulate CI locally
```
