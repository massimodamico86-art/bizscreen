/**
 * GenerateTabForm — Phase 177 D-02 (OptiSigns-style form) + D-14 (synchronous UX
 * with ~30-second loading hint).
 *
 * Phase 178 (Plan 06) extensions:
 *   - Orientation Select (D-10) added as a third row below the existing
 *     2-column grid. Default 'landscape' to preserve Phase 177 implicit
 *     behavior. Passed through to generateDraft() → EF action='generate'.
 *   - Template-type Select narrows to types relevant to the selected vertical
 *     (D-12) via the templateTypesPerVertical mapping from promptLibrary
 *     (Plan 04). When admin switches vertical, if the currently-selected type
 *     drops out of the filtered list, the type resets to the first allowed
 *     value — never submits a (template_type, vertical) combination outside
 *     the mapping (T-178-06-08 mitigation).
 *
 * Form: vertical dropdown + (vertical-scoped) template_type dropdown +
 * orientation dropdown + freeform prompt textarea + Submit. Below the form,
 * PromptLibraryCardGrid renders one card per promptLibrary entry; clicking a
 * card pre-fills the form (template_type, vertical, prompt).
 *
 * Submit calls templateDraftsService.generateDraft, which invokes the
 * generate-svg-template Edge Function (action='generate'). The Edge Function
 * does LLM + svgValidator-at-ingest + 2-retry-with-feedback internally and
 * returns { draftId, status, warnings, attempt_count }. UX shows a blocking
 * loader with the explicit "this can take ~30 seconds" hint required by D-14.
 *
 * On success, onGenerated() is invoked so the parent page can switch to the
 * Pending tab and reload the list — admin sees the new draft immediately.
 */

import { useState, useEffect, useMemo } from 'react';
import { Wand2 } from 'lucide-react';
import { Button, Select } from '../../design-system';
import PromptLibraryCardGrid from './PromptLibraryCardGrid';
import { generateDraft } from '../../services/aiTemplate/templateDraftsService';
import { templateTypesPerVertical } from '../../services/aiTemplate/promptLibrary';

const VERTICAL_OPTIONS = [
  { value: 'cross-vertical', label: 'Cross-vertical (any)' },
  { value: 'restaurants', label: 'Restaurants & QSR' },
  { value: 'retail', label: 'Retail & e-commerce' },
  { value: 'healthcare', label: 'Healthcare & wellness' },
];

// Phase 178 Plan 06 — expanded type list covering all niches in the
// Plan 04 (revised) templateTypesPerVertical mapping. Options not in the
// active vertical's allowed set are filtered OUT of the rendered <Select>
// (per UI-SPEC §Surface 6: "filtered list, not disabled options").
const TEMPLATE_TYPE_OPTIONS = [
  { value: 'menu', label: 'Menu' },
  { value: 'promo', label: 'Promo' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'wayfinding', label: 'Wayfinding' },
  { value: 'health_tip', label: 'Health Tip' },
  { value: 'queue_status', label: 'Queue Status' },
  { value: 'drive_thru', label: 'Drive-Thru' },
  { value: 'waiting_room_ambient', label: 'Waiting Room' },
  { value: 'emergency_alert', label: 'Emergency Alert' },
  { value: 'daypart_menu', label: 'Daypart Menu' },
  { value: 'daily_special', label: 'Daily Special' },
  { value: 'social_proof', label: 'Social Proof' },
  { value: 'seasonal_campaign', label: 'Seasonal Campaign' },
  { value: 'hours_loyalty_drive_thru', label: 'Hours / Loyalty / Drive-Thru' },
  { value: 'flash_sale', label: 'Flash Sale' },
  { value: 'new_arrivals', label: 'New Arrivals' },
  { value: 'product_spotlight', label: 'Product Spotlight' },
  { value: 'social_proof_ugc', label: 'Social Proof (UGC)' },
  { value: 'loyalty_rewards', label: 'Loyalty Rewards' },
  { value: 'hours_window', label: 'Hours / Window' },
  { value: 'provider_directory', label: 'Provider Directory' },
  { value: 'vaccination_reminder', label: 'Vaccination Reminder' },
  { value: 'clinic_hours_pharmacy', label: 'Clinic Hours / Pharmacy' },
];

