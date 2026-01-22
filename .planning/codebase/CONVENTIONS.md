# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Page components: PascalCase ending in `Page.jsx` (e.g., `MediaLibraryPage.jsx`, `DashboardPage.jsx`)
- React components: PascalCase ending in `.jsx` (e.g., `BulkActionBar.jsx`, `MediaDetailModal.jsx`)
- Services: camelCase ending in `Service.js` (e.g., `mediaService.js`, `playlistService.js`, `s3UploadService.js`)
- Hooks: camelCase starting with `use` prefix (e.g., `useS3Upload.jsx`, `useMediaFolders.js`, `useAuditLogs.js`)
- Utilities: camelCase (e.g., `logger.js`, `seo.js`, `performance.js`)
- Types/constants files: camelCase (e.g., `media.js`, `plans.js`, `featureFlags.js`)
- Index files: `index.js` for barrel exports (`src/components/media/index.js`)

**Functions:**
- camelCase for all function names
- Service functions are typically verbs or verb phrases: `fetchPlaylists()`, `createPlaylist()`, `validateMediaFile()`
- React hooks start with `use`: `useAuth()`, `useS3Upload()`, `useMediaFolders()`
- Helper functions in service files: `getFileExtension()`, `getMediaTypeFromMime()`, `validateMediaFile()`
- Private/internal functions: No special prefix (convention relies on module exports)

**Variables:**
- camelCase for variables and function parameters
- State variables in React: `const [variable, setVariable] = useState()`
- Constants: UPPERCASE_SNAKE_CASE (e.g., `MEDIA_TYPES`, `PLAN_ORDER`, `LOG_LEVELS`)
- Boolean variables: Usually prefixed with `is`, `has`, or `can` (e.g., `isDeleting`, `hasError`, `canUpload`)
- Collections/arrays: Plural names (e.g., `playlists`, `mediaAssets`, `errors`)

**Types/Interfaces:**
- Object type keys: camelCase in JSDoc `@typedef` comments
- TypeScript-like documentation with JSDoc blocks
- No strict TypeScript enforcement (JS/JSX project)

## Code Style

**Formatting:**
- No ESLint configuration file found (no `.eslintrc.js` or config detected)
- No Prettier configuration file detected
- Manual formatting observed in codebase
- Standard indentation: 2 spaces (observed in all files)

**Comments:**
- JSDoc-style comments for functions and modules with `@param`, `@returns`, `@throws`, `@example` tags
- Example from `mediaService.js`:
```javascript
/**
 * Validate file type and size
 */
export function validateMediaFile(file, maxSizeMB = 100) {
  const errors = [];
  // inline comment for clarity
  if (file.size > maxBytes) {
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }
}
```
- File headers with `@file`, `@description` in components
- Inline comments for complex logic or non-obvious decisions
- Phase/PR references in test file headers (e.g., `Phase 5: Tests for media library service operations`)

**Imports:**
- ES6 module syntax: `import ... from '...'`
- Named imports grouped together
- Default imports separate from named imports
- Path pattern:
  1. React and external packages first: `import { useState } from 'react'`
  2. Internal services: `import { supabase } from '../supabase'`
  3. Custom hooks: `import { useAuth } from '../contexts/AuthContext'`
  4. Services: `import { fetchPlaylists } from '../services/playlistService'`
  5. Components: `import { BulkActionBar } from '../components/media'`
  6. Design system: `import { Button } from '../design-system'`
  7. Utilities/config: `import { logger } from '../utils/logger'`

**Export Patterns:**
- Named exports for utilities and services: `export function validateMediaFile() {...}`
- Named exports for hooks: `export function useAuth() {...}`
- Default exports for page components and standalone components: `export default MediaLibraryPage`
- Barrel exports in index files using named imports: `export { default as MediaDetailModal } from './MediaDetailModal'`

## Error Handling

**Pattern:** Try-catch with error propagation
- Services throw errors directly: `if (error) throw error;`
- Errors caught at page/component level
- Supabase errors passed through: `const { data, error } = await query; if (error) throw error;`

