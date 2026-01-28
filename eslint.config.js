import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Ignore patterns
  { ignores: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    'perf-reports/**',
    'yodeck-capture/**',    // Captured JS from competitor analysis
    '_api-disabled/**',     // Disabled API routes
    'public/**',            // Static assets including polotno-editor.js
  ] },

  // Base config for all JS/JSX files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Console rule - warn level during legacy cleanup phase
      // TODO: Upgrade to error after console migration to loggingService
      'no-console': ['warn', {
        allow: ['warn', 'error']
      }],

      // Unused imports - auto-fixable, error level (blocks commits)
      'no-unused-vars': 'off', // Disable base rule in favor of plugin
      'unused-imports/no-unused-imports': 'error',
      // Unused vars - warning level (visibility without blocking legacy code)
      // TODO: Consider upgrading to error after cleanup sprint
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Legacy code issues - warnings for visibility, not blocking
      // TODO: Fix these in dedicated cleanup tasks
      'no-case-declarations': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-escape': 'warn',

      // Legacy undefined variables - warning during migration
      // Many components have undefined logger, result, etc.
      // TODO: Phase 28-02 should address these systematically
      'no-undef': 'warn',
    },
  },

  // Relaxed rules for unit test files
  {
    files: ['**/*.test.{js,jsx}', 'tests/unit/**/*.{js,jsx}', 'tests/setup.js'],
    languageOptions: {
      globals: {
        global: 'writable',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // E2E test files use Node.js process
  {
    files: ['**/*.spec.{js,jsx}', 'tests/e2e/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Relaxed rules for config files
  {
    files: ['vite.config.js', 'vitest.config.js', 'playwright.config.js', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Scripts can use console
  {
    files: ['scripts/**/*.{js,cjs,jsx}', 'load-tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // k6 load test files have special globals
  {
    files: ['load-tests/**/*.js', 'tests/load/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Service and API files use process.env
  {
    files: ['src/services/**/*.js', 'src/api/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },

  // Logging service is allowed to use console directly
  {
    files: ['src/services/loggingService.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
