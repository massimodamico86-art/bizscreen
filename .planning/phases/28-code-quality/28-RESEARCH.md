# Phase 28: Code Quality - Research

**Researched:** 2026-01-28
**Domain:** ESLint enforcement, PropTypes/JSDoc annotations, documentation standards
**Confidence:** HIGH

## Summary

This phase focuses on establishing code quality enforcement through ESLint pre-commit hooks, adding PropTypes and JSDoc annotations to all components/exported functions, updating documentation, and adding inline comments to complex business logic.

The project already has a solid foundation: ESLint 9 with flat config is configured with `eslint:recommended`, `react-hooks`, and `no-console` rules. However, there are **3,777 existing violations** (primarily unused imports) that must be fixed before enabling pre-commit enforcement. Husky and lint-staged are not yet installed. A well-documented `loggingService` exists and should be used instead of `console.log`. Approximately 14 of 301 components have PropTypes - the vast majority need them added.

**Primary recommendation:** Fix all existing ESLint violations first (especially 3,483 unused-vars errors), then install Husky/lint-staged for pre-commit enforcement. Add PropTypes and JSDoc systematically by feature area, starting with core/shared components.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | ^9.36.0 | JavaScript/JSX linting | Already installed, flat config default |
| husky | ^9.x | Git hooks management | Industry standard for pre-commit |
| lint-staged | ^15.x | Run linters on staged files only | Prevents running ESLint on entire codebase |
| eslint-plugin-jsdoc | ^50.x | JSDoc validation rules | Enforces @param/@returns documentation |
| prop-types | ^15.x | Runtime type checking | Already used in some components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-react | ^7.x | React-specific rules | Add for prop-types enforcement |
| @eslint/js | ^9.36.0 | ESLint recommended ruleset | Already installed |
| globals | ^16.x | Global variable definitions | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PropTypes | TypeScript | TypeScript requires full migration, PropTypes work incrementally |
| Husky | simple-git-hooks | Husky more widely used, better docs |
| lint-staged | custom script | lint-staged handles edge cases (partial stages, etc.) |

**Installation:**
```bash
npm install --save-dev husky lint-staged eslint-plugin-jsdoc eslint-plugin-react
```

## Architecture Patterns

### Recommended Project Structure
```
project/
├── .husky/
│   └── pre-commit          # lint-staged execution
├── eslint.config.js        # Flat config (already exists)
├── package.json            # lint-staged config section
├── docs/
│   ├── ARCHITECTURE.md     # System overview (exists)
│   ├── TESTING.md          # Test patterns (exists)
│   └── [FEATURE].md        # Complex feature docs
└── src/
    ├── components/         # PropTypes on all components
    ├── services/           # JSDoc on all exports
    ├── hooks/              # JSDoc on all hooks
    └── utils/              # JSDoc on all utilities
```

### Pattern 1: PropTypes with Shape-Level Detail
**What:** Full object structure documentation, not just `PropTypes.object`
**When to use:** All components with object/array props
**Example:**
```javascript
// Source: Context7 / eslint-plugin-react docs
Component.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
    config: PropTypes.shape({
      layout: PropTypes.string,
      zones: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.oneOf(['media', 'text', 'widget']).isRequired,
      })),
    }),
  }).isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
};
```

### Pattern 2: JSDoc for Exported Functions
**What:** Document all exported functions with @param and @returns
**When to use:** All services, hooks, and utility functions
**Example:**
```javascript
// Source: eslint-plugin-jsdoc docs
/**
 * Fetch screens for the current tenant with optional filtering
 *
 * @param {Object} options - Query options
 * @param {string} [options.status] - Filter by status ('online', 'offline', 'all')
 * @param {string} [options.groupId] - Filter by screen group
 * @param {number} [options.limit=50] - Maximum results to return
 * @returns {Promise<{screens: Screen[], total: number}>} Screens and count
 * @throws {Error} If user is not authenticated
 */
export async function getScreens(options = {}) {
  // ...
}
```

