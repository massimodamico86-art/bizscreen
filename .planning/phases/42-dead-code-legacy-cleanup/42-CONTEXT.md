# Phase 42: Dead Code & Legacy Cleanup - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead files (AutoBuildOnboardingModal, OnboardingWizard, WelcomeModal), obsolete localStorage keys from legacy onboarding, and fix migration 105's reference to a non-existent tenants table. Codebase should contain zero dead files or obsolete references from previous milestones.

</domain>

<decisions>
## Implementation Decisions

### Cleanup depth
- Proactive scan of onboarding-related directories for any dead code, not just the three named components
- Clean up all references to dead components in other files (imports, conditional renders, dead code paths)
- Follow dead chains: if code is only reachable through dead paths, it's eligible for removal

### Claude's Discretion
- Whether to remove orphaned supporting files (tests, stories, styles, types) that only served dead components — use judgment on what's truly orphaned vs still referenced
- Migration 105 fix strategy (edit, no-op, or delete) — choose what's safest for migration history
- Which specific localStorage keys qualify as "legacy onboarding" — identify by tracing usage
- Borderline dead code (ambiguous references) — remove obvious dead chains, leave anything ambiguous with a documenting comment
- Removal verification approach and reporting

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

*Phase: 42-dead-code-legacy-cleanup*
*Context gathered: 2026-02-09*
