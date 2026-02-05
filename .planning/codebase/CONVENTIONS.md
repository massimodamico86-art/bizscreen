# Coding Conventions

**Analysis Date:** 2026-02-05

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (`DashboardPage.jsx`, `AuthContext.jsx`)
- Services: camelCase with `.js` extension (`mediaService.js`, `sceneDesignService.js`)
- Test files: Match source name with `.test.js` or `.spec.js` suffix
  - Unit tests: `*.test.js` or `*.test.jsx` in `tests/unit/`
  - E2E tests: `*.spec.js` in `tests/e2e/`
- Utilities: camelCase with `.js` extension (`formatters.js`, `errorMessages.js`)

**Functions:**
- Use camelCase for all functions (`fetchUserProfile`, `loginAndPrepare`, `getMediaTypeFromMime`)
- Exported functions start with verb (`get`, `fetch`, `create`, `update`, `delete`, `validate`)
- Boolean predicates start with `is`, `has`, `should` (seen in helper functions)
- Event handlers prefixed with `handle` or `on` (`onClick`, `handleSubmit`)

**Variables:**
- Use camelCase for local variables (`userProfile`, `retryCount`, `authStatus`)
- Use UPPER_SNAKE_CASE for constants (`MEDIA_TYPES`, `AUTH_STATUS`, `ANIMATION_TYPES`)
- React state variables: descriptive names (`[loading, setLoading]`, `[user, setUser]`)

**Types:**
- Constants objects use UPPER_SNAKE_CASE keys: `MEDIA_TYPES.IMAGE`, `AUTH_STATUS.LOADING`
- Enum-like objects documented at module level
- React Context names: PascalCase with "Context" suffix (`AuthContext`, `BrandingContext`)

## Code Style

**Formatting:**
- No Prettier config detected - relies on ESLint auto-fix
- 2-space indentation (observed in all files)
- Single quotes for strings (not enforced, mixed usage observed)
- Semicolons used consistently
- Trailing commas in multi-line arrays/objects

**Linting:**
- ESLint via `eslint.config.js` (flat config format)
- Config: `@eslint/js` recommended rules + React plugins
- Plugins: `react-hooks`, `react-refresh`, `unused-imports`, `react`, `jsdoc`
- Run: `npm run lint`
- Pre-commit: `lint-staged` auto-fixes JS/JSX files

## Import Organization

**Order:**
1. React and React-related imports
2. External dependencies (libraries)
3. Internal contexts and hooks
4. Services and utilities
5. Components (design system, then local)
6. Config and constants

**Pattern from `DashboardPage.jsx`:**
```javascript
import { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowRight, Monitor } from 'lucide-react'; // External icons

import { useAuth } from '../contexts/AuthContext';           // Contexts/hooks
import { useTranslation } from '../i18n';

import { getDashboardStats } from '../services/dashboardService'; // Services

import { PageLayout, PageHeader, Card } from '../design-system'; // Design system
import { DashboardErrorState } from './dashboard/DashboardSections'; // Local components

import ErrorBoundary from '../components/ErrorBoundary';     // Global components
import { config } from '../config/env';                       // Config
```

**Path Aliases:**
- Not detected - uses relative imports (`../`, `../../`)
- Services: `../services/serviceName`
- Components: `../components/ComponentName`
- Design system: `../design-system`

## Error Handling

**Patterns:**
- Services throw errors, components catch and display
- Async/await with try-catch blocks in services
- Supabase error checking: `if (error) throw error;`
- Error boundaries wrap page components: `<ErrorBoundary>`

**Service pattern from `sceneDesignService.js`:**
```javascript
export async function fetchSlidesForScene(sceneId) {
  const { data, error } = await supabase
    .from('scene_slides')
    .select('*')
    .eq('scene_id', sceneId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}
```

**Component pattern:**
```javascript
try {
  const result = await someService();
  setData(result);
} catch (error) {
  logger.error('Operation failed', { error });
  showToast('Error message', 'error');
}
```

## Logging

**Framework:** Custom `loggingService.js`

**Patterns:**
- Create scoped logger at module level: `const logger = createScopedLogger('ModuleName');`
- Use semantic log levels: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- Pass context objects: `logger.debug('Fetching profile', { userId, attempt });`
- Alternative: `const logger = useLogger('ComponentName');` for React components