### Pattern 3: Husky + lint-staged Configuration
**What:** Pre-commit hook runs ESLint on staged files only
**When to use:** Always - enforces quality on every commit
**Example:**
```javascript
// package.json
{
  "lint-staged": {
    "*.{js,jsx}": [
      "eslint --fix"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

### Pattern 4: Intent-Focused Comments
**What:** Comments explain WHY, not WHAT
**When to use:** Business logic, non-obvious decisions, workarounds
**Example:**
```javascript
// BAD: Describes what code does
// Loop through screens and filter offline ones
const offlineScreens = screens.filter(s => s.status === 'offline');

// GOOD: Explains business context
// Emergency campaigns need to reach offline screens too - they'll sync
// when the device comes back online. Online-only filtering would miss
// screens with intermittent connectivity.
const offlineScreens = screens.filter(s => s.status === 'offline');
```

### Anti-Patterns to Avoid
- **Vague PropTypes:** `PropTypes.object` or `PropTypes.array` without shape
- **Missing isRequired:** All required props should be marked
- **Console.log:** Use `loggingService` from `src/services/loggingService.js`
- **Commented-out code:** Delete it, git has history
- **What comments:** "Increment counter" comments add no value

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logging | console.log statements | loggingService | Structured logs, PII redaction, batching, correlation IDs |
| Git hooks | Manual .git/hooks | Husky | Team sync via package.json, easy updates |
| Staged file filtering | Custom grep/find | lint-staged | Handles partial stages, renames, deletions |
| JSDoc validation | Manual review | eslint-plugin-jsdoc | Consistent enforcement, auto-fixable |
| PropTypes validation | Manual review | eslint-plugin-react | Catches missing props at lint time |

**Key insight:** The project already has a sophisticated `loggingService` with structured logging, PII redaction, and batched remote logging. Every `console.log` should be replaced with `log.info()`, `log.debug()`, etc.

## Common Pitfalls

### Pitfall 1: Enabling Pre-commit Before Fixing Existing Violations
**What goes wrong:** Team can't commit - 3,777 existing errors block all work
**Why it happens:** Rushing to "enable enforcement" without fixing baseline
**How to avoid:** Fix ALL violations first, THEN enable pre-commit hook
**Warning signs:** `npm run lint` shows errors - do NOT enable husky yet

### Pitfall 2: Missing PropTypes on Functional Components
**What goes wrong:** Props silently fail, debugging is hard
**Why it happens:** No error without explicit `propTypes` static property
**How to avoid:** ESLint `react/prop-types` rule set to error
**Warning signs:** Components with props but no `.propTypes` definition

### Pitfall 3: Shallow PropTypes (object instead of shape)
**What goes wrong:** Invalid object shapes pass validation, bugs slip through
**Why it happens:** `PropTypes.object` is easier to write than full shape
**How to avoid:** Ban `PropTypes.object` via `react/forbid-prop-types` rule
**Warning signs:** `PropTypes.object` or `PropTypes.array` without `shape`/`arrayOf`

### Pitfall 4: JSDoc Without Verification
**What goes wrong:** JSDoc exists but types don't match actual code
**Why it happens:** JSDoc written once, code changes, docs not updated
**How to avoid:** `eslint-plugin-jsdoc` validates @param names match function params
**Warning signs:** @param names don't match function signature

### Pitfall 5: Auto-fix Removing Needed Imports
**What goes wrong:** `eslint --fix` removes "unused" imports that are actually used
**Why it happens:** Dynamic imports, JSX-only usage, or incorrect parser settings
**How to avoid:** Review auto-fix changes before committing, proper JSX parsing
**Warning signs:** Runtime errors after lint fix

### Pitfall 6: Commented-Out Code Accumulation
**What goes wrong:** Codebase fills with dead code, confusion about what's active
**Why it happens:** "Might need this later" mentality
**How to avoid:** Delete commented code aggressively, git has history
**Warning signs:** `// TODO: remove` or large commented blocks

