# Phase 9: Device Experience - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make device pairing and kiosk management easier for field technicians. Unpaired players display a QR code for pairing, and a hidden 5-tap gesture reveals a PIN prompt for kiosk exit. Emergency exit works offline with locally stored PIN.

</domain>

<decisions>
## Implementation Decisions

### QR Pairing Flow
- QR code encodes direct pairing URL with device ID — scanning opens web app at pairing screen
- After scanning: show list of existing screens with "Create new" option at top
- Pairing confirmation: auto-transition — device automatically shows content once admin completes pairing (no device-side interaction needed)
- QR screen display: instructional layout with QR code + step-by-step instructions (1. Open BizScreen app, 2. Scan code, etc.)

### Hidden Exit Trigger
- Tap target area: 100x100px in bottom-right corner (medium size)
- No visual feedback during 5-tap sequence — completely invisible for security
- Tap timeout: 2 seconds between consecutive taps (resets if exceeded)
- After 5 successful taps: full-screen takeover for PIN entry interface

### PIN Entry Experience
- Keypad style: standard numeric (0-9 grid layout like ATM/phone dialer)
- PIN length: 4 digits
- Wrong PIN behavior: simple reject — show "Incorrect PIN" briefly, allow immediate retry
- Dismissal: both back button and auto-timeout (30 seconds of inactivity returns to content)

### Offline PIN Handling
- PIN set during pairing, stored immediately on device
- Tenant-level master PIN — one master PIN works on all devices in the organization

### Claude's Discretion
- PIN change sync behavior when device was offline during change
- Local PIN storage security approach (encryption vs hashing)
- Exact styling of instructional QR screen
- Master PIN management UI in admin panel

</decisions>

<specifics>
## Specific Ideas

- Field technicians are the primary users of the exit trigger — they need it to work reliably but should not be discoverable by casual observers
- QR pairing should work from a mobile phone — admin scans with phone camera, not a dedicated scanner

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-device-experience*
*Context gathered: 2026-01-23*
