/**
 * Template Gallery Service — Phase 170 (v20.0 Templates Reimagined)
 *
 * Sole data-access point for the gallery UI. Reads from the `gallery_templates`
 * Postgres VIEW (migration 167), which UNIONs svg_templates and template_library
 * into a single 21-column projection. All filtering is DB-side.
 *
 * Per 170-CONTEXT.md:
 *   D-03: `editor_type` is the discriminator (svg | polotno). Do NOT branch on `source_table`.
 *   D-04: VIEW enforces `is_active = TRUE` — do NOT add that predicate here.
 *   D-06: No FTS. Search is ILIKE over name + description.
 *   D-07: Single function; returns `{ data, error }`.
 *   D-08: Raw VIEW rows (snake_case from Postgres). Callers handle casing.
 *   D-09: No caching.
 *
 * Pitfall 6 (RESEARCH.md): design_json is always NULL in this VIEW. Polotno apply
 * flows must fetch slides from `template_library_slides` separately.
 */
import { supabase } from '../supabase';

/**
 * @typedef {Object} FetchGalleryTemplatesOptions
 * @property {string} [category]      — Exact match on gallery_templates.category
 * @property {string} [orientation]   — 'landscape' | 'portrait' | 'square' (svg rows only)
 * @property {'svg'|'polotno'} [editorType] — Filter by editor type (D-03)
 * @property {string[]} [tags]        — Tag overlap filter (array && array)
 * @property {number} [limit=50]
 * @property {number} [offset=0]
 * @property {string} [search]        — Case-insensitive substring over name + description
 * @property {string} [sortBy='created_at'] — Column to sort by; always descending
 */

/**
 * Fetch templates from the unified gallery_templates VIEW.
 *
 * @param {FetchGalleryTemplatesOptions} [options]
 * @returns {Promise<{data: Array<object>, error: Error|null}>}
 */
export async function fetchGalleryTemplates(options = {}) {
  const {
    category,
    orientation,
    editorType,
    tags,
    limit = 50,
    offset = 0,
    search,
    sortBy = 'created_at',
  } = options;

  let query = supabase.from('gallery_templates_with_favorites').select('*');

  if (category)    query = query.eq('category', category);
  if (orientation) query = query.eq('orientation', orientation);
  if (editorType)  query = query.eq('editor_type', editorType);
  if (Array.isArray(tags) && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const s = search.trim().replace(/[,()]/g, ' '); // avoid PostgREST `or=` syntax breakage
    query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
  }

  query = query
    .order(sortBy, { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  return { data: data ?? [], error: error ?? null };
}

/**
 * Toggle a per-user favorite on a gallery template.
 *
 * Optimistic-UI friendly: insert is idempotent (PG duplicate-key 23505 is
 * swallowed); delete is a no-op if row already absent. Caller flips local
 * state synchronously, then awaits this — on throw, reverts and toasts.
 *
 * @param {{ templateId: string, editorType: 'svg'|'polotno', nextValue: boolean }} args
 * @returns {Promise<void>}
 */
export async function toggleFavorite({ templateId, editorType, nextValue }) {
  const session = await supabase.auth.getUser();
  const userId = session.data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  if (nextValue) {
    const { error } = await supabase
      .from('template_favorites')
      .insert({ user_id: userId, template_id: templateId, editor_type: editorType });
    if (error && error.code !== '23505') throw error; // ignore duplicate (already favorited)
  } else {
    const { error } = await supabase
      .from('template_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .eq('editor_type', editorType);
    if (error) throw error;
  }
}
