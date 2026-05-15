# Phase 173: Starter Packs + Favorites — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 18 (10 NEW, 8 MODIFIED)
**Analogs found:** 18 / 18

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/171_template_packs.sql` | DB migration (DDL + RLS) | schema | `supabase/migrations/167_gallery_templates_view_and_rls.sql` + `094_svg_templates.sql` + `080_template_marketplace.sql` | exact (idempotent + RLS) |
| `supabase/migrations/172_template_favorites.sql` | DB migration (DDL + RLS + VIEW) | schema | `supabase/migrations/167_gallery_templates_view_and_rls.sql` (VIEW) + `094_svg_templates.sql` (per-row RLS) | exact |
| `supabase/migrations/173_apply_starter_pack.sql` | RPC / PL-pgSQL function | bulk write (atomic transaction) | `supabase/migrations/170_clone_svg_template_to_scene.sql` (svg branch) + `168_clone_template_with_customization.sql` (polotno branch) | exact (inline both bodies) |
| `src/services/marketplaceService.js` (extend) | Service (CRUD + RPC wrapper) | request-response | self — existing exports `createTemplate`, `addTemplateSlide`, `reorderTemplateSlides` (lines 191-395) | exact (extend in place) |
| `src/services/templateGalleryService.js` (extend) | Service (read VIEW + toggle) | request-response | self — existing `fetchGalleryTemplates` shape (lines 39-70) | exact (extend in place) |
| `src/design-system/components/FavoriteButton.jsx` (NEW) | Design-system primitive (icon button + optimistic state) | event → async write | `src/design-system/components/Button.jsx` (forwardRef pattern) + the loading-toggle pattern in `TemplateCard` (lines 93-110) + Apply pattern in `TemplatePreviewModal` (lines 105-122, but inverted to optimistic) | role-match (primitive + optimistic UI) |
| `src/design-system/components/TemplateCard.jsx` (modify) | Design-system component (add slot) | render-only | self — existing image overlay slots (lines 67-91, "Featured badge" slot at top-2 left-2) | exact (mirror slot for top-right heart) |
| `src/components/template-gallery/PackCard.jsx` (NEW) | UI component (card + mosaic) | render-only | `src/design-system/components/TemplateCard.jsx` (image-region + footer info layout, lines 50-130) + `src/design-system/components/Card.jsx` (composition base) | exact (compose Card primitive) |
| `src/components/template-gallery/StarterPacksStrip.jsx` (NEW) | UI component (horizontal strip + skeleton) | render-only | `src/pages/TemplateGalleryPage.jsx` Loading branch (lines 447-461 — `TemplateCardSkeleton` × N) + `StaggeredPageTransition` usage (lines 533-563) | role-match (skeleton + grid) |
| `src/components/template-gallery/PackPreviewModal.jsx` (NEW) | UI component (full-screen modal) | event-driven (open/close + apply) | `src/components/template-gallery/TemplatePreviewModal.jsx` (entire file, 314 lines) | exact (clone chrome) |
| `src/components/template-gallery/TemplatePreviewModal.jsx` (modify) | UI component (header slot) | render-only | self — existing toolbar (lines 172-190) | exact (mirror slot for heart in header) |
| `src/pages/TemplateGalleryPage.jsx` (modify) | Page (mount strip + favorites chip + URL param) | request-response + render | self — existing `filterBar` (lines 323-383), `useSearchParams` (line 111-126), Content branch (lines 527-574) | exact (extend in place) |
| `src/pages/Admin/AdminStarterPacksPage.jsx` (NEW) | Admin page (list + drill-in editor) | CRUD | `src/pages/Admin/AdminTemplatesPage.jsx` (chrome, lines 1-200) + `src/pages/Admin/AdminEditTemplatePage.jsx` (drill-in editor pattern, lines 1-100) | exact |
| `src/App.jsx` (modify) | Route registry (pageMap + adminToolPages) | event-driven (currentPage state) | self — `admin-templates` registration at lines 119, 559, 670 | exact (mirror admin-templates wiring) |
| `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` (NEW) | Integration test (vitest) | mocked RPC | `tests/integration/preview-apply/svg-rpc-atomicity.test.js` (entire file, 97 lines) | exact (clone shape) |
| `tests/unit/services/marketplaceService.test.js` (extend) | Unit test (vitest) | mocked supabase client | self — existing supabase mock setup (lines 1-65) | exact (extend in place) |
| `tests/e2e/starter-packs.spec.js` (NEW) | E2E (Playwright) | login → click → assert toast | `tests/e2e/preview-apply.spec.js` (helpers, fiber-BFS, login flow, lines 1-120) | exact (clone shape; rename helpers) |
| `tests/e2e/favorites.spec.js` (NEW) | E2E (Playwright) | login → toggle → re-login | `tests/e2e/preview-apply.spec.js` (login flow + structural assertions) | role-match (no fiber-BFS needed; toast + element-state assertions instead) |

---

## Pattern Assignments

### `supabase/migrations/171_template_packs.sql` (DB migration, schema)

**Analog:** `supabase/migrations/094_svg_templates.sql` (table shape) + `167_gallery_templates_view_and_rls.sql` (idempotent guards + RLS pattern) + `080_template_marketplace.sql` (admin-only RLS), with `is_super_admin()` helper from `012_finalize_rls_rbac.sql:28`.

**Idempotent DDL pattern** (167 lines 20-25, 167 lines 23-25):
```sql
ALTER TABLE svg_templates
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_svg_templates_slug
  ON svg_templates(slug)
  WHERE slug IS NOT NULL;
```
Mirror with `CREATE TABLE IF NOT EXISTS public.template_packs (...)`, partial UNIQUE index on `slug WHERE slug IS NOT NULL`, and `CREATE INDEX IF NOT EXISTS` for `(is_active, tenant_id)` and `display_order`.

**RLS scoped-SELECT pattern** (167 lines 35-45 — closes the cross-tenant leak):
```sql
DROP POLICY IF EXISTS "svg_templates_select" ON svg_templates;

CREATE POLICY "svg_templates_select" ON svg_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (tenant_id IS NULL OR created_by = auth.uid())
  );
```
Mirror for `template_packs` SELECT with the predicate from CONTEXT D-03: `is_active = TRUE AND (tenant_id IS NULL OR tenant_id = auth.uid())`.

**`is_super_admin()` helper** (012 lines 28-37):
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;
```
Use directly in `template_packs` INSERT/UPDATE/DELETE policies: `WITH CHECK (is_super_admin() OR tenant_id = auth.uid())`.

**Junction-table-via-parent RLS pattern** (research-recommended; new pattern, no direct in-repo analog — Phase 173 introduces it). Use `EXISTS (SELECT 1 FROM template_packs p WHERE p.id = template_pack_items.pack_id AND ...)` for `template_pack_items` policies.

