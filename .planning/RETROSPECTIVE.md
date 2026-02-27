# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v7.0 — UI Verification

**Shipped:** 2026-02-27
**Phases:** 11 | **Plans:** 28 | **Commits:** 83

### What Was Built
- Systematic audit of every page in the application — 57 requirements verified across 17 feature areas
- Fixed 15+ import/collision/prop bugs across settings, admin, and legacy pages
- Resolved 4 cross-phase navigation integration breaks (toast, layout nav, campaign routing, screen groups)
- 11 evidence-based VERIFICATION.md reports documenting requirement satisfaction
- Dev auth bypass (VITE_DEV_BYPASS_AUTH) for MCP Playwright automation
- Fixed 11 crashed pages via quick task (missing imports, Badge/Button collisions, Modal props)

### What Worked
- **AI-driven code audit approach**: Reading source code to identify import errors, prop mismatches, and variant collisions was faster and more thorough than manual browser testing for catching integration bugs
- **Quick task executor for small plans**: Skipping research/context agents for 1-3 task audit plans reduced execution from minutes to seconds — most v7.0 plans were <5 tasks
- **Milestone audit before completion**: Running `/gsd:audit-milestone` identified the 4 cross-phase integration breaks that would have been missed by per-phase verification alone
- **Pattern-based fixes**: Once the Badge collision pattern was identified (Phase 85), it was applied systematically to all affected pages
- **Gap closure phase (91)**: Audit→fix approach was more efficient than re-executing original phases

### What Was Inefficient
- **SUMMARY files lacked structure**: Most v7.0 SUMMARY files used the "Dependency graph" format from quick executor, missing one_liner and tasks_completed fields — made milestone stats extraction manual
- **Audit ran before all phases complete**: The audit at 21:00Z flagged Phases 89/90 as gaps, but they were completed shortly after. A second audit would have shown clean results
- **ROADMAP.md progress table not updated**: Phase 84, 87, 89, 90 showed incorrect completion status in the progress table because quick task execution didn't update it
- **Stale audit blocking completion**: Had to reason through the stale audit rather than re-run it — the workflow should handle "audit is stale" as a distinct state

### Patterns Established
- **Badge collision fix**: When importing from both lucide-react and design-system, remove Badge from lucide-react to avoid shadowing
- **Modal prop convention**: Design-system Modal uses `open` (not `isOpen`)
- **Button variant mapping**: No `outline` variant — use `secondary` instead
- **onNavigate prop pattern**: Embedded editors (campaign, layout) use parent-controlled navigation via props, not useNavigate
- **navigateAdapter**: Lightweight bridge pattern for hooks that expect navigate() but receive onNavigate prop

### Key Lessons
1. **Cross-phase integration breaks are invisible to per-phase verification** — milestone-level audit is essential before shipping
2. **Quick executor + small plans = high velocity** — the v7.0 "audit and fix" pattern of 1-3 tasks per plan kept context minimal and execution fast
3. **Design-system component API mismatches are the #1 bug category** — Button variants, Modal props, Badge collisions accounted for majority of fixes
4. **Code audit catches bugs browser testing misses** — import errors that crash on render are found instantly by reading imports

### Cost Observations
- Model mix: ~80% sonnet (quick executor), ~15% opus (audit, planning, completion), ~5% haiku (research)
- Sessions: ~8 sessions over 5 days
- Notable: Quick executor handled 20+ of 28 plans, keeping cost low for a verification milestone

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v7.0 | 83 | 11 | Quick executor for audit plans, milestone audit before ship |

### Cumulative Quality

| Milestone | Requirements | Satisfaction | Verifications |
|-----------|-------------|-------------|---------------|
| v7.0 | 57 | 100% | 11/11 passed |

### Top Lessons (Verified Across Milestones)

1. Audit at milestone scope catches integration breaks invisible at phase scope
2. Design-system API mismatches are the most common UI bug category
3. Pattern-based fixes scale well — identify once, apply everywhere
