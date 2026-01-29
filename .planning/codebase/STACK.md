# Technology Stack

**Analysis Date:** 2026-01-29

## Languages

**Primary:**
- JavaScript (ES2024) - All application code (React frontend, services, API routes)

**Secondary:**
- SQL - Database migrations and queries (Supabase/PostgreSQL)
- HTML/JSX - React component templates
- CSS - Styling (via Tailwind utility classes and custom CSS)

## Runtime

**Environment:**
- Node.js v25.0.0

**Package Manager:**
- npm 11.6.2
- Lockfile: package-lock.json (present)

**Module System:**
- ESM (ES Modules) - `"type": "module"` in package.json

## Frameworks

**Core:**
- React 19.1.1 - UI framework
- React Router DOM 7.9.5 - Client-side routing
- Vite 7.1.7 - Build tool and dev server

**Testing:**
- Vitest 4.0.14 - Unit and integration testing
- @testing-library/react 16.3.0 - React component testing
- @testing-library/jest-dom 6.9.1 - DOM matchers
- Playwright 1.57.0 - E2E testing
- msw 2.12.3 - API mocking for tests
- jsdom 27.3.0 - DOM environment for unit tests

**Build/Dev:**
- Vite 7.1.7 - Development server and production bundler
- @vitejs/plugin-react 5.0.4 - React support with Fast Refresh
- terser 5.46.0 - Minification (configured to strip console.* in production)
- rollup-plugin-visualizer 6.0.5 - Bundle size analysis

**Styling:**
- Tailwind CSS 3.4.18 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.21 - CSS vendor prefixing

**Linting:**
- ESLint 9.36.0 - Code linting
- eslint-plugin-react 7.37.5 - React-specific rules
- eslint-plugin-react-hooks 5.2.0 - React Hooks rules
- eslint-plugin-unused-imports 4.3.0 - Unused import detection
- eslint-plugin-jsdoc 62.4.1 - JSDoc validation
- husky 9.1.7 - Git hooks
- lint-staged 16.2.7 - Pre-commit linting

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.80.0 - Database client and authentication
- stripe 20.0.0 - Payment processing
- @aws-sdk/client-s3 3.946.0 - S3 file uploads
- @aws-sdk/s3-request-presigner 3.946.0 - Presigned URL generation for uploads

**UI/UX:**
- lucide-react 0.548.0 - Icon library
- framer-motion 12.23.24 - Animation library
- @dnd-kit/core 6.3.1 - Drag-and-drop interactions
- @smastrom/react-rating 1.5.0 - Star rating component

**Graphics/Editing:**
- polotno 2.33.2 - Graphic design editor (template creation)
- fabric 6.9.0 - Canvas manipulation library
- html2canvas 1.4.1 - DOM-to-canvas screenshot generation
- qrcode.react 4.2.0 - QR code generation for device pairing

**Data/Utilities:**
- date-fns 4.1.0 - Date manipulation
- @date-fns/tz 1.4.1 - Timezone support
- ical.js 2.2.1 - iCalendar parsing for scheduling
- uuid 13.0.0 - UUID generation
- idb 8.0.3 - IndexedDB wrapper for offline storage
- isomorphic-dompurify 2.35.0 - HTML sanitization

**Monitoring:**
- @sentry/react 10.36.0 - Error tracking and performance monitoring
- web-vitals 5.1.0 - Performance metrics collection

**Email:**
- resend 6.8.0 - Email delivery service

**Development:**
- dotenv 17.2.3 - Environment variable loading
- patch-package 8.0.1 - NPM package patching
- pg 8.17.2 - PostgreSQL client (for backend scripts)
- @vitest/coverage-v8 4.0.14 - Test coverage reporting

## Configuration

**Environment:**
- Configuration via .env files (`.env`, `.env.local`)
- Required variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Optional variables: Weather API, AWS credentials, Stripe keys, Sentry DSN
- Centralized validation in `src/config/env.js`
- Environment-specific configs: local, staging, production

**Build:**
- `vite.config.js` - Vite configuration with custom API middleware, bundle analysis
- `tailwind.config.js` - Tailwind theme with custom brand colors (#F26F26 orange)
- `eslint.config.js` - Flat config format (ESLint 9.x)
- `vitest.config.js` - Unit test configuration (jsdom environment)
- `playwright.config.js` - E2E test configuration (Chromium only)
- `postcss.config.js` - PostCSS configuration

**TypeScript:**
- Not used - Pure JavaScript codebase
- Type checking via JSDoc comments (gradual adoption)
- React prop types used for runtime validation (warn level)

## Platform Requirements

**Development:**
- Node.js 25.x
- npm 11.6+
- Modern browser (for Vite dev server)
- Supabase CLI (optional, for local database development)

**Production:**
- Deployment target: Static hosting (Vercel/Netlify-compatible)
- Build output: `dist/` directory (static assets)
- API routes: Handled by Vite middleware in dev, need serverless functions in production
- Browser support: Modern browsers (ES2024 features used)

---

*Stack analysis: 2026-01-29*
