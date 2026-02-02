# Quick Task 012: Add Admin and Superadmin Playwright Credentials

## One-liner
Role-based Playwright auth setup with client, admin, and superadmin projects for E2E testing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add admin/superadmin credentials to .env.local | (local only) | .env.local |
| 2 | Create role-specific auth setup functions | 838d28a | tests/e2e/auth.setup.js |
| 3 | Update playwright.config.js with role-specific projects | 78d060c | playwright.config.js |

## Changes Made

### .env.local (not committed - gitignored)
Added credentials for all three test roles:
- `TEST_CLIENT_EMAIL` / `TEST_CLIENT_PASSWORD` - Standard tenant user
- `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` - Admin with elevated permissions
- `TEST_SUPERADMIN_EMAIL` / `TEST_SUPERADMIN_PASSWORD` - Full platform access

### tests/e2e/auth.setup.js
Refactored from single auth to multi-role auth:
- Extracted login logic into reusable `authenticateRole()` function
- Three setup tests: `authenticate-client`, `authenticate-admin`, `authenticate-superadmin`
- Output files: `client.json`, `admin.json`, `superadmin.json`
- Backward compatible: `TEST_USER_*` env vars still work (map to client role)

### playwright.config.js
Added role-specific projects:
- `chromium` - client auth (default, backward compatible)
- `chromium-admin` - admin role testing
- `chromium-superadmin` - superadmin role testing

## Usage

```bash
# Default (client role)
npx playwright test

# Admin role
npx playwright test --project=chromium-admin

# Superadmin role
npx playwright test --project=chromium-superadmin
```

## Deviations from Plan

None - plan executed exactly as written.

## Note

Task 1 credentials are in `.env.local` which is gitignored (correct behavior - credentials should not be committed). Users must copy from `.env.example` or add manually.

## Duration

~3 minutes
