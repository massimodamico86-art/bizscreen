# Phase 4: Logging Migration - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace 197+ console.log calls with structured logging for production observability. Implement correlation IDs, log levels, and PII redaction. This phase focuses on the logging infrastructure — log analysis dashboards and alerting are separate concerns.

</domain>

<decisions>
## Implementation Decisions

### Log Format & Structure
- **Claude's Discretion**: Format choice (JSON vs human-readable), field selection, verbosity levels
- Log destination uncertain — design should support both console output and future aggregation services
- Log levels should follow standard hierarchy (implementation details at Claude's discretion)

### PII Redaction Approach
- **Claude's Discretion**: What constitutes PII, detection method (automatic vs explicit), redaction format
- Should follow security best practices and GDPR considerations
- Development vs production PII handling at Claude's discretion

### Correlation Strategy
- **Claude's Discretion**: Correlation scope (request vs session), ID format, client propagation
- Whether correlation IDs appear in user-facing error messages at Claude's discretion
- Should enable linking related log entries for debugging

### Environment Behavior
- **Claude's Discretion**: Dev vs prod differences, default log levels, runtime configurability
- Player component logging configuration at Claude's discretion
- Should balance developer experience with production observability

### Claude's Discretion
User has delegated all implementation decisions to Claude for this phase. Key areas where Claude has full flexibility:
- Logger library choice (pino, winston, custom, etc.)
- JSON vs text output format
- Which fields to include in each log entry
- PII detection and redaction implementation
- Correlation ID generation and propagation
- Log level defaults and configurability
- Development mode behavior
- Player-specific logging considerations

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches and best practices for JavaScript/React applications.

User noted they're "not sure yet" about log aggregation services, so the implementation should work standalone but be ready for future integration with services like Datadog or Splunk.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-logging-migration*
*Context gathered: 2026-01-22*
