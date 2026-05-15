/**
 * VirtualizedTemplateGrid — Phase 179 (TVRZ-01, TVRZ-03, TVRZ-05)
 *
 * Row-chunked masonry virtualizer over the filtered template list. Each
 * virtual row contains `cols` cards rendered with the existing
 * `TemplateCard` (which already supports the `orientation` prop from
 * Phase 178 D-10). Row height = max of items in the row, measured
 * post-mount via `measureElement` — D-02 ("OptiSigns is the standard").
 *
 * Locked decisions (179-CONTEXT.md):
 *   D-01 — cols derived externally via useContainerColumns(ref)
 *   D-02 — row-chunking + measureElement (NOT native lanes per OQ-1 / bug #1063)
 *   D-04 — render branches sit inside the scroll container (this is the content branch)
 *
 * SC contracts:
 *   SC-1 — overscan = 5 (>=3 required); count = 0 when templates=[]; aria-rowcount math
 *   SC-3 — scrollToOffset(0) on templates reference identity change (useEffect dep)
 *   SC-5 — aria-rowcount + role="grid"/"row"/"gridcell" + aria-rowindex 1-indexed (gridcell added Phase 180 SC-10 axe remediation)
 *
 * CRITICAL CSS: `alignItems: 'start'` on each row container — load-bearing
 * for masonry. Using `stretch` (default) would equalize row heights and
 * defeat mixed-orientation tiling.
 *
 * @param {{
 *   templates: Array<object>,
 *   cols: number,
 *   scrollElement: HTMLElement | null,
 *   onApply: (template: object) => void,
 *   onToggleFavorite: (template: object, nextValue: boolean) => void,
 *   applyingId: string | null,
 *   popularityThreshold: number,
 *   isNew: (createdAt: string) => boolean,
 * }} props
 */
import { useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TemplateCard, Badge } from '../../design-system';

// SC-1: overscan must be >= 3; 5 is the CONTEXT-recommended default.
const OVERSCAN = 5;

// RESEARCH §Assumptions Log A1: baseline landscape row height at 4-col,
// ~1200px viewport. measureElement self-corrects after first render.
const ESTIMATE_SIZE = 320;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function VirtualizedTemplateGrid({
  templates,
  cols,
  scrollElement,
  onApply,
  onToggleFavorite,
  applyingId,
  popularityThreshold,
  isNew,
}) {
  const safeCols = cols || 1;
  const rows = useMemo(() => chunk(templates, safeCols), [templates, safeCols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => ESTIMATE_SIZE,
    overscan: OVERSCAN,
  });

  // SC-3: scroll reset on every filtered-results identity change.
  // `templates` is a fresh array on every filter/search/sort change
  // (TemplateGalleryPage's useMemo at line 394 returns a new reference).
  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [templates, virtualizer]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      role="grid"
      aria-rowcount={rows.length}
      style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
    >
      {items.map((vRow) => {
        const row = rows[vRow.index];
        if (!row) return null;
        return (
          <div
            key={vRow.key}
            data-index={vRow.index}
            ref={virtualizer.measureElement}
            role="row"
            aria-rowindex={vRow.index + 1}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))`,
              gap: '1rem',
              alignItems: 'start',  // LOAD-BEARING — masonry mandate (D-02)
            }}
          >
            {row.map((t, idxInRow) => {
              const absoluteIndex = vRow.index * safeCols + idxInRow;
              return (
                <div key={t.id} className="relative" role="gridcell">
                  {isNew && isNew(t.created_at) && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="success" size="sm">New</Badge>
                    </div>
                  )}
                  {(t.use_count ?? 0) >= (popularityThreshold ?? 0) && (popularityThreshold ?? 0) > 0 && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="default" size="sm">Popular</Badge>
                    </div>
                  )}
                  <TemplateCard
                    title={t.name}
                    description={t.description}
                    imageUrl={t.thumbnail}
                    orientation={t.orientation}
                    onSelect={() => onApply?.(t)}
                    loading={applyingId === t.id}
                    isFavorited={!!t.is_favorited}
                    onToggleFavorite={(nextValue) => onToggleFavorite?.(t, nextValue)}
                    data-tour={absoluteIndex === 0 ? 'first-card' : undefined}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
