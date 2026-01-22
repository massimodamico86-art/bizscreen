# Phase 2: XSS Prevention - Research

**Researched:** 2026-01-22
**Domain:** XSS Prevention, HTML Sanitization, React Security
**Confidence:** HIGH

## Summary

XSS prevention in React applications centers on proper HTML sanitization before rendering user-generated or dynamic content. The industry standard is DOMPurify (v3.3.1 as of 2026), a whitelist-based DOM sanitizer that handles HTML, MathML, and SVG. React's built-in protections (automatic escaping in JSX) are bypassed by `dangerouslySetInnerHTML` and direct DOM manipulation via `innerHTML`, creating vulnerabilities.

The current codebase has two identified XSS vectors:
1. **HelpCenterPage**: Uses `dangerouslySetInnerHTML` without sanitization for markdown-like formatting
2. **SVG editor LeftSidebar**: Uses `innerHTML` mutation in error handler (line 744)

**Primary recommendation:** Use isomorphic-dompurify with a centralized SafeHTML wrapper component to sanitize all dynamic HTML, implement DOMPurify hooks to track removed content for logging, and replace direct DOM manipulation with React state management.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| isomorphic-dompurify | 2.26.0+ | HTML sanitization (client + server) | Wraps DOMPurify with jsdom for Node.js compatibility, required for SSR/build-time sanitization |
| dompurify | 3.3.1 | Core XSS sanitizer | Industry-standard whitelist-based sanitizer, actively maintained by Cure53, 1.2M+ weekly downloads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-react | Latest | Detect dangerouslySetInnerHTML usage | Pre-commit linting to flag all dangerous HTML rendering |
| @eslint-react/eslint-plugin | Latest | Enhanced React security rules | More comprehensive XSS detection including innerHTML patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMPurify | sanitize-html (npm) | Less battle-tested, smaller community, fewer framework integrations |
| isomorphic-dompurify | Manual jsdom setup | More complex, error-prone, requires maintaining compatibility |
| DOMPurify | Sanitizer API (native browser) | Not fully standardized across browsers as of 2026, no server-side support |

**Installation:**
```bash
npm install isomorphic-dompurify
npm install --save-dev eslint-plugin-react @eslint-react/eslint-plugin
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── security/
│   ├── SafeHTML.jsx           # Centralized sanitization component
│   ├── sanitize.js            # DOMPurify configuration + hooks
│   └── sanitizationLogger.js  # Logging service for removed content
├── components/
│   └── [existing components]  # Use SafeHTML instead of dangerouslySetInnerHTML
└── services/
    └── securityService.js     # Security dashboard data service
```

### Pattern 1: Centralized SafeHTML Component
**What:** Wrapper component that encapsulates DOMPurify sanitization
**When to use:** Every instance of dynamic HTML rendering
**Example:**
```javascript
// Source: https://blog.openreplay.com/securing-react-with-dompurify/
// Source: https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2.html
import DOMPurify from 'isomorphic-dompurify';

export function SafeHTML({ html, allowedTags, allowedAttributes, className }) {
  const config = {
    ALLOWED_TAGS: allowedTags || ['b', 'i', 'u', 's', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'table', 'tr', 'td', 'th', 'img'],
    ALLOWED_ATTR: allowedAttributes || ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style'],
    ALLOW_DATA_ATTR: false, // Disable by default for security
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: true, // Use Trusted Types API when available
  };

  const sanitized = DOMPurify.sanitize(html, config);

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Pattern 2: DOMPurify Hooks for Logging
**What:** Use DOMPurify's hook system to track sanitization events
**When to use:** For logging and monitoring requirements
**Example:**
```javascript
// Source: https://snyk.io/advisor/npm-package/dompurify/functions/dompurify.addHook
// Source: https://github.com/cure53/DOMPurify/issues/888
import DOMPurify from 'isomorphic-dompurify';

