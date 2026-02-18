# Phase 57: QR Code Enhancement - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

QR code widget with multiple types (URL, WiFi, plain text), brand logo overlay with error correction, visual color customization, and QRCodeSVG import bug fix. Rendering must work reliably on deployed players.

</domain>

<decisions>
## Implementation Decisions

### QR type configuration
- Live QR preview in BOTH sidebar properties panel AND canvas (real-time as user types)
- Soft validation for URL type: accept any input but show yellow hint if it doesn't look like a valid URL
- Claude's discretion on type picker style (dropdown vs segmented) and default QR type

### Brand logo overlay
- Logo source: default to tenant brand logo, allow override with custom upload
- Error correction automatically set to H when logo is enabled (per success criteria)
- Claude's discretion on: logo shape (circle vs rounded square), logo size (fixed vs adjustable), behavior when tenant has no logo configured

### WiFi QR details
- Encryption types: WPA/WPA2 and Open only (no WEP)
- Claude's discretion on: password field visibility toggle, hidden SSID option, human-readable summary display

### Visual styling
- Custom foreground color via color picker (QR dot color)
- Custom background color via color picker
- Claude's discretion on: low-contrast warning, QR dot style options (classic vs rounded vs dots)

### Claude's Discretion
- Type picker UI pattern (match existing editor sidebar conventions)
- Default QR type when widget first added
- Logo overlay shape, size behavior, and no-logo fallback UX
- WiFi form details: password toggle, hidden SSID, config summary
- Contrast/scannability warnings
- QR module style options (if library supports it easily)

</decisions>

<specifics>
## Specific Ideas

- Both sidebar and canvas should show live QR preview updating as user types
- URL validation should be "soft" — yellow hint, not blocking
- WiFi encryption kept simple: just WPA/WPA2 and Open (no legacy WEP)
- Foreground AND background colors both customizable — full brand control

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 57-qr-code-enhancement*
*Context gathered: 2026-02-17*
