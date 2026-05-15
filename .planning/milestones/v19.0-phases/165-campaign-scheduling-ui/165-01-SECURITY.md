# Phase 165 — campaign-scheduling-ui — Security Verification

**ASVS Level:** 1
**Audit Date:** 2026-04-13
**Scope:** SCHED-01 dayparting preset chips, SCHED-02 campaign analytics section

## Summary

| Threat ID | Category | Disposition | Status |
|-----------|----------|-------------|--------|
| T-165-01 | Information Disclosure | accept | CLOSED (with note) |
| T-165-02 | Tampering | accept | CLOSED |
| T-165-03 | Spoofing | accept | CLOSED |

**Closed:** 3/3 | **Open:** 0/3

## Accepted Risks Log

### T-165-01 — Information Disclosure (getCampaignStats RPC)
**Accepted.** The client wrapper in `src/services/campaignService.js:519-543` resolves `tenantId` from the authenticated session's `profiles` row (`managed_tenant_id || user.id`) before invoking the RPC. The UI consumer in `src/pages/CampaignEditorPage.jsx:150` filters client-side to the specific campaign being edited and does not expose raw RPC output to other users.

**Verification evidence:**
- Client scoping: `src/services/campaignService.js:524-530` (tenantId derived from `profiles.managed_tenant_id || user.id` for the authenticated `user.id`).
- RPC contract: `supabase/migrations/026_screen_groups_and_campaigns.sql:930-967` — `get_campaign_playback_stats(p_tenant_id, p_start_date, p_end_date)` filters `WHERE c.tenant_id = p_tenant_id` (line 961).

**Residual-risk note (pre-existing, NOT introduced by phase 165):** The RPC `get_campaign_playback_stats` is `SECURITY DEFINER` (line 945) and trusts the client-supplied `p_tenant_id` parameter. It does NOT cross-check that `p_tenant_id` matches the caller's tenant via `auth.uid()`. A malicious authenticated user invoking the RPC directly via Supabase JS with an arbitrary tenant UUID could enumerate aggregate playback stats for other tenants. This hardening gap predates phase 165 (it is part of migration 026) and is out of scope for this phase's verification, but is flagged here so it can be tracked in a future server-side hardening phase.

**Accepted because:** The client code in phase 165 never passes an attacker-controlled tenant; and the threat register entry is scoped to "getCampaignStats wrapper usage in this UI" not to the underlying RPC design.

### T-165-02 — Tampering (Dayparting preset times)
**Accepted.** Preset times are hardcoded client-side constants; all time-window validation happens server-side on save.

**Verification evidence:**
- Hardcoded presets: `src/pages/CampaignEditorPage.jsx:77-82` — `DAYPART_PRESETS` is a module-scope `const` array of 4 literal objects; no fetch, no user-configurability.
- Preset-selection handler only writes to local form state: `src/pages/CampaignEditorPage.jsx:211-223` (updates `campaign.start_at` / `campaign.end_at` via `handleChange`).
- Server-side validation of start/end on save: `supabase/migrations/026_screen_groups_and_campaigns.sql:134-136` — `CONSTRAINT campaigns_valid_dates CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at)` enforced by the database on all INSERT/UPDATE to `campaigns`.
- Column types are `TIMESTAMPTZ` (line 126-127) so any malformed or non-temporal payload is rejected by PostgreSQL type coercion.

### T-165-03 — Spoofing (Campaign analytics section)
**Accepted.** Analytics section is conditionally rendered on `!isNew` and reuses existing session auth; no new auth surface.

**Verification evidence:**
- Conditional rendering: `src/pages/CampaignEditorPage.jsx:827` — `{!isNew && (<Card>…Campaign Analytics…)}` wraps the entire analytics block.
- `isNew` derivation: `src/pages/CampaignEditorPage.jsx:90` — `const isNew = campaignId === 'new';` derived from the route param, not from user-controlled form state.
- Stats load effect is gated on `!isNew && campaignId` at line 146: `if (isNew || !campaignId) return;`
- No new RPC: reuses pre-existing `getCampaignStats` from `campaignService.js:519` (same wrapper used elsewhere in the app); no new auth path.

## Unregistered Flags

None. SUMMARY.md `## Threat Flags` section (line 85-87) explicitly states: "No new network endpoints, auth paths, or schema changes introduced." This maps cleanly to T-165-01 and introduces no new surface.

## Follow-up (non-blocking, out of phase scope)

- Server-side hardening of `public.get_campaign_playback_stats` to reject `p_tenant_id` that does not match the caller's authenticated tenant. Suggested: resolve tenant from `auth.uid()` inside the function body rather than trusting the parameter. Track in a future security-hardening phase against migration 026.

## Security Audit 2026-04-13

| Metric | Count |
|--------|-------|
| Threats found | 3 |
| Closed | 3 |
| Open | 0 |
