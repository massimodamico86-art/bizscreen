# Pitfalls Research: Onboarding Unification

**Project:** BizScreen Digital Signage Platform - Onboarding Polish Milestone
**Context:** Unifying 3 separate onboarding flows, adding screen pairing, improving template guidance
**Researched:** 2026-01-28
**Confidence:** HIGH (based on codebase analysis of existing flows)

## Summary

BizScreen currently has 3 separate onboarding mechanisms that need unification:
1. **WelcomeModal** (`WelcomeModal.jsx`) - Business type selection + starter pack flow
2. **Welcome Tour** (migration 136) - Step tracking via `onboarding_progress` table
3. **Onboarding Service** (`onboardingService.js`) - 6-step progress with checklist

Additionally, screen pairing is not integrated into onboarding (users must find `/player` manually), and template customization lacks guided discovery.

The three highest-risk pitfalls for this milestone are:

1. **Breaking working flows during unification** - Current flows work; unification may introduce regressions
2. **Device pairing timeout during onboarding** - OTP codes expire, TVs go offline, users get stuck
3. **ESLint auto-fix removing used imports** - Already caused 40+ import issues in v2.1; onboarding touches many files

---

## Critical Pitfalls

### Pitfall 1: Breaking Working Flows During Unification

**What goes wrong:** The existing 3 flows (WelcomeModal, Welcome Tour, Onboarding Service) work independently. Unification attempts to merge them but introduces regressions: modals not appearing, progress not saving, skip functionality broken.

**Why it happens:**
- WelcomeModal tracks state locally in component (`step`, `applyingPack`)
- Welcome Tour tracks in database (`completed_welcome_tour`, `current_tour_step`)
- Onboarding Service has 6 separate boolean flags (`completedWelcome`, `completedLogo`, etc.)
- These three state systems can get out of sync

**Warning signs:**
- WelcomeModal appears for users who already completed onboarding
- Progress bar shows 0% despite completed steps
- "Skip" button stops working
- Users see onboarding on every login

**Detection early:**
- Write E2E tests BEFORE modifying flows (existing `onboarding.spec.js` is minimal)
- Add Sentry/logging for onboarding state mismatches
- Test with both new users AND returning users

**Prevention strategy:**
1. **Audit state sources first:** Document exactly where each flow stores state
   - WelcomeModal: component state + `onboarding_progress.starter_pack_applied`
   - Welcome Tour: `onboarding_progress.completed_welcome_tour`, `current_tour_step`
   - Onboarding Service: `onboarding_progress.completed_*` booleans
2. **Create unified state machine:** Single source of truth for onboarding stage
3. **Feature flag the transition:** Old flow behind flag, new flow behind flag, compare behavior
4. **Backward compatibility:** `syncOnboardingProgress()` already exists - ensure it runs on unification
5. **Test the skip path explicitly:** Each flow has skip; unified flow must honor all

**Which phase should address:** First phase of onboarding work - create unified state model before changing any UI

**Confidence:** HIGH (verified from codebase: 3 distinct tracking mechanisms exist)

---

### Pitfall 2: Device Pairing Timeout During Onboarding

**What goes wrong:** User reaches "Pair Your Screen" step in onboarding. They need to:
1. Turn on TV
2. Navigate TV to `/player`
3. Read OTP code from TV
4. Enter OTP in admin panel

If any step takes too long, OTP expires (typically 5-10 minutes). User stuck in broken state.

**Why it happens:**
- OTP codes have expiration for security
- TV may take time to boot, connect to WiFi, load player app
- User may not have TV physically accessible during onboarding
- QR code pairing (`PairingScreen.jsx`) requires scanning, which requires phone

**BizScreen-specific context:**
- `get_device_config(p_otp)` RPC validates OTP (migration 0031)
- `getPlayerContentByOtp(otpCode)` in playerService.js handles pairing
- PairingScreen shows QR code + fallback "Enter pairing code manually"
- No guidance in onboarding about what to do if OTP expires

**Warning signs:**
- High drop-off rate at screen pairing step
- Support tickets: "Code didn't work"
- Users skipping pairing, never returning to complete it
- Pairing works in isolation but fails during onboarding flow pressure

**Detection early:**
- Track time-to-complete for pairing step specifically
- Log OTP expiration events correlated with onboarding sessions
- User survey: "Was pairing easy?"

