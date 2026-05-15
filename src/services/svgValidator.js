/**
 * svgValidator — Phase 175 New Template Content + Quality Pass
 *
 * Responsibilities:
 *  - Validate SVG strings for the new template content gate (TCTN-02)
 *  - Run identically in browser (BulkTemplateUpload.jsx) and Node (CLI script)
 *  - Detect: malformed XML, currentColor / var(--*) tokens (Pitfall 6),
 *    DOMPurify byte-equality drift (Pitfall 5), customization anchors,
 *    required dimensions, file size cap
 *
 * Conventions:
 *  - Named export only (validateSvg)
 *  - Pure function — no React, no Supabase, no network
 *  - No try/catch leaking — return { ok: false, errors: [...] } instead
 *  - Optional opts.DOMParserCtor + opts.DOMPurify for Node injection
 *
 * DOMPurify config is LOAD-BEARING — must mirror templateApplyService.js
 * and TemplateDraftPreview.jsx byte-for-byte (Phase 175 Pitfall 5;
 * BL-04 closure 177-07 added FORBID_TAGS+FORBID_ATTR for <style>):
 *   { USE_PROFILES: { svg: true, svgFilters: true },
 *     FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] }
 */
import DOMPurifyDefault from 'dompurify';

const FORBIDDEN_COLOR_TOKENS = [
  { re: /currentColor/i, label: 'currentColor' },
  { re: /var\(--/i, label: 'var(--*)' },
];

// BL-04 closure (Phase 177 gap-closure 177-07): block CSS-injection payloads.
// LLM-controlled content can ship @import / url(http://) / inline javascript:
// pseudo-protocol — all of which DOMPurify's SVG profile permits by design.
// Tenant-facing blast radius: post-approval content renders to ALL tenants
// via TemplateGalleryPage (public surface).
const FORBIDDEN_CONTENT_TOKENS = [
  { re: /@import\b/i, label: '@import (CSS)' },
  { re: /url\s*\(\s*['"]?https?:/i, label: 'url(http(s)://...)' },
  { re: /url\s*\(\s*['"]?\/\//i, label: 'url(//...) protocol-relative' },
  { re: /\bjavascript\s*:/i, label: 'javascript: pseudo-protocol' },
];

const MAX_BYTES = 200_000;
const DRIFT_THRESHOLD = 0.05;

export function validateSvg(svgString, opts = {}) {
  const errors = [];
  const warnings = [];

  if (svgString === null || svgString === undefined || typeof svgString !== 'string') {
    return { ok: false, errors: ['Empty or non-string input'], warnings };
  }
  if (svgString.length === 0) {
    return { ok: false, errors: ['Empty input'], warnings };
  }

  // Rule 6: size cap (200KB) — runs before parser to avoid pathological CPU on huge inputs.
  if (svgString.length > MAX_BYTES) {
    errors.push(`SVG exceeds ${MAX_BYTES} bytes (got ${svgString.length})`);
  }

  // Rule 1: well-formed XML via DOMParser (jsdom in Node, native in browser).
  const DOMParserCtor =
    opts.DOMParserCtor ||
    (typeof DOMParser !== 'undefined' ? DOMParser : null);
  if (!DOMParserCtor) {
    errors.push('No DOMParser available — pass opts.DOMParserCtor in Node');
    return { ok: false, errors, warnings };
  }

  let doc;
  try {
    doc = new DOMParserCtor().parseFromString(svgString, 'image/svg+xml');
  } catch (e) {
    errors.push(`XML parse threw: ${e && e.message ? e.message.slice(0, 200) : 'unknown error'}`);
    return { ok: false, errors, warnings };
  }
  let parserError = doc.querySelector('parsererror');

  // Tolerance retry: many real-world SVG templates use xlink:href without
  // declaring xmlns:xlink. Modern browsers and DOMPurify tolerate this; strict
  // XML parsers (jsdom) reject. If the only parse error is an unbound xlink
  // prefix, retry once with the namespace injected and surface a warning
  // instead of a hard error. This keeps the validator usable against the
  // existing template library while still flagging genuine XML defects.
  if (parserError && /unbound namespace prefix.*xlink/i.test(parserError.textContent || '')) {
    const patched = svgString.replace(
      /<svg\b([^>]*)>/i,
      (match, attrs) => {
        if (/xmlns:xlink\s*=/i.test(attrs)) return match;
        return `<svg${attrs} xmlns:xlink="http://www.w3.org/1999/xlink">`;
      }
    );
    if (patched !== svgString) {
      let docRetry;
      try {
        docRetry = new DOMParserCtor().parseFromString(patched, 'image/svg+xml');
      } catch (_e) {
        docRetry = null;
      }
      const retryError = docRetry && docRetry.querySelector('parsererror');
      if (docRetry && !retryError) {
        doc = docRetry;
        parserError = null;
        warnings.push(
          'xlink namespace used without xmlns:xlink declaration — modern browsers tolerate this, but add xmlns:xlink="http://www.w3.org/1999/xlink" to the <svg> root for strict-XML compliance'
        );
      }
    }
  }

  if (parserError) {
    errors.push(`XML parse error: ${(parserError.textContent || '').slice(0, 200)}`);
  }
  const svg = doc.querySelector('svg');
  if (!svg) {
    errors.push('No <svg> root element found');
  }

  // Rule 2: required dimensions — viewBox OR (width AND height).
  if (svg) {
    const hasW = svg.hasAttribute('width');
    const hasH = svg.hasAttribute('height');
    const hasVB = svg.hasAttribute('viewBox');
    if (!hasVB && (!hasW || !hasH)) {
      errors.push('SVG must declare viewBox OR both width and height');
    }
  }

  // Rule 3: forbidden color tokens (Pitfall 6 — silently defeats brand swap).
  for (const { re, label } of FORBIDDEN_COLOR_TOKENS) {
    if (re.test(svgString)) {
      errors.push(`Forbidden color token "${label}" — use explicit hex/rgb (Pitfall 6 silently defeats brand swap)`);
    }
  }

  // BL-04 closure: forbidden content tokens (CSS injection vectors).
  // Runs as a Rule-3-extension — same severity as the color-token check.
  for (const { re, label } of FORBIDDEN_CONTENT_TOKENS) {
    if (re.test(svgString)) {
      errors.push(`Forbidden content token "${label}" — CSS injection vector; remove or replace with inline data URI`);
    }
  }

  // Rule 4: DOMPurify byte-equality drift check (Pitfall 5 — config mirrors
  // templateApplyService.js and TemplateDraftPreview.jsx byte-for-byte).
  // Locked DOMPurify config — MUST mirror byte-for-byte:
  //   - src/services/templateApplyService.js (apply-time)
  //   - src/components/Admin/TemplateDraftPreview.jsx (Pending-tab render)
  // BL-04 (Phase 177 gap-closure 177-07): added FORBID_TAGS/FORBID_ATTR for <style>+style
  // because DOMPurify's SVG profile permits these by design and they are CSS-injection vectors.
  const purifier = opts.DOMPurify || DOMPurifyDefault;
  if (purifier && typeof purifier.sanitize === 'function') {
    const sanitized = purifier.sanitize(svgString, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['style'],
      FORBID_ATTR: ['style'],
    });
    if (typeof sanitized === 'string') {
      if (sanitized.length === 0) {
        errors.push('DOMPurify returned empty — likely stripped <svg> root or contains only forbidden content');
      } else {
        const drift = Math.abs(sanitized.length - svgString.length) / svgString.length;
        if (drift > DRIFT_THRESHOLD) {
          warnings.push(
            `DOMPurify altered SVG (${svgString.length} -> ${sanitized.length} bytes, ${(drift * 100).toFixed(1)}% drift); review for stripped script/event/javascript: content`
          );
        }
      }
    }
  } else {
    warnings.push('DOMPurify unavailable — sanitization check skipped');
  }

  // Rule 5: customization anchors — at least one of:
  //   (a) <image id="logo">, <image class="logo">, id ending in "-placeholder"
  //   (b) <text id="title">, <text id="text-*">, any [id^="text-"]
  //   (c) any [data-customize-*] attribute
  if (svg) {
    const hasLogo =
      !!doc.querySelector('image#logo') ||
      !!doc.querySelector('image.logo') ||
      !!doc.querySelector('image#logo-placeholder') ||
      !!doc.querySelector('[id$="-placeholder"]');
    const hasTextAnchor =
      !!doc.querySelector('text#title') ||
      !!doc.querySelector('text[id^="text-"]') ||
      !!doc.querySelector('[id^="text-"]');
    const hasDataCustomize =
      !!doc.querySelector('[data-customize-color]') ||
      !!doc.querySelector('[data-customize-text]') ||
      !!doc.querySelector('[data-customize-logo]') ||
      !!doc.querySelector('[data-customize-image]');
    if (!hasLogo && !hasTextAnchor && !hasDataCustomize) {
      warnings.push(
        'No customization anchors found (id="logo", id^="text-", or [data-customize-*]) — QuickCustomize will offer no edit targets'
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
