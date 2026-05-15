/**
 * Phase 177 Wave 0 RED — TGEN-05 validator-runs-before-INSERT (Pitfall A1 mitigation).
 *
 * No env required — pure Vitest with vi.fn() mocks.
 *
 * RED in Wave 0: imports the (NOT YET CREATED) generate handler — fails at
 * module-resolution. Wave 1 Plan 02 creates the handler with the DI seam
 * `(args, supabase, deps)` so this test can assert the call order.
 *
 * Contract: validateSvg() MUST be called BEFORE supabase.from('template_drafts').insert().
 * If the handler is ever refactored to INSERT-then-validate (Pitfall A1), this test FAILS
 * and the refactor is rejected.
 *
 * Requirements covered: TGEN-05.
 */
import { describe, it, expect, vi } from 'vitest';
// RED — handler doesn't exist yet (Wave 1 Plan 02 creates it).
import { generate } from '../../supabase/functions/generate-svg-template/handlers/generate.ts';

describe('Phase 177 — TGEN-05 validator-runs-before-INSERT (Pitfall A1)', () => {
  it('calls validateSvg BEFORE supabase.from(template_drafts).insert', async () => {
    const callOrder = [];

    const mockValidate = vi.fn(() => {
      callOrder.push('validateSvg');
      return { ok: true, errors: [], warnings: [] };
    });

    const mockInsert = vi.fn(() => {
      callOrder.push('insert');
      return {
        select: () => ({
          single: async () => ({ data: { id: 'fake-uuid' }, error: null }),
        }),
      };
    });

    const mockSupa = { from: () => ({ insert: mockInsert }) };

    const mockAnthropic = {
      messages: {
        create: async () => ({
          content: [
            {
              type: 'tool_use',
              input: {
                svg: '<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">'
                  + '<rect width="100%" height="100%" fill="#fff"/>'
                  + '<text id="title" font-family="sans-serif" fill="#000">x</text>'
                  + '</svg>',
              },
            },
          ],
        }),
      },
    };

    await generate(
      { vertical: null, template_type: 'menu', prompt: 'test', callerUid: 'fake-uid' },
      mockSupa,
      { Anthropic: mockAnthropic, validateSvg: mockValidate },
    );

    expect(callOrder.indexOf('validateSvg')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('insert')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('validateSvg')).toBeLessThan(callOrder.indexOf('insert'));
  });
});
