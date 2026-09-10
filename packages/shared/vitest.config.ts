import { defineConfig } from 'vitest/config';

/** shared 包单测配置 */
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.spec.ts'],
  },
});
