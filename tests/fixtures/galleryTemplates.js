/**
 * Shared fixture for Phase 171 gallery tests.
 *
 * Emits rows matching the `gallery_templates` VIEW contract defined in
 * `src/services/templateGalleryService.js` (Phase 170 — DO NOT camelCase).
 *
 * The service returns 21 snake_case columns straight from Postgres; callers
 * (including the new TemplateGalleryPage) are expected to consume this shape
 * as-is per D-08. Tests therefore MUST assert against the same casing.
 *
 * Shape exported:
 *  - `createMockGalleryRow(overrides)` — factory for a single row
 *  - `mockGalleryRows()` — 10-row dataset covering every filter/sort axis
 *
 * Dataset axes exercised:
 *  - 3 categories: "Menu", "Promo", "Events"
 *  - 3 tag pools: ["Food","Restaurant"], ["Sale","Retail"], ["Party","Social"]
 *  - orientations: 6 landscape, 3 portrait, 1 NULL (polotno row)
 *  - use_count: 0,1,3,5,8,12,20,45,60,100 — top-20% = 2 rows earn "Popular"
 *  - created_at: 5 within last 30 days ("New"), 5 older ("not New")
 *  - editor_type: 9 svg, 1 polotno
 *  - one uniquely-named row ("Neon Deal Poster") for fuzzy-search tests
 */

export function createMockGalleryRow(overrides = {}) {
  return {
    id: 'tpl-default-id',
    source_table: 'svg_templates',
    editor_type: 'svg',
    name: 'Restaurant Menu',
    description: 'Daily specials and featured dishes',
    category: 'Menu',
    tags: ['Food', 'Restaurant'],
    orientation: 'landscape',
    thumbnail: 'https://example.test/tpl-default.png',
    svg_url: 'https://example.test/tpl-default.svg',
    svg_content: null,
    design_json: null,
    width: 1920,
    height: 1080,
    tenant_id: 'tenant-a',
    created_by: null,
    // 10 days ago by default
    created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    updated_at: new Date().toISOString(),
    use_count: 5,
    is_featured: false,
    is_active: true,
    slug: 'restaurant-menu',
    ...overrides,
  };
}

export function mockGalleryRows() {
  return [
    createMockGalleryRow({
      id: 'r1',
      name: 'Restaurant Menu',
      category: 'Menu',
      tags: ['Food', 'Restaurant'],
      orientation: 'landscape',
      use_count: 5,
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r2',
      name: 'Happy Hour Special',
      category: 'Menu',
      tags: ['Food'],
      orientation: 'portrait',
      use_count: 1,
      created_at: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r3',
      name: 'Summer Sale Banner',
      category: 'Promo',
      tags: ['Sale', 'Retail'],
      orientation: 'landscape',
      use_count: 45,
      created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r4',
      name: 'Clearance Flyer',
      category: 'Promo',
      tags: ['Sale'],
      orientation: 'landscape',
      use_count: 20,
      created_at: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r5',
      name: 'Grand Opening Poster',
      category: 'Events',
      tags: ['Party', 'Social'],
      orientation: 'portrait',
      use_count: 3,
      created_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r6',
      name: 'Birthday Bash',
      category: 'Events',
      tags: ['Party'],
      orientation: 'portrait',
      use_count: 0,
      created_at: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r7',
      name: 'Neon Deal Poster',
      category: 'Promo',
      tags: ['Sale', 'Retail'],
      orientation: 'landscape',
      use_count: 60,
      created_at: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r8',
      name: 'Chef Special',
      category: 'Menu',
      tags: ['Food', 'Restaurant'],
      orientation: 'landscape',
      use_count: 8,
      created_at: new Date(Date.now() - 15 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r9',
      name: 'Holiday Event',
      category: 'Events',
      tags: ['Social'],
      orientation: 'landscape',
      use_count: 12,
      created_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
    }),
    createMockGalleryRow({
      id: 'r10',
      name: 'Corporate Slides',
      category: 'Events',
      tags: ['Social'],
      orientation: null,
      use_count: 100,
      created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      editor_type: 'polotno',
      source_table: 'template_library',
    }),
  ];
}
