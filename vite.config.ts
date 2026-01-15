import path from 'path';
import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import rollupNodePolyFill  from 'rollup-plugin-polyfill-node';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react()
    ],

    define: {
        global: 'globalThis',
        'process.env': {},
    },

    resolve: {
        alias: [
            { find: 'process', replacement: path.resolve(__dirname, 'node_modules/process/browser.js') },
            { find: 'stream', replacement: path.resolve(__dirname, 'node_modules/stream-browserify') },
            { find: 'crypto', replacement: path.resolve(__dirname, 'node_modules/crypto-browserify') },
            // { find: 'buffer', replacement: path.resolve(__dirname, 'node_modules/buffer') },
            { find: 'zlib', replacement: path.resolve(__dirname, 'node_modules/zlib-browserify') },
            { find: 'http', replacement: path.resolve(__dirname, 'node_modules/stream-http') },
            { find: 'https', replacement: path.resolve(__dirname, 'node_modules/https-browserify') },
        ],
    },

    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
            plugins: [
                polyfillNode()
            ],
        },
        include: [
            'buffer',
            'process',
            'stream-browserify',
            'readable-stream',
            'crypto-browserify'
        ],
        // exclude: [
        //     '@walletconnect/ethereum-provider',
        //     '@walletconnect/core',
        //     '@walletconnect/sign-client',
        // ],
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
        port: 5173, // or whatever you prefer
        strictPort: true,
        fs: {
            strict: true,
        },
    },

    // **Add SPA fallback for React Router**
    build: {
        rollupOptions: {
            input: '/index.html',
            // plugins: [rollupNodePolyFill()],
        },
    },
});
