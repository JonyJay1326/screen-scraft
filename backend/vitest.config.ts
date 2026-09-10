import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/** 后端单测配置 */
export default defineConfig({
  resolve: {
    alias: {
      '@screencraft/shared': fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/__tests__/**/*.spec.ts'],
  },
});