**Polymorphic editor_type CHECK** (mirror `gallery_templates` VIEW discriminator at 167 lines 222, 251):
```sql
editor_type TEXT NOT NULL CHECK (editor_type IN ('svg','polotno'))
```

---

### `supabase/migrations/172_template_favorites.sql` (DB migration, schema + VIEW)

**Analog:** `supabase/migrations/167_gallery_templates_view_and_rls.sql` for the VIEW pattern; `094_svg_templates.sql` per-row RLS shape.

**Per-user RLS pattern** (per-user write surface — mirrors `is_super_admin` helper auth pattern but scoped):
```sql
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_favorites_select" ON template_favorites;
CREATE POLICY "template_favorites_select" ON template_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```
Three policies (SELECT/INSERT/DELETE) — no UPDATE (toggle = insert/delete).

**VIEW UNION + caller RLS pattern** (167 lines 217-275):
```sql
CREATE OR REPLACE VIEW gallery_templates AS
SELECT id, 'svg_templates'::text AS source_table, 'svg'::text AS editor_type, ... FROM svg_templates WHERE is_active = TRUE
UNION ALL
SELECT id, 'template_library'::text AS source_table, 'polotno'::text AS editor_type, ... FROM template_library WHERE is_active = TRUE;
```
For `gallery_templates_with_favorites`, **do not duplicate the UNION** — left-join `template_favorites` against `gallery_templates`:
```sql
CREATE OR REPLACE VIEW public.gallery_templates_with_favorites AS
SELECT gt.*,
  (tf.user_id IS NOT NULL) AS is_favorited
FROM public.gallery_templates gt
LEFT JOIN public.template_favorites tf
  ON tf.template_id = gt.id
 AND tf.editor_type = gt.editor_type
 AND tf.user_id     = auth.uid();

COMMENT ON VIEW public.gallery_templates_with_favorites IS
  'Phase 173: caller-auth VIEW; auth.uid() filters the LEFT JOIN.';
```

**Self-asserting verification block** (167 lines 292-320, optional but project-conventional):
```sql
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM gallery_templates_with_favorites;
  ASSERT v_count >= 0;  -- VIEW callable
END $$;
```

---

### `supabase/migrations/173_apply_starter_pack.sql` (RPC, bulk-write atomic)

**Analog:** `supabase/migrations/170_clone_svg_template_to_scene.sql` (svg branch — entire file is the blueprint) + `supabase/migrations/168_clone_template_with_customization.sql` (polotno branch).

**RPC scaffold pattern** (170 lines 35-44):
```sql
CREATE OR REPLACE FUNCTION public.clone_svg_template_to_scene(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL,
  p_customized_svg text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_template svg_templates%ROWTYPE;
  ...
```
Mirror with `apply_starter_pack(p_pack_id uuid) RETURNS uuid[]` — same `LANGUAGE plpgsql`, same `SECURITY DEFINER`, same `SET search_path = public`.

**Auth preamble pattern** (170 lines 52-56):
```sql
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;
```

**super_admin bypass pattern** (170 lines 65-77 — mirror for pack access):
```sql
IF v_template IS NULL THEN
  SELECT role = 'super_admin' INTO v_has_access
  FROM profiles
  WHERE id = v_user_id;
  IF v_has_access THEN
    SELECT * INTO v_template FROM svg_templates
    WHERE id = p_template_id AND is_active = TRUE;
  END IF;
END IF;
```
Apply at TWO levels in the new RPC: pack access (with `template_packs` RLS predicate) AND member access (mirror per-source-table predicate).

**SVG branch (member loop body — verbatim from 170 lines 58-138)**:
```sql
-- Get template — mirrors svg_templates SELECT RLS
SELECT * INTO v_template
FROM svg_templates
WHERE id = p_template_id
  AND is_active = TRUE
  AND (tenant_id IS NULL OR created_by = v_user_id);

IF v_template IS NULL THEN
  RAISE EXCEPTION 'Template not found or inactive';
END IF;

-- Create new scene
INSERT INTO scenes (tenant_id, name, business_type, settings, is_active)
VALUES (
  v_user_id,
  COALESCE(p_scene_name, v_template.name || ' (Copy)'),
  v_template.category,
  jsonb_build_object('width', v_template.width, 'height', v_template.height, 'orientation', v_template.orientation),
  true
)
RETURNING id INTO v_new_scene_id;

INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
VALUES (
  v_new_scene_id, 0, v_template.name, 'default',
  jsonb_build_object('svgContent', v_resolved_svg),
  10
);
```
Adaptation per CONTEXT D-08 (no customization): drop the `p_customized_svg` 3-way resolution — write `jsonb_build_object('svgContent', v_svg_template.svg_content)` directly. Per CONTEXT Claude's Discretion (scene naming): use `v_svg_template.name` (no `(Copy)` suffix).

**Polotno branch (member loop body — verbatim from 168 lines 63-143)**:
```sql
SELECT * INTO v_template
FROM template_library
WHERE id = p_template_id AND is_active = true;

IF v_template IS NULL THEN
  RAISE EXCEPTION 'Template not found or inactive';
END IF;

-- License gate (Phase 166.2 D-01)
IF v_template.license IN ('free', 'pro') THEN
  v_has_access := true;
ELSIF v_template.license = 'enterprise' THEN
  SELECT EXISTS (
    SELECT 1 FROM template_enterprise_access
    WHERE template_id = p_template_id AND tenant_id = v_user_id
  ) INTO v_has_access;
END IF;
IF NOT v_has_access THEN
  SELECT role = 'super_admin' INTO v_has_access FROM profiles WHERE id = v_user_id;
END IF;
IF NOT v_has_access THEN
  RAISE EXCEPTION 'Access denied: insufficient plan tier for this template';
END IF;

INSERT INTO scenes (tenant_id, name, business_type, settings, is_active) VALUES (...) RETURNING id INTO v_new_scene_id;

FOR v_slide IN
  SELECT position, title, kind, design_json, duration_seconds
  FROM template_library_slides
  WHERE template_id = p_template_id
  ORDER BY position
LOOP
  INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
  VALUES (v_new_scene_id, v_slide.position, v_slide.title, v_slide.kind, v_slide.design_json, v_slide.duration_seconds);
END LOOP;
```
Adaptation: drop the `CASE WHEN p_customized_svg IS NOT NULL THEN jsonb_set(...)` patch (D-08). Use raw `v_slide.design_json`.

