# Phase 27: Performance Optimization - Research

**Researched:** 2026-01-28
**Domain:** Vite bundle optimization, code splitting, tree shaking
**Confidence:** HIGH

## Summary

This phase focuses on bundle analysis, code splitting, and tree shaking verification for the BizScreen application. The codebase is already well-structured for optimization:

- **Vite 7.2.2** is the build tool with Rollup under the hood
- **React 19.2.0** with React Router for routing
- **rollup-plugin-visualizer 6.0.5** already installed and configured
- **Lazy loading** already implemented in App.jsx (68+ lazy-loaded pages) and AppRouter.jsx

The current build produces 145 JS chunks totaling 4.3MB uncompressed. The initial load includes:
- `index-*.js` (268KB) - entry point
- `vendor-react-*.js` (43KB) - React, ReactDOM, React Router
- `vendor-motion-*.js` (113KB) - framer-motion (preloaded but not always needed)
- `vendor-supabase-*.js` (164KB) - Supabase client

**Primary recommendation:** Add `npm run analyze` script, establish baseline metrics, optimize the Player route (274KB), and verify tree shaking is working correctly for barrel exports.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rollup-plugin-visualizer | 6.0.5 | Bundle visualization | Most popular for Vite (3.1M weekly downloads) |
| Vite | 7.2.2 | Build tool | Built-in code splitting via Rollup |
| terser | 5.46.0 | Minification | Already configured for console removal |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React.lazy | (React 19) | Component lazy loading | Route-level code splitting |
| Suspense | (React 19) | Loading boundaries | Wrap lazy components |

### No Additional Libraries Needed
The project already has all required tooling. The work is configuration and verification, not adding dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rollup-plugin-visualizer | vite-bundle-analyzer | Similar features, visualizer more popular |
| rollup-plugin-visualizer | source-map-explorer | source-map-explorer better for debugging, visualizer better for overview |
| rollup-plugin-visualizer | Sonda | Sonda newer/universal, but visualizer already installed |

## Architecture Patterns

### Current Project Structure (Good)
```
src/
├── router/AppRouter.jsx     # Route-level lazy loading
├── App.jsx                  # Dashboard lazy loading (68+ pages)
├── Player.jsx               # Player entry (23 lines, routes only)
├── player/
│   ├── pages/ViewPage.jsx   # Main player page (extracted)
│   ├── components/          # Barrel export at index.js
│   └── hooks/               # Barrel export at index.js
├── pages/                   # All pages lazy loaded
└── components/              # Shared components
```

### Pattern 1: Route-Level Lazy Loading
**What:** Use `React.lazy()` for all route components
**When to use:** Every page that's not needed on initial load
**Already Implemented:** Yes, in AppRouter.jsx and App.jsx

```jsx
// Source: AppRouter.jsx - already implemented correctly
const MarketingLayout = lazy(() => import('../marketing/MarketingLayout'));
const HomePage = lazy(() => import('../marketing/HomePage'));
const App = lazy(() => import('../App'));
const TV = lazy(() => import('../TV'));
const Player = lazy(() => import('../Player'));
```

### Pattern 2: Manual Chunks for Vendors
**What:** Split large vendor libraries into separate cacheable chunks
**When to use:** Libraries that change infrequently
**Already Implemented:** Yes, in vite.config.js

```javascript
// Source: vite.config.js - already configured
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-icons': ['lucide-react'],
  'vendor-motion': ['framer-motion'],
  'vendor-qrcode': ['qrcode'],
}
```

### Pattern 3: Suspense Boundaries
**What:** Wrap lazy components with fallback UI
**When to use:** Every lazy-loaded component
**Already Implemented:** Yes, with PageLoader component

```jsx
// Source: App.jsx - already implemented
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);
```

### Anti-Patterns to Avoid
- **Barrel imports from node_modules:** Import icons directly if needed (`lucide-react/icons/home` vs `lucide-react`)
- **Importing unused exports from barrels:** The player/components/index.js barrel may pull in all components even when only one is needed
- **Preloading everything:** `vendor-motion` is modulepreload but may not be needed on all routes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle visualization | Custom analyzer | rollup-plugin-visualizer | Already installed, industry standard |
| Code splitting | Manual chunk loading | React.lazy + Suspense | Built into React, Vite handles the rest |
| Vendor splitting | Manual concatenation | Vite manualChunks | Already configured |
| Gzip reporting | Custom scripts | rollup-plugin-visualizer gzipSize option | Already configured |

