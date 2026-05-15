# Phase 174: Scene Editor + Onboarding Integration - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 16 (7 modify, 2 new source, 7 new/extend tests)
**Analogs found:** 16 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql` | migration | CRUD | `supabase/migrations/173_apply_starter_pack.sql` + `supabase/migrations/034_tenant_lifecycle_and_onboarding.sql` | exact |
| `src/hooks/useGalleryTour.js` | hook | event-driven | `src/hooks/useAsyncFeatureFlag` (inside `src/hooks/useFeatureFlag.jsx`) | role-match |
| `src/pages/SceneEditorPage.jsx` | page | request-response | self — topbar button pattern at line 527 | exact |
| `src/pages/TemplateGalleryPage.jsx` | page | request-response | self — `useSearchParams` filter pattern at line 152 | exact |
| `src/components/template-gallery/TemplatePreviewModal.jsx` | component | request-response | self — `handleApply` branch at line 108 | exact |
| `src/services/marketplaceService.js` | service | request-response | `applyStarterPack` at line 632 (same file) | exact |
| `src/services/onboardingService.js` | service | CRUD | self — `ONBOARDING_STEPS` array + `getOnboardingProgress` mapper | exact |
| `src/components/OnboardingWizard.jsx` | component | event-driven | self — `StepContent` object + `STEP_ICONS` map at lines 41, 367 | exact |
| `tests/e2e/editor-return.spec.js` | test (E2E) | request-response | `tests/e2e/preview-apply.spec.js` | exact |
| `tests/e2e/onboarding.spec.js` (extend) | test (E2E) | event-driven | self (existing file) | exact |
| `tests/e2e/gallery-tour.spec.js` | test (E2E) | event-driven | `tests/e2e/preview-apply.spec.js` (skip-guard, loginAndPrepare shape) | role-match |
| `tests/integration/apply-template-to-slide.test.js` | test (integration) | CRUD | `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` | exact |
| `tests/integration/onboarding-rpc.test.js` | test (integration) | CRUD | `tests/integration/preview-apply/svg-rpc-atomicity.test.js` | role-match |
| `tests/unit/hooks/useGalleryTour.test.js` | test (unit) | event-driven | `tests/unit/services/onboardingService.test.js` (mock + describe shape) | role-match |
| `tests/unit/services/marketplaceService.test.js` (extend) | test (unit) | request-response | self (existing file) | exact |
| `tests/unit/services/onboardingService.test.js` (extend) | test (unit) | CRUD | self (existing file) | exact |

---

## Pattern Assignments

### `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql` (migration, CRUD)

**Analogs:** `supabase/migrations/173_apply_starter_pack.sql` (auth preamble, SECURITY DEFINER shape, GRANT); `supabase/migrations/034_tenant_lifecycle_and_onboarding.sql` lines 516–662 (three RPCs being extended)

**Section 1 — Schema additions (D-12, D-16). Copy additive-column pattern from migration 173 header:**
```sql
-- Additive, idempotent — no DOWN migration (project convention)
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS completed_starter_pack BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_gallery_tour  BOOLEAN DEFAULT FALSE;
```

**Section 2 — `apply_template_to_active_slide` RPC (D-05). Auth preamble from migration 170 lines 52–56; super_admin bypass from migration 170 lines 67–77; SVG-read from migration 173 lines 73–92. The UPDATE (not INSERT) is the key difference:**
```sql
CREATE OR REPLACE FUNCTION public.apply_template_to_active_slide(
  p_scene_id    uuid,
  p_slide_id    uuid,
  p_template_id uuid,
  p_editor_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_has_access   boolean := false;
  v_svg_template svg_templates%ROWTYPE;
BEGIN
  -- Auth preamble (mirrors 170:52-56, 173:37-40)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Polotno rejection (D-02 enforcement at RPC layer)
  IF p_editor_type != 'svg' THEN
    RAISE EXCEPTION 'Only SVG templates supported in editor-return mode';
  END IF;

  -- Scene ownership check (new for this RPC — not in clone variants)
  IF NOT EXISTS (
    SELECT 1 FROM scenes
    WHERE id = p_scene_id
      AND (tenant_id = v_user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'super_admin'
      ))
  ) THEN
    RAISE EXCEPTION 'Scene not found or access denied';
  END IF;

  -- Slide belongs to scene
  IF NOT EXISTS (
    SELECT 1 FROM scene_slides WHERE id = p_slide_id AND scene_id = p_scene_id
  ) THEN
    RAISE EXCEPTION 'Slide not found in scene';
  END IF;

  -- Template read — mirrors svg_templates SELECT RLS (migration 167:39-45)
  SELECT * INTO v_svg_template
  FROM svg_templates
  WHERE id = p_template_id AND is_active = TRUE
    AND (tenant_id IS NULL OR created_by = v_user_id);

  -- super_admin bypass (mirrors 170:67-77)
  IF v_svg_template IS NULL THEN
    SELECT role = 'super_admin' INTO v_has_access FROM profiles WHERE id = v_user_id;
    IF v_has_access THEN
      SELECT * INTO v_svg_template FROM svg_templates
      WHERE id = p_template_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_svg_template IS NULL THEN RAISE EXCEPTION 'Template not found or inactive'; END IF;
  IF v_svg_template.svg_content IS NULL THEN RAISE EXCEPTION 'Template has no SVG body'; END IF;

  -- Overwrite active slide (jsonb_set mirrors 173:118 INSERT value shape, but UPDATEs)
  UPDATE scene_slides
  SET
    design_json = jsonb_set(
      COALESCE(design_json, '{}'::jsonb),
      '{svgContent}',
      to_jsonb(v_svg_template.svg_content),
      true
    ),
    updated_at = NOW()
  WHERE id = p_slide_id AND scene_id = p_scene_id;

  RETURN p_slide_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_template_to_active_slide(uuid, uuid, uuid, text) TO authenticated;