## Code Examples

Verified patterns from official sources:

### ESLint Flat Config with JSDoc and React
```javascript
// eslint.config.js - Source: ESLint official docs, eslint-plugin-jsdoc
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  // Base config for all JS/JSX files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2024 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react': react,
      'jsdoc': jsdoc,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Console logging - use loggingService instead
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // TODO/FIXME warnings
      'no-warning-comments': ['warn', {
        terms: ['todo', 'fixme', 'hack'],
        location: 'start',
      }],

      // PropTypes enforcement
      'react/prop-types': 'error',
      'react/forbid-prop-types': ['error', {
        forbid: ['any', 'object', 'array'],
        checkContextTypes: true,
        checkChildContextTypes: true,
      }],

      // JSDoc enforcement for exported functions
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
        contexts: ['ExportNamedDeclaration > FunctionDeclaration'],
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',

      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Relaxed rules for test files
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', 'tests/**/*.{js,jsx}'],
    rules: {
      'no-console': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
];
```

### Husky Initialization
```bash
# Source: Husky official docs
npx husky init

# This creates:
# - .husky/pre-commit with "npm test"
# - Updates package.json with "prepare": "husky"

# Replace pre-commit content:
echo "npx lint-staged" > .husky/pre-commit
```

### lint-staged Configuration
```json
// In package.json - Source: lint-staged docs
{
  "lint-staged": {
    "*.{js,jsx}": [
      "eslint --fix"
    ]
  }
}
```

### Complete PropTypes Example
```javascript
// Source: React PropTypes docs, eslint-plugin-react
import PropTypes from 'prop-types';

function ScreenCard({ screen, onSelect, isSelected, onStatusChange }) {
  // Component implementation
}

ScreenCard.propTypes = {
  screen: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['online', 'offline', 'pairing']).isRequired,
    lastSeen: PropTypes.string,
    location: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    }),
    config: PropTypes.shape({
      orientation: PropTypes.oneOf(['landscape', 'portrait']),
      resolution: PropTypes.string,
    }),
  }).isRequired,
  onSelect: PropTypes.func,
  isSelected: PropTypes.bool,
  onStatusChange: PropTypes.func,
};

ScreenCard.defaultProps = {
  onSelect: null,
  isSelected: false,
  onStatusChange: null,
};

export default ScreenCard;
```

### JSDoc for Service Function
```javascript
// Source: eslint-plugin-jsdoc
/**
 * Create a new campaign with the specified settings
 *
 * @param {Object} campaignData - Campaign configuration
 * @param {string} campaignData.name - Display name for the campaign
 * @param {string} campaignData.type - Campaign type ('emergency', 'scheduled', 'manual')
 * @param {Object} campaignData.content - Content to display
 * @param {string} campaignData.content.playlistId - Playlist to use
 * @param {string[]} [campaignData.screenIds] - Target screens (empty = all screens)
 * @param {Object} [campaignData.schedule] - Schedule configuration
 * @param {string} campaignData.schedule.startDate - ISO date string
 * @param {string} [campaignData.schedule.endDate] - ISO date string (null = indefinite)
 * @returns {Promise<Campaign>} The created campaign
 * @throws {ValidationError} If required fields are missing
 * @throws {QuotaError} If campaign limit exceeded
 */
export async function createCampaign(campaignData) {
  // Implementation
}
```

