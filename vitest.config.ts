import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    environmentOptions: {
      jsdom: { url: 'http://localhost/blog' },
    },
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Core runtime/build-time content pipeline. CLI orchestration and
      // one-off migration scripts are covered by integration checks instead.
      include: [
        'lib/assets.ts',
        'lib/mdx.ts',
        'lib/posts.ts',
        'scripts/build-search-index.ts',
        'scripts/prepare-content-assets.ts',
      ],
      exclude: ['**/*.test.{ts,tsx}'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
