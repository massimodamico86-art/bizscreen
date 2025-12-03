# SSR and SEO Strategy

This document outlines BizScreen's rendering strategy, SEO approach, and recommendations for the future.

## Current Architecture

### Rendering Approach: Single Page Application (SPA)

BizScreen is a **client-side rendered SPA** built with:

- **Vite** - Build tool and dev server
- **React 19** - UI framework with `createRoot` (CSR only)
- **React Router DOM** - Client-side routing with `BrowserRouter`
- **Supabase** - Backend with client-side authentication

### Component Hierarchy

```
<React.StrictMode>
  <ErrorBoundary>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  </ErrorBoundary>
</React.StrictMode>
```

### Route Structure

| Route | Type | Auth Required | SEO Priority |
|-------|------|---------------|--------------|
| `/` | Marketing | No | High |
| `/pricing` | Marketing | No | High |
| `/features` | Marketing | No | High |
| `/auth/login` | Auth | No | Medium |
| `/auth/signup` | Auth | No | Medium |
| `/app/*` | Dashboard | Yes | Low (protected) |
| `/tv/*` | Player | No (token) | None |
| `/player/*` | Player | No (token) | None |

## SSR Feasibility Analysis

### Can We Add Full SSR?

**Short answer: Not easily with current architecture.**

#### Blockers for SSR

1. **Supabase Auth Context**
   - `AuthProvider` initializes session client-side via `supabase.auth.getSession()`
   - Session data comes from browser cookies/localStorage
   - Would need server-side session handling or API gateway

2. **BrowserRouter**
   - Client-side only
   - Would need `StaticRouter` for SSR with request URL passed in

3. **Lazy Loading**
   - `React.lazy()` works differently in SSR
   - Would need `loadable-components` or similar for SSR-compatible code splitting

4. **Environment Variables**
   - Some config is accessed client-side
   - Would need careful separation of server/client env vars

### Options Comparison

| Approach | Effort | Benefits | Drawbacks |
|----------|--------|----------|-----------|
| **SPA + SEO Enhancements** | Low | Fast to implement, no architecture change | No true SSR, relies on crawler JS execution |
| **Vite SSR** | High | Keep Vite, add SSR | Complex setup, custom server needed |
| **Next.js Migration** | Very High | Full SSR/SSG, great DX | Complete rewrite, different patterns |
| **Prerendering (vite-plugin-ssr)** | Medium | Static HTML for public pages | Additional build step, limited dynamism |

### Recommendation: SPA + SEO Enhancements (This Phase)

For Phase 11, we implement **SPA with enhanced SEO** because:

1. **Low risk** - No architecture changes
2. **Quick wins** - Meta tags, sitemap, robots.txt work immediately
3. **Modern crawlers handle SPAs** - Google, Bing execute JavaScript
4. **Marketing pages are simple** - Static content, no auth needed
5. **Protected routes don't need SEO** - Dashboard, settings, etc.

## SEO Implementation

### Meta Tags

Each page should set:

- `<title>` - Page-specific title
- `<meta name="description">` - 150-160 char description
- `<meta name="robots">` - index/noindex directives
- `<link rel="canonical">` - Canonical URL

### Open Graph Tags

For social sharing:

- `og:title` - Page title
- `og:description` - Page description
- `og:type` - website/article
- `og:url` - Canonical URL
- `og:image` - Social preview image
- `og:site_name` - BizScreen

### Twitter Card

- `twitter:card` - summary_large_image
- `twitter:title` - Page title
- `twitter:description` - Page description
- `twitter:image` - Preview image

### Implementation

See `src/utils/seo.js` for the centralized metadata configuration and `src/components/Seo.jsx` for the React component.

## Sitemap and Robots

### Sitemap.xml

Generated via `npm run generate:sitemap`:

- Location: `public/sitemap.xml`
- Includes all public routes
- Updated before each deployment

### Robots.txt

Static file at `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/
Sitemap: https://yourdomain.com/sitemap.xml
```

## Future SSR Options

If we need true SSR in the future:

### Option 1: Vite SSR with Express

```javascript
// server.js (conceptual)
import express from 'express';
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';

const app = express();

// SSR middleware for marketing pages only
app.get(['/', '/pricing', '/features'], async (req, res) => {
  const html = renderToString(<MarketingApp url={req.url} />);
  res.send(template.replace('<!--app-->', html));
});

// SPA fallback for everything else
app.use('*', (req, res) => {
  res.sendFile('dist/client/index.html');
});
```

### Option 2: Partial Migration to Next.js

Keep dashboard as Vite SPA, move marketing to Next.js:

- Marketing site: `marketing.bizscreen.com` (Next.js)
- Dashboard: `app.bizscreen.com` (Vite SPA)

### Option 3: vite-plugin-ssr / Vike

Use [Vike](https://vike.dev/) for SSR while keeping Vite:

- Pre-render marketing pages at build time
- Keep SPA mode for authenticated routes
- Gradual adoption possible

## Deployment & Caching Headers

### Vercel Configuration

The `vercel.json` file configures both SPA routing and caching headers:

#### Caching Strategy

| Asset Type | Cache-Control | Rationale |
|------------|---------------|-----------|
| `/assets/*` | `max-age=31536000, immutable` | Hashed filenames, never changes |
| `*.js`, `*.css` | `max-age=31536000, immutable` | Build-time hashed, long-term cache |
| `sitemap.xml` | `max-age=86400, stale-while-revalidate` | Daily updates, serve stale while refreshing |
| `robots.txt` | `max-age=86400` | Rarely changes, daily refresh |
| `index.html` | `max-age=0, must-revalidate` | Always fresh for SPA entry point |

#### Security Headers

All routes receive security headers:

- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - Legacy XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer info

### SPA Routing

The rewrite rule `source: "/(.*)"` → `destination: "/index.html"` ensures:
- All routes serve the SPA entry point
- React Router handles client-side routing
- Deep links work correctly
- Refresh on any route loads the app

### Build Output

Vite generates hashed filenames for cache busting:

```
dist/
  assets/
    index-[hash].js      # Main bundle
    vendor-react-[hash].js
    vendor-supabase-[hash].js
    vendor-icons-[hash].js
    index-[hash].css
  index.html
  sitemap.xml
  robots.txt
```

## Performance Considerations

### Current Optimizations

- All pages lazy-loaded via `React.lazy()`
- Vendor chunks separated (React, Supabase, Icons, Motion)
- Code splitting reduces initial bundle by ~60%

### SEO-Friendly Loading

For crawlers to index SPA content:

1. **Meaningful loading states** - Spinner shows app is loading
2. **Fast initial paint** - Under 2s FCP target
3. **No render-blocking resources** - CSS inlined/async
4. **Proper HTTP status codes** - 200 for valid routes, 404 for missing

## Monitoring

### Track SEO Performance

- Google Search Console - Index coverage, Core Web Vitals
- Lighthouse CI - Automated performance/SEO audits
- Browser DevTools - View rendered meta tags

### Verify Crawler Access

Test with:
```bash
# Google Rich Results Test
https://search.google.com/test/rich-results

# Mobile-Friendly Test
https://search.google.com/test/mobile-friendly

# Fetch as Google (in Search Console)
```

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | SPA (CSR) | Existing architecture, auth complexity |
| SEO | Runtime meta tags | Quick, effective for modern crawlers |
| Sitemap | Generated script | Simple, controllable |
| Future SSR | Consider Vike or Next.js | If SEO becomes critical issue |

---

*Last updated: Phase 11 - December 2024*
