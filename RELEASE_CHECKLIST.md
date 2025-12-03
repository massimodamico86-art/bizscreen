# Release Checklist

A practical checklist for cutting and deploying BizScreen releases.

## Before You Start

- [ ] Confirm `main` branch is green in CI (all checks passing)
- [ ] Confirm all relevant PRs are merged to `main`
- [ ] Confirm no critical bugs are open for this release
- [ ] Confirm Supabase migrations are applied to staging (if applicable)
- [ ] Pull latest `main` locally: `git checkout main && git pull origin main`

## Cutting a New Release

### 1. Update Version

- [ ] Update version in `package.json` (follow semver: MAJOR.MINOR.PATCH)
  ```bash
  # Example: npm version patch -m "v%s"
  # Or manually edit package.json
  ```

### 2. Update Changelog

- [ ] Add an entry to `CHANGELOG.md` under a new version header
- [ ] Move items from `[Unreleased]` to the new version section
- [ ] Include the release date

### 3. Commit Version Bump

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
```

### 4. Tag the Release

```bash
git tag -a vX.Y.Z -m "vX.Y.Z - short description of release"
git push origin main
git push origin vX.Y.Z
```

## Deploying to Production

### Pre-Deploy

- [ ] Confirm staging deployment works (if available)
- [ ] Confirm environment variables are set correctly:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `STRIPE_SECRET_KEY` (if using Stripe)
  - `STRIPE_WEBHOOK_SECRET` (if using Stripe)

### Deploy Steps

**Vercel (automatic):**
- [ ] Push to `main` triggers automatic deployment
- [ ] Monitor Vercel dashboard for build status

**Manual deployment (if needed):**
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### Post-Deploy Verification

- [ ] Visit `/api/health` and confirm it returns `{ "status": "ok", ... }`
- [ ] Run smoke tests against production:
  ```bash
  TEST_USER_EMAIL=<prod-test-user> TEST_USER_PASSWORD=<password> \
    npx playwright test tests/e2e/smoke.spec.js
  ```
- [ ] Manually verify key pages:
  - [ ] Login page loads
  - [ ] Dashboard loads after login
  - [ ] Media library accessible
  - [ ] Screens page accessible
  - [ ] Playlists page accessible
- [ ] Check browser console for JavaScript errors
- [ ] Verify at least one screen is receiving/displaying content

## Rollback Procedure

If issues are discovered after deployment:

### 1. Quick Rollback (Vercel)

- [ ] Go to Vercel dashboard > Deployments
- [ ] Find the previous working deployment
- [ ] Click "..." menu > "Promote to Production"

### 2. Git Rollback (if needed)

```bash
# Revert to previous tag
git checkout vX.Y.Z-previous
git push origin main --force  # Use with caution!
```

### 3. Database Considerations

- [ ] If migrations were run, assess if rollback migration is needed
- [ ] Supabase migrations are generally forward-only; plan accordingly
- [ ] If data was corrupted, restore from backup (see Supabase dashboard)

## Post-Release

- [ ] Announce release in team channel (if applicable)
- [ ] Close related GitHub issues/milestones
- [ ] Monitor error logging for 24 hours
- [ ] Update any external documentation if needed
