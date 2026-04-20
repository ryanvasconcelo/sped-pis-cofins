import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

// Resolve pdfjs-dist absolute paths using Node's require.resolve,
// which correctly traverses the monorepo node_modules hierarchy on all platforms.
let pdfjsMain = null;
let pdfjsWorker = null;
try {
    pdfjsMain = require.resolve('pdfjs-dist/build/pdf.mjs');
    pdfjsWorker = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
} catch (_) {
    // Fallback: try from monorepo root node_modules
    pdfjsMain = path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.mjs');
    pdfjsWorker = path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.mjs');
}

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'pdfjs-dist/build/pdf.mjs': pdfjsMain,
            'pdfjs-dist/build/pdf.worker.mjs': pdfjsWorker,
        },
        dedupe: ['pdfjs-dist'],
    },
    optimizeDeps: {
        include: ['pdfjs-dist'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    build: {
        target: 'esnext',
    },
});