function setupSanitizationLogging() {
  const removedElements = [];

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.allowedTags[data.tagName] === false) {
      removedElements.push({
        type: 'element',
        tag: data.tagName,
        timestamp: new Date().toISOString(),
      });
    }
  });

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Track removed attributes via DOMPurify.removed
    if (DOMPurify.removed && DOMPurify.removed.length > 0) {
      // Log sanitization event
      logSanitizationEvent({
        removed: DOMPurify.removed,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return () => {
    DOMPurify.removeAllHooks();
  };
}
```

### Pattern 3: Replace innerHTML with React State
**What:** Convert direct DOM manipulation to React state updates
**When to use:** Replacing innerHTML mutations in event handlers
**Example:**
```javascript
// Source: https://www.stackhawk.com/blog/react-xss-guide-examples-and-prevention/
// Source: https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2

// BEFORE (vulnerable):
onError={(e) => {
  e.target.style.display = 'none';
  e.target.parentElement.innerHTML = `<span>${item.alt}</span>`;
}}

// AFTER (secure):
const [imageError, setImageError] = useState(false);

onError={() => setImageError(true)}

{imageError ? (
  <span className="text-xs text-gray-400">{item.alt}</span>
) : (
  <img src={item.url} alt={item.alt} />
)}
```

### Pattern 4: DOMPurify Configuration for Rich Content
**What:** Configure DOMPurify to allow specific formatting while blocking XSS
**When to use:** Help center content, user-generated rich text
**Example:**
```javascript
// Source: https://github.com/cure53/DOMPurify
// Configuration based on user decisions from CONTEXT.md
const richContentConfig = {
  ALLOWED_TAGS: [
    'b', 'i', 'u', 's', 'em', 'strong', 'mark',  // Rich text formatting
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',           // Headings
    'p', 'br', 'hr',                              // Paragraphs
    'ul', 'ol', 'li',                             // Lists
    'table', 'thead', 'tbody', 'tr', 'th', 'td',  // Tables
    'a',                                          // Links (any URL)
    'img',                                        // Images (any source)
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',     // Link attributes
    'src', 'alt', 'title',       // Image attributes
    'style',                     // Inline CSS (per user decision)
    'class',                     // CSS classes
  ],
  ALLOW_DATA_ATTR: false,        // Security: disable data-* by default
  KEEP_CONTENT: true,            // Keep text content when removing tags
  RETURN_TRUSTED_TYPE: true,     // Use Trusted Types API if available
};
```

### Anti-Patterns to Avoid
- **Don't sanitize after modification:** If you sanitize HTML and then modify it, you void the sanitization. Always sanitize as the final step before rendering.
- **Don't use dangerouslySetInnerHTML directly:** Always wrap it in a security component that code scanners can track.
- **Don't rely on client-side only:** Sanitize on the server when receiving user input AND on the client before rendering.
- **Don't use DOMPurify.removed for security decisions:** This property is for debugging only, not for access control or security logic.
- **Don't allow data-* attributes without careful review:** They can be exploited by framework-specific script gadgets.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Regex-based tag stripping | DOMPurify | Mutation XSS: browser parsing differs from regex parsing, allowing bypasses through malformed HTML |
| SVG sanitization | Custom SVG parser | DOMPurify with USE_PROFILES: {svg: true} | SVG has unique XSS vectors (script tags, event handlers in SVG namespace, XML entities) |
| Markdown to HTML | Manual markdown parser + innerHTML | markdown-it + DOMPurify | Edge cases in markdown syntax, nested structures, and HTML injection points |
| URL validation for href | Regex URL checks | DOMPurify default URL handling | javascript:, data:, vbscript: protocol bypasses, unicode encoding tricks |
| CSS sanitization | String filtering for style attributes | DOMPurify (handles CSS XSS) | CSS expressions, import rules, url() with javascript:, -moz-binding exploits |
| Template syntax stripping | Manual regex replace | DOMPurify SAFE_FOR_TEMPLATES: true | Template engines have complex syntax, nested interpolation, comment escaping |

**Key insight:** Browser HTML parsers are incredibly complex and differ across browsers. Attackers exploit parser quirks that simple string manipulation misses. DOMPurify uses the actual browser DOM parser, making it resistant to parser-differential attacks.

## Common Pitfalls

### Pitfall 1: Allowing Inline Styles Without Understanding CSS XSS
**What goes wrong:** User-specified style attributes can execute JavaScript through CSS expressions (legacy IE), import rules, or url() values with javascript: protocol.
**Why it happens:** Developers think CSS is "safe" compared to JavaScript, but CSS has historically had multiple XSS vectors.
**How to avoid:** DOMPurify handles CSS sanitization when ALLOWED_ATTR includes 'style', but be aware of the attack surface. Monitor DOMPurify updates for CSS-related security patches.
**Warning signs:** Security scanner alerts about style attributes, unexpected CSS behavior in legacy browsers.

### Pitfall 2: Configuration That Allows Dangerous Tags
**What goes wrong:** Adding custom tags with ADD_TAGS or overriding ALLOWED_TAGS to include script, iframe, object, embed, or other executable elements.
**Why it happens:** Developer adds convenience features without understanding security implications: "users want to embed YouTube videos" leads to allowing all iframes.
**How to avoid:** Use the smallest possible allowlist. For iframes, create a separate component that validates against a domain allowlist (YouTube, Vimeo only) rather than allowing arbitrary iframe tags.
**Warning signs:** Any configuration including: script, iframe (without strict src validation), object, embed, style (tag, not attribute), link, meta, base.

### Pitfall 3: Sanitizing and Then Modifying
**What goes wrong:** Code sanitizes HTML, then passes it to a library that mutates the string (templating engine, string replacer, etc.), voiding sanitization.
**Why it happens:** Separation between sanitization and rendering logic, especially in complex component hierarchies.
**How to avoid:** Sanitize at the render boundary, immediately before dangerouslySetInnerHTML. Never pass sanitized HTML through intermediate processing.
**Warning signs:** Sanitization happening in utility functions far from render, sanitized strings stored in state then modified before display.

### Pitfall 4: Not Tracking Removed Content
**What goes wrong:** Sanitization silently removes malicious content, but there's no visibility into what was removed or who submitted it.
**Why it happens:** DOMPurify focuses on output safety, not monitoring. Logging requires additional implementation.
**How to avoid:** Implement hooks to track DOMPurify.removed, log all sanitization events with user context, create alerting for repeated attempts.
**Warning signs:** Users report "content not displaying," no audit trail for security incidents, attackers probe without detection.

### Pitfall 5: Server-Side Rendering Without jsdom
**What goes wrong:** Using dompurify directly in Node.js without a DOM implementation fails: "window is not defined."
**Why it happens:** DOMPurify requires browser DOM APIs, which don't exist in Node.js.
**How to avoid:** Use isomorphic-dompurify (includes jsdom) for server-side code. Ensure jsdom is v20.0.0+ (v19.0.0 has known XSS vulnerabilities).
**Warning signs:** Build failures, SSR errors about window/document, inconsistent sanitization between client and server.

### Pitfall 6: Direct DOM Manipulation in React Components
**What goes wrong:** Using innerHTML, outerHTML, or document.write directly circumvents React's XSS protections and breaks React's virtual DOM.
**Why it happens:** Porting non-React code, implementing "quick fixes," working around React limitations.
**How to avoid:** Never use innerHTML in React. Use React state + conditional rendering for dynamic content. Use refs with textContent (not innerHTML) if DOM access is absolutely required.
**Warning signs:** DOM mutation in event handlers, refs used to inject HTML, component state out of sync with rendered DOM.

## Code Examples

Verified patterns from official sources:

### Basic Sanitization with DOMPurify
```javascript
// Source: https://github.com/cure53/DOMPurify
import DOMPurify from 'isomorphic-dompurify';

const clean = DOMPurify.sanitize(dirty);
// Simple, secure default configuration
```

### Rich Content Sanitization (Help Center Use Case)
```javascript
// Source: https://github.com/cure53/DOMPurify
// Configuration addresses CONTEXT.md requirements
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHelpContent(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 's', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class'],
    ALLOW_DATA_ATTR: false,  // Per Claude's discretion: security-first approach
    KEEP_CONTENT: true,
    // Silent removal (per user decision)
    // Logging happens via hooks, not inline
  });
}
```

### SVG Sanitization
```javascript
// Source: https://github.com/cure53/DOMPurify
import DOMPurify from 'isomorphic-dompurify';

