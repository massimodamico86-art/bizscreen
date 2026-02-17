# Coding Conventions

**Analysis Date:** 2026-02-17

## Naming Patterns

**Files:**
- React pages: PascalCase with `Page` suffix → `CampaignsPage.jsx`, `SchedulesPage.jsx`
- React components: PascalCase → `StatCard.jsx`, `AnnouncementBanner.jsx`
- Hooks: camelCase with `use` prefix → `useMedia.js`, `useAdmin.js`, `useLogger.js`
- Services: camelCase with `Service` suffix → `playlistService.js`, `mediaService.js`
- Contexts: PascalCase with `Context` suffix → `AuthContext.jsx`, `BrandingContext.jsx`
- Utils: camelCase descriptive → `formatters.js`, `errorMessages.js`, `safeStringify.js`
- Config files: camelCase → `featureFlags.js`, `plans.js`
- Test files: mirror source path with `.test.js` / `.test.jsx` suffix

**Directories:**
- `src/pages/` - Route-level page components (PascalCase subdirs allowed: `src/pages/Admin/`)
- `src/components/` - Reusable UI components grouped by domain (kebab-case subdirs: `layout-editor/`, `svg-editor/`)
- `src/services/` - Business logic and API calls (flat, no subdirs)
- `src/hooks/` - Custom React hooks (flat)
- `src/contexts/` - React context providers (flat)
- `src/design-system/` - Design system primitives (separate from `src/components/`)

**Functions:**
- React components: PascalCase → `const CampaignsPage = ({ showToast }) => { ... }`
- Service functions: camelCase verbs → `fetchPlaylists`, `createPlaylist`, `deletePlaylistSafely`
- Event handlers: `handle` prefix → `handleDelete`, `handleActivate`, `handleSave`
- Data loaders: `load` prefix → `loadCampaigns`, `loadData`
- Boolean state: `is`/`has`/`show`/`can` prefix → `isLoading`, `hasMore`, `showToast`, `canEdit`

**Variables:**
- State variables: camelCase noun → `campaigns`, `loading`, `search`, `statusFilter`
- Constants (module-scope): SCREAMING_SNAKE_CASE → `CAMPAIGN_STATUS`, `MEDIA_TYPES`, `APPROVAL_STATUS`
- Logger instances: `logger` (hook-created) or `_logger` (service-level, underscore prefix when unused in ESLint)
- Prefixed underscore `_` for intentionally unused variables per ESLint config: `_result`, `_logger`

**Types/Enums:**
- Enum-like objects: SCREAMING_SNAKE_CASE keys, string values → `{ DRAFT: 'draft', ACTIVE: 'active' }`
- JSDoc typedefs for complex objects (services only): `@typedef {Object} Playlist`

## Code Style

**Formatting:**
- No Prettier config detected — formatting enforced by ESLint rules only
- Indentation: 2 spaces (observed throughout codebase)
- Quotes: single quotes for JS strings; double quotes only inside JSX attribute values
- Trailing commas: used in multi-line objects and arrays

