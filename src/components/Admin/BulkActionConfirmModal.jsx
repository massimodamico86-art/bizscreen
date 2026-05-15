/**
 * BulkActionConfirmModal — Phase 178 D-08 (3-phase bulk-action confirm modal).
 *
 * Renders confirm → executing → done. Driven entirely by parent props so the
 * parent (AdminTemplateQueuePage) can run a Math.ceil(N/50) sequential chunk
 * loop and aggregate per-call results into a SINGLE feed across multiple EF
 * calls. The modal does NOT call the EF — it is a pure render of:
 *
 *   - phase            : 'confirm' | 'executing' | 'done'
 *   - totalDraftIds    : full selection (across all chunks)
 *   - drafts           : full draft objects (used for first-5 names + slug lookup)
 *   - reason           : shared reject reason (echo only; for action='reject')
 *   - execResults      : aggregated results across all chunks (parent appends)
 *   - progress         : { current, total, currentChunk, totalChunks }
 *   - onConfirm        : parent advances phase='executing' + starts chunk loop
 *   - onClose          : parent clears modal state + reloads draft list
 *
 * UI-SPEC §"Surface 4: Bulk Confirmation Modal" + §"Copywriting Contract"
 * is the authoritative contract.
 *
 * Pitfall 1 — REAL chunking:
 *   The parent's chunk loop produces 1 EF call per ≤50-sized chunk. For a
 *   142-draft selection that is 3 calls (50 + 50 + 42). The progress header
 *   surfaces "Approving X / N (chunk K/M)" so the operator sees aggregate
 *   progress across all chunks, not just the current one.
 *
 * Auto-scroll: feedRef tracks scrollHeight on execResults.length change so
 * newly appended rows stay in view (per UI-SPEC §Surface 4 executing phase).
 *
 * Close-disable: closeOnEscape={false} + closeOnOverlay={false} during
 * executing phase — operator must wait or reach done. Confirm phase + done
 * phase restore default close behavior (T-178-06-03 mitigation).
 */

import { useEffect, useRef } from 'react';
import { Button, Modal } from '../../design-system';

export default function BulkActionConfirmModal({
  open,
  phase,
  action,
  totalDraftIds,
  drafts,
  reason,
  execResults,
  progress,
  onConfirm,
  onClose,
}) {
  const feedRef = useRef(null);

  // Auto-scroll feed to bottom as new results append (UI-SPEC §Surface 4).
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [execResults?.length]);

  const isApprove = action === 'approve';
  const N = totalDraftIds?.length ?? 0;
  const titleNoun = N !== 1 ? 'drafts' : 'draft';
  const first5 = (drafts ?? []).slice(0, 5);
  const overflow = Math.max(0, N - first5.length);

  return (
    <Modal
      open={open}
      onClose={phase === 'executing' ? () => {} : onClose}
      size="lg"
      closeOnEscape={phase !== 'executing'}
      closeOnOverlay={phase !== 'executing'}
      showCloseButton={phase !== 'executing'}
      data-testid="bulk-confirm-modal"
    >
      <div className="p-6">
        {phase === 'confirm' && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isApprove ? 'Approve' : 'Reject'} {N} {titleNoun}?
            </h3>
            <ul className="space-y-1 mb-4">
              {first5.map((d) => (
                <li key={d.id} className="text-sm text-gray-700">
                  • {d.name ?? d.id.slice(0, 8)}
                </li>
              ))}
            </ul>
            {overflow > 0 && (
              <p className="text-sm text-gray-500">…and {overflow} more</p>
            )}
            {!isApprove && reason && (
              <p className="text-sm text-gray-500 italic mt-2">
                Reason: "{reason}" (applied to all)
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={onClose}>
                Keep reviewing
              </Button>
              <Button
                variant={isApprove ? 'primary' : 'danger'}
                onClick={onConfirm}
                data-testid="btn-bulk-confirm"
              >
                Confirm {isApprove ? 'approve' : 'reject'}
              </Button>
            </div>
          </>
        )}

        {phase === 'executing' && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isApprove ? 'Approving' : 'Rejecting'} {progress?.current ?? 0} / {progress?.total ?? N}…
              {progress?.totalChunks > 1 && (
                <span> (chunk {progress.currentChunk}/{progress.totalChunks})</span>
              )}
            </h3>
            <div
              ref={feedRef}
              data-testid="bulk-exec-feed"
              aria-live="polite"
              className="max-h-80 overflow-y-auto space-y-1 font-mono text-xs border border-gray-100 rounded bg-gray-50 p-3"
            >
              {(execResults ?? []).map((r, i) => {
                const errStr = r.error ?? '';
                const errTrunc = errStr.length > 120 ? `${errStr.slice(0, 120)}…` : errStr;
                return r.ok ? (
                  <p key={i} className="text-green-700">✓ {r.slug}</p>
                ) : (
                  <p key={i} className="text-red-600">✗ {r.slug} — {errTrunc}</p>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" disabled>
                Please wait…
              </Button>
            </div>
          </>
        )}

        {phase === 'done' && (() => {
          const list = execResults ?? [];
          const successCount = list.filter((r) => r.ok).length;
          const failCount = list.filter((r) => !r.ok).length;
          return (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing complete
              </h3>
              <div
                ref={feedRef}
                data-testid="bulk-exec-feed"
                className="max-h-80 overflow-y-auto space-y-1 font-mono text-xs border border-gray-100 rounded bg-gray-50 p-3"
              >
                {list.map((r, i) => {
                  const errStr = r.error ?? '';
                  const errTrunc = errStr.length > 120 ? `${errStr.slice(0, 120)}…` : errStr;
                  return r.ok ? (
                    <p key={i} className="text-green-700">✓ {r.slug}</p>
                  ) : (
                    <p key={i} className="text-red-600">✗ {r.slug} — {errTrunc}</p>
                  );
                })}
              </div>
              <p className="mt-2 pt-2 border-t border-gray-200 text-sm font-semibold text-gray-900">
                {isApprove ? 'Approved' : 'Rejected'} {successCount},{' '}
                {failCount > 0
                  ? `${failCount} failed (see errors above)`
                  : 'all succeeded'}
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  data-testid="btn-bulk-close"
                >
                  Close summary
                </Button>
              </div>
            </>
          );
        })()}
      </div>
    </Modal>
  );
}