**Member loop wrapper** (NEW — wraps the two branches from 168/170):
```sql
FOR v_member IN
  SELECT * FROM template_pack_items
  WHERE pack_id = p_pack_id
  ORDER BY position ASC, template_id ASC
LOOP
  IF v_member.editor_type = 'svg' THEN
    -- [svg-branch from 170 above]
  ELSIF v_member.editor_type = 'polotno' THEN
    -- [polotno-branch from 168 above]
  ELSE
    RAISE EXCEPTION 'Unknown editor_type in pack member: %', v_member.editor_type;
  END IF;
  v_result := array_append(v_result, v_new_scene_id);
END LOOP;
```

**Footer pattern** (170 lines 140-143):
```sql
GRANT EXECUTE ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) IS
  'Phase 172.1: Atomic clone of an svg_templates row...';
```
Mirror with `GRANT EXECUTE ON FUNCTION public.apply_starter_pack(uuid) TO authenticated;` and a Phase 173 COMMENT.

---

### `src/services/marketplaceService.js` (service, extend in place)

**Analog:** self — `marketplaceService.js` already hosts CRUD primitives.

**Imports pattern** (lines 1-9):
```js
/**
 * Marketplace Service
 */
import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
```
Append new exports below the existing `revokeEnterpriseAccess` export (around line 449); no new imports required.

**Existing CRUD pattern** (lines 191-260 — `createTemplate`, `updateTemplate`, `deleteTemplate`):
```js
export async function createTemplate(template) {
  const { data, error } = await supabase
    .from('template_library')
    .insert({...})
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('template_library')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}
```
Mirror exactly for `createPack`, `updatePack`, `deletePack`, `addPackItem`, `removePackItem`.

**Existing reorder pattern** (lines 384-395 — `reorderTemplateSlides`, parallel UPDATEs OK because no UNIQUE on `(template_id, position)`):
```js
export async function reorderTemplateSlides(templateId, slideOrder) {
  const updates = slideOrder.map(({ id, position }) =>
    supabase
      .from('template_library_slides')
      .update({ position })
      .eq('id', id)
      .eq('template_id', templateId)
  );
  await Promise.all(updates);
}
```
Mirror for `reorderPackItems(packId, orderedItems)` with composite WHERE (`pack_id` + `template_id` + `editor_type`). Per RESEARCH Pitfall 4: confirmed safe because `template_pack_items` PK is `(pack_id, template_id, editor_type)`, NOT `(pack_id, position)`.

**Existing RPC wrapper pattern** (lines 173-180 — `verifyTemplatePermissions`):
```js
export async function verifyTemplatePermissions(templateId) {
  const { data, error } = await supabase.rpc('can_access_template', {
    p_template_id: templateId,
  });
  if (error) throw error;
  return data === true;
}
```
Mirror for `applyStarterPack(packId)`:
```js
export async function applyStarterPack(packId) {
  const { data, error } = await supabase.rpc('apply_starter_pack', { p_pack_id: packId });
  if (error) throw error;
  return data ?? [];
}
```

**Section-divider comment pattern** (lines 33-35, 102-104, 146-148):
```js
// ============================================================================
// FETCH TEMPLATES
// ============================================================================
```
Add `// STARTER PACKS (Phase 173)` divider before the new exports.

---

### `src/services/templateGalleryService.js` (service, extend in place)

**Analog:** self — `fetchGalleryTemplates` (lines 39-70).

**VIEW swap (one-line change at line 51)**:
```js
let query = supabase.from('gallery_templates').select('*');
```
Change to `supabase.from('gallery_templates_with_favorites').select('*')`. Additive — `is_favorited` column appears on every returned row; existing callers ignore it transparently.

**Toggle helper pattern** (NEW — colocated; no direct analog in this file). Auth-aware write pattern from `marketplaceService.js:407-413`:
```js
export async function grantEnterpriseAccess(templateId, tenantId) {
  const { error } = await supabase
    .from('template_enterprise_access')
    .insert({
      template_id: templateId,
      tenant_id: tenantId,
      granted_by: (await supabase.auth.getUser()).data.user?.id,
    });
  if (error) throw error;
}
```
Mirror for `toggleFavorite({ templateId, editorType, nextValue })` with `(await supabase.auth.getUser()).data.user?.id` for the `user_id` column. Branch on `nextValue`: insert if true, delete if false. Tolerate `error.code === '23505'` on insert (idempotent — already-favorited).

---

### `src/design-system/components/FavoriteButton.jsx` (NEW design-system primitive)

**Analog:** `src/design-system/components/Button.jsx` (forwardRef export pattern), `src/design-system/components/TemplateCard.jsx` lines 93-110 (loading-toggle pattern), and `src/components/template-gallery/TemplatePreviewModal.jsx` lines 105-122 (async + setBusy pattern, but inverted to optimistic).

**ForwardRef + props pattern** (TemplateCard.jsx lines 22-39):
```jsx
import { forwardRef, useState } from 'react';

export const TemplateCard = forwardRef(function TemplateCard(
  {
    title,
    description,
    onSelect,
    loading = false,
    className = '',
    ...props
  },
  ref
) {
  const [imageError, setImageError] = useState(false);
  ...
});
```
Mirror for `FavoriteButton` — props: `isFavorited`, `onToggle`, `onError`, `size = 16`, `className = ''`.