```

**Section 3 — `get_onboarding_progress` extension (D-14, D-17). Copy RETURNS TABLE + SELECT list pattern from migration 034 lines 516–566; add two columns:**
```sql
-- In RETURNS TABLE(...) add after completed_screen_pairing:
completed_starter_pack BOOLEAN,
completed_gallery_tour  BOOLEAN

-- In the main SELECT add:
op.completed_starter_pack,
op.completed_gallery_tour,

-- In the NOT FOUND defaults block add:
false AS completed_starter_pack,
false AS completed_gallery_tour
```

**Section 4 — `update_onboarding_step` extension (D-14). Extend the `is_complete` AND chain from migration 034 lines 596–603; add allowlist guard before EXECUTE:**
```sql
-- Add p_step allowlist BEFORE the EXECUTE block (prevents SQL injection via dynamic column)
IF p_step NOT IN (
  'welcome','logo','first_media','first_playlist','first_screen',
  'screen_pairing','starter_pack','gallery_tour'
) THEN
  RAISE EXCEPTION 'Invalid onboarding step: %', p_step;
END IF;

-- Extend is_complete AND chain (add completed_starter_pack; keep gallery_tour OUT)
SELECT
  completed_welcome AND completed_logo AND completed_first_screen AND
  completed_first_playlist AND completed_first_media AND completed_screen_pairing
  AND completed_starter_pack   -- Phase 174 addition
INTO v_is_complete
FROM public.onboarding_progress WHERE owner_id = v_user_id;

-- Extend next_step CASE to include starter_pack (insert between logo and first_media):
CASE
  WHEN NOT completed_welcome     THEN 'welcome'
  WHEN NOT completed_logo        THEN 'logo'
  WHEN NOT completed_starter_pack THEN 'starter_pack'   -- Phase 174 addition
  WHEN NOT completed_first_media  THEN 'media'
  WHEN NOT completed_first_playlist THEN 'playlist'
  WHEN NOT completed_first_screen  THEN 'screen'
  WHEN NOT completed_screen_pairing THEN 'pairing'
  ELSE 'complete'
