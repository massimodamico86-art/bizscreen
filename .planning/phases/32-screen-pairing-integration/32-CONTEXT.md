# Phase 32: Screen Pairing Integration - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to pair their first screen during the unified onboarding flow. The ScreenPairingStep placeholder from Phase 31 gets replaced with a real pairing UI showing OTP and QR code options, with live detection when a device connects.

</domain>

<decisions>
## Implementation Decisions

### OTP Code Display
- Size: Prominent (large) - clear focal point but balanced with other content
- Copy feature: None - user types the code manually on the TV (can't paste on TV anyway)

### QR Code Presentation
- Prominence: Primary - QR code is larger/more prominent than OTP
- OTP serves as fallback for devices without camera capability
- Help link: Not needed - keep UI clean

### Pairing Confirmation
- Celebration: Yes - confetti or similar animation on successful pairing
- This is a milestone moment (first screen paired) - deserves celebration

### Claude's Discretion
- OTP formatting (grouped digits vs solid)
- OTP expiry timer visibility
- QR code destination URL and encoding
- Instructions shown with QR code
- How to indicate device connected (immediate transition vs success screen)
- Device details shown after pairing
- Polling frequency for connection detection
- Skip behavior and dashboard reminder card

</decisions>

<specifics>
## Specific Ideas

- QR code as primary method reflects that most users will have a TV with a camera (modern smart TVs, Fire Stick, etc.)
- Confetti celebration mirrors the "big moment" feel - user's first screen is live!
- No copy button because the OTP is typed on the TV, not pasted

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-screen-pairing-integration*
*Context gathered: 2026-01-31*
