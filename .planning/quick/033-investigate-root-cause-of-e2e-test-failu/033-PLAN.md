---
type: quick
task: 033
description: Investigate root cause of E2E test failures (Supabase 406 errors)
---

<objective>
Diagnose WHY Supabase 406 (Not Acceptable) errors occur on subscriptions queries during E2E tests.

Purpose: Identify the root cause so a fix can be planned and executed
Output: Diagnostic report with specific technical findings and recommended fixes
</objective>

<context>
@.planning/STATE.md
@.planning/quick/031-run-all-tests-unit-and-e2e/031-SUMMARY.md

Failing query pattern (from test output):
```
/rest/v1/subscriptions?select=plan_id%2Cplans%28slug%29&owner_id=eq.aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&status=in.%28active%2Ctrialing%29&order=created_at.desc&limit=1
```

Error: `406 Not Acceptable`

Services affected:
- src/services/feedbackService.js (line 67): `.select('plan_id, plans(slug)')`
- src/services/featureFlagService.js (line 102): `.select('plan_id, plans(slug)')`
- src/services/clientService.js (line 126): `.select('owner_id, plan_slug, ...')`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Research HTTP 406 in Supabase/PostgREST context</name>
  <files>None (research only)</files>
  <action>
    Research what HTTP 406 (Not Acceptable) means specifically in Supabase/PostgREST:

    1. HTTP 406 semantics: "The server cannot produce a response matching the list of acceptable values"
    2. PostgREST causes of 406:
       - Invalid Accept header (unlikely - Supabase client handles this)
       - **Embedded resource not found** (foreign key join target doesn't exist)
       - Schema cache out of sync
       - Missing relationship definition

    3. Analyze the failing query:
       - `plans(slug)` is an **embedded resource** (PostgREST syntax for foreign key join)
       - This requires `subscriptions.plan_id` -> `plans.id` foreign key relationship
       - 406 means PostgREST cannot find this relationship

    4. Document findings about PostgREST embedded resources and 406 errors
  </action>
  <verify>Document understanding of 406 error cause in Supabase context</verify>
  <done>Clear explanation of what 406 means and how PostgREST embedded resources work</done>
</task>

<task type="auto">
  <name>Task 2: Examine schema and diagnose specific cause</name>
  <files>
    supabase/migrations/017_plans_and_subscriptions.sql
    src/services/feedbackService.js
    src/services/featureFlagService.js
    src/services/clientService.js
  </files>
  <action>
    Analyze the schema and code to identify the mismatch:

    1. Schema analysis:
       - `subscriptions.plan_id` is defined as `UUID REFERENCES public.plans(id)`
       - This foreign key should enable `plans(slug)` embedded resource syntax
       - The `plans` table exists and has `slug` column

    2. Possible causes:
       a. **Test database doesn't have plans seeded** - Migration 017 seeds plans, but test DB may not run it
       b. **Schema cache out of date** - PostgREST caches schema relationships
       c. **Foreign key constraint missing in test DB** - Constraint may not have been created
       d. **Different schema in test vs production** - Test may use different migration state

    3. Check test seed data:
       - Look at how E2E tests set up the database
       - Check if plans table has data
       - Check if test users have subscriptions with valid plan_id

    4. Check clientService.js line 126-133:
       - It queries `plan_slug` directly from subscriptions table
       - But `subscriptions` table has `plan_id` (UUID), not `plan_slug` (TEXT)
       - This is a **column mismatch** - may be expecting a different schema
  </action>
  <verify>Read schema files and service files to identify mismatch</verify>
  <done>Specific root cause identified with evidence from code and schema</done>
</task>

<task type="auto">
  <name>Task 3: Write diagnostic report with findings and recommendations</name>
  <files>.planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-DIAGNOSTIC-REPORT.md</files>
  <action>
    Create a diagnostic report with:

    1. **Root Cause Summary** (1 paragraph)
    2. **Technical Details**:
       - What 406 means in PostgREST context
       - Which queries are failing and why
       - Schema vs code analysis
    3. **Evidence**:
       - Failing query URL (decoded)
       - Schema definition from migrations
       - Code snippets showing the mismatch
    4. **Recommended Fixes** (prioritized):
       - Fix 1: Ensure test database has plans seeded
       - Fix 2: Check schema cache / PostgREST reload
       - Fix 3: Fix clientService.js plan_slug column mismatch (if confirmed)
    5. **Impact Assessment**:
       - How many tests affected
       - Which features blocked
       - Priority recommendation
  </action>
  <verify>Report exists at .planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-DIAGNOSTIC-REPORT.md</verify>
  <done>Complete diagnostic report with root cause, evidence, and actionable fix recommendations</done>
</task>

</tasks>

<success_criteria>
- HTTP 406 error cause explained in Supabase/PostgREST context
- Specific root cause identified with code/schema evidence
- Diagnostic report written with actionable fix recommendations
- Clear next steps for resolving the ~450 E2E test failures
</success_criteria>

<output>
After completion:
- Create `.planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-DIAGNOSTIC-REPORT.md`
- Update `.planning/quick/033-investigate-root-cause-of-e2e-test-failu/033-SUMMARY.md`
- Update `.planning/STATE.md` with findings
</output>
