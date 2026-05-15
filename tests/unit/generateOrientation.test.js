/**
 * Phase 178 Wave 0 RED — orientation parameter on action=generate (D-10, BL-178-01).
 *
 * No env required — pure Vitest with vi.fn() mocks.
 *
 * RED in Wave 0: imports the generate handler and calls it with `orientation: 'portrait'`.
 * The Phase 177 handler does not yet accept the parameter and will preserve the
 * 1920×1080 viewBox in the captured system prompt — both portrait assertions fail.
 *
 * Plan 03 ships the orientation injection: when `orientation === 'portrait'`, the
 * handler swaps the viewBox literal (1920×1080 → 1080×1920) and appends a
 * `PORTRAIT-SPECIFIC GUIDANCE` block to the system prompt. promptLibrary entries
 * stay orientation-agnostic — the swap happens at handler-level only.
 *
 * Source-order awk gate (validateSvg → INSERT) is preserved per TGEN-05; this test
 * inspects the system prompt sent to Anthropic, not the validation order.
 *
 * Requirements covered: TCAT-02 (orientation × hero types), BL-178-01.
 */
import { describe, it, expect, vi } from 'vitest';
import { generate } from '../../supabase/functions/generate-svg-template/handlers/generate.ts';

function mockSupaSuccessful() {
  const insertChain = {
    select: () => ({
      single: async () => ({ data: { id: 'fake-uuid' }, error: null }),
    }),
  };
  return {
    from: () => ({
      insert: vi.fn(() => insertChain),
    }),
  };
}

function mockAnthropicCapture(captured) {
  return {
    messages: {
      create: async (args) => {
        captured.system = args.system;
        return {
          content: [
            {
              type: 'tool_use',
              input: {
                svg:
                  '<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">' +
                  '<rect width="100%" height="100%" fill="#fff"/>' +
                  '<text id="title" font-family="sans-serif" fill="#000">x</text>' +
                  '</svg>',
              },
            },
          ],
        };
      },
    },
  };
}

const mockValidateSvg = vi.fn(() => ({ ok: true, errors: [], warnings: [] }));

describe('Phase 178 Wave 0 RED — orientation parameter on action=generate (D-10, BL-178-01)', () => {
  it('orientation: "portrait" — system prompt swaps viewBox to 1080×1920 and appends PORTRAIT-SPECIFIC GUIDANCE', async () => {
    const captured = {};
    await generate(
      {
        vertical: null,
        template_type: 'menu',
        prompt: 'portrait test',
        callerUid: 'fake-uid',
        orientation: 'portrait',
      },
      mockSupaSuccessful(),
      { Anthropic: mockAnthropicCapture(captured), validateSvg: mockValidateSvg },
    );

    expect(captured.system).toBeTypeOf('string');
    expect(captured.system).toContain('viewBox="0 0 1080 1920"');
    expect(captured.system).toContain('PORTRAIT-SPECIFIC GUIDANCE');
    expect(captured.system).not.toContain('viewBox="0 0 1920 1080"');
  });

  it('orientation: "landscape" — system prompt preserves 1920×1080 viewBox and omits PORTRAIT-SPECIFIC GUIDANCE', async () => {
    const captured = {};
    await generate(
      {
        vertical: null,
        template_type: 'menu',
        prompt: 'landscape test',
        callerUid: 'fake-uid',
        orientation: 'landscape',
      },
      mockSupaSuccessful(),
      { Anthropic: mockAnthropicCapture(captured), validateSvg: mockValidateSvg },
    );

    expect(captured.system).toBeTypeOf('string');
    expect(captured.system).toContain('viewBox="0 0 1920 1080"');
    expect(captured.system).not.toContain('PORTRAIT-SPECIFIC GUIDANCE');
    expect(captured.system).not.toContain('viewBox="0 0 1080 1920"');
  });

  it('orientation omitted — defaults to landscape behaviour (preserves 1920×1080 viewBox)', async () => {
    const captured = {};
    await generate(
      {
        vertical: null,
        template_type: 'menu',
        prompt: 'omitted-orientation test',
        callerUid: 'fake-uid',
      },
      mockSupaSuccessful(),
      { Anthropic: mockAnthropicCapture(captured), validateSvg: mockValidateSvg },
    );

    expect(captured.system).toContain('viewBox="0 0 1920 1080"');
    expect(captured.system).not.toContain('PORTRAIT-SPECIFIC GUIDANCE');
  });
});