**Prevention strategy:**
1. **Make pairing optional with clear comeback path:**
   - Allow completing onboarding without paired screen
   - Add prominent "Pair a Screen" card on dashboard for users who skipped
   - Send email reminder: "Complete setup by pairing your first screen"

2. **Extend OTP validity during onboarding:**
   - Consider 30-minute OTP for first pairing (vs 5-minute for subsequent)
   - OR regenerate OTP automatically if about to expire during onboarding

3. **QR code alternative always visible:**
   - `PairingScreen.jsx` shows QR code prominently
   - Ensure onboarding guides user to scan QR instead of manual OTP entry

4. **Offline-tolerant pairing guidance:**
   - If TV not available, show setup instructions to return later
   - Track "pairing deferred" separately from "pairing skipped"

5. **Test the unhappy path:**
   - E2E test: start pairing, wait for OTP expiration, verify graceful handling
   - Test: TV offline during pairing attempt

**Which phase should address:** Device pairing integration phase - when adding pairing to onboarding flow

**Confidence:** HIGH (IoT pairing timeouts are a known pattern; verified OTP exists in codebase)

---

### Pitfall 3: ESLint Auto-Fix Removing Required Imports

**What goes wrong:** Pre-commit hook runs ESLint auto-fix. Unused import detection removes imports that ARE used (via dynamic patterns, JSX, or indirect references). Build breaks, deploy fails.

**Why it happens:**
- ESLint `no-unused-vars` with auto-fix removes imports it thinks are unused
- React components imported for JSX may appear unused to static analysis
- Named exports vs default exports can confuse tooling
- Already happened in v2.1: "40+ imports restored across 8 files"

**BizScreen-specific context:**
- Recent commits show pattern: `fix: correct WelcomeModal test mock to use named export`
- `WelcomeModal` is exported as named export but tests may mock default
- Onboarding touches WelcomeModal, onboardingService, multiple page components
- MILESTONES.md: "Import issues fixed: 40+ imports restored after ESLint auto-fix"

**Warning signs:**
- Build fails after ESLint pre-commit hook runs
- "X is not defined" errors after clean ESLint pass
- Quick-fix commits with titles like "fix: add missing imports"
- Tests fail with mock errors after refactoring

**Detection early:**
- Run full build (`npm run build`) before committing, not just ESLint
- Watch for "is not defined" in CI logs
- Verify test mocks match actual export style

**Prevention strategy:**
1. **Disable auto-fix for import rules:**
   ```js
   // .eslintrc
   rules: {
     'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
     // Don't auto-fix, just warn
   }
   ```

2. **Build verification in pre-commit:**
   - Add `npm run build` to lint-staged (already partially there)
   - Or: `vite build --mode production` for full syntax check

3. **Named export consistency:**
   - Audit: WelcomeModal uses named export `export function WelcomeModal`
   - Ensure all test mocks use `vi.mock` with named exports
   - Document pattern: prefer named exports for components

4. **Import assertions in affected files:**
   ```js
   // At top of file that uses WelcomeModal
   import { WelcomeModal } from './WelcomeModal.jsx';
   // eslint-disable-next-line no-unused-vars -- Used in JSX
   ```

5. **Before large refactors:**
   - Snapshot current passing tests
   - Make changes
   - Run full test suite + build
   - Compare import statements before/after

**Which phase should address:** Every phase - this is a process pitfall, not a feature pitfall

**Confidence:** HIGH (documented in MILESTONES.md, recent commit history shows pattern)

---

## Moderate Pitfalls

### Pitfall 4: Polotno Editor Iframe Communication Failures

**What goes wrong:** User reaches template customization step. Polotno editor loads in iframe but:
- Initial design doesn't load
- Save doesn't persist
- User stuck with blank canvas

**Why it happens:**
- `PolotnoEditor.jsx` uses `postMessage` for communication with iframe
- Message handling depends on `event.data?.source === 'polotno-editor'`
- Race condition: parent sends `loadDesign` before iframe ready
- Origin mismatch can silently fail

**Warning signs:**
- Template preview shows correctly, but editor shows blank
- "Save" button does nothing
- Console shows postMessage errors
- Works locally but fails in production (different origins)

**Prevention strategy:**
1. **Wait for ready event:** Existing code waits for `ready` before sending `loadDesign` - verify this works
2. **Add loading state timeout:** If `isLoading` stays true for >10 seconds, show error + retry
3. **Verify origin handling:** Check postMessage origin validation works across environments
4. **Fallback guidance:** If editor fails, offer "Edit later in Design Studio"
5. **Test iframe sandbox:** Ensure `sandbox` attribute (if any) allows needed features

