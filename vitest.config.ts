import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // react() is cast because vitest bundles its own copy of vite, so the plugin's
  // Plugin type doesn't structurally match vitest's vite types (harmless duplication).
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
