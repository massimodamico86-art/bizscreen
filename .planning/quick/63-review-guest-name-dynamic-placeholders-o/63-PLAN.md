---
phase: quick-63
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [".planning/quick/63-review-guest-name-dynamic-placeholders-o/BUGS.md"]
autonomous: true
requirements: [QUICK-63]

must_haves:
  truths:
    - "Guest name placeholders on welcome screen are reviewed for correctness"
    - "Edge cases (missing name, special characters) are tested"
    - "Console errors during rendering are checked"
    - "Findings are documented in BUGS.md"
  artifacts:
    - path: ".planning/quick/63-review-guest-name-dynamic-placeholders-o/BUGS.md"
      provides: "Bug report with findings from guest name / dynamic placeholder review"
  key_links: []
---

<objective>
Review how guest names and dynamic placeholders render across the app. Test the WelcomePage greeting (Hi, {userName}) and the Listings TV preview welcome greeting with {{first-name}}/{{last-name}} template placeholders. Check edge cases and console errors. Document findings in BUGS.md.

Purpose: Ensure dynamic content renders correctly without raw placeholders, crashes, or visual glitches.
Output: BUGS.md with findings appended.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Key files with dynamic name/placeholder logic:

**WelcomePage greeting (auth-based userName):**
- `src/pages/WelcomePage.jsx` — derives userName from `user.user_metadata.full_name || user.email.split('@')[0] || 'there'`
- `src/components/welcome/WelcomeHero.jsx` — renders `Hi, {userName},` with default `'there'`

**Listings TV preview ({{first-name}}/{{last-name}} template placeholders):**
- `src/components/listings/WelcomeMessageForm.jsx` — form with `{{first-name}}` and `{{last-name}}` placeholder hints
- `src/components/listings/TVPreviewModal.jsx` — passes `welcomeGreeting` and `welcomeMessage` to Layout components
- `src/layouts/Layout1.jsx`, `Layout2.jsx`, `Layout3.jsx`, `Layout4.jsx` — render `{welcomeGreeting}` directly (NO replacement logic found)
- `src/legacy/data/mockData.js` — mock data includes `welcomeGreeting: 'Welcome {{first-name}} {{last-name}}!'` and `guestList` with firstName/lastName entries

**Known context:** The `{{first-name}}`/`{{last-name}}` placeholders appear to have NO substitution logic — they render as raw `{{first-name}} {{last-name}}` on the TV layouts. This is a likely finding to confirm visually.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Test WelcomePage and Listings TV Preview dynamic content via Playwright</name>
  <files>.planning/quick/63-review-guest-name-dynamic-placeholders-o/BUGS.md</files>
  <action>
Use Playwright MCP to test dynamic name rendering:

**Part A: WelcomePage greeting**
1. Open localhost:5173 in Playwright (1280x800 viewport)
2. Navigate to the Welcome page (sidebar link or direct navigation)
3. Verify the "Hi, {userName}," greeting renders — in dev mode the user is mock-authenticated so check what name appears
4. Check console for any errors during rendering
5. Only screenshot if something looks broken (raw placeholder, crash, missing text)

**Part B: Listings TV Preview with template placeholders**
1. Navigate to the Listings page (legacy feature, may be in sidebar or at a route)
2. Open the TV Preview modal for a listing that has a welcome greeting configured
3. Check if `{{first-name}} {{last-name}}` renders as raw template syntax or is properly substituted
4. If the listings page is accessible, also check the WelcomeMessageForm to see how placeholder hints display
5. Only screenshot if broken behavior is found (raw `{{...}}` visible on TV preview counts as a finding)
6. Check console for errors

**Part C: Edge cases**
1. On the WelcomePage, check what happens if the greeting area has special characters or very long names (review code — the fallback chain handles missing names with 'there')
2. Review the WelcomeMessageForm maxLength constraints (3940 for greeting, 700 for message) for reasonableness

**Part D: Document findings**
Create BUGS.md in the task directory with:
- Summary of what was tested
- Any bugs found (with severity, component, description, expected vs actual)
- Note if {{first-name}}/{{last-name}} placeholders are NOT being substituted (this is the most likely finding based on code review — no replacement logic exists between guestList data and layout rendering)
- Note any console errors
- Close all Playwright pages when done
  </action>
  <verify>
    <automated>test -f .planning/quick/63-review-guest-name-dynamic-placeholders-o/BUGS.md && echo "BUGS.md exists"</automated>
  </verify>
  <done>
    - WelcomePage greeting tested for correct userName rendering and edge cases
    - Listings TV Preview tested for {{first-name}}/{{last-name}} placeholder handling
    - Console checked for errors on both pages
    - All findings documented in BUGS.md with severity and component details
    - Playwright pages closed
  </done>
</task>

</tasks>

<verification>
- BUGS.md exists with structured findings
- All dynamic content areas reviewed (WelcomePage + Listings TV Preview)
- Console errors checked and documented
</verification>

<success_criteria>
- Guest name rendering on WelcomePage verified working or bugs documented
- Template placeholder substitution on Listings TV layouts verified or documented as missing
- Edge cases (missing name, special chars) reviewed
- BUGS.md contains actionable findings with severity ratings
</success_criteria>

<output>
After completion, create `.planning/quick/63-review-guest-name-dynamic-placeholders-o/63-SUMMARY.md`
</output>
