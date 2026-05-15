import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, LayoutTemplate, Loader2 } from 'lucide-react';
import { Modal, Button, Badge, Alert } from '../../design-system';
import { fetchPackDetail, applyStarterPack } from '../../services/marketplaceService';

/**
 * PackPreviewModal — full-screen pack preview + Apply CTA (Phase 173, TPCK-02).
 *
 * Mirrors TemplatePreviewModal chrome (Pattern 6 — snapshot-on-open;
 * RESEARCH §Example 9 — prev/next + keyboard).
 *
 * Differences from TemplatePreviewModal:
 *   - No QuickCustomizePanel (D-08 — no customization on bulk apply)
 *   - No FavoriteButton (UI-SPEC §Component Inventory — packs not favoritable)
 *   - Apply success: toast + 'View scenes' action + modal closes; NO navigation (D-14)
 *   - Apply failure: inline toast, modal stays, button re-enables (D-15)
 *   - Body is a mini-grid of member thumbnails (not single SVG preview)
 *
 * Toast contract (showToast prop): the plan-level contract is
 *   showToast({ variant, heading, action?: { label, onClick } })
 * Plan 08 bridges this to the real App.jsx toast shape if/when needed.
 *
 * @param {{
 *   open: boolean,
 *   packs: Array<{ id, name, industry, ... }>,
 *   initialIndex?: number,
 *   onClose: () => void,
 *   showToast?: (toast: { variant, heading, action? }) => void,
 *   onNavigate?: (page: string) => void,
 * }} props
 */
export default function PackPreviewModal({
  open,
  packs,
  initialIndex = 0,
  onClose,
  showToast,
  onNavigate,
}) {
  // Snapshot-on-open (Pattern 6 — clone of TemplatePreviewModal:38-50)
  const snapshotRef = useRef(null);
  useEffect(() => {
    if (open && !snapshotRef.current) {
      snapshotRef.current = Array.isArray(packs) ? [...packs] : [];
    }
    if (!open) {
      snapshotRef.current = null;
    }
  }, [open, packs]);

  const snapshot = snapshotRef.current || (Array.isArray(packs) ? packs : []);
  const total = snapshot.length;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentPack = useMemo(
    () => (snapshot && total > 0 ? snapshot[Math.min(currentIndex, total - 1)] : null),
    [snapshot, currentIndex, total],
  );

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  // Reset index when reopened
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  // Fetch pack detail (members) when current pack changes
  useEffect(() => {
    if (!open || !currentPack) return undefined;
    let cancelled = false;
    setLoadingDetail(true);
    setError(null);
    fetchPackDetail(currentPack.id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[PackPreviewModal] fetchPackDetail failed:', err);
        setError("Couldn't load pack details.");
      })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPack?.id]);

  // Prev/Next handlers (RESEARCH §Example 9 — verbatim adapted)
  const onPrev = () => {
    if (total < 2) return;
    setError(null);
    setCurrentIndex((i) => (i - 1 + total) % total);
  };
  const onNext = () => {
    if (total < 2) return;
    setError(null);
    setCurrentIndex((i) => (i + 1) % total);
  };

  // Keyboard cycling (verbatim from TemplatePreviewModal:86-103)
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total]);

  const handleApply = async () => {
    if (!currentPack) return;
    setApplying(true);
    setError(null);
    try {
      const sceneIds = await applyStarterPack(currentPack.id);
      // D-14: success toast with 'View scenes' action; modal closes; NO navigation
      showToast?.({
        variant: 'success',
        heading: `Added ${sceneIds.length} templates from ${currentPack.name}`,
        action: { label: 'View scenes', onClick: () => onNavigate?.('scenes') },
      });
      onClose?.();
    } catch (err) {
      // D-15: inline error, modal stays open, button re-enables
      // eslint-disable-next-line no-console
      console.error('[PackPreviewModal] Apply failed:', err);
      setError("Couldn't apply this pack. Please try again.");
      setApplying(false);
    }
  };

  if (!open || !currentPack) return null;

  const memberCount = detail?.members?.length ?? currentPack.member_count ?? 0;
  const members = detail?.members ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      closeOnOverlay={false}
      closeOnEscape
      showCloseButton={false}
      aria-labelledby="pack-preview-title"
    >
      <div className="flex flex-col h-[calc(100vh-2rem)] sm:h-[90vh] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label="Close"
            className="h-12 w-12 p-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </Button>
          <h2 id="pack-preview-title" className="text-xl font-semibold text-gray-900 truncate mx-4 flex-1 text-center">
            {currentPack.name}
          </h2>
          <div className="flex items-center gap-2">
            {currentPack.industry && (
              <Badge variant="default" size="sm">{currentPack.industry}</Badge>
            )}
            <Badge variant="default" size="sm">{currentIndex + 1} of {total}</Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 relative">
          {total > 1 && (
            <>
              <Button
                variant="ghost"
                size="md"
                aria-label="Previous pack"
                onClick={onPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-white/80 backdrop-blur-sm hover:bg-white shadow-card rounded-full flex items-center justify-center z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="md"
                aria-label="Next pack"
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-white/80 backdrop-blur-sm hover:bg-white shadow-card rounded-full flex items-center justify-center z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {loadingDetail ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading pack…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {members.map((m) => (
                <div key={`${m.editor_type}-${m.id}`} className="flex flex-col">
                  <div className="aspect-video bg-gray-100 rounded-card overflow-hidden flex items-center justify-center">
                    {m.thumbnail ? (
                      <img src={m.thumbnail} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <LayoutTemplate size={32} className="text-gray-300" />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 truncate mt-1">{m.name}</p>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
        </div>

        {/* Footer — Apply CTA (UI-SPEC Copywriting: 'Apply pack (N templates)') */}
        <div className="border-t border-gray-200 px-6 py-4 shrink-0 flex justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={applying || memberCount === 0}
          >
            {applying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Apply pack ({memberCount} templates)
              </span>
            ) : (
              `Apply pack (${memberCount} templates)`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
