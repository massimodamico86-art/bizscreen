/**
 * useContainerColumns — Phase 179 (TVRZ-01, D-01)
 *
 * ResizeObserver-driven cols derivation for the virtualized template grid.
 * Maps the observed container width to Tailwind responsive breakpoints
 * (1024 / 768 / 640 → 4 / 3 / 2 / 1 cols) so `VirtualizedTemplateGrid`'s
 * `Math.ceil(filteredTemplates.length / cols)` row-chunk math tracks the
 * actually-rendered grid even when parent layouts constrain the gallery.
 *
 * Pattern source: src/ScaledStage.jsx:22-32 (sole existing RO pattern in
 * codebase) + 179-RESEARCH.md §Pattern 2 (lines 286-325).
 *
 * @param {import('react').RefObject<HTMLElement>} ref — scroll container ref
 * @returns {number} cols — 1 | 2 | 3 | 4
 */
import { useEffect, useState } from 'react';

// Tailwind sm/md/lg thresholds — match TemplateCardGrid (TemplateCard.jsx:166-182).
// Ordered descending so .find() picks the largest matching breakpoint.
const COL_BREAKPOINTS = [
  { minWidth: 1024, cols: 4 }, // lg
  { minWidth: 768, cols: 3 },  // md
  { minWidth: 640, cols: 2 },  // sm
  { minWidth: 0, cols: 1 },    // mobile default
];

function widthToCols(width) {
  return COL_BREAKPOINTS.find((b) => width >= b.minWidth).cols;
}

export function useContainerColumns(ref) {
  // SSR-safe default; corrected by RO/pre-fill on mount.
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Synchronous pre-fill — RO does NOT fire on first observe in some browsers
    // (per WHATWG Resize Observer spec); this prevents a one-render flash with
    // the SSR default. See 179-RESEARCH.md §Pattern 2 line 309.
    setCols(widthToCols(el.getBoundingClientRect().width));

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setCols(widthToCols(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return cols;
}