END
```

**Section 5 — `skip_onboarding` is unchanged (D-14 note: no body edit required).**

---

### `src/hooks/useGalleryTour.js` (hook, event-driven)

**Analog:** `useAsyncFeatureFlag` inside `src/hooks/useFeatureFlag.jsx` lines 230–272 — `mounted` guard pattern, async `useEffect` with cleanup, Supabase call on mount.

**Imports pattern (from useFeatureFlag.jsx lines 230–232 + driver.js research):**
```javascript
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getOnboardingProgress, updateOnboardingStep } from '../services/onboardingService';
```

**Core hook pattern (mirrors useAsyncFeatureFlag lines 233–271 — mounted guard + async effect):**
```javascript
export function useGalleryTour({ isFetching = false } = {}) {
  const driverRef = useRef(null);

  useEffect(() => {
    if (isFetching) return;   // gate: wait until gallery templates are rendered
    let mounted = true;

    async function maybeStartTour() {
      try {
        const progress = await getOnboardingProgress();
        if (!mounted) return;
        if (progress.completedGalleryTour) return;

        const markSeen = async () => {
          if (!mounted) return;
          await updateOnboardingStep('gallery_tour', true);
        };

        driverRef.current = driver({
          animate: true,
          showProgress: true,
          progressText: '{{current}} of {{total}}',
          allowClose: true,
          steps: [
            { element: '[data-tour="filter-bar"]',  popover: { title: 'Filter Templates', description: 'Filter by category, orientation, or favorites.', side: 'bottom', align: 'start' } },
            { element: '[data-tour="search-input"]', popover: { title: 'Search', description: 'Search the catalog by name or tag.', side: 'bottom' } },
            { element: '[data-tour="first-card"]',   popover: { title: 'Browse Templates', description: 'Click any card to preview and apply it.', side: 'bottom' } },
            { element: '[data-tour="apply-cta"]',    popover: { title: 'Apply a Template', description: 'Click any template to preview and apply.', side: 'top' } },
          ],
          onDestroyStarted: () => { markSeen(); },  // fires on ALL exit paths (D-19)
        });

        driverRef.current.drive();
      } catch (err) {
        console.error('[useGalleryTour] Tour init failed:', err);
      }
    }

    maybeStartTour();

    return () => {
      mounted = false;
      driverRef.current?.destroy();
    };
  }, [isFetching]);  // re-check only when fetching state changes
}
```

**Key note:** Pass `isFetching` from `TemplateGalleryPage` to prevent tour firing before `[data-tour="first-card"]` exists in the DOM (RESEARCH Pitfall 2).

---

### `src/pages/SceneEditorPage.jsx` (page, request-response) — MODIFY

**Analog:** Self — existing topbar button cluster at lines 513–545.

**Imports to add (lines 1–30 area — add to existing lucide-react import):**
```javascript
import { LayoutTemplate } from 'lucide-react';  // add to existing lucide imports
import { useNavigate } from 'react-router-dom';  // likely already imported; verify
```

**Insertion point — line 527 (after AI panel toggle button, before the divider or Done button):**
```javascript
// Existing pattern at line 527:
<Button variant="ghost" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} className={showAiPanel ? 'text-purple-400' : 'text-gray-400'}>
  <Sparkles className="w-4 h-4" />
</Button>

// ADD immediately after (D-03):
<Button
  variant="ghost"
  size="sm"
  onClick={handleBrowseTemplates}
  className="text-gray-400"
  title="Browse Templates"
>
  <LayoutTemplate className="w-4 h-4 mr-1" />
  Browse Templates
</Button>
```

**Handler (D-04 two-step navigation — RESEARCH Pattern 1):**
```javascript
const navigate = useNavigate();   // add to existing hook declarations

const handleBrowseTemplates = () => {
  // Step 1: write URL params into browser location so useSearchParams()
  // in TemplateGalleryPage reads them on mount (RESEARCH Pattern 1 / Pitfall 1)
  navigate(`?editorReturn=1&returnSceneId=${sceneId}&slideId=${slides[activeSlideIndex]?.id}`, { replace: true });
  // Step 2: switch displayed page via App.jsx pseudo-router
  onNavigate('templates');
};
```

**Note on `sceneId`:** Identify where `sceneId` is held in `SceneEditorPage` state. Planner reads the existing `scene` object or prop. Same for `activeSlideIndex` and `slides` array — these are already in scope at line 527 context.

---

### `src/pages/TemplateGalleryPage.jsx` (page, request-response) — MODIFY

**Analog:** Self — `useSearchParams` filter pattern at line 152 is the direct model for reading `editorReturn` and `returnSceneId`.

**Existing URL-param read pattern (lines 152–156) — extend with editorReturn params:**
```javascript
// Existing at line 152:
const [searchParams, setSearchParams] = useSearchParams();

