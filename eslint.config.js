import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      // Build/output artifacts
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'perf-reports/**',
      'screenshots/**',
      'node_modules/**',
      // GSD planning + agent worktrees + browser MCP scratch
      '.claude/**',
      '.planning/**',
      '.playwright-mcp/**',
      // Disabled / vendored / non-source trees
      '_api-disabled/**',
      'android-tv-player/**',
      'yodeck-capture/**',
      'telegram-bot/**',
      'supabase/**',
      'docs/**',
      'load-tests/**',
      'scripts/**',
      // Public bundled assets (vendored polotno, etc — not source)
      'public/**',
      // Tests: lint gate intentionally excludes tests for now.
      // Tests routinely use console for debugging and have their own
      // setup conventions. Add a tests-specific config block here if/when
      // we want to lint them with relaxed rules.
      'tests/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TODO(engineering-gates): pay down legacy console.log usage and
      // promote `no-console` back to 'error'. Lint gate is intentionally
      // warning-only for this packet so ~200 pre-existing console calls
      // do not block CI. Authorized caller is src/services/loggingService.js
      // (exempted below). The remaining react-hooks/exhaustive-deps and
      // react-refresh/only-export-components warnings are also legacy debt
      // — they touch product behavior and are out of scope here.
      'no-console': ['warn', {
        allow: ['warn', 'error'],
      }],
    },
  },
  // Exempt loggingService from no-console (it IS the logger)
  {
    files: ['src/services/loggingService.js'],
    rules: {
      'no-console': 'off',
    },
  },
  // Node.js config files
  {
    files: ['vite.config.js', 'vitest.config.js', 'playwright.config.js', 'postcss.config.js', 'tailwind.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
