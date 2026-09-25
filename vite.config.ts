/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Make the emitted tags loadable over file://.
 *
 * Vite always writes `<script type="module" crossorigin>` and
 * `<link rel="stylesheet" crossorigin>` for the entry, and both are
 * CORS-gated: from a file:// page the origin is "null", the fetch is
 * rejected, and nothing runs. The bundle itself is already a classic IIFE
 * (see `output.format` below), so the module type buys nothing — dropping
 * it, plus the crossorigin attributes, is all that stands between this
 * build and double-clicking dist/index.html.
 *
 * `defer` replaces the deferral that `type="module"` gave us for free:
 * the tag sits in <head> and the app needs #root to exist before it runs.
 */
function fileProtocolFriendlyHtml(): Plugin {
  return {
    name: 'finora:file-protocol-friendly-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
    },
  };
}

export default defineConfig({
  plugins: [react(), fileProtocolFriendlyHtml()],
  // Relative base keeps the build portable: static hosts, sub-folders,
  // Capacitor/Electron bundles and file:// packaging all work unchanged.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2019',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // A single classic script rather than ES modules: browsers refuse to
        // load `type="module"` over file://, and this build is meant to run by
        // double-clicking dist/index.html as well as from a web server.
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  test: {
    // `globals: true` lets the test files run unchanged under both
    // `vitest` and `bun test`.
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
