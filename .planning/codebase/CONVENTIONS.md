# Coding Conventions

**Analysis Date:** 2026-01-29

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (`MediaLibraryPage.jsx`, `FloatingLayersPanel.jsx`)
- Services: camelCase with `.js` extension (`authService.js`, `loggingService.js`)
- Test files: Same name as source with `.test.js` or `.spec.js` suffix
  - Unit: `authService.test.js` in `tests/unit/services/`
  - E2E: `auth.spec.js` in `tests/e2e/`
- Utility files: camelCase (`.js` for plain JS, `.jsx` for JSX)
- Config files: camelCase (`featureFlags.js`, `plans.js`)

**Functions:**
- camelCase for all functions (`signUp`, `getCurrentUser`, `loginAndPrepare`)
- Async functions always return Promise (`async function signUp()`)
- Event handlers: `handle` prefix (`handlePanelDragStart`, `handleNavigateFolder`)
- Boolean utilities: `is` or `should` prefix (`isEmailConfirmationPending`, `shouldLog`)

**Variables:**
- camelCase for variables (`sessionContext`, `logBuffer`, `emailInput`)
- SCREAMING_SNAKE_CASE for constants (`LOG_LEVELS`, `ALLOWED_TYPES`, `MEDIA_TYPE_LABELS`)
- React hooks: `use` prefix (`useAuth`, `useMediaLibrary`, `useLogger`)

**Types:**
- PascalCase for component names (`FloatingLayersPanel`, `MediaLibraryPage`)
- PascalCase for context names (`AuthContext`, `BrandingContext`)
- Constants objects use PascalCase keys for enums (`Feature`, `PlanSlug`)

## Code Style

**Formatting:**
- No Prettier config detected - manual formatting
- Indentation: 2 spaces (observed in all files)
- Semicolons: Used consistently
- Quote style: Single quotes for strings, double quotes for JSX attributes
- Line length: No enforced limit (some lines exceed 120 chars)

**Linting:**
- Tool: ESLint 9 with flat config (`eslint.config.js`)
- Config: `@eslint/js` recommended + React plugins
- Key rules enforced:
  - `unused-imports/no-unused-imports: error` (blocks commits)
  - `unused-imports/no-unused-vars: warn` (visibility only)
  - `no-console: warn` (allow `console.warn` and `console.error`)
  - `react/prop-types: warn` (gradual adoption)
  - `jsdoc/require-jsdoc: warn` (for exported functions)
  - `no-undef: warn` (legacy migration mode)
- Pre-commit hook: `lint-staged` runs `eslint --fix` on `*.{js,jsx}`
- Test files: Relaxed rules (no-console off, prop-types off, jsdoc off)

## Import Organization

**Order:**
1. External dependencies (React, router, third-party)
2. Internal absolute imports (services, contexts, utils)
3. Relative imports (local components, styles)
4. Type/constant imports

**Example:**
```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';
import { useAuth } from '../contexts/AuthContext';
import { PageLayout, Button } from '../design-system';
```

**Path Aliases:**
- No Vite aliases configured
- All imports use relative paths (`../`, `../../`)
- Services imported with `.js` extension explicitly

**Import style:**
- Named imports preferred: `import { supabase } from '../supabase'`
- Default imports for components: `import FloatingLayersPanel from './FloatingLayersPanel'`
- Barrel exports used in some directories (`src/design-system/index.js`, `src/pages/index.js`)

## Error Handling

**Patterns:**
- Try-catch in async functions with error object return:
```javascript
try {
  const { data, error } = await supabase.auth.signUp(...);
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
} catch (error) {
  logger.error('Signup failed', { error });
  return { user: null, error: error.message };
}
```

- Supabase pattern: Destructure `{ data, error }` and check `error` first
- Return shape: `{ success/data, error }` consistently across services
- Logging before return on error paths using scoped logger

## Logging

**Framework:** Custom structured logging service (`loggingService.js`)

**Logger creation:**
```javascript
import { createScopedLogger } from '../services/loggingService.js';
const logger = createScopedLogger('AuthService');
```

**Patterns:**
- Services use scoped logger: `const logger = createScopedLogger('ServiceName')`
- Components use hook: `const logger = useLogger('ComponentName')`
- Levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- Context enrichment: `logger.info('message', { contextObject })`
- Avoid `console.*` (linting warns, except in tests/scripts)
- Production: `minLevel: 'info'`, 10% sampling, batched remote logging

**When to log:**
- Service operations: info level (`logger.info('User signed up', { userId })`)
- Errors: error level with context (`logger.error('Failed to create profile', { error, userId })`)
- Performance: Not in logging service (separate analytics)

## Comments

**When to Comment:**
- File-level JSDoc headers describing purpose and features (observed in `MediaLibraryPage.jsx`, `FloatingLayersPanel.jsx`)
- Complex logic explanation (not observed frequently - code is self-documenting)
- TODOs for known issues (very few found)

**JSDoc/TSDoc:**
- Usage: Gradual adoption (eslint warns for missing JSDoc)
- Required for exported functions:
```javascript
/**
 * Sign up a new user
 * @param {object} options
 * @param {string} options.email
 * @param {string} options.password
 * @param {string} options.fullName
 * @param {string} options.businessName
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signUp({ email, password, fullName, businessName }) {
```
- Format: Multi-line with `@param`, `@returns`, `@module`, `@see`

## Function Design

**Size:**
- Services: 20-80 lines per function (some larger for complex operations)
- Components: Extract helpers into hooks (e.g., `useMediaLibrary`, `usePlaylistEditor`)
- Largest files: ~2800 lines (`industryWizardService.js`)

**Parameters:**
- Destructured objects for 3+ params: `signUp({ email, password, fullName, businessName })`
- Positional for 1-2 params: `createScopedLogger(scope)`
- Options object pattern: `loginAndPrepare(page, options = {})`

**Return Values:**
- Async: Always returns `Promise<{data/success, error}>` shape
- Hooks: Return destructured state and handlers
- Utilities: Direct values or null

## Module Design

**Exports:**
- Named exports preferred: `export async function signUp()`
- Default exports for React components: `export default FloatingLayersPanel`
- No mixed default + named from same file (components vs utils)

**Barrel Files:**
- Usage: Common in organized directories
  - `src/design-system/index.js` re-exports components
  - `src/pages/index.js` re-exports page components
  - `src/services/index.js` (exists but not verified)
- Pattern: `export { ComponentName } from './ComponentName'`

---

*Convention analysis: 2026-01-29*