**Which phase should address:** Template customization guidance phase

**Confidence:** MEDIUM (iframe communication is fragile; code looks correct but edge cases exist)

---

### Pitfall 5: Plan-Based Feature Access During Onboarding

**What goes wrong:** Onboarding guides user to feature (e.g., "Create a Scene") but user's plan doesn't include it. User hits paywall mid-onboarding, abandons.

**Why it happens:**
- Onboarding steps are static (defined in `ONBOARDING_STEPS`)
- Plan limits are dynamic (stored in profiles/subscriptions)
- No check: "Can this user access this feature?" before showing step

**BizScreen-specific context:**
- `hasReachedLimit()` from `limitsService` checks plan limits
- WelcomeModal offers "Business Starter Pack" which may include premium templates
- Free plan may not include custom scenes (needs verification)

**Warning signs:**
- User reaches step, clicks action, sees upgrade prompt
- Onboarding completion rate differs by plan
- Support tickets: "Onboarding told me to do X but I can't"

**Prevention strategy:**
1. **Plan-aware step filtering:**
   ```js
   const availableSteps = ONBOARDING_STEPS.filter(step =>
     !step.requiredFeature || hasFeature(step.requiredFeature)
   );
   ```

2. **Graceful upgrade path:** If step requires upgrade, show inline upgrade CTA (not redirect)

3. **Free-tier happy path:** Ensure onboarding works fully on free plan
   - Free plan should: upload media, create playlist, view screens
   - Premium only: advanced templates, custom scenes, multi-language

4. **Test each plan tier through onboarding**

**Which phase should address:** Early - before changing onboarding steps

**Confidence:** MEDIUM (plan limits exist, but specific feature gates need verification)

---

### Pitfall 6: Lost Onboarding State on Session Expiration

**What goes wrong:** User is mid-onboarding, session expires (Supabase default: 1 hour inactive). User refreshes, has to restart onboarding from beginning.

**Why it happens:**
- Onboarding progress stored server-side (`onboarding_progress` table)
- But requires authenticated session to read
- Session expiration = can't load progress
- User sees "Welcome!" again instead of resuming

**Warning signs:**
- Users completing same steps multiple times
- Onboarding analytics show high restart rates
- Users frustrated: "I already did this"

**Prevention strategy:**
1. **Load progress on auth restore:**
   - `syncOnboardingProgress()` already exists
   - Ensure it runs after session refresh, not just initial login

2. **Client-side progress cache:**
   - Store last known step in localStorage
   - Use as fallback while server state loads
   - Server is source of truth; localStorage is hint

3. **Show loading state:** Don't show onboarding UI until progress is confirmed loaded

4. **Test session refresh scenario:** E2E test with session timeout simulation

**Which phase should address:** Unified state model phase

**Confidence:** MEDIUM (standard web app issue; existing code should handle but needs verification)

---

### Pitfall 7: "Done" State Not Clearly Defined

**What goes wrong:** User completes onboarding steps but:
- No celebration/completion UI
- Onboarding checklist stays visible forever
- User unsure if they're "done"

**Why it happens:**
- `isComplete` flag exists but UI for completion unclear
- Current: onboarding just... stops appearing
- No explicit "You're all set!" moment

**Warning signs:**
- Users ask support: "Am I done with setup?"
- Users skip steps to "get out of onboarding"
- Low engagement with final steps

**Prevention strategy:**
1. **Explicit completion celebration:**
   - Show confetti/success modal when all steps done
   - Clear message: "Your BizScreen is ready!"
   - Link to dashboard with first playlist playing

2. **Progress indicator always visible:** Until complete, show "3 of 6 steps done"

3. **Completion triggers next action:**
   - "Now that you're set up, try these advanced features..."
   - Transition from onboarding to feature discovery

4. **"Done" means something:** Define explicitly:
   - Minimum complete: Welcome + First Media + First Playlist
   - Full complete: All 6 steps including pairing

**Which phase should address:** UI/UX phase - when designing unified onboarding flow

**Confidence:** HIGH (explicit gap in current implementation)

---

## Minor Pitfalls

### Pitfall 8: Industry Selection Not Persisting

**What goes wrong:** User selects industry in WelcomeModal, gets starter pack. Later visits settings, industry shows "Other" or blank.

