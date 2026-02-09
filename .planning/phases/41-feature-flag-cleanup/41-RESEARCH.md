# Phase 41: Feature Flag Cleanup - Research

**Researched:** 2026-02-09
**Domain:** Feature flag removal, dead code cleanup, React/Vite application
**Confidence:** HIGH

## Summary

Phase 41 completes the feature flag cleanup cycle started in Phase 34. Phase 34 already deleted the three legacy components (OnboardingWizard.jsx, OnboardingBanner.jsx, WelcomeModal.jsx) and removed 16 legacy state variables from DashboardPage. However, the `VITE_USE_UNIFIED_ONBOARDING` feature flag itself still exists and is actively used as a conditional gate in 4 source file locations. The unified onboarding is now the only path (legacy components are deleted), so the flag guards are dead conditionals that always evaluate to true (in .env.local) or serve no purpose.

This phase needs to: (1) remove the `config().useUnifiedOnboarding` conditional checks from DashboardPage.jsx and App.jsx, making the unified onboarding unconditional, (2) remove the VITE_USE_UNIFIED_ONBOARDING env var from env.js schema and config export, (3) remove it from .env.local and .env.example if present, (4) verify no obsolete localStorage keys remain, and (5) update the e2e helpers comment that still references "OnboardingWizard". The scope is small and well-defined -- 4 source files with a total of ~10 lines to change, plus env file cleanup.

**Primary recommendation:** Remove all `config().useUnifiedOnboarding` conditional checks (make unified onboarding unconditional), remove the env var from schema/config/env files, update the stale comment in e2e helpers, and verify E2E tests pass.

## Current State Analysis

### What Phase 34 Already Completed (VERIFIED)
Phase 34 verification report (2026-01-31) confirms:
- OnboardingWizard.jsx DELETED (538 lines)
- OnboardingBanner.jsx DELETED (99 lines)
- WelcomeModal.jsx DELETED (358 lines)
- localStorage key `bizscreen_welcome_modal_shown` REMOVED
- sessionStorage key `onboarding_banner_dismissed` REMOVED
- 16 legacy state variables removed from DashboardPage
- All E2E tests pass, build succeeds

### What Remains for Phase 41

#### FLAG-01: OnboardingWizard component deleted
**Status: ALREADY DONE** (Phase 34, commit f11ea8b)
- File `src/components/OnboardingWizard.jsx` does not exist
- Zero grep matches for "OnboardingWizard" in `src/`
- Confidence: HIGH (file confirmed absent via Glob search)

#### FLAG-02: WelcomeModal legacy code removed
**Status: ALREADY DONE** (Phase 34, commit f11ea8b)
- File `src/pages/dashboard/WelcomeModal.jsx` does not exist
- Zero grep matches for "WelcomeModal" in `src/`
- Confidence: HIGH (file confirmed absent via Glob search)

#### FLAG-03: Obsolete localStorage keys removed
**Status: MOSTLY DONE** -- Phase 34 removed `bizscreen_welcome_modal_shown` and `onboarding_banner_dismissed`
- No remaining legacy onboarding localStorage keys found in grep search
- `bizscreen_pairing_reminder_dismissed` exists but is ACTIVE (used by ScreenPairingReminderCard) -- NOT obsolete
- Confidence: HIGH (comprehensive grep of localStorage usage in src/)

#### FLAG-04: VITE_USE_UNIFIED_ONBOARDING flag removed
**Status: NOT DONE** -- This is the primary work of Phase 41

### Exact Locations Requiring Changes

#### Source Files (4 files, ~10 lines to change)

**1. `src/config/env.js`** (lines 112-116, 214)
- Schema entry: `VITE_USE_UNIFIED_ONBOARDING` in `envSchema.optional` (lines 112-116)
- Config export: `useUnifiedOnboarding: import.meta.env.VITE_USE_UNIFIED_ONBOARDING === 'true'` (line 214)
- Action: Remove both entries entirely

**2. `src/pages/DashboardPage.jsx`** (lines 137-149, 195, 216)
- Line 139: `if (config().useUnifiedOnboarding && !loading) {` -- remove the flag check, keep `!loading`
- Line 195: `{config().useUnifiedOnboarding && showUnifiedOnboarding && (` -- remove flag check, keep `showUnifiedOnboarding`
- Line 216: `{config().useUnifiedOnboarding && (` -- remove flag check, render unconditionally
- Line 57: `import { config } from '../config/env';` -- MAY become unused after removing flag checks (verify)
- Action: Remove all `config().useUnifiedOnboarding &&` gates

