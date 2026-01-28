# Phase 27: Performance Optimization - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Analyze and optimize bundle size for faster page loads. This phase delivers bundle analysis baseline, route-based code splitting, and tree shaking verification. Does not include runtime performance optimizations or database query optimization.

</domain>

<decisions>
## Implementation Decisions

### Analysis Reporting
- Report lives in `.planning/` — version controlled, follows GSD documentation pattern
- Both formats: Markdown summary for quick review, HTML visualization for deep dives
- Track all metrics: total bundle size (raw + gzipped), initial load size, per-route chunk sizes
- On-demand analysis only (`npm run analyze`) — no CI integration

### Splitting Strategy
- Player route is priority — screens are latency-sensitive, optimize this first
- Other major routes (dashboard, editor) split in same pass, but player takes precedence

### Claude's Discretion
- Loading UX for lazy-loaded routes (skeleton, spinner, prefetch)
- Shared dependency handling (vendor chunk, common chunk, or hybrid)
- Polotno editor loading strategy (lazy, prefetch, or based on analysis)
- Bundle analysis tool selection (webpack-bundle-analyzer, source-map-explorer, etc.)
- Tree shaking verification method (manual inspection, automated checks)
- Documentation depth for verification results
- Remediation approach if tree shaking is poor (barrel exports, sideEffects config)
- Performance targets (set realistic goals after seeing current baseline)
- Player optimization priority (smallest possible vs fast first paint)
- "Done" criteria (when optimization is sufficient)
- Whether to document ongoing bundle review practices

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants comprehensive analysis but gives Claude flexibility on implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-performance-optimization*
*Context gathered: 2026-01-28*