**Optimistic toggle pattern** (NEW — research-recommended; inverse of TemplatePreviewModal's pessimistic `handleApply`):
TemplatePreviewModal pessimistic pattern (lines 105-122):
```jsx
const handleApply = async () => {
  setApplying(true);
  setError(null);
  try {
    const sceneId = await applyTemplate(current, { customizedSvg });
    onNavigate?.(editorRouteFor(current, sceneId));
    onClose?.();
  } catch (err) {
    setError("Couldn't apply template...");
    setApplying(false);
  }
};
```
Invert for FavoriteButton: flip `optimistic` BEFORE awaiting, revert on catch:
```jsx
const handleClick = async (e) => {
  e.stopPropagation();
  if (busy) return;
  const next = !optimistic;
  setOptimistic(next);   // optimistic flip BEFORE await
  setBusy(true);
  try {
    await onToggle(next);
  } catch (err) {
    setOptimistic(!next); // revert on error
    onError?.(err);
  } finally {
    setBusy(false);
  }
};
```

**Touch-target + a11y pattern** (per UI-SPEC §FavoriteButton):
- `min-h-12 min-w-12` Tailwind class for 48px tap area (icon is 20px, padding `p-[14px]` reaches 48px).
- `aria-pressed={optimistic}` on the `<button>`.
- `aria-label` switches: `"Add to favorites"` / `"Remove from favorites"`.
- Lucide `<Heart>` with `fill={optimistic ? 'currentColor' : 'none'}` and `className={optimistic ? 'text-brand-500' : 'text-gray-400'}` (UI-SPEC: filled red when active).

---

### `src/design-system/components/TemplateCard.jsx` (modify — add heart slot)

**Analog:** self — existing image-region badge slots (lines 82-91).

**Existing top-left badge slot** (lines 82-91):
```jsx
{/* Featured badge */}
{featured && (
  <div className="absolute top-2 left-2">
    <Badge variant="warning" size="sm" className="flex items-center gap-1">
      <Sparkles size={10} />
      Featured
    </Badge>
  </div>
)}
```
Mirror at top-2 right-2 for the FavoriteButton slot. Pass new prop `favoriteSlot` (or equivalent — planner picks; recommended: render `<FavoriteButton>` inline when `isFavorited` + `onToggleFavorite` props are provided). Click handler must `e.stopPropagation()` so the heart toggle does NOT trigger card `onSelect` (TemplateCard root onClick: line 60-64 already guards `if (e.target.closest('button')) return`).

**Card root click-guard pattern** (line 60-64 — already supports this):
```jsx
onClick={(e) => {
  // Don't trigger card click if clicking buttons
  if (e.target.closest('button')) return;
  onSelect?.();
}}
```
The existing guard means the heart button (which IS a `<button>`) automatically opts out of `onSelect`. No code change needed in the click handler.

---

### `src/components/template-gallery/PackCard.jsx` (NEW)

**Analog:** `src/design-system/components/TemplateCard.jsx` (overall card layout, lines 50-130) + `src/design-system/components/Card.jsx` (composition base, exports at lines 26, 179).

**Card root pattern** (TemplateCard.jsx lines 50-66):
```jsx
<div
  ref={ref}
  className={`
    group bg-white border border-gray-200 rounded-card overflow-hidden
    hover:shadow-elevated transition-all duration-200
    ${onSelect ? 'cursor-pointer' : ''}
    ${className}
  `.trim()}
  onClick={(e) => {
    if (e.target.closest('button')) return;
    onSelect?.();
  }}
  {...props}
>
```
Mirror — replace `border border-gray-200 rounded-card` with `Card` primitive composition (research example uses `<Card onClick={onSelect} className="cursor-pointer hover:shadow-elevated transition-shadow overflow-hidden">`).

**Image-region pattern** (TemplateCard.jsx lines 67-91):
```jsx
<div className={`${aspectClass} bg-gray-100 relative overflow-hidden`}>
  {imageUrl && !imageError ? (
    <img src={imageUrl} alt={title} className="w-full h-full object-cover" onError={() => setImageError(true)} />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <LayoutTemplate size={32} className="text-gray-300" />
    </div>
  )}
  ...
</div>
```
Adapt for 2×2 mosaic per UI-SPEC §PackCard: `aspect-video bg-gray-100 relative overflow-hidden`, with `pack.thumbnail_url` short-circuit OR a `grid grid-cols-2 grid-rows-2 gap-1` of 4 mosaic cells (UI-SPEC mandates `gap-1` = 4px). Each cell: `<img>` or brand-tinted placeholder (`bg-gradient-to-br from-brand-50 to-brand-100`).

**Count badge pattern** (TemplateCard.jsx lines 82-90, but recolored per UI-SPEC):
```jsx
<div className="absolute top-2 left-2">
  <Badge variant="warning" size="sm" className="flex items-center gap-1">
    <Sparkles size={10} />
    Featured
  </Badge>
</div>
```
Adapt for count badge — UI-SPEC dictates `bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full` at corner of mosaic; copy is `"N templates"` (e.g. "8 templates"), NOT just the integer.

**Footer info pattern** (TemplateCard.jsx lines 114-130):
```jsx
<div className="p-3">
  <h3 className="font-medium text-gray-900 text-sm truncate">{title}</h3>
  ...
  <div className="flex items-center gap-2 mt-2 flex-wrap">
    {category && (
      <Badge variant="neutral" size="sm">{category}</Badge>
    )}
  </div>
</div>
```
Adapt — title is `pack.name` (per UI-SPEC `text-sm font-semibold` not `font-medium`), industry as `<Badge variant="default" size="sm">{pack.industry}</Badge>` below.

**`data-testid` pattern** (recommended for E2E): use `data-testid={`pack-card-${pack.id}`}` per RESEARCH Example 4.

---

### `src/components/template-gallery/StarterPacksStrip.jsx` (NEW)

**Analog:** `src/pages/TemplateGalleryPage.jsx` Loading branch (lines 447-461) for skeleton + `StaggeredPageTransition` usage (lines 533-563).

**Skeleton-row-during-load pattern** (TemplateGalleryPage lines 447-461):
```jsx
if (isFetching) {
  return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" />
      <PageContent>
        <TemplateCardGrid columns={4}>
          {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </TemplateCardGrid>
      </PageContent>
    </PageLayout>
  );
}
```
Mirror — render 3 PackCard-shaped skeletons during `isLoading`. Use existing `TemplateCardSkeleton` (TemplateCard.jsx lines 167-188) as the shape baseline:
```jsx
<div className="aspect-video bg-gray-100 animate-pulse" />
<div className="p-3 space-y-2">
  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
  ...
</div>
```

**Strip layout** (per UI-SPEC §StarterPacksStrip — no direct analog; closest is the filter-bar wrap pattern at TemplateGalleryPage line 324):
```jsx
<div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-4 flex items-center gap-3 flex-wrap">
```
Strip uses `flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-thin` (per UI-SPEC) — horizontal scroll, not sticky. Strip title `h2` styling: `text-base font-semibold text-gray-800` (UI-SPEC subheading row). Section separator below: `<hr className="border-gray-200 my-6">`.

**StaggeredPageTransition wrapper** (TemplateGalleryPage lines 533-563) — apply if pack count is small enough that staggered entrance reads well; planner decides.

---

### `src/components/template-gallery/PackPreviewModal.jsx` (NEW)

**Analog:** `src/components/template-gallery/TemplatePreviewModal.jsx` — entire file (314 lines).

**Imports pattern** (TemplatePreviewModal lines 13-23):
```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  Modal,
  Button,
  Badge,
  Alert,
} from '../../design-system';
import QuickCustomizePanel from './QuickCustomizePanel';
import { applyTemplate, editorRouteFor } from '../../services/templateApplyService';
```
Adapt — drop `DOMPurify`, drop `QuickCustomizePanel`, drop `applyTemplate`/`editorRouteFor`. Add `import { applyStarterPack, fetchPackDetail } from '../../services/marketplaceService';` and `import { Package } from 'lucide-react';`.

**Snapshot-on-open pattern** (TemplatePreviewModal lines 38-50 — Pitfall 7 fix):
```jsx
const snapshotRef = useRef(null);
useEffect(() => {
  if (open && !snapshotRef.current) {
    snapshotRef.current = Array.isArray(templates) ? [...templates] : [];
  }
  if (!open) {
    snapshotRef.current = null; // reset for next open
  }
}, [open, templates]);
const snapshot = snapshotRef.current || (Array.isArray(templates) ? templates : []);
```
Mirror exactly with `packs` instead of `templates`.

**Prev/Next + keyboard pattern** (TemplatePreviewModal lines 71-103):
```jsx
const onPrev = () => {
  if (total < 2) return;
  setCustomizedSvg(null);
  setError(null);
  setCurrentIndex((i) => (i - 1 + total) % total);
};
const onNext = () => {
  if (total < 2) return;
  setCustomizedSvg(null);
  setError(null);
  setCurrentIndex((i) => (i + 1) % total);
};

useEffect(() => {
  if (!open) return undefined;
  const handler = (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onPrev();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNext();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [open, total]);
```
Mirror exactly — drop the `setCustomizedSvg(null)` line (no customization in pack flow per D-08).

**Apply pattern** (TemplatePreviewModal lines 105-122 — pessimistic, success-closes):
```jsx
const handleApply = async () => {
  if (!current) return;
  setApplying(true);
  setError(null);
  try {
    const sceneId = await applyTemplate(current, { customizedSvg });
    onNavigate?.(editorRouteFor(current, sceneId));
    onClose?.();
  } catch (err) {
    console.error('[TemplatePreviewModal] Apply failed:', err);
    setError("Couldn't apply template...");
    setApplying(false);
  }
};
```
Adapt for pack apply per CONTEXT D-14 (success = toast + 'View scenes' action; modal closes; **no navigation**) and D-15 (failure = inline toast + button re-enables; modal stays open):
```jsx
const handleApply = async () => {
  if (!currentPack) return;
  setApplying(true);
  setError(null);
  try {
    const sceneIds = await applyStarterPack(currentPack.id);
    showToast?.({
      variant: 'success',
      heading: `Added ${sceneIds.length} templates from ${currentPack.name}`,
      action: { label: 'View scenes', onClick: () => onNavigate?.('scenes') },
    });
    onClose?.();
  } catch (err) {
    console.error('[PackPreviewModal] Apply failed:', err);
    setError("Couldn't apply this pack. Please try again.");
    setApplying(false);
  }
};
```

**Modal chrome pattern** (TemplatePreviewModal lines 161-292):
```jsx
<Modal
  open={open}
  onClose={onClose}
  size="full"
  closeOnOverlay={false}
  closeOnEscape
  showCloseButton={false}
  aria-labelledby="preview-title"
>
  <div className="flex flex-col h-[calc(100vh-2rem)] sm:h-[90vh] bg-white">
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
      <Button variant="ghost" size="md" onClick={onClose} aria-label="Close template preview">
        <X className="w-5 h-5" />
      </Button>
      <h2 id="preview-title" className="text-base font-semibold text-gray-900 truncate mx-4">
        {current.name}
      </h2>
      <Badge variant="default" size="sm">
        {currentIndex + 1} of {total}
      </Badge>
    </div>
    ...
  </div>
</Modal>
```
Mirror header: pack name, industry `<Badge>`, member count, close button. Body is a mini-grid of member thumbnails (per UI-SPEC: `grid grid-cols-4 gap-3` desktop / `grid-cols-2` mobile). Footer/right-rail: single Apply CTA `"Apply pack (N templates)"`.

**Prev/Next arrow positioning** (TemplatePreviewModal lines 197-217):
```jsx
{total > 1 && (
  <>
    <Button
      variant="ghost"
      size="md"
      aria-label="Previous template"
      onClick={onPrev}
      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white shadow-card rounded-full p-3"
    >
      <ChevronLeft className="w-5 h-5" />
    </Button>
    ...
```
Mirror with `aria-label="Previous pack"` / `"Next pack"` per UI-SPEC. Touch target per UI-SPEC: `h-12 w-12` (48px).

---

### `src/components/template-gallery/TemplatePreviewModal.jsx` (modify — add heart in header)

**Analog:** self — header toolbar (lines 172-190).

**Existing toolbar layout** (lines 172-190):
```jsx
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
  <Button variant="ghost" size="md" onClick={onClose} aria-label="Close template preview">
    <X className="w-5 h-5" />
  </Button>
  <h2 id="preview-title" className="text-base font-semibold text-gray-900 truncate mx-4">
    {current.name}
  </h2>
  <Badge variant="default" size="sm">
    {currentIndex + 1} of {total}
  </Badge>
</div>
```
Insert `<FavoriteButton>` before the close button (per UI-SPEC: "left of the close button" but checker note says PackPreviewModal does NOT have FavoriteButton — favorites are template-level only. So this slot is in `TemplatePreviewModal` ONLY). Pass props `isFavorited={current.is_favorited}` (sourced from the gallery_templates_with_favorites VIEW), `onToggle={(next) => toggleFavorite({ templateId: current.id, editorType: current.editor_type, nextValue: next })}`, `onError={(err) => showToast({ variant: 'error', message: 'Failed to update favorite' })}`.

---

### `src/pages/TemplateGalleryPage.jsx` (modify — mount strip + favorites chip + URL param)

**Analog:** self — existing filter wiring (lines 111-160), Content branch (lines 527-574).

**URL param pattern** (lines 111-126):
```jsx
const [searchParams, setSearchParams] = useSearchParams();
const filters = {
  q: searchParams.get('q') ?? '',
  category: searchParams.get('category') ?? '',
  tags: searchParams.getAll('tags'),
  orientation: searchParams.get('orientation') ?? '',
  sort: searchParams.get('sort') ?? 'newest',
};
```
Add: `favorites: searchParams.get('favorites') === '1'`. Extends Phase 171 D-10 filter contract.

**Strip mount point** (between `filterBar` and `activeFiltersRow` in the Content branch, around line 531):
```jsx
{filterBar}
{activeFiltersRow}
<StaggeredPageTransition>
  <TemplateCardGrid columns={4}>
    {displayedTemplates.map((t, i) => (...))}
  </TemplateCardGrid>
</StaggeredPageTransition>
```
Insert `{!filters.q && <StarterPacksStrip onSelect={(packId) => setPackPreview({ open: true, packId })} />}` between the activeFiltersRow and the StaggeredPageTransition. **Critical (RESEARCH Pitfall 5):** gate on `!filters.q` ONLY — NOT on `!hasActiveFilters` (which would hide the strip when category/orientation chips are active, violating D-11).

**TemplateCard heart wiring** (lines 552-558 — modify to pass favorite props):
```jsx
<TemplateCard
  title={t.name}
  description={t.description}
  imageUrl={t.thumbnail}
  orientation={t.orientation}
  onSelect={() => setPreviewState({ open: true, index: i })}
/>
```
Add `isFavorited={t.is_favorited}` and an `onToggleFavorite` handler that calls `toggleFavorite({ templateId: t.id, editorType: t.editor_type, nextValue: next })` and refreshes local state on success.

**Favorites filter chip** (extend filterBar at lines 323-383): add a `<ToggleChips>` or dedicated chip to the filter bar with `selected={filters.favorites}` and `onChange={(v) => updateFilter('favorites', v ? '1' : '')}`. Existing `updateFilter` writer (lines 139-155) already handles single-value URL params correctly.

**Favorites filter integration in `displayedTemplates` pipeline** (lines 260-294 — extend the filter chain):
```jsx
const displayedTemplates = useMemo(() => {
  let rows = filters.q.length >= 2 ? fuse.search(filters.q).map((r) => r.item) : allTemplates;
  if (filters.category) { rows = rows.filter((t) => t.category === filters.category); }
  ...
});
```
Add `if (filters.favorites) rows = rows.filter((t) => t.is_favorited === true);` in the chain.

**Empty-state branch** (lines 502-523 — modify the no-results EmptyState):
```jsx
if (displayedTemplates.length === 0) {
  return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" description={pageDescription} />
      <PageContent>
        {filterBar}
        {activeFiltersRow}
        <EmptyState
          icon={<SearchIllustration />}
          title="No templates match your search"
          description="Try different keywords, fewer filters, or browse the full library."
          action={<Button variant="secondary" onClick={clearAllFilters}>Browse all templates</Button>}
          size="lg"
        />
      </PageContent>
    </PageLayout>
  );
}
```
Add a separate branch when `filters.favorites === true && displayedTemplates.length === 0`: per UI-SPEC, title `"No favorites yet"`, body `"Tap the heart on any template to save it here."`, action `"Clear filter"` (clears `favorites=1` URL param).

---

### `src/pages/Admin/AdminStarterPacksPage.jsx` (NEW admin page)

**Analog:** `src/pages/Admin/AdminTemplatesPage.jsx` (chrome) + `src/pages/Admin/AdminEditTemplatePage.jsx` (drill-in editor).

**Imports + state pattern** (AdminTemplatesPage lines 1-44):
```jsx
import { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../design-system/components/PageLayout';
import {
  fetchAdminTemplates,
  fetchCategories,
  deleteTemplate,
  updateTemplate,
  LICENSE_LABELS,
} from '../../services/marketplaceService';
import BulkTemplateUpload from '../../components/Admin/BulkTemplateUpload';

export default function AdminTemplatesPage({ onNavigate }) {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  ...
}
```
Mirror — import `fetchStarterPacks`, `createPack`, `updatePack`, `deletePack`, `addPackItem`, `removePackItem`, `reorderPackItems` from `marketplaceService`. Plus `fetchGalleryTemplates` from `templateGalleryService` for the member-picker.

**Loader pattern** (AdminTemplatesPage lines 53-74):
```jsx
const loadTemplates = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await fetchAdminTemplates({...});
    setTemplates(data);
  } catch (err) {
    console.error('Failed to load templates:', err);
    setError('Failed to load templates');
  } finally {
    setLoading(false);
  }
}, [categoryFilter, licenseFilter, activeFilter]);

useEffect(() => {
  loadTemplates();
}, [loadTemplates]);
```
Mirror for `loadPacks`.

**Toggle-active pattern** (AdminTemplatesPage lines 77-85):
```jsx
const handleToggleActive = async (template) => {
  try {
    await updateTemplate(template.id, { isActive: !template.is_active });
    loadTemplates();
  } catch (err) {
    setError('Failed to update template');
  }
};
```
Mirror for `handleTogglePackActive`.

**Delete-with-confirm pattern** (AdminTemplatesPage lines 39-41, 99-113):
```jsx
const [deleteId, setDeleteId] = useState(null);
const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
  if (!deleteId) return;
  setDeleting(true);
  try {
    await deleteTemplate(deleteId);
    setDeleteId(null);
    loadTemplates();
  } catch (err) {
    setError('Failed to delete template');
  } finally {
    setDeleting(false);
  }
};
```
Mirror for pack delete. Confirmation copy per UI-SPEC: `Delete "[Pack name]"? This removes the pack but does not delete its templates...` with `Delete pack` (destructive) / `Keep pack` buttons.

**PageLayout + actions pattern** (AdminTemplatesPage lines 115-160):
```jsx
<PageLayout
  title="Template Management"
  description="Manage marketplace templates"
  actions={<div className="flex items-center gap-2">...<button>Add Template</button></div>}
>
```
Mirror with `title="Starter Packs"`, `description="Manage curated bundles of templates"`, action button label `"New pack"` (per UI-SPEC).

**Drill-in editor pattern** (AdminEditTemplatePage lines 39-74) — recommended per RESEARCH A2 (vs modal):
```jsx
export default function AdminEditTemplatePage({ templateId, onNavigate }) {
  const isNew = templateId === 'new';
  const [form, setForm] = useState({...});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  ...
}
```
Either implement a sibling `AdminEditStarterPackPage.jsx` reachable via `onNavigate('admin-starter-pack-edit-<id>')` (mirrors `admin-template-` prefix at App.jsx:672), OR fold into a single drawer/drill-in section of `AdminStarterPacksPage`. Planner decides.

**Member picker / drag-reorder** — no direct in-repo analog for HTML5 drag-reorder; planner uses `lucide GripVertical` as the handle icon (per UI-SPEC). Backing data write goes through `reorderPackItems` (see service section above).

---

### `src/App.jsx` (modify — register route)

**Analog:** self — `admin-templates` registration at lines 119, 559, 670.

**Lazy import pattern** (line 119):
```jsx
const AdminTemplatesPage = lazy(() => import('./pages/Admin/AdminTemplatesPage'));
```
Mirror with `const AdminStarterPacksPage = lazy(() => import('./pages/Admin/AdminStarterPacksPage'));`.

**pageMap entry pattern** (line 559):
```jsx
'admin-templates': <Suspense fallback={<PageLoader />}><AdminTemplatesPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
```
Mirror with `'admin-starter-packs': <Suspense fallback={<PageLoader />}><AdminStarterPacksPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,` immediately below the existing entry.

**adminToolPages array pattern** (line 670):
```jsx
const adminToolPages = [
  'admin-tenants', 'admin-audit-logs', 'admin-system-events',
  'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients', 'admin-templates'
];
```
Append `'admin-starter-packs'` to the array. **Critical (RESEARCH Pitfall 6):** without this, super_admin loses sidebar when navigating to the new page.

If the planner adds a drill-in edit route (`admin-starter-pack-edit-<id>`), add `currentPage.startsWith('admin-starter-pack-')` to the OR chain at line 672 (mirrors the existing `admin-template-` prefix at the same line).

---

### `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` (NEW)

**Analog:** `tests/integration/preview-apply/svg-rpc-atomicity.test.js` (entire file, 97 lines).

**Mock + import pattern** (svg-rpc-atomicity.test.js lines 15-29):
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((s) => s) },
}));