function sanitizeSVG(svgString) {
  return DOMPurify.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'defs', 'clipPath', 'mask'], // Common SVG elements
    ADD_ATTR: ['xmlns', 'viewBox', 'd', 'transform'], // SVG-specific attributes
  });
}
```

### Logging Hook Implementation
```javascript
// Source: https://snyk.io/advisor/npm-package/dompurify/functions/dompurify.addHook
// Source: https://github.com/cure53/DOMPurify/blob/main/demos/README.md
import DOMPurify from 'isomorphic-dompurify';
import { logSecurityEvent } from './securityService';

export function initializeSanitizationLogging() {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Log all sanitization events (per user decision)
    if (DOMPurify.removed && DOMPurify.removed.length > 0) {
      logSecurityEvent({
        type: 'sanitization',
        removed: DOMPurify.removed.map(item => ({
          element: item.element?.nodeName,
          attribute: item.attribute?.name,
          from: item.from?.nodeName,
        })),
        timestamp: new Date().toISOString(),
        // User context would be added by securityService
      });

      // Reset for next sanitization
      DOMPurify.removed = [];
    }
  });
}
```

### ESLint Configuration
```javascript
// Source: https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger.md
// .eslintrc.js
module.exports = {
  plugins: ['react', '@eslint-react'],
  rules: {
    'react/no-danger': 'error', // Flag all dangerouslySetInnerHTML
    'react/no-danger-with-children': 'error',
    '@eslint-react/dom-no-dangerously-set-innerhtml': 'warn', // More comprehensive
  },
};
```

### Content Security Policy Header
```javascript
// Source: https://www.stackhawk.com/blog/react-content-security-policy-guide-what-it-is-and-how-to-enable-it/
// Source: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
// Express.js example
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'strict-dynamic'; " +
    "style-src 'self' 'unsafe-inline'; " + // Required for React inline styles
    "img-src 'self' https: data:; " +
    "base-uri 'self';"
  );
  next();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-based sanitization | DOMPurify DOM-based sanitization | 2014 (DOMPurify created) | Eliminates mutation XSS via parser-differential attacks |