// ADD after searchParams declaration:
const isEditorReturn  = searchParams.get('editorReturn') === '1';
const returnSceneId   = searchParams.get('returnSceneId') ?? null;
const returnSlideId   = searchParams.get('slideId') ?? null;
```

**Filter injection — add svg-only constraint when editorReturn (D-02):**
```javascript
// In the useMemo that derives filtered templates, add:
const visibleTemplates = useMemo(() => {
  let result = allTemplates;
  if (isEditorReturn) {
    result = result.filter((t) => t.editor_type === 'svg');
  }
  // ... existing category/search/favorites filters
  return result;
}, [allTemplates, isEditorReturn, /* existing deps */]);
```

**StarterPacksStrip hide (D-04):**
```javascript
// Existing render of StarterPacksStrip — wrap with:
{!isEditorReturn && (
  <StarterPacksStrip ... />
)}
```

**Pass mode + returnSceneId into TemplatePreviewModal (D-06):**
```javascript
// Existing TemplatePreviewModal open:
<TemplatePreviewModal
  open={previewState.open}
  templates={/* filtered snapshot */}
  initialIndex={previewState.index}
  onClose={...}
  onNavigate={onNavigate}
  showToast={showToast}
  // ADD:
  mode={isEditorReturn ? 'editor-return' : 'new-scene'}
  returnSceneId={returnSceneId}
  returnSlideId={returnSlideId}
/>
```

**`data-tour` attributes — add to existing JSX nodes:**
```javascript
// Filter bar container — add data-tour="filter-bar" attribute
// SearchBar component — add data-tour="search-input"
// First TemplateCard — add data-tour="first-card" to the wrapping element of index 0
// Apply CTA in TemplatePreviewModal — data-tour="apply-cta" (planner adds to Modal's Apply button)
```

**Tour hook invocation — call after state declarations:**
```javascript
import { useGalleryTour } from '../hooks/useGalleryTour';
// ...
useGalleryTour({ isFetching });   // fires once; isFetching guards against missing first-card anchor
```

---

### `src/components/template-gallery/TemplatePreviewModal.jsx` (component, request-response) — MODIFY

**Analog:** Self — `handleApply` at lines 108–124 is the branch to fork for editor-return mode.

**New props signature (D-06) — add after `showToast`:**
```javascript
export default function TemplatePreviewModal({
  open,
  templates,
  initialIndex = 0,
  onClose,
  onNavigate,
  showToast,
  // Phase 174 additions:
  mode = 'new-scene',      // 'new-scene' | 'editor-return'
  returnSceneId = null,
  returnSlideId = null,
}) {
```

**Import addition:**
```javascript
import { applyTemplateToActiveSlide } from '../../services/marketplaceService';
```

**Forked apply handler — replace `handleApply` with mode-branching version (mirrors existing lines 108–124):**
```javascript
const handleApply = async () => {
  if (!current) return;
  setApplying(true);
  setError(null);
  try {
    if (mode === 'editor-return') {
      // D-06: mutate existing slide, not clone-to-new-scene
      await applyTemplateToActiveSlide(returnSceneId, returnSlideId, current.id, current.editor_type);
      onNavigate?.(`scene-editor-${returnSceneId}`);
      onClose?.();
    } else {
      // Existing 'new-scene' path (unchanged)
      const sceneId = await applyTemplate(current, { customizedSvg });
      onNavigate?.(editorRouteFor(current, sceneId));
      onClose?.();
    }
  } catch (err) {
    console.error('[TemplatePreviewModal] Apply failed:', err);
    setError("Couldn't apply template. Your customizations are saved — tap Apply to try again.");
    setApplying(false);
  }
};
```

**CTA label change — conditionally swap button copy:**
```javascript
// Existing Apply button text — wrap:
{mode === 'editor-return' ? 'Use Template' : 'Apply to new scene'}
```

---

### `src/services/marketplaceService.js` (service, request-response) — MODIFY

**Analog:** `applyStarterPack` at lines 632–636 (same file) — this is the exact blueprint.

**New export — append after `applyStarterPack`:**
```javascript
/**
 * Thin client wrapper over apply_template_to_active_slide RPC (D-06).
 * Overwrites the active slide's design_json.svgContent in a single transaction.
 *
 * @param {string} sceneId
 * @param {string} slideId
 * @param {string} templateId
 * @param {string} editorType - must be 'svg' (RPC rejects others)
 * @returns {Promise<string>} updated slide UUID
 */
export async function applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType) {
  const { data, error } = await supabase.rpc('apply_template_to_active_slide', {
    p_scene_id:    sceneId,
    p_slide_id:    slideId,
    p_template_id: templateId,
    p_editor_type: editorType,
  });
  if (error) throw error;
  return data;  // p_slide_id UUID
}
```

---

### `src/services/onboardingService.js` (service, CRUD) — MODIFY

**Analog:** Self — `ONBOARDING_STEPS` array at lines 30–72; `getOnboardingProgress` mapper at lines 144–155; `updateOnboardingStep` at lines 164–170.

**`ONBOARDING_STEPS` array change (D-07) — insert between `logo` and `first_media`:**
```javascript
// After the 'logo' entry (line 43), before 'first_media' (line 44):
{
  id: 'starter_pack',
  title: 'Choose a Starter Pack',
  description: 'Apply a curated set of templates to jumpstart your screens.',
  icon: 'Package'
  // no navigateTo — stays inside the wizard (D-08)
},
```

**`@typedef OnboardingProgress` extension — add two properties to the JSDoc block (lines 13–25):**
```javascript
 * @property {boolean} completedStarterPack - Starter pack step done (chosen or skipped)
 * @property {boolean} completedGalleryTour  - First-visit gallery tour seen