import { applyTemplate } from '../../../src/services/templateApplyService';
import { supabase } from '../../../src/supabase';
```
Adapt: drop the `dompurify` mock (pack apply has no SVG body in scope per D-08). Import `applyStarterPack` from `marketplaceService`.

**RPC-resolves test pattern** (svg-rpc-atomicity.test.js lines 77-88):
```js
it('RPC resolves with scene uuid — zero follow-up UPDATE issued (atomic contract, TPRV-05)', async () => {
  supabase.rpc.mockResolvedValueOnce({ data: 'new-sid', error: null });
  const sceneId = await applyTemplate(SVG_TEMPLATE, { customizedSvg: '<svg/>' });
  expect(sceneId).toBe('new-sid');
  expect(supabase.rpc.mock.calls.length).toBe(1);
  expect(supabase.rpc.mock.calls[0][0]).toBe('clone_svg_template_to_scene');
  expect(supabase.from).toBeUndefined();
});
```
Mirror with `data: ['s1','s2','s3']`, expect `applyStarterPack('pack-uuid')` to resolve to the array, `expect(supabase.rpc.mock.calls[0][0]).toBe('apply_starter_pack')`, `expect(supabase.rpc.mock.calls[0][1]).toEqual({ p_pack_id: 'pack-uuid' })`.

**RPC-rejects test pattern** (svg-rpc-atomicity.test.js lines 64-75):
```js
it("RPC rejects with 'Template has no SVG body' — applyTemplate throws same message (D-05)", async () => {
  supabase.rpc.mockResolvedValueOnce({
    data: null,
    error: new Error('Template has no SVG body'),
  });
  await expect(
    applyTemplate(SVG_TEMPLATE, { customizedSvg: null }),
  ).rejects.toThrow(/Template has no SVG body/);
  expect(supabase.rpc).toHaveBeenCalledTimes(1);
});
```
Mirror with the rollback error string from the new RPC: `'SVG member template not found or inactive'` or `'Pack not found or inactive'`.

**Add an empty-pack test**: `data: [], error: null` → expect `applyStarterPack('empty-pack')` to resolve to `[]` (per A7 in RESEARCH).

---

### `tests/unit/services/marketplaceService.test.js` (extend)

**Analog:** self — existing supabase mock setup (lines 1-65).

**Mock pattern** (lines 9-47):
```js
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-template-id' }, error: null }),
        })),
      })),
      update: vi.fn(() => ({...})),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  },
}));
```
Reuse the existing mock (no new shape needed — `from`/`rpc`/`auth.getUser` cover all new exports).

**Existing test block pattern** (lines 71-113):
```js
describe('marketplaceService constants', () => {
  describe('TEMPLATE_TYPES', () => {
    it('exports SCENE type', () => {
      expect(TEMPLATE_TYPES.SCENE).toBe('scene');
    });
  });
});
```
Append new `describe('marketplaceService pack CRUD')` and `describe('marketplaceService applyStarterPack')` blocks at the end, importing `fetchStarterPacks`, `fetchPackDetail`, `createPack`, `applyStarterPack` from `marketplaceService`.

---

### `tests/e2e/starter-packs.spec.js` (NEW)

**Analog:** `tests/e2e/preview-apply.spec.js` (entire file).

**Skip-on-missing-creds + login pattern** (preview-apply.spec.js lines 36-40 + helpers.js):
```js
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';
```
Mirror — same import.

**Goto-templates helper pattern** (preview-apply.spec.js lines 48-59):
```js
async function gotoTemplates(page) {
  const templatesBtn = page.getByRole('button', { name: /^Templates$/i }).first();
  await templatesBtn.waitFor({ state: 'visible', timeout: 15000 });
  await templatesBtn.click();
  await page.getByRole('heading', { name: /^Templates$/ }).first().waitFor({ state: 'visible', timeout: 15000 });
  await waitForPageReady(page);
}
```
Mirror exactly.

**Structural assertion pattern** — per RESEARCH Pitfall 7, do NOT reuse `readCurrentPage` for the success path (pack apply does NOT navigate). Assert toast presence + member-count substring instead:
```js
await expect(page.getByText(/Added \d+ templates from /i)).toBeVisible({ timeout: 10000 });
```
Plus a follow-up assertion that visiting `/app/scenes` shows the new rows.

**`data-testid` pattern** — use `page.getByTestId(`pack-card-${packId}`)` (matches the `data-testid` set in PackCard).

**Critical:** name the file `starter-packs.spec.js` NOT `template-packs.spec.js` — the latter exists and targets the legacy onboarding pack flow (per CONTEXT D-02).

---

### `tests/e2e/favorites.spec.js` (NEW)

**Analog:** `tests/e2e/preview-apply.spec.js` (login flow + structural assertions).

**Login pattern** (preview-apply.spec.js lines 36-37):
Same imports. Use `loginAndPrepare(page)` per spec.

**Toggle-from-card test shape**:
1. Log in, goto Templates.
2. Click the heart button on the first template card.
3. Assert the heart icon now has `aria-pressed="true"` and the filled-class.
4. Reload page; assert heart is still `aria-pressed="true"`.

**Toggle-from-modal test shape**:
1. Open `TemplatePreviewModal` from a card.
2. Click the heart in the modal header.
3. Close modal; assert the corresponding card heart now reflects favorited state.

**Filter-chip test shape**:
1. Toggle favorites chip.
2. Assert URL contains `?favorites=1`.
3. Assert grid shows only favorited rows.
4. Toggle off; assert grid restores.

**Persistence test shape**:
1. Favorite a template.
2. Logout, log back in.
3. Assert template is still favorited.

**Empty state test shape**:
1. (DELETE pre-test favorites for the test user to ensure clean state — RESEARCH OQ-4.)
2. Toggle favorites filter on with zero favorites.
3. Assert `EmptyState` shows the "No favorites yet" copy from UI-SPEC.

---

## Shared Patterns

### Pattern A: Idempotent Migration DDL
**Source:** `supabase/migrations/167_gallery_templates_view_and_rls.sql` lines 20-45.
**Apply to:** All three new migrations (171, 172, 173).
```sql
ALTER TABLE svg_templates
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_svg_templates_slug
  ON svg_templates(slug)
  WHERE slug IS NOT NULL;

