---
phase: quick-61
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/e2e/welcome-tv-rendering.spec.js
  - screenshots/61-welcome-tv-*.png
autonomous: true
requirements: [QUICK-61]
must_haves:
  truths:
    - "Welcome page renders correctly at 1920x1080 TV resolution"
    - "No console errors on Welcome page load"
    - "All welcome components (hero, feature cards) are visible and properly laid out"
    - "No visual overflow, clipping, or layout bugs at TV resolution"
  artifacts:
    - path: "tests/e2e/welcome-tv-rendering.spec.js"
      provides: "E2E test for Welcome page at 1920x1080"
    - path: "screenshots/61-welcome-tv-*.png"
      provides: "Visual evidence of rendering at TV resolution"
  key_links:
    - from: "tests/e2e/welcome-tv-rendering.spec.js"
      to: "src/pages/WelcomePage.jsx"
      via: "Playwright navigation to /welcome"
      pattern: "page.goto.*welcome"
---

<objective>
Review the Welcome screen rendering at 1920x1080 (TV/device resolution), capture screenshots, and check for visual bugs and console errors.

Purpose: Ensure the Welcome/onboarding page looks correct when displayed on a TV-sized screen, which is the primary use case for digital signage software.
Output: E2E test file with TV-resolution checks, screenshots documenting the rendering.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/WelcomePage.jsx
@src/components/welcome/WelcomeHero.jsx
@src/components/welcome/WelcomeFeatureCards.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create E2E test for Welcome page at 1920x1080 TV resolution</name>
  <files>tests/e2e/welcome-tv-rendering.spec.js</files>
  <action>
    Create a Playwright E2E spec that:
    1. Configures viewport to 1920x1080 (Full HD TV resolution)
    2. Navigates to the Welcome page (route: click Welcome in sidebar or navigate directly)
    3. Collects all console errors during page load into an array via page.on('console')
    4. Waits for the page to fully render (wait for WelcomeHero and WelcomeFeatureCards to be visible)
    5. Takes a full-page screenshot saved to screenshots/61-welcome-tv-01-fullpage.png
    6. Takes a viewport-only screenshot saved to screenshots/61-welcome-tv-02-viewport.png
    7. Asserts: no console errors of level 'error' were logged
    8. Asserts: WelcomeHero section is visible (look for "Hi," greeting text)
    9. Asserts: All 3 feature cards are visible (playlists, templates, tutorial)
    10. Asserts: No horizontal scrollbar (document.documentElement.scrollWidth <= window.innerWidth)
    11. Asserts: The "Add Media" button area and "Screen Preview" area in the hero are both visible
    12. Takes individual screenshots of the hero section (61-welcome-tv-03-hero.png) and feature cards section (61-welcome-tv-04-cards.png)

    Use the existing test patterns from the project: import from fixtures, use dev auth bypass pattern if available. The app runs at http://localhost:5173. Use test.describe('Welcome Page TV Rendering', ...) structure.

    Handle the case where the app may need login by checking for DEV_AUTH_BYPASS or navigating through login first, matching patterns from other spec files in tests/e2e/.
  </action>
  <verify>
    <automated>npx playwright test tests/e2e/welcome-tv-rendering.spec.js --reporter=list 2>&1 | tail -20</automated>
  </verify>
  <done>Test passes at 1920x1080: no console errors, all welcome components visible, no horizontal overflow, screenshots captured to screenshots/61-welcome-tv-*.png</done>
</task>

<task type="auto">
  <name>Task 2: Analyze screenshots and document findings</name>
  <files>screenshots/61-welcome-tv-*.png</files>
  <action>
    After the test runs, review the captured screenshots visually (read the image files) to check for:
    1. Text readability at TV resolution - are fonts large enough?
    2. Card layout - do the 3 feature cards fill the width well or look too small/sparse?
    3. Hero section - does the 2-column grid look proportional at 1920px wide?
    4. Color consistency - any off-brand colors visible?
    5. Spacing - is there excessive whitespace or cramped elements?
    6. Any visual artifacts, misalignment, or clipping issues

    If any visual bugs are found, document them clearly. If fixes are needed, apply them directly to the relevant component files (WelcomePage.jsx, WelcomeHero.jsx, WelcomeFeatureCards.jsx). Common TV-resolution issues include: text too small, cards too narrow, excessive margins eating usable space.

    Note: The template card preview uses teal-400/teal-600 gradient which was flagged as off-brand in BUG-05 (quick-51). If this was missed in the previous fix, update to use brand orange palette.
  </action>
  <verify>
    <automated>ls -la screenshots/61-welcome-tv-*.png | wc -l</automated>
  </verify>
  <done>All screenshots reviewed, any visual bugs documented or fixed, at least 4 screenshot files exist confirming the review was thorough</done>
</task>

</tasks>

<verification>
- E2E test passes with no failures at 1920x1080 viewport
- No console errors on Welcome page
- Screenshots captured showing full page and individual sections
- No horizontal overflow at TV resolution
</verification>

<success_criteria>
- Welcome page renders cleanly at 1920x1080 with no visual bugs or console errors
- Screenshots document the rendering for future reference
- Any bugs found are either fixed or documented for follow-up
</success_criteria>

<output>
After completion, create `.planning/quick/61-review-welcome-screen-device-tv-renderin/61-SUMMARY.md`
</output>
