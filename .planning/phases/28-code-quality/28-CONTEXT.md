# Phase 28: Code Quality - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce code standards and improve documentation across the codebase. ESLint runs on pre-commit with zero errors, components have PropTypes and JSDoc annotations, README reflects current architecture, and complex business logic has inline comments explaining intent. No new features — this is about maintainability.

</domain>

<decisions>
## Implementation Decisions

### ESLint Enforcement
- Fix all existing violations before enabling pre-commit enforcement (clean slate)
- Use eslint:recommended + react plugin as baseline — catches bugs without style opinions
- console.log is an error — must use loggingService for production logging
- TODO/FIXME/HACK comments flagged as warnings via ESLint

### Type Annotations
- PropTypes required for ALL components, not just core
- Shape-level PropTypes: `PropTypes.shape({ id: string, name: string })` — full object structure
- JSDoc required for all exported functions with @param and @returns
- Missing PropTypes/JSDoc blocks commits via react/prop-types and jsdoc/require-jsdoc rules

### Documentation Scope
- README covers setup + architecture — developer onboarding focus
- /docs folder for complex features with dedicated markdown files
- Mermaid diagrams for architecture visualization (renders in GitHub)

### Comment Strategy
- Comments explain the "why" (intent, business context), not the "what"
- No commented-out code — git has history, delete all dead code

### Claude's Discretion
- Auto-fix on save behavior in development
- Which features warrant dedicated /docs files
- What's "complex enough" to need inline comments

</decisions>

<specifics>
## Specific Ideas

- Strict enforcement philosophy: if it's worth having a rule, enforce it
- loggingService is the only acceptable logging mechanism in production code
- Shape-level PropTypes provide IDE autocomplete and catch prop mismatches early

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-code-quality*
*Context gathered: 2026-01-28*
