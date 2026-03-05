---
phase: quick-56
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [BUGS.md]
autonomous: true
requirements: [QA-AUTH]

must_haves:
  truths:
    - "Every auth page (login, signup, reset-password, update-password, accept-invite) has been visited and screenshotted"
    - "Onboarding flow (welcome, industry selection, screen pairing, success) has been visited and screenshotted"
    - "All visual bugs, broken UI, and console errors are documented in BUGS.md"
  artifacts:
    - path: "BUGS.md"
      provides: "Updated bug report with auth/onboarding findings"
    - path: "screenshots/56-*.png"
      provides: "Screenshots of every auth and onboarding page"
  key_links: []
---

<objective>
Review all auth and onboarding flow pages using MCP Playwright browser. Screenshot each page, check for broken UI, console errors, and visual inconsistencies. Update BUGS.md with any new findings.

Purpose: Previous QA walkthroughs (tasks 49, 54) covered main app pages but auth flow coverage was limited due to dev auth bypass redirecting login/signup. This task specifically targets auth pages and the onboarding wizard.
Output: Screenshots of all auth/onboarding pages + updated BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@BUGS.md
@src/auth/LoginPage.jsx
@src/auth/SignupPage.jsx
@src/auth/ResetPasswordPage.jsx
@src/auth/UpdatePasswordPage.jsx
@src/auth/AcceptInvitePage.jsx
@src/auth/AuthLayout.jsx
@src/auth/AuthCallbackPage.jsx
@src/components/onboarding/UnifiedOnboardingController.jsx
@src/components/onboarding/IndustrySelectionModal.jsx
@src/components/onboarding/ScreenPairingStep.jsx
@src/components/onboarding/SuccessStep.jsx
@src/components/onboarding/WelcomeTour.jsx
@src/components/onboarding/StarterPackOnboarding.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Screenshot all auth pages and check for UI issues</name>
  <files>screenshots/56-*.png, BUGS.md</files>
  <action>
Use MCP Playwright browser tools to visit and screenshot every auth page. The dev server should be running at localhost:5173.

Auth pages to visit (navigate directly, bypassing any redirects):
1. `/auth/login` - Login page (empty state)
2. `/auth/login` - Fill in form fields, check validation states
3. `/auth/signup` - Signup page (empty state)
4. `/auth/signup` - Fill in form, check password strength indicator
5. `/auth/reset-password` - Reset password page
6. `/auth/update-password` - Update password page (with/without token)
7. `/auth/accept-invite` - Accept invite page (with/without token)
8. `/auth/callback` - Auth callback page (loading state)

For each page, check and document:
- Layout renders without crashes or error boundaries
- Form fields are visible, properly labeled, properly aligned
- Buttons have correct text and brand colors (orange/blue palette, NOT teal/green)
- Error states display properly (try submitting empty forms)
- Password visibility toggle works
- Links between auth pages work (e.g., "Sign up" link on login page)
- Social login buttons (Google, etc.) render correctly if present
- Mobile responsiveness at 375px width
- Console errors (beyond expected Supabase connection failures)

Save screenshots as `screenshots/56-{NN}-{description}.png` with sequential numbering.

If `/auth/login` or `/auth/signup` redirect to `/app` due to dev auth bypass, use `browser_evaluate` to check the page component source or navigate with a query param to bypass. Alternatively, read the auth route config to find how to access these pages without redirect.

Note: BUG-02 and BUG-03 already document that homepage and some auth pages redirect when authenticated. Focus on what CAN be accessed and whether the pages themselves render correctly.
  </action>
  <verify>
    <automated>ls screenshots/56-*.png | wc -l</automated>
  </verify>
  <done>At least 8 screenshots captured covering all auth page states. Each screenshot shows the page rendered (not a blank screen or redirect).</done>
</task>

<task type="auto">
  <name>Task 2: Screenshot onboarding flow and check for UI issues</name>
  <files>screenshots/56-*.png, BUGS.md</files>
  <action>
Use MCP Playwright browser tools to visit and screenshot the onboarding flow pages. Navigate using `window.__setCurrentPage()` if needed.

Onboarding pages to visit:
1. `welcome` - Welcome/onboarding landing page (already fixed in task 53, verify still good)
2. Trigger IndustrySelectionModal - check if it opens from welcome page
3. Check StarterPackOnboarding component rendering
4. Check ScreenPairingStep rendering
5. Check SuccessStep rendering
6. Check WelcomeTour rendering
7. Check OnboardingProgressBar rendering
8. Check ResumePrompt rendering

For each page/component, check:
- Layout renders without crashes
- Proper brand colors used (no teal/green, should be orange/blue)
- Text is readable, properly sized
- Buttons/CTAs are visible and properly styled
- Progress indicators work
- Skip/dismiss options are available
- Console errors (beyond expected Supabase failures)

Save screenshots continuing the sequence from Task 1 (e.g., `screenshots/56-20-welcome-page.png`, `screenshots/56-21-industry-modal.png`).

To trigger modals/components that may not be directly navigable:
- Use `browser_evaluate` to call component mount functions
- Or navigate to welcome page and interact with UI elements that trigger them
  </action>
  <verify>
    <automated>ls screenshots/56-*.png | wc -l</automated>
  </verify>
  <done>Onboarding flow screenshots captured showing welcome page, industry selection, and any accessible onboarding steps.</done>
</task>

<task type="auto">
  <name>Task 3: Update BUGS.md with findings and create summary</name>
  <files>BUGS.md, .planning/quick/56-review-auth-and-onboarding-flow-screensh/56-SUMMARY.md</files>
  <action>
Based on findings from Tasks 1 and 2:

1. Update BUGS.md:
   - Add any NEW bugs found in the auth/onboarding flow with sequential BUG-NN numbering (continue from BUG-14)
   - For each new bug: page, screenshot reference, description, severity
   - If any previously-open bugs (BUG-02 through BUG-14) can be re-verified, update their status
   - Update the summary counts at the top of the file
   - Add a new "Auth/Onboarding Review" section if new bugs are found

2. Create 56-SUMMARY.md in the plan directory:
   - List all pages visited
   - Count of screenshots taken
   - New bugs found (if any)
   - Previously-known bugs re-verified
   - Overall assessment of auth/onboarding flow quality

Format BUGS.md entries like existing ones for consistency.
  </action>
  <verify>
    <automated>head -20 BUGS.md && echo "---" && cat .planning/quick/56-review-auth-and-onboarding-flow-screensh/56-SUMMARY.md</automated>
  </verify>
  <done>BUGS.md updated with any new findings from auth/onboarding review. Summary file created documenting the walkthrough results.</done>
</task>

</tasks>

<verification>
- All auth pages visited and screenshotted (login, signup, reset-password, update-password, accept-invite, callback)
- Onboarding flow visited and screenshotted (welcome, industry selection, onboarding steps)
- BUGS.md updated with any new findings
- Summary file created
</verification>

<success_criteria>
- Screenshots exist for all auth and onboarding pages
- Any broken UI, color issues, or layout problems are documented as new BUG entries
- BUGS.md summary counts are accurate
- 56-SUMMARY.md exists with walkthrough results
</success_criteria>

<output>
After completion, create `.planning/quick/56-review-auth-and-onboarding-flow-screensh/56-SUMMARY.md`
</output>