**3. `src/App.jsx`** (line 207)
- Line 207: `if (config().useUnifiedOnboarding) return;` -- inside `checkAutoBuildOnboarding` effect
- This line SKIPS the AutoBuildOnboardingModal when unified onboarding is enabled
- After flag removal, this becomes an unconditional early return (always skip AutoBuildOnboardingModal)
- Decision needed: Should AutoBuildOnboardingModal be kept or removed entirely? See analysis below.
- Action: Make early return unconditional OR remove AutoBuildOnboardingModal entirely

**4. `src/hooks/useUnifiedOnboarding.js`** -- NO changes needed
- This hook is used by UnifiedOnboardingController and has no feature flag references
- It remains part of the active unified onboarding system

#### Environment Files

**5. `.env.local`** (line 9)
- `VITE_USE_UNIFIED_ONBOARDING=true` -- Remove this line

**6. `.env.example`**
- No reference to VITE_USE_UNIFIED_ONBOARDING found -- no change needed

**7. `.env`**
- No reference to VITE_USE_UNIFIED_ONBOARDING found -- no change needed

#### Test Files

**8. `tests/e2e/helpers.js`** (line 85)
- Comment: `This handles the Welcome Modal, OnboardingWizard, and any other dialogs.`
- Action: Update comment to remove references to deleted components

**9. `tests/unit/pages/DashboardPage.test.jsx`**
- Mocks `getUnifiedOnboardingState` (line 46) and `UnifiedOnboardingController` (line 71)
- These are for the ACTIVE unified onboarding -- NOT obsolete, keep them
- May need minor updates if DashboardPage rendering changes after flag removal

#### CI/CD Files
- No references to VITE_USE_UNIFIED_ONBOARDING found in `.github/workflows/`
- No references in `vercel.json`
- NOTE: If VITE_USE_UNIFIED_ONBOARDING is set in Vercel dashboard environment variables, it should be removed there too (manual step, cannot be verified from codebase)

### Planning Files (documentation only, not blocking)
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` reference the flag
- These should be updated to reflect completion, but are not functional blockers

## Architecture Patterns

### Pattern 1: Feature Flag Removal (Conditional-to-Unconditional)
**What:** Replace `if (featureFlag) { doThing() }` with `doThing()` directly
**When:** Feature flag has been validated and legacy path no longer exists
**Example:**
```jsx
// BEFORE (DashboardPage.jsx line 195)
{config().useUnifiedOnboarding && showUnifiedOnboarding && (
  <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
)}