DROP POLICY IF EXISTS "svg_templates_select" ON svg_templates;
CREATE POLICY "svg_templates_select" ON svg_templates
  FOR SELECT TO authenticated
  USING (...);
```
Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE OR REPLACE VIEW`, and `DROP POLICY IF EXISTS` + `CREATE POLICY` pairs. **No DOWN migrations.**

### Pattern B: SECURITY DEFINER RPC Footer
**Source:** `supabase/migrations/170_clone_svg_template_to_scene.sql` lines 140-143.
**Apply to:** All new RPCs (just `apply_starter_pack` in this phase).
```sql
GRANT EXECUTE ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) IS
  'Phase 172.1: Atomic clone of an svg_templates row...';
```

### Pattern C: Auth Preamble in PL/pgSQL
**Source:** `supabase/migrations/170_clone_svg_template_to_scene.sql` lines 52-56.
**Apply to:** `apply_starter_pack` RPC.
```sql
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;
```

### Pattern D: super_admin Bypass Block
**Source:** `supabase/migrations/170_clone_svg_template_to_scene.sql` lines 65-77.
**Apply to:** `apply_starter_pack` RPC (pack-level access AND per-member SVG access).
```sql
IF v_template IS NULL THEN
  SELECT role = 'super_admin' INTO v_has_access
  FROM profiles
  WHERE id = v_user_id;
  IF v_has_access THEN
    SELECT * INTO v_template FROM svg_templates
    WHERE id = p_template_id AND is_active = TRUE;
  END IF;
END IF;
```

