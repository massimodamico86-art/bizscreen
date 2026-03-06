---
phase: quick-73
plan: 73
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SCREEN-OTP-PLAYER]

must_haves:
  truths:
    - "Screens page loads and shows list or empty state"
    - "Add Screen modal opens and creates a screen with a 6-character OTP code"
    - "OTP code is displayed in the modal after screen creation"
    - "Player pair page (/player) loads and accepts OTP entry"
    - "Entering valid OTP on player page attempts pairing and navigates to /player/view"
    - "Player view page loads without crashing"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Screen creation, OTP pairing, player view"
  key_links: []
---

<objective>
QA walkthrough of the Screen creation, OTP pairing, and player view flow: create a screen via the Add Screen modal, verify a 6-character OTP code is generated, open /player in a new tab and attempt pairing with that code, verify the player redirects to /player/view and renders content. Screenshot only broken behavior. Check console for errors. Append findings to BUGS.md.

Purpose: Validate the end-to-end screen-to-player pairing pipeline works correctly in dev mode.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/ScreensPage.jsx
@src/pages/components/ScreensComponents.jsx
@src/player/components/PairPage.jsx
@src/player/pages/ViewPage.jsx
@src/Player.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Screen creation, OTP pairing, and player view via Playwright</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a Playwright script (standalone node script with chromium.launch) against localhost:5173 to perform the following Screen + Player QA walkthrough:

1. **Login and navigate to Screens**
   - Go to localhost:5173, let DEV_AUTH_BYPASS auto-authenticate
   - Click "Screens" in the sidebar (look for sidebar link with text "Screens")
   - Verify the page loads with title/header containing "Screens"
   - Note whether empty state ("No screens yet") or existing screens are shown
   - Screenshot ONLY if page crashes or fails to load

2. **Create a new screen via Add Screen modal**
   - Click the "Add Screen" button (Button with Plus icon and text "Add Screen")
   - Verify the AddScreenModal opens with a name input field
   - Fill in screen name: "QA Test Screen 73"
   - Submit the form (click the create/submit button)
   - After creation, the modal should show a success state with:
     - A green checkmark and "Screen Created!" heading
     - A "Pairing Code" section with a 6-character OTP code displayed in a `<code>` element with class containing "font-mono" and "tracking-widest"
     - The OTP code format: 6 alphanumeric characters (e.g., "ABC123")
   - Extract and store the OTP code text from the modal
   - Verify the OTP code is exactly 6 characters
   - Screenshot ONLY if modal fails to open, creation errors, or OTP code is not displayed
   - NOTE: Without backend, createScreen may fail or return a mock screen. If the modal shows an error, note it as expected (backend-dependent) but still check whether the UI handles the error gracefully (no crash, error message shown)

3. **Open Player pair page in a new tab**
   - Open a new page/tab in the same browser context
   - Navigate to localhost:5173/player
   - The PairPage should load showing either:
     - (a) QR pairing screen (default mode with PairingScreen component) -- if so, look for a "Use OTP code instead" or fallback link to switch to manual OTP entry
     - (b) Manual OTP entry form with a text input for the 6-character code
   - If QR mode is shown, click the fallback link to switch to manual OTP entry mode
   - Verify the OTP input field and "Connect Screen" button are present
   - Screenshot ONLY if the player page crashes or fails to render

4. **Attempt pairing with the OTP code**
   - If an OTP code was successfully extracted in step 2, type it into the OTP input field
   - The input accepts uppercase alphanumeric, max 6 chars (the component auto-uppercases)
   - Verify the 6 character-count dots below the input turn blue as characters are entered
   - Click "Connect Screen" button
   - Wait for the pairing attempt to complete (loading state shows "Connecting...")
   - Expected outcomes:
     - SUCCESS: Navigates to /player/view -- verify the URL changed and the ViewPage renders
     - FAILURE (expected without backend): Error message appears ("Invalid pairing code" or "Failed to connect") -- verify error is shown gracefully, no crash
   - If pairing succeeds, verify /player/view loads and shows either content or a loading/offline fallback
   - Screenshot ONLY if the page crashes, hangs indefinitely, or shows no feedback at all
   - NOTE: If step 2 failed to create a screen (backend-dependent), use a fake OTP "ABC123" to test the pairing error path

5. **Player view page verification (if pairing succeeded)**
   - If navigation to /player/view occurred, verify the page renders without React errors
   - The ViewPage should show either: content playback, a loading state, or an offline/recovery fallback
   - Check that the page does not show a blank white screen (indicates crash)
   - Screenshot ONLY if blank screen or React error boundary is displayed

6. **Console errors**
   - Collect all console errors from BOTH the dashboard tab and the player tab throughout the walkthrough
   - Filter out benign errors: Supabase connection refused (127.0.0.1:54321), fetch failures for backend APIs, subscription errors, RPC errors
   - Report any genuine code errors (uncaught exceptions, React errors, import failures)

After the walkthrough, append findings to .planning/BUGS.md in this format:

```
## QT-73: Screen Creation, OTP Pairing, Player View QA Walkthrough (YYYY-MM-DD)

**Status:** PASS/FAIL -- summary

**Features tested:**
- Screens page load: PASS/FAIL
- Add Screen modal open and name input: PASS/FAIL
- Screen creation and OTP code display: PASS/FAIL (note if backend-dependent)
- Player pair page load (/player): PASS/FAIL
- OTP entry and pairing attempt: PASS/FAIL
- Player view page (/player/view): PASS/FAIL (note if backend-dependent)

**Bugs found:**
- BUG-XX: [description] (severity)
  OR
- None

**Console errors:** N total, M benign (backend not running), K genuine

**Screenshots:** [list only if bugs found]
```

Use `page.waitForTimeout(500)` between navigation actions to let the SPA render. Use `page.waitForSelector` for critical elements before interacting. Keep the browser instance shared between both tabs (same browser context).
  </action>
  <verify>
    <automated>grep -q "QT-73" .planning/BUGS.md && echo "PASS: QT-73 findings appended" || echo "FAIL: QT-73 not found in BUGS.md"</automated>
  </verify>
  <done>Screen creation and OTP pairing QA walkthrough complete. All 6 feature areas tested. Findings appended to BUGS.md with PASS/FAIL status per feature, any bugs documented with BUG-XX IDs, and console errors categorized.</done>
</task>

</tasks>

<verification>
- .planning/BUGS.md contains QT-73 section with all 6 feature areas tested
- Any bugs found have BUG-XX identifiers and severity ratings
- Screenshots exist only for broken behavior (none if everything passes)
</verification>

<success_criteria>
- Screens page loads and Add Screen modal exercised
- OTP code generation verified (or graceful failure noted if backend-dependent)
- Player pair page loads and OTP entry tested
- Player view page tested (or graceful failure noted if backend-dependent)
- Findings documented in BUGS.md with clear PASS/FAIL per feature
- Console errors categorized (benign vs genuine)
</success_criteria>

<output>
After completion, create `.planning/quick/73-qa-walkthrough-screen-creation-otp-pairi/73-SUMMARY.md`
</output>