// Phase 178 Plan 06 D-10 — orientation parameter passed to EF generate.
const ORIENTATION_OPTIONS = [
  { value: 'landscape', label: 'Landscape (1920×1080)' },
  { value: 'portrait', label: 'Portrait (1080×1920)' },
];

export default function GenerateTabForm({ onGenerated, showToast }) {
  const [vertical, setVertical] = useState('cross-vertical');
  const [templateType, setTemplateType] = useState('menu');
  const [orientation, setOrientation] = useState('landscape');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Phase 178 D-12 — filter TEMPLATE_TYPE_OPTIONS to the active vertical's
  // allowed types. UI's 'cross-vertical' key maps to mapping['null'] (no
  // vertical = full type list). Unknown verticals fall back to the null bucket.
  const filteredTypeOptions = useMemo(() => {
    const verticalKey = vertical === 'cross-vertical' ? null : vertical;
    const allowed =
      verticalKey === null
        ? templateTypesPerVertical.null
        : templateTypesPerVertical[verticalKey] ?? templateTypesPerVertical.null;
    return TEMPLATE_TYPE_OPTIONS.filter((opt) => allowed.includes(opt.value));
  }, [vertical]);

  // Reset templateType when vertical changes if the current selection is no
  // longer in the filtered set. Prevents submitting a wrong-vertical type
  // combination via stale state (T-178-06-08).
  useEffect(() => {
    if (!filteredTypeOptions.some((o) => o.value === templateType)) {
      setTemplateType(filteredTypeOptions[0]?.value ?? 'menu');
    }
  }, [filteredTypeOptions, templateType]);

  const handleCardPick = (entry) => {
    setVertical(entry.vertical ?? 'cross-vertical');
    setTemplateType(entry.template_type);
    setPrompt(entry.example_freeform);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      showToast?.({ variant: 'error', message: 'Prompt is required' });
      return;
    }
    setSubmitting(true);
    try {
      // 'cross-vertical' is the UI shorthand for "no vertical"; the EF expects
      // null for cross-vertical drafts (matches template_drafts.vertical NULL
      // semantics in Phase 176 schema).
      const verticalForApi = vertical === 'cross-vertical' ? null : vertical;
      const result = await generateDraft({
        vertical: verticalForApi,
        template_type: templateType,
        orientation,
        prompt: prompt.trim(),
      });
      if (result?.status === 'needs_human_review') {
        showToast?.({
          variant: 'warning',
          message: `Draft created but failed validator after ${result.attempt_count ?? '?'} attempts — flagged for review`,
        });
      } else {
        showToast?.({
          variant: 'success',
          message: `Draft created (status: ${result?.status ?? 'pending'}; attempts: ${result?.attempt_count ?? 1})`,
        });
      }
      await onGenerated?.(result);
      setPrompt('');
    } catch (err) {
      console.error('[GenerateTabForm] generate failed:', err);
      showToast?.({
        variant: 'error',
        message: `Generate failed: ${err?.message ?? 'unknown error'}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="generate-tab" className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="gen-vertical"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Vertical
            </label>
            <Select
              id="gen-vertical"
              data-testid="gen-vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              disabled={submitting}
              placeholder=""
            >
              {VERTICAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor="gen-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Template type
            </label>
            <Select
              id="gen-type"
              data-testid="gen-type"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              disabled={submitting}
              placeholder=""
            >
              {filteredTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Phase 178 Plan 06 — orientation row (D-10). Rendered as a third row
            below the existing 2-col grid to preserve the Phase 177 layout. */}
        <div>
          <label
            htmlFor="gen-orientation"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Orientation
          </label>
          <Select
            id="gen-orientation"
            data-testid="gen-orientation"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            disabled={submitting}
            placeholder=""
          >
            {ORIENTATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="gen-prompt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Freeform prompt
          </label>
          <textarea
            id="gen-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Promote 25% off summer swimwear sale through August 31"
            data-testid="gen-prompt-textarea"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !prompt.trim()}
            data-testid="gen-submit"
          >
            <Wand2 size={16} className="mr-1.5" />
            {submitting
              ? 'Generating… (this can take ~30 seconds)'
              : 'Generate template'}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Or start from an example prompt
        </h3>
        <PromptLibraryCardGrid onPick={handleCardPick} />
      </div>
    </div>
  );
}
