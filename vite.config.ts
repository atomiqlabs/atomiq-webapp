import path from 'path';
import { execSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { visualizer } from 'rollup-plugin-visualizer';

// Regenerates src/data/tokenMeta.generated.ts before every dev server start and every
// build, so the committed file can never silently go stale relative to the SDK's token
// tables. Fails the build loudly (throws) if generation errors.
function genTokensPlugin(): Plugin {
    return {
        name: 'gen-tokens',
        buildStart() {
            try {
                execSync('npx tsx scripts/genTokens.ts', { cwd: __dirname, stdio: 'inherit' });
            } catch (e) {
                throw new Error('[gen-tokens] failed to generate src/data/tokenMeta.generated.ts: ' + (e as Error).message);
            }
        },
    };
}

export default defineConfig({
    plugins: [
        genTokensPlugin(),
        react(),
        nodePolyfills({
            globals: {
                Buffer: true,
                process: true,
            },
        }),
        ...(process.env.ANALYZE ? [
            visualizer({ filename: 'stats.html', template: 'treemap', gzipSize: true, brotliSize: true }),
            visualizer({ filename: 'stats.json', template: 'raw-data', gzipSize: true, brotliSize: true }),
        ] : []),
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
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        fs: {
            strict: true,
        },
    },

    // **Add SPA fallback for React Router**
    build: {
        outDir: 'build',
        manifest: true,
        rollupOptions: {
            input: '/index.html',
        },
    },
});