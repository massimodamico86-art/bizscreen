/**
 * Pitfall 1 regression test — Phase 171 Plan 01 (Wave 0)
 *
 * Guards against the post-deploy Sentry signature documented in
 * 171-RESEARCH.md lines 416–420: if the legacy `SvgTemplateGalleryPage`
 * import lingers in `src/App.jsx` after Plan 02 deletes the file, the three
 * `pageMap` alias keys (`'templates'`, `'template-marketplace'`, `'svg-templates'`)
 * would reference a now-missing module and production would crash on lazy load.
 *
 * Implementation style = 171-PATTERNS.md Option 2 (lines 367–388): file-read
 * + regex scan. No component mount — fast (<10ms), no React tree, no vitest
 * transform required at the DOM layer. The test reads `src/App.jsx` as a
 * string and asserts structural invariants.
 *
 * Currently RED: Plan 02 Task 2 atomically removes the legacy import and
 * re-points the three pageMap aliases to `TemplateGalleryPage` — that commit
 * turns this file GREEN.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(__dirname, '../../../src/App.jsx');
const appSrc = readFileSync(appPath, 'utf8');

describe('App.jsx pageMap aliases — Pitfall 1 regression (Phase 171)', () => {
  it('does not import SvgTemplateGalleryPage (legacy deleted)', () => {
    expect(appSrc).not.toMatch(/SvgTemplateGalleryPage/);
  });

  it('lazy-imports TemplateGalleryPage', () => {
    expect(appSrc).toMatch(
      /const\s+TemplateGalleryPage\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(['"]\.\/pages\/TemplateGalleryPage['"]\)\s*\)/
    );
  });

  it.each([
    ['templates'],
    ['template-marketplace'],
    ['svg-templates'],
  ])("pageMap entry %s resolves to TemplateGalleryPage", (key) => {
    // Assert the literal key appears on a line within 200 chars of <TemplateGalleryPage
    const pattern = new RegExp(`'${key}':[\\s\\S]{0,200}<TemplateGalleryPage`);
    expect(appSrc).toMatch(pattern);
  });
});
