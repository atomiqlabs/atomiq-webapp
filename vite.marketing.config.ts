import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },

  build: {
    outDir: 'build-marketing',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        marketing: path.resolve(__dirname, 'marketing.html'),
      },
    },
  },
});
