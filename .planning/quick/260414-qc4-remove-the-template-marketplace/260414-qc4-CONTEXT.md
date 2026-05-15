---
name: 260414-qc4 Context
description: Locked decisions for removing the Template Marketplace feature
type: quick-task-context
---

# Quick Task 260414-qc4: remove the template marketplace - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Task Boundary

Remove the "Template Marketplace" feature from BizScreen. The app currently exposes two separate nav items — "Templates" (SVG graphics gallery at `/app/templates`) and "Template Marketplace" (installable scene templates at `/app/template-marketplace`). Users find the dual UX confusing. We are eliminating the Marketplace experience; the SVG Templates gallery stays untouched.

</domain>

<decisions>
## Implementation Decisions

### Scope: frontend vs backend
- **Frontend only.** Remove the page, nav entry, route, and all frontend UI/service code that exists solely to support the marketplace.
- **Backend stays intact.** Do NOT drop `get_marketplace_templates` RPC, `can_access_template` function, or any related tables/migrations. This preserves data and keeps reverting cheap if the decision changes.

### URL handling
- Replace the `/app/template-marketplace` route with a redirect to `/app/templates` (e.g. `<Navigate to="/app/templates" replace />`).
- Rationale: old bookmarks and any in-app links land somewhere sensible without adding a 404.

### Related code — delete what's unused by the rest of the app
- Delete files used ONLY by the marketplace: `TemplateMarketplacePage.jsx`, `InstallTemplateModal` (and any marketplace-only sub-components), `marketplaceService.js`, marketplace-specific hooks/types/constants.
- Delete marketplace telemetry hooks in frontend code only (backend `template_marketplace_events` table is out of scope per the frontend-only decision).
- **Preserve any shared utilities.** Before deleting a file, verify no other page/component imports it. If shared, leave it.
- Remove dead imports, dead i18n strings, and dead tests tied to marketplace-only code.

### Claude's Discretion
- Exact file list is discovered at planning time — the executor should grep for imports of each candidate file before deletion.
- If a marketplace file imports a shared utility that becomes unreferenced after the rip, remove that too (only if provably unused).
- Update any documentation that mentions the marketplace (README, CLAUDE.md sections, onboarding copy) to match the new reality, but don't invent new docs.

</decisions>

<specifics>
## Specific Ideas

From the prior investigation in this session, confirmed entry points:
- Route registration: `src/App.jsx` lines ~477-478 (both `/app/templates` and `/app/template-marketplace` are declared here)
- Page component: `src/pages/TemplateMarketplacePage.jsx`
- Service: `src/services/marketplaceService.js` (contains `get_marketplace_templates` RPC wrapper, `can_access_template` checks, license tier constants at lines 21-31)
- Nav sidebar: the "Template Marketplace" item visible in the sidebar screenshot — find the nav config/array that lists it and remove that entry

The SVG Templates gallery (`SvgTemplateGalleryPage.jsx` at `/app/templates`) is NOT affected.

</specifics>

<canonical_refs>
## Canonical References

No external specs. Decisions captured above are authoritative for this task.

</canonical_refs>
