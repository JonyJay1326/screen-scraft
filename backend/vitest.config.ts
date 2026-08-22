import { defineConfig } from 'vitest/config';

/** 后端单测配置 */
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.spec.ts'],
  },
});