| Client-side only sanitization | Isomorphic (client + server) | ~2020 (SSR prevalence) | Consistent sanitization across rendering contexts |
| Blacklist filtering | Whitelist-only approach | Industry-wide since ~2015 | Blocks unknown/future attack vectors by default |
| Global DOMPurify config | Per-context configuration | DOMPurify 2.x+ | Different content types (help docs vs user comments) need different rules |
| Manual hook implementation | Built-in hook system | DOMPurify 2.x+ (2019) | Standardized way to track sanitization, custom validation |
| innerHTML for dynamic content | React state + JSX | React best practices | Leverages React's automatic escaping, maintains virtual DOM |

**Deprecated/outdated:**
- **xss (npm package):** Less comprehensive than DOMPurify, smaller community, fewer security audits
- **sanitize-html:** Regex-based, susceptible to parser-differential attacks
- **Manual jsdom setup:** isomorphic-dompurify now handles this, reducing error-prone configuration
- **Client-side URL validation:** React cannot safely validate javascript:/data: URLs without libraries

## Open Questions

Things that couldn't be fully resolved:

1. **Iframe allowlist domains**
   - What we know: User decision allows "any URL" for hyperlinks and "any source" for images, but iframes not explicitly mentioned
   - What's unclear: Whether embed functionality (YouTube, Vimeo, Google Maps) is in scope for Phase 2
   - Recommendation: Start with no iframe support, add in future phase with strict domain allowlist if needed

