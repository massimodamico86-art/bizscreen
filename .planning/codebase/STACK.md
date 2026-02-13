# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- JavaScript (ES2024) - All application code
- JSX - React components

**Secondary:**
- SQL - Supabase database migrations (`supabase/migrations/`)
- HTML/CSS - Templates and styling

## Runtime

**Environment:**
- Node.js v25.0.0
- Browser (ES2024 modules)

**Package Manager:**
- npm 11.6.2
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.1.1 - UI framework
- React Router 7.9.5 - Client-side routing
- Vite 7.1.7 - Build tool and dev server
- Tailwind CSS 3.4.18 - Utility-first CSS framework

**Testing:**
- Vitest 4.0.14 - Unit/integration test runner
- Playwright 1.57.0 - E2E testing
- @testing-library/react 16.3.0 - Component testing utilities
- MSW 2.12.3 - API mocking

**Build/Dev:**
- Vite 7.1.7 - Dev server, HMR, production builds
- ESLint 9.36.0 - Linting
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.21 - CSS vendor prefixing
- Terser 5.46.0 - Production minification
- Husky 9.1.7 - Git hooks
- lint-staged 16.2.7 - Pre-commit linting

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.80.0 - Database client and authentication
- @aws-sdk/client-s3 3.946.0 - S3 media storage client
- @aws-sdk/s3-request-presigner 3.946.0 - Presigned upload URLs
- stripe 20.0.0 - Payment processing
- resend 6.8.0 - Transactional email delivery

**Infrastructure:**
- @sentry/react 10.36.0 - Error tracking and monitoring
- @sentry/vite-plugin 4.9.0 - Source map upload for error resolution
- web-vitals 5.1.0 - Performance monitoring

**UI/Canvas Libraries:**
- polotno 2.33.2 - Scene editor (canvas-based design tool)
- fabric 6.9.0 - Canvas manipulation library
- framer-motion 12.23.24 - Animation library
- lucide-react 0.548.0 - Icon library
- @smastrom/react-rating 1.5.0 - Star rating component
- canvas-confetti 1.9.4 - Celebration effects
- html2canvas 1.4.1 - Screenshot generation
- qrcode 1.5.4 / qrcode.react 4.2.0 - QR code generation for TV pairing

**Data Utilities:**
- date-fns 4.1.0 - Date manipulation
- @date-fns/tz 1.4.1 - Timezone support
- ical.js 2.2.1 - Calendar/scheduling
- uuid 13.0.0 - Unique ID generation
- idb 8.0.3 - IndexedDB wrapper for client-side caching
- isomorphic-dompurify 2.35.0 - XSS sanitization

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Drag and drop primitives
- @dnd-kit/utilities 3.2.2 - DnD utilities

**Dev Tools:**
- rollup-plugin-visualizer 6.0.5 - Bundle size analysis
- @vitest/coverage-v8 4.0.14 - Test coverage reports
- jsdom 27.3.0 - DOM simulation for tests
- dotenv 17.2.3 - Environment variable loading
- patch-package 8.0.1 - NPM package patching

## Configuration

**Environment:**
- Configured via `.env` files (`.env`, `.env.local`, `.env.example`)
- Vite loads `VITE_*` prefixed variables for client-side access
- Non-prefixed vars available in dev server (e.g., AWS credentials)

**Required Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public API key
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` - S3 media storage
- `VITE_OPENWEATHER_API_KEY` - Weather widget data
- `VITE_RESEND_API_KEY` - Email notifications

**Optional Environment Variables:**
- `VITE_SENTRY_DSN` - Error tracking
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` - Source map upload
- `AWS_CLOUDFRONT_URL` - CDN for media delivery
- `VITE_DEVICE_TOKEN` - TV device pairing
- `ANTHROPIC_API_KEY` - AI-powered SVG auto-tagging

**Build:**
- `vite.config.js` - Vite configuration, custom API route middleware, bundle optimization
- `vitest.config.js` - Test configuration
- `playwright.config.js` - E2E test configuration
- `eslint.config.js` - Flat config format (ESLint 9.x)
- `tailwind.config.js` - Tailwind customization (brand colors, spacing)
- `postcss.config.js` - PostCSS plugins

## Platform Requirements

**Development:**
- Node.js 25.x (no `.nvmrc` file present)
- npm 11.x
- Modern browser with ES2024 support

**Production:**
- Serverless hosting (Vite SPA output)
- HTTPS required (Supabase, webhooks, S3)
- PostgreSQL database (via Supabase)
- S3-compatible storage
- CDN recommended (CloudFront)

---

*Stack analysis: 2026-02-13*
