import path from 'path';
import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            globals: {
                Buffer: true,
                process: true,
            },
        }),
    ],

    define: {
        global: 'globalThis',
        'process.env': {},
        'process.version': '"v18.17.1"',
    },

    resolve: {
        alias: [
            { find: 'process', replacement: path.resolve(__dirname, 'node_modules/process/browser.js') },
            { find: 'stream', replacement: path.resolve(__dirname, 'node_modules/stream-browserify') },
            { find: 'crypto', replacement: path.resolve(__dirname, 'node_modules/crypto-browserify') },
            { find: 'buffer', replacement: path.resolve(__dirname, 'node_modules/buffer') },
            { find: 'zlib', replacement: path.resolve(__dirname, 'node_modules/zlib-browserify') },
            { find: 'http', replacement: path.resolve(__dirname, 'node_modules/stream-http') },
            { find: 'https', replacement: path.resolve(__dirname, 'node_modules/https-browserify') },
        ],
    },

    optimizeDeps: {
        include: [
            'buffer',
            'process',
            'stream-browserify',
            'readable-stream',
            'crypto-browserify',
        ],
    },

    // TODO: remember this suppression in case of css problemns
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
            },
        },
    },

    server: {
        port: 5173,
        strictPort: true,
        fs: {
            strict: true,
        },
    },

    // **Add SPA fallback for React Router**
    build: {
        outDir: 'build',
        rollupOptions: {
            input: '/index.html',
        },
    },
});