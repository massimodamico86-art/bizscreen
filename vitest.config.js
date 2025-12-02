import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./tests/setup.js'],

    // Test file patterns
    include: [
      'tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],

    // Exclude E2E tests (they use Playwright)
    exclude: [
      'tests/e2e/**',
      'node_modules/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/supabase.js',
        'node_modules/**',
        'tests/**'
      ],
      // TODO: Raise thresholds as more tests are added.
      // Currently set to 0 to allow CI to pass while test coverage is being built out.
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    },

    // Global test settings
    globals: true,

    // Reporter
    reporters: ['verbose'],

    // Timeout
    testTimeout: 10000
  }
});
