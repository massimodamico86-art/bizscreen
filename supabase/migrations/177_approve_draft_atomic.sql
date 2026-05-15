-- ============================================================================
-- Migration 177: approve_draft_atomic RPC (BL-02 + BL-06 + WR-09 closure)
-- Phase 177 gap-closure (Plan 177-08)
--
-- Wraps INSERT svg_templates + UPDATE template_drafts in a single Postgres
-- transaction with pg_try_advisory_xact_lock keyed on draftId, plus
-- idempotency short-circuit if status='approved' already.
--
-- Closes (from 177-VERIFICATION.md gaps[]):
--   BL-02 — non-atomic INSERT-then-UPDATE could leave svg_templates orphaned
--   BL-06 — read-then-act idempotency race / no row lock
--   WR-09 — folded in via 177-08 deterministic-S3-key change in s3.ts (sibling task)
--
-- Pattern references:
--   migration 173 — apply_starter_pack RPC (SECURITY DEFINER + JSONB params + exception raising)
--   migration 176 — DO $$ ASSERT $$ self-verification block at the end
--   migration 175 — atomic-migration + idempotent DROP-then-CREATE OR REPLACE
--
-- Idempotent. No DOWN migration. Closes 4 BLOCKER-rooted gaps in Phase 177.
-- ============================================================================

-- Idempotent: drop first so CREATE OR REPLACE always runs clean.
DROP FUNCTION IF EXISTS approve_draft_atomic(UUID, JSONB, JSONB);

-- ----------------------------------------------------------------------------
-- RPC: approve_draft_atomic
--
-- Wraps INSERT svg_templates + UPDATE template_drafts in a single transaction.
-- Row-level advisory lock serializes concurrent invocations on same draft.
-- Idempotency short-circuit returns cached metadata if draft already approved.
--
-- Parameters:
--   p_draft_id       — UUID of template_drafts row to approve
--   p_svg_template   — JSONB payload for svg_templates INSERT
--                      (name, description, category, orientation, thumbnail,
--                       svg_url, svg_content, width, height, tags, is_active,
--                       vertical, metadata)
--   p_metadata_patch — JSONB patch to merge into template_drafts.metadata
--                      (reviewed_by, reviewed_at, thumbnail_url)
--
-- Returns:
--   JSONB: { ok: true, svg_template_id: uuid, thumbnail_url: text }
--   OR raises exception: 'concurrent_approve_in_progress' | 'draft_not_found' |
--                        'draft_status_changed_during_approve'
--
-- SECURITY DEFINER note: callable via Edge Function service-role only.
-- Even if callable via PostgREST, INSERT into svg_templates is governed by
-- admin-only RLS (migration 176); UPDATE template_drafts is governed by
-- template_drafts_admin_only RLS (migration 176). Defense-in-depth.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION approve_draft_atomic(
  p_draft_id        UUID,
  p_svg_template    JSONB,
  p_metadata_patch  JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_template_id UUID;
  v_thumbnail_url        TEXT;
  v_new_template_id      UUID;
  v_draft_status         TEXT;
BEGIN
  -- Row-level advisory lock — serializes concurrent approves on same draft.
  -- pg_try_advisory_xact_lock is transaction-scoped (auto-released at commit/abort).
  -- hashtext() maps the UUID string to an int8 for the lock key space.
  IF NOT pg_try_advisory_xact_lock(hashtext(p_draft_id::text)) THEN
    RAISE EXCEPTION 'concurrent_approve_in_progress';
  END IF;

  -- Fetch current draft.status FOR UPDATE (row-level pessimistic lock).
  -- FOR UPDATE prevents concurrent transactions from modifying this row
  -- between our status read and our final UPDATE.
  SELECT status, metadata->>'svg_template_id', metadata->>'thumbnail_url'
    INTO v_draft_status, v_existing_template_id, v_thumbnail_url
    FROM template_drafts
    WHERE id = p_draft_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft_not_found';
  END IF;

  -- Idempotency: already-approved → return cached metadata.
  -- This path is race-free because it executes inside the transaction
  -- AFTER acquiring the advisory lock + row lock above.
  IF v_draft_status = 'approved' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'svg_template_id', v_existing_template_id,
      'thumbnail_url', v_thumbnail_url,
      'idempotent', true
    );
  END IF;

  -- INSERT svg_templates from the JSONB payload.
  -- tags: JSONB array → text[] using ARRAY(SELECT jsonb_array_elements_text(...))
  -- (canonical Postgres pattern, also used in Phase 173 migration's text[] handling;
  -- per checker WARNING 1 — this exact form is correct, no further patching needed).
  INSERT INTO svg_templates (
    name, description, category, orientation, thumbnail, svg_url,
    svg_content, width, height, tags, is_active, vertical, metadata
  ) VALUES (
    p_svg_template->>'name',
    p_svg_template->>'description',
    p_svg_template->>'category',
    p_svg_template->>'orientation',
    p_svg_template->>'thumbnail',
    p_svg_template->>'svg_url',
    p_svg_template->>'svg_content',
    (p_svg_template->>'width')::INT,
    (p_svg_template->>'height')::INT,
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_svg_template->'tags', '[]'::jsonb))),
    (p_svg_template->>'is_active')::BOOLEAN,
    p_svg_template->>'vertical',
    p_svg_template->'metadata'
  ) RETURNING id INTO v_new_template_id;

  -- UPDATE draft (LAST step, in same transaction as the INSERT above).
  -- Defensive WHERE status IN ('pending', 'needs_human_review') catches
  -- racing concurrent reject calls that slipped past the advisory lock
  -- (should never happen, but defense-in-depth matters here).
  UPDATE template_drafts
    SET status = 'approved',
        metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata_patch ||
                   jsonb_build_object('svg_template_id', v_new_template_id)
    WHERE id = p_draft_id
      AND status IN ('pending', 'needs_human_review');

  IF NOT FOUND THEN
    -- Should never happen because of FOR UPDATE above, but defensive.
    RAISE EXCEPTION 'draft_status_changed_during_approve';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'svg_template_id', v_new_template_id,
    'thumbnail_url', p_metadata_patch->>'thumbnail_url'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- BL-NEW-01 hotfix: explicit EXECUTE privilege boundary.
