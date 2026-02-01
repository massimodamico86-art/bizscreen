# Phase 35: Polotno Editor Verification - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the template customization path for onboarding users. Verify Polotno iframe communication works reliably, add proper loading/error states, and ensure save operations complete successfully. This phase is about reliability and UX polish for the existing editor integration — not adding new editor features.

</domain>

<decisions>
## Implementation Decisions

### Loading experience
- Editor opens in modal overlay (not full-page navigation)
- 10 second timeout before showing error state
- On timeout: show Retry button first, with fallback path mentioned below
- Mobile users see "Desktop recommended" message before proceeding

### Error recovery
- Fallback path shows both options: Design Studio link (primary) and Contact Support (secondary)
- Design Studio link guides users to full design tools area as alternative
- Support option provides escalation path for persistent issues

### Save workflow
- Unsaved changes trigger confirm dialog: Save / Discard / Cancel
- After successful save, ask user: "Keep editing or view your template?"
- User controls post-save navigation rather than auto-close

### Claude's Discretion
- Loading visual (skeleton vs spinner)
- Progress indicator (indeterminate vs fake progress)
- Template info visible during load
- Backdrop click dismiss behavior
- Cancel load handling
- Preload on hover optimization
- Caching for returning users
- Mobile override behavior (soft block vs warning)
- Multi-tab editing detection
- Session expiry handling
- Window size warnings
- Keyboard focus management
- Accessibility announcements
- Offline detection vs timeout fallback
- Analytics/performance tracking
- Error message tone
- Retry behavior (auto vs manual)
- Error logging/observability
- Save success feedback style
- Save failure recovery options
- Preview before edit flow
- Template card actions
- Scroll position preservation
- URL routing strategy

</decisions>

<specifics>
## Specific Ideas

- Modal overlay approach keeps context — user returns to where they were
- 10 seconds gives slow connections a reasonable chance without frustrating wait
- Confirm dialog prevents accidental data loss
- Post-save choice respects user intent (some want to keep editing, some are done)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-polotno-editor-verification*
*Context gathered: 2026-01-31*
