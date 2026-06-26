import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', '.opencode/**', 'test/e2e/**', 'node_modules/**'],
  },
});
