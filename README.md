# Finora — All-in-One Calculator

A production-quality financial and utility calculator platform for India: 37 calculators
covering investment, retirement, tax, loans, salary, business, construction and everyday
maths, built as a single coherent application rather than a collection of pages.

- **Accurate first.** Every calculation uses the real formula — EPFO's monthly-running-balance
  interest method, the statutory 15/26 gratuity divisor, slab-wise income tax with rebate,
  marginal relief, surcharge and cess. 208 automated tests check the engines against known values.
- **Private by design.** Everything runs in the browser. No accounts, no analytics, no network
  calls — the figures you type never leave your device.
- **Fast and installable.** ~120 KB gzipped, no chart library, no UI framework beyond React.
  Ships a web app manifest and a service worker, ready to install as a PWA or wrap as a
  mobile/desktop app.

---

## Quick start

**Just use it — no install.** Open `finora/dist/index.html` by double-clicking it. That build
runs straight from disk: the bundle is a single classic IIFE script with relative asset paths
and no module/CORS-gated tags, so `file://` is enough. Routing is hash-based (`#/c/emi`), which
also works without a server. Bookmark the file, or right-click → *Send to* → *Desktop
(create shortcut)* for a double-clickable launcher.

Two things behave differently from disk, both by design: the service worker does not register
(it is limited to `https:`), so there is no offline cache beyond the browser's own; and
favourites/recents/theme are stored per-browser under the `file://` origin.

**Develop it:**

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the engine test suite (Vitest) |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run check:contrast` | WCAG audit of every palette — run after changing any colour |

Requires Node 18+.

---

## The calculators

**Investment & Retirement** — EPF · NPS · PPF · Mutual Fund (SIP *or* lumpsum) · FD · Retirement
Planning · Inflation · SWP · Sukanya Samriddhi · Compound Interest · Net Worth
**Loans** — EMI (with full amortisation schedule) · Loan Prepayment · Loan Eligibility
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
charts. `/#/c/sip` redirects there, so older links still land somewhere sensible.

**Results are computed on demand.** Typing never moves the figures on screen — pressing
**Calculate** does. While the inputs and the displayed result disagree, the result dims and a
banner offers to recalculate, so a number on screen always corresponds to inputs the reader
actually submitted.

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
├── data/
│   ├── catalog.ts      # Calculator metadata: names, categories, keywords, SEO
│   └── taxRules.ts     # ⚠️ ALL tax slabs, rebates, surcharge bands and deduction caps
├── components/         # Shell, form renderer, charts, tables, result cards
├── hooks/              # Theme, favourites, recents, media queries
├── lib/                # Formatting, validation, router, storage, export, SEO
├── pages/              # Dashboard, calculator page, category page, 404
├── styles/             # Design tokens + component CSS
└── tests/              # Vitest suites for the engines
```

The data flow is the same for every calculator, which is what keeps 23 modules feeling like one
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
   `compute`, `hero`, `stats`, optional `charts` / `table` / `extra`, and `content`.
3. Add one entry to `CALCULATORS` in `src/data/catalog.ts` and one line to `REGISTRY` in
   `src/calculators/index.ts`.

Navigation, search, the dashboard, favourites, routing, SEO metadata, CSV export and print
styling all pick it up automatically. No other file needs to change.

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

## Building for production

```bash
npm run build      # → dist/
npm run preview    # verify the build locally
```

The build uses a relative base path, so `dist/` can be served from a domain root, a
sub-folder, or a `file://` bundle inside a packaged app with no configuration change.

### Deploying

Any static host works — there is no server component.

**Netlify** — build `npm run build`, publish `dist`.
**Vercel** — framework preset Vite, output `dist`.
**GitHub Pages** — push `dist/` to `gh-pages`; hash routing means no rewrite rules are needed.
**Cloudflare Pages / S3 + CloudFront / nginx** — upload `dist/` and serve `index.html`.

```bash
# nginx
server {
  root /var/www/finora/dist;
  location / { try_files $uri $uri/ /index.html; }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
}
```

Bump `CACHE` in `public/sw.js` on each release so returning visitors pick up new assets.

### Packaging as an app

The app is already PWA-installable: manifest, icons (192/512/maskable), theme colour, standalone
display and an offline-friendly service worker.

- **Mobile (Capacitor):** `npm i -D @capacitor/cli && npx cap init && npx cap add android`,
  point `webDir` at `dist`, then `npm run build && npx cap sync`.
- **Desktop (Electron/Tauri):** load `dist/index.html` directly — relative paths and hash
  routing work over `file://`.

---

## Testing

```bash
npm test
```

133 tests cover the EPF, income tax, NPS, EMI, SIP, PPF, FD, salary, CTC, gratuity, increment,
leave encashment, age, date, GST, ROI, percentage, markup, commission, BMI and currency engines,
plus validation, Indian number formatting, search ranking and registry integrity. Financial
assertions use published figures — the ₹12.75 lakh zero-tax case, the 15/26 gratuity formula,
the standard EMI formula, quarterly FD compounding — rather than values copied from the
implementation.

One test walks every registered calculator, computes it from its own defaults, and asserts that
no result, statistic, chart point or table cell comes back as `NaN` or `Infinity`.

---

## Notes and limitations

- Results are estimates for planning, not financial, tax or investment advice.
- Projected returns are not guaranteed; EPF, PPF and small-savings rates are revised periodically.
- The income tax calculator covers resident individuals. Capital gains use listed-equity rates;
  property, debt funds and unlisted shares follow different rules and are not modelled.
- Currency conversion uses a rate you supply — the app makes no network calls.

## Licence

MIT.
