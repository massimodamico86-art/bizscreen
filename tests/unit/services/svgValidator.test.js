import { describe, it, expect } from 'vitest';
import { validateSvg } from '../../../src/services/svgValidator.js';

const VALID_SVG_LOGO_ANCHOR = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#FF0000" width="800" height="600"/><image id="logo" x="10" y="10" width="100" height="100" xlink:href="placeholder.png"/><text id="text-headline">Headline</text></svg>`;

const VALID_SVG_DATA_CUSTOMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#FF0000" data-customize-color="primary" width="800" height="600"/><text data-customize-text="headline">Headline</text></svg>`;

const MALFORMED_XML = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#FFFFFF"`;

const CURRENTCOLOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="currentColor" width="800" height="600"/></svg>`;

const CSS_VAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="var(--brand-primary)" width="800" height="600"/></svg>`;

const XSS_SCRIPT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><script>alert(1)</script><rect fill="#FF0000" width="800" height="600"/></svg>`;

const OVERSIZED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#FF0000" width="800" height="600"/>${'<!-- padding -->'.repeat(15000)}</svg>`;

describe('svgValidator.validateSvg', () => {
  it('valid SVG with id="logo" + id="text-*" anchors passes (TCTN-02)', () => {
    const result = validateSvg(VALID_SVG_LOGO_ANCHOR);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('valid SVG with data-customize-* anchors passes (TCTN-02)', () => {
    const result = validateSvg(VALID_SVG_DATA_CUSTOMIZE);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('malformed XML returns ok=false with parse error (TCTN-02)', () => {
    const result = validateSvg(MALFORMED_XML);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /parse|XML/i.test(e))).toBe(true);
  });

  it('currentColor token rejected (TCTN-02 / Pitfall 6)', () => {
    const result = validateSvg(CURRENTCOLOR_SVG);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /currentColor/i.test(e))).toBe(true);
  });

  it('var(--*) token rejected (TCTN-02 / Pitfall 6)', () => {
    const result = validateSvg(CSS_VAR_SVG);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /var\(--/i.test(e))).toBe(true);
  });

  it('DOMPurify strips <script> — meaningful drift > 5% returns warning or error (TCTN-02 / Pitfall 5)', () => {
    const result = validateSvg(XSS_SCRIPT_SVG);
    // Either errors out (sanitized fully empty) or surfaces a warning about drift.
    const flagged = result.errors.length > 0 || result.warnings.some((w) => /sanitiz|drift|altered/i.test(w));
    expect(flagged).toBe(true);
  });

  it('SVG > 200KB returns size error (TCTN-02)', () => {
    const result = validateSvg(OVERSIZED_SVG);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /200|size|byte/i.test(e))).toBe(true);
  });
});
