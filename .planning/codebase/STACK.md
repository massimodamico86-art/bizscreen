# Technology Stack

**Analysis Date:** 2026-02-17

## Languages

**Primary:**
- JavaScript (ES2024) - All application code, services, components, hooks
- JSX - React component templates throughout `src/`

**Secondary:**
- SQL - Supabase migrations and RLS policies in `supabase/migrations/`
- CSS - Global styles in `src/index.css`, Tailwind utility classes

## Runtime

**Environment:**
- Node.js v25.0.0 (active on this machine)
- ESM modules (`"type": "module"` in `package.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.1.1 - UI framework; used with StrictMode, createRoot, React 19 error hooks
- React Router DOM 7.9.5 - Client-side routing via `src/router/AppRouter.jsx`
- Tailwind CSS 3.4.18 - Utility-first CSS; configured in `tailwind.config.js` with custom brand colors, spacing, and shadows

**Testing:**
- Vitest 4.0.14 - Unit and integration test runner; configured in `vitest.config.js` with jsdom environment
- Playwright 1.57.0 - E2E tests in `tests/e2e/`; multi-role auth setup (client, admin, superadmin)
- Testing Library (React 16.3.0, DOM 10.4.1, user-event 14.6.1) - Component testing utilities
- MSW 2.12.3 - Service worker mocking for integration tests

**Build/Dev:**
- Vite 7.1.7 - Dev server and build tool; configured in `vite.config.js`
- Terser 5.46.0 - Production minification with `drop_console` and `drop_debugger`
- PostCSS 8.5.6 + Autoprefixer 10.4.21 - CSS processing; configured in `postcss.config.js`
- Husky 9.1.7 + lint-staged 16.2.7 - Pre-commit hooks; runs ESLint fix on staged `*.{js,jsx}` files
- rollup-plugin-visualizer 6.0.5 - Bundle analysis; outputs to `perf-reports/bundle-stats.html`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.80.0 - Primary backend client; all database, auth, realtime, and edge function calls route through `src/supabase.js`
- `stripe` 20.0.0 - Billing integration (server-side usage in billing routes)
- `@sentry/react` 10.36.0 - Error tracking and performance monitoring; initialized in `src/main.jsx` before React renders

**Canvas/Design:**
- `fabric` 6.9.0 - SVG/canvas editor used in `src/components/svg-editor/`
- `polotno` 2.33.2 - Layout editor library used in `src/components/layout-editor/` and `src/pages/LayoutEditor/`
- `html2canvas` 1.4.1 - Screenshot/thumbnail generation; used in `src/services/screenshotService.js`

**UI Utilities:**
- `framer-motion` 12.23.24 - Animations; chunked separately for lazy loading
- `lucide-react` 0.548.0 - Icon library; chunked separately (large, rarely changes)
- `@dnd-kit/core` 6.3.1 + `@dnd-kit/utilities` 3.2.2 - Drag-and-drop
- `@smastrom/react-rating` 1.5.0 - Star rating component

**Data/Utilities:**
- `date-fns` 4.1.0 + `@date-fns/tz` 1.4.1 - Date manipulation and timezone support
- `ical.js` 2.2.1 - iCal/calendar parsing for schedule features
- `idb` 8.0.3 - IndexedDB wrapper; used in player offline cache (`src/player/cacheService.js`, `src/player/offlineService.js`)
- `uuid` 13.0.0 - UUID generation for media keys and IDs
- `qrcode` 1.5.4 + `qrcode.react` 4.2.0 - QR code generation for screen pairing
- `resend` 6.8.0 - Email sending; used in `src/services/emailService.js`
- `isomorphic-dompurify` 2.35.0 - XSS sanitization for RSS feed content

**AWS SDK:**
- `@aws-sdk/client-s3` 3.946.0 - S3 file uploads
- `@aws-sdk/s3-request-presigner` 3.946.0 - Presigned URL generation; implemented as Vite dev middleware in `vite.config.js`

**Observability:**
- `web-vitals` 5.1.0 - Core Web Vitals collection; reported via `src/services/webVitalsService.js`

**Dev-only:**
- `pg` 8.17.2 - PostgreSQL client for CI seeding scripts (`scripts/seed-ci-test-user.cjs`)
- `dotenv` 17.2.3 - Env loading in config files and scripts

## Configuration

**Environment:**
- Vite env vars prefixed with `VITE_` are exposed to the browser
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Production-required: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`
- Centralized validation in `src/config/env.js` with `validateEnv()` — throws in production on missing required vars
- Server-side vars (no `VITE_` prefix): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_URL`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Env files present: `.env`, `.env.local`, `.env.example`

**Build:**
- `vite.config.js` - Main build config; defines manual chunks for `vendor-react`, `vendor-supabase`, `vendor-icons`, `vendor-motion`, `vendor-qrcode`
- Source maps: `hidden` mode (not served publicly; uploaded to Sentry)
- Chunk size warning limit: 600KB
- `tailwind.config.js` - Brand color palette (primary: `#F26F26`), status colors, Inter font family
- `eslint.config.js` - Flat config format; enforces no-console (error), unused-imports (error), unused-vars (error)

## Platform Requirements

**Development:**
- Node.js (v25+ active; no `.nvmrc` pinned version)
- npm for package management
- `.env.local` for local environment overrides
- Vite dev server at `http://localhost:5173`

**Production:**
- Deployed to Vercel (configured via `vercel.json`)
- SPA routing via catch-all rewrite: all paths → `/index.html`
- Aggressive long-term caching headers for assets, fonts, JS, CSS (1 year immutable)
- CSP headers configured inline in `vercel.json`
- HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff enforced

---

*Stack analysis: 2026-02-17*
