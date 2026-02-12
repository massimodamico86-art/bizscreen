# Technology Stack

**Analysis Date:** 2026-02-12

## Languages

**Primary:**
- JavaScript (ES2024) - React application and services

**Secondary:**
- SQL - Supabase database migrations and functions

## Runtime

**Environment:**
- Node.js v25.0.0

**Package Manager:**
- npm (with package-lock.json)
- Lockfile: present

## Frameworks

**Core:**
- React 19.1.1 - UI framework
- React Router 7.9.5 - Client-side routing
- Vite 7.1.7 - Build tool and dev server

**Testing:**
- Vitest 4.0.14 - Unit and integration tests
- Playwright 1.57.0 - E2E tests
- Testing Library (React 16.3.0, DOM 10.4.1, Jest DOM 6.9.1) - Component testing
- MSW 2.12.3 - API mocking

**Build/Dev:**
- Vite 7.1.7 - Development server and production bundler
- Terser 5.46.0 - Production minification
- Rollup Plugin Visualizer 6.0.5 - Bundle analysis
- Sentry Vite Plugin 4.9.0 - Source map upload

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.80.0 - Backend-as-a-Service (auth, database, storage)
- @sentry/react 10.36.0 - Error tracking and performance monitoring
- stripe 20.0.0 - Payment processing
- @aws-sdk/client-s3 3.946.0 - S3 file uploads
- @aws-sdk/s3-request-presigner 3.946.0 - Presigned URL generation

**Infrastructure:**
- react-router-dom 7.9.5 - SPA routing
- date-fns 4.1.0 - Date manipulation
- framer-motion 12.23.24 - Animations
- lucide-react 0.548.0 - Icon library
- tailwindcss 3.4.18 - Utility-first CSS framework

**Design Tools:**
- polotno 2.33.2 - Canvas-based design editor
- fabric 6.9.0 - Canvas manipulation library
- html2canvas 1.4.1 - Screenshot generation
- qrcode 1.5.4 / qrcode.react 4.2.0 - QR code generation

**Utilities:**
- uuid 13.0.0 - Unique ID generation
- idb 8.0.3 - IndexedDB wrapper (offline caching)
- isomorphic-dompurify 2.35.0 - XSS sanitization
- ical.js 2.2.1 - iCalendar parsing
- resend 6.8.0 - Email API client

**Developer Tools:**
- eslint 9.36.0 - Linting
- eslint-plugin-react-hooks 5.2.0 - React Hooks rules
- eslint-plugin-unused-imports 4.3.0 - Unused import detection
- husky 9.1.7 - Git hooks
- lint-staged 16.2.7 - Staged file linting
- patch-package 8.0.1 - Dependency patching
- dotenv 17.2.3 - Environment variable loading

## Configuration

**Environment:**
- Vite environment variables (VITE_* prefix for client-side)
- Node.js process.env for server-side API routes
- `.env.local` for local development
- `.env.example` documents all required/optional variables

**Build:**
- `vite.config.js` - Vite build configuration with custom API route plugin
- `tailwind.config.js` - Tailwind CSS customization
- `postcss.config.js` - PostCSS processing
- `eslint.config.js` - ESLint flat config (ES2024)
- `vitest.config.js` - Unit/integration test configuration
- `playwright.config.js` - E2E test configuration
- `tsconfig.json` - TypeScript type checking (JSDoc types)

## Platform Requirements

**Development:**
- Node.js v25.0.0 or compatible
- npm
- Modern browser (Chrome, Firefox, Safari)

**Production:**
- Deployed to Vercel (based on `vercel.json` config)
- Static SPA with client-side routing
- CDN caching for assets (31536000s for immutable assets)
- Security headers enforced via Vercel config

---

*Stack analysis: 2026-02-12*