// AFTER
{showUnifiedOnboarding && (
  <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
)}
```

### Pattern 2: Dead Code Behind Always-True Guard
**What:** Code that only runs when the flag is FALSE, but the flag is always TRUE and the legacy path is deleted
**Where:** `src/App.jsx` line 204-226 (`checkAutoBuildOnboarding` effect)
**Analysis:**
```jsx
// This effect checks for AutoBuildOnboarding but immediately returns when unified is enabled
useEffect(() => {
  const checkAutoBuildOnboarding = async () => {
    if (config().useUnifiedOnboarding) return;  // Always returns here
    // ... rest of function never executes
  };
  checkAutoBuildOnboarding();
}, [...]);
```
**Decision:** After flag removal, the entire `checkAutoBuildOnboarding` effect becomes dead code. The `showAutoBuildModal` state variable and `AutoBuildOnboardingModal` component can be removed from App.jsx as well. This is safe because:
1. The unified onboarding replaces AutoBuildOnboardingModal's purpose
2. The guard was explicitly added to prevent both from showing simultaneously
3. Without the flag, AutoBuild would ALWAYS be skipped anyway

### Pattern 3: Env Var Cleanup
**What:** Remove schema entry, config property, and env file references simultaneously
**Verification:** After removal, `grep -r "VITE_USE_UNIFIED_ONBOARDING" .` should return 0 matches in source files

### Anti-Patterns to Avoid
- **Partial cleanup:** Removing the env var but leaving `config().useUnifiedOnboarding` references causes runtime errors
- **Removing active onboarding code:** The `useUnifiedOnboarding` hook and `UnifiedOnboardingController` are ACTIVE code -- do not remove them
- **Forgetting Vercel:** If the flag is set in Vercel dashboard, leaving it there is harmless but messy

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature flag removal | Custom migration script | Manual find-and-replace across 4 files | Only 4 files, ~10 lines; automation overkill |
| Env var cleanup | Dynamic env loading | Remove from schema + env files | Static Vite env vars are compile-time, simple deletion |

**Key insight:** This is a small, surgical cleanup task -- not a complex refactor. The scope is intentionally minimal to reduce risk.

## Common Pitfalls

### Pitfall 1: Removing useUnifiedOnboarding Hook (False Positive)
**What goes wrong:** Confusing the feature FLAG (`VITE_USE_UNIFIED_ONBOARDING`) with the onboarding HOOK (`useUnifiedOnboarding`). Deleting the hook breaks the active onboarding flow.
**Why it happens:** Similar names -- "unified onboarding" appears in both the flag and the active system
**How to avoid:** Only remove references to `config().useUnifiedOnboarding` and `VITE_USE_UNIFIED_ONBOARDING`. The hook `useUnifiedOnboarding` and component `UnifiedOnboardingController` are ACTIVE.
**Warning signs:** If you're deleting files in `src/hooks/` or `src/components/onboarding/`, you've gone too far.

### Pitfall 2: Leaving `config()` Import as Unused
**What goes wrong:** After removing all `config().useUnifiedOnboarding` checks from DashboardPage.jsx, the `import { config } from '../config/env'` may become unused, causing lint warnings/errors.
**How to avoid:** Check if `config` is used elsewhere in the file after removing flag checks. In DashboardPage.jsx, `config` is imported on line 57 and used ONLY for the feature flag checks on lines 139, 195, 216. After cleanup, the import should be removed.
**Warning signs:** ESLint "unused import" warnings after changes.

### Pitfall 3: Not Handling AutoBuildOnboardingModal
**What goes wrong:** Simply removing `if (config().useUnifiedOnboarding) return;` from the App.jsx effect would ENABLE AutoBuildOnboardingModal for all users, creating a conflicting onboarding experience alongside the unified flow.
**Why it happens:** The guard was protecting against dual onboarding -- removing it without addressing the modal creates a regression.
**How to avoid:** Either (a) make the early return unconditional (i.e., `return;` at the start of the effect) and optionally remove the dead code, or (b) remove the entire `checkAutoBuildOnboarding` effect plus `AutoBuildOnboardingModal` component and related state.
**Warning signs:** Two different onboarding modals appearing for new users.

### Pitfall 4: Forgetting External Configuration
**What goes wrong:** Flag removed from code but still set in Vercel dashboard environment variables.
**Why it happens:** Vercel env vars are managed through the dashboard UI, not in code.
**How to avoid:** Add a manual verification step to check/remove VITE_USE_UNIFIED_ONBOARDING from Vercel environment settings.
**Warning signs:** `import.meta.env.VITE_USE_UNIFIED_ONBOARDING` would still be available at build time even though the config doesn't use it.

### Pitfall 5: Breaking DashboardPage Unit Tests
**What goes wrong:** Tests mock `config()` or rely on the feature flag conditional behavior. After removing conditionals, test assertions may break.
**Why it happens:** Tests were written for the flag-gated version of the component.
**How to avoid:** Review DashboardPage.test.jsx after changes. Current test mocks `UnifiedOnboardingController` to return null, which is fine. The test does NOT mock `config()`, so removing the flag check should not break existing tests. However, since the `ScreenPairingReminderCard` will now render unconditionally (previously gated by the flag on line 216), the mock for it (line 67) remains important.

## Code Examples

### Example 1: DashboardPage.jsx Cleanup

```jsx
// BEFORE: Feature flag check in useEffect (lines 137-149)
useEffect(() => {
  if (config().useUnifiedOnboarding && !loading) {
    import('../services/onboardingService').then(({ getUnifiedOnboardingState }) => {
      getUnifiedOnboardingState().then(state => {
        if (!state.isComplete && !state.skippedAt) {
          setShowUnifiedOnboarding(true);
        }
      });
    });
  }
}, [loading]);

// AFTER: Remove flag check, keep loading guard
useEffect(() => {
  if (!loading) {
    import('../services/onboardingService').then(({ getUnifiedOnboardingState }) => {
      getUnifiedOnboardingState().then(state => {
        if (!state.isComplete && !state.skippedAt) {
          setShowUnifiedOnboarding(true);
        }
      });
    });
  }
}, [loading]);
```

### Example 2: DashboardPage.jsx JSX Cleanup

```jsx
// BEFORE (lines 194-197)
{config().useUnifiedOnboarding && showUnifiedOnboarding && (
  <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
)}

// AFTER
{showUnifiedOnboarding && (
  <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
)}

// BEFORE (lines 215-217)
{config().useUnifiedOnboarding && (
  <ScreenPairingReminderCard onNavigate={setCurrentPage} />
)}

// AFTER
<ScreenPairingReminderCard onNavigate={setCurrentPage} />
```

### Example 3: App.jsx AutoBuild Cleanup

```jsx
// BEFORE (lines 203-226): Effect with dead code path
useEffect(() => {
  const checkAutoBuildOnboarding = async () => {
    if (config().useUnifiedOnboarding) return;
    if (!authUserProfile?.id) return;
    // ... rest never executes
  };
  checkAutoBuildOnboarding();
}, [authUserProfile?.id, authUserProfile?.role, authUserProfile?.has_completed_onboarding]);

