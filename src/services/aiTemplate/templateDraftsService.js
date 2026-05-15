/**
 * templateDraftsService — Phase 177 frontend service for AI template drafts.
 *
 * - fetchPendingDrafts:   wired Wave 1 (this plan), used by Wave 4 Pending tab
 * - generateDraft:        wired Wave 1 (this plan), used by Wave 4 Generate tab
 * - approveDraft:         wired Wave 1 (this plan), Edge Function approve handler ships in Wave 2 Plan 03
 * - rejectDraft:          wired Wave 1 (this plan), Edge Function reject handler ships in Wave 2 Plan 03
 * - saveDraftSvgContent:  wired Wave 1 (this plan), used by Wave 4 inline edit modal
 *
 * Mirrors src/services/marketplaceService.js error-throwing pattern.
 */

import { supabase } from '../../supabase';

/**
 * D-03 — list drafts where status IN ('pending', 'needs_human_review'), ordered DESC.
 * Direct Supabase SELECT (RLS already gates non-admin per Phase 176 template_drafts_admin_only).
 */
export async function fetchPendingDrafts() {
  const { data, error } = await supabase
    .from('template_drafts')
    .select('id, svg_content, prompt, source, status, vertical, metadata, created_at')
    .in('status', ['pending', 'needs_human_review'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Invoke the generate-svg-template Edge Function with action=generate.
 * Returns { draftId, status, warnings, attempt_count }.
 *
 * Phase 178 (Plan 06): signature extended with `orientation` (D-10).
 * Allowed values: 'landscape' (1920×1080) | 'portrait' (1080×1920).
 * Default decided client-side (GenerateTabForm sets 'landscape' as default
 * to preserve Phase 177 implicit behavior).
 */
export async function generateDraft({ vertical, template_type, orientation, prompt }) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'generate', vertical, template_type, orientation, prompt },
  });
  if (error) throw error;
  return data;
}

/**
 * Invoke the generate-svg-template Edge Function with action=approve.
 * Edge-side handler ships in Wave 2 (Plan 03). Returns { ok: true, thumbnail_url }.
 */
export async function approveDraft(draftId) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'approve', draftId },
  });
  if (error) throw error;
  return data;
}

/**
 * Invoke the generate-svg-template Edge Function with action=reject.
 * Edge-side handler ships in Wave 2 (Plan 03). Returns { ok: true, draftId }.
 */
export async function rejectDraft(draftId, reason) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'reject', draftId, reason },
  });
  if (error) throw error;
  return data;
}

/**
 * Invoke the generate-svg-template Edge Function with action=save_edit.
 *
 * BL-01 closure (Phase 177 gap-closure 177-10): the EF runs validateSvg()
 * server-side BEFORE UPDATEing template_drafts.svg_content. Replaces the
 * earlier direct UPDATE that bypassed server-side validation. Client-side
 * validateSvg in TemplateDraftEditModal is feedback-only (devtools-bypassable);
 * the EF gate is the load-bearing security boundary.
 *
 * Returns { ok: true, draftId } on success.
 * Throws on validation failure (422) — caller surfaces error to admin.
 *
 * Save runs BEFORE approveDraft so the latest edited content is what gets
 * published (sequence preserved from Wave 4 modal logic).
 */
export async function saveDraftSvgContent(draftId, svgContent) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'save_edit', draftId, svgContent },
  });
  if (error) throw error;
  return data;
}

/**
 * bulkApproveDrafts — Phase 178 D-05.
 *
 * Calls EF action='approve_bulk' with up to 50 draftIds.
 * Returns { ok: true, results: [{ draftId, ok, error?, thumbnail_url?, svg_template_id? }] }.
 *
 * Caller MUST chunk selections >50 into ≤50-sized chunks (Pitfall 1) — done in
 * AdminTemplateQueuePage.jsx via a Math.ceil(N/50) for-loop in handleBulkConfirm.
 * The backend BULK_HARD_CAP=50 (Plan 05) returns 400 for >50; this helper itself
 * does NOT enforce the cap — it is a thin pass-through with the standard
 * marketplaceService error-throwing pattern.
 */
export async function bulkApproveDrafts(draftIds) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'approve_bulk', draftIds },
  });
  if (error) throw error;
  return data;
}

/**
 * bulkRejectDrafts — Phase 178 D-06.
 *
 * Calls EF action='reject_bulk' with up to 50 draftIds + optional shared reason.
 * `reason` is a single string applied to every rejected draft's
 * metadata.rejected_reason (per D-06: "shared reason field above the bulk-action
 * buttons"). Pass `null` (or omit) to record no reason.
 *
 * Returns { ok: true, results: [{ draftId, ok, error? }] }.
 */
export async function bulkRejectDrafts(draftIds, reason) {
  const { data, error } = await supabase.functions.invoke('generate-svg-template', {
    body: { action: 'reject_bulk', draftIds, reason: reason ?? null },
  });
  if (error) throw error;
  return data;
}
