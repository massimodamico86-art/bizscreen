import DOMPurify from 'dompurify';

/**
 * TemplateDraftPreview — Phase 177 inline sanitized SVG preview for the Pending tab (D-03).
 *
 * SECURITY-CRITICAL: The DOMPurify config below MUST mirror these sites byte-for-byte:
 *   - src/services/svgValidator.js Rule 4
 *   - src/services/templateApplyService.js apply-time sanitize call
 * ANY drift = production security regression (Pitfall 5 — drift check is svgValidator Rule 4).
 *
 * BL-04 (Phase 177 gap-closure 177-07): config tightened to FORBID_TAGS:['style'], FORBID_ATTR:['style']
 * to strip <style> blocks and style attributes that DOMPurify's SVG profile permits by design.
 *
 * Anti-pattern (do NOT use): rendering raw SVG as a data-URI image source string
 *   — defeats DOMPurify and gives no validator path. Always render via sanitized inline HTML.
 */
export default function TemplateDraftPreview({ svgContent, className, style }) {
  const sanitized = svgContent
    ? DOMPurify.sanitize(svgContent, {
        // BL-04 mirror — see svgValidator.js Rule 4 header for the locked-config rationale.
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['style'],
        FORBID_ATTR: ['style'],
      })
    : '';
  return (
    <div
      className={className}
      style={style}
      // sanitized via DOMPurify above (locked config — see header comment)
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
