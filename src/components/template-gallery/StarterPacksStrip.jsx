import { useEffect, useState } from 'react';
import { fetchStarterPacks } from '../../services/marketplaceService';
import PackCard from './PackCard';

const SKELETON_COUNT = 3;

/**
 * StarterPacksStrip — horizontal lane above the gallery template grid.
 * Phase 173 (TPCK-01). Hidden by parent (TemplateGalleryPage) when search
 * input is non-empty per CONTEXT D-11.
 *
 * Empty state: if zero packs returned, the strip renders NOTHING (collapses
 * entirely — UI-SPEC §Copywriting "No starter packs available — strip
 * collapses entirely").
 *
 * Data enrichment: fetchStarterPacks (Plan 05) returns pack rows only —
 * member_thumbnails and member_count are NOT aggregated server-side in v20.0.
 * PackCard renders graceful fallback (all-placeholder mosaic + '0 templates')
 * when both are absent. Plan 08 or a follow-up may add a server-side
 * aggregation to fetchStarterPacks SELECT (OQ-2 resolved A1).
 *
 * @param {{ onSelect: (packId: string, packs: Array, index: number) => void }} props
 */
export default function StarterPacksStrip({ onSelect }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStarterPacks()
      .then((rows) => {
        if (cancelled) return;
        setPacks(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[StarterPacksStrip] fetch failed:', err);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section aria-label="Starter Packs (loading)" className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Starter Packs</h2>
        <div className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64">
              <div className="aspect-video bg-gray-100 animate-pulse rounded-card" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <hr className="border-gray-200 my-6" />
      </section>
    );
  }

  // Empty: strip collapses entirely (UI-SPEC empty state)
  if (!packs.length || error) return null;

  return (
    <section aria-label="Starter Packs" className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Starter Packs</h2>
      <div className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {packs.map((pack, i) => (
          <div key={pack.id} className="flex-shrink-0 w-64">
            <PackCard
              pack={{
                ...pack,
                member_thumbnails: pack.member_thumbnails || [],
                member_count: pack.member_count ?? 0,
              }}
              onSelect={() => onSelect?.(pack.id, packs, i)}
            />
          </div>
        ))}
      </div>
      <hr className="border-gray-200 my-6" />
    </section>
  );
}