**Example from `mediaService.js`:**
```javascript
import { createScopedLogger } from './loggingService';
const logger = createScopedLogger('MediaService');

logger.debug('Fetching media', { type, page });
```

**Console rule:** Warn level in ESLint (legacy migration phase)
- `console.log()` shows warning - should use `loggingService`
- `console.warn()` and `console.error()` allowed
- Goal: Migrate all console usage to `loggingService`

## Comments

**When to Comment:**
- File headers: Purpose, module description, and usage context
- Complex business logic: Explain "why" not "what"
- Function documentation: JSDoc for exported functions
- TODO comments: Mark technical debt and future work

**JSDoc:**
- Warn level in ESLint (gradual adoption)
- Required for exported functions from services
- Format: `@param`, `@returns`, `@throws`, `@example`

**Example from `sceneDesignService.js`:**
```javascript
/**
 * Fetch all slides for a scene ordered by position
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Array>} List of slides with design data
 */
export async function fetchSlidesForScene(sceneId) {
  // ...
}
```

**Example from `AuthContext.jsx`:**
```javascript
/**
 * Fetch user profile from Supabase including role information
 *
 * This function handles profile fetching with built-in error handling and retry logic.
 * It supports skipping unnecessary fetches if the profile is already loaded.
 *
 * @param {string} userId - The UUID of the user to fetch profile for
 * @param {string} userEmail - The user's email address (used for logging)
 * @param {boolean} [skipIfExists=false] - If true, skip fetch if profile already exists in state
 * @param {number} [retryCount=0] - Current retry attempt number (used for logging)
 *
 * @returns {Promise<void>} Updates userProfile state
 *
 * @example
 * await fetchUserProfile(user.id, user.email);
 */
```

## Function Design

**Size:** Functions kept focused and single-purpose

**Parameters:**
- Services: Named parameters via destructuring for options
- Components: Props destructured in function signature
- Default values provided inline: `{ type = null, search = '', page = 1 } = {}`

**Example from `mediaService.js`:**
```javascript
export async function fetchMediaAssets({
  type = null,
  search = '',
  page = 1,
  pageSize = 50,
  folderId = undefined
} = {}) {
  // ...
}
```

**Return Values:**
- Services return data directly or throw errors
- Avoid returning `{ success, data, error }` wrappers
- Async functions always return Promises
- Use `null` for "not found" states, empty arrays/objects for empty collections

## Module Design

**Exports:**
- Named exports preferred: `export function fetchData() {}`
- Default exports for React components: `export default ComponentName;`
- Constants exported as named exports: `export const MEDIA_TYPES = {...};`

**Barrel Files:**
- Design system uses barrel exports: `../design-system` exports multiple components
- Not widely used elsewhere - direct imports preferred

**PropTypes:**
- React components use PropTypes (gradual adoption, warn level)
- Format: PropTypes with JSDoc comments
- Default props via `Component.defaultProps` or inline defaults

**Example from `Button.jsx`:**
```javascript
Button.propTypes = {
  /** Button content - text, icon, or any React node */
  children: PropTypes.node.isRequired,
  /** Click handler function */
  onClick: PropTypes.func,
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'outline', 'success', 'danger']),
};

Button.defaultProps = {
  onClick: null,
  variant: 'primary',
};
```

## React Patterns

**Hooks:**
- Custom hooks prefixed with `use`: `useAuth()`, `useLogger()`, `useBreakpoints()`
- Hooks extracted to `src/hooks/` directory
- Context hooks check for provider: `if (!context) throw new Error(...)`

**State Management:**
- React Context for global state (`AuthContext`, `BrandingContext`)
- `useState` for local component state
- `useCallback` for memoized callbacks in contexts

**Component Structure:**
1. Imports
2. PropTypes/defaultProps (if component uses them)
3. Component function
4. PropTypes definition (after component)
5. Default export

**Legacy Wrappers:**
- Components in `src/components/` wrap design system for backwards compatibility
- Comments indicate "Legacy wrapper" and suggest importing from design system
- Map old prop names to new design system props

**Example from `Badge.jsx`:**
```javascript
/**
 * Badge Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */
```

---

*Convention analysis: 2026-02-05*
