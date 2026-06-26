import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000,
    hookTimeout: 120000,
    include: ['test/e2e/**/*.test.ts'],
    printConsoleTrace: true,
  },
});