**Example from `playlistService.js`:**
```javascript
export async function fetchPlaylists({ search = '', limit = 100 } = {}) {
  let query = supabase
    .from('playlists')
    .select(`*`)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

**Logger Pattern:**
- Component-scoped logger via `createLogger(componentName)` in `src/utils/logger.js`
- Usage: `const log = createLogger('AuthContext')`
- Methods: `log.debug()`, `log.info()`, `log.warn()`, `log.error()`
- Production error reporting: `logError(error, context)` sends to backend endpoint `/api/logs/browser`

**Validation:**
- Dedicated validation functions return result objects: `{ valid: boolean, errors: string[], mediaType?: string }`
- Return early for invalid states
- Field-level validation in form components

## Logging

**Framework:** Console-based with custom `logger` utility

**Patterns:**
- Environment-aware: debug in development, warn/error in production
- Structured logging with context objects: `logger.error('message', { contextKey: value })`
- Component-scoped context: `createLogger('ComponentName')` prepends component name
- Performance logging: `logPerformance(metricName, value, unit)`
- Event logging: `logEvent(eventName, properties)`
- Error reporting: `logError(error, context)` with optional `severe` flag

**Levels:**
- `debug()`: Development only, low-level diagnostics
- `info()`: General information messages
- `warn()`: Potential issues worth monitoring
- `error()`: Errors requiring attention; production errors report to backend

## Async/Await Patterns

**Style:** Async functions with await for all async operations
- No mixing promises and async/await
- Error handling with try-catch blocks
- Example from `AuthContext.jsx`:
```javascript
const fetchUserProfile = useCallback(async (userId, userEmail) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('Profile fetch error', { code: error.code });
      return;
    }
    setUserProfile(data);
  } catch (err) {
    log.error('Unexpected error', { message: err.message });
  }
}, []);
```

## React Patterns

**Component Structure:**
- Functional components with hooks (no class components)
- JSX components use `.jsx` extension
- Props always destructured in function signature
- Comments above component describe purpose and state

**Hooks:**
- `useState()` for local state
- `useCallback()` for memoized callbacks (passed as props or to event listeners)
- `useEffect()` for side effects with dependency arrays
- `useRef()` for DOM refs and callback stability
- Custom hooks extracted to `src/hooks/` directory

**Context Usage:**
- Context created with `createContext({})`
- Provider component exports both Provider and hook (e.g., `AuthProvider` and `useAuth()`)
- Hook enforces Provider requirement: `if (!context) throw new Error('...')`

**Example from `AuthContext.jsx`:**
```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Configuration

**Environment Variables:**
- Prefixed with `VITE_` for frontend (Vite convention)
- Loaded via `import.meta.env` in code
- Example: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- AWS credentials stored in `.env` (not prefixed, used by vite.config.js)

**Centralized Config:**
- `src/config/env.js`: Environment helper functions
- `src/config/plans.js`: Plan/feature definitions
- `src/config/featureFlags.js`: Feature flags
- `src/config/appCatalog.js`: App/template catalog
- `src/config/yodeckTheme.js`: Theme/styling config

## Service Layer

**Pattern:** Data access layer returning promises
- One service file per resource domain (mediaService, playlistService, screenService)
- Functions perform Supabase queries or external API calls
- All functions are `async` and use `await`
- JSDoc `@typedef` for complex parameter/return types
- Example structure:
```javascript
// Read
export async function fetchMediaAssets(options) { ... }
export async function getMediaAsset(id) { ... }

// Create
export async function createMediaAsset(data) { ... }

// Update
export async function updateMediaAsset(id, updates) { ... }

// Delete
export async function deleteMediaAsset(id) { ... }
```

## Utility Functions

**Location:** `src/utils/` directory
- `logger.js`: Logging infrastructure
- `seo.js`: SEO/meta tag utilities
- `performance.js`: Performance monitoring
- Helper functions exported as named exports

**Factories/Factories in Tests:**
- Located in `tests/utils/factories.js`
- Generate test data consistently: `createTestScreen()`, `generateUUID()`

---

*Convention analysis: 2026-01-22*
