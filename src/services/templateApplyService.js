/**
 * templateApplyService — Phase 172 Preview + Apply Flow
 *
 * Responsibilities:
 *  - Dispatch Apply to the correct RPC based on template.editor_type (D-11)
 *  - Client-side SVG sanitization via DOMPurify before RPC call (D-17, T-172-01 mitigation)
 *  - Build the post-Apply navigation route string (D-15 for SVG, D-12/D-16 for Polotno)
 *
 * This file is the FIRST consumer of `dompurify` in src/ (per 172-RESEARCH.md
 * Runtime State Inventory). Confirmed via `grep -rn "dompurify\|DOMPurify" src/`
 * at Plan 03 start — returned no hits before this file landed.
 *
 * RPCs called:
 *  - clone_svg_template_to_scene (new in migration 170, Phase 172.1)      ← editor_type='svg'
 *  - clone_template_to_scene (migration 080, redefined by 110)            ← editor_type='polotno'
 *
 * Conventions:
 *  - Named exports only (service-per-responsibility)
 *  - `{ data, error }` destructure + `if (error) throw error` (standard supabase RPC idiom)
 *  - No try/catch in the service layer — errors propagate so the caller (TemplatePreviewModal Plan 05)
 *    can render them via its Alert (D-13)
 */

import { supabase } from '../supabase';
import DOMPurify from 'dompurify';

/**
 * Maximum allowed serialized SVG payload size (T-172-04 defense-in-depth).
 * Client-side hard cap rejects oversize inputs before DOMPurify runs,
 * avoiding pathological sanitizer CPU cost.
 */
const SVG_MAX_BYTES = 500_000;

/**
 * Apply a template to a new scene. Dispatches by editor_type.
 *
 * @param {Object} template - row from gallery_templates VIEW (must have `id`, `name`, `editor_type`)
 * @param {Object} [options]
 * @param {string} [options.customizedSvg] - Pre-serialized customized SVG (svg editor_type only)
 * @returns {Promise<string>} new scene UUID
 */
export async function applyTemplate(template, { customizedSvg } = {}) {
  const sceneName = `${template.name} scene`;

  if (template.editor_type === 'svg') {
    // T-172-04: size cap runs BEFORE the sanitizer to avoid pathological CPU cost.
    if (customizedSvg && customizedSvg.length > SVG_MAX_BYTES) {
      throw new Error('SVG payload exceeds 500KB limit');
    }

    // T-172-01: sanitize user-crafted SVG before it leaves the browser.
    // Default DOMPurify behavior with the svg profile strips <script>, on*
    // handlers, and javascript: URLs while preserving data-customize-* attrs.
    const sanitized = customizedSvg
      ? DOMPurify.sanitize(customizedSvg, {
          // BL-04 mirror — see svgValidator.js Rule 4 header for the locked-config rationale.
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: ['style'],
          FORBID_ATTR: ['style'],
        })
      : null;

    const { data, error } = await supabase.rpc('clone_svg_template_to_scene', {
      p_template_id: template.id,
      p_scene_name: sceneName,
      p_customized_svg: sanitized,
    });
    if (error) throw error;
    return data;
  }

  if (template.editor_type === 'polotno') {
    const { data, error } = await supabase.rpc('clone_template_to_scene', {
      p_template_id: template.id,
      p_scene_name: sceneName,
    });
    if (error) throw error;
    return data;
  }

  throw new Error(`Unknown editor_type: ${template.editor_type}`);
}

/**
 * Build the navigation target for the editor after Apply.
 * App uses flat pageMap keys (not React Router paths).
 *
 * SVG route uses `?sceneId=` per D-15 — NOT `?designId=`. The new RPC writes
 * only scenes + scene_slides rows; no companion svg_designs row. Plan 06 adds
 * the matching load branch to SvgEditorPage.jsx.
 *
 * @param {{editor_type: 'svg'|'polotno'}} template
 * @param {string} sceneId - server-generated UUID returned from applyTemplate
 * @returns {string}
 */
export function editorRouteFor(template, sceneId) {
  if (template.editor_type === 'svg') return `svg-editor?sceneId=${sceneId}`;
  if (template.editor_type === 'polotno') return `scene-editor-${sceneId}`;
  throw new Error(`Unknown editor_type: ${template.editor_type}`);
}
