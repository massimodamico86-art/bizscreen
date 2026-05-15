/**
 * Phase 178 Wave 0 RED — seedTopics schema invariants (D-15).
 *
 * No env required — pure schema assertions on the seed-topic file.
 *
 * RED in Wave 0: scripts/seedTopics.js does not exist yet (Plan 07 ships it).
 * The dynamic require inside each `it()` body throws ENOENT until then →
 * vitest reports failing tests.
 *
 * Plan 07 (Wave 3) ships scripts/seedTopics.js with ≥360 records (≥120 per
 * vertical) honouring D-04's 1.5× over-generation buffer over the ≥80 SC floor.
 * Each record carries the full D-15 11-field schema:
 *   { slug, name, description, tags[], topic, palette, vibe, layout,
 *     vertical, template_type, orientation }
 *
 * Cross-import: template_type ∈ templateTypesPerVertical[vertical] requires
 * Plan 04's templateTypesPerVertical export from promptLibrary.js — that
 * import will also fail until Plan 04 lands.
 *
 * Requirements covered: TVRT-01..03 (per-vertical floors), TCAT-02 (orientation
 * coverage), D-15 (topic schema), D-11 (templateTypesPerVertical mapping).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const REQUIRED_KEYS = [
  'slug',
  'name',
  'description',
  'tags',
  'topic',
  'palette',
  'vibe',
  'layout',
  'vertical',
  'template_type',
  'orientation',
];

const VERTICALS = ['restaurants', 'retail', 'healthcare'];
const ORIENTATIONS = ['landscape', 'portrait'];

function loadSeedTopics() {
  const req = createRequire(import.meta.url);
  const seedPath = path.resolve(__dirname, '../../scripts/seedTopics.js');
  const mod = req(seedPath);
  // Accept either default array export or named seedTopics
  return mod.seedTopics || mod.default || mod;
}

async function loadTemplateTypesPerVertical() {
  const mod = await import('../../src/services/aiTemplate/promptLibrary.js');
  return mod.templateTypesPerVertical;
}

describe('Phase 178 Wave 0 RED — seedTopics schema invariants (D-15)', () => {
  it('seedTopics is a non-empty array', () => {
    const topics = loadSeedTopics();
    expect(Array.isArray(topics)).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('every entry has all 11 D-15 fields', () => {
    const topics = loadSeedTopics();
    for (const t of topics) {
      for (const k of REQUIRED_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(t, k), `missing key "${k}" on ${t.slug}`).toBe(
          true,
        );
      }
    }
  });

  it('every entry.tags is a non-empty array of strings', () => {
    const topics = loadSeedTopics();
    for (const t of topics) {
      expect(Array.isArray(t.tags), `tags not array on ${t.slug}`).toBe(true);
      expect(t.tags.length, `tags empty on ${t.slug}`).toBeGreaterThanOrEqual(1);
      for (const tag of t.tags) expect(typeof tag).toBe('string');
    }
  });

  it('slugs are unique across the file', () => {
    const topics = loadSeedTopics();
    const slugs = topics.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every entry.vertical ∈ {restaurants, retail, healthcare} (NOT cross-vertical)', () => {
    const topics = loadSeedTopics();
    for (const t of topics) {
      expect(VERTICALS, `bad vertical on ${t.slug}: ${t.vertical}`).toContain(t.vertical);
    }
  });

  it('every entry.orientation ∈ {landscape, portrait}', () => {
    const topics = loadSeedTopics();
    for (const t of topics) {
      expect(ORIENTATIONS, `bad orientation on ${t.slug}: ${t.orientation}`).toContain(
        t.orientation,
      );
    }
  });

  it('every (vertical, template_type) pair is in templateTypesPerVertical[vertical]', async () => {
    const topics = loadSeedTopics();
    const map = await loadTemplateTypesPerVertical();
    expect(map, 'templateTypesPerVertical not exported by promptLibrary.js').toBeTruthy();
    for (const t of topics) {
      const allowed = map[t.vertical];
      expect(allowed, `no allowed types for vertical=${t.vertical}`).toBeTruthy();
      expect(
        allowed,
        `template_type=${t.template_type} not allowed for vertical=${t.vertical} on ${t.slug}`,
      ).toContain(t.template_type);
    }
  });
});