**Key insight:** The tooling is already in place. This phase is about measuring, analyzing, and fine-tuning what's already there.

## Common Pitfalls

### Pitfall 1: Barrel Exports Breaking Tree Shaking
**What goes wrong:** Importing from barrel files (index.js) can pull in entire module trees
**Why it happens:** Bundlers may not tree-shake barrel re-exports perfectly
**How to avoid:**
- Add `"sideEffects": false` to package.json
- For internal barrels, ensure no side effects in re-exported modules
- Consider direct imports for performance-critical paths (Player)
**Warning signs:** Bundle contains code that should have been tree-shaken

### Pitfall 2: Preloading Everything
**What goes wrong:** Using `modulepreload` for chunks not needed on initial load
**Why it happens:** Attempting to speed up navigation wastes bandwidth on initial load
**How to avoid:** Only preload chunks actually needed for critical path
**Warning signs:** Large initial network waterfall, unused preloaded resources

### Pitfall 3: Vendor Chunk Too Large
**What goes wrong:** Single vendor chunk becomes huge and blocks rendering
**Why it happens:** All node_modules bundled together
**How to avoid:** Split by usage pattern (vendor-react, vendor-supabase, etc.)
**Warning signs:** Already avoided - current config splits vendors appropriately

### Pitfall 4: Player Route Loading Dashboard Code
**What goes wrong:** Player (/player/*) loads code from dashboard app
**Why it happens:** Shared dependencies or imports from wrong module
**How to avoid:** Player should only import from player/ directory, services/, and hooks/
**Warning signs:** Player chunk (274KB) seems large for its functionality

### Pitfall 5: Not Measuring Before Optimizing
**What goes wrong:** Optimizing without baseline, can't prove improvement
**Why it happens:** Enthusiasm to "fix" things
**How to avoid:** Document baseline metrics first, then optimize
**Warning signs:** No recorded metrics before changes

## Code Examples

### Running Bundle Analysis
```bash
# Build with visualization (current config already does this)
npm run build

# View report
open perf-reports/bundle-stats.html
```

### Adding Analyze Script (Recommended)
```json
// package.json scripts section
{
  "scripts": {
    "analyze": "npm run build && open perf-reports/bundle-stats.html"
  }
}
```

### Enabling sideEffects for Better Tree Shaking
```json
// package.json
{
  "sideEffects": false
}
```

Note: If CSS imports cause issues, use:
```json
{
  "sideEffects": ["*.css", "*.scss"]
}
```

### Direct Icon Imports (Alternative to Barrel)
```jsx
// Instead of (pulls in icon registry):
import { Home, Settings, User } from 'lucide-react';

// More tree-shakable (when barrel causes issues):
import Home from 'lucide-react/icons/home';
import Settings from 'lucide-react/icons/settings';
import User from 'lucide-react/icons/user';
```

### Verifying Tree Shaking
```javascript
// Check if unused export is in bundle:
// 1. Export something unused from a module
// 2. Build
// 3. Search dist/ for that export name
// 4. If found, tree shaking failed for that module

// Example verification:
grep -r "unusedExportName" dist/assets/*.js
// Should return nothing if tree shaking works
```

### Checking Bundle Contents
```bash
# Find what's in a specific chunk
cat dist/assets/Player-*.js | head -100

# Count lines in largest bundles
wc -l dist/assets/*.js | sort -rn | head -10

# Find chunks containing specific code
grep -l "supabase" dist/assets/*.js
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| webpack-bundle-analyzer | rollup-plugin-visualizer | Vite adoption | Native Rollup integration |
| Component.lazy polyfill | React.lazy native | React 16.6+ | Built-in, no polyfill |
| Manual chunk names | Content-hash names | Vite default | Better cache invalidation |
| Single vendor bundle | Split vendor chunks | Best practice | Parallel downloads |

**Current/Modern:**
- Vite 7.x with Rollup code splitting
- React 19 Suspense boundaries
- ES modules with tree shaking
- Content-hashed chunk names

## Current State Analysis

### Bundle Metrics (as of 2026-01-27)
| Metric | Value |
|--------|-------|
| Total JS chunks | 145 files |
| Total JS size (uncompressed) | 4.3MB |
| Largest chunk | SvgEditorPage (416KB) |
| Player chunk | 274KB |
| Main index chunk | 268KB |
| vendor-react | 43KB |
| vendor-supabase | 164KB |
| vendor-motion | 113KB |
| vendor-icons | 60KB |

### Initial Load Analysis
From index.html, initial page load includes:
1. `index-*.js` (268KB) - Must load
2. `vendor-react-*.js` (43KB) - Preloaded
3. `vendor-motion-*.js` (113KB) - Preloaded (questionable - may not be needed)
4. `vendor-supabase-*.js` (164KB) - Preloaded

**Initial JS footprint: ~588KB uncompressed**

### Opportunities Identified

1. **Player route optimization (HIGH priority)**
   - Current: 274KB chunk
   - Player only needs: PairPage, ViewPage, player hooks/components
   - May be pulling in unnecessary dependencies

2. **vendor-motion preload (MEDIUM priority)**
   - 113KB preloaded on every page
   - Only needed when animations are used
   - Consider removing preload, let it lazy load

3. **alertEngineService (LOW priority)**
   - 176KB chunk
   - Verify it's lazy loaded appropriately

4. **Tree shaking verification (MEDIUM priority)**
   - Add `"sideEffects": false` to package.json
   - Verify lucide-react icons are tree-shaken

## Open Questions

Things that couldn't be fully resolved:

1. **What's making Player chunk 274KB?**
   - What we know: Player.jsx is only 23 lines, imports ViewPage and PairPage
   - What's unclear: Which dependencies are pulling in extra code
   - Recommendation: Use bundle visualizer to analyze Player chunk contents

2. **Is framer-motion preload necessary?**
   - What we know: It's in modulepreload in index.html
   - What's unclear: Which initial routes actually use motion
   - Recommendation: Test removing preload, measure impact

3. **Are barrel exports tree-shaking correctly?**
   - What we know: player/components/index.js re-exports all components
   - What's unclear: Whether unused exports are eliminated
   - Recommendation: Add sideEffects: false, verify with grep

## Sources

### Primary (HIGH confidence)
- Vite official docs - [Build Options](https://vite.dev/config/build-options)
- Vite official docs - [Features](https://vite.dev/guide/features)
- React official docs - [Code Splitting](https://legacy.reactjs.org/docs/code-splitting.html)
- rollup-plugin-visualizer - [GitHub](https://github.com/btd/rollup-plugin-visualizer)

### Secondary (MEDIUM confidence)
- [Vite code splitting that just works](https://sambitsahoo.com/blog/vite-code-splitting-that-works.html)
- [Optimizing React Vite Bundle Size](https://shaxadd.medium.com/optimizing-your-react-vite-application-a-guide-to-reducing-bundle-size-6b7e93891c96)
- [Tree shaking lucide-react icons with Vite](https://javascript.plainenglish.io/tree-shaking-lucide-react-icons-with-vite-and-vitest-57bf4cfe6032)
- [The Barrel Trap](https://dev.to/elmay/the-barrel-trap-how-i-learned-to-stop-re-exporting-and-love-explicit-imports-3872)

### Tertiary (LOW confidence)
- WebSearch results for best practices (general guidance, verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, documented in package.json and vite.config.js
- Architecture: HIGH - Patterns already implemented in codebase
- Pitfalls: MEDIUM - Based on common issues documented in community
- Optimization targets: MEDIUM - Based on current bundle analysis, needs validation

**Research date:** 2026-01-28
**Valid until:** 60 days (stable tooling, unlikely to change)

---

## Recommendations for Planning

1. **Task 1: Establish Baseline**
   - Add `npm run analyze` script
   - Generate fresh bundle report
   - Document current metrics in .planning/

2. **Task 2: Optimize Player Route**
   - Analyze Player chunk contents
   - Ensure Player only imports player/ modules
   - Target: reduce from 274KB

3. **Task 3: Verify Tree Shaking**
   - Add `"sideEffects": false` to package.json
   - Test with grep for unused exports
   - Document verification results

4. **Task 4: Review Preloads**
   - Evaluate vendor-motion preload necessity
   - Measure impact of removing unnecessary preloads
   - Document findings

5. **Task 5: Document Ongoing Practices**
   - Add bundle size monitoring guidance
   - Document when to run analysis
   - Set size budgets for key routes
