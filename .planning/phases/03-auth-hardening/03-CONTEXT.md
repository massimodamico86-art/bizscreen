# Phase 3: Auth Hardening - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Authentication hardening through password policies and rate limiting. Users cannot set weak passwords, and high-frequency API endpoints are protected from abuse. Rate limiting applies per-user and per-IP.

**Out of scope:** OAuth/social login, MFA, session management changes.

</domain>

<decisions>
## Implementation Decisions

### Password complexity rules
- Maximum length: 128 characters
- Minimum length: 8 characters (from roadmap)
- Complexity: uppercase + lowercase + number (from roadmap)

### Rate limit thresholds
- Time window: 15 minutes fixed window (not sliding)

### Claude's Discretion
The following decisions are delegated to Claude based on security best practices:

**Password complexity:**
- Whether to require special characters
- Whether to block common passwords (top 1000 blacklist)
- Error message format (combined message vs checklist)

**Rate limiting:**
- Which specific endpoints to rate limit
- Request limits per endpoint category
- Whether authenticated users get higher limits

**Rate limit responses:**
- Whether to include Retry-After header
- Response body content (generic vs specific)
- Gradual slowdown vs hard cutoff
- Whether to reveal which dimension (IP/user) triggered limit

**Lockout behavior:**
- Whether to implement account lockout after failed attempts
- Unlock mechanism (time-based, email, or admin)
- Warning before hitting limits
- CAPTCHA as alternative to lockout

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard security approaches. The focus is on meeting the roadmap success criteria:
1. User cannot set password shorter than 8 characters
2. User cannot set password without complexity (uppercase, lowercase, number)
3. High-frequency API endpoints return 429 after exceeding rate limit
4. Rate limiting applies per-user and per-IP dimensions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-auth-hardening*
*Context gathered: 2026-01-22*
