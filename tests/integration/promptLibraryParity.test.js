/**
 * Phase 177 Wave 0 RED — prompt-library parity (D-08).
 * Phase 178 Wave 0 EXTENSION — per-vertical specialization invariants (D-09/D-11/D-12).
 *
 * No env required — runs in CI.
 *
 * Phase 177 RED: imports throw at module-load until Wave 1 Plan 02 lands both
 * `src/services/aiTemplate/promptLibrary.js` AND
 * `supabase/functions/generate-svg-template/prompts.json`. Module-resolution
 * failure IS the RED state (Phase 175/176 precedent).
 *
 * Phase 178 RED: the templateTypesPerVertical import resolves to undefined until
 * Plan 04 (Wave 1) lands. The ≥18-entry, uniqueness, and templateTypesPerVertical
 * cross-check assertions all fail at the 6-entry Phase 177 baseline.
 *
 * Once Plan 04 lands:
 *   - promptLibrary.length ≥ 18 (per-vertical specialization × ≥ N types per vertical)
 *   - every (template_type, vertical) combination is unique
 *   - every entry's (template_type, vertical) pair appears in templateTypesPerVertical[vertical]
 *
 * The deep-equal assertion (D-08) is preserved verbatim — drift between Vite bundle
 * and EF bundle = production bug (Pitfall 5).
 *
 * Requirements covered: D-08 (parity), D-09 (per-vertical entries), D-11 (niche-type
 * pinning), D-12 (templateTypesPerVertical export), TVRT-01..03 (vertical floors).
 */
import { describe, it, expect } from 'vitest';
import {
  promptLibrary,
  templateTypesPerVertical,
} from '../../src/services/aiTemplate/promptLibrary.js';
import promptsJson from '../../supabase/functions/generate-svg-template/prompts.json' with { type: 'json' };

describe('Phase 177 — prompt library parity (D-08)', () => {
  it('promptLibrary.js and prompts.json are deep-equal by content', () => {
    expect(promptLibrary).toEqual(promptsJson);
  });

  it('contains at least 6 entries — Phase 177 baseline (replaced exact-set assertion with superset for Phase 178 expansion)', () => {
    expect(promptLibrary.length).toBeGreaterThanOrEqual(6);
    const types = new Set(promptLibrary.map((p) => p.template_type));
    for (const t of ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip']) {
      expect(types).toContain(t);
    }
  });
});

describe('Phase 178 Wave 0 RED — per-vertical specialization (D-09 / D-11 / D-12)', () => {
  it('contains at least 18 entries (per-vertical specialization per D-09 + D-11 expansion)', () => {
    expect(promptLibrary.length).toBeGreaterThanOrEqual(18);
  });

  it('every (template_type, vertical) combination is unique — no duplicate keys', () => {
    const keys = promptLibrary.map((p) => `${p.template_type}|${p.vertical ?? 'null'}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every (template_type, vertical) pair appears in templateTypesPerVertical[vertical]', () => {
    expect(templateTypesPerVertical, 'templateTypesPerVertical not exported by promptLibrary.js')
      .toBeTruthy();
    for (const p of promptLibrary) {
      const key = p.vertical ?? 'null';
      const allowed = templateTypesPerVertical[key];
      expect(allowed, `templateTypesPerVertical missing key "${key}"`).toBeTruthy();
      expect(
        allowed,
        `template_type=${p.template_type} not in templateTypesPerVertical["${key}"]`,
      ).toContain(p.template_type);
    }
  });
});