### Pattern E: Service Function Shape (named async export, throws on error)
**Source:** `src/services/marketplaceService.js` lines 191-260.
**Apply to:** All new exports in `marketplaceService.js` and `templateGalleryService.js`.
```js
export async function createTemplate(template) {
  const { data, error } = await supabase
    .from('template_library')
    .insert({...})
    .select()
    .single();
  if (error) throw error;
  return data;
}
```
Async, named export, destructure `{ data, error }`, throw error, return data. JSDoc comment block above each export per `marketplaceService.js` convention.

### Pattern F: Structural Test Assertion (no exact counts, no screenshot diff)
**Source:** `tests/e2e/preview-apply.spec.js` lines 34-35 (`Structural assertions only — no screenshot-diff, no exact-template-count`).
**Apply to:** Both new E2E specs.
Use `getByRole`, `getByText` with regexes (`/Added \d+ templates/i`), `getByTestId`. Never assert exact pack/template counts (would break with seed drift per RESEARCH §Anti-Patterns).

### Pattern G: Lazy Route Registration
**Source:** `src/App.jsx` lines 119, 559, 670.
**Apply to:** New `admin-starter-packs` route.
Three additions:
1. Top-level lazy import.
2. `pageMap` entry with `Suspense fallback={<PageLoader />}` wrapper, passing `showToast={showToast} onNavigate={setCurrentPage}`.
3. `adminToolPages` array entry (else super_admin loses sidebar — RESEARCH Pitfall 6).

