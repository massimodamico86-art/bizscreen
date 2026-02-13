# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension - `AuthContext.jsx`, `DashboardPage.jsx`
- Services: camelCase with `.js` extension - `authService.js`, `loggingService.js`
- Utilities: camelCase with `.js` extension - `formatters.js`, `sanitize.js`
- Test files: Match source name with `.test.js` or `.spec.js` - `alertEngineService.test.js`, `dashboard.spec.js`
- Barrel exports: `index.js` or `index.jsx` depending on content type

**Functions:**
- Components: PascalCase - `function AuthProvider()`, `function SafeHTML()`
- Regular functions: camelCase - `function formatDate()`, `function signUp()`
- Exported service functions: camelCase - `export async function raiseAlert()`, `export function getBranding()`

**Variables:**
- Local variables: camelCase - `const userProfile`, `let retryCount`
- Constants: SCREAMING_SNAKE_CASE - `const AUTH_STATUS`, `const ALERT_TYPES`
- React hooks results: camelCase with destructuring - `const [user, setUser] = useState(null)`

**Types:**
- JSDoc type definitions use PascalCase - `@typedef {Object} BrandingContextValue`
- Enum-like objects use SCREAMING_SNAKE_CASE keys - `ALERT_STATUSES.OPEN`

## Code Style

**Formatting:**
- No automated formatter detected (no `.prettierrc` or Prettier config found)
- Indentation: 2 spaces (consistent across all files)
- Line length: No enforced limit (manual formatting)
- Semicolons: Consistently used at end of statements
- Quotes: Single quotes for strings (`'string'`), double quotes in JSX attributes (`className="class"`)
- Trailing commas: Used in multi-line objects and arrays

**Linting:**
- Tool: ESLint 9 with flat config (`eslint.config.js`)
- Plugins: `react`, `react-hooks`, `react-refresh`, `unused-imports`, `jsdoc`
- Key rules enforced at error level:
  - `no-console: error` (except `console.warn` and `console.error`)
  - `unused-imports/no-unused-imports: error` (auto-fixable)
  - `unused-imports/no-unused-vars: error` (ignores `_` prefix)
  - `react/jsx-uses-react: error`
  - `react/jsx-uses-vars: error`
  - `no-undef: error`
- PropTypes disabled - not used in this codebase (React 19+)
- JSDoc enforcement disabled - too impractical for codebase size
- Pre-commit hook via Husky + lint-staged runs `eslint --fix` on staged files

## Import Organization

**Order:**
1. React imports - `import { useState, useEffect } from 'react'`
2. Third-party libraries - `import { supabase } from '@supabase/supabase-js'`
3. Absolute imports from `src/` - `import { useAuth } from '../contexts/AuthContext'`
4. Relative imports - `import { formatDate } from '../utils/formatters'`
5. CSS/asset imports (if any)

**Path Aliases:**
- No path aliases configured
- All imports use relative paths (`../`, `../../`) from current file location
- Services typically imported from `../services/` or `../../services/`
- Components from `../components/` or relative paths

**Import Style:**
- Named imports preferred - `import { createClient } from '@supabase/supabase-js'`
- Default imports for React components - `import AuthRetryBanner from '../components/AuthRetryBanner'`
- Namespace imports for utilities - `import * as analytics from '../../services/playerAnalyticsService'`

## Error Handling

**Patterns:**
- Try-catch blocks wrap all async operations in services
- Errors logged using scoped logger: `logger.error('Operation failed', { error, context })`
- Functions return error objects: `return { data: null, error: error.message }`
- React components use Error Boundaries for rendering errors
- No throwing errors to callers - always return `{ data, error }` tuple

**Service Layer Example:**
```javascript
export async function signUp({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { user: null, error: error.message };
    }
    logger.info('User signed up successfully', { userId: data.user.id });
    return { user: data.user, error: null };
  } catch (error) {
    logger.error('Signup failed', { error });
    return { user: null, error: error.message };
  }
}
```

**Component Error Handling:**
- Use `ErrorBoundary` component from `src/components/ErrorBoundary.jsx`
- Wrap top-level routes and critical sections
- Fallback UI shows "Something Went Wrong" message

## Logging

**Framework:** Custom logging service (`src/services/loggingService.js`)

**Patterns:**
- Create scoped logger at module top: `const logger = createScopedLogger('ComponentName')`
- Use appropriate log levels:
  - `logger.trace()` - Detailed debugging (typically disabled)
  - `logger.debug()` - Development debugging
  - `logger.info()` - Notable events, user actions
  - `logger.warn()` - Warnings, non-critical issues
  - `logger.error()` - Errors, exceptions
  - `logger.fatal()` - Critical failures
- Always include context object: `logger.error('Failed to load', { error, userId })`
- React components use `useLogger` hook: `const logger = useLogger('MyComponent')`

**Console Usage:**
- Direct `console.log` is blocked by ESLint (`no-console: error`)
- Use logger service instead
- Exceptions: `console.warn` and `console.error` allowed for compatibility

## Comments

**When to Comment:**
- JSDoc headers for public APIs and exported functions
- Complex business logic requiring explanation
- TODO/FIXME markers for known issues (rare - only 2 found in codebase)
- File headers documenting purpose of modules
- Phase markers in tests linking to planning docs

**JSDoc/TSDoc:**
- Used for service functions and complex utilities
- Not enforced on all functions (ESLint rule disabled)
- Format:
  ```javascript
  /**
   * Brief description
   * @param {string} userId - Description
   * @returns {Promise<{data: object|null, error: string|null}>}
   */
  ```
- Type hints use JSDoc syntax in `.js` files: `@typedef`, `@param`, `@returns`

**Inline Comments:**
- Explain "why" not "what"
- Clarify non-obvious logic
- Mark intentional deviations from patterns

## Function Design

**Size:**
- Functions under 100 lines preferred
- Service functions 20-50 lines typical
- Complex operations broken into helper functions
- Test files can be longer (500+ lines acceptable for comprehensive coverage)

**Parameters:**
- Use object destructuring for multiple parameters: `function signUp({ email, password, fullName })`
- Optional parameters with defaults: `function formatDate(dateString, options = {})`
- Named parameters preferred over positional for clarity

**Return Values:**
- Services return `{ data, error }` tuple consistently
- React components return JSX or `null`
- Predicates return boolean: `function isEmergencyExpired()`
- Async functions always return Promise

## Module Design

**Exports:**
- Named exports preferred: `export function raiseAlert()`, `export const ALERT_TYPES`
- Default exports for React components: `export default function DashboardPage()`
- Barrel files re-export related modules: `export { BackgroundMusicSelector } from './BackgroundMusicSelector'`

**Barrel Files:**
- Used for component groups: `src/components/listings/index.js`
- Simplify imports: `import { BackgroundMusicSelector } from '../components/listings'`
- Named exports only in barrel files

**Module Structure:**
- Imports at top
- Constants after imports
- Helper functions before main exports
- Main exports at bottom
- No circular dependencies (broken with mocks in tests)

---

*Convention analysis: 2026-02-13*
