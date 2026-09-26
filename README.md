# Finora — All-in-One Calculator

A financial and utility calculator platform for India: 49 calculators covering loans, investment,
retirement, tax, salary, business, construction and everyday maths, plus 22 long-form financial
guides — built as a single coherent application rather than a collection of pages.

- **Accurate first.** Every calculation uses the real formula — EPFO's monthly-running-balance
  interest method, the statutory 15/26 gratuity divisor, slab-wise income tax with rebate,
  marginal relief, surcharge and cess. Automated tests check the engines against known values,
  and every figure quoted in the explanatory text is pinned to the engines by tests.
- **Built to be found.** Every calculator, guide and information page has its own real URL
  (`/home-loan-emi-calculator/`) and is pre-rendered to static HTML with its own title,
  description, canonical URL, structured data and full content — see
  [SEO, URLs and pre-rendering](#seo-urls-and-pre-rendering).
- **Private by design.** Calculations run in the browser; the figures you type never leave your
  device. No accounts and no analytics. (If you switch on AdSense, Google's ad script is the
  only third-party code — see [Going live](#going-live-site-settings-and-adsense).)
- **Installable.** Ships a web app manifest and a service worker, ready to install as a PWA or
  wrap as a mobile/desktop app.

---

## Quick start

**Test it on your PC and phone (Windows).** Double-click
[`local-testing/start-local-server.bat`](local-testing/README.md). It installs dependencies on
first run, starts the dev server and prints the address to open on a phone connected to the
same Wi-Fi. `local-testing/start-production-preview.bat` does the same for the finished build.

**Develop it:**

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/`, then pre-renders every page |
| `npm run preview` | Serve `dist/` the way a static host would (real 404s, trailing-slash redirects) |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run check:contrast` | WCAG audit of every palette — run after changing any colour |

Requires Node 18+.

**Use it from disk.** After `npm run build`, `dist/index.html` also works when double-clicked:
the bundle is a single classic script with relative paths, and over `file://` the app falls
back to hash routes (`#/c/fd`). The service worker is limited to `https:`, so there is no
offline cache from disk.

---

## The calculators

**Investment & Retirement** — EPF · NPS · PPF · Mutual Fund (SIP *or* lumpsum) · FD · Retirement
Planning · Inflation · SWP · Sukanya Samriddhi · Compound Interest · Net Worth
**Loans** — Home Loan EMI · Personal Loan EMI · Car Loan EMI · Bike Loan EMI · Education Loan
EMI · Loan Prepayment · Loan Eligibility · Flat vs Reducing Rate
**Tax & Salary** — Income Tax (old vs new regime) · Salary · CTC to In-Hand · Gratuity · Salary
Increment · Leave Encashment · HRA Exemption · TDS · Capital Gains Tax
**Date & Age** — Age · Date Difference
**Business & General** — GST · ROI · Percentage · Markup · Commission · Profit Margin ·
Break-Even · Depreciation
**Everyday** — BMI · Currency · Construction Material · Electrical Load

Each one ships real calculation logic, inline validation, charts, a year-wise table where it
makes sense, CSV export, and an explanatory section covering how it works, the formula, a
worked example, assumptions and FAQs.

SIP and lumpsum are two ways of asking the same question, so they share one screen: the mutual
fund calculator opens on a SIP / Lumpsum switch that swaps the inputs, the projection and the
charts. `/sip-calculator/` redirects there, so older links still land somewhere sensible.

The five loan calculators share one EMI engine but are separate pages on purpose — each loan is
searched for separately, and each works differently: home loans start from a property price
and show the RBI loan-to-value check and the Section 24(b)/80C saving; car and bike loans start
from the on-road price and show the total cost of the vehicle; personal loans show the
processing fee and the true annual cost (APR); education loans model yearly disbursal, the
moratorium interest and Section 80E. The old single EMI calculator became the personal loan
calculator, and `/emi-calculator/` redirects to it.

Results update live as you type. The inputs are mirrored into the address bar (only values that
differ from the defaults), so a copied link reopens exactly the same scenario.

---

## Architecture

```
src/
├── calculators/        # One module per calculator: fields + compute + presentation
│   ├── types.ts        # The CalculatorDef contract every module implements
│   ├── index.ts        # Registry: id → module
│   ├── investment/  loans/  tax/  salary/  dates/  business/  everyday/
├── engines/            # Pure, framework-free maths. No React, no formatting.
│   ├── core.ts         # Annuities, compounding, CAGR, real return
│   ├── epf.ts  nps.ts  emi.ts  tax.ts  investment.ts  salary.ts
│   └── business.ts  everyday.ts  dates.ts
├── content/
│   ├── guides/         # The long-form financial guides, one file per topic
│   └── pages.ts        # About, Contact, Privacy Policy, Terms, Disclaimer
├── data/
│   ├── catalog.ts      # Calculator & category metadata: names, keywords, SEO
│   ├── site.ts         # ⚠️ Domain, contact email and AdSense ids — edit before going live
│   └── taxRules.ts     # ⚠️ ALL tax slabs, rebates, surcharge bands and deduction caps
├── components/         # Shell, form renderer, charts, tables, result cards
├── hooks/              # Theme, favourites, recents, media queries
├── lib/                # Formatting, validation, router + URLs, page metadata, storage
├── pages/              # Dashboard, calculator, category, guides, info pages, 404
├── entry-server.tsx    # Build-time renderer used by scripts/prerender.mjs
├── styles/             # Design tokens + component CSS
└── tests/              # Vitest suites for the engines
```

The data flow is the same for every calculator, which is what keeps 49 modules feeling like one
product:

```
UI (FieldControl)
  ↓
Input validation (lib/validate.ts)
  ↓
Calculation engine (engines/*.ts — pure, testable)
  ↓
Formatted result (lib/format.ts — Indian digit grouping)
  ↓
Charts & tables (components/Chart.tsx, DataTable.tsx)
```

### Adding a new calculator

1. Write the maths in `src/engines/` as a pure function, and a test for it.
2. Create `src/calculators/<category>/<name>.ts` exporting a `CalculatorDef`: its fields,
   `compute`, `hero`, `stats`, optional `charts` / `table` / `extra`, and `content` — an
   `intro`, how it works, formula, worked example, optional `sections`, at least four FAQs and
   links to related `guides` (the content tests enforce this).
3. Add one entry to `CALCULATORS` in `src/data/catalog.ts` and one line to `REGISTRY` in
   `src/calculators/index.ts`.

Navigation, search, the dashboard, favourites, its URL (`/<id>-calculator/`), the pre-rendered
page, the sitemap, SEO metadata, CSV export and print styling all pick it up automatically.

### Adding a guide

Add an object to the right file in `src/content/guides/`. It is published at `/guides/<slug>/`,
listed on the guides index, pre-rendered and added to the sitemap. Link calculators to it by
adding the slug to their `content.guides`.

### Updating tax rules

Every slab, threshold, rebate, surcharge band and deduction cap lives in
`src/data/taxRules.ts` — nothing is hard-coded in the engine or the UI. When a Finance Act
changes the numbers, copy the newest `FINANCIAL_YEARS` entry, edit the figures, and the new
year appears in the dropdown.

```ts
{
  id: '2027-28',
  label: 'FY 2027-28',
  assessmentYear: 'AY 2028-29',
  current: true,
  regimes: { old: oldRegime(), new: newRegime(SLABS, 1200000, 60000) },
  specialRates: { /* … */ },
}
```

Rates currently configured: FY 2024-25, FY 2025-26 and FY 2026-27, with EPF at 8.25% and PPF at
7.1%. Verify against the latest Finance Act before relying on them.

---

## Design system

Tokens live in `src/styles/tokens.css`. Five original palettes ship, each in a light and a
dark surface:

| Palette | Character | Feel |
| --- | --- | --- |
| **Harbor** *(default)* | Slate & teal | Calm, infrastructural |
| **Meridian** | Indigo & cyan | Crisp, technical |
| **Evergreen** | Forest & lime | Natural, growth |
| **Ember** | Graphite & amber | Warm, confident |
| **Iris** | Violet & periwinkle | Considered, editorial |

Appearance is two independent axes rather than one list — `[data-palette]` picks the hue family
and `[data-mode]` picks the surface — so five palettes cost five pairs of blocks instead of
fifteen entries, and choosing a colour never silently flips light to dark. "Auto" is resolved to
a concrete mode in JavaScript and written to `data-mode`, which is why there is no
`prefers-color-scheme` duplication anywhere in the stylesheet.

A palette declares only the ~28 values that genuinely differ. Status backgrounds, the focus
ring, chart gridlines and the ambient background blobs are all derived from those with
`color-mix()` on the shared `:root`.

**Every palette is contrast-audited, not eyeballed.** A script walks all ten palette/mode
combinations and checks the pairs that carry meaning — body text, secondary and muted text,
brand links, button labels, white-on-hero-gradient, status colours and each chart series against
its surface. All 180 pairs clear WCAG AA: body text lands between 14.7:1 and 17.7:1, brand links
between 5.3:1 and 8.2:1, and the weakest text role never drops below 4.3:1.

Pick a theme from the topbar, cycle palettes with ⌘⇧L / Ctrl-Shift-L, or flip light/dark with
⌘⇧D / Ctrl-Shift-D.

Chart series use a five-colour categorical palette validated for colour-vision-deficiency
separation against both the light and dark surfaces. Charts are hand-built SVG (~250 lines) —
they inherit theme tokens directly and add nothing to the bundle.

Navigation sits to the **right** of the content and is last in the DOM, so reading and tab
order both reach the calculator before the menu. Every nav entry is a boxed card, and the list
opens with the ten most-used calculators, ranked by `popularRank` in the catalog rather than by
their position in the array. Motion is handled by a few shared utilities in
`base.css` (`.anim-rise`, `.anim-zoom`, `.stagger`) rather than per-component animation, and
all of it is switched off wholesale under `prefers-reduced-motion`.

Responsive behaviour: the sidebar becomes a right-hand drawer below 1024px, input grids
collapse to one column below 620px, tables scroll horizontally inside their own container, and
every control has a ≥44px touch target. Nothing overflows horizontally at any width from 320px
up.

---

## Accessibility

Labelled form controls with `aria-invalid` and `aria-describedby` wiring, visible focus rings,
a skip link, `aria-current` on navigation, keyboard-navigable search (⌘K / Ctrl-K, arrows,
Enter, Escape), live regions for validation and toasts, semantic tables with scoped headers,
and `prefers-reduced-motion` support.

---

## SEO, URLs and pre-rendering

Search engines treat everything after `#` as part of one page, so hash routes (`/#/c/emi`) made
every calculator invisible as a separate result. Over `http(s)` the app now uses real paths:

| Page | URL |
| --- | --- |
| Calculator | `/home-loan-emi-calculator/` (`/<id>-calculator/`) |
| Category | `/category/loans/` |
| Guides | `/guides/`, `/guides/how-emi-is-calculated/` |
| Information pages | `/about/`, `/contact/`, `/privacy-policy/`, `/terms/`, `/disclaimer/` |

`npm run build` runs `vite build`, then a second SSR build of `src/entry-server.tsx`, then
`scripts/prerender.mjs`, which writes one `index.html` per route containing:

- its own `<title>`, meta description, canonical URL and Open Graph tags;
- JSON-LD: `WebApplication` + `BreadcrumbList` + `FAQPage` for calculators, `Article` for guides;
- the fully rendered page — calculator with default values, explanation, FAQs and links — so
  crawlers and slow phones see everything before any JavaScript runs.

It also generates `sitemap.xml`, `robots.txt`, `404.html`, redirect pages for retired URLs
(`/emi-calculator/`, `/home-loan-calculator/`, `/sip-calculator/` …) and, once AdSense is set up,
`ads.txt`. Old `/#/c/...` links are translated to the new URLs in the browser.

## Going live: site settings and AdSense

Edit `src/data/site.ts` before deploying:

| Setting | What to put there |
| --- | --- |
| `url` | Your real domain, e.g. `https://yourdomain.com` — used for canonical URLs and the sitemap |
| `contactEmail` | An inbox you read — shown on Contact, Privacy and Terms (the build warns while it is the placeholder) |
| `adsenseClient` | Your AdSense publisher id (`ca-pub-…`) once you have one; empty = no ad code anywhere |
| `adSlots` | Optional ad unit ids for the two fixed positions (after results, end of guides) |

With `adsenseClient` set, the build adds the AdSense script to every page and writes
`ads.txt`; with ad unit ids, clearly labelled slots appear below the results and at the end of
guides — never between inputs and results. Then submit `https://yourdomain.com/sitemap.xml` in
Google Search Console.

## Building for production

```bash
npm run build      # → dist/ (pre-rendered)
npm run preview    # serve dist/ like a static host
```

Assets use relative paths, so pages work from any folder depth. `404.html` is written with
root-relative links and assumes the site is served from the domain root.

### Deploying

Any static host works — there is no server component. Every URL is a real file, so no rewrite
rules are needed.

**Netlify** — build `npm run build`, publish `dist`.
**Vercel** — framework preset Vite, output `dist`.
**Cloudflare Pages** — build `npm run build`, output `dist`.
**GitHub Pages** — publish `dist/` (it serves `404.html` automatically).

```bash
# nginx
server {
  root /var/www/finora/dist;
  location / { try_files $uri $uri/ =404; }
  error_page 404 /404.html;
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
}
```

Bump `CACHE` in `public/sw.js` on each release so returning visitors pick up new assets.

### Packaging as an app

The app is already PWA-installable: manifest, icons (192/512/maskable), theme colour, standalone
display and an offline-friendly service worker.

- **Mobile (Capacitor):** `npm i -D @capacitor/cli && npx cap init && npx cap add android`,
  point `webDir` at `dist`, then `npm run build && npx cap sync`.
- **Desktop (Electron/Tauri):** load `dist/index.html` directly — relative paths and the
  `file://` hash-routing fallback work without a server.

---

## Testing

```bash
npm test
```

The suites cover every calculation engine — EPF, income tax, NPS, EMI and the loan-specific
parts (APR with fees, RBI LTV tiers, home loan tax benefit, education loan moratorium), SIP,
PPF, FD, salary, CTC, gratuity, dates, business and everyday tools — plus validation, Indian
number formatting, search ranking, registry integrity, URL mapping, unique page metadata and
content integrity (every calculator has an intro, FAQs and valid guide links; every guide links
to real calculators; every table is well-formed). Financial assertions use published or
independently computed figures — the ₹12.75 lakh zero-tax case, the 15/26 gratuity formula,
the ₹50 lakh home loan example quoted on the page — rather than values copied from the
implementation.

One test walks every registered calculator, computes it from its own defaults, and asserts that
no result, statistic, chart point or table cell comes back as `NaN` or `Infinity`.

---

## Notes and limitations

- Results are estimates for planning, not financial, tax or investment advice.
- Projected returns are not guaranteed; EPF, PPF and small-savings rates are revised periodically.
- The income tax calculator covers resident individuals. The capital gains calculator applies the
  post-July-2024 rates by asset class but not set-offs, exemptions under Sections 54/54F or the
  optional indexation for older property.
- Currency conversion uses a rate you supply — the calculators make no network calls.
- The whole app, including all explanatory text, ships as one script (about 280 KB gzipped).
  Pages are pre-rendered, so content appears before it loads; splitting content out of the
  bundle is a possible future optimisation.

## Licence

MIT.
