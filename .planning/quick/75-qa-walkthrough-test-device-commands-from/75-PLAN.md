---
phase: quick-75
plan: 75
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-DEVICE-COMMANDS]

must_haves:
  truths:
    - "Screens dashboard loads and shows at least one screen with the Device Commands action menu"
    - "Reload Content, Reboot Player, and Clear Cache buttons are visible in ScreenActionMenu"
    - "Player /player/view page loads and sets up Supabase realtime subscription for device commands"
    - "Sending a device command from dashboard calls sendDeviceCommand RPC (or fails gracefully without backend)"
    - "Player tab's realtime subscription channel is configured to listen on device_commands table for the correct device_id"
    - "Code review confirms end-to-end wiring: dashboard sendDeviceCommand -> device_commands table INSERT -> realtimeService subscription -> usePlayerCommands handleCommand"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for device command walkthrough"
  key_links:
    - from: "src/pages/components/ScreensComponents.jsx"
      to: "src/services/screenService.js"
      via: "onDeviceCommand -> sendDeviceCommand RPC"
      pattern: "sendDeviceCommand"
    - from: "src/services/realtimeService.js"
      to: "src/player/hooks/usePlayerCommands.js"
      via: "subscribeToDeviceCommands callback -> handleCommand"
      pattern: "subscribeToDeviceCommands.*onCommand"
---

<objective>
QA walkthrough of device commands (reload, clear cache, reboot) from the Screens dashboard to a paired player view. Open two Playwright tabs: one at /player/view (simulating paired device) and one at the Screens dashboard. From the dashboard, open the ScreenActionMenu and trigger device commands. Since there is no live Supabase backend, verify the wiring via code review: dashboard sends command via sendDeviceCommand RPC, which inserts into device_commands table, and the player subscribes to that table via Supabase realtime (subscribeToDeviceCommands). Screenshot both tabs to document the UI state. Append findings to BUGS.md.

Purpose: Validate the device command pipeline is correctly wired from dashboard UI through Supabase realtime to player command handler.
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
@src/pages/hooks/useScreensData.js
@src/services/screenService.js
@src/services/realtimeService.js
@src/player/hooks/usePlayerCommands.js
@src/player/pages/ViewPage.jsx
@src/Player.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough - Device commands UI on Screens dashboard and Player view</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_device_commands.cjs`) using `chromium.launch` against localhost:5173 to perform the device commands QA walkthrough across two tabs.

**Collect all console errors throughout (filter out known benign Supabase/fetch errors to 127.0.0.1:54321).**

**Tab 1: Player View**
1. Open a new page at `localhost:5173/player/view`
2. Wait for the page to load (it will show pairing or fallback content since no Supabase backend)
3. Screenshot the player view state as `screenshots/75-01-player-view-tab.png`
4. Check console logs for evidence of realtime subscription setup (look for "Subscribing to device commands" or channel subscription messages)

**Tab 2: Screens Dashboard**
5. Open a second page at `localhost:5173` (auto-auth via DEV_AUTH_BYPASS)
6. Navigate to Screens page via sidebar
7. Wait for screens table to load
8. Screenshot Screens page as `screenshots/75-02-screens-dashboard.png`
9. If screens exist, click the three-dot action menu (MoreVertical) on the first screen row
10. Wait for the dropdown menu to appear, verify "Device Commands" section header is visible
11. Screenshot the open action menu as `screenshots/75-03-action-menu-device-commands.png`
12. Verify the three command buttons are present: "Reload Content", "Reboot Player", "Clear Cache"
13. Click "Reload Content" button
14. Wait 1 second for the command to process (will fail gracefully without Supabase backend)
15. Screenshot result as `screenshots/75-04-after-reload-command.png`
16. Check console for the sendDeviceCommand RPC call attempt

**Code Review Verification (in the same task):**
After the Playwright walkthrough, perform a code review of the end-to-end command pipeline:

A. **Dashboard side (sender):**
   - ScreenActionMenu calls `onDeviceCommand('reload')` etc.
   - ScreensPage/useScreensData `handleDeviceCommand` calls `sendDeviceCommand(screenId, commandType)` from screenService
   - screenService.sendDeviceCommand calls `supabase.rpc('send_device_command', ...)` which inserts into `device_commands` table

B. **Player side (receiver):**
   - ViewPage.jsx sets up `subscribeToDeviceCommands(screenId, onCommand)` from realtimeService
   - realtimeService subscribes to `postgres_changes` on `device_commands` table filtered by `device_id=eq.${deviceId}`
   - On INSERT, calls `onCommand(payload.new)` which calls `handleCommand` from usePlayerCommands
   - usePlayerCommands handles: reload (re-fetch content), clear_cache (clearCache()), reboot (window.location.reload), reset (clear all + reload)

C. **Verify the command types match:** dashboard sends 'reload'/'reboot'/'clear_cache'/'reset' and player handles exactly those same strings in the switch statement.

**Findings:**
- If no screens exist to test action menu, note this as expected (no backend) and verify wiring via code review only
- If any command type mismatch is found between sender and receiver, log as a bug
- Append all findings to `.planning/BUGS.md` with header `## Quick-75: Device Commands QA Walkthrough`
  </action>
  <verify>
    <automated>node _tmp_qa_device_commands.cjs 2>&1 | tail -20</automated>
  </verify>
  <done>
- Player view tab screenshot captured showing page state
- Screens dashboard screenshot captured showing screens page
- Action menu with Device Commands section screenshotted (if screens exist)
- Code review confirms command types match between sender (screenService) and receiver (usePlayerCommands)
- Code review confirms realtime subscription wiring is correct (device_commands table, correct filter)
- Findings appended to BUGS.md with pass/fail for each verification point
  </done>
</task>

</tasks>

<verification>
- Screenshots exist in screenshots/75-*.png
- BUGS.md contains "Quick-75" section with device command walkthrough results
- Code review confirms end-to-end wiring: ScreenActionMenu -> sendDeviceCommand -> device_commands table -> subscribeToDeviceCommands -> handleCommand
</verification>

<success_criteria>
Device command pipeline fully reviewed: dashboard UI shows correct command buttons, player subscribes to correct realtime channel, command types are consistent between sender and receiver. All findings documented in BUGS.md.
</success_criteria>

<output>
After completion, create `.planning/quick/75-qa-walkthrough-test-device-commands-from/75-SUMMARY.md`
</output>
