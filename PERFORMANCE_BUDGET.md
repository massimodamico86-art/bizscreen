# Performance Budget

This document defines performance targets for BizScreen to ensure a fast, responsive user experience.

## Core Web Vitals Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| **FID** (First Input Delay) | < 100ms | 100-300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | < 1.5s | 1.5-2s | > 2s |
| **TTI** (Time to Interactive) | < 4s | 4-6s | > 6s |

## Bundle Size Budgets

### JavaScript Bundles (Gzipped)

| Category | Budget | Current |
|----------|--------|---------|
| **Initial JS** (critical path) | < 150 KB | ~64 KB |
| **Vendor React** | < 20 KB | ~16 KB |
| **Vendor Supabase** | < 50 KB | ~44 KB |
| **Vendor Icons** | < 15 KB | ~12 KB |
| **Vendor Motion** | < 40 KB | ~38 KB |
| **Total App Bundles** | < 250 KB | ~99 KB |
| **Single Page Chunk** | < 50 KB | varies |
| **Total (all routes loaded)** | < 600 KB | ~400 KB |

### CSS

| Category | Budget | Current |
|----------|--------|---------|
| **Main CSS** | < 20 KB | ~13 KB |

## Page Load Time Budgets

| Page | Target | Notes |
|------|--------|-------|
| Homepage (unauthenticated) | < 2s | First meaningful paint |
| Login page | < 1.5s | Critical for conversion |
| Dashboard (authenticated) | < 3s | After login, includes lazy chunks |
| Media Library | < 3s | May load additional media |
| Screens page | < 3s | Real-time data fetch |

## Code Splitting Strategy

BizScreen uses aggressive code splitting to minimize initial load:

### Vendor Chunks (rarely change, long cache)
- `vendor-react` - React, ReactDOM, React Router
- `vendor-supabase` - Supabase client
- `vendor-icons` - Lucide React icons
- `vendor-motion` - Framer Motion animations
- `vendor-qrcode` - QR code generation

### Route-Based Splitting
All pages are lazy-loaded:
- Marketing pages load separately from app
- Auth pages in their own chunks
- Each dashboard page is its own chunk

### Impact
After optimizations in Phase 10:
- Initial bundle reduced by **32%** (295KB → 200KB)
- App bundle reduced by **59%** (239KB → 99KB)

## Monitoring

### Local Development
```bash
# Generate bundle analysis
npm run build
# View report at perf-reports/bundle-stats.html
```

### CI/CD
Performance tests run automatically in the E2E test suite:
```bash
npm run test:e2e -- tests/e2e/performance.spec.js
```

### Production Monitoring
- Use browser DevTools Performance tab
- Monitor Core Web Vitals in Google Search Console
- Consider adding Real User Monitoring (RUM) in future

## Budget Enforcement

### Build-Time Checks
Vite configuration includes `chunkSizeWarningLimit: 600` to warn about large chunks.

### E2E Performance Tests
Located in `tests/e2e/performance.spec.js`, these tests:
- Verify FCP < 2s on homepage
- Verify total JS < 600KB
- Verify no single app bundle > 150KB (gzipped)
- Check for JavaScript errors during navigation
- Validate lazy loading behavior

### When Budgets Are Exceeded

1. **Identify the cause**: Run `npm run build` and check bundle analysis
2. **Check for:**
   - New dependencies that could be lazy-loaded
   - Components that should be code-split
   - Dead code that could be tree-shaken
3. **Consider:**
   - Splitting large components
   - Using dynamic imports for heavy features
   - Replacing heavy libraries with lighter alternatives

## Optimization Checklist

When adding new features, consider:

- [ ] Is this library necessary? Can we use a lighter alternative?
- [ ] Can this component be lazy-loaded?
- [ ] Does this need to be in the critical path?
- [ ] Are we importing only what we need (tree-shaking)?
- [ ] Could this be loaded on-demand (e.g., click to expand)?

## Resources

- [web.dev Core Web Vitals](https://web.dev/vitals/)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
