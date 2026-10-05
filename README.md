# PaiseWise — Calculate. Compare. Plan Better.

Financial calculators for India, at [paisewise.in](https://paisewise.in).

A financial and utility calculator platform for India: 50 calculators covering loans, investment,
retirement, tax, salary, business, construction, flooring and everyday maths, plus 22 long-form financial
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

**Test it on your PC and phone (Windows).** In the project folder one level up
(`finora-calculator\`) double-click:

| Launcher | Use it for |
| --- | --- |
| `TEST-PaiseWise.bat` | Pre-deployment checks: type check, tests, colour-contrast audit and the production build, with a pass/fail summary |
| `START-PaiseWise.bat` | The finished site exactly as it will be deployed, on `http://localhost:4173` and your phone |
| `DEV-PaiseWise.bat` | Editing: hot reload on `http://localhost:5173` and your phone |

Each checks for Node, installs dependencies when they change, opens your browser once the server
answers and prints the `http://192.168.x.x:…` address for a phone on the same Wi-Fi. They wrap
the scripts in [`local-testing/`](local-testing/README.md); `HOW-TO-TEST.md` beside them has the
full PC + phone checklist.

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
| `npm run check:contrast` | WCAG audit of every mode × theme combination — run after changing any colour |

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
**Everyday** — BMI · Currency · Construction Material · Electrical Load · Tile & Marble Cost

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
├── components/         # Shell (header, mega-menu, drawer, footer), form renderer,
│                       # charts, tables, result cards, logo, article contents
├── theme/              # Appearance: mode × theme × density, pre-paint boot script
├── hooks/              # Preferences context: appearance, language, favourites, recents
├── lib/                # Formatting, validation, router + URLs, page metadata, storage
├── pages/              # Dashboard, calculator, category, guides, info, settings, 404
├── entry-server.tsx    # Build-time renderer used by scripts/prerender.mjs
├── styles/             # tokens.css (design tokens), base, layout (shell), components,
│                       # home, calc (calculator page), pages (guides, 404), charts, print
└── tests/              # Vitest suites for the engines
```

The data flow is the same for every calculator, which is what keeps 50 modules feeling like one
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

A calculator whose inputs are not a flat list of fields can draw its own inputs and results
instead: set `workspace` on its `CalculatorDef` to a component (and `workspaceSections` for
extra "On this page" links). The page still supplies the header, jump bar, guide, FAQs and next
steps. The Tile & Marble Cost Calculator works this way — two tabs (Tile, Marble) feed one
project total, with the staircase, window and door finishing and supporting materials alongside.
Its maths, including the sand/cement/white-cement/grout consumption assumptions (`CONSUMPTION`),
is in `src/engines/flooring.ts`; its example and saved-state handling in
`src/calculators/everyday/flooringModel.ts`; its workings and CSV in `flooringReport.ts`; and
the screen in `src/components/FlooringWorkspace.tsx`.

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

## Site structure

Every page answers the same questions in the same order.

- **Header** — the PaiseWise mark, a *Calculators* button that opens a mega-menu with all 49 tools
  by category, direct tabs for Loans, Investment and Tax & Salary, Guides, search (⌘K), language
  and theme. Below 1024px the menu becomes a drawer with one accordion per category (the current
  one open).
- **Right-hand menu** — on screens 1200px and wider, every calculator is also listed down the
  right of every page, by category, with Dashboard, Financial guides and your favourites at the
  top. It scrolls on its own and keeps the current calculator in view.
- **Home** — what PaiseWise is and a *working* EMI calculator in the hero (three sliders, the
  answer, a principal/interest bar, then a hand-off to the full calculator with the same
  numbers); trust figures; favourites and recents; the six most-used tools; categories; featured
  guides; why it can be trusted; and a full directory.
- **Calculator pages** — title, then a jump bar (*Calculator · Charts · Table · Guide · FAQ ·
  Next steps*) that sticks under the header on wide screens and carries the headline result once
  the result card scrolls away. Inputs sit beside the answer; under the headline figure a
  composition bar shows what it is made of (principal vs interest, invested vs returns…) in the
  same colours the charts use. Charts sit two to a row. The explanation reads as an article with
  an *On this page* index, and *Next steps* links related calculators and guides. On phones a
  result dock pins the answer to the bottom of the screen while you edit the inputs.
- **Guides** — the same article layout, with key points up front and the calculators to try
  beside the contents.
- **Footer** — calculators by category, popular tools, guides, company and legal pages.

In-page navigation uses buttons that scroll and move focus (`lib/scroll.ts`), never `#hash`
links, because the `file://` build keeps its route in the hash.

## Design system

PaiseWise's visual language is **calm, precise and trustworthy**: cool, faintly tinted neutrals
do most of the work; one theme hue marks everything interactive; a deep "ink" ground is reserved
for the one figure that matters (the headline result); and green, red and amber carry meaning
only — gain, cost, attention. No gradient text, no shine effects, no animated backgrounds.

**Brand.** The mark (`components/Logo.tsx`, `public/icons/`) is three rising bars on an ink
tile, the tallest in the brand's gold. The mark and wordmark stay the same whatever theme is
chosen, so PaiseWise always looks like PaiseWise. Type is self-hosted —
**Plus Jakarta Sans** (variable) for display headings and **Inter** (variable) for everything
else, including every figure, with tabular numerals. No third-party font requests; the three
files nearly every page needs are preloaded by the pre-renderer.

### Appearance: mode × theme × density

Appearance is three independent choices:

| Setting | Options | Default | What it changes |
| --- | --- | --- | --- |
| **Mode** | Light · Dark · Auto | Auto | Text, status colours and shadows. Auto follows the device, live. |
| **Theme** | Heritage · Parchment · Bordeaux · Verdigris · Graphite · Aubergine · Classic | Classic | The page grounds (faintly tinted), the accent — buttons, links, navigation, selections, focus rings, progress — its second tone, the result card's tint and the chart palette. |
| **Density** | Comfortable · Compact | Comfortable | Card padding, control heights, field gaps, stat and table row height. Touch screens keep full-size controls. |

Each theme is a pair of tones with a light and a dark version:

| Theme | Tones | Theme | Tones |
| --- | --- | --- | --- |
| Heritage | Navy & brass | Graphite | Charcoal & gold |
| Parchment | Sepia & sienna | Aubergine | Plum & antique rose |
| Bordeaux | Wine & rosewood | Classic | Sapphire blue — the original PaiseWise look |
| Verdigris | Patina & copper | | |

Status colours (success, danger, warning, info) belong to the mode, never the theme, so a gain
is the same green and a cost the same red whichever theme is picked.

Change them from the header's quick menu — a summary line ("Heritage · Auto, light now"), the
mode switch and a card for each theme, drawn as a miniature in that theme's own colours — or
**Settings › Appearance** (`/settings/`), which adds density, language, a reset, and a live
preview built from the real components — result card, buttons (including disabled), an input,
status badges, a table with signed amounts and a selected row, success/warning/error notes and
the chart colours. Every change applies at once, without a reload; switching mode or theme
cross-fades colours for 200 ms (off under reduced motion).

How it is built:

- `src/theme/appearance.ts` — the options (with each card's preview colours), defaults, storage
  keys, migration of old saved choices, `resolveMode()`, `describeAppearance()` and
  `applyAppearance()`. Framework-free.
- `src/theme/useAppearance.ts` — the React state, owned once by `PreferencesProvider` and read
  with `useAppearance()`. It listens to the device's colour scheme so Auto stays in step.
- `src/theme/boot.ts` — a small script that Vite inlines into every page's `<head>`
  (`vite.config.ts` → `appearanceBoot`). It applies the saved choices before the first paint, so
  a dark-mode reader never sees a white flash, even before the app's JavaScript loads.
- Preferences are saved through an `AppearanceStore` — today `localStorage` (keys
  `finora:mode`, `finora:theme`, `finora:density`). With sign-in, a store that reads and writes
  `user.preferences.themeMode / theme / density` can replace it without touching anything else.
- Saved choices from earlier releases migrate automatically to the nearest theme: accents
  (Blue → Classic, Indigo → Heritage, Emerald → Verdigris, Violet → Aubergine, Amber →
  Parchment) and the palettes before them (Premium → Classic, Ocean → Verdigris, Royal →
  Aubergine, Graphite → Graphite).

### Tokens

Everything lives in `src/styles/tokens.css`, in layers:

1. **Scales** — type (`--fs-display`, `--fs-h1`, `--fs-h2`, `--text-*`), spacing
   (`--space-2xs` … `--space-3xl`, `--section-gap`), radius (`--r-xs` … `--r-2xl`), shadows
   (`--shadow-1…3`), motion (`--dur*`, `--dur-theme`, `--ease`, `--ease-out`) and layout
   (`--maxw`, `--maxw-read`, `--gutter`, `--topbar-h`).
2. **Semantic tokens** — what components use: `--color-bg`, `--color-surface`,
   `--color-surface-secondary`, `--color-surface-elevated`, `--color-text-primary` /
   `-secondary` / `-muted`, `--color-border` / `-strong`, `--color-accent` / `-hover` / `-soft`
   (also available as `--color-primary*`), `--color-success` / `-danger` / `-warning` / `-info`
   each with `-soft` and `--color-on-*`, `--color-selected`, `--focus-ring`, `--color-input-*`,
   `--color-table-*`, `--color-tooltip-*`, `--color-hero-*`, `--color-chart-1…5`.
3. **Mode primitives** — one set of text and status colours for light, one for dark.
4. **Themes** — per theme and mode: the grounds (`--bg`, `--surface*`, `--border*`), the accent
   scale (`--brand-*`), the second tone (`--signature`), the result card's gradient and five
   chart colours (series 1 is the accent). Every theme defines the same set in both modes, so a
   light block can never leak into dark.
5. **Density** — `--control-h`, `--pad-card`, `--gap-fields`, `--pad-stat`, `--cell-py`, … with a
   compact block.

Dark mode is designed, not inverted: elevation comes from lighter surfaces and hairlines rather
than shadows, sunken wells (search, segmented tracks) are darker than cards, text is off-white,
and each theme's accent is lifted just enough to read.

Component conventions:

- **Buttons** — primary (solid accent), `.secondary`/`.subtle`, `.outline`, `.ghost`, `.danger`,
  `.success`; `.sm`, `.block`, `.loading`; every state has hover, active, focus-ring and
  disabled, and the label on a solid status button stays readable in dark mode.
- **Inputs** — a visible resting border, darker on hover, accent border + ring on focus; errors
  add a red border, a tinted fill, an icon and a message.
- **Stats** — tone is shown by the value's colour *and* a marker shape (square, circle,
  diamond), so meaning never rests on colour alone. Chart legends and composition bars use the
  same idea: each series has its own marker shape as well as its colour.
- **Money** — genuine gains and losses are signed with `formatSignedINR()` (`+₹5,000`,
  `−₹5,000`); `.amount.pos` / `.amount.neg` add colour as a second cue, and important amounts
  are never set in muted text.
- **Badges** — neutral, `.positive`, `.negative`, `.warning`, `.info`, `.brand`, each with an
  icon or word, not colour alone.
- **Tables** — sticky sunken header, hairline rows (no zebra), accent-tinted hover, a selected
  state (`tr.is-selected` or `aria-selected`), tabular right-aligned figures and a totals row
  with a strong top rule. Row height follows density.
- **Numbers** — tabular figures everywhere a value can change or line up.

**Every combination is contrast-audited, not eyeballed.** `npm run check:contrast` walks all
fourteen mode × theme combinations and checks 518 pairs — body, secondary and muted text on
every ground, accent links and button labels (including hover), text on selected rows and
accent-soft grounds, white and muted white on the result card, each status colour as text on the
page and on its own soft ground, labels on solid status buttons, and each chart series. Every
text role meets WCAG AA (4.5:1) in all of them. `src/tests/appearance.test.ts` checks that every
theme is defined completely and identically in both modes, never redefines text or status
colours, and that each Appearance card is drawn in exactly the colours its theme uses.

Keyboard: ⌘⇧L / Ctrl-Shift-L steps through the themes, ⌘⇧D / Ctrl-Shift-D flips light/dark.
Every appearance control is a radio group: one tab stop, arrow keys to choose.

Chart series use a five-colour categorical palette per theme, each colour at least 3:1 against
its surface. Charts are hand-built SVG (~250 lines) — they inherit theme tokens directly and add
nothing to the bundle.

The current section is marked in the header with an underline; the mega-menu closes on Escape,
an outside click, or when focus moves past it. Motion is handled by a few shared utilities in
`base.css` (`.anim-rise`, `.anim-zoom`, `.stagger`) plus short transitions on the menu, jump
bar and result dock, and all of it is switched off under `prefers-reduced-motion`.

Responsive behaviour: the header collapses to a drawer below 1024px, the calculator's inputs
and result stack below 900px, the article index folds above the text below 1100px, input grids
collapse to one column below 620px, tables scroll inside their own container, and controls
are at least 42px tall on touch screens (40px with a mouse). Side by side, the inputs and
result panels are always the same height. Nothing overflows horizontally at any width from 320px up.

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
  root /var/www/fincalc/dist;
  location / { try_files $uri $uri/ =404; }
  error_page 404 /404.html;
  # Asset names are not content-hashed (index.js, style.css — so file:// builds keep working),
  # so let browsers revalidate rather than cache them as immutable.
  location /assets/ { add_header Cache-Control "no-cache"; }
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