```

**`getOnboardingProgress` mapper extension — add after `completedScreenPairing` (line 151 area):**
```javascript
// In the happy-path return object:
completedStarterPack: row?.completed_starter_pack || false,
completedGalleryTour:  row?.completed_gallery_tour  || false,

// In the error-fallback return object (lines 128–139 area):
completedStarterPack: false,
completedGalleryTour:  false,
```

**`getNextStep` function — ensure it handles `starter_pack` (line 173+ area):**
```javascript
// The existing function walks ONBOARDING_STEPS and checks isStepComplete(step.id).
// Adding 'starter_pack' to the ONBOARDING_STEPS array is sufficient IF getNextStep
// uses ONBOARDING_STEPS.find() + the isStepComplete mapping (verify this).
// Also extend the isStepComplete mapping wherever it exists (see OnboardingWizard line 98).
```

**New export — `markGalleryTourSeen` (D-17, D-19):**
```javascript
/**
 * Mark the gallery tour as seen for the current user.
 * Calls update_onboarding_step('gallery_tour', true) — the dynamic SQL
 * writes completed_gallery_tour. Tour does not count toward wizard is_complete.
 *
 * @returns {Promise<void>}
 */
export async function markGalleryTourSeen() {
  const { error } = await supabase.rpc('update_onboarding_step', {
    p_step: 'gallery_tour',
    p_completed: true,
  });
  if (error) console.error('[onboardingService] markGalleryTourSeen failed:', error);
  // Non-throwing: tour mark failure should not break the gallery UX
}
```

---

### `src/components/OnboardingWizard.jsx` (component, event-driven) — MODIFY

**Analog:** Self — `STEP_ICONS` at lines 41–48; `StepContent` object at lines 367–526; `isStepComplete` mapping at lines 96–107; `handleCompleteStep` at lines 109–143.

**`STEP_ICONS` extension (line 41–48 area):**
```javascript
import { Package } from 'lucide-react';  // add to lucide import line 13