// AFTER: Remove entire effect + showAutoBuildModal state + AutoBuildOnboardingModal JSX
// (The entire AutoBuild flow is dead code since unified onboarding replaced it)
```

### Example 4: env.js Cleanup

```javascript
// BEFORE: Remove from envSchema.optional (lines 112-116)
VITE_USE_UNIFIED_ONBOARDING: {
  description: 'Enable unified onboarding controller (Phase 31)',
  default: 'false',
  sensitive: false
},

// BEFORE: Remove from getConfig() return (line 214)
useUnifiedOnboarding: import.meta.env.VITE_USE_UNIFIED_ONBOARDING === 'true',

// AFTER: Both entries removed entirely
```

## Scope Summary

### Files to Modify (6 files)
| File | Changes | Lines Changed (est.) |
|------|---------|---------------------|
| `src/config/env.js` | Remove schema entry + config property | -6 |
| `src/pages/DashboardPage.jsx` | Remove 3 flag checks + config import | -4 |
| `src/App.jsx` | Remove dead AutoBuild effect + state + modal | -25 |
| `.env.local` | Remove VITE_USE_UNIFIED_ONBOARDING=true | -1 |
| `tests/e2e/helpers.js` | Update stale comment | ~1 |
| `tests/unit/pages/DashboardPage.test.jsx` | Minor updates if needed | ~2 |

### Files NOT to Modify
| File | Why Keep |
|------|----------|
| `src/hooks/useUnifiedOnboarding.js` | Active hook for unified onboarding |
| `src/components/onboarding/UnifiedOnboardingController.jsx` | Active controller component |
| `src/services/onboardingService.js` | Active service with unified onboarding functions |
| `src/components/dashboard/ScreenPairingReminderCard.jsx` | Active component, self-determines visibility |
| `src/components/onboarding/AutoBuildOnboardingModal.jsx` | File exists but can stay -- it is only imported in App.jsx which we clean up |

### Optional Deeper Cleanup (App.jsx AutoBuild)
The `AutoBuildOnboardingModal` in App.jsx is entirely dead code since unified onboarding replaced it. Full cleanup would remove:
- `showAutoBuildModal` state (line 158)
- `setShowAutoBuildModal` state setter
- `checkAutoBuildOnboarding` useEffect (lines 203-226)
- `AutoBuildOnboardingModal` import (line 40)
- `AutoBuildOnboardingModal` JSX (lines 1107-1116)
- Pass `showAutoBuildModal` and `setShowAutoBuildModal` to `ClientUILayout` (lines 715-716)

This is a moderate-size cleanup but entirely safe since the code path was already unreachable.

## Open Questions

1. **AutoBuildOnboardingModal: Remove component file or just de-wire?**
   - What we know: The component at `src/components/onboarding/AutoBuildOnboardingModal.jsx` is only imported by App.jsx. If we remove the import/usage from App.jsx, the file becomes dead (unused).
   - What's unclear: Whether to delete the file entirely or just de-wire it from App.jsx.
   - Recommendation: Remove usage from App.jsx (de-wire). Optionally delete the file as bonus cleanup. The file deletion is low-risk since it has no other imports.

2. **Vercel environment variable cleanup**
   - What we know: VITE_USE_UNIFIED_ONBOARDING may be set in Vercel dashboard. It is NOT in CI/CD workflow files.
   - What's unclear: Whether it is actually set in Vercel dashboard (cannot verify from codebase).
   - Recommendation: Add a manual verification step to check and remove from Vercel dashboard if present. Not blocking for code changes.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct file reads of all affected source files
- `src/config/env.js` -- Full schema and config verified
- `src/pages/DashboardPage.jsx` -- All 3 flag check locations verified
- `src/App.jsx` -- AutoBuild guard on line 207 verified
- `.env.local` -- Flag value confirmed (line 9: `VITE_USE_UNIFIED_ONBOARDING=true`)
- Phase 34 verification report: `.planning/phases/34-cleanup-and-deprecation/34-VERIFICATION.md`
- Comprehensive grep searches for all flag-related patterns across codebase

### Secondary (MEDIUM confidence)
- E2E helpers comment analysis (line 85) -- stale reference confirmed
- CI/CD workflow review -- no flag references found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, pure code removal
- Architecture: HIGH -- exact file/line locations verified through codebase analysis
- Pitfalls: HIGH -- all edge cases identified from actual code patterns

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable -- this is cleanup of existing code)