### Using loggingService Instead of console.log
```javascript
// Source: Project's src/services/loggingService.js
import { log, createScopedLogger } from '../services/loggingService';

// Option 1: Direct usage
log.info('Screen paired successfully', { screenId, tenantId });
log.error('Failed to sync content', { error, screenId });

// Option 2: Scoped logger for a service/component
const logger = createScopedLogger('CampaignService');
logger.info('Campaign created', { campaignId });
logger.error('Failed to activate campaign', { campaignId, error });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .eslintrc.js | eslint.config.js (flat) | ESLint 9.0 (2024) | Already using flat config |
| PropTypes package | TypeScript interfaces | 2020+ | PropTypes still valid for JS projects |
| manual git hooks | Husky v9+ | 2024 | Simpler setup, better reliability |
| eslint --fix manually | lint-staged pre-commit | Standard practice | Automatic enforcement |

**Deprecated/outdated:**
- `.eslintrc.*` files: Use `eslint.config.js` flat config instead (project already does this)
- `husky install` command: Replaced by `husky init` in v9
- Manual `git add` in lint-staged: No longer needed, lint-staged handles it

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-fix on save behavior**
   - What we know: Most editors support ESLint auto-fix on save via settings
   - What's unclear: Whether team wants this enforced or left to individual preference
   - Recommendation: Document in CONTRIBUTING.md as optional, provide VS Code settings.json snippet

2. **Which features need dedicated /docs files**
   - What we know: 29 docs files exist covering major features
   - What's unclear: Gap analysis of undocumented complex features
   - Recommendation: Audit during phase execution, add docs for Player, Campaign system if missing

3. **What's "complex enough" for inline comments**
   - What we know: Business logic, non-obvious decisions, workarounds need comments
   - What's unclear: Exact threshold for "complex"
   - Recommendation: Comment anything that requires context beyond the code itself

## Sources

### Primary (HIGH confidence)
- ESLint official docs - https://eslint.org/docs/latest/
- Husky official docs - https://typicode.github.io/husky/get-started.html
- lint-staged GitHub - https://github.com/lint-staged/lint-staged
- eslint-plugin-jsdoc GitHub - https://github.com/gajus/eslint-plugin-jsdoc
- eslint-plugin-react GitHub - https://github.com/jsx-eslint/eslint-plugin-react
- Project's existing eslint.config.js - verified flat config setup
- Project's existing loggingService.js - verified logging patterns

### Secondary (MEDIUM confidence)
- ESLint blog on flat config - https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/
- React PropTypes documentation (via eslint-plugin-react docs)

### Tertiary (LOW confidence)
- WebSearch results for "husky lint-staged setup 2026" - cross-referenced with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools verified in official documentation
- Architecture: HIGH - patterns verified in official docs and existing project code
- Pitfalls: HIGH - derived from current project state (3,777 violations) and official docs

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - tools are stable, patterns well-established)

## Current Project State Analysis

### Existing Violations Summary
```
Total: 3,777 problems (3,598 errors, 179 warnings)

By rule:
- no-unused-vars: 3,483 (92%) - mostly unused imports
- react-hooks/exhaustive-deps: 125
- no-undef: 63
- react-refresh/only-export-components: 54
- no-case-declarations: 23
- no-console: 11
- no-dupe-keys: 9
- no-useless-catch: 7
- react-hooks/rules-of-hooks: 1
- no-useless-escape: 1
```

### Cleanup Strategy
1. **no-unused-vars (3,483):** Bulk removal of unused imports - use editor "Organize Imports" or ESLint auto-fix
2. **react-hooks/exhaustive-deps (125):** Manual review - may need dependency arrays updated
3. **no-undef (63):** Add missing imports or define globals
4. **react-refresh/only-export-components (54):** May need code restructuring
5. **no-case-declarations (23):** Add blocks to case statements
6. **no-console (11):** Replace with loggingService
7. **no-dupe-keys (9):** Remove duplicate object keys
8. **no-useless-catch (7):** Remove empty catch blocks

### PropTypes Coverage
- Current: 14 of 301 components have PropTypes (~5%)
- Target: 100% coverage
- Gap: ~287 components need PropTypes added

### JSDoc Coverage
- Services: 107 files, most exported functions lack JSDoc
- Hooks: 16 files, JSDoc coverage unknown
- Utils: 8 files, JSDoc coverage unknown
