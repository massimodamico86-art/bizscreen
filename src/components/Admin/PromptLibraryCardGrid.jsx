/**
 * PromptLibraryCardGrid — Phase 177 D-02 (OptiSigns "Explore AI Prompts" mirror).
 *
 * Renders one card per `promptLibrary` entry (Plan 02 source of truth — parity-tested
 * against supabase/functions/generate-svg-template/prompts.json by
 * tests/integration/promptLibraryParity.test.js).
 *
 * Click → onPick(entry); the parent form pre-fills (template_type, vertical, prompt)
 * from the entry. Card shape mirrors OptiSigns's "Explore AI Prompts" row — see
 * .planning/research/OPTISIGNS-WALKTHROUGH.md §"Explore AI Prompts".
 *
 * Anti-pattern: do NOT duplicate the prompt list in this component. Single source
 * of truth is promptLibrary.js — D-08 parity test fails on drift.
 */

import { promptLibrary } from '../../services/aiTemplate/promptLibrary';

export default function PromptLibraryCardGrid({ onPick }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      data-testid="prompt-card-grid"
    >
      {promptLibrary.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onPick?.(entry)}
          data-testid={`prompt-card-${entry.template_type}`}
          className="text-left p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
            {entry.template_type}
          </span>
          <h4 className="text-sm font-semibold text-gray-900 mb-1.5">
            {entry.label}
          </h4>
          <p className="text-xs text-gray-600 italic line-clamp-3">
            &ldquo;{entry.example_freeform}&rdquo;
          </p>
        </button>
      ))}
    </div>
  );
}
