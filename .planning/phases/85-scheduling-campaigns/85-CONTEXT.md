# Phase 85: Scheduling & Campaigns - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify schedule creation with time/day rules, conflict detection, dayparting, weekly preview, and full campaign lifecycle (create, edit, delete, rotation, priority, seasonal dates, analytics). All components exist — this phase ensures they work end-to-end without errors.

Key pages: SchedulesPage, ScheduleEditorPage, CampaignsPage, CampaignEditorPage.
Key sub-components: ConflictWarning, WeekPreview, DaypartPicker, FillerContentPicker, AssignScreensModal, PriorityBadge, CampaignPicker, DateDurationPicker, RotationControls, SeasonalDatePicker, TemplatePickerModal, FrequencyLimitControls, CampaignAnalyticsCard.

</domain>

<decisions>
## Implementation Decisions

### Schedule Editor Verification
- Claude's discretion on calendar verification depth (render-only vs full event CRUD round-trip)
- Claude's discretion on conflict detection testing (logic verification vs render check)
- Claude's discretion on sub-component testing approach (independent vs in-context)
- Claude's discretion on SchedulesPage list CRUD coverage
- **Known concern:** ScheduleEditorPage is ~1175 lines with many inline component references (X, Button, Card, Badge, etc.) that may have import issues — prioritize making the page render without crashes
- **Known concern:** ScheduleEditorPage uses hash-based navigation (onNavigate) while CampaignsPage uses React Router — Claude decides whether to standardize

### Campaign Lifecycle
- Claude's discretion on which flows to verify (core CRUD, template creation, approval workflow, preview links)
- Claude's discretion on template picker (TemplatePickerModal) verification depth
- Claude's discretion on analytics card verification (render vs functional date range filter)
- **Known concern:** CampaignEditorPage imports Badge from lucide-react (icon) instead of design system Badge — import audit needed
- **Known concern:** Several components used but potentially not imported: TargetPickerModal, ContentPickerModal, FrequencyLimitControls, RotationControls, SeasonalDatePicker, ApprovalRequestModal, PreviewLinksModal, Modal/ModalHeader/ModalContent/ModalFooter

### Fix Approach
- Claude's discretion on fix philosophy: minimal patches for render bugs, deeper fixes for broken features
- Claude's discretion on refactoring: avoid restructuring unless needed to fix bugs
- Claude's discretion on navigation pattern: make each work as-is unless migration is trivial
- Claude's discretion on test method: code review, Playwright browser testing, or both per feature

### Edge Features
- Claude's discretion on FillerContentPicker verification (important for signage — screens shouldn't go blank)
- Claude's discretion on DaypartPicker and WeekPreview verification level
- Claude's discretion on AssignScreensModal and campaign Targets verification
- Claude's discretion on enterprise features (approval workflow, preview links) — not in success criteria

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion. The user trusts Claude to:
- Fix all import/render errors first so pages load, then test functional flows
- Follow existing component patterns and design system conventions
- Make choices consistent with digital signage industry norms
- Ensure all 5 success criteria pass (schedule CRUD, conflict detection, dayparting/week preview, campaign lifecycle, campaign analytics)
- Prioritize making existing components work correctly over redesigning them
- Use judgment on verification depth: render-first approach for complex pages, functional testing for success criteria items

</decisions>

<specifics>
## Specific Ideas

- No specific requirements — user has not tested these pages yet. All bugs will be discovered during verification.
- Import audit is likely the highest-value first step — multiple components may have missing or incorrect imports.
- ScheduleEditorPage and CampaignEditorPage are the two most complex pages in this phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 85-scheduling-campaigns*
*Context gathered: 2026-02-24*
