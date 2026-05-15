/**
 * Phase 177 gap-closure (177-10) RED → GREEN — BL-01 saveDraftSvgContent EF gate.
 *
 * Verifies the admin-edit save path runs server-side validateSvg BEFORE
 * UPDATE template_drafts.svg_content. The old direct-UPDATE path bypassed
 * server validation; client-side validateSvg in TemplateDraftEditModal is
 * feedback-only (devtools-bypassable).
 *
 * Pure file-source assertions — no env required.
 *
 * Source: 177-VERIFICATION.md gap #1 + 177-REVIEW.md §BL-01.
 * Requirements covered: TADM-02 (Edit row action defense-in-depth),
 * TGEN-05 (validator-at-ingest extended to admin-edit boundary).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SVC_PATH = path.resolve(__dirname, '../../src/services/aiTemplate/templateDraftsService.js');
const INDEX_PATH = path.resolve(__dirname, '../../supabase/functions/generate-svg-template/index.ts');
const HANDLER_PATH = path.resolve(__dirname, '../../supabase/functions/generate-svg-template/handlers/saveEdit.ts');

describe('Phase 177-10 — saveDraftSvgContent EF gate (BL-01)', () => {
  const svcSrc = fs.readFileSync(SVC_PATH, 'utf8');
  const indexSrc = fs.readFileSync(INDEX_PATH, 'utf8');

  it('Test 1: saveDraftSvgContent invokes EF action=save_edit (per checker WARNING 3 — robust line-window matcher)', () => {
    // Per checker WARNING 3: the previous regex `/export\s+async\s+function\s+saveDraftSvgContent[\s\S]*?\n\}/`
    // was non-greedy and would terminate at the FIRST `\n}` — including a nested
    // object literal's closing brace inside the EF invoke body. Replaced with a
    // line-based proximity check that asserts BOTH `functions.invoke('generate-svg-template'`
    // AND `action: 'save_edit'` appear within 30 lines of the function declaration.
    const lines = svcSrc.split('\n');
    const fnLineIdx = lines.findIndex((l) => /export\s+async\s+function\s+saveDraftSvgContent/.test(l));
    expect(fnLineIdx).toBeGreaterThan(-1);
    const window = lines.slice(fnLineIdx, fnLineIdx + 30).join('\n');
    expect(window).toMatch(/functions\.invoke\(\s*["']generate-svg-template["']/);
    expect(window).toMatch(/action:\s*["']save_edit["']/);
  });

  it('Test 2: saveDraftSvgContent NO LONGER does direct UPDATE on template_drafts.svg_content (per checker WARNING 3 — robust line-window matcher)', () => {
    // Same line-window approach as Test 1 — proximity check to the function declaration.
    const lines = svcSrc.split('\n');
    const fnLineIdx = lines.findIndex((l) => /export\s+async\s+function\s+saveDraftSvgContent/.test(l));
    expect(fnLineIdx).toBeGreaterThan(-1);
    const window = lines.slice(fnLineIdx, fnLineIdx + 30).join('\n');
    // Asserts the OLD vulnerable pattern is gone within the function body window:
    expect(window).not.toMatch(/supabase\.from\(["']template_drafts["']\)\.update/);
    expect(window).not.toMatch(/\.update\(\s*\{\s*svg_content:/);
  });

  it('Test 3: index.ts dispatches action=save_edit to saveEdit handler', () => {
    expect(indexSrc).toMatch(/import\s+\{\s*saveEdit\s*\}\s+from\s+["']\.\/handlers\/saveEdit\.ts["']/);
    expect(indexSrc).toMatch(/body\.action\s*===\s*["']save_edit["']/);
  });

  it('Test 4: handlers/saveEdit.ts exists and imports validateSvg', () => {
    expect(fs.existsSync(HANDLER_PATH)).toBe(true);
    const handlerSrc = fs.readFileSync(HANDLER_PATH, 'utf8');
    expect(handlerSrc).toMatch(/import\s+\{\s*validateSvg\s*\}\s+from\s+["']\.\.\/svgValidator\.ts["']/);
  });

  it('Test 5: handler runs validateSvg BEFORE .update(template_drafts) — source-order gate', () => {
    const handlerSrc = fs.readFileSync(HANDLER_PATH, 'utf8');
    const validateIdx = handlerSrc.search(/validateSvg\(/);
    const updateIdx = handlerSrc.search(/\.from\(["']template_drafts["']\)\s*\.update\(/);
    expect(validateIdx).toBeGreaterThan(0);
    expect(updateIdx).toBeGreaterThan(validateIdx);
  });

  it('Test 6: handler throws 422 on validator failure', () => {
    const handlerSrc = fs.readFileSync(HANDLER_PATH, 'utf8');
    expect(handlerSrc).toMatch(/throw\s+new\s+Response/);
    expect(handlerSrc).toMatch(/status:\s*422/);
  });
});
