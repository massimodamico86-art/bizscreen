# Phase 2: XSS Prevention - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Sanitize user-generated and dynamic HTML content before rendering. Covers HelpCenterPage HTML, SVG editor LeftSidebar innerHTML mutation, and general text field injection protection.

</domain>

<decisions>
## Implementation Decisions

### Allowed formatting
- Rich text permitted: bold, italic, underline, strikethrough, headings
- Hyperlinks allowed with any URL destination
- Lists (ul, ol, li) and tables (table, tr, td) permitted
- Inline images allowed from any source

### User feedback
- Silent removal — harmful content stripped without notifying user
- No visible indication that sanitization occurred

### Logging & monitoring
- Log all sanitization events (not just suspicious ones)
- Dedicated security dashboard showing sanitization history
- Flag users with repeated sanitization events in dashboard (no push notifications)

### Rich content handling
- Inline CSS styles allowed (any style attributes)

### Claude's Discretion
- Preview behavior: whether to show sanitized result on blur vs submit
- Help article indicator: whether to show sanitization status in edit mode
- Admin diff view: whether to show what was removed during paste
- Log detail: whether to store stripped content or summary only
- Iframe allowlist: which domains to permit (YouTube, Vimeo, Maps, etc.)
- SVG editor approach: sanitize SVG content vs replace with React state
- Data attributes: preserve or strip data-* attributes

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-xss-prevention*
*Context gathered: 2026-01-22*