const STEP_ICONS = {
  welcome: Sparkles,
  logo: Image,
  starter_pack: Package,   // Phase 174 addition (D-08)
  first_media: Upload,
  first_playlist: List,
  first_screen: Monitor,
  screen_pairing: Link
};
```

**`isStepComplete` mapping extension (lines 96–107):**
```javascript
const mapping = {
  welcome:        progress.completedWelcome,
  logo:           progress.completedLogo,
  starter_pack:   progress.completedStarterPack,   // Phase 174 addition
  first_media:    progress.completedFirstMedia,
  first_playlist: progress.completedFirstPlaylist,
  first_screen:   progress.completedFirstScreen,
  screen_pairing: progress.completedScreenPairing
};
```

**New sub-component `StarterPackStep` — placed before `StepContent` in the file:**
```javascript
/**
 * StarterPackStep — async sub-component for the onboarding starter_pack step.
 * Manages its own fetch + apply state; reports success to OnboardingWizard via callback.
 */
const StarterPackStep = ({ onApplySuccess }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);  // packId being applied
  const [applyError, setApplyError] = useState(null);

  useEffect(() => {
    fetchStarterPacks({ activeOnly: true })
      .then((all) => setPacks(all.slice(0, 6)))  // D-09: top 6
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePackClick = async (pack) => {
    setApplying(pack.id);
    setApplyError(null);
    try {
      await applyStarterPack(pack.id);
      onApplySuccess(pack);  // parent handles toast + advance
    } catch (err) {
      setApplyError(err.message || 'Apply failed. Try again.');
    } finally {
      setApplying(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      {applyError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {applyError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {packs.map((pack) => (
          <div key={pack.id} onClick={(e) => e.stopPropagation()}>  {/* Pitfall 4 guard */}
            <PackCard
              pack={pack}
              onSelect={() => handlePackClick(pack)}
              isLoading={applying === pack.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Imports to add to OnboardingWizard.jsx:**
```javascript
import { Package } from 'lucide-react';  // add to existing import
import PackCard from './template-gallery/PackCard';
import { fetchStarterPacks, applyStarterPack } from '../services/marketplaceService';
```

**`StepContent` object extension (line 370 area) — add `starter_pack` key before `first_media`:**
```javascript
const content = {
  welcome: (...),
  logo: (...),
  starter_pack: (                    // Phase 174 addition (D-08)
    <StarterPackStep onApplySuccess={handlePackApplySuccess} />
  ),
  first_media: (...),
  ...
};
```

**`handlePackApplySuccess` callback — add to OnboardingWizard component body:**
```javascript
const handlePackApplySuccess = async (pack) => {
  // D-10: toast + mark complete + advance
  showToast?.(`Added templates from ${pack.name}`, 'success');
  try {
    await updateOnboardingStep('starter_pack', true);
    const newProgress = await getOnboardingProgress();
    setProgress(newProgress);
    // Advance to next step (first_media)
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  } catch (err) {
    console.error('Failed to advance after pack apply:', err);
  }
};
```

**Note on `showToast`:** Verify that `OnboardingWizard` receives `showToast` as a prop from `App.jsx` — if not, add it to the component's props signature.

---

### `tests/e2e/editor-return.spec.js` (test, E2E) — NEW

**Analog:** `tests/e2e/preview-apply.spec.js` — skip guard, `loginAndPrepare`, `readCurrentPage` fiber-BFS, `waitForPageReady`, structural assertion approach.

**File skeleton pattern (copy from preview-apply.spec.js lines 1–80):**
```javascript
import { test, expect } from '@playwright/test';
import { loginAndPrepare, waitForPageReady } from './helpers.js';

const BFS_NODE_CAP = 10000;

// readCurrentPage helper — copy verbatim from preview-apply.spec.js lines 72-120

test.describe('Editor Return (TEDR-01..03)', () => {
  test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');

  test.beforeEach(async ({ page }) => {
    await loginAndPrepare(page, {
      email: process.env.TEST_CLIENT_EMAIL,
      password: process.env.TEST_CLIENT_PASSWORD,
    });
  });

  test('TEDR-01 — Browse Templates button visible in editor topbar', async ({ page }) => { ... });
  test('TEDR-03 — editorReturn URL params present in gallery URL after navigation', async ({ page }) => { ... });
  test('TEDR-02 — Use Template applies to active slide and returns to scene editor', async ({ page }) => { ... });
});
```

---

### `tests/e2e/gallery-tour.spec.js` (test, E2E) — NEW

**Analog:** `tests/e2e/preview-apply.spec.js` — skip guard shape; `tests/e2e/onboarding.spec.js` — `TEST_CLIENT_EMAIL` env guard, loginAndPrepare.

**Key assertions to include:**
1. First gallery visit: tour overlay appears (`driver-popover-title` or `[class*="driver"]` visible).
2. Tour completes (click through all 4 steps).
3. Second gallery visit: tour overlay does NOT appear.

---

### `tests/integration/apply-template-to-slide.test.js` (test, integration) — NEW

**Analog:** `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` — exact mock structure, `vi.mock('../../../src/supabase')`, `beforeEach(vi.clearAllMocks)`, RPC name assertion.

**File skeleton:**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { applyTemplateToActiveSlide } from '../../../src/services/marketplaceService';
import { supabase } from '../../../src/supabase';

describe('apply_template_to_active_slide', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves with slide UUID on success (D-05)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-uuid-1', error: null });
    const id = await applyTemplateToActiveSlide('scene-1', 'slide-1', 'tmpl-1', 'svg');
    expect(id).toBe('slide-uuid-1');
    expect(supabase.rpc.mock.calls[0][0]).toBe('apply_template_to_active_slide');
    expect(supabase.rpc.mock.calls[0][1]).toEqual({
      p_scene_id: 'scene-1', p_slide_id: 'slide-1',
      p_template_id: 'tmpl-1', p_editor_type: 'svg'
    });
  });

  it('throws on RPC error (atomicity contract)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('Template has no SVG body') });
    await expect(applyTemplateToActiveSlide('s','sl','t','svg')).rejects.toThrow(/Template has no SVG body/);
  });

  it('zero follow-up calls — single RPC round-trip proves atomicity', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-uuid-2', error: null });
    await applyTemplateToActiveSlide('s','sl','t','svg');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('polotno editor_type is passed through — RPC enforcement happens server-side (D-02)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('Only SVG templates supported') });
    await expect(applyTemplateToActiveSlide('s','sl','t','polotno')).rejects.toThrow(/Only SVG/);
  });
});
```

---

### `tests/integration/onboarding-rpc.test.js` (test, integration) — NEW

**Analog:** `tests/integration/preview-apply/svg-rpc-atomicity.test.js` — supabase mock shape, RPC call assertion pattern.

**Scope:** Test `updateOnboardingStep('starter_pack', true)` and `updateOnboardingStep('gallery_tour', true)` call patterns; test `getOnboardingProgress` returns `completedStarterPack` + `completedGalleryTour` from mapped data.

---

### `tests/unit/hooks/useGalleryTour.test.js` (test, unit) — NEW

**Analog:** `tests/unit/services/onboardingService.test.js` — `vi.mock` supabase, `describe`/`it`/`beforeEach(vi.clearAllMocks)` pattern.

**Additional mock needed for driver.js:**
```javascript
vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({
    drive: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('driver.js/dist/driver.css', () => ({}));  // CSS import no-op

vi.mock('../../../src/services/onboardingService', () => ({
  getOnboardingProgress: vi.fn(),
  updateOnboardingStep:  vi.fn().mockResolvedValue({}),
}));
```

**Key test cases:**
1. `completedGalleryTour=false` → `driver().drive()` called once.
2. `completedGalleryTour=true` → `driver` never called.
3. `isFetching=true` → tour does not start (no `getOnboardingProgress` call).
4. `onDestroyStarted` fires → `updateOnboardingStep('gallery_tour', true)` called.

---

### `tests/unit/services/marketplaceService.test.js` (test, unit) — EXTEND

**Analog:** Self (existing file) — copy mock setup from lines 1–65; add new describe block after existing constants tests.

**Extension pattern:**
```javascript
// Add to existing imports list:
import { applyTemplateToActiveSlide } from '../../../src/services/marketplaceService';

describe('applyTemplateToActiveSlide', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls apply_template_to_active_slide RPC with correct args', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: 'slide-id', error: null });
    const id = await applyTemplateToActiveSlide('sc','sl','tmpl','svg');
    expect(supabase.rpc).toHaveBeenCalledWith('apply_template_to_active_slide', {
      p_scene_id: 'sc', p_slide_id: 'sl', p_template_id: 'tmpl', p_editor_type: 'svg'
    });
    expect(id).toBe('slide-id');
  });

  it('throws on error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    await expect(applyTemplateToActiveSlide('s','sl','t','svg')).rejects.toThrow('fail');
  });
});
```

---

### `tests/unit/services/onboardingService.test.js` (test, unit) — EXTEND

**Analog:** Self (existing file) — existing describe block at line 35 is the model.

**Extensions to add:**
```javascript
// Flip the length assertion (line 36):
it('contains all 7 steps', () => {
  expect(ONBOARDING_STEPS).toHaveLength(7);  // was 6
});

// Add step-order assertion:
it('has starter_pack between logo and first_media', () => {
  const ids = ONBOARDING_STEPS.map((s) => s.id);
  const logoIdx     = ids.indexOf('logo');
  const packIdx     = ids.indexOf('starter_pack');
  const mediaIdx    = ids.indexOf('first_media');
  expect(packIdx).toBe(logoIdx + 1);
  expect(mediaIdx).toBe(packIdx + 1);
});

// Verify starter_pack has no navigateTo (stays in wizard):
it('starter_pack step has no navigateTo', () => {
  const step = ONBOARDING_STEPS.find((s) => s.id === 'starter_pack');
  expect(step.navigateTo).toBeUndefined();
});
```

---

## Shared Patterns

### Authentication (DB RPCs)
**Source:** `supabase/migrations/170_clone_svg_template_to_scene.sql` lines 52–56
**Apply to:** `apply_template_to_active_slide` RPC in migration 174
```sql
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Not authenticated';
END IF;
```

### SECURITY DEFINER + GRANT pattern
**Source:** `supabase/migrations/173_apply_starter_pack.sql` lines 22–25, 185
**Apply to:** `apply_template_to_active_slide` RPC
```sql
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- ...
GRANT EXECUTE ON FUNCTION public.<fn_name>(...) TO authenticated;
```

### Supabase RPC client wrapper (throw-on-error)
**Source:** `src/services/marketplaceService.js` lines 632–636
**Apply to:** `applyTemplateToActiveSlide` in marketplaceService.js
```javascript
const { data, error } = await supabase.rpc('<rpc_name>', { ...args });
if (error) throw error;
return data;
```

### Mounted-guard async useEffect (hooks)
**Source:** `src/hooks/useFeatureFlag.jsx` lines 233–270 (`useAsyncFeatureFlag`)
**Apply to:** `useGalleryTour.js`
```javascript
useEffect(() => {
  let mounted = true;
  async function run() {
    // ...
    if (!mounted) return;
    // ...
  }
  run();
  return () => { mounted = false; };
}, [deps]);
```

### Vitest supabase mock (unit/integration tests)
**Source:** `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` lines 9–11
**Apply to:** All new integration and unit tests
```javascript
vi.mock('../../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));
```

### E2E skip guard
**Source:** `tests/e2e/onboarding.spec.js` line 11; `tests/e2e/preview-apply.spec.js`
**Apply to:** `editor-return.spec.js`, `gallery-tour.spec.js`
```javascript
test.skip(() => !process.env.TEST_CLIENT_EMAIL, 'Client test credentials not configured');
```

### showToast + onNavigate props (pages and components)
**Source:** `src/pages/TemplateGalleryPage.jsx` line 100; `src/components/template-gallery/TemplatePreviewModal.jsx` line 30
**Apply to:** All page/component modifications — both props flow down from App.jsx unchanged.

---

## No Analog Found

All files have strong analogs in the codebase. No files required research-only patterns.

| File | Note |
|------|------|
| driver.js import style | No existing tour library in codebase — use RESEARCH.md Pattern 6 verbatim |

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/pages/`, `src/services/`, `src/components/template-gallery/`, `supabase/migrations/`, `tests/e2e/`, `tests/integration/`, `tests/unit/`
**Files scanned:** 18 (migrations + source + tests)
**Pattern extraction date:** 2026-04-28
