/**
 * TemplateDraftEditModal — Phase 177 D-04 OVERRIDE (inline edit modal,
 * NOT extension of AdminEditTemplatePage).
 *
 * Why inline: AdminEditTemplatePage operates on `template_library` (Polotno
 * templates) via marketplaceService — NOT on `svg_templates` /
 * `template_drafts`. See 177-RESEARCH.md §"Existing-Code Inspection: Pitfall 5"
 * for the verdict that drove the override addendum.
 *
 * Save & Publish runs the SAME approve path the Pending tab Approve button
 * uses (Plan 03 EF approve handler — validateSvg server-side → rasterize →
 * S3 PUT → INSERT svg_templates → UPDATE template_drafts.status='approved').
 * The only difference is the svg_content was hand-edited by the admin first.
 *
 * Defense-in-depth: this modal ALSO runs validateSvg client-side BEFORE
 * calling saveDraftSvgContent + approveDraft, so the admin gets immediate
 * feedback on hand-edited issues. Mirrors BulkTemplateUpload.jsx:174-190
 * pattern. The server-side EF approve handler still re-runs the validator
 * with deno-dom — load-bearing gate, never trust client validation alone
 * (T-177-15 mitigation; cross-references Plan 03's B1 server-side
 * re-validation step).
 */

import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Modal, Alert } from '../../design-system';
import TemplateDraftPreview from './TemplateDraftPreview';
import {
  saveDraftSvgContent,
  approveDraft,
} from '../../services/aiTemplate/templateDraftsService';
import { validateSvg } from '../../services/svgValidator';

export default function TemplateDraftEditModal({
  draft,
  onClose,
  onSaved,
  showToast,
}) {
  const [editedSvg, setEditedSvg] = useState(draft?.svg_content ?? '');
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  useEffect(() => {
    setEditedSvg(draft?.svg_content ?? '');
    setValidationErrors([]);
    setValidationWarnings([]);
  }, [draft?.id, draft?.svg_content]);

  const handleRevalidate = () => {
    const result = validateSvg(editedSvg);
    setValidationErrors(result.errors ?? []);
    setValidationWarnings(result.warnings ?? []);
    if (result.ok) {
      showToast?.({ variant: 'success', message: 'Validator passed' });
    } else {
      showToast?.({
        variant: 'error',
        message: `Validator failed: ${(result.errors ?? []).join('; ')}`,
      });
    }
  };

  const handleSaveAndPublish = async () => {
    // Client-side defense-in-depth gate — runs BEFORE saveDraftSvgContent +
    // approveDraft. Mirrors BulkTemplateUpload.jsx:174-190. Server-side EF
    // approve handler will re-run the validator with deno-dom — load-bearing
    // gate; this client check is feedback only, never the security boundary.
    const result = validateSvg(editedSvg);
    setValidationErrors(result.errors ?? []);
    setValidationWarnings(result.warnings ?? []);
    if (!result.ok) {
      showToast?.({
        variant: 'error',
        message: `Cannot publish — validator failed: ${(result.errors ?? []).join('; ')}`,
      });
      return;
    }
    if ((result.warnings ?? []).length > 0) {
      console.warn('[TemplateDraftEditModal] validator warnings:', result.warnings);
    }

    setSaving(true);
    try {
      // Step 1 — persist the edited svg_content (UPDATE template_drafts).
      await saveDraftSvgContent(draft.id, editedSvg);
      // Step 2 — invoke EF approve (re-validates server-side + rasterize +
      // S3 PUT + INSERT svg_templates + mark draft 'approved').
      const res = await approveDraft(draft.id);
      showToast?.({
        variant: 'success',
        message: res?.thumbnail_url
          ? `Saved & published — thumbnail at ${res.thumbnail_url}`
          : 'Saved & published',
      });
      await onSaved?.();
    } catch (err) {
      console.error('[TemplateDraftEditModal] save & publish failed:', err);
      showToast?.({
        variant: 'error',
        message: `Save & publish failed: ${err?.message ?? 'unknown error'}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null;

  return (
    <Modal
      open
      onClose={() => !saving && onClose?.()}
      size="xl"
      aria-labelledby="edit-draft-title"
      showCloseButton={false}
    >
      <div className="p-6 space-y-4" data-testid="edit-draft-modal">
        <div className="flex items-start justify-between">
          <h3
            id="edit-draft-title"
            className="text-lg font-semibold text-gray-900"
          >
            Edit draft
          </h3>
          <button
            type="button"
            onClick={() => !saving && onClose?.()}
            disabled={saving}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Read-only metadata block (D-04 OVERRIDE spec) */}
        <div
          className="bg-gray-50 border border-gray-200 rounded p-3 text-sm grid grid-cols-1 sm:grid-cols-2 gap-2"
          data-testid="edit-draft-metadata"
        >
          <div className="sm:col-span-2">
            <strong className="text-gray-700">Prompt:</strong>{' '}
            <span className="text-gray-900">{draft.prompt ?? <em className="text-gray-400">(none)</em>}</span>
          </div>
          <div>
            <strong className="text-gray-700">Vertical:</strong>{' '}
            <span className="text-gray-900">{draft.vertical ?? 'cross-vertical'}</span>
          </div>
          <div>
            <strong className="text-gray-700">Template type:</strong>{' '}
            <span className="text-gray-900">{draft.metadata?.template_type ?? '—'}</span>
          </div>
          <div>
            <strong className="text-gray-700">Attempts:</strong>{' '}
            <span className="text-gray-900">{draft.metadata?.attempt_count ?? 1}</span>
          </div>
          <div>
            <strong className="text-gray-700">Status:</strong>{' '}
            <span className="text-gray-900">{draft.status ?? '—'}</span>
          </div>
        </div>

        {/* Live preview — reuses TemplateDraftPreview from Plan 04 (4th byte-equal
            DOMPurify mirror site). Renders sanitized inline SVG. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Live preview
          </label>
          <TemplateDraftPreview
            svgContent={editedSvg}
            className="border border-gray-200 rounded bg-white overflow-hidden"
            style={{ width: '100%', maxHeight: 300 }}
          />
        </div>

        {/* Editable SVG textarea */}
        <div>
          <label
            htmlFor="edit-svg"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            SVG content
          </label>
          <textarea
            id="edit-svg"
            rows={10}
            value={editedSvg}
            onChange={(e) => setEditedSvg(e.target.value)}
            disabled={saving}
            className="w-full font-mono text-xs border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            data-testid="edit-svg-textarea"
          />
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="error" data-testid="edit-validation-errors">
            <strong>Validator errors:</strong>
            <ul className="list-disc ml-6 mt-1">
              {validationErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}
        {validationWarnings.length > 0 && (
          <Alert variant="warning" data-testid="edit-validation-warnings">
            <strong>Validator warnings:</strong>
            <ul className="list-disc ml-6 mt-1">
              {validationWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleRevalidate}
            disabled={saving}
            data-testid="btn-revalidate"
          >
            Re-validate
          </Button>
          <Button
            variant="secondary"
            onClick={() => onClose?.()}
            disabled={saving}
            data-testid="btn-edit-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveAndPublish}
            disabled={saving || !editedSvg.trim()}
            data-testid="btn-save-publish"
          >
            <Save size={14} className="mr-1" />
            {saving ? 'Saving…' : 'Save & Publish'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
