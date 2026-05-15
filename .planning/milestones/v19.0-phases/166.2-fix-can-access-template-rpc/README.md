# Phase 166.2: Fix `can_access_template` RPC (plan_tier column reference)

**Status:** Inserted 2026-04-12 from Phase 166.1 UAT blockers discovered during `/gsd-execute-phase 166.1` UI smoke test.

## Why this phase exists

Phase 166.1 shipped:
- A sidebar nav entry for Template Marketplace ([src/App.jsx:477](../../../src/App.jsx#L477))
- A seed migration populating `template_library` with 9 dev rows ([supabase/migrations/109_seed_template_library_dev.sql](../../../supabase/migrations/109_seed_template_library_dev.sql))

Both deliverables are code-complete and SQL-verified (9 rows seeded, 8 with SVG, 1 no-SVG fallback, all 8 categories covered).

However, the UI smoke test in Plan 166.1-02 Task 2 Step 4 surfaced a **pre-existing infrastructure bug** that blocks Phase 166's remaining UAT checkpoints:

### The bug

The Postgres function `can_access_template(p_template_id uuid)` defined in
[supabase/migrations/080_template_marketplace.sql](../../../supabase/migrations/080_template_marketplace.sql)
contains:

```sql
SELECT plan_tier, role INTO v_user_plan, v_user_role
FROM profiles
WHERE id = v_user_id;
```

The `profiles` table has **no `plan_tier` column**. No migration has ever added one
(`git grep -l plan_tier -- supabase/migrations/` returns only the 080 definition site).
As a result, every call raises `42703: column "plan_tier" does not exist`.

### Observed impact

`get_marketplace_templates()` calls `can_access_template(tl.id)` for every row.
The function error propagates up as HTTP 400 from PostgREST, so the Template
Marketplace page renders **"0 templates found"** despite 9 valid seeded rows.

Console evidence captured during Phase 166.1 smoke test:
```
Failed to load resource: 400 Bad Request @ /rest/v1/rpc/get_marketplace_templates
Failed to load templates: {code: 42703, message: 'column "plan_tier" does not exist'}
```

This predates Phase 166, Phase 166.1, and the seed migration — but it is the
final blocker for Phase 166 UAT (color preview, logo upload, Apply & Create,
no-SVG fallback checkpoints), which is why it is tracked here rather than
silently patched inside an unrelated phase.

## Success Criteria (from ROADMAP)

1. `can_access_template(uuid)` no longer references the non-existent
   `profiles.plan_tier` column; it compiles and executes without error for
   any authenticated user.
2. Calling `get_marketplace_templates()` from an authenticated client user
   returns the 9 seeded free-license rows (not an empty set and not a 400 error).
3. Template Marketplace page renders the seeded template cards, and Phase 166's
   four UAT checkpoints are manually executable.

## Implementation hint

Expected as a single small plan: new migration (e.g. `110_fix_can_access_template.sql`)
that `CREATE OR REPLACE FUNCTION can_access_template(...)` removing the `plan_tier`
reference. Two plausible fixes — the discuss/plan phases should pick one:

- **(A)** Remove plan-tier gating for `'pro'` templates entirely (simplest,
  acceptable if `plan_tier` was intentionally removed from the schema).
- **(B)** Re-read the plan gating from `subscriptions.plan_id` + `plans` tables
  (more faithful to original intent if plan-based license gating is still wanted).

Discuss phase should decide whether plan-tier gating is still a product
requirement before coding.

## Next step

Run `/gsd-discuss-phase 166.2` to gather context, then `/gsd-plan-phase 166.2`.
