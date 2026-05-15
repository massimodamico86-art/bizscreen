/**
 * Phase 173 fixture builders for template_packs + template_pack_items rows.
 * Used by E2E specs (admin-starter-packs.spec.js, starter-packs.spec.js)
 * and integration tests (apply-starter-pack-atomicity.test.js).
 */
import { randomUUID } from 'crypto';

export function buildPack(overrides = {}) {
  return {
    id: overrides.id || randomUUID(),
    slug: overrides.slug || `test-pack-${Date.now()}`,
    name: overrides.name || 'Test Pack',
    description: overrides.description || 'Fixture pack',
    industry: overrides.industry || 'Restaurant',
    thumbnail_url: overrides.thumbnail_url || null,
    display_order: overrides.display_order ?? 0,
    is_active: overrides.is_active ?? true,
    tenant_id: overrides.tenant_id ?? null,  // null = global per D-03
    created_by: overrides.created_by || null,
  };
}

export function buildPackItem({ packId, templateId, editorType = 'svg', position = 0 } = {}) {
  if (!packId) throw new Error('buildPackItem requires packId');
  if (!templateId) throw new Error('buildPackItem requires templateId');
  return {
    pack_id: packId,
    template_id: templateId,
    editor_type: editorType,
    position,
  };
}

/**
 * Build a pack with N members of mixed editor_type for atomic-RPC tests.
 * Default ratio: alternating svg/polotno.
 */
export function buildMixedPack({ memberCount = 4, packOverrides = {} } = {}) {
  const pack = buildPack(packOverrides);
  const items = Array.from({ length: memberCount }, (_, i) =>
    buildPackItem({
      packId: pack.id,
      templateId: randomUUID(),
      editorType: i % 2 === 0 ? 'svg' : 'polotno',
      position: i,
    }),
  );
  return { pack, items };
}
