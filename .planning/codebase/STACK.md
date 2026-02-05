# Technology Stack

**Analysis Date:** 2026-02-05

## Languages

**Primary:**
- JavaScript (ES2024) - Frontend React application, config files, test files
- SQL - Database migrations and stored procedures

**Secondary:**
- CSS - Styling with Tailwind utility classes

## Runtime

**Environment:**
- Node.js v25.0.0 (detected installed version)

**Package Manager:**
- npm (default)
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- React 19.1.1 - UI framework
- React Router DOM 7.9.5 - Client-side routing
- Vite 7.1.7 - Build tool and dev server

**Testing:**
- Vitest 4.0.14 - Unit and integration testing
- Playwright 1.57.0 - E2E testing
- @testing-library/react 16.3.0 - Component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- MSW 2.12.3 - API mocking

**Build/Dev:**
- Vite 7.1.7 - Module bundler, dev server, and build tool
- ESLint 9.36.0 - Code linting
- Husky 9.1.7 - Git hooks
- lint-staged 16.2.7 - Pre-commit linting
- Terser 5.46.0 - Code minification

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.80.0 - Database client and authentication
- @aws-sdk/client-s3 3.946.0 - S3 storage for media uploads
- @aws-sdk/s3-request-presigner 3.946.0 - Presigned URL generation

**Infrastructure:**
- @sentry/react 10.36.0 - Error tracking and monitoring
- resend 6.8.0 - Transactional email service
- stripe 20.0.0 - Payment processing (billing)

**UI Libraries:**
- lucide-react 0.548.0 - Icon library
- framer-motion 12.23.24 - Animation library
- tailwindcss 3.4.18 - Utility-first CSS framework
- @dnd-kit/core 6.3.1 - Drag and drop utilities
- @smastrom/react-rating 1.5.0 - Star rating component
- canvas-confetti 1.9.4 - Confetti effects

**Media/Graphics:**
- fabric 6.9.0 - Canvas manipulation for SVG editor
- polotno 2.33.2 - Design editor framework
- html2canvas 1.4.1 - HTML to canvas rendering
- qrcode 1.5.4 - QR code generation
- qrcode.react 4.2.0 - React QR code component

**Data/Utilities:**
- date-fns 4.1.0 - Date manipulation
- @date-fns/tz 1.4.1 - Timezone support
- ical.js 2.2.1 - Calendar/iCal parsing
- uuid 13.0.0 - UUID generation
- idb 8.0.3 - IndexedDB wrapper
- isomorphic-dompurify 2.35.0 - HTML sanitization
- web-vitals 5.1.0 - Performance metrics

**Development:**
- @vitejs/plugin-react 5.0.4 - React fast refresh for Vite
- @vitest/coverage-v8 4.0.14 - Test coverage reporting
- rollup-plugin-visualizer 6.0.5 - Bundle size visualization
- autoprefixer 10.4.21 - CSS vendor prefixing
- postcss 8.5.6 - CSS processing
- dotenv 17.2.3 - Environment variable loading
- jsdom 27.3.0 - DOM implementation for testing
- pg 8.17.2 - PostgreSQL client for scripts
- baseline-browser-mapping 2.9.19 - Browser compatibility data
- patch-package 8.0.1 - Package patching

**ESLint Plugins:**
- @eslint/js 9.36.0 - ESLint core rules
- eslint-plugin-react 7.37.5 - React-specific linting
- eslint-plugin-react-hooks 5.2.0 - React Hooks rules
- eslint-plugin-react-refresh 0.4.22 - Fast refresh validation
- eslint-plugin-unused-imports 4.3.0 - Unused import detection
- eslint-plugin-jsdoc 62.4.1 - JSDoc validation

## Configuration

**Environment:**
- Vite environment variables (VITE_* prefix for client-side)
- Node.js environment variables for server-side/API routes
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Optional: See `.env.example` for full list

**Build:**
- `vite.config.js` - Vite configuration with custom API middleware, S3 presigning
- `vitest.config.js` - Unit/integration test configuration
- `playwright.config.js` - E2E test configuration
- `eslint.config.js` - Flat config format (ESLint 9)
- `tailwind.config.js` - Tailwind theme customization
- `postcss.config.js` - PostCSS with autoprefixer

**Code Quality:**
- `.husky/` - Git hooks for pre-commit linting
- `lint-staged` config in `package.json` - Auto-fix on commit

## Platform Requirements

**Development:**
- Node.js 25.x (or compatible LTS version)
- npm package manager
- Git for version control
- Local environment variables in `.env.local`

**Production:**
- Vite build output (`npm run build`)
- Static file hosting (Vercel, Netlify, or similar)
- Environment variables configured in hosting platform
- Supabase database connection
- AWS S3 bucket for media storage
- External API keys (OpenWeather, Resend, Sentry, Anthropic)

---

*Stack analysis: 2026-02-05*
