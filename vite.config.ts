/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootScript } from './src/theme/boot';

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

/**
 * Inlines the pre-paint appearance script (src/theme/boot.ts) right after
 * the theme-color meta tag, so the saved light/dark mode, accent and
 * density are on <html> before anything paints — no flash of the wrong
 * theme. The pre-renderer copies it into every page along with the rest
 * of index.html.
 */
function appearanceBoot(): Plugin {
  return {
    name: 'finora:appearance-boot',
    transformIndexHtml(html) {
      const tag = `<script>${bootScript()}</script>`;
      const meta = /(<meta name="theme-color"[^>]*>)/;
      return meta.test(html) ? html.replace(meta, `$1\n    ${tag}`) : html.replace('<head>', `<head>\n    ${tag}`);
    },
  };
}

/**
 * Makes `vite preview` answer like a static host: "/emi-calculator" is
 * redirected to "/emi-calculator/", and a path with no file gets dist/404.html
 * with a 404 status — so what you test locally is what visitors will get.
 */
function staticHostPreview(): Plugin {
  return {
    name: 'finora:static-host-preview',
    configurePreviewServer(server) {
      const outDir = server.config.build.outDir;
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = decodeURIComponent(url.pathname);
        if (/\.[a-z0-9]+$/i.test(path)) return next();
        if (!path.endsWith('/') && existsSync(join(outDir, path, 'index.html'))) {
          res.statusCode = 301;
          res.setHeader('Location', `${path}/${url.search}`);
          return res.end();
        }
        if (path.endsWith('/') && existsSync(join(outDir, path, 'index.html'))) return next();
        const notFound = join(outDir, '404.html');
        if (!existsSync(notFound)) return next();
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(notFound));
      });
    },
  };
}

export default defineConfig(({ isSsrBuild, isPreview }) => ({
  plugins: [react(), appearanceBoot(), fileProtocolFriendlyHtml(), staticHostPreview()],
  // The dev server has no pre-rendered pages, so it answers every path with
  // index.html and lets the router decide. `vite preview` serves dist/ the
  // way a static host does: real files, and 404.html for anything else.
  appType: isPreview ? 'mpa' : 'spa',
  // Relative base keeps the build portable: static hosts, sub-folders,
  // Capacitor/Electron bundles and file:// packaging all work unchanged.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Only scan the app's own entry; artifact/index.html is a prebuilt copy
  // whose assets/main.js import would otherwise fail the dev-server scan.
  optimizeDeps: { entries: ['index.html'] },
  // The second build (`vite build --ssr src/entry-server.tsx`) produces an
  // ES module for scripts/prerender.mjs to import in Node; it is never
  // shipped to browsers.
  build: isSsrBuild
    ? { target: 'node18', outDir: 'dist-ssr', emptyOutDir: true, copyPublicDir: false }
    : {
        target: 'es2019',
        cssCodeSplit: false,
        // One deliberate bundle (see output.format below); pages are
        // pre-rendered, so content is visible before it has loaded.
        chunkSizeWarningLimit: 1024,
        rollupOptions: {
          output: {
            // A single classic script rather than ES modules: browsers refuse to
            // load `type="module"` over file://, and this build is meant to run by
            // double-clicking dist/index.html as well as from a web server.
            format: 'iife' as const,
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
    // Let the appearance tests read tokens.css as text (`?raw`); Vitest
    // otherwise replaces CSS imports with an empty string.
    css: { include: [/tokens\.css/] },
  },
}));