### Pattern H: forwardRef Design-System Primitive
**Source:** `src/design-system/components/TemplateCard.jsx` lines 22-39.
**Apply to:** `FavoriteButton` (and any other new design-system primitives).
```jsx
import { forwardRef, useState } from 'react';

export const TemplateCard = forwardRef(function TemplateCard(
  { ...props, className = '' },
  ref
) {
  ...
});
```

### Pattern I: Click Guard for Nested Buttons
**Source:** `src/design-system/components/TemplateCard.jsx` lines 60-64.
**Apply to:** `PackCard` (and any composite card with internal buttons).
```jsx
onClick={(e) => {
  if (e.target.closest('button')) return;
  onSelect?.();
}}
```
Ensures FavoriteButton + count badge don't trigger card-level `onSelect`.

### Pattern J: URL-Backed Filter State (extend Phase 171 D-10 contract)
**Source:** `src/pages/TemplateGalleryPage.jsx` lines 111-160.
**Apply to:** Favorites filter chip (`?favorites=1` URL param).
Use existing `searchParams.get(...)` reader and `updateFilter(key, value)` writer. Single-value, replace history entry (`{ replace: true }`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every new file in Phase 173 has at least a role-match analog in the codebase. The polymorphic junction pattern + drag-reorder member picker are net-new compositions, but each draws from existing service/RLS patterns. |

**Notes:**
- The `template_pack_items`-via-parent RLS pattern (EXISTS join check) is new to this codebase but follows standard Postgres RLS conventions documented in RESEARCH §Pattern 2.
- Optimistic UI toggle is the inverse of `TemplatePreviewModal.handleApply`'s pessimistic pattern — same primitives, opposite ordering.
- 2×2 mosaic in `PackCard` adapts the single-image `TemplateCard.jsx` thumbnail region (lines 67-91) to a CSS Grid 2×2.

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/services/`, `src/components/template-gallery/`, `src/design-system/components/`, `src/pages/`, `src/pages/Admin/`, `tests/e2e/`, `tests/integration/preview-apply/`, `tests/unit/services/`, `src/App.jsx`.

**Files scanned (read or grepped):**
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` (full read)
- `supabase/migrations/168_clone_template_with_customization.sql` (full read)
- `supabase/migrations/170_clone_svg_template_to_scene.sql` (full read)
- `supabase/migrations/012_finalize_rls_rbac.sql` (grep → is_super_admin definition)
- `src/services/marketplaceService.js` (lines 1-449 of 505)
- `src/services/templateGalleryService.js` (full read, 71 lines)
- `src/components/template-gallery/TemplatePreviewModal.jsx` (full read, 314 lines)
- `src/design-system/components/TemplateCard.jsx` (full read, 190 lines)
- `src/design-system/components/Card.jsx` (grep → exports)
- `src/design-system/index.js` (grep → FilterChips/ToggleChips/EmptyState exports)
- `src/pages/TemplateGalleryPage.jsx` (full read, 575 lines)
- `src/pages/Admin/AdminTemplatesPage.jsx` (lines 1-200 of 503)
- `src/pages/Admin/AdminEditTemplatePage.jsx` (lines 1-100)
- `src/App.jsx` (targeted reads at lines 110-150, 540-575, 660-685)
- `tests/integration/preview-apply/svg-rpc-atomicity.test.js` (full read, 97 lines)
- `tests/e2e/preview-apply.spec.js` (lines 1-120)
- `tests/unit/services/marketplaceService.test.js` (lines 1-120)

**Pattern extraction date:** 2026-04-22

---

*Phase: 173-starter-packs-favorites*
*Pattern map complete: 2026-04-22*
