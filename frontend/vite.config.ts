import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
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
        'src/main.tsx',
        '**/dist/**',
        'src/pages/**',
        'src/components/NavBar.tsx',
        'src/components/ProtectedRoute.tsx',
        'src/components/PasswordStrengthIndicator.tsx',
        'src/services/baseQueryWithReauth.ts',
        'src/services/authApi.ts',
        'src/services/importApi.ts',
        'src/app.tsx',
      ],
    },
  },
});
