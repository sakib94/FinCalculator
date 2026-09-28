/**
 * Pre-renders every route of the built site into its own HTML file.
 *
 * Runs after `vite build` (browser bundle → dist/) and
 * `vite build --ssr src/entry-server.tsx` (Node bundle → dist-ssr/):
 *
 *   dist/index.html                              home page
 *   dist/home-loan-emi-calculator/index.html     one folder per calculator
 *   dist/category/loans/index.html               categories
 *   dist/guides/…/index.html                     guides
 *   dist/about/index.html …                      information pages
 *   dist/emi-calculator/index.html               redirects for retired ids
 *   dist/404.html, sitemap.xml, robots.txt, ads.txt (when AdSense is set)
 *
 * Each page carries its own <title>, description, canonical URL, Open Graph
 * tags, JSON-LD and the fully rendered page content, so it is indexable
 * before any JavaScript runs. The browser bundle then takes over.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(projectRoot, 'dist');
const ssrDir = join(projectRoot, 'dist-ssr');

const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const { SITE } = ssr;
let template = await readFile(join(dist, 'index.html'), 'utf8');

// Preload the three font files almost every page paints with — body text,
// the ₹ sign (Inter's latin-ext subset) and the display face — so the first
// paint uses them instead of swapping a fallback out a moment later.
const PRELOAD_FONTS = /^(inter-latin-wght-normal|inter-latin-ext-wght-normal|plus-jakarta-sans-latin-wght-normal)[\w.-]*\.woff2$/;
const fontPreloads = (await readdir(join(dist, 'assets')))
  .filter((f) => PRELOAD_FONTS.test(f))
  .map((f) => `<link rel="preload" href="./assets/${f}" as="font" type="font/woff2" crossorigin />`);
if (fontPreloads.length) {
  template = template.replace('<link rel="stylesheet"', `${fontPreloads.join('\n    ')}\n    <link rel="stylesheet"`);
}

if (!template.includes('<!--app-start-->') || !template.includes('<!--app-end-->')) {
  throw new Error('dist/index.html is missing the <!--app-start--> / <!--app-end--> markers');
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (data) =>
  `<script type="application/ld+json" data-page-jsonld>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/** Points the template's "./x" asset links at the site root from a page `prefix` away. */
const rebase = (html, prefix) => (prefix === './' ? html : html.replace(/(href|src)="\.\//g, `$1="${prefix}`));

function setHead(html, { title, description, canonical, robots, extra }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : '',
    ...extra,
  ].filter(Boolean);

  return html
    .replace(/<!-- Title, description, canonical[\s\S]*?-->\s*/, '')
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/?>\s*/, '')
    .replace(/<meta\s+name="robots"[\s\S]*?\/?>\s*/, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/?>\s*/, '')
    .replace(/<meta\s+property="og:title"[\s\S]*?\/?>\s*/, '')
    .replace(/<meta\s+property="og:description"[\s\S]*?\/?>\s*/, '')
    .replace(/<meta\s+property="og:url"[\s\S]*?\/?>\s*/, '')
    .replace('</head>', `  ${tags.join('\n    ')}\n  </head>`);
}

const adsHead = SITE.adsenseClient
  ? [
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(
        SITE.adsenseClient,
      )}" crossorigin="anonymous"></script>`,
    ]
  : [];

async function writePage(relativeUrlPath, html) {
  const file = relativeUrlPath ? join(dist, relativeUrlPath, 'index.html') : join(dist, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

function renderPage(path, { root, notFound = false } = {}) {
  const meta = ssr.metaForPath(path);
  const prefix = root ?? ssr.relativeRootFor(path);
  const app = ssr.render(path, prefix);
  let html = rebase(template, prefix);
  html = setHead(html, {
    title: meta.title,
    description: meta.description,
    canonical: notFound ? '' : ssr.canonicalUrlFor(path),
    robots: notFound ? 'noindex' : 'index, follow',
    extra: [...meta.jsonLd.map(jsonLd), ...adsHead],
  });
  return html.replace(/<!--app-start-->[\s\S]*?<!--app-end-->/, `<!--app-start-->${app}<!--app-end-->`);
}

/* ---------------- Pages ---------------- */
const routes = ssr.allRoutes();
for (const path of routes) {
  const meta = ssr.metaForPath(path);
  if (meta.notFound) throw new Error(`Route ${path} is listed for pre-rendering but resolves to "not found"`);
  await writePage(ssr.toUrlPath(path), renderPage(path));
}

/* ---------------- Retired ids → their successors ---------------- */
for (const { from, to } of ssr.aliasRoutes()) {
  const q = to.indexOf('?');
  const targetPath = q === -1 ? to : to.slice(0, q);
  const search = q === -1 ? '' : to.slice(q);
  const prefix = ssr.relativeRootFor(from);
  const target = `${prefix}${ssr.toUrlPath(targetPath)}${search}`;
  const canonical = ssr.canonicalUrlFor(targetPath);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Redirecting…</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" />
    <script>location.replace(${JSON.stringify(target)} + (location.hash || ''));</script>
  </head>
  <body>
    <p>This calculator has moved to <a href="${escapeHtml(target)}">${escapeHtml(canonical)}</a>.</p>
  </body>
</html>
`;
  await writePage(ssr.toUrlPath(from), html);
}

/* ---------------- 404 ---------------- */
// Served by static hosts at whatever address was missing, so its links and
// assets are rooted at "/" rather than relative to one folder.
await writeFile(join(dist, '404.html'), renderPage('/404', { root: '/', notFound: true }));

/* ---------------- sitemap.xml / robots.txt / ads.txt ---------------- */
const lastmod = new Map(
  routes
    .filter((p) => p.startsWith('/guides/'))
    .map((p) => [p, ssr.metaForPath(p).jsonLd.find((d) => d['@type'] === 'Article')?.dateModified]),
);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((p) => {
    const mod = lastmod.get(p);
    return `  <url><loc>${escapeHtml(ssr.canonicalUrlFor(p))}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`;
  })
  .join('\n')}
</urlset>
`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

if (SITE.adsenseClient) {
  const pub = SITE.adsenseClient.replace(/^ca-/, '');
  await writeFile(join(dist, 'ads.txt'), `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
}

await rm(ssrDir, { recursive: true, force: true });

console.log(`\n✓ Pre-rendered ${routes.length} pages, ${ssr.aliasRoutes().length} redirects, 404.html and sitemap.xml`);
for (const p of ssr.PLACEHOLDER_SETTINGS) {
  console.warn(`⚠ src/data/site.ts → ${p.key} is still a placeholder: ${p.why}.`);
}
if (!SITE.adsenseClient) console.log('ℹ AdSense is off (src/data/site.ts → adsenseClient is empty).');
