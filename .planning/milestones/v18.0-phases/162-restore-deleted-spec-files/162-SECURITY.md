---
phase: 162
slug: restore-deleted-spec-files
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-11
---

# Phase 162 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| git history -> working tree | Restoring files from git history to current working directory | E2E test source files (no secrets, no user data) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-162-01 | Tampering | git checkout from history | accept | Files restored from known good local commit (75371133~1); no external input. Risk negligible. | closed |
| T-162-02 | Information Disclosure | spec files may contain test credentials | accept | Spec files reference env vars (TEST_USER_EMAIL etc.) not hardcoded secrets. Established pattern from phases 149-158. | closed |
| T-162-03 | Tampering | Overwritten spec restore | accept | Same local git history source as T-162-01. No external input. | closed |
| T-162-04 | Denial of Service | Playwright --list parse validation | accept | Parse-only mode (--list), no browser launch, completes in ~5 seconds. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-162-01 | T-162-01 | Local git restore from known commit — no external vectors | plan author | 2026-04-11 |
| AR-162-02 | T-162-02 | Test credentials use env vars, not hardcoded secrets — established project pattern | plan author | 2026-04-11 |
| AR-162-03 | T-162-03 | Same local git history source as T-162-01 | plan author | 2026-04-11 |
| AR-162-04 | T-162-04 | Parse-only Playwright validation, no browser launch or network access | plan author | 2026-04-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-11 | 4 | 4 | 0 | gsd-secure-phase orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-11
