/**
 * templateApplyService Unit Tests — Phase 172 Plan 03
 *
 * Covers TPRV-04 (SVG/Polotno dispatcher), DOMPurify sanitization (T-172-01
 * / Pitfall 5), `editorRouteFor` (D-15/D-12), and the 500KB size cap (T-172-04).
 *
 * Decision anchors: 172-CONTEXT.md §D-09 (dispatcher), §D-11 (sanitization),
 * §D-17 (DOMPurify library choice), §D-15 (sceneId URL scheme).
 *
 * Scaffold names from Plan 01 are preserved; only `.skip` removed and bodies
 * filled per 172-03-PLAN.md Task 2 <behavior>.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before any product import — canonical header shape from
// tests/unit/services/marketplaceService.test.js lines 1-51.
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((s) => s) },
}));

// Imports are hoisted after vi.mock so the mocked modules are used.
import { applyTemplate, editorRouteFor } from '../../../src/services/templateApplyService';
import { supabase } from '../../../src/supabase';
import DOMPurify from 'dompurify';

describe('templateApplyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: RPC resolves with a new scene uuid.
    supabase.rpc.mockResolvedValue({ data: 'new-scene-uuid', error: null });
    // Default: sanitizer is identity (Test 5 overrides for the strip assertion).
    DOMPurify.sanitize.mockImplementation((s) => s);
  });

  it("editor_type='svg' with customizedSvg sanitizes, calls rpc('clone_svg_template_to_scene', {p_template_id, p_scene_name, p_customized_svg}), returns sceneId (TPRV-04)", async () => {
    const tpl = { id: 't1', name: 'Ocean', editor_type: 'svg' };
    const result = await applyTemplate(tpl, { customizedSvg: '<svg>...</svg>' });

    expect(DOMPurify.sanitize).toHaveBeenCalledWith(
      '<svg>...</svg>',
      {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['style'],
        FORBID_ATTR: ['style'],
      },
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      'clone_svg_template_to_scene',
      expect.objectContaining({
        p_template_id: 't1',
        p_scene_name: 'Ocean scene',
        p_customized_svg: '<svg>...</svg>',
      }),
    );
    expect(result).toBe('new-scene-uuid');
  });

  it("editor_type='svg' with no customizedSvg calls RPC with p_customized_svg: null (TPRV-04)", async () => {
    const tpl = { id: 't1', name: 'Ocean', editor_type: 'svg' };
    await applyTemplate(tpl); // no options arg

    // Sanitizer should NOT run when there is no input SVG.
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('clone_svg_template_to_scene', {
      p_template_id: 't1',
      p_scene_name: 'Ocean scene',
      p_customized_svg: null,
    });
  });

  it("editor_type='polotno' calls rpc('clone_template_to_scene', {p_template_id, p_scene_name}) with NO third arg (TPRV-04)", async () => {
    const tpl = { id: 't1', name: 'Ocean', editor_type: 'polotno' };
    await applyTemplate(tpl);

    // Strict equality on the args object — would fail if p_customized_svg appeared.
    expect(supabase.rpc).toHaveBeenCalledWith('clone_template_to_scene', {
      p_template_id: 't1',
      p_scene_name: 'Ocean scene',
    });
    // Sanitizer must not run on the Polotno path.
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
  });

  it('unknown editor_type throws with literal error message (TPRV-04)', async () => {
    const tpl = { id: 't1', name: 'Sketchy', editor_type: 'sketch' };
    await expect(applyTemplate(tpl)).rejects.toThrow('Unknown editor_type: sketch');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('DOMPurify.sanitize is called before RPC; <script> tags removed from payload (T-172-01 / Pitfall 5)', async () => {
    const raw = '<svg><script>alert(1)</script></svg>';
    const stripped = '<svg></svg>';
    // Trace the value flow: sanitizer transforms raw -> stripped.
    DOMPurify.sanitize.mockImplementation(() => stripped);

    const tpl = { id: 't1', name: 'Ocean', editor_type: 'svg' };
    await applyTemplate(tpl, { customizedSvg: raw });

    // Sanitizer got the raw payload.
    expect(DOMPurify.sanitize).toHaveBeenCalledWith(
      raw,
      {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['style'],
        FORBID_ATTR: ['style'],
      },
    );
    // RPC got the sanitized payload, NOT the raw one.
    expect(supabase.rpc).toHaveBeenCalledWith(
      'clone_svg_template_to_scene',
      expect.objectContaining({ p_customized_svg: stripped }),
    );
    const rpcArgs = supabase.rpc.mock.calls[0][1];
    expect(rpcArgs.p_customized_svg).not.toContain('<script>');
  });

  it('RPC error propagates as thrown error (.rejects.toThrow)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('db exploded') });
    const tpl = { id: 't1', name: 'Ocean', editor_type: 'svg' };
    await expect(applyTemplate(tpl, { customizedSvg: '<svg/>' })).rejects.toThrow('db exploded');
  });

  it("editorRouteFor returns 'svg-editor?sceneId={id}' for SVG and 'scene-editor-{id}' for Polotno (D-15/D-12)", () => {
    expect(editorRouteFor({ editor_type: 'svg' }, 'sid')).toBe('svg-editor?sceneId=sid');
    expect(editorRouteFor({ editor_type: 'polotno' }, 'sid')).toBe('scene-editor-sid');
    expect(() => editorRouteFor({ editor_type: 'sketch' }, 'sid')).toThrow(
      'Unknown editor_type: sketch',
    );
  });

  it('SVG payload exceeding 500KB cap throws before DOMPurify runs (T-172-04)', async () => {
    // 500_001 bytes of content inside the <svg> wrapper pushes total length above cap.
    const oversize = '<svg>' + 'a'.repeat(500_001) + '</svg>';
    const tpl = { id: 't1', name: 'Ocean', editor_type: 'svg' };

    await expect(applyTemplate(tpl, { customizedSvg: oversize })).rejects.toThrow(/500KB/);

    // Cap must run BEFORE the sanitizer — avoids pathological sanitizer CPU cost.
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
