# Coding Conventions

**Analysis Date:** 2026-02-12

## Naming Patterns

**Files:**
- Components: PascalCase with `.jsx` extension - `FeedbackWidget.jsx`, `StatCard.jsx`
- Services: camelCase with `.js` extension - `screenService.js`, `playlistService.js`
- Pages: PascalCase with `Page.jsx` suffix - `LoginPage.jsx`, `SignupPage.jsx`
- Hooks: camelCase with `use` prefix - `useLogger.js`, `useAuth.test.js`
- Tests: Same name as source with `.test.js` or `.spec.js` - `cacheService.test.js`, `auth.spec.js`
- Config: camelCase or kebab-case - `featureFlags.js`, `eslint.config.js`

**Functions:**
- Components: PascalCase - `FeedbackWidget`, `StatCard`
- Service functions: camelCase - `fetchScreens`, `updateScreen`, `createPlaylist`
- Hooks: camelCase with `use` prefix - `useLogger`, `useAuth`
- Event handlers: `handle` prefix - `handleSubmit`, `handleClick`

**Variables:**
- Constants: UPPER_SNAKE_CASE - `ACTIONS`, `RESOURCE_TYPES`, `FeedbackTypes`
- Regular variables: camelCase - `screenData`, `isLoading`, `errorMessage`
- React state: camelCase - `isOpen`, `setIsOpen`
- Boolean flags: `is`, `has`, `should` prefix - `isLoading`, `hasError`, `shouldRetry`

**Types:**
- Interfaces/Types: Not used (JavaScript, not TypeScript)
- Enums: Object with UPPER_SNAKE_CASE keys - `FeedbackTypes.BUG`

## Code Style

**Formatting:**
- No Prettier config detected - formatting relies on ESLint auto-fix
- Indentation: 2 spaces (implicit from codebase)
- Semicolons: Consistently used at statement ends
- Quotes: Single quotes for strings, double quotes in JSX
- Line length: No enforced limit

**Linting:**
- Tool: ESLint 9.x with flat config (`eslint.config.js`)
- Config: `eslint.config.js` with multiple context-specific rule sets
- Auto-fix: Available via `npm run lint`
- Enforcement: Error level for most rules (blocks commits via lint-staged)

**Key ESLint Rules:**
- `no-console`: Error (allows `console.warn`, `console.error` only)
- `unused-imports/no-unused-imports`: Error (auto-fixable)
- `unused-imports/no-unused-vars`: Error (allows `_` prefix for intentionally unused)
- `no-undef`: Error
- `react/jsx-uses-react`: Error (ensures JSX element detection)
- `react/jsx-uses-vars`: Error (prevents false unused var warnings)
- `react/prop-types`: Off (deprecated in React 19+)
- `jsdoc/require-jsdoc`: Off (not enforced)

## Import Organization

**Order:**
1. External libraries (React, third-party packages)
2. Internal modules (services, utils, hooks)
3. Relative imports (components, assets)
4. No path aliases detected

**Pattern:**
```javascript
// External
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bug, Check, X } from 'lucide-react';

// Services/utilities
import { submitQuickFeedback } from '../services/feedbackService';
import { useLogger } from '../hooks/useLogger.js';

// Components
import StatCard from './StatCard';
```

**Path Aliases:**
- None detected - uses relative imports (`../`, `../../`)

## Error Handling

**Patterns:**
- Async functions: Try-catch with error throwing
- Service layer: Throws errors to caller
- Component layer: Error state variables

**Example from `screenService.js`:**
```javascript
export async function fetchScreens({ search = '', limit = 100 } = {}) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

**Supabase Pattern:**
- All database operations return `{ data, error }`
- Check error and throw if present
- Return data or fallback value

## Logging

**Framework:** Custom scoped logger (`loggingService.js`)

**Patterns:**
```javascript
import { createScopedLogger } from './loggingService.js';
const logger = createScopedLogger('ScreenService');

// Or in components via hook
import { useLogger } from '../hooks/useLogger.js';
const logger = useLogger('FeedbackWidget');
```

**Levels:**
- `logger.trace()` - Detailed debugging
- `logger.debug()` - Debug information
- `logger.info()` - General information
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- `logger.fatal()` - Critical failures

**Console Usage:**
- Direct `console.log()` forbidden in source (ESLint error)
- Allowed in tests, scripts, config files
- `console.warn()` and `console.error()` allowed everywhere

## Comments

**When to Comment:**
- File-level JSDoc headers for purpose/context
- Complex business logic requiring explanation
- TODO/FIXME for known issues
- Not required for simple, self-explanatory code

**JSDoc:**
- Not enforced (`jsdoc/require-jsdoc: off`)
- Used sparingly for complex functions
- Parameter documentation optional

**Example from `screenService.js`:**
```javascript
/**
 * Fetch all screens for the current user
 */
export async function fetchScreens({ search = '', limit = 100 } = {}) {
```

**Inline Comments:**
- Used to explain non-obvious logic
- Prefer descriptive code over comments

## Function Design

**Size:**
- No enforced limit
- Generally focused on single responsibility
- Service functions: 10-50 lines typical
- Component functions: 50-200 lines typical

**Parameters:**
- Prefer object parameters for multiple options: `fetchScreens({ search, limit })`
- Use destructuring with defaults: `{ search = '', limit = 100 } = {}`
- Avoid positional parameters beyond 2-3 arguments

**Return Values:**
- Services: Return data directly or throw errors
- Async functions: Return promises
- Components: Return JSX

**Async/Await:**
- Preferred over `.then()` chains
- Used consistently in service layer

## Module Design

**Exports:**
- Named exports preferred: `export async function fetchScreens()`
- Default exports for React components: `export default StatCard`
- Avoid mixing default + named exports in same file

**File Organization:**
- Imports at top
- Constants/helpers after imports
- Main logic/component function
- Helper functions after main
- Export at bottom (for default exports)

**Barrel Files:**
- Not used - direct imports preferred
- Example: `import { fetchScreens } from '../services/screenService'`

## React Patterns

**Component Declaration:**
- Function components only (no class components detected)
- Named function declarations or arrow functions
- Export default for components: `export default function LoginPage()`

**Hooks:**
- Custom hooks in `src/hooks/` directory
- Prefix with `use`: `useLogger`, `useAuth`
- Follow Rules of Hooks (enforced by `react-hooks/recommended`)

**Props:**
- Destructure in function signature: `function StatCard({ title, value, icon })`
- Use `...props` for pass-through: `{ title, value, ...props }`
- No PropTypes (deprecated in React 19+)

**State Management:**
- `useState` for local state
- Context for shared state (`AuthContext`, `BrandingContext`)
- No Redux or external state library

---

*Convention analysis: 2026-02-12*