-- SECURITY DEFINER bypasses RLS — without an explicit REVOKE/GRANT, Postgres
-- defaults grant EXECUTE to PUBLIC, and Supabase's `anon`/`authenticated`
-- roles inherit it. Any signed-in user could then call this RPC via PostgREST
-- and bypass the EF admin gate. Restrict EXECUTE to service_role only.
-- (Pattern: matches migrations 041 / 102 / 173 explicit-grant convention.)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION approve_draft_atomic(UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION approve_draft_atomic(UUID, JSONB, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION approve_draft_atomic(UUID, JSONB, JSONB) FROM authenticated;
GRANT  EXECUTE ON FUNCTION approve_draft_atomic(UUID, JSONB, JSONB) TO service_role;

-- ----------------------------------------------------------------------------
-- Self-verifying DO $$ ASSERT $$ block (Phase 176 pattern).
-- Runs as part of the migration apply — if any assertion fails, the entire
-- migration aborts and the tool returns the ASSERT failure message.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_func_exists INTEGER;
  v_can_exec    BOOLEAN;
BEGIN
  -- Assert function exists with the right name + arg count.
  SELECT COUNT(*) INTO v_func_exists
    FROM pg_proc
    WHERE proname = 'approve_draft_atomic'
      AND pronargs = 3;
  ASSERT v_func_exists = 1,
    format('177-08: expected approve_draft_atomic with 3 params, got count=%s', v_func_exists);

  -- Assert function is SECURITY DEFINER (privilege boundary).
  SELECT COUNT(*) INTO v_func_exists
    FROM pg_proc
    WHERE proname = 'approve_draft_atomic'
      AND prosecdef = TRUE;
  ASSERT v_func_exists = 1,
    '177-08: approve_draft_atomic must be SECURITY DEFINER';

  -- BL-NEW-01: anon must NOT have EXECUTE.
  SELECT has_function_privilege('anon', oid, 'EXECUTE') INTO v_can_exec
    FROM pg_proc WHERE proname = 'approve_draft_atomic';
  ASSERT v_can_exec = FALSE,
    'BL-NEW-01: anon must NOT have EXECUTE on approve_draft_atomic';

  -- BL-NEW-01: authenticated must NOT have EXECUTE.
  SELECT has_function_privilege('authenticated', oid, 'EXECUTE') INTO v_can_exec
    FROM pg_proc WHERE proname = 'approve_draft_atomic';
  ASSERT v_can_exec = FALSE,
    'BL-NEW-01: authenticated must NOT have EXECUTE on approve_draft_atomic';

  -- BL-NEW-01: service_role MUST have EXECUTE (so EF can still call it).
  SELECT has_function_privilege('service_role', oid, 'EXECUTE') INTO v_can_exec
    FROM pg_proc WHERE proname = 'approve_draft_atomic';
  ASSERT v_can_exec = TRUE,
    'BL-NEW-01: service_role MUST have EXECUTE on approve_draft_atomic';
END $$;