2. **Preview behavior (Claude's discretion)**
   - What we know: User wants silent removal without feedback
   - What's unclear: Whether to show sanitized preview on blur (before submit) for UX purposes
   - Recommendation: Show sanitized result on blur only in edit contexts (help article editor), not in user-facing displays

3. **Admin diff view (Claude's discretion)**
   - What we know: Dedicated security dashboard required
   - What's unclear: Whether to show exact content that was stripped (could contain sensitive/malicious data)
   - Recommendation: Show summary only ("3 script tags removed") not actual content, to avoid storing attack payloads

4. **Data attributes preservation (Claude's discretion)**
   - What we know: data-* attributes can be exploited by framework-specific script gadgets
   - What's unclear: Whether React components in the app rely on data-* for functionality
   - Recommendation: Set ALLOW_DATA_ATTR: false initially, add specific attributes with ADD_ATTR only if needed

5. **SVG editor approach (Claude's discretion)**
   - What we know: Current LeftSidebar has innerHTML mutation vulnerability
   - What's unclear: Whether SVG content itself needs sanitization or just the error handler
   - Recommendation: Fix innerHTML mutation with React state (immediate), evaluate SVG content sanitization separately based on whether users can inject SVG markup

## Sources

### Primary (HIGH confidence)
- [DOMPurify GitHub Repository](https://github.com/cure53/DOMPurify) - Official documentation, v3.3.1 verified
- [DOMPurify npm Package](https://www.npmjs.com/package/dompurify) - Current version, installation instructions
- [isomorphic-dompurify GitHub](https://github.com/kkomelin/isomorphic-dompurify) - Server-side rendering solution
- [DOMPurify Demo README](https://github.com/cure53/DOMPurify/blob/main/demos/README.md) - Hook examples, configuration patterns
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) - Security best practices
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) - Content Security Policy guidance

### Secondary (MEDIUM confidence)
- [Pragmatic Web Security: React XSS Part 2](https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2.html) - dangerouslySetInnerHTML patterns
- [StackHawk: React XSS Guide](https://www.stackhawk.com/blog/react-xss-guide-examples-and-prevention/) - React-specific vulnerabilities
- [OpenReplay: Securing React with DOMPurify](https://blog.openreplay.com/securing-react-with-dompurify/) - Component wrapper patterns
- [StackHawk: React CSP Guide](https://www.stackhawk.com/blog/react-content-security-policy-guide-what-it-is-and-how-to-enable-it/) - CSP implementation
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) - Browser CSP documentation
- [ESLint React Plugin](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-danger.md) - Linting rules
- [GloryWebs: React Security Best Practices 2026](https://www.glorywebs.com/blog/react-security-practices) - Current security patterns

### Tertiary (LOW confidence - WebSearch only)
- [Mizu.re: DOMPurify Misconfigurations](https://mizu.re/post/exploring-the-dompurify-library-hunting-for-misconfigurations) - Security research on bypasses (useful for pitfalls, but specific exploits require verification)
- [Snyk: DOMPurify CVEs](https://security.snyk.io/vuln/SNYK-JS-DOMPURIFY-2863266) - Historical vulnerabilities (dates unclear)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - DOMPurify is industry-standard with 1.2M+ weekly downloads, actively maintained by security firm Cure53
- Architecture: HIGH - Patterns verified in official DOMPurify demos and React security guides
- Pitfalls: MEDIUM - Based on WebSearch of security research and common mistakes, verified against official docs where possible
- Code examples: HIGH - All examples from official DOMPurify docs, OWASP, or verified React security resources
- Configuration specifics: HIGH - DOMPurify options confirmed in official GitHub and npm documentation

**Research date:** 2026-01-22
**Valid until:** Approximately 30 days (March 2026) - DOMPurify is stable but regularly updated for new attack vectors; check for security releases before implementation