**Why it happens:**
- `setSelectedIndustry()` RPC exists
- But if starter pack creation fails, industry may not persist
- Industry stored in `onboarding_progress`, not `profiles`

**Prevention strategy:**
1. Save industry BEFORE applying starter pack
2. Add industry to settings page for visibility/editing
3. Test: select industry, pack fails, verify industry still saved

**Which phase should address:** Settings integration phase

**Confidence:** LOW (likely works; needs verification)

---

### Pitfall 9: Demo Screen Conflicts with Real Setup

**What goes wrong:** User chooses "Quick Demo" in WelcomeModal. Gets demo screen + content. Later tries to set up real screens but demo screen confuses them or hits limits.

**Why it happens:**
- Demo screen counts toward screen limit
- Demo content mixed with real content in library
- No clear "this is demo data" indicator

**Prevention strategy:**
1. Mark demo assets clearly: `[Demo] Sample Playlist`
2. Exclude demo screen from limit count (or add grace)
3. Offer "Remove demo data" action when adding first real screen
4. Test: create demo, then add real screen, verify no conflicts

**Which phase should address:** Demo cleanup phase (if included in milestone)

**Confidence:** LOW (may not be an issue if demo is single screen)

---

### Pitfall 10: Toast/Modal Z-Index Conflicts

**What goes wrong:** Onboarding modal shows. User triggers an action that shows a toast. Toast appears behind modal, user misses feedback.

**Why it happens:**
- Multiple modal/overlay systems (WelcomeModal, design system Modal, toasts)
- Z-index not coordinated globally
- Especially with iframe editor adding another layer

**Prevention strategy:**
1. Audit z-index values across all overlays
2. Establish z-index scale: toasts > modals > drawers > content
3. Test: during onboarding, trigger toast, verify visibility
4. Use design system consistently for all overlays

**Which phase should address:** UI polish phase

**Confidence:** LOW (cosmetic but frustrating)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| State Unification | Pitfall 1: Breaking flows | Feature flag, parallel testing |
| Screen Pairing | Pitfall 2: OTP timeout | Make optional, extend validity |
| Template Guidance | Pitfall 4: Iframe failures | Loading timeout, fallback |
| Any Code Changes | Pitfall 3: ESLint imports | Disable auto-fix, build check |
| Plan Integration | Pitfall 5: Feature gates | Plan-aware step filtering |
| Session Handling | Pitfall 6: Lost state | Client-side cache + sync |
| Completion UX | Pitfall 7: No "done" state | Celebration modal |

---

## Verification Checklist

Before shipping onboarding changes:

- [ ] Existing users: onboarding does NOT re-appear if already completed
- [ ] New users: onboarding DOES appear on first login
- [ ] Skip works: skipped users don't see onboarding again
- [ ] Progress persists: refresh page, progress maintained
- [ ] Screen pairing optional: can complete onboarding without paired screen
- [ ] ESLint pass + build pass (not just lint)
- [ ] All plan tiers tested through onboarding flow
- [ ] OTP expiration handled gracefully
- [ ] "Done" state clear to user

---

## Sources

- **Codebase Analysis:** `/Users/massimodamico/bizscreen/src/services/onboardingService.js`
- **Codebase Analysis:** `/Users/massimodamico/bizscreen/src/pages/dashboard/WelcomeModal.jsx`
- **Codebase Analysis:** `/Users/massimodamico/bizscreen/supabase/migrations/136_welcome_tour_onboarding.sql`
- **Codebase Analysis:** `/Users/massimodamico/bizscreen/src/player/components/PairingScreen.jsx`
- **Codebase Analysis:** `/Users/massimodamico/bizscreen/src/components/PolotnoEditor.jsx`
- **Project History:** `/Users/massimodamico/bizscreen/.planning/MILESTONES.md` (ESLint import issues documented)
- **Known Issues:** `/Users/massimodamico/bizscreen/.planning/codebase/CONCERNS.md`
- **Test Coverage:** `/Users/massimodamico/bizscreen/tests/e2e/onboarding.spec.js` (minimal)
- **Test Coverage:** `/Users/massimodamico/bizscreen/tests/unit/services/onboardingService.test.js`

**Confidence Assessment:**
- Pitfalls 1-3: HIGH (verified from codebase and project history)
- Pitfalls 4-7: MEDIUM (reasonable inference from code patterns)
- Pitfalls 8-10: LOW (possible but may not occur)
