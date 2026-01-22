# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- JavaScript (ES6+) - React components, services, and frontend logic
- JSX - React component markup in `src/components/` and `src/pages/`
- SQL - Database migrations and Supabase functions in `supabase/migrations/`

**Secondary:**
- CSS/PostCSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js (implied by vite.config.js and package.json setup)
- Modern browsers (ES6+ support required)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.1.1 - UI rendering and components
- React Router DOM 7.9.5 - Client-side routing

**Build/Dev:**
- Vite 7.1.7 - Build tool and dev server
- @vitejs/plugin-react 5.0.4 - React Fast Refresh plugin

**Styling:**
- Tailwind CSS 3.4.18 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing pipeline
- Autoprefixer 10.4.21 - Browser prefix automation

**Testing:**
- Vitest 4.0.14 - Unit test runner (Jest-compatible)
- @vitest/coverage-v8 4.0.14 - Code coverage reporting
- Playwright 1.57.0 - E2E testing framework
- Testing Library (@testing-library/react 16.3.0, @testing-library/dom 10.4.1) - Component testing
- Testing Library User Event 14.6.1 - User interaction simulation
- MSW 2.12.3 - Mock Service Worker for API mocking
- JSDOM 27.3.0 - DOM implementation for Node.js tests
- Jest DOM (@testing-library/jest-dom 6.9.1) - Custom DOM matchers

**Code Quality:**
- ESLint 9.36.0 - JavaScript linting
- @eslint/js 9.36.0 - ESLint core rules
- eslint-plugin-react-hooks 5.2.0 - React Hooks rules
- eslint-plugin-react-refresh 0.4.22 - React Fast Refresh rules
- Globals 16.4.0 - Global variable definitions for linting

**Bundle Analysis:**
- rollup-plugin-visualizer 6.0.5 - Bundle size visualization (generates `/perf-reports/bundle-stats.html`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.80.0 - Supabase client for database/auth/realtime
- React 19.1.1 - Core UI framework
- React Router DOM 7.9.5 - Application routing

**Infrastructure & External Services:**
- @aws-sdk/client-s3 3.946.0 - AWS S3 SDK for media uploads
- @aws-sdk/s3-request-presigner 3.946.0 - S3 presigned URL generation
- @sentry/react 10.36.0 - Error tracking integration

**UI & Visualization:**
- lucide-react 0.548.0 - Icon library (used throughout app)
- framer-motion 12.23.24 - Animation library for React components
- qrcode 1.5.4 - QR code generation (for TV pairing)
- qrcode.react 4.2.0 - React wrapper for QR code generation
- fabric 6.9.0 - Canvas manipulation library
- polotno 2.33.2 - Design editor library for template creation
- html2canvas 1.4.1 - HTML to canvas conversion for previews/exports

**Data & Utilities:**
- date-fns 4.1.0 - Date manipulation and formatting
- uuid 13.0.0 - UUID generation for unique IDs
- idb 8.0.3 - IndexedDB wrapper for offline caching
- ical.js 2.2.1 - iCalendar parser/generator for calendar integration
- web-vitals 5.1.0 - Core Web Vitals metrics collection
- stripe 20.0.0 - Stripe SDK for payment processing

**Development Only:**
- dotenv 17.2.3 - Environment variable loading
- pg 8.17.2 - PostgreSQL client (for seed scripts)

## Configuration

**Environment:**
- Vite-based environment variables with `VITE_` prefix
- Two environment files:
  - `.env` - Local development (git-ignored)
  - `.env.example` - Template with all required/optional variables
- Environment detection: `VITE_APP_ENV` or `import.meta.env.MODE`
- Three environments: `local`, `staging`, `production`

**Key Configs Required:**
- `VITE_SUPABASE_URL` - Supabase project URL (required)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (required)
- `VITE_OPENWEATHER_API_KEY` - OpenWeatherMap API (optional, for weather widget)
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary for media (optional)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe for payments (production-required)
- `VITE_ERROR_TRACKING_ENABLED` - Error tracking toggle (optional)
- `VITE_SENTRY_DSN` - Sentry error tracking DSN (optional)
- AWS credentials for S3 uploads (server-side):
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - `AWS_CLOUDFRONT_URL` (optional CDN)

**Build:**
- `vite.config.js` - Vite configuration
  - Custom middleware plugin for S3 presigned URL generation at `/api/media/presign`
  - Custom health check endpoint at `/api/health`
  - Manual chunk splitting for vendor libraries (react, supabase, icons, motion, qrcode)
  - Bundle size warning limit: 600KB
  - Bundle analyzer: `rollup-plugin-visualizer`

## Platform Requirements

**Development:**
- Node.js 16+ (for Vite and npm scripts)
- npm 6+ or compatible package manager
- Modern browser with ES6+ support

**Production:**
- Static site hosting (Vercel, Netlify, AWS S3, etc.)
- Node.js runtime (optional, for API routes)
- Environment variables injected at build time
- HTTPS required for Supabase and Stripe
- S3 bucket with CORS configuration for media uploads
- CloudFront CDN (optional but recommended for media delivery)

## API Routes (Development)

Vite development server includes custom middleware:
- `POST /api/media/presign` - Generate S3 presigned upload URLs
- `GET /api/health` - Health check endpoint

These are powered by the `apiRoutesPlugin()` in `vite.config.js`.

---

*Stack analysis: 2026-01-22*
