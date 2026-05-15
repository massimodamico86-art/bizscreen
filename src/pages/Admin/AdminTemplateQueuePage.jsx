/**
 * Admin Template Queue Page (Phase 177 — Wave 3 Plan 04 + Phase 178 Plan 06).
 *
 * super_admin/admin-gated via App.jsx routing (admin-template-queue is in
 * adminToolPages). Edge Function defense-in-depth via is_admin/is_super_admin
 * RPC + RLS policy template_drafts_admin_only (Phase 176).
 *
 * Two tabs:
 *   - Pending (default): D-03 — list template_drafts where status IN
 *     ('pending', 'needs_human_review') ordered created_at DESC. Each row
 *     renders a sanitized inline SVG preview (TemplateDraftPreview, locked
 *     DOMPurify config), originating prompt (truncated), vertical chip,
 *     template_type chip, attempt-count badge, and three actions
 *     (Approve/Edit/Reject). needs_human_review rows are visually flagged
 *     and expand metadata.validator_failures[] on click.
 *   - Generate: D-02 OptiSigns-style form + D-10/D-12 (orientation +
 *     vertical-filtered template_type via Plan 06).
 *
 * Phase 178 Plan 06 — Pending tab extension (D-05/D-06/D-07/D-08):
 *   - Filter chip strip above the list (vertical / template_type / status).
 *     Filters are client-side (no extra fetch) and compose with AND logic.
 *   - Per-row checkboxes + header select-all (with indeterminate state).
 *   - Bulk-action toolbar (visible only when ≥1 row selected) with shared
 *     reject-reason textarea + Approve / Reject buttons.
 *   - BulkActionConfirmModal integration (3-phase: confirm → executing →
 *     done). Parent drives phase + execResults state so a SINGLE feed
 *     aggregates across multiple chunked EF calls.
 *   - REAL frontend chunking via Math.ceil(N/50) sequential bulk-EF calls
 *     in handleBulkConfirm. Pitfall 1 — REPLACES the silent slice(0, 50)
 *     truncation that would have dropped IDs at index 50+. A 142-draft
 *     selection now produces 3 EF calls (50 + 50 + 42), each ≤50 within
 *     BULK_HARD_CAP=50 (Plan 05).
 *
 * Service-layer integration:
 *   fetchPendingDrafts, approveDraft, rejectDraft from templateDraftsService.
 *   bulkApproveDrafts, bulkRejectDrafts (Plan 06 D-05/D-06).
 *
 * Edit button opens TemplateDraftEditModal inline (D-04 OVERRIDE — Phase 177
 * Wave 4 inline modal, NOT AdminEditTemplatePage page nav).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, Edit2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import PageLayout from '../../design-system/components/PageLayout';
import { Button, Alert, Modal, FilterChips, Textarea } from '../../design-system';
import {
  fetchPendingDrafts,
  approveDraft,
  rejectDraft,
  bulkApproveDrafts,
  bulkRejectDrafts,
} from '../../services/aiTemplate/templateDraftsService';
import TemplateDraftPreview from '../../components/Admin/TemplateDraftPreview';
import GenerateTabForm from '../../components/Admin/GenerateTabForm';
import TemplateDraftEditModal from '../../components/Admin/TemplateDraftEditModal';
import BulkActionConfirmModal from '../../components/Admin/BulkActionConfirmModal';

// Phase 178 Plan 06 — frontend chunk size for bulk EF calls. Backend
// BULK_HARD_CAP=50 (Plan 05) is the load-bearing gate; this constant ensures
// every dispatched chunk respects that cap. Pitfall 1: NEVER replace the
// chunk loop with a silent slice(0, 50) truncation — selections >50 would
// drop IDs at index 50+ and the operator would not see the dropped work.
const CHUNK_SIZE = 50;

// Phase 178 Plan 06 — filter chip option arrays per UI-SPEC §Surface 1.
const VERTICAL_FILTER_OPTIONS = [
  { id: 'all', label: 'All verticals' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'retail', label: 'Retail' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'cross', label: 'Cross-vertical' },
];

const TYPE_FILTER_OPTIONS = [
  { id: 'all', label: 'All types' },
  { id: 'menu', label: 'Menu' },
  { id: 'promo', label: 'Promo' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'wayfinding', label: 'Wayfinding' },
  { id: 'health_tip', label: 'Health Tip' },
  { id: 'queue_status', label: 'Queue Status' },
  { id: 'drive_thru', label: 'Drive-Thru' },
  { id: 'waiting_room_ambient', label: 'Waiting Room' },
  { id: 'emergency_alert', label: 'Emergency Alert' },
];

const STATUS_FILTER_OPTIONS = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'needs_human_review', label: 'Needs review' },
];

export default function AdminTemplateQueuePage({ showToast, onNavigate: _onNavigate }) {
  const [activeTab, setActiveTab] = useState('pending'); // 'generate' | 'pending'
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyDraftId, setBusyDraftId] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null); // { draft, reason }
  const [expandedFailures, setExpandedFailures] = useState(new Set());
  const [editingDraft, setEditingDraft] = useState(null); // null | TemplateDraft (D-04 OVERRIDE — inline modal)

  // Phase 178 Plan 06 — Pending tab extension state (D-05/D-06/D-07/D-08).
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkInFlight, setBulkInFlight] = useState(false);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPendingDrafts();
      setDrafts(rows);
    } catch (err) {
      console.error('[AdminTemplateQueuePage] load failed:', err);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Phase 178 Plan 06 — client-side filtering. Cross-vertical maps null to
  // the 'cross' chip id. T-178-06-02 mitigation — selection bleed is prevented
  // by recomputing filteredDrafts on every filter change and intersecting
  // selectedIds with the visible set when computing toolbar count.
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      if (verticalFilter !== 'all') {
        if (verticalFilter === 'cross') {
          if (d.vertical !== null && d.vertical !== undefined) return false;
        } else if (d.vertical !== verticalFilter) {
          return false;
        }
      }
      if (typeFilter !== 'all' && d.metadata?.template_type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [drafts, verticalFilter, typeFilter, statusFilter]);

  // Selection intersected with visible (post-filter) drafts — header
  // select-all + bulk action count both use this.
  const visibleSelectedIds = useMemo(() => {
    const visible = new Set(filteredDrafts.map((d) => d.id));
    return new Set([...selectedIds].filter((id) => visible.has(id)));
  }, [filteredDrafts, selectedIds]);

  const allVisibleSelected =
    filteredDrafts.length > 0 && visibleSelectedIds.size === filteredDrafts.length;
  const someVisibleSelected =
    visibleSelectedIds.size > 0 && visibleSelectedIds.size < filteredDrafts.length;

  const handleToggleRow = (draftId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const visibleIds = filteredDrafts.map((d) => d.id);
      if (allVisibleSelected) {
        // Deselect all visible (preserve any out-of-filter selections — but in
        // practice we only show filteredDrafts, so this clears the toolbar).
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      // Select all visible (union with existing).
      return new Set([...prev, ...visibleIds]);
    });
  };

  const handleApprove = async (draft) => {
    setBusyDraftId(draft.id);
    try {
      const res = await approveDraft(draft.id);
      showToast?.({
        variant: 'success',
        message: res?.thumbnail_url
          ? `Published — thumbnail at ${res.thumbnail_url}`
          : 'Draft approved',
      });
      await loadDrafts();
    } catch (err) {
      console.error('[AdminTemplateQueuePage] approve failed:', err);
      showToast?.({ variant: 'error', message: `Approve failed: ${err.message}` });
    } finally {
      setBusyDraftId(null);
    }
  };

  const openRejectConfirm = (draft) => setConfirmReject({ draft, reason: '' });

  const handleRejectConfirm = async () => {
    if (!confirmReject) return;
    const { draft, reason } = confirmReject;
    setBusyDraftId(draft.id);
    try {
      await rejectDraft(draft.id, reason || null);
      showToast?.({ variant: 'success', message: 'Draft rejected' });
      setConfirmReject(null);
      await loadDrafts();
    } catch (err) {
      console.error('[AdminTemplateQueuePage] reject failed:', err);
      showToast?.({ variant: 'error', message: `Reject failed: ${err.message}` });
    } finally {
      setBusyDraftId(null);
    }
  };

  // Plan 05 (D-04 OVERRIDE) — opens TemplateDraftEditModal inline with the
  // svg_content textarea + live preview. Save & Publish runs the same EF
  // approve path as the Pending tab Approve button.
  const handleEdit = (draft) => setEditingDraft(draft);

  const toggleFailures = (draftId) => {
    setExpandedFailures((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  // Phase 178 Plan 06 — bulk-action lifecycle. Three steps:
  //   1. openBulkConfirm: build the bulkConfirm state shell + show modal.
  //   2. handleBulkConfirm: REAL chunking loop — Math.ceil(N/50) sequential
  //      EF calls. Aggregates per-call results into execResults across chunks
  //      so the modal feed reads as a single stream. NO Promise.all (Pitfall 3).
  //   3. handleBulkClose: clear modal + selection + reload draft list.
  const openBulkConfirm = (action) => {
    const allSelected = filteredDrafts.filter((d) => selectedIds.has(d.id));
    if (allSelected.length === 0) return;
    const allDraftIds = allSelected.map((d) => d.id);
    const totalChunks = Math.ceil(allDraftIds.length / CHUNK_SIZE);
    setBulkConfirm({
      action,
      totalDraftIds: allDraftIds,
      drafts: allSelected,
      reason: action === 'reject' ? bulkRejectReason : '',
      phase: 'confirm',
      execResults: [],
      progress: {
        current: 0,
        total: allDraftIds.length,
        currentChunk: 0,
        totalChunks,
      },
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkConfirm) return;
    const { action, totalDraftIds, drafts: bulkDrafts, reason } = bulkConfirm;
    const totalChunks = Math.ceil(totalDraftIds.length / CHUNK_SIZE);

    setBulkInFlight(true);
    setBulkConfirm((prev) => prev && ({
      ...prev,
      phase: 'executing',
      execResults: [],
      progress: {
        current: 0,
        total: totalDraftIds.length,
        currentChunk: 0,
        totalChunks,
      },
    }));

    const aggregated = [];
    try {
      // SERIAL chunk loop — each iteration awaits the previous EF call. This
      // respects Pitfall 3 (no Promise.all over the chunk set; the EF can
      // hammer the DB if chunks fire concurrently). For a 142-draft selection
      // with CHUNK_SIZE=50, this loop runs 3 EF calls (50 + 50 + 42 IDs).
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const chunkStart = chunkIdx * CHUNK_SIZE;
        const chunk = totalDraftIds.slice(chunkStart, chunkStart + CHUNK_SIZE);
        let resp;
        try {
          resp =
            action === 'approve'
              ? await bulkApproveDrafts(chunk)
              : await bulkRejectDrafts(chunk, reason);
        } catch (err) {
          // Network / HTTP failure on this chunk — record per-draft failure
          // for the chunk so the loop continues for subsequent chunks.
          resp = {
            ok: false,
            results: chunk.map((id) => ({
              draftId: id,
              ok: false,
              error: `Network error: ${err.message}`,
            })),
          };
          showToast?.({
            variant: 'error',
            message: `Bulk ${action} chunk ${chunkIdx + 1}/${totalChunks} failed: ${err.message}`,
          });
        }
        const decorated = (resp.results ?? []).map((r) => ({
          ...r,
          slug:
            bulkDrafts.find((d) => d.id === r.draftId)?.name ??
            r.draftId.slice(0, 8),
        }));
        aggregated.push(...decorated);
        setBulkConfirm((prev) => prev && ({
          ...prev,
          execResults: [...aggregated],
          progress: {
            current: chunkStart + chunk.length,
            total: totalDraftIds.length,
            currentChunk: chunkIdx + 1,
            totalChunks,
          },
        }));
      }
    } finally {
      setBulkConfirm((prev) => prev && ({ ...prev, phase: 'done' }));
      setBulkInFlight(false);
    }
  };

  const handleBulkClose = async () => {
    setBulkConfirm(null);
    setSelectedIds(new Set());
    setBulkRejectReason('');
    await loadDrafts();
  };

  const pendingCount = drafts.length;
  const filteredCount = filteredDrafts.length;
  const isFiltered =
    verticalFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all';
  const toolbarSelectedCount = visibleSelectedIds.size;

  return (
    <PageLayout
      title="Template Queue"
      description="Generate, review, and publish AI-generated SVG templates"
      actions={
        <Button
          variant="secondary"
          onClick={loadDrafts}
          disabled={loading}
          aria-label="Refresh queue"
        >
          <RefreshCw size={16} className="mr-1" />
          Refresh
        </Button>
      }
    >
      {/* Tab toggle */}
      <div className="flex items-center gap-2 mb-4" role="tablist" aria-label="Template queue tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'generate'}
          data-testid="tab-generate"
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'generate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          data-testid="tab-pending"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending
          {pendingCount > 0 && (
            <span
              className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'pending' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
              }`}
              data-testid="pending-count-badge"
            >
              {isFiltered ? filteredCount : pendingCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* === Pending tab === */}
      {activeTab === 'pending' && (
        <>
          {/* Phase 178 Plan 06 — filter chip strip (UI-SPEC §Surface 1).
              Three rows stacked vertically: vertical / type / status. */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center" role="group" aria-label="Filter by vertical">
              <span className="text-xs font-semibold text-gray-500 mr-2 shrink-0">
                Vertical:
              </span>
              <FilterChips
                data-testid="filter-vertical"
                options={VERTICAL_FILTER_OPTIONS}
                selected={verticalFilter}
                onChange={setVerticalFilter}
                variant="default"
              />
            </div>
            <div className="flex items-center" role="group" aria-label="Filter by type">
              <span className="text-xs font-semibold text-gray-500 mr-2 shrink-0">
                Type:
              </span>
              <FilterChips
                data-testid="filter-type"
                options={TYPE_FILTER_OPTIONS}
                selected={typeFilter}
                onChange={setTypeFilter}
                variant="default"
                maxVisible={6}
              />
            </div>
            <div className="flex items-center" role="group" aria-label="Filter by status">
              <span className="text-xs font-semibold text-gray-500 mr-2 shrink-0">
                Status:
              </span>
              <FilterChips
                data-testid="filter-status"
                options={STATUS_FILTER_OPTIONS}
                selected={statusFilter}
                onChange={setStatusFilter}
                variant="default"
              />
            </div>
          </div>

          {/* Phase 178 Plan 06 — bulk-action toolbar (UI-SPEC §Surface 3).
              Visible only when ≥1 row selected (T-178-06-03 — bulkInFlight
              disables both buttons during in-flight EF calls so a double-click
              cannot dispatch a second concurrent chunk loop). */}
          {toolbarSelectedCount > 0 && (
            <div
              data-testid="bulk-action-toolbar"
              role="toolbar"
              aria-label="Bulk actions"
              className="flex items-start gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg mb-3"
            >
              <div className="flex-1">
                <Textarea
                  data-testid="bulk-reject-reason"
                  rows={3}
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  placeholder="Optional reason for rejecting all selected drafts…"
                  disabled={bulkInFlight}
                  className="text-sm"
                />
              </div>
              <div className="flex-shrink-0 flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openBulkConfirm('approve')}
                  disabled={bulkInFlight}
                  data-testid="btn-bulk-approve"
                >
                  <Check size={14} className="mr-1" />
                  Approve selected ({toolbarSelectedCount})
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => openBulkConfirm('reject')}
                  disabled={bulkInFlight}
                  data-testid="btn-bulk-reject"
                >
                  <X size={14} className="mr-1" />
                  Reject selected ({toolbarSelectedCount})
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-500 text-sm mt-3">Loading drafts…</p>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  {isFiltered
                    ? 'No drafts match the current filters.'
                    : 'No pending drafts. Switch to the Generate tab to create one.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200" data-testid="pending-list">
                {/* Header row — select-all checkbox (Phase 178 Plan 06). */}
                <li className="px-4 py-2 flex items-center gap-4 bg-gray-50 border-b border-gray-200">
                  <div className="w-10 flex-shrink-0 flex items-center">
                    <input
                      type="checkbox"
                      data-testid="checkbox-select-all"
                      aria-label="Select all visible drafts"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {toolbarSelectedCount > 0
                      ? `${toolbarSelectedCount} selected`
                      : `${filteredCount} draft${filteredCount !== 1 ? 's' : ''}`}
                  </span>
                </li>

                {filteredDrafts.map((draft) => {
                  const isBusy = busyDraftId === draft.id;
                  const isFlagged = draft.status === 'needs_human_review';
                  const isSelected = selectedIds.has(draft.id);
                  const failures = draft.metadata?.validator_failures ?? [];
                  const failureCount = failures.length;
                  const isExpanded = expandedFailures.has(draft.id);
                  const promptText = draft.prompt ?? '';
                  const promptTruncated =
                    promptText.length > 200 ? `${promptText.slice(0, 200)}…` : promptText;
                  const verticalLabel = draft.vertical ?? 'cross-vertical';
                  const templateType = draft.metadata?.template_type ?? '—';
                  const attemptCount = draft.metadata?.attempt_count ?? 1;

                  // Row background — flagged amber overrides selected blue
                  // (UI-SPEC §Surface 2: needs_human_review takes priority).
                  const rowBg = isFlagged
                    ? 'bg-amber-50 border-l-4 border-amber-400'
                    : isSelected
                      ? 'bg-blue-50'
                      : '';

                  return (
                    <li
                      key={draft.id}
                      data-testid="draft-row"
                      data-draft-id={draft.id}
                      data-vertical={draft.vertical ?? 'cross'}
                      className={`p-4 flex items-start gap-4 ${rowBg}`}
                    >
                      {/* Phase 178 Plan 06 — per-row checkbox (UI-SPEC §Surface 2). */}
                      <div className="w-10 flex-shrink-0 flex items-start pt-1">
                        <input
                          type="checkbox"
                          data-testid={`checkbox-draft-${draft.id}`}
                          aria-label={`Select draft ${draft.name ?? draft.id.slice(0, 8)}`}
                          checked={isSelected}
                          onChange={() => handleToggleRow(draft.id)}
                          disabled={isBusy}
                          className={`w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                            isBusy ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        />
                      </div>

                      {/* Left: sanitized inline SVG preview */}
                      <div className="flex-shrink-0">
                        <TemplateDraftPreview
                          svgContent={draft.svg_content}
                          className="border border-gray-200 rounded bg-white overflow-hidden"
                          style={{ width: 240, height: 135 }}
                        />
                      </div>

                      {/* Middle: prompt + chips + retry count + (conditionally) failure list */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm text-gray-900 break-words"
                          title={promptText}
                        >
                          {promptTruncated || <em className="text-gray-400">(no prompt)</em>}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            data-testid="chip-vertical"
                          >
                            {verticalLabel}
                          </span>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                            data-testid="chip-type"
                          >
                            {templateType}
                          </span>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            data-testid="chip-attempts"
                          >
                            attempts: {attemptCount}
                          </span>
                          {isFlagged && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-900"
                              data-testid="needs-review-chip"
                            >
                              <AlertTriangle size={12} /> VALIDATOR FAILED
                            </span>
                          )}
                        </div>
                        {isFlagged && (
                          <button
                            type="button"
                            onClick={() => toggleFailures(draft.id)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                            data-testid="toggle-failures"
                          >
                            {isExpanded ? 'Hide' : 'Show'} validator failures ({failureCount})
                          </button>
                        )}
                        {isFlagged && isExpanded && (
                          <ul
                            className="mt-2 ml-4 list-disc text-xs text-gray-700 space-y-1"
                            data-testid="failures-list"
                          >
                            {failures.map((f, idx) => (
                              <li key={idx}>
                                <strong>Attempt {f.attempt}:</strong>{' '}
                                {(f.errors ?? []).join('; ') || '(no error detail)'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Right: 3 action buttons */}
                      <div className="flex-shrink-0 flex flex-col gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleApprove(draft)}
                          data-testid="btn-approve"
                        >
                          <Check size={14} className="mr-1" /> Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleEdit(draft)}
                          data-testid="btn-edit"
                        >
                          <Edit2 size={14} className="mr-1" /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => openRejectConfirm(draft)}
                          data-testid="btn-reject"
                        >
                          <X size={14} className="mr-1" /> Reject
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* === Generate tab === */}
      {activeTab === 'generate' && (
        <GenerateTabForm
          showToast={showToast}
          onGenerated={async () => {
            setActiveTab('pending');
            await loadDrafts();
          }}
        />
      )}

      {/* === Edit modal (D-04 OVERRIDE — inline, NOT AdminEditTemplatePage) === */}
      {editingDraft && (
        <TemplateDraftEditModal
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSaved={async () => {
            setEditingDraft(null);
            await loadDrafts();
          }}
          showToast={showToast}
        />
      )}

      {/* === Phase 178 Plan 06 — bulk-action confirm modal (D-08) ===
          Parent drives phase + execResults + progress so the chunk loop in
          handleBulkConfirm aggregates results across multiple EF calls into
          a single feed (Pitfall 1 — REAL chunking). */}
      <BulkActionConfirmModal
        open={bulkConfirm !== null}
        phase={bulkConfirm?.phase ?? 'confirm'}
        action={bulkConfirm?.action ?? 'approve'}
        totalDraftIds={bulkConfirm?.totalDraftIds ?? []}
        drafts={bulkConfirm?.drafts ?? []}
        reason={bulkConfirm?.reason ?? ''}
        execResults={bulkConfirm?.execResults ?? []}
        progress={bulkConfirm?.progress ?? null}
        onConfirm={handleBulkConfirm}
        onClose={handleBulkClose}
      />

      {/* === Reject confirmation modal (single-row — Phase 177 invariant) === */}
      <Modal
        open={!!confirmReject}
        onClose={() => busyDraftId === null && setConfirmReject(null)}
        size="sm"
        aria-labelledby="reject-confirm-title"
      >
        {confirmReject && (
          <div className="p-6">
            <h3
              id="reject-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Reject draft?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Optionally provide a reason for the audit log:
            </p>
            <textarea
              className="w-full border border-gray-300 rounded p-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={confirmReject.reason}
              onChange={(e) =>
                setConfirmReject((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
              }
              placeholder="e.g. Off-brand colors, illegible at distance"
              data-testid="reject-reason-textarea"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmReject(null)}
                disabled={busyDraftId !== null}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectConfirm}
                disabled={busyDraftId !== null}
                data-testid="btn-reject-confirm"
              >
                {busyDraftId !== null ? 'Rejecting…' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