**Linting:**
- Tool: ESLint v9 with flat config (`eslint.config.js`)
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-unused-imports`, `eslint-plugin-react`, `eslint-plugin-jsdoc`
- Key enforced rules (error level, blocks commits via lint-staged):
  - `no-console` — only `console.warn` and `console.error` allowed (exceptions: test files, scripts, loggingService)
  - `unused-imports/no-unused-imports` — unused imports auto-removed on commit
  - `unused-imports/no-unused-vars` — prefix unused vars with `_` to suppress
  - `react/jsx-uses-vars` — prevents false positives on JSX component names
  - `no-undef` — undefined variables caught at lint time
- PropTypes disabled (`react/prop-types: 'off'`) — not used in this React 19 codebase
- JSDoc enforcement disabled (`jsdoc/require-jsdoc: 'off'`) — JSDoc used selectively, not mandated
- Pre-commit hook: `npx lint-staged` runs `eslint --fix` on staged `*.{js,jsx}` files

## Import Organization

**Observed Order (no enforced auto-sort, but consistent pattern):**
1. React and router imports → `import { useState, useEffect } from 'react'`
2. Third-party libraries → `import { Calendar, Plus } from 'lucide-react'`
3. Design system → `import { Button, Card, Badge } from '../design-system'`
4. Internal components → `import TemplatePickerModal from '../components/campaigns/TemplatePickerModal'`
5. Hooks → `import { useLogger } from '../hooks/useLogger.js'`
6. Services → `import { fetchCampaigns } from '../services/campaignService'`
7. Contexts → `import { useAuth } from '../contexts/AuthContext'`
8. Utils/config → `import { formatDate } from '../utils/formatters'`

**Path Aliases:**
- None detected — all imports use relative paths (`../`, `../../`, `../../../`)
- Test files use deep relative paths: `../../../src/services/playlistService`

**File Extensions:**
- `.js` extension required on service imports in some files: `import { ... } from '../hooks/useLogger.js'`
- Inconsistent — `.jsx` sometimes omitted, `.js` sometimes explicit; no enforced rule

## Error Handling

**Service Layer Pattern:**
- Services throw errors directly (via Supabase's `if (error) throw error` pattern)
- No custom error class hierarchy — native `Error` objects thrown
- Validation errors thrown explicitly: `throw new Error('User must be authenticated')`

**Page/Component Pattern:**
- Async operations wrapped in `try/catch/finally`:
  ```javascript
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await fetchCampaigns({ status: statusFilter, search });
      setCampaigns(data);
    } catch (error) {
      logger.error('Error loading campaigns:', error);
      showToast?.('Error loading campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };
  ```
- `showToast` called with `(message, 'error')` for failures, `(message)` or `(message, 'success')` for success
- Optional chaining on `showToast`: `showToast?.('message', 'error')` — prop may not always be passed
- Error message pattern: `'Error <doing thing>: ' + error.message`

**Safe Return Pattern (services returning result objects):**
- Complex deletions return `{ success: false, code: 'IN_USE', usage: {...} }` instead of throwing
- Used when caller needs structured error data: `deletePlaylistSafely`

## Logging

**Framework:** `loggingService.js` — custom structured logging service with scoped loggers

**Service-level logging:**
```javascript
import { createScopedLogger } from './loggingService';
const _logger = createScopedLogger('PlaylistService');
```

**Component/page-level logging:**
```javascript
import { useLogger } from '../hooks/useLogger.js';
const logger = useLogger('CampaignsPage');
```

**Log levels used:** `logger.error()`, `logger.warn()`, `logger.debug()`, `logger.info()`

**When to log:**
- `logger.error()` — all catch blocks in pages/components, before calling `showToast`
- `logger.debug()` — lifecycle events, data loading steps
- `logger.info()` — significant state changes (less common in components)
- No `console.log` in source — ESLint blocks it; use logger

## Comments

**When to Comment:**
- Module-level JSDoc block on every service file: `@module services/playlistService`
- JSDoc on exported service functions with non-obvious parameters:
  ```javascript
  /**
   * Fetch all playlists for the current user
   * @param {Object} [options] - Query options
   * @param {string} [options.search=''] - Filter by name
   * @returns {Promise<Playlist[]>}
   * @throws {Error} If database query fails
   */
  ```
- Inline comments for non-obvious logic: `// eslint-disable-next-line react-hooks/exhaustive-deps -- mount/filter`
- Section comments in complex files: `// ============= Section Name =============`
- Phase references in tests: `// Phase 6: Tests for playlist service operations`

**JSDoc/TSDoc:**
- Used selectively on service functions and shared utilities
- `@typedef` blocks for complex data shapes (services only, not components)
- NOT required on all functions — enforcement disabled in ESLint
- Component prop types not documented with JSDoc (PropTypes disabled, no TypeScript)

## Function Design

**Size:** Large page components are accepted (100–300+ lines); extracted sub-components when reused

**Parameters:**
- Destructured props in components: `const CampaignsPage = ({ showToast }) => { ... }`
- Options object with defaults for service functions: `fetchPlaylists({ search = '', limit = 100 } = {})`
- Callback props always named: `onUpdate`, `showToast`, `onClose`

**Return Values:**
- Services: return data directly or throw (no `{ data, error }` wrapper in service layer — that's unwrapped from Supabase)
- Complex mutation results: `{ success, code, usage, error }` object when callers need structured info
- Hooks: return named object `{ assets, isLoading, error, filters, setFilters, loadMore }`

## Module Design

**Exports:**
- Services: named exports only (no default export)
- React components: default export (single component per file)
- Hooks: named exports (`export function useMedia()`)
- Constants: named exports alongside functions in same service file

**Barrel Files:**
- `src/design-system/index.js` — exports all design system components (used widely)
- `src/__fixtures__/index.js` — re-exports all fixture factories for tests
- `src/components/` subdirectories sometimes have index files, but not universally

---

*Convention analysis: 2026-02-17*
