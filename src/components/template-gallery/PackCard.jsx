import { LayoutTemplate } from 'lucide-react';
import { Card, CardContent, Badge } from '../../design-system';

/**
 * PackCard — 2x2 mosaic card for a starter pack (Phase 173 — TPCK-04).
 *
 * Layout:
 *   [aspect-video image region]
 *     - thumbnail_url short-circuits the mosaic (D-17)
 *     - else: 2x2 grid of first 4 member thumbnails; brand-tinted placeholder
 *       for missing/empty cells (D-12)
 *     - count badge absolute top-2 right-2 ('N templates' copy per UI-SPEC)
 *   [CardContent]
 *     - pack.name (text-sm font-semibold truncate)
 *     - industry Badge below
 *
 * Click guards: Card primitive's onClick handler is invoked via onSelect prop.
 *
 * @param {{
 *   pack: {
 *     id: string,
 *     name: string,
 *     industry?: string,
 *     thumbnail_url?: string|null,
 *     member_thumbnails?: string[],
 *     member_count: number,
 *   },
 *   onSelect: () => void,
 * }} props
 */
export default function PackCard({ pack, onSelect }) {
  const tiles = Array.from({ length: 4 }, (_, i) => pack.member_thumbnails?.[i] || null);

  return (
    <Card
      onClick={onSelect}
      padding="none"
      className="cursor-pointer hover:shadow-elevated transition-shadow duration-200 ease-out overflow-hidden"
      data-testid={`pack-card-${pack.id}`}
    >
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {pack.thumbnail_url ? (
          <img
            src={pack.thumbnail_url}
            alt={pack.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // 2x2 mosaic — UI-SPEC mandates gap-1 (4px), grid-aligned
          <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
            {tiles.map((src, i) =>
              src ? (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div
                  key={i}
                  aria-hidden="true"
                  className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center"
                >
                  <LayoutTemplate size={18} className="text-brand-300" />
                </div>
              )
            )}
          </div>
        )}
        {/* Count badge — UI-SPEC mandates 'N templates' copy + bg-brand-500 */}
        <div className="absolute top-2 right-2">
          <span className="inline-block bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {pack.member_count} templates
          </span>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{pack.name}</h3>
        {pack.industry && (
          <div className="mt-1">
            <Badge variant="default" size="sm">{pack.industry}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
