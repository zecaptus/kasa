import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      DATABASE_URL: 'postgresql://localhost:5432/kasa_test',
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars-long',
    },
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'tests/**',
        '*.config.ts',
        'src/index.ts',
        '**/dist/**',
        'src/types/**',
        'src/services/**',
        'src/routes/**',
        'src/middleware/**',
      ],
    },
  },
});
